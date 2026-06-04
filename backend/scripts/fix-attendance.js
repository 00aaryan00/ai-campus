require("dotenv").config();
const mongoose = require("mongoose");
const AttendanceSession = require("../src/models/AttendanceSession");
const TestAttendanceSummary = require("../src/models/TestAttendanceSummary");

async function fixAttendance() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/ai-campus");
    console.log("Connected.");

    console.log("Wiping corrupted TestAttendanceSummary records...");
    await TestAttendanceSummary.deleteMany({});
    
    console.log("Fetching all AttendanceSessions...");
    const sessions = await AttendanceSession.find({});
    
    console.log(`Found ${sessions.length} sessions. Rebuilding summaries...`);
    
    const bulkOps = [];
    
    for (const session of sessions) {
      const allStudents = [
        ...session.presentStudents.map(id => ({ id: id.toString(), present: true })),
        ...session.absentStudents.map(id => ({ id: id.toString(), present: false }))
      ];
      
      for (const student of allStudents) {
        const updatePipeline = [
          {
            $set: {
              studentId: new mongoose.Types.ObjectId(student.id),
              subject: session.subject,
              institutionId: session.institutionId,
              totalTests: { $add: [{ $ifNull: ["$totalTests", 0] }, 1] },
              attendedTests: {
                $add: [{ $ifNull: ["$attendedTests", 0] }, student.present ? 1 : 0],
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
              studentId: new mongoose.Types.ObjectId(student.id),
              subject: session.subject,
              institutionId: session.institutionId,
            },
            update: updatePipeline,
            upsert: true,
          },
        });
      }
    }

    if (bulkOps.length > 0) {
      console.log(`Executing ${bulkOps.length} bulk operations...`);
      await TestAttendanceSummary.collection.bulkWrite(bulkOps);
      console.log("Rebuild complete.");
    } else {
      console.log("No data to rebuild.");
    }

  } catch (error) {
    console.error("Error fixing attendance:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
  }
}

fixAttendance();
