require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();

// Middleware
// CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Helmet with relaxed settings for development
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json());
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000 // Increased for development to prevent 429 errors
});
app.use('/api', limiter);

// Root Endpoint
app.get('/', (req, res) => {
  res.send('Attendance App Backend is Running 🚀');
});

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
const subjectRoutes = require('./routes/subject.routes');
const timetableRoutes = require('./routes/timetable.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const calendarRoutes = require('./routes/calendar.routes');

app.use('/api/subjects', subjectRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api', calendarRoutes); // Mounts /holidays and /granted at /api level
app.use('/api/user', require('./routes/user.routes'));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Server Error', error: err.message });
});

// For Vercel Serverless: Connect to DB if not already connected
const MONGO_URI = process.env.MONGO_URI;
if (process.env.NODE_ENV === 'production') {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected (Serverless)'))
    .catch(err => console.error('MongoDB Connection Error:', err));
}

module.exports = app;
