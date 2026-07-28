const mongoose = require('mongoose');

const stepLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // 'YYYY-MM-DD', one entry per user per day
    steps: { type: Number, required: true, min: 0 },
    claimedMilestone: { type: Number, default: 0 } // highest milestone already claimed on-chain for this day
  },
  { timestamps: true }
);

stepLogSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('StepLog', stepLogSchema);
