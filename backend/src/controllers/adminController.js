const Institution = require("../models/Institution");
const RosterEntry = require("../models/RosterEntry");
const User = require("../models/User");

const ALLOWED_ROSTER_ROLES = ["student", "faculty", "hod"];
const MANAGEABLE_USER_ROLES = ["student", "faculty", "hod"];
const TARGET_ENROLLMENT_INDEX_NAME = "uniq_institution_enrollment_student_only";

const normalizeRole = (value) => {
  const role = String(value || "")
    .trim()
    .toLowerCase();
  return role === "teacher" ? "faculty" : role;
};

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const normalizeDomainValue = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "");

const parseCsvLine = (line) => {
  const out = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(current.trim());
      current = "";
      continue;
    }

    current += ch;
  }

  out.push(current.trim());
  return out;
};

const csvToRows = (csvContent) => {
  const lines = String(csvContent || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const row = {};
    headers.forEach((key, idx) => {
      row[key] = cols[idx] ?? "";
    });
    return row;
  });
};

const normalizeRosterRow = (raw) => {
  const email = normalizeEmail(raw.email);
  const role = normalizeRole(raw.role);
  const name = String(raw.name || "").trim();
  const department = String(raw.department || "").trim();
  const enrollmentNumberRaw = String(
    raw.enrollmentNumber || raw.enrollment || raw.enrollment_number || ""
  ).trim();
  const enrollmentNumber = role === "student" ? enrollmentNumberRaw || undefined : undefined;

  return {
    email,
    role,
    name,
    department,
    enrollmentNumber,
    isActive: raw.isActive === undefined ? true : String(raw.isActive).toLowerCase() !== "false",
  };
};

const validateRosterRow = (row) => {
  if (!row.email || !row.email.includes("@")) {
    return "email is invalid";
  }
  if (!row.name) {
    return "name is required";
  }
  if (!ALLOWED_ROSTER_ROLES.includes(row.role)) {
    return `role must be one of: ${ALLOWED_ROSTER_ROLES.join(", ")}`;
  }
  if (row.role === "student" && !row.enrollmentNumber) {
    return "enrollmentNumber is required for student rows";
  }
  return null;
};

const ensureRosterIndexes = async () => {
  const indexes = await RosterEntry.collection.indexes();

  const enrollmentIndexes = indexes.filter((idx) => {
    const keys = Object.keys(idx.key || {});
    return (
      keys.length === 2 &&
      keys[0] === "institutionId" &&
      keys[1] === "enrollmentNumber"
    );
  });

  for (const idx of enrollmentIndexes) {
    const hasExpectedPartial =
      idx.partialFilterExpression &&
      idx.partialFilterExpression.enrollmentNumber &&
      idx.partialFilterExpression.enrollmentNumber.$exists === true;

    if (!hasExpectedPartial || idx.name !== TARGET_ENROLLMENT_INDEX_NAME) {
      await RosterEntry.collection.dropIndex(idx.name).catch(() => {});
    }
  }

  await RosterEntry.collection.createIndex(
    { institutionId: 1, enrollmentNumber: 1 },
    {
      name: TARGET_ENROLLMENT_INDEX_NAME,
      unique: true,
      partialFilterExpression: {
        enrollmentNumber: { $exists: true },
      },
    }
  );
};

const setTenantAuthMode = async (req, res, next) => {
  try {
    const authMode = String(req.body.authMode || "").trim().toLowerCase();
    if (!["email_domain", "roster_based"].includes(authMode)) {
      return res.status(400).json({
        success: false,
        message: "authMode must be email_domain or roster_based",
      });
    }

    const domains = Array.isArray(req.body.domains)
      ? req.body.domains.map((d) => normalizeDomainValue(d)).filter(Boolean)
      : undefined;

    if (authMode === "email_domain" && (!domains || domains.length === 0)) {
      return res.status(400).json({
        success: false,
        message: "domains are required when authMode is email_domain",
      });
    }

    const institution = await Institution.findById(req.tenant._id);
    if (!institution) {
      return res.status(404).json({ success: false, message: "Institution not found" });
    }

    institution.authMode = authMode;
    if (domains) {
      institution.domains = domains;
    }
    await institution.save();

    return res.status(200).json({
      success: true,
      message: "Institution auth mode updated",
      institution: {
        id: institution._id,
        slug: institution.slug,
        authMode: institution.authMode,
        domains: institution.domains,
      },
    });
  } catch (error) {
    next(error);
  }
};

