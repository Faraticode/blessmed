const express = require('express');
const QRCode = require('qrcode');
const HealthProfile = require('../models/HealthProfile');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/emergency/qrcode - generate a QR code with only essential emergency info
router.get('/qrcode', async (req, res) => {
  try {
    const profile = await HealthProfile.findOne({ user: req.userId });

    if (!profile) {
      return res.status(404).json({ message: 'Create your health profile first so we know what to include.' });
    }

    const emergencyData = {
      name: profile.name,
      bloodGroup: profile.bloodGroup,
      allergies: profile.allergies,
      emergencyContact: profile.emergencyContact
    };

    const qrText = JSON.stringify(emergencyData);
    const qrDataUrl = await QRCode.toDataURL(qrText, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 400
    });

    res.json({ qrCode: qrDataUrl, data: emergencyData });
  } catch (err) {
    res.status(500).json({ message: 'Could not generate your emergency QR code.', error: err.message });
  }
});

module.exports = router;
