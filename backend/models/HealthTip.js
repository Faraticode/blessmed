const mongoose = require('mongoose');

const healthTipSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ['general', 'nutrition', 'exercise', 'mental_wellness'],
      required: true
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('HealthTip', healthTipSchema);
