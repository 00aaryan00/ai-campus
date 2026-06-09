require("dotenv").config({ path: __dirname + "/../.env" });
const { mysqlPool } = require("../src/config/mysql");

async function checkConnection() {
  console.log("Checking MySQL connection to:", process.env.MYSQL_HOST);
  try {
    const [rows] = await mysqlPool.query("SELECT 1 + 1 AS result");
    if (rows[0].result === 2) {
      console.log("✅ Successfully connected to Aiven MySQL!");
      console.log(`✅ Database name in use: ${process.env.MYSQL_DATABASE}`);
    }
  } catch (error) {
    console.error("❌ Database connection failed.");
    console.error("Error details:", error.message);
  } finally {
    process.exit();
  }
}

checkConnection();
