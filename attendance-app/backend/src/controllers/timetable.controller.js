const WeeklySlot = require('../models/WeeklySlot');
const HolidayRange = require('../models/HolidayRange');
const AttendanceRecord = require('../models/AttendanceRecord');
const Occurrence = require('../models/Occurrence');
const User = require('../models/User');
const { generateOccurrences, deleteOccurrencesAfter } = require('../services/occurrence.service');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const USER_TZ = 'Asia/Kolkata';
const formatDisplayDate = (value) => dayjs(value).tz(USER_TZ).format('MMM D, YYYY');

// Save weekly slots (Template)
const getTimetable = async (req, res) => {
  const startTime = Date.now();
  try {
    const slots = await WeeklySlot.find({ userId: req.user._id })
        .populate('subjectId', 'name color code')
        .lean();
    console.log('[PERF] getTimetable', req.user._id.toString(), Date.now() - startTime, 'ms', 'slots:', slots.length);
    res.json(slots);
  } catch (err) {
    console.error('[PERF] getTimetable error', req.user._id.toString(), Date.now() - startTime, 'ms', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

const saveTimetable = async (req, res) => {
  const startTime = Date.now();
  try {
    const { slots } = req.body; // Array of slots
    // Validate slots... (assume handled by frontend/Joi validation middleware if strictly needed, skipping for brevity)

    // Replace all slots for user (Simplest approach for "Save Template")
    // Or we can do smart diffing. Let's do replace for now as per "Save" semantics.
    await WeeklySlot.deleteMany({ userId: req.user._id });

    const slotsWithUser = slots.map(s => ({ ...s, userId: req.user._id }));
    const savedSlots = await WeeklySlot.insertMany(slotsWithUser);

    console.log('[PERF] saveTimetable', req.user._id.toString(), Date.now() - startTime, 'ms', 'slots:', savedSlots.length);
    res.json(savedSlots);
  } catch (err) {
    console.error('[PERF] saveTimetable error', req.user._id.toString(), Date.now() - startTime, 'ms', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Publish (Generate Occurrences)
const publishTimetable = async (req, res) => {
  const startTime = Date.now();
  try {
    const { startDate, endDate, confirmAutoMark, holidays, forceReset } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start and End date required' });
    }

    const requestedStart = dayjs(startDate).tz(USER_TZ).startOf('day');
    const requestedEnd = dayjs(endDate).tz(USER_TZ).endOf('day');

    if (requestedEnd.isBefore(requestedStart)) {
      return res.status(400).json({ message: 'End date must be after start date.' });
    }

    const user = await User.findById(req.user._id)
      .select('email semesterStartDate semesterEndDate')
      .lean();

    const wipeAllOccurrences = async () => {
      await AttendanceRecord.deleteMany({ userId: req.user._id });
      await Occurrence.deleteMany({ userId: req.user._id });
    };
    let hasWiped = false;

    // 1. Check if Start Date is being changed
    if (user.semesterStartDate) {
      const existingStart = dayjs(user.semesterStartDate).tz(USER_TZ).format('YYYY-MM-DD');
      const newStart = requestedStart.format('YYYY-MM-DD');

      if (existingStart !== newStart) {
        if (!forceReset) {
          return res.status(409).json({
            requiresForceReset: true,
            message: 'Changing the Start Date will invalidate all your existing attendance records and class occurrences. You must clear all data to proceed. Do you want to continue?'
          });
        }

        console.log(`Force Resetting data for user ${user.email} due to start date change.`);
        await wipeAllOccurrences();
        hasWiped = true;
      }
    }

    if (forceReset && !hasWiped) {
      console.log(`Force Resetting data for user ${user.email} via manual reset.`);
      await wipeAllOccurrences();
      hasWiped = true;
    }

    if (!user.semesterStartDate || forceReset) {
      await User.updateOne(
        { _id: req.user._id },
        { $set: { semesterStartDate: requestedStart.toDate() } }
      );
    }

    // 1. Get User Data
    const weeklySlots = await WeeklySlot.find({ userId: req.user._id })
      .select('subjectId dayOfWeek startHour durationHours sessionType')
      .lean();

    // Save Holidays if provided
    let userHolidays = [];
    if (holidays && Array.isArray(holidays)) {
      await HolidayRange.deleteMany({ userId: req.user._id });
      const holidayDocs = holidays.map(h => ({
        userId: req.user._id,
        startDate: h.startDate,
        endDate: h.endDate,
        reason: h.reason
      }));
      if (holidayDocs.length > 0) {
        await HolidayRange.insertMany(holidayDocs);
        userHolidays = holidayDocs;
      }
    } else {
      userHolidays = await HolidayRange.find({ userId: req.user._id })
        .select('startDate endDate reason')
        .lean();
    }

    const today = dayjs().tz(USER_TZ);
    const previousEndRaw = user.semesterEndDate
      ? dayjs(user.semesterEndDate).tz(USER_TZ).endOf('day')
      : null;
    const previousEnd = forceReset ? null : previousEndRaw;

    let publishMode = forceReset ? 'reset' : previousEnd ? 'refresh' : 'initial';
    let appendWindow = null;
    let trimmedInfo = null;

    if (previousEnd) {
      if (requestedEnd.isAfter(previousEnd, 'day')) {
        publishMode = 'extended';
        appendWindow = {
          from: previousEnd.add(1, 'day').startOf('day').toDate(),
          to: requestedEnd.toDate()
        };
      } else if (requestedEnd.isBefore(previousEnd, 'day')) {
        if (requestedEnd.isBefore(today.startOf('day'))) {
          return res.status(400).json({
            message: 'End date cannot move before today. Preserve historical attendance or use a data export.'
          });
        }

        const trimResult = await deleteOccurrencesAfter(req.user._id, requestedEnd.toDate());
        if (trimResult.blocked) {
          return res.status(409).json({
            message: 'Cannot shorten the published range because some of those future classes already have attendance records.'
          });
        }

        publishMode = 'trimmed';
        trimmedInfo = {
          removed: trimResult.removed,
          cutoff: requestedEnd.toDate()
        };
      }
    }

    // 2. Generate Occurrences (always refresh the visible window so template edits apply)
    const stats = await generateOccurrences(
      req.user._id,
      requestedStart.toDate(),
      requestedEnd.toDate(),
      weeklySlots,
      userHolidays
    );

    // Update the stored published end date
    await User.updateOne(
      { _id: req.user._id },
      {
        $set: {
          semesterStartDate: requestedStart.toDate(),
          semesterEndDate: requestedEnd.toDate()
        }
      }
    );

    // 3. Handle Auto-Mark Logic (only on first publish or explicit reset)
    let autoMarkedCount = 0;
    const autoMarkEligible = requestedStart.isBefore(today, 'day') && (forceReset || !user.semesterStartDate);
    if (autoMarkEligible) {
      if (!confirmAutoMark) {
        return res.status(200).json({
          ...stats,
          publishMode,
          appendWindow,
          trimmedInfo,
          requiresConfirmation: true,
          message: 'Start date is in the past. Confirm to auto-mark attendance.'
        });
      }

      const autoOccurrences = await Occurrence.find({
        userId: req.user._id,
        date: {
          $gte: requestedStart.startOf('day').toDate(),
          $lt: today.startOf('day').toDate()
        },
        isExcluded: false
      })
        .select('subjectId')
        .lean();

      const attendanceOps = autoOccurrences.map(occ => ({
        updateOne: {
          filter: { occurrenceId: occ._id, userId: req.user._id },
          update: {
            $set: {
              subjectId: occ.subjectId,
              present: true,
              createdBy: 'system',
              isAutoMarked: true,
              isGranted: false
            },
            $setOnInsert: {
              occurrenceId: occ._id,
              userId: req.user._id
            }
          },
          upsert: true
        }
      }));

      if (attendanceOps.length > 0) {
        const result = await AttendanceRecord.bulkWrite(attendanceOps);
        autoMarkedCount = result.upsertedCount + result.modifiedCount;
      }
    }

    const summaryParts = [];
    if (publishMode === 'initial' || publishMode === 'reset') {
      summaryParts.push(
        `Generated timetable from ${formatDisplayDate(requestedStart)} to ${formatDisplayDate(requestedEnd)}.`
      );
    }
    if (publishMode === 'extended' && appendWindow) {
      summaryParts.push(`Extended timetable through ${formatDisplayDate(appendWindow.to)}.`);
    }
    if (publishMode === 'trimmed' && trimmedInfo) {
      summaryParts.push(
        trimmedInfo.removed > 0
          ? `Removed ${trimmedInfo.removed} upcoming sessions after ${formatDisplayDate(trimmedInfo.cutoff)}.`
          : `Trimmed timetable through ${formatDisplayDate(requestedEnd)}.`
      );
    }
    summaryParts.push(`Refreshed ${stats.count} occurrences inside the window.`);
    if (autoMarkedCount > 0) {
      summaryParts.push(`Auto-marked ${autoMarkedCount} past classes.`);
    }
    const publishSummary = summaryParts.join(' ');

    console.log('[PERF] publishTimetable', req.user._id.toString(), Date.now() - startTime, 'ms', {
      autoMarkedCount,
      weeklySlotCount: weeklySlots.length,
      holidayCount: userHolidays.length,
      publishMode
    });

    res.json({
      message: 'Timetable published',
      stats,
      autoMarkedCount,
      publishMode,
      appendWindow,
      trimmedInfo,
      summary: publishSummary
    });

  } catch (err) {
    console.error('[PERF] publishTimetable error', req.user._id.toString(), Date.now() - startTime, 'ms', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getOccurrences = async (req, res) => {
  const startTime = Date.now();
  try {
    const { start, end, subjectId } = req.query; // Added subjectId
    const query = { userId: req.user._id, isExcluded: false };

    if (start && end) {
      query.date = { $gte: new Date(start), $lte: new Date(end) };
    }
    if (subjectId) {
        query.subjectId = subjectId;
    }

    const occurrences = await Occurrence.find(query)
      .populate('subjectId', 'name color code')
      .sort({ date: 1, startHour: 1 });

    // Fetch status for each
    // Optimization: Fetch all records in range
    const occurrenceIds = occurrences.map(o => o._id);
    const records = await AttendanceRecord.find({
        userId: req.user._id,
        occurrenceId: { $in: occurrenceIds }
    });
    const recordMap = new Map(records.map(r => [r.occurrenceId.toString(), r]));

    const result = occurrences.map(occ => ({
        ...occ.toObject(),
        status: recordMap.get(occ._id.toString()) || { present: false }
    }));

    console.log('[PERF] getOccurrences', req.user._id.toString(), Date.now() - startTime, 'ms', {
      occurrenceCount: occurrences.length,
      hasDateRange: !!(start && end),
      hasSubjectFilter: !!subjectId
    });

    res.json(result);
  } catch (err) {
    console.error('[PERF] getOccurrences error', req.user._id.toString(), Date.now() - startTime, 'ms', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { saveTimetable, publishTimetable, getOccurrences, getTimetable };
