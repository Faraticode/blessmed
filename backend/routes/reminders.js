const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const Reminder = require('../models/Reminder');
const HealthProfile = require('../models/HealthProfile');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Using Haiku here since generating a handful of short reminder
// suggestions is a lightweight task — cheaper and fast. Swap to
// 'claude-sonnet-4-6' in the anthropic.messages.create call below
// if you'd like higher-quality suggestions and don't mind the
// extra cost.
const MODEL = 'claude-haiku-4-5-20251001';

// GET /api/reminders - all active reminders for this user
router.get('/', async (req, res) => {
  try {
    const reminders = await Reminder.find({ user: req.userId }).sort({ time: 1 });
    res.json(reminders);
  } catch (err) {
    res.status(500).json({ message: 'Could not load your reminders.', error: err.message });
  }
});

// POST /api/reminders - create a reminder manually
router.post('/', async (req, res) => {
  try {
    const { title, message, time } = req.body;
    if (!title || !time) {
      return res.status(400).json({ message: 'A title and time are required.' });
    }
    const reminder = await Reminder.create({ user: req.userId, title, message, time, source: 'manual' });
    res.status(201).json({ message: 'Reminder created.', reminder });
  } catch (err) {
    res.status(500).json({ message: 'Could not create the reminder.', error: err.message });
  }
});

// PUT /api/reminders/:id - update or toggle a reminder
router.put('/:id', async (req, res) => {
  try {
    const { title, message, time, active } = req.body;
    const reminder = await Reminder.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { $set: { title, message, time, active } },
      { new: true, runValidators: true }
    );
    if (!reminder) return res.status(404).json({ message: 'Reminder not found.' });
    res.json({ message: 'Reminder updated.', reminder });
  } catch (err) {
    res.status(500).json({ message: 'Could not update the reminder.', error: err.message });
  }
});

// DELETE /api/reminders/:id
router.delete('/:id', async (req, res) => {
  try {
    const reminder = await Reminder.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!reminder) return res.status(404).json({ message: 'Reminder not found.' });
    res.json({ message: 'Reminder deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Could not delete the reminder.', error: err.message });
  }
});

// POST /api/reminders/generate - ask Claude for reminder suggestions
// based on the user's health profile. Returns suggestions only —
// nothing is saved until the user accepts one via POST /api/reminders.
router.post('/generate', async (req, res) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ message: 'AI reminders are not configured yet — ANTHROPIC_API_KEY is missing on the server.' });
    }

    const profile = await HealthProfile.findOne({ user: req.userId });
    if (!profile) {
      return res.status(404).json({ message: 'Set up your health profile first so suggestions can be relevant to you.' });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const profileSummary = [
      `Age: ${profile.age}`,
      `Existing conditions: ${profile.existingConditions?.join(', ') || 'none listed'}`,
      `Allergies: ${profile.allergies?.join(', ') || 'none listed'}`
    ].join('\n');

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: `You suggest gentle, general daily health reminders for a personal health app called BlessMed, based on a user's health profile summary. You are not a doctor and must never diagnose, prescribe medication, or give specific treatment advice. Suggestions should be general wellness habits (hydration, movement, sleep, check-ups, medication-taking reminders phrased generically like "take your morning medication" without naming any drug). Respond with ONLY a JSON array, no other text, of 3 to 5 objects each shaped like {"title": string, "message": string, "time": "HH:mm" in 24-hour format}.`,
      messages: [
        { role: 'user', content: `Here is my health profile summary:\n${profileSummary}\n\nSuggest some daily reminders for me.` }
      ]
    });

    const textBlock = message.content.find(block => block.type === 'text');
    let suggestions;
    try {
      suggestions = JSON.parse(textBlock.text);
    } catch {
      return res.status(502).json({ message: 'Could not parse AI suggestions. Please try again.' });
    }

    res.json({ suggestions });
  } catch (err) {
    res.status(500).json({ message: 'Could not generate reminder suggestions.', error: err.message });
  }
});

module.exports = router;
