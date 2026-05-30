const Event = require("../models/Event");

const createEvent = async (req, res) => {
  try {
    const { tenantSlug } = req.params;
    const { title, venue, date, description, targetAudience } = req.body;
    
    // Only institution_admin or hod can create events
    if (req.user.role !== "institution_admin" && req.user.role !== "hod") {
      return res.status(403).json({ success: false, message: "Only principals or HODs can create events." });
    }

    if (!title || !venue || !date) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    // Determine targetAudience based on who is uploading
    let computedAudience = "all";
    if (req.user.role === "hod") {
      computedAudience = req.user.department || "all";
    }

    let fileUrl = "";
    if (req.file) {
      // Return relative path to the frontend, e.g., /uploads/filename.pdf
      fileUrl = `/uploads/${req.file.filename}`;
    }

    const event = new Event({
      title,
      venue,
      date,
      description,
      targetAudience: computedAudience,
      fileUrl,
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
    if (role !== "institution_admin") {
      const userDept = req.user.department;
      if (userDept) {
        query.targetAudience = { $in: ["all", userDept] };
      } else {
        query.targetAudience = "all";
      }
    }

    // Sort by date upcoming
    const events = await Event.find(query).sort({ date: 1 });

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
      query.targetAudience = req.user.department;
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
