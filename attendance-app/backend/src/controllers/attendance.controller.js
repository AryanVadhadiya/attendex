const { calculateStats, bulkMarkAttendance } = require('../services/attendance.service');
const Occurrence = require('../models/Occurrence');
const AttendanceRecord = require('../models/AttendanceRecord');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const USER_TZ = 'Asia/Kolkata';

// Get attendance for a specific date (Today Page)
const getAttendanceByDate = async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ message: 'Date required' });

  try {
    // Parse date in User TZ to get correct start/end in UTC
    const start = dayjs(date).tz(USER_TZ).startOf('day').toDate();
    const end = dayjs(date).tz(USER_TZ).endOf('day').toDate();

    const occurrences = await Occurrence.find({
      userId: req.user._id,
      date: { $gte: start, $lte: end },
      isExcluded: false
    }).populate('subjectId', 'name color code');

    const ids = occurrences.map(o => o._id);
    const records = await AttendanceRecord.find({
      userId: req.user._id,
      occurrenceId: { $in: ids }
    });

    const recordMap = new Map(records.map(r => [r.occurrenceId.toString(), r]));

    const result = occurrences.map(occ => ({
      occurrence: occ,
      status: recordMap.get(occ._id.toString()) || { present: false } // Default Absent
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const submitAttendance = async (req, res) => {
  const { entries } = req.body; // [{ occurrenceId, present }]
  try {
    if (req.user.isTimetableLocked) {
        const occurrenceIds = entries.map(e => e.occurrenceId);
        const occurrences = await Occurrence.find({ _id: { $in: occurrenceIds } });

        const todayStart = dayjs().tz(USER_TZ).startOf('day');
        const hasPast = occurrences.some(occ => dayjs(occ.date).tz(USER_TZ).isBefore(todayStart));

        if (hasPast) {
            return res.status(403).json({ message: 'Configuration is locked. Cannot edit past attendance.' });
        }
    }

    await bulkMarkAttendance(req.user._id, entries);
    res.json({ message: 'Attendance updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getStats = async (req, res) => {
  const { subjectId, start, end, threshold } = req.query;
  try {
    const stats = await calculateStats(req.user._id, subjectId, start, end, threshold ? parseInt(threshold) : 75);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getDashboard = async (req, res) => {
  const { getDashboardData } = require('../services/attendance.service');
  const { threshold } = req.query;
  try {
    const data = await getDashboardData(req.user._id, threshold ? parseInt(threshold) : 75);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getPendingAttendance = async (req, res) => {
  try {
    const todayStart = dayjs().tz(USER_TZ).startOf('day').toDate();

    const pastOccurrences = await Occurrence.find({
      userId: req.user._id,
      date: { $lt: todayStart },
      isExcluded: false
    }).populate('subjectId', 'name code');

    const ids = pastOccurrences.map(o => o._id);
    const existingRecords = await AttendanceRecord.find({
      userId: req.user._id,
      occurrenceId: { $in: ids }
    }).select('occurrenceId');

    const existingIds = new Set(existingRecords.map(r => r.occurrenceId.toString()));

    const pending = pastOccurrences.filter(o => !existingIds.has(o._id.toString()));

    res.json(pending);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const acknowledgePending = async (req, res) => {
  const { occurrenceIds } = req.body;
  try {
    let targetIds = occurrenceIds;
    if (occurrenceIds === 'all') {
       const todayStart = dayjs().tz(USER_TZ).startOf('day').toDate();
       const pastOccurrences = await Occurrence.find({
          userId: req.user._id,
          date: { $lt: todayStart },
          isExcluded: false
       });
       const ids = pastOccurrences.map(o => o._id);
       const existingRecords = await AttendanceRecord.find({
          userId: req.user._id,
          occurrenceId: { $in: ids }
       }).select('occurrenceId');
       const existingIds = new Set(existingRecords.map(r => r.occurrenceId.toString()));
       targetIds = pastOccurrences.filter(o => !existingIds.has(o._id.toString())).map(o => o._id);
    }

    if (!Array.isArray(targetIds) || targetIds.length === 0) {
        return res.json({ message: 'Nothing to mark' });
    }

    const ops = targetIds.map(id => ({
        updateOne: {
            filter: { occurrenceId: id, userId: req.user._id },
            update: {
                $setOnInsert: {
                    occurrenceId: id,
                    userId: req.user._id,
                    present: false,
                    createdBy: 'system-acknowledge',
                    isAutoMarked: true
                }
            },
            upsert: true
        }
    }));

    await AttendanceRecord.bulkWrite(ops);
    res.json({ message: 'Marked as absent', count: ops.length });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get complete attendance history for a subject
const getSubjectHistory = async (req, res) => {
  const { subjectId } = req.params;

  try {
    // Get all occurrences for this subject (past and present)
    const occurrences = await Occurrence.find({
      userId: req.user._id,
      subjectId: subjectId,
      isExcluded: false,
      date: { $lte: new Date() } // Only past and today
    })
    .populate('subjectId', 'name color code')
    .sort({ date: -1 }); // Most recent first

    // Get attendance records for these occurrences
    const occurrenceIds = occurrences.map(o => o._id);
    const records = await AttendanceRecord.find({
      userId: req.user._id,
      occurrenceId: { $in: occurrenceIds }
    });

    const recordMap = new Map(records.map(r => [r.occurrenceId.toString(), r]));

    // Combine occurrences with their status
    const history = occurrences.map(occ => ({
      _id: occ._id,
      date: occ.date,
      sessionType: occ.sessionType,
      subject: occ.subjectId,
      status: recordMap.get(occ._id.toString()) || null,
      present: recordMap.get(occ._id.toString())?.present || false
    }));

    res.json(history);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getAttendanceByDate, submitAttendance, getStats, getDashboard, getPendingAttendance, acknowledgePending, getSubjectHistory };
