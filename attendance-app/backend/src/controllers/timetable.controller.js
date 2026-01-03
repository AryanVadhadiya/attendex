const WeeklySlot = require('../models/WeeklySlot');
const HolidayRange = require('../models/HolidayRange');
const AttendanceRecord = require('../models/AttendanceRecord');
const Occurrence = require('../models/Occurrence');
const { generateOccurrences } = require('../services/occurrence.service');
const dayjs = require('dayjs');

// Save weekly slots (Template)
const getTimetable = async (req, res) => {
  try {
    const slots = await WeeklySlot.find({ userId: req.user._id }).populate('subjectId', 'name color code');
    res.json(slots);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const saveTimetable = async (req, res) => {
  try {
    const { slots } = req.body; // Array of slots
    // Validate slots... (assume handled by frontend/Joi validation middleware if strictly needed, skipping for brevity)

    // Replace all slots for user (Simplest approach for "Save Template")
    // Or we can do smart diffing. Let's do replace for now as per "Save" semantics.
    await WeeklySlot.deleteMany({ userId: req.user._id });

    const slotsWithUser = slots.map(s => ({ ...s, userId: req.user._id }));
    const savedSlots = await WeeklySlot.insertMany(slotsWithUser);

    res.json(savedSlots);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Publish (Generate Occurrences)
const publishTimetable = async (req, res) => {
  try {
    const { startDate, endDate, confirmAutoMark, holidays, forceReset } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start and End date required' });
    }

    const User = require('../models/User');
    const user = await User.findById(req.user._id);

    // 1. Check if Start Date is being changed
    if (user.semesterStartDate) {
        const existingStart = dayjs(user.semesterStartDate).format('YYYY-MM-DD');
        const newStart = dayjs(startDate).format('YYYY-MM-DD');

        if (existingStart !== newStart) {
            if (!forceReset) {
                return res.status(409).json({
                    requiresForceReset: true,
                    message: "Changing the Start Date will invalidate all your existing attendance records and class occurrences. You must clear all data to proceed. Do you want to continue?"
                });
            }

            // Perform Force Reset
            console.log(`Force Resetting data for user ${user.email} due to start date change.`);
            await AttendanceRecord.deleteMany({ userId: req.user._id });
            await Occurrence.deleteMany({ userId: req.user._id });
            // Update the stored start date
            user.semesterStartDate = new Date(startDate);
            await user.save();
        }
    } else {
        // First time publishing - set the start date
        user.semesterStartDate = new Date(startDate);
        await user.save();
    }

    // 1. Get User Data
    const weeklySlots = await WeeklySlot.find({ userId: req.user._id });

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
            userHolidays = await HolidayRange.insertMany(holidayDocs);
        }
    } else {
        userHolidays = await HolidayRange.find({ userId: req.user._id });
    }

    // 2. Generate Occurrences
    const stats = await generateOccurrences(req.user._id, startDate, endDate, weeklySlots, userHolidays);

    // 3. Handle Auto-Mark Logic (Start < Today)
    const today = dayjs();
    const start = dayjs(startDate);

    let autoMarkedCount = 0;

    if (start.isBefore(today, 'day')) {
      if (!confirmAutoMark) {
        // Return warning
        return res.status(200).json({
          ...stats,
          requiresConfirmation: true,
          message: 'Start date is in the past. Confirm to auto-mark attendance.'
        });
      }

      // If confirmed, find all occurrences <= today and mark present
      const autoOccurrences = await Occurrence.find({
        userId: req.user._id,
        date: { $gte: start.toDate(), $lte: today.endOf('day').toDate() },
        isExcluded: false
      });

      const attendanceOps = autoOccurrences.map(occ => ({
        updateOne: {
          filter: { occurrenceId: occ._id, userId: req.user._id },
          update: {
            $setOnInsert: {
              occurrenceId: occ._id,
              userId: req.user._id,
              subjectId: occ.subjectId,
              present: true,
              createdBy: 'system',
              isAutoMarked: true,
              isGranted: false
            }
          }, // Only insert if not exists (don't overwrite manual edits if they somehow exist)
          upsert: true
        }
      }));

      if (attendanceOps.length > 0) {
        const result = await AttendanceRecord.bulkWrite(attendanceOps);
        autoMarkedCount = result.upsertedCount + result.modifiedCount;
      }
    }

    res.json({
      message: 'Timetable published',
      stats,
      autoMarkedCount
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getOccurrences = async (req, res) => {
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

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { saveTimetable, publishTimetable, getOccurrences, getTimetable };
