const Timetable = require("../models/Timetable");
const User = require("../models/User");

const bulkSaveTimetable = async (req, res, next) => {
  try {
    const { timetableData } = req.body;
    
    if (!timetableData || !Array.isArray(timetableData)) {
      return res.status(400).json({ success: false, message: "Invalid timetable data format." });
    }

    if (req.user.role !== "super_admin" && req.user.role !== "institution_admin" && req.user.role !== "hod") {
      return res.status(403).json({ success: false, message: "Not authorized to upload timetable." });
    }

    const institutionId = req.tenant ? req.tenant._id : req.user.institutionId;

    // Process each row to resolve facultyId from facultyEmail
    const processedData = [];
    const facultyCache = {};

    for (const row of timetableData) {
      if (!row.facultyEmail) continue; // Skip invalid rows
      
      let facultyId = facultyCache[row.facultyEmail];
      
      if (!facultyId) {
        const faculty = await User.findOne({ 
          email: row.facultyEmail.toLowerCase(), 
          institutionId, 
          role: { $in: ["faculty", "hod"] } 
        });
        
        if (faculty) {
          facultyId = faculty._id;
          facultyCache[row.facultyEmail] = facultyId;
        } else {
          // If faculty not found, skip this row or handle error
          continue; 
        }
      }

      processedData.push({
        institutionId,
        dayOfWeek: row.dayOfWeek,
        startTime: row.startTime,
        endTime: row.endTime,
        subject: row.subject,
        room: row.room,
        department: row.department,
        semester: row.semester,
        facultyId,
      });
    }

    // Clear existing timetable for this institution (Optional: we can delete only the provided departments/semesters instead)
    await Timetable.deleteMany({ institutionId });
    
    // Insert new data
    if (processedData.length > 0) {
      await Timetable.insertMany(processedData);
      res.status(200).json({ 
        success: true, 
        message: `Successfully uploaded ${processedData.length} classes.`,
        insertedCount: processedData.length 
      });
    } else {
      res.status(400).json({
        success: false,
        message: `Failed to upload: 0 classes added. This usually happens if the "Teacher Email" column doesn't match any registered faculty in the system.`
      });
    }

  } catch (error) {
    next(error);
  }
};

const getMySchedule = async (req, res, next) => {
  try {
    const institutionId = req.tenant ? req.tenant._id : req.user.institutionId;
    let query = { institutionId };

    if (req.user.role === "faculty" || req.user.role === "hod") {
      query.facultyId = req.user._id;
    } else if (req.user.role === "student") {
      if (!req.user.semester) {
        return res.status(200).json({ success: true, schedule: [] });
      }
      query.department = new RegExp(`^${req.user.department}$`, 'i');
      
      // Extract just the number from semester (e.g. "Semester 6" -> "6") to ensure it matches Excel uploads
      const semMatch = req.user.semester.match(/\d+/);
      const semNum = semMatch ? semMatch[0] : req.user.semester;
      query.semester = new RegExp(`^(${semNum}|Semester ${semNum})$`, 'i');
    } else {
      // Admins can see everything
      // query is just { institutionId }
    }

    const schedule = await Timetable.find(query).populate("facultyId", "name email");

    res.status(200).json({
      success: true,
      schedule,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  bulkSaveTimetable,
  getMySchedule
};
