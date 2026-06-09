const mysql = require("mysql2/promise");

const required = ["MYSQL_HOST", "MYSQL_PORT", "MYSQL_USER", "MYSQL_DATABASE"];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`${key} is not configured`);
  }
}

const mysqlPool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: Number(process.env.MYSQL_POOL_SIZE || 10),
  queueLimit: 0,
  // Add SSL for cloud DBs like Aiven, but fallback for localhost
  ssl: process.env.MYSQL_HOST !== "127.0.0.1" && process.env.MYSQL_HOST !== "localhost" ? {
    rejectUnauthorized: false
  } : undefined
});

module.exports = { mysqlPool };