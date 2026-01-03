const mongoose = require('mongoose');

const holidayRangeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    trim: true
  }
}, { timestamps: true });

module.exports = mongoose.model('HolidayRange', holidayRangeSchema);
