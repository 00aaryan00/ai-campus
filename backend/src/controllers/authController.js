const User = require("../models/User");
const generateToken = require("../utils/generateToken");

const normalizeRole = (role) => {
  if (!role) {
    return role;
  }

  return role === "teacher" ? "faculty" : role;
};

const validateRegisterBody = ({ name, email, password, role }) => {
  if (!name || !email || !password || !role) {
    return "name, email, password, and role are required";
  }

  if (password.length < 6) {
    return "Password must be at least 6 characters long";
  }

  if (!User.allowedRoles.includes(role)) {
    return `Role must be one of: ${User.allowedRoles.join(", ")}`;
  }

  return null;
};

const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, department } = req.body;
    const normalizedRole = normalizeRole(req.body.role);
    const validationError = validateRegisterBody({
      name,
      email,
      password,
      role: normalizedRole,
    });

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: normalizedRole,
      department,
    });

    const token = generateToken({
      userId: user._id,
      role: user.role,
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "email and password are required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
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

    const token = generateToken({
      userId: user._id,
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
  loginUser,
  getCurrentUser,
};
