const Event = require("../models/Event");
const imagekit = require("../config/imagekit");

const createEvent = async (req, res) => {
  try {
    const { tenantSlug } = req.params;
    const { title, venue, date, description, targetAudience, type } = req.body;
    
    // Only institution_admin or hod can create events
    if (req.user.role !== "institution_admin" && req.user.role !== "hod") {
      return res.status(403).json({ success: false, message: "Only principals or HODs can create events." });
    }

    if (!title) {
      return res.status(400).json({ success: false, message: "Missing title." });
    }
    if (type !== 'notification' && (!venue || !date)) {
      return res.status(400).json({ success: false, message: "Missing venue or date for event." });
    }

    // Determine targetAudience based on who is uploading
    let computedAudience = targetAudience || "all";
    if (req.user.role === "hod") {
      computedAudience = req.user.department || "all";
    }

    let fileUrl = "";
    if (req.file) {
      try {
        const response = await imagekit.upload({
          file: req.file.buffer.toString("base64"), // required
          fileName: req.file.originalname, // required
          folder: "/ai_campus_events",
        });
        fileUrl = response.url;
      } catch (uploadError) {
        console.error("ImageKit upload error:", uploadError);
        return res.status(500).json({ success: false, message: "File upload failed." });
      }
    }

    const event = new Event({
      title,
      venue,
      date,
      description,
      targetAudience: computedAudience,
      fileUrl,
      type: type === 'notification' ? 'notification' : 'event',
      tenantSlug,
      createdBy: req.user.id,
    });

    await event.save();

    res.status(201).json({ success: true, event });
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const getEvents = async (req, res) => {
  try {
    const { tenantSlug } = req.params;
    const { role } = req.user;

    let query = { tenantSlug };

    // Filter by role/department
    if (role === "institution_admin" || role === "principal") {
      // Principal should not see department-specific events created by HODs
      query.targetAudience = /^all$/i;
    } else {
      const userDept = req.user.department;
      if (userDept) {
        query.targetAudience = { 
          $in: [
            /^all$/i,
            new RegExp(`^${userDept.trim()}$`, "i")
          ] 
        };
      } else {
        query.targetAudience = /^all$/i;
      }
    }

    // Sort by createdAt descending
    const events = await Event.find(query).sort({ createdAt: -1 });

    res.status(200).json({ success: true, events });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const { tenantSlug, eventId } = req.params;

    if (req.user.role !== "institution_admin" && req.user.role !== "hod") {
      return res.status(403).json({ success: false, message: "Only principals and HODs can delete events." });
    }

    // HODs can only delete events in their department
    let query = { _id: eventId, tenantSlug };
    if (req.user.role === "hod") {
      query.targetAudience = new RegExp(`^${req.user.department.trim()}$`, "i");
      query.createdBy = req.user.id;
    }

    const event = await Event.findOneAndDelete(query);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found." });
    }

    res.status(200).json({ success: true, message: "Event deleted successfully." });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

module.exports = {
  createEvent,
  getEvents,
  deleteEvent,
};
