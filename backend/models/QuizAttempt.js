const mongoose = require('mongoose');

const quizAttemptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // 'YYYY-MM-DD', one attempt per user per day
    questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'QuizQuestion' }],
    answers: [{ type: Number }], // selected option index per question, same order as questionIds
    score: { type: Number, required: true, min: 0 },
    totalQuestions: { type: Number, required: true, min: 0 },
    pointsEarned: { type: Number, required: true, min: 0 },
    claimedPoints: { type: Number, default: 0 } // how much of pointsEarned has been claimed on-chain
  },
  { timestamps: true }
);

quizAttemptSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
