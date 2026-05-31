const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    venue: { type: String },
    date: { type: Date },
    description: { type: String },
    fileUrl: { type: String }, // Path to the uploaded file (if any)
    type: { type: String, enum: ['event', 'notification'], default: 'event' },
    targetAudience: { 
      type: String, 
      required: true 
    },
    tenantSlug: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);
