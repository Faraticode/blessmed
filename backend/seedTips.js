// Run this once with: node seedTips.js
// Populates the database with starter health tips for the feed.

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const HealthTip = require('./models/HealthTip');

const sampleTips = [
  {
    category: 'general',
    title: 'Stay hydrated',
    body: 'Aim for at least 8 glasses of water a day. Dehydration can cause fatigue, headaches, and poor concentration.'
  },
  {
    category: 'nutrition',
    title: 'Eat more colour',
    body: 'A plate with a variety of colourful vegetables usually means a wider range of vitamins and minerals.'
  },
  {
    category: 'exercise',
    title: 'Move every hour',
    body: 'If you sit for long periods, stand up and stretch or walk for a few minutes every hour.'
  },
  {
    category: 'mental_wellness',
    title: 'Take a breathing break',
    body: 'Try 4 seconds in, hold for 4, and out for 4. A few rounds can calm your nervous system during a stressful day.'
  },
  {
    category: 'general',
    title: 'Know your numbers',
    body: 'Keep track of your blood pressure and blood sugar, especially if they run in your family.'
  }
];

async function seed() {
  await connectDB();
  await HealthTip.deleteMany({});
  await HealthTip.insertMany(sampleTips);
  console.log(`Seeded ${sampleTips.length} health tips.`);
  await mongoose.connection.close();
}

seed();
