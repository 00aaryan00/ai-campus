const User = require("../models/User");
const RosterEntry = require("../models/RosterEntry");
const generateToken = require("../utils/generateToken");
const {
  generateProvisionedPassword,
  sendProvisionedPassword,
} = require("../utils/passwordProvisioning");

const SELF_SIGNUP_ROLES = ["student", "faculty", "hod"];

const normalizeRole = (role) => {
  if (!role) {
    return role;
  }

  return role === "teacher" ? "faculty" : String(role).trim().toLowerCase();
};

const toTitleCase = (value) =>
  String(value || "")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const genericSignupResponse = {
  success: true,
  message:
    "If your details are valid for this institution, credentials will be sent to your email.",
};

const getDomainFromEmail = (email) => {
  const pieces = String(email || "").split("@");
  if (pieces.length !== 2) {
    return "";
  }

  return pieces[1].trim().toLowerCase();
};

const normalizeDomainValue = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "");

const getEligibilityForTenant = async ({
  tenant,
  email,
  requestedRole,
  enrollmentNumber,
  fallbackName,
  fallbackDepartment,
}) => {
  if (tenant.authMode === "email_domain") {
    const emailDomain = getDomainFromEmail(email);
    const allowedDomains = (tenant.domains || [])
      .map((d) => normalizeDomainValue(d))
      .filter(Boolean);

    if (!emailDomain || !allowedDomains.includes(emailDomain)) {
      return { 
        eligible: false, 
        reason: `Email domain '@${emailDomain}' is not allowed. Allowed domains are: ${allowedDomains.map(d=>'@'+d).join(', ')}` 
      };
    }

    return {
      eligible: true,
      profile: {
        name: fallbackName || toTitleCase(email.split("@")[0]),
        role: requestedRole,
        department: fallbackDepartment || "",
        enrollmentNumber: requestedRole === "student" ? enrollmentNumber || null : null,
      },
    };
  }

  if (tenant.authMode === "roster_based") {
    const rosterEntry = await RosterEntry.findOne({
      institutionId: tenant._id,
      email,
      isActive: true,
    });

    if (!rosterEntry) {
      return { eligible: false, reason: "Email not found in the institution's roster." };
    }

    if (requestedRole && requestedRole !== rosterEntry.role) {
      return { eligible: false, reason: `Role mismatch. Expected ${rosterEntry.role}.` };
    }

    if (
      rosterEntry.role === "student" &&
      rosterEntry.enrollmentNumber &&
      enrollmentNumber &&
      String(rosterEntry.enrollmentNumber) !== String(enrollmentNumber)
    ) {
      return { eligible: false, reason: "Enrollment number does not match roster records." };
    }

    if (
      rosterEntry.role === "student" &&
      rosterEntry.enrollmentNumber &&
      !String(enrollmentNumber || "").trim()
    ) {
      return { eligible: false, reason: "Enrollment number is required by the roster." };
    }

    return {
      eligible: true,
      profile: {
        name: rosterEntry.name,
        role: rosterEntry.role,
        department: rosterEntry.department || "",
        enrollmentNumber: rosterEntry.role === "student" ? rosterEntry.enrollmentNumber || null : null,
      },
    };
  }

  return { eligible: false, reason: "Invalid authentication mode for tenant." };
};

const registerUser = async (req, res) => {
  return res.status(410).json({
    success: false,
    message:
      "Direct registration is disabled. Use /auth/signup-request for tenant-aware signup.",
  });
};

const signupRequest = async (req, res, next) => {
  try {
    if (!req.tenant?._id) {
      return res.status(400).json({
        success: false,
        message: "Tenant context is required",
      });
    }

    const email = normalizeEmail(req.body.email);
    const requestedRole = normalizeRole(req.body.role);
    const enrollmentNumber = String(req.body.enrollmentNumber || "").trim();
    const providedName = String(req.body.name || "").trim();
    const providedDepartment = String(req.body.department || "").trim();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "email is required",
      });
    }

    if (requestedRole && !SELF_SIGNUP_ROLES.includes(requestedRole)) {
      return res.status(400).json({
        success: false,
        message: `role must be one of: ${SELF_SIGNUP_ROLES.join(", ")}`,
      });
    }

    if (req.tenant.authMode === "email_domain" && !requestedRole) {
      return res.status(400).json({
        success: false,
        message: `role is required for email_domain mode and must be one of: ${SELF_SIGNUP_ROLES.join(
          ", "
        )}`,
      });
    }

    const eligibility = await getEligibilityForTenant({
      tenant: req.tenant,
      email,
      requestedRole,
      enrollmentNumber,
      fallbackName: providedName,
      fallbackDepartment: providedDepartment,
    });

    if (!eligibility.eligible) {
      return res.status(400).json({
        success: false,
        message: eligibility.reason || "Not eligible for signup.",
      });
    }

    const existingUser = await User.findOne({
      email,
      institutionId: req.tenant._id,
    });

    if (existingUser) {
      if (existingUser.status === "disabled") {
        return res.status(403).json({
          success: false,
          message: "Your account is disabled. Contact institution admin.",
        });
      }

      return res.status(400).json({
        success: false,
        message: "An account with this email already exists. Please log in.",
      });
    }

    const generatedPassword = generateProvisionedPassword();

    const user = await User.create({
      name: eligibility.profile.name,
      email,
      password: generatedPassword,
      role: eligibility.profile.role,
      department: eligibility.profile.department,
      enrollmentNumber: eligibility.profile.enrollmentNumber,
      status: "active",
      mustChangePassword: false,
      institutionId: req.tenant._id,
    });

    await sendProvisionedPassword({
      tenantSlug: req.tenant.slug,
      institutionName: req.tenant.name,
      email,
      name: user.name,
      role: user.role,
      password: generatedPassword,
    });

    return res.status(200).json({
      ...genericSignupResponse,
      devGeneratedPassword: generatedPassword,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(200).json(genericSignupResponse);
    }
    next(error);
  }
};

const loginUser = async (req, res, next) => {
  try {
    if (!req.tenant?._id) {
      return res.status(400).json({
        success: false,
        message: "Tenant context is required",
      });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "email and password are required",
      });
    }

    const user = await User.findOne({
      email: normalizeEmail(email),
      institutionId: req.tenant._id,
    });

    if (!user || user.status === "disabled") {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken({
      userId: user._id,
      institutionId: user.institutionId,
      role: user.role,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

const getCurrentUser = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      user: req.user.toSafeObject ? req.user.toSafeObject() : req.user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  signupRequest,
  loginUser,
  getCurrentUser,
};
