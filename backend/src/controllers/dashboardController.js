const User = require("../models/User");
const AttendanceSession = require("../models/AttendanceSession");
const TestAttendanceSummary = require("../models/TestAttendanceSummary");

const getStudentDashboardStats = async (req, res) => {
  try {
    const studentId = req.user._id;

    const summaries = await TestAttendanceSummary.find({ studentId }).lean();
    let totalTests = 0;
    let attendedTests = 0;

    summaries.forEach((s) => {
      totalTests += s.totalTests || 0;
      attendedTests += s.attendedTests || 0;
    });

    const overallAttendance = totalTests > 0 ? Math.round((attendedTests / totalTests) * 100) : 0;

    res.json({
      success: true,
      stats: {
        attendance: overallAttendance,
        // Mocked until full analytics is built
        grade: overallAttendance >= 75 ? "A" : overallAttendance >= 60 ? "B" : "C",
        weakArea: "To be calculated in analytics phase",
        feedback: "Keep maintaining your attendance!",
      },
    });
  } catch (error) {
    console.error("Error fetching student dashboard stats:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getFacultyDashboardStats = async (req, res) => {
  try {
    const faculty = req.user;
    const institutionId = req.tenant._id;

    const classesConducted = await AttendanceSession.countDocuments({ facultyId: faculty._id });
    const totalStudents = await User.countDocuments({
      institutionId,
      department: faculty.department,
      role: "student",
    });

    // To find at-risk students (overall attendance < 75%), we'll do an aggregation on TestAttendanceSummary
    // grouped by studentId, filtered by those in the department.
    // For extreme performance, we'll just return a simplified estimate or an exact aggregation.
    const atRiskAggregation = await TestAttendanceSummary.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "studentId",
          foreignField: "_id",
          as: "studentInfo",
        },
      },
      { $unwind: "$studentInfo" },
      { $match: { "studentInfo.department": faculty.department } },
      {
        $group: {
          _id: "$studentId",
          total: { $sum: "$totalTests" },
          attended: { $sum: "$attendedTests" },
        },
      },
      {
        $project: {
          percentage: {
            $cond: [
              { $gt: ["$total", 0] },
              { $multiply: [{ $divide: ["$attended", "$total"] }, 100] },
              0,
            ],
          },
        },
      },
      { $match: { percentage: { $lt: 75, $gt: 0 } } },
      { $count: "atRiskCount" }
    ]);

    const atRiskStudents = atRiskAggregation.length > 0 ? atRiskAggregation[0].atRiskCount : 0;

    res.json({
      success: true,
      stats: {
        classes: classesConducted,
        students: totalStudents,
        atRiskStudents,
        assignmentsGiven: classesConducted, // Approximate tests = assignments
        averageScore: 0, // Pending TestEngine integration
      },
    });
  } catch (error) {
    console.error("Error fetching faculty dashboard stats:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getPrincipalDashboardStats = async (req, res) => {
  try {
    const institutionId = req.tenant._id;

    const totalStudents = await User.countDocuments({ institutionId, role: "student" });
    const facultyCount = await User.countDocuments({ institutionId, role: "faculty" });

    // Distinct departments
    const departments = await User.distinct("department", { institutionId, role: { $in: ["student", "faculty"] } });
    const departmentCount = departments.filter((d) => !!d).length;

    // Health Index (Overall Attendance %)
    const healthAggregation = await TestAttendanceSummary.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "studentId",
          foreignField: "_id",
          as: "studentInfo",
        },
      },
      { $unwind: "$studentInfo" },
      { $match: { "studentInfo.institutionId": institutionId } },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalTests" },
          attended: { $sum: "$attendedTests" },
        },
      }
    ]);

    let healthIndex = 100;
    if (healthAggregation.length > 0 && healthAggregation[0].total > 0) {
      healthIndex = Math.round((healthAggregation[0].attended / healthAggregation[0].total) * 100);
    }

    res.json({
      success: true,
      stats: {
        totalStudents,
        faculty: facultyCount,
        departments: departmentCount || 1,
        healthIndex,
        institutionPerformance: 0, // pending TestEngine
        criticalAlerts: 0,
        topDepartment: departments.length > 0 ? departments[0].toUpperCase() : "N/A",
      },
    });
  } catch (error) {
    console.error("Error fetching principal dashboard stats:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getStudentDashboardStats,
  getFacultyDashboardStats,
  getPrincipalDashboardStats,
};
