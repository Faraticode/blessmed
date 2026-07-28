require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const recordRoutes = require('./routes/records');
const emergencyRoutes = require('./routes/emergency');
const tipRoutes = require('./routes/tips');
const stepRoutes = require('./routes/steps');
const reminderRoutes = require('./routes/reminders');

const app = express();

connectDB();

app.use(cors());
app.use(express.json());

// Serve uploaded files (prescriptions, lab results, vaccination cards)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve the plain HTML/CSS/JS frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/tips', tipRoutes);
app.use('/api/steps', stepRoutes);
app.use('/api/reminders', reminderRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'BlessMed API is running.' });
});

// Fallback error handler (e.g. multer file-type rejections)
app.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({ message: err.message || 'Something went wrong.' });
  }
  next();
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`BlessMed server running on http://localhost:${PORT}`);
});
