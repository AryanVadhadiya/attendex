const mongoose = require('mongoose');

const grantedAttendanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['full', 'half', 'partial'],
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date // Optional for single day, same as startDate
  },
  occurrenceIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Occurrence'
  }],
  subjectIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject'
  }],
  reason: {
    type: String,
    trim: true
  }
}, { timestamps: true });

module.exports = mongoose.model('GrantedAttendance', grantedAttendanceSchema);
