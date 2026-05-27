const dotenv = require("dotenv");

dotenv.config();

const connectDB = require("../src/config/db");
const User = require("../src/models/User");

const main = async () => {
  await connectDB();

  const email = String(process.env.SUPER_ADMIN_EMAIL || "").toLowerCase().trim();
  const password = String(process.env.SUPER_ADMIN_PASSWORD || "").trim();
  const name = String(process.env.SUPER_ADMIN_NAME || "Super Admin").trim();

  if (!email || !password) {
    throw new Error("SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD are required");
  }

  const existing = await User.findOne({ email, role: "super_admin" });
  if (existing) {
    console.log(`[seed-super-admin] super_admin already exists: ${existing.email}`);
    process.exit(0);
  }

  const user = await User.create({
    name,
    email,
    password,
    role: "super_admin",
    institutionId: null,
    department: "platform",
  });

  console.log(`[seed-super-admin] created: ${user.email}`);
  process.exit(0);
};

main().catch((error) => {
  console.error("[seed-super-admin] failed:", error.message);
  process.exit(1);
});