const uploadRoster = async (req, res, next) => {
  try {
    await ensureRosterIndexes();

    const uploadGroup = String(req.body.uploadGroup || "mixed")
      .trim()
      .toLowerCase();

    if (!["mixed", "students", "staff"].includes(uploadGroup)) {
      return res.status(400).json({
        success: false,
        message: "uploadGroup must be one of: mixed, students, staff",
      });
    }

    let rows = [];

    if (Array.isArray(req.body.rows)) {
      rows = req.body.rows;
    } else if (typeof req.body.csvContent === "string") {
      rows = csvToRows(req.body.csvContent);
    } else {
      return res.status(400).json({
        success: false,
        message: "Provide either rows[] JSON or csvContent string",
      });
    }

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: "No roster rows found",
      });
    }

    if (rows.length > 10000) {
      return res.status(400).json({
        success: false,
        message: "Roster too large. Max 10000 rows per upload.",
      });
    }

    let inserted = 0;
    let updated = 0;
    const rejected = [];
    const seenEmails = new Set();
    const seenEnrollments = new Set();

    for (let i = 0; i < rows.length; i += 1) {
      const normalized = normalizeRosterRow(rows[i]);
      const errorMessage = validateRosterRow(normalized);

      if (errorMessage) {
        rejected.push({ rowNumber: i + 2, reason: errorMessage, row: rows[i] });
        continue;
      }

      if (uploadGroup === "students" && normalized.role !== "student") {
        rejected.push({
          rowNumber: i + 2,
          reason: "This upload accepts only student rows",
          row: rows[i],
        });
        continue;
      }

      if (uploadGroup === "staff" && !["faculty", "hod"].includes(normalized.role)) {
        rejected.push({
          rowNumber: i + 2,
          reason: "This upload accepts only faculty/hod rows",
          row: rows[i],
        });
        continue;
      }

      const emailKey = normalized.email;
      const enrollmentKey =
        normalized.role === "student" && normalized.enrollmentNumber
          ? normalized.enrollmentNumber
          : "";

      if (seenEmails.has(emailKey)) {
        rejected.push({
          rowNumber: i + 2,
          reason: `Duplicate email '${emailKey}' in uploaded file`,
          row: rows[i],
        });
        continue;
      }
      seenEmails.add(emailKey);

      if (enrollmentKey) {
        if (seenEnrollments.has(enrollmentKey)) {
          rejected.push({
            rowNumber: i + 2,
            reason: `Duplicate enrollmentNumber '${enrollmentKey}' in uploaded file`,
            row: rows[i],
          });
          continue;
        }
        seenEnrollments.add(enrollmentKey);
      }

      try {
        const existingByEmail = await RosterEntry.findOne({
          institutionId: req.tenant._id,
          email: normalized.email,
        });

        const existingByEnrollment =
          normalized.role === "student" && normalized.enrollmentNumber
            ? await RosterEntry.findOne({
                institutionId: req.tenant._id,
                enrollmentNumber: normalized.enrollmentNumber,
              })
            : null;

        if (existingByEmail) {
          if (
            existingByEnrollment &&
            String(existingByEnrollment._id) !== String(existingByEmail._id)
          ) {
            rejected.push({
              rowNumber: i + 2,
              reason: `enrollmentNumber '${normalized.enrollmentNumber}' already linked to another email`,
              row: rows[i],
            });
            continue;
          }

          existingByEmail.name = normalized.name;
          existingByEmail.department = normalized.department;
          existingByEmail.role = normalized.role;
          if (normalized.role === "student") {
            existingByEmail.enrollmentNumber = normalized.enrollmentNumber;
          } else {
            existingByEmail.set("enrollmentNumber", undefined);
          }
          existingByEmail.isActive = normalized.isActive;
          await existingByEmail.save();
          updated += 1;
          continue;
        }

        if (existingByEnrollment) {
          rejected.push({
            rowNumber: i + 2,
            reason: `enrollmentNumber '${normalized.enrollmentNumber}' already exists for '${existingByEnrollment.email}'`,
            row: rows[i],
          });
          continue;
        }

        const createPayload = {
          institutionId: req.tenant._id,
          email: normalized.email,
          role: normalized.role,
          name: normalized.name,
          department: normalized.department,
          isActive: normalized.isActive,
          ...(normalized.role === "student" && normalized.enrollmentNumber
            ? { enrollmentNumber: normalized.enrollmentNumber }
            : {}),
        };
        await RosterEntry.create(createPayload);
        inserted += 1;
      } catch (rowError) {
        if (rowError?.code === 11000) {
          const conflictedFields = rowError?.keyPattern
            ? Object.keys(rowError.keyPattern).join(", ")
            : "email or enrollmentNumber";
          rejected.push({
            rowNumber: i + 2,
            reason: `Unique conflict on: ${conflictedFields}`,
            row: rows[i],
          });
          continue;
        }
        throw rowError;
      }
    }

    return res.status(200).json({
      success: true,
      message: "Roster upload processed",
      summary: {
        totalRows: rows.length,
        inserted,
        updated,
        rejected: rejected.length,
      },
      rejected,
    });
  } catch (error) {
    next(error);
  }
};

