const express = require('express');
const StepLog = require('../models/StepLog');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Milestone thresholds (steps in a single day) and the on-chain points
// they're worth. Only the highest milestone reached in a day can be
// claimed, and only once — claimedMilestone tracks that server-side.
const MILESTONES = [
  { steps: 5000, points: 2 },
  { steps: 10000, points: 5 },
  { steps: 15000, points: 8 },
  { steps: 20000, points: 12 }
];

function highestMilestone(steps) {
  return MILESTONES.filter(m => steps >= m.steps).pop() || null;
}

// GET /api/steps - full history, most recent first
router.get('/', async (req, res) => {
  try {
    const logs = await StepLog.find({ user: req.userId }).sort({ date: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Could not load your step history.', error: err.message });
  }
});

// GET /api/steps/today - today's entry, plus milestone info
router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const log = await StepLog.findOne({ user: req.userId, date: today });
    const steps = log?.steps || 0;
    const milestone = highestMilestone(steps);

    res.json({
      date: today,
      steps,
      claimedMilestone: log?.claimedMilestone || 0,
      currentMilestonePoints: milestone?.points || 0,
      claimable: !!milestone && milestone.points > (log?.claimedMilestone || 0),
      milestones: MILESTONES
    });
  } catch (err) {
    res.status(500).json({ message: 'Could not load today\'s steps.', error: err.message });
  }
});

// POST /api/steps - log or update today's step count
router.post('/', async (req, res) => {
  try {
    const { steps, date } = req.body;
    if (steps === undefined || steps < 0) {
      return res.status(400).json({ message: 'A valid step count is required.' });
    }
    const logDate = date || new Date().toISOString().slice(0, 10);

    const log = await StepLog.findOneAndUpdate(
      { user: req.userId, date: logDate },
      { $set: { steps } },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );

    res.json({ message: 'Steps logged.', log });
  } catch (err) {
    res.status(500).json({ message: 'Could not log your steps.', error: err.message });
  }
});

// PUT /api/steps/claim - mark today's milestone as claimed (call after
// the on-chain transaction is submitted from the Blockchain page)
router.put('/claim', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const log = await StepLog.findOne({ user: req.userId, date: today });
    if (!log) {
      return res.status(404).json({ message: 'No steps logged for today yet.' });
    }

    const milestone = highestMilestone(log.steps);
    if (!milestone || milestone.points <= log.claimedMilestone) {
      return res.status(400).json({ message: 'No new milestone available to claim.' });
    }

    log.claimedMilestone = milestone.points;
    await log.save();

    res.json({ message: 'Milestone marked as claimed.', log });
  } catch (err) {
    res.status(500).json({ message: 'Could not update your claimed milestone.', error: err.message });
  }
});

module.exports = router;
