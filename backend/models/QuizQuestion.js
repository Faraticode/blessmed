const mongoose = require('mongoose');

const quizQuestionSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ['general', 'nutrition', 'exercise', 'mental_wellness', 'first_aid'],
      required: true
    },
    question: { type: String, required: true, trim: true },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length >= 2 && arr.length <= 5,
        message: 'A question needs between 2 and 5 options.'
      }
    },
    correctIndex: { type: Number, required: true, min: 0 },
    explanation: { type: String, trim: true, default: '' },
    active: { type: Boolean, default: true } // set false to retire a question without deleting history
  },
  { timestamps: true }
);

module.exports = mongoose.model('QuizQuestion', quizQuestionSchema);
