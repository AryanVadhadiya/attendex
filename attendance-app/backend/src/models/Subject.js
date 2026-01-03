const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    default: '#3b82f6' // Blue-500 default
  },
  lecturesPerWeek: {
    type: Number,
    default: 0,
    min: 0
  },
  labsPerWeek: {
    type: Number,
    default: 0,
    min: 0
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Subject', subjectSchema);
