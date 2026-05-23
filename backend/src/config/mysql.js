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
});

module.exports = { mysqlPool };