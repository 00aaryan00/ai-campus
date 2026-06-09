require("dotenv").config({ path: ".env" });
const mongoose = require("mongoose");
const AttendanceSession = require("./src/models/AttendanceSession");
const TestAttendanceSummary = require("./src/models/TestAttendanceSummary");

async function clearCorruptedAttendance() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // Clear the corrupted sessions that got saved with 0 students
  const delSessions = await AttendanceSession.deleteMany({});
  console.log(`Deleted ${delSessions.deletedCount} corrupted attendance sessions.`);

  // Clear any weird partial summaries
  const delSummaries = await TestAttendanceSummary.deleteMany({});
  console.log(`Deleted ${delSummaries.deletedCount} attendance summaries.`);

  await mongoose.disconnect();
  console.log("Database cleanup complete!");
}

clearCorruptedAttendance();
