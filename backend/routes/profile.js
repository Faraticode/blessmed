const express = require('express');
const HealthProfile = require('../models/HealthProfile');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/profile - read the logged-in user's health profile
router.get('/', async (req, res) => {
  try {
    const profile = await HealthProfile.findOne({ user: req.userId });
    if (!profile) {
      return res.status(404).json({ message: 'No health profile found yet. Create one to get started.' });
    }
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: 'Could not load your health profile.', error: err.message });
  }
});

// POST /api/profile - create the health profile (one per user)
router.post('/', async (req, res) => {
  try {
    const existing = await HealthProfile.findOne({ user: req.userId });
    if (existing) {
      return res.status(409).json({ message: 'A health profile already exists. Use update instead.' });
    }

    const profile = await HealthProfile.create({ ...req.body, user: req.userId });
    res.status(201).json({ message: 'Health profile created.', profile });
  } catch (err) {
    res.status(500).json({ message: 'Could not create your health profile.', error: err.message });
  }
});

// PUT /api/profile - update the health profile
router.put('/', async (req, res) => {
  try {
    const profile = await HealthProfile.findOneAndUpdate(
      { user: req.userId },
      { $set: req.body },
      { new: true, runValidators: true, upsert: false }
    );

    if (!profile) {
      return res.status(404).json({ message: 'No health profile found to update. Create one first.' });
    }

    res.json({ message: 'Health profile updated.', profile });
  } catch (err) {
    res.status(500).json({ message: 'Could not update your health profile.', error: err.message });
  }
});

// DELETE /api/profile - delete the health profile
router.delete('/', async (req, res) => {
  try {
    const result = await HealthProfile.findOneAndDelete({ user: req.userId });
    if (!result) {
      return res.status(404).json({ message: 'No health profile found to delete.' });
    }
    res.json({ message: 'Health profile deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Could not delete your health profile.', error: err.message });
  }
});

module.exports = router;
