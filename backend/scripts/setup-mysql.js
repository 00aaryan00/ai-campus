require("dotenv").config({ path: ".env" });
const mysql = require("mysql2/promise");

async function setupDatabase() {
  console.log("Connecting to MySQL Database at Aiven Cloud...");
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: process.env.MYSQL_PORT,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      ssl: {
        rejectUnauthorized: false
      }
    });

    console.log("✅ Successfully connected to MySQL!");

    console.log("Creating fact_student_test table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS fact_student_test (
        result_id VARCHAR(100) PRIMARY KEY,
        institution_id VARCHAR(100),
        student_id VARCHAR(100),
        student_semester VARCHAR(50),
        test_id VARCHAR(100),
        faculty_id VARCHAR(100),
        faculty_department VARCHAR(100),
        faculty_name_snapshot VARCHAR(255),
        subject VARCHAR(255),
        score FLOAT,
        total_marks FLOAT,
        accuracy FLOAT,
        assigned_set VARCHAR(50),
        submitted_at DATETIME
      );
    `);
    console.log("✅ fact_student_test table created successfully!");

    console.log("Creating fact_student_question table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS fact_student_question (
        id INT AUTO_INCREMENT PRIMARY KEY,
        result_id VARCHAR(100),
        institution_id VARCHAR(100),
        student_id VARCHAR(100),
        student_semester VARCHAR(50),
        test_id VARCHAR(100),
        faculty_id VARCHAR(100),
        faculty_department VARCHAR(100),
        question_id VARCHAR(100),
        topic VARCHAR(255),
        difficulty VARCHAR(50),
        is_correct TINYINT(1),
        selected_answer TEXT,
        assigned_set VARCHAR(50),
        submitted_at DATETIME,
        UNIQUE KEY unique_result_question (result_id, question_id)
      );
    `);
    console.log("✅ fact_student_question table created successfully!");

    await connection.end();
    console.log("🎉 All analytics tables are fully set up and ready to go!");

  } catch (error) {
    console.error("❌ Failed to set up database:");
    console.error(error);
  }
}

setupDatabase();
