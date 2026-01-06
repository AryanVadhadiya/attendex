require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();

// Trust Vercel Proxy
app.set('trust proxy', 1);

// Middleware
// // CORS configuration
// app.use(cors({
//   origin: '*',
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));
// app.options("*", cors());

app.use(cors({
  origin: "https://attendex-frontend.vercel.app",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
app.options("*", cors());


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
  windowMs: 15 * 60 * 1000,
  max: 5000,
  skip: (req) => req.method === "OPTIONS"
});

app.use('/api', limiter);

// MongoDB Connection for Vercel/Serverless
const MONGO_URI = process.env.MONGO_URI;

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;

  try {
    if (!MONGO_URI) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB Connected 🚀');
  } catch (err) {
    console.error('MongoDB Connection Error:', err.message);
  }
};

// Middleware to ensure DB is connected BEFORE routes
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// Root Endpoint
app.get('/', (req, res) => {
  res.send('Attendance App Backend is Running 🚀 [v2.1]');
});

// Debug endpoint
app.get('/debug', async (req, res) => {
  const status = {
    mongoUriExists: !!process.env.MONGO_URI,
    mongoUriLength: process.env.MONGO_URI ? process.env.MONGO_URI.length : 0,
    mongoUriPreview: process.env.MONGO_URI ? process.env.MONGO_URI.substring(0, 50) + '...' : 'NOT SET',
    mongooseState: mongoose.connection.readyState,
    mongooseStates: { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' }
  };
  res.json(status);
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

module.exports = app;
