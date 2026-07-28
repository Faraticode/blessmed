// Run this once with: node seedQuiz.js
// Populates the database with a starter bank of daily health quiz questions.
// Each day, 5 of these are picked deterministically (see routes/quiz.js)
// so every user gets the same set on a given date.

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const QuizQuestion = require('./models/QuizQuestion');

const sampleQuestions = [
  {
    category: 'general',
    question: 'How many glasses of water is a commonly recommended daily target for most adults?',
    options: ['2', '4', '8', '15'],
    correctIndex: 2,
    explanation: 'About 8 glasses (roughly 2 litres) a day is a common general guideline, though needs vary by body size and activity.'
  },
  {
    category: 'nutrition',
    question: 'Which nutrient is the body\'s primary source of quick energy?',
    options: ['Protein', 'Carbohydrates', 'Vitamin C', 'Iron'],
    correctIndex: 1,
    explanation: 'Carbohydrates are broken down into glucose, the body\'s preferred quick fuel.'
  },
  {
    category: 'exercise',
    question: 'How many minutes of moderate exercise per week are commonly recommended for adults?',
    options: ['30', '75', '150', '300'],
    correctIndex: 2,
    explanation: 'Health guidelines commonly recommend at least 150 minutes of moderate aerobic activity a week.'
  },
  {
    category: 'mental_wellness',
    question: 'Which of these is a simple, evidence-based way to reduce acute stress in the moment?',
    options: ['Holding your breath', 'Slow, deep breathing', 'Skipping meals', 'Checking your phone'],
    correctIndex: 1,
    explanation: 'Slow, deep breathing activates the parasympathetic nervous system and can lower heart rate and stress.'
  },
  {
    category: 'first_aid',
    question: 'What should you do first if someone is choking but can still cough forcefully?',
    options: ['Perform abdominal thrusts immediately', 'Encourage them to keep coughing', 'Give them water', 'Lay them flat'],
    correctIndex: 1,
    explanation: 'A forceful cough is the body\'s own airway-clearing reflex — let it work before intervening.'
  },
  {
    category: 'nutrition',
    question: 'Which of these is a good source of dietary fibre?',
    options: ['White bread', 'Whole fruits and vegetables', 'Fried chicken', 'Soft drinks'],
    correctIndex: 1,
    explanation: 'Whole fruits, vegetables, legumes, and whole grains are the main dietary sources of fibre.'
  },
  {
    category: 'general',
    question: 'Roughly how many hours of sleep do most adults need per night?',
    options: ['3-4', '5-6', '7-9', '11-12'],
    correctIndex: 2,
    explanation: 'Most adults function best with 7-9 hours of sleep a night.'
  },
  {
    category: 'exercise',
    question: 'What is a good sign you should stop and rest during exercise?',
    options: ['Slightly faster breathing', 'Sharp pain or dizziness', 'Mild sweating', 'Feeling warm'],
    correctIndex: 1,
    explanation: 'Sharp pain, dizziness, or chest tightness are signs to stop and seek guidance — mild sweating and faster breathing are normal.'
  },
  {
    category: 'mental_wellness',
    question: 'Which habit is most consistently linked to better long-term mental wellbeing?',
    options: ['Isolating when stressed', 'Regular social connection', 'Constant multitasking', 'Skipping breaks'],
    correctIndex: 1,
    explanation: 'Regular, meaningful social connection is one of the most consistent predictors of long-term wellbeing.'
  },
  {
    category: 'first_aid',
    question: 'For a minor burn, what is the recommended first step?',
    options: ['Apply ice directly', 'Cool it under running water for several minutes', 'Apply butter', 'Pop any blisters'],
    correctIndex: 1,
    explanation: 'Cool running water (not ice) for several minutes helps reduce heat in the tissue and limit damage.'
  },
  {
    category: 'general',
    question: 'What does "BMI" stand for?',
    options: ['Body Mass Index', 'Blood Metabolic Indicator', 'Basic Muscle Index', 'Body Movement Intensity'],
    correctIndex: 0,
    explanation: 'BMI (Body Mass Index) is a simple weight-to-height ratio used as a rough population-level screening tool.'
  },
  {
    category: 'nutrition',
    question: 'Which of these is an added sugar you might not expect?',
    options: ['Ketchup', 'Plain water', 'Grilled chicken', 'Olive oil'],
    correctIndex: 0,
    explanation: 'Many condiments like ketchup contain added sugar even though they don\'t taste overtly sweet.'
  },
  {
    category: 'exercise',
    question: 'What is the main benefit of a warm-up before exercise?',
    options: ['It burns the most calories', 'It prepares muscles and reduces injury risk', 'It replaces stretching entirely', 'It is only for athletes'],
    correctIndex: 1,
    explanation: 'Warming up raises muscle temperature and heart rate gradually, which helps reduce injury risk.'
  },
  {
    category: 'mental_wellness',
    question: 'Journaling is often recommended for mental wellness mainly because it can help you:',
    options: ['Avoid your emotions', 'Process and reflect on your thoughts', 'Multitask better', 'Fall asleep instantly'],
    correctIndex: 1,
    explanation: 'Writing things down can help externalize and organize thoughts, making them easier to process.'
  },
  {
    category: 'first_aid',
    question: 'When should you call emergency services for a suspected fracture?',
    options: ['Only if there is visible bleeding', 'If the bone is visibly deformed or the person can\'t be safely moved', 'Never, always wait it out', 'Only for adults'],
    correctIndex: 1,
    explanation: 'Visible deformity, inability to move safely, or numbness are all signs to get professional help promptly.'
  }
];

async function seed() {
  await connectDB();
  await QuizQuestion.deleteMany({});
  await QuizQuestion.insertMany(sampleQuestions);
  console.log(`Seeded ${sampleQuestions.length} quiz questions.`);
  await mongoose.connection.close();
}

seed();
