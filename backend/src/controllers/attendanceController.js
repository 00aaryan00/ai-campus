const mongoose = require("mongoose");
const Test = require("../models/Test");
const Result = require("../models/Result");
const AttendanceSession = require("../models/AttendanceSession");
const TestAttendanceSummary = require("../models/TestAttendanceSummary");
const User = require("../models/User");
const Institution = require("../models/Institution");

// Helper to get start and end of a date
const getDateRange = (dateStr) => {
  const date = dateStr ? new Date(dateStr) : new Date();
  const start = new Date(date.setHours(0, 0, 0, 0));
  const end = new Date(date.setHours(23, 59, 59, 999));
  return { start, end };
};

// 1. Get tests made by faculty on a specific date
exports.getFacultyTests = async (req, res) => {
  try {
    const { date } = req.query;
    const facultyId = req.user._id;
    const { start, end } = getDateRange(date);

    // Get tests created by this faculty today
    const tests = await Test.find({
      createdBy: facultyId,
      createdAt: { $gte: start, $lte: end },
    })
      .select("title subject createdAt department roomCode")
      .sort({ createdAt: -1 })
      .lean();

    // Check which ones have attendance submitted
    const testIds = tests.map((t) => t._id);
    const sessions = await AttendanceSession.find({ testId: { $in: testIds } })
      .select("testId")
      .lean();

    const submittedTestIds = new Set(sessions.map((s) => s.testId.toString()));

    const enrichedTests = tests.map((t) => ({
      ...t,
      attendanceSubmitted: submittedTestIds.has(t._id.toString()),
    }));

    res.json({ success: true, tests: enrichedTests });
  } catch (error) {
    console.error("Error in getFacultyTests:", error);
    res.status(500).json({ success: false, message: "Failed to fetch tests." });
  }
};

// 2. Get students for a specific test (LIVE from results or saved session)
exports.getTestStudents = async (req, res) => {
  try {
    const { testId } = req.params;

    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({ success: false, message: "Test not found." });
    }

    // Check if session already exists
    const session = await AttendanceSession.findOne({ testId }).populate({
      path: "presentStudents",
      select: "name email department role",
    });

    if (session) {
      return res.json({
        success: true,
        submitted: true,
        students: session.presentStudents,
      });
    }

    // No session yet -> Get LIVE list of students who attempted the test
    const results = await Result.find({ testId })
      .populate({
        path: "studentId",
        select: "name email department role",
      })
      .lean();

    // Filter unique students (just in case)
    const uniqueStudentsMap = new Map();
    results.forEach((r) => {
      if (r.studentId && !uniqueStudentsMap.has(r.studentId._id.toString())) {
        uniqueStudentsMap.set(r.studentId._id.toString(), r.studentId);
      }
    });

    const liveStudents = Array.from(uniqueStudentsMap.values());

    res.json({
      success: true,
      submitted: false,
      students: liveStudents,
    });
  } catch (error) {
    console.error("Error in getTestStudents:", error);
    res.status(500).json({ success: false, message: "Failed to fetch test students." });
  }
};

// 3. Submit attendance
exports.submitAttendance = async (req, res) => {
  let dbSession;
  try {
    const { testId, presentStudentIds } = req.body;
    const facultyId = req.user._id;

    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({ success: false, message: "Test not found." });
    }

    // We only want to process this once to prevent multi-submissions corrupting totals
    const existingSession = await AttendanceSession.findOne({ testId });
    if (existingSession) {
      return res.status(400).json({ success: false, message: "Attendance already submitted for this test." });
    }

    // Identify department to find all students who were supposed to take it
    const testDepartment = test.department || req.user.department;
    if (!testDepartment) {
      return res.status(400).json({ success: false, message: "Test has no department mapped." });
    }

    const institution = req.tenant;
    if (!institution) {
      return res.status(404).json({ success: false, message: "Institution not found." });
    }

    // Build query for students in this department
    const studentQuery = {
      institutionId: institution._id,
      department: { $regex: new RegExp(`^${testDepartment}$`, "i") },
      role: "student",
    };

    // If test has a semester, filter by it so we only count students in that semester
    if (test.semester) {
      studentQuery.semester = test.semester;
    }

    // Get ALL relevant students
    const allDeptStudents = await User.find(studentQuery).select("_id");

    const allDeptStudentIds = allDeptStudents.map((u) => u._id.toString());
    const presentIdsSet = new Set(presentStudentIds);

    const absentStudentIds = allDeptStudentIds.filter((id) => !presentIdsSet.has(id));

    // Transaction for atomic save
    dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    // 1. Create the Attendance Session
    await AttendanceSession.create(
      [
        {
          testId,
          subject: test.subject,
          date: new Date(), // Submission date
          institutionId: institution._id,
          presentStudents: presentStudentIds,
          absentStudents: absentStudentIds,
          facultyId,
        },
      ],
      { session: dbSession }
    );

    // 2. BulkWrite to TestAttendanceSummary for PRE-CALCULATED fast reads
    const bulkOps = [];

    // All department students get totalTests + 1
    allDeptStudentIds.forEach((studentId) => {
      const isPresent = presentIdsSet.has(studentId);

      // We use pipeline updates (MongoDB 4.2+) to instantly calculate the percentage
      const updatePipeline = [
        {
          $set: {
            studentId: new mongoose.Types.ObjectId(studentId),
            subject: test.subject,
            institutionId: institution._id,
            totalTests: { $add: [{ $ifNull: ["$totalTests", 0] }, 1] },
            attendedTests: {
              $add: [{ $ifNull: ["$attendedTests", 0] }, isPresent ? 1 : 0],
            },
          },
        },
        {
          $set: {
            percentage: {
              $round: [
                {
                  $multiply: [
                    { $divide: ["$attendedTests", "$totalTests"] },
                    100,
                  ],
                },
                0,
              ],
            },
          },
        },
      ];

      bulkOps.push({
        updateOne: {
          filter: {
            studentId: new mongoose.Types.ObjectId(studentId),
            subject: test.subject,
            institutionId: institution._id,
          },
          update: updatePipeline,
          upsert: true,
        },
      });
    });

    if (bulkOps.length > 0) {
      await TestAttendanceSummary.collection.bulkWrite(bulkOps, { session: dbSession });
    }

    await dbSession.commitTransaction();
    dbSession.endSession();

    res.json({ success: true, message: "Attendance submitted successfully." });
  } catch (error) {
    if (dbSession) {
      await dbSession.abortTransaction();
      dbSession.endSession();
    }
    console.error("Error in submitAttendance:", error);
    res.status(500).json({ success: false, message: "Failed to submit attendance." });
  }
};

// 4. Get Student Summary
exports.getStudentSummary = async (req, res) => {
  try {
    const studentId = req.user._id;

    const summaries = await TestAttendanceSummary.find({ studentId })
      .select("subject totalTests attendedTests percentage")
      .sort({ subject: 1 })
      .lean();

    res.json({ success: true, attendance: summaries });
  } catch (error) {
    console.error("Error in getStudentSummary:", error);
    res.status(500).json({ success: false, message: "Failed to fetch student attendance." });
  }
};
