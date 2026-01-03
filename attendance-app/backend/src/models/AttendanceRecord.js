const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
  occurrenceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Occurrence',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  present: {
    type: Boolean,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.Mixed, // ObjectId for user or String 'system'
    required: true
  },
  isAutoMarked: {
    type: Boolean,
    default: false
  },
  isGranted: {
    type: Boolean,
    default: false
  },
  note: {
    type: String
  }
}, { timestamps: true });

// Ensure one record per occurrence per user
attendanceRecordSchema.index({ occurrenceId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('AttendanceRecord', attendanceRecordSchema);
