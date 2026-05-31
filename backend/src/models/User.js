const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const allowedRoles = ["super_admin", "institution_admin", "hod", "faculty", "student"];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institution",
      default: null,
      index: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: allowedRoles,
      required: true,
    },
    status: {
      type: String,
      enum: ["invited", "active", "disabled"],
      default: "active",
      index: true,
    },
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
    enrollmentNumber: {
      type: String,
      trim: true,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    department: {
      type: String,
      trim: true,
      default: "",
    },
    semester: {
      type: String,
      trim: true,
      default: "",
    },
    semesterUpdatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    institutionId: this.institutionId,
    role: this.role,
    status: this.status,
    mustChangePassword: this.mustChangePassword,
    enrollmentNumber: this.enrollmentNumber,
    lastLoginAt: this.lastLoginAt,
    department: this.department,
    semester: this.semester,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

userSchema.index({ institutionId: 1, email: 1 }, { unique: true, sparse: true });

userSchema.statics.allowedRoles = allowedRoles;

module.exports = mongoose.model("User", userSchema);
