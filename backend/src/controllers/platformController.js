const Institution = require("../models/Institution");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

const normalizeSlug = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeDomainValue = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "");

const loginSuperAdmin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase(), role: "super_admin" });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const ok = await user.comparePassword(password);
    if (!ok) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const token = generateToken({
      userId: user._id,
      role: user.role,
      institutionId: null,
    });

    return res.status(200).json({
      success: true,
      message: "Super admin login successful",
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

const getPlatformMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user.toSafeObject ? req.user.toSafeObject() : req.user,
  });
};

const createInstitutionWithAdmin = async (req, res, next) => {
  try {
    const { name, slug, domains, authMode, adminName, adminEmail, adminPassword } = req.body;

    if (!name || !adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({
        success: false,
        message: "name, adminName, adminEmail, and adminPassword are required",
      });
    }

    const institutionSlug = normalizeSlug(slug || name);
    if (!institutionSlug) {
      return res.status(400).json({ success: false, message: "Valid institution slug is required" });
    }

    const existingInstitution = await Institution.findOne({ slug: institutionSlug });
    if (existingInstitution) {
      return res.status(409).json({ success: false, message: "Institution slug already exists" });
    }

    const normalizedDomains = Array.isArray(domains)
      ? domains.map((d) => normalizeDomainValue(d)).filter(Boolean)
      : [];

    const institution = await Institution.create({
      name: String(name).trim(),
      slug: institutionSlug,
      status: "active",
      authMode: authMode === "roster_based" ? "roster_based" : "email_domain",
      domains: normalizedDomains,
      branding: { displayName: String(name).trim() },
    });

    const existingAdmin = await User.findOne({
      institutionId: institution._id,
      email: adminEmail.toLowerCase(),
    });

    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: "Institution admin email already exists in this tenant",
      });
    }

    const adminUser = await User.create({
      name: adminName,
      email: adminEmail.toLowerCase(),
      password: adminPassword,
      role: "institution_admin",
      department: "administration",
      institutionId: institution._id,
    });

    return res.status(201).json({
      success: true,
      message: "Institution and institution_admin created",
      institution: {
        id: institution._id,
        name: institution.name,
        slug: institution.slug,
        status: institution.status,
        authMode: institution.authMode,
        domains: institution.domains,
      },
      institutionAdmin: adminUser.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  loginSuperAdmin,
  getPlatformMe,
  createInstitutionWithAdmin,
};
