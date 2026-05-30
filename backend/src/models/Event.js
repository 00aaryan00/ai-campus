const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    venue: { type: String, required: true },
    date: { type: Date, required: true },
    description: { type: String },
    fileUrl: { type: String }, // Path to the uploaded file (if any)
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
