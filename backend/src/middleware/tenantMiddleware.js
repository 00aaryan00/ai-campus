const Institution = require("../models/Institution");

const resolveTenantFromSlug = async (req, res, next) => {
  try {
    const tenantSlug = String(req.params.tenantSlug || "")
      .trim()
      .toLowerCase();

    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        message: "tenantSlug is required",
      });
    }

    const institution = await Institution.findOne({ slug: tenantSlug });

    if (!institution) {
      return res.status(404).json({
        success: false,
        message: "Institution not found",
      });
    }

    if (institution.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Institution is not active",
      });
    }

    req.tenant = institution;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  resolveTenantFromSlug,
};

