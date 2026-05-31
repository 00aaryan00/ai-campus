const crypto = require("crypto");

const generateProvisionedPassword = () => {
  const alphabet = "0123456789";
  const bytes = crypto.randomBytes(8);
  let password = "";

  for (let i = 0; i < bytes.length; i += 1) {
    password += alphabet[bytes[i] % alphabet.length];
  }

  return password;
};

const sendProvisionedPassword = async ({
  tenantSlug,
  institutionName,
  email,
  name,
  password,
  role,
}) => {
  // Placeholder adapter: wire this to SMTP/Resend/SES in next chunk.
  // Keeping output minimal to avoid leaking secrets in logs.
  console.log(
    `[auth-provisioning] tenant=${tenantSlug} institution=${institutionName} role=${role} sent_password_to=${email} user=${name}`
  );

  if (process.env.NODE_ENV !== "production") {
    console.log(`[auth-provisioning][dev-only] generated-password=${password}`);
  }
};

module.exports = {
  generateProvisionedPassword,
  sendProvisionedPassword,
};

