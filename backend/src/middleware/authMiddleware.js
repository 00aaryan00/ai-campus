const jwt = require("jsonwebtoken");

const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found for this token",
      });
    }

    const isSuperAdmin = decoded.role === "super_admin";

    if (!isSuperAdmin) {
      if (!decoded.institutionId) {
        return res.status(401).json({
          success: false,
          message: "Token is missing institution context",
        });
      }

      if (req.tenant?._id && String(decoded.institutionId) !== String(req.tenant._id)) {
        return res.status(403).json({
          success: false,
          message: "Token tenant does not match route tenant",
        });
      }

      if (String(user.institutionId || "") !== String(decoded.institutionId || "")) {
        return res.status(401).json({
          success: false,
          message: "User tenant does not match token tenant",
        });
      }
    } else if (user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Token role mismatch",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

module.exports = {
  protect,
};
