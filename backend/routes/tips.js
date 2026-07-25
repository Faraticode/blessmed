const express = require('express');
const HealthTip = require('../models/HealthTip');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/tips - list all health tips, newest first, optionally filtered by category
router.get('/', async (req, res) => {
  try {
    const filter = req.query.category ? { category: req.query.category } : {};
    const tips = await HealthTip.find(filter).sort({ createdAt: -1 });
    res.json(tips);
  } catch (err) {
    res.status(500).json({ message: 'Could not load health tips.', error: err.message });
  }
});

module.exports = router;
