const GrantedAttendance = require('../models/GrantedAttendance');
const AttendanceRecord = require('../models/AttendanceRecord');
const Occurrence = require('../models/Occurrence');
const Joi = require('joi');
const dayjs = require('dayjs');

const getGranted = async (req, res) => {
  try {
    const grants = await GrantedAttendance.find({ userId: req.user._id }).sort({ startDate: -1 });
    res.json(grants);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const createGranted = async (req, res) => {
  const schema = Joi.object({
    type: Joi.string().valid('full', 'half', 'partial').required(),
    startDate: Joi.date().required(),
    endDate: Joi.date().allow(null),
    reason: Joi.string().allow('', null),
    occurrenceIds: Joi.array().items(Joi.string()), // For partial
    subjectIds: Joi.array().items(Joi.string()) // For partial
  });

  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const grant = await GrantedAttendance.create({
      ...req.body,
      userId: req.user._id
    });

    // Apply Grant -> Mark Attendance Present
    const { type, startDate, endDate, occurrenceIds } = req.body;
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date(startDate); // Default to same day if null? Spec says endDate?
    // Actually spec says "startDate, endDate?".

    let targetOccurrenceIds = [];

    if (type === 'full') {
      // Find all valid occurrences in range
      const occurrences = await Occurrence.find({
        userId: req.user._id,
        date: { $gte: start, $lte: end },
        isExcluded: false
      });
      targetOccurrenceIds = occurrences.map(o => o._id);
    } else if (type === 'partial' && occurrenceIds && occurrenceIds.length > 0) {
      targetOccurrenceIds = occurrenceIds;
    }
    // 'half' logic: "require user to select which sessions count as present".
    // So frontend likely sends 'partial' type with specific occurrenceIds for half day too?
    // Or we handle 'half' by expecting occurrenceIds?
    // Let's assume for 'half' and 'partial', client sends specific occurrenceIds OR we define a rule.
    // Spec: "For half day: require user to select which sessions..." -> implies result is a list of occurrences.
    // So 'half' type is metadata, but implementation acts like 'partial' with specific IDs.
    else if (type === 'half' && occurrenceIds) {
        targetOccurrenceIds = occurrenceIds;
    }

    if (targetOccurrenceIds.length > 0) {
      // Fetch occurrences to get subjectId for upsert
      const occurrences = await Occurrence.find({ _id: { $in: targetOccurrenceIds } });

      const ops = occurrences.map(occ => ({
        updateOne: {
          filter: { occurrenceId: occ._id, userId: req.user._id },
          update: {
            $set: {
              present: true,
              isGranted: true,
              note: grant.reason,
              createdBy: req.user._id
            },
            $setOnInsert: {
              subjectId: occ.subjectId,
              isAutoMarked: false
            }
          },
          upsert: true
        }
      }));

      await AttendanceRecord.bulkWrite(ops);
    }

    res.status(201).json(grant);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getGranted, createGranted };
