const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['student', 'admin'],
    default: 'student'
  },
  isTimetableLocked: {
    type: Boolean,
    default: false
  },
  semesterStartDate: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
