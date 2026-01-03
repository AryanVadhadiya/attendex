const mongoose = require('mongoose');

const weeklySlotSchema = new mongoose.Schema({
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
  dayOfWeek: {
    type: Number,
    required: true,
    min: 0,
    max: 6 // 0=Sunday, 1=Monday...
  },
  startHour: {
    type: Number,
    required: true,
    min: 0,
    max: 23
  },
  durationHours: {
    type: Number,
    required: true,
    default: 1
  },
  sessionType: {
    type: String,
    enum: ['lecture', 'lab'],
    default: 'lecture'
  }
}, { timestamps: true });

module.exports = mongoose.model('WeeklySlot', weeklySlotSchema);