const listRoster = async (req, res, next) => {
  try {
    const role = normalizeRole(req.query.role);
    const department = String(req.query.department || "").trim();
    const isActiveRaw = req.query.isActive;
    const filter = { institutionId: req.tenant._id };

    if (role) {
      filter.role = role;
    }
    if (department) {
      filter.department = department;
    }
    if (isActiveRaw !== undefined) {
      filter.isActive = String(isActiveRaw).toLowerCase() === "true";
    }

    const entries = await RosterEntry.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: entries.length,
      entries,
    });
  } catch (error) {
    next(error);
  }
};

const updateRosterEntry = async (req, res, next) => {
  try {
    const entryId = req.params.id;
    const { name, role, department, enrollmentNumber, isActive } = req.body;

    const entry = await RosterEntry.findOne({ _id: entryId, institutionId: req.tenant._id });
    if (!entry) {
      return res.status(404).json({ success: false, message: "Roster entry not found" });
    }

    if (name !== undefined) entry.name = String(name).trim();
    if (role !== undefined) {
      const normalizedRole = normalizeRole(role);
      if (!["student", "faculty", "hod"].includes(normalizedRole)) {
        return res.status(400).json({ success: false, message: "Invalid role" });
      }
      entry.role = normalizedRole;
    }
    if (department !== undefined) entry.department = String(department).trim();
    if (isActive !== undefined) entry.isActive = Boolean(isActive);
    
    if (entry.role === "student") {
      if (enrollmentNumber !== undefined) {
        entry.enrollmentNumber = String(enrollmentNumber).trim();
      }
    } else {
      entry.enrollmentNumber = undefined;
    }

    await entry.save();

    return res.status(200).json({
      success: true,
      message: "Roster entry updated",
      entry,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Enrollment number or email already in use." });
    }
    next(error);
  }
};

const listUsers = async (req, res, next) => {
  try {
    const role = normalizeRole(req.query.role);
    const department = String(req.query.department || "").trim();
    const status = String(req.query.status || "").trim().toLowerCase();
    const filter = { institutionId: req.tenant._id };

    if (role) {
      if (!MANAGEABLE_USER_ROLES.includes(role)) {
        return res.status(400).json({
          success: false,
          message: `role must be one of: ${MANAGEABLE_USER_ROLES.join(", ")}`,
        });
      }
      filter.role = role;
    } else {
      filter.role = { $in: MANAGEABLE_USER_ROLES };
    }

    if (department) {
      filter.department = department;
    }
    if (status) {
      if (!["invited", "active", "disabled"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "status must be invited, active, or disabled",
        });
      }
      filter.status = status;
    }

    const users = await User.find(filter).select("-password").sort({ createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findOne({
      _id: id,
      institutionId: req.tenant._id,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found in this institution",
      });
    }

    if (!MANAGEABLE_USER_ROLES.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "This user role cannot be managed from this endpoint",
      });
    }

    const requestedRole = req.body.role ? normalizeRole(req.body.role) : undefined;
    if (requestedRole && !MANAGEABLE_USER_ROLES.includes(requestedRole)) {
      return res.status(400).json({
        success: false,
        message: `role must be one of: ${MANAGEABLE_USER_ROLES.join(", ")}`,
      });
    }

    if (req.body.name !== undefined) {
      user.name = String(req.body.name || "").trim();
      if (!user.name) {
        return res.status(400).json({ success: false, message: "name cannot be empty" });
      }
    }
    if (req.body.department !== undefined) {
      user.department = String(req.body.department || "").trim();
    }
    if (requestedRole) {
      user.role = requestedRole;
    }

    if (req.body.enrollmentNumber !== undefined) {
      const newEnrollment = String(req.body.enrollmentNumber || "").trim();
      if (user.role === "student") {
        if (!newEnrollment) {
          return res.status(400).json({
            success: false,
            message: "enrollmentNumber is required for student role",
          });
        }
        user.enrollmentNumber = newEnrollment;
      } else {
        user.enrollmentNumber = null;
      }
    } else if (requestedRole && requestedRole !== "student") {
      user.enrollmentNumber = null;
    }

    if (user.role === "student" && !String(user.enrollmentNumber || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "student must have enrollmentNumber",
      });
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User updated",
      user: user.toSafeObject(),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Conflict: email or enrollmentNumber already exists in this institution",
      });
    }
    next(error);
  }
};

const setUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const status = String(req.body.status || "").trim().toLowerCase();

    if (!["invited", "active", "disabled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "status must be invited, active, or disabled",
      });
    }

    const user = await User.findOne({
      _id: id,
      institutionId: req.tenant._id,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found in this institution",
      });
    }

    if (!MANAGEABLE_USER_ROLES.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "This user role cannot be managed from this endpoint",
      });
    }

    user.status = status;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "User status updated",
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  setTenantAuthMode,
  uploadRoster,
  listRoster,
  updateRosterEntry,
  listUsers,
  updateUser,
  setUserStatus,
};
