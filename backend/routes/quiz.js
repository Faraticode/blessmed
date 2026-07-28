const express = require('express');
const QuizQuestion = require('../models/QuizQuestion');
const QuizAttempt = require('../models/QuizAttempt');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const QUESTIONS_PER_DAY = 5;
const POINTS_PER_CORRECT = 2;

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

// Small deterministic PRNG (mulberry32) seeded from the date string, so
// every user gets the same 5 questions on a given day, and the server
// can re-derive that same set later to grade a submission — no need to
// store the question pool client-side or trust the client's answers.
function seededShuffle(array, seed) {
  let a = seed;
  function rand() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const copy = array.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function seedFromDate(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) | 0;
  }
  return hash;
}

// Pick today's question set (deterministic) from the active question bank.
async function getTodaysQuestions(dateStr) {
  const pool = await QuizQuestion.find({ active: true }).sort({ _id: 1 });
  if (pool.length === 0) return [];
  const shuffled = seededShuffle(pool, seedFromDate(dateStr));
  return shuffled.slice(0, Math.min(QUESTIONS_PER_DAY, shuffled.length));
}

// GET /api/quiz/today - today's quiz. If already attempted, returns the
// result with correct answers revealed; otherwise returns questions
// without giving away the correct index.
router.get('/today', async (req, res) => {
  try {
    const date = todayString();
    const existing = await QuizAttempt.findOne({ user: req.userId, date }).populate('questionIds');

    if (existing) {
      return res.json({
        date,
        completed: true,
        score: existing.score,
        totalQuestions: existing.totalQuestions,
        pointsEarned: existing.pointsEarned,
        claimedPoints: existing.claimedPoints,
        claimable: existing.pointsEarned > existing.claimedPoints,
        questions: existing.questionIds.map((q, i) => ({
          id: q._id,
          question: q.question,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
          yourAnswer: existing.answers[i]
        }))
      });
    }

    const questions = await getTodaysQuestions(date);
    if (questions.length === 0) {
      return res.status(404).json({ message: 'No quiz questions are available yet. Check back soon.' });
    }

    res.json({
      date,
      completed: false,
      questions: questions.map(q => ({ id: q._id, question: q.question, options: q.options }))
    });
  } catch (err) {
    res.status(500).json({ message: 'Could not load today\'s quiz.', error: err.message });
  }
});

// POST /api/quiz/submit - grade today's answers. One attempt per user per day.
router.post('/submit', async (req, res) => {
  try {
    const date = todayString();
    const { answers } = req.body;

    if (!Array.isArray(answers)) {
      return res.status(400).json({ message: 'Answers must be an array of selected option indexes.' });
    }

    const existing = await QuizAttempt.findOne({ user: req.userId, date });
    if (existing) {
      return res.status(409).json({ message: 'You already completed today\'s quiz. Come back tomorrow for a new one.' });
    }

    const questions = await getTodaysQuestions(date);
    if (questions.length === 0) {
      return res.status(404).json({ message: 'No quiz questions are available yet. Check back soon.' });
    }
    if (answers.length !== questions.length) {
      return res.status(400).json({ message: `Expected ${questions.length} answers, got ${answers.length}.` });
    }

    let score = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correctIndex) score++;
    });
    const pointsEarned = score * POINTS_PER_CORRECT;

    const attempt = await QuizAttempt.create({
      user: req.userId,
      date,
      questionIds: questions.map(q => q._id),
      answers,
      score,
      totalQuestions: questions.length,
      pointsEarned,
      claimedPoints: 0
    });

    res.status(201).json({
      message: 'Quiz submitted.',
      date,
      score,
      totalQuestions: attempt.totalQuestions,
      pointsEarned,
      claimable: pointsEarned > 0,
      questions: questions.map((q, i) => ({
        id: q._id,
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        yourAnswer: answers[i]
      }))
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'You already completed today\'s quiz. Come back tomorrow for a new one.' });
    }
    res.status(500).json({ message: 'Could not submit your quiz.', error: err.message });
  }
});

// PUT /api/quiz/claim - mark today's quiz points as claimed on-chain
// (call after the Stacks transaction is submitted from the frontend).
router.put('/claim', async (req, res) => {
  try {
    const date = todayString();
    const attempt = await QuizAttempt.findOne({ user: req.userId, date });
    if (!attempt) {
      return res.status(404).json({ message: 'No quiz completed today yet.' });
    }
    if (attempt.pointsEarned <= attempt.claimedPoints) {
      return res.status(400).json({ message: 'No new quiz points available to claim.' });
    }

    attempt.claimedPoints = attempt.pointsEarned;
    await attempt.save();

    res.json({ message: 'Quiz points marked as claimed.', attempt });
  } catch (err) {
    res.status(500).json({ message: 'Could not update your claimed quiz points.', error: err.message });
  }
});

module.exports = router;
