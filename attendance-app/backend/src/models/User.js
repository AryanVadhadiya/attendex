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
  },
  semesterEndDate: {
    type: Date
  },
  labUnitStrategy: {
    type: String,
    enum: ['nirma', 'custom'],
    default: 'nirma'
  },
  labUnitValue: {
    type: Number,
    min: 1,
    max: 4,
    default: 1
  },
  labUnitLockedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
