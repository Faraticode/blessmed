const mongoose = require('mongoose');

const healthRecordSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recordType: {
      type: String,
      enum: ['prescription', 'lab_result', 'vaccination_card', 'other'],
      required: true
    },
    title: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    fileMimeType: { type: String, required: true },
    recordDate: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model('HealthRecord', healthRecordSchema);
