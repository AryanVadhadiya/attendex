const mongoose = require('mongoose');

const occurrenceSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    index: true
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  weeklySlotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WeeklySlot',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startHour: {
    type: Number,
    required: true
  },
  durationHours: {
    type: Number,
    required: true
  },
  sessionType: {
    type: String,
    enum: ['lecture', 'lab'],
    required: true
  },
  isExcluded: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Ensure unique occurrence per slot per date
occurrenceSchema.index({ date: 1, weeklySlotId: 1 }, { unique: true });

// Performance Indexes
occurrenceSchema.index({ userId: 1, isExcluded: 1, date: 1 });
occurrenceSchema.index({ userId: 1, subjectId: 1, isExcluded: 1 });

module.exports = mongoose.model('Occurrence', occurrenceSchema);
