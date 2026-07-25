const express = require('express');
const fs = require('fs');
const HealthRecord = require('../models/HealthRecord');
const requireAuth = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();
router.use(requireAuth);

// GET /api/records - list all records for the logged-in user
router.get('/', async (req, res) => {
  try {
    const records = await HealthRecord.find({ user: req.userId }).sort({ recordDate: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Could not load your health records.', error: err.message });
  }
});

// POST /api/records - upload a new record (prescription, lab result, vaccination card)
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please attach a file (PDF, JPG, PNG, or WEBP).' });
    }
    const { recordType, title, notes, recordDate } = req.body;
    if (!recordType || !title) {
      return res.status(400).json({ message: 'Record type and title are required.' });
    }

    const record = await HealthRecord.create({
      user: req.userId,
      recordType,
      title,
      notes,
      recordDate: recordDate || Date.now(),
      fileName: req.file.originalname,
      filePath: req.file.filename,
      fileMimeType: req.file.mimetype
    });

    res.status(201).json({ message: 'Health record uploaded.', record });
  } catch (err) {
    res.status(500).json({ message: 'Could not upload your health record.', error: err.message });
  }
});

// PUT /api/records/:id - update record details (not the file itself)
router.put('/:id', async (req, res) => {
  try {
    const { title, notes, recordType, recordDate } = req.body;
    const record = await HealthRecord.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { $set: { title, notes, recordType, recordDate } },
      { new: true, runValidators: true }
    );

    if (!record) {
      return res.status(404).json({ message: 'Record not found.' });
    }
    res.json({ message: 'Health record updated.', record });
  } catch (err) {
    res.status(500).json({ message: 'Could not update this record.', error: err.message });
  }
});

// DELETE /api/records/:id - delete a record and its file
router.delete('/:id', async (req, res) => {
  try {
    const record = await HealthRecord.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!record) {
      return res.status(404).json({ message: 'Record not found.' });
    }

    const filePath = require('path').join(__dirname, '..', 'uploads', record.filePath);
    fs.unlink(filePath, () => {}); // best-effort cleanup, ignore errors

    res.json({ message: 'Health record deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Could not delete this record.', error: err.message });
  }
});

module.exports = router;
