const { calculateStats, bulkMarkAttendance, autoMarkMissedClasses } = require('../services/attendance.service');
const Occurrence = require('../models/Occurrence');
const AttendanceRecord = require('../models/AttendanceRecord');
const Subject = require('../models/Subject');
const { logAudit } = require('../services/audit.service');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const USER_TZ = 'Asia/Kolkata';

// Get attendance for a specific date (Today Page)
const getAttendanceByDate = async (req, res) => {
  const startTime = Date.now();
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
    })
    .select('date subjectId sessionType startHour durationHours isExcluded')
    .populate('subjectId', 'name color code')
    .lean();

    const ids = occurrences.map(o => o._id);
    const records = await AttendanceRecord.find({
      userId: req.user._id,
      occurrenceId: { $in: ids }
    })
    .select('occurrenceId present')
    .lean();

    const recordMap = new Map(records.map(r => [r.occurrenceId.toString(), r]));

    const result = occurrences.map(occ => ({
      occurrence: occ,
      status: recordMap.get(occ._id.toString()) || { present: false } // Default Absent
    }));

    console.log('[PERF] getAttendanceByDate', req.user._id.toString(), Date.now() - startTime, 'ms');
    res.json(result);
  } catch (err) {
    console.error('[PERF] getAttendanceByDate error', req.user._id.toString(), Date.now() - startTime, 'ms', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const submitAttendance = async (req, res) => {
  const startTime = Date.now();
  const { entries } = req.body; // [{ occurrenceId, present }]

  if (!entries || !Array.isArray(entries)) {
    return res.status(400).json({ message: 'Invalid payload: entries must be an array' });
  }

  const validEntries = entries.filter(e => e && e.occurrenceId);
  if (validEntries.length === 0) {
    return res.json({ message: 'No valid entries to process' });
  }

  try {
    if (req.user.isTimetableLocked) {
        const occurrenceIds = validEntries.map(e => e.occurrenceId);
        const occurrences = await Occurrence.find({ _id: { $in: occurrenceIds } });

        const todayStart = dayjs().tz(USER_TZ).startOf('day');
        const hasPast = occurrences.some(occ => dayjs(occ.date).tz(USER_TZ).isBefore(todayStart));

        if (hasPast) {
            return res.status(403).json({ message: 'Configuration is locked. Cannot edit past attendance.' });
        }
    }

    await bulkMarkAttendance(req.user._id, validEntries);
    console.log('[PERF] submitAttendance', req.user._id.toString(), Date.now() - startTime, 'ms', 'entries:', validEntries.length);
    res.json({ message: 'Attendance updated' });
  } catch (err) {
    console.error('[PERF] submitAttendance error', req.user._id.toString(), Date.now() - startTime, 'ms', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getStats = async (req, res) => {
  const startTime = Date.now();
  const { subjectId, start, end, threshold } = req.query;
  try {
    const stats = await calculateStats(
      req.user._id,
      subjectId,
      start,
      end,
      threshold ? parseInt(threshold) : 75,
      { labUnitValue: req.user.labUnitValue || 1 }
    );
    console.log('[PERF] getStats', req.user._id.toString(), Date.now() - startTime, 'ms', { subjectId, start, end });
    res.json(stats);
  } catch (err) {
    console.error('[PERF] getStats error', req.user._id.toString(), Date.now() - startTime, 'ms', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getDashboard = async (req, res) => {
  const { getDashboardData } = require('../services/attendance.service');
  const startTime = Date.now();
  try {
    // Fetch threshold-agnostic stats once; frontend applies dynamic threshold logic.
    const data = await getDashboardData(req.user);
    console.log('[PERF] getDashboard', req.user._id.toString(), Date.now() - startTime, 'ms');
    res.json(data);
  } catch (err) {
    console.error('[PERF] getDashboard error', req.user._id.toString(), Date.now() - startTime, 'ms', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getPendingAttendance = async (req, res) => {
  const startTime = Date.now();
  try {
    const todayStart = dayjs().tz(USER_TZ).startOf('day').toDate();

    await autoMarkMissedClasses(req.user._id, todayStart);

    const pendingRecords = await AttendanceRecord.find({
      userId: req.user._id,
      isAutoMarked: true,
      present: true
    })
    .populate({
      path: 'occurrenceId',
      match: { isExcluded: false, date: { $lt: todayStart } },
      select: 'subjectId date sessionType startHour',
      populate: { path: 'subjectId', select: 'name code color' }
    })
    .lean();

    const pending = pendingRecords
      .filter(record => Boolean(record.occurrenceId))
      .map(record => ({
        _id: record.occurrenceId._id,
        date: record.occurrenceId.date,
        sessionType: record.occurrenceId.sessionType,
        startHour: record.occurrenceId.startHour,
        subjectId: record.occurrenceId.subjectId
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    console.log('[PERF] getPendingAttendance', req.user._id.toString(), Date.now() - startTime, 'ms', 'pending:', pending.length);
    res.json(pending);
  } catch (err) {
    console.error('[PERF] getPendingAttendance error', req.user._id.toString(), Date.now() - startTime, 'ms', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

const acknowledgePending = async (req, res) => {
  const startTime = Date.now();
  const { occurrenceIds } = req.body;
  try {
    const filter = {
      userId: req.user._id,
      isAutoMarked: true,
      present: false
    };

    if (occurrenceIds === 'all') {
      // acknowledge everything in scope
    } else if (Array.isArray(occurrenceIds) && occurrenceIds.length > 0) {
      filter.occurrenceId = { $in: occurrenceIds };
    } else {
      return res.status(400).json({ message: 'occurrenceIds must be "all" or a non-empty array of ids' });
    }

    const result = await AttendanceRecord.updateMany(filter, {
      $set: {
        isAutoMarked: false,
        createdBy: req.user._id
      }
    });

    console.log('[PERF] acknowledgePending', req.user._id.toString(), Date.now() - startTime, 'ms', 'count:', result.modifiedCount);
    res.json({ message: 'Marked as absent', count: result.modifiedCount });
  } catch (err) {
    console.error('[PERF] acknowledgePending error', req.user._id.toString(), Date.now() - startTime, 'ms', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get complete attendance history for a subject
const getSubjectHistory = async (req, res) => {
  const { subjectId } = req.params;
  const startTime = Date.now();

  try {
    // Get all occurrences for this subject (past and present)
    const occurrences = await Occurrence.find({
      userId: req.user._id,
      subjectId: subjectId,
      isExcluded: false,
      date: { $lte: new Date() } // Only past and today
    })
    .select('date sessionType subjectId isAdhoc')
    .populate('subjectId', 'name color code')
    .sort({ date: -1 })
    .lean(); // Most recent first

    // Get attendance records for these occurrences
    const occurrenceIds = occurrences.map(o => o._id);
    const records = await AttendanceRecord.find({
      userId: req.user._id,
      occurrenceId: { $in: occurrenceIds }
    })
    .select('occurrenceId present')
    .lean();

    const recordMap = new Map(records.map(r => [r.occurrenceId.toString(), r]));

    // Combine occurrences with their status
    const history = occurrences.map(occ => ({
      _id: occ._id,
      date: occ.date,
      sessionType: occ.sessionType,
      subject: occ.subjectId,
      status: recordMap.get(occ._id.toString()) || null,
      present: (recordMap.get(occ._id.toString()) && recordMap.get(occ._id.toString()).present) || false,
      isAdhoc: Boolean(occ.isAdhoc)
    }));
    console.log('[PERF] getSubjectHistory', req.user._id.toString(), Date.now() - startTime, 'ms', 'count:', history.length);
    res.json(history);
  } catch (err) {
    console.error('[PERF] getSubjectHistory error', req.user._id.toString(), Date.now() - startTime, 'ms', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const addExtraClass = async (req, res) => {
  const startTime = Date.now();
  try {
    const { subjectId, date, sessionType, present } = req.body;

    if (!subjectId || !date || !sessionType || typeof present !== 'boolean') {
      return res.status(400).json({ message: 'Subject, date, session type, and present flag are required.' });
    }

    if (!['lecture', 'lab'].includes(sessionType)) {
      return res.status(400).json({ message: 'Session type must be lecture or lab.' });
    }

    const subject = await Subject.findOne({ _id: subjectId, ownerId: req.user._id }).select('_id');
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found.' });
    }

    const classDate = dayjs(date).tz(USER_TZ).startOf('day');

    const occurrence = await Occurrence.create({
      userId: req.user._id,
      subjectId,
      date: classDate.toDate(),
      sessionType,
      startHour: 8,
      durationHours: sessionType === 'lab' ? 2 : 1,
      weeklySlotId: null,
      isAdhoc: true,
      isExcluded: false
    });

    await AttendanceRecord.updateOne(
      { occurrenceId: occurrence._id, userId: req.user._id },
      {
        $set: {
          subjectId,
          present,
          createdBy: req.user._id,
          isAutoMarked: false,
          isGranted: false
        }
      },
      { upsert: true }
    );

    await logAudit('EXTRA_CLASS_ADD', req.user._id, req.user._id, {
      occurrenceId: occurrence._id,
      subjectId,
      sessionType,
      date: classDate.toISOString(),
      present
    });

    console.log('[PERF] addExtraClass', req.user._id.toString(), Date.now() - startTime, 'ms');
    res.json({ message: 'Extra class recorded', occurrenceId: occurrence._id });
  } catch (err) {
    console.error('[PERF] addExtraClass error', req.user._id.toString(), Date.now() - startTime, 'ms', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const removeExtraClass = async (req, res) => {
  const startTime = Date.now();
  const { occurrenceId } = req.params;
  try {
    if (!occurrenceId) {
      return res.status(400).json({ message: 'Occurrence ID required.' });
    }

    const occurrence = await Occurrence.findOne({ _id: occurrenceId, userId: req.user._id });
    if (!occurrence) {
      return res.status(404).json({ message: 'Extra class not found.' });
    }

    if (!occurrence.isAdhoc) {
      return res.status(400).json({ message: 'Only extra classes can be removed.' });
    }

    await AttendanceRecord.deleteMany({ occurrenceId: occurrence._id, userId: req.user._id });
    await Occurrence.deleteOne({ _id: occurrence._id });

    await logAudit('EXTRA_CLASS_REMOVE', req.user._id, req.user._id, {
      occurrenceId: occurrence._id,
      subjectId: occurrence.subjectId
    });

    console.log('[PERF] removeExtraClass', req.user._id.toString(), Date.now() - startTime, 'ms');
    res.json({ message: 'Extra class removed' });
  } catch (err) {
    console.error('[PERF] removeExtraClass error', req.user._id.toString(), Date.now() - startTime, 'ms', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getAttendanceByDate, submitAttendance, getStats, getDashboard, getPendingAttendance, acknowledgePending, getSubjectHistory, addExtraClass, removeExtraClass };
