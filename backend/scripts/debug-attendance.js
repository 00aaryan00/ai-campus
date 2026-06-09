const mongoose = require("mongoose");
const User = require("../src/models/User");
const Test = require("../src/models/Test");
const TestAttendanceSummary = require("../src/models/TestAttendanceSummary");

require("dotenv").config({ path: "../.env" });

async function debug() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");

  // Check the student
  const student = await User.findOne({ email: "s1@acis.com" }) || await User.findOne({ name: "s1" });
  console.log("Student:", student ? { id: student._id, department: student.department, semester: student.semester } : "Not found");

  if (student) {
    const summaries = await TestAttendanceSummary.find({ studentId: student._id });
    console.log("Summaries for this student:", summaries);
  }

  // Check recent tests created
  const tests = await Test.find().sort({ createdAt: -1 }).limit(3);
  console.log("Recent Tests:", tests.map(t => ({ id: t._id, title: t.title, department: t.department })));

  await mongoose.disconnect();
}

debug();
