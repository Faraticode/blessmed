const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, trim: true },
    time: { type: String, required: true }, // 'HH:mm', 24-hour, checked client-side against local time
    source: { type: String, enum: ['ai', 'manual'], default: 'manual' },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Reminder', reminderSchema);
