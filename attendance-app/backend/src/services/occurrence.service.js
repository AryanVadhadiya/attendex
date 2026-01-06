const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const isBetween = require('dayjs/plugin/isBetween');
const Occurrence = require('../models/Occurrence');
const AttendanceRecord = require('../models/AttendanceRecord');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);

// Default User Timezone
const USER_TZ = 'Asia/Kolkata';

const isHoliday = (date, holidays) => {
  return holidays.some(h => {
    const start = dayjs(h.startDate).tz(USER_TZ).startOf('day');
    const end = dayjs(h.endDate).tz(USER_TZ).endOf('day');
    const d = dayjs(date).tz(USER_TZ);
    return d.isBetween(start, end, null, '[]');
  });
};

const generateOccurrences = async (userId, startDate, endDate, weeklySlots, holidays) => {
  const start = dayjs(startDate).tz(USER_TZ).startOf('day');
  const end = dayjs(endDate).tz(USER_TZ).endOf('day');

  if (end.isBefore(start)) {
    return { count: 0, startDate, endDate };
  }

  const occurrencesToUpsert = [];
  const slotsByDay = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  weeklySlots.forEach(slot => {
    if (slotsByDay[slot.dayOfWeek]) {
      slotsByDay[slot.dayOfWeek].push(slot);
    }
  });

  let current = start;
  while (current.isBefore(end) || current.isSame(end, 'day')) {
    if (isHoliday(current, holidays)) {
      current = current.add(1, 'day');
      continue;
    }

    const dayOfWeek = current.day();
    const daysSlots = slotsByDay[dayOfWeek] || [];

    for (const slot of daysSlots) {
      occurrencesToUpsert.push({
        updateOne: {
          filter: {
            userId,
            date: current.toDate(),
            startHour: slot.startHour,
            // We use startHour and date primarily to find duplicates if slot IDs changed
          },
          update: {
            $set: {
              subjectId: slot.subjectId,
              weeklySlotId: slot._id,
              durationHours: slot.durationHours,
              sessionType: slot.sessionType,
              isExcluded: false
            }
          },
          upsert: true
        }
      });
    }
    current = current.add(1, 'day');
  }

  if (occurrencesToUpsert.length > 0) {
    await Occurrence.bulkWrite(occurrencesToUpsert);
  }

  return {
    count: occurrencesToUpsert.length,
    startDate,
    endDate
  };
};

const deleteOccurrencesAfter = async (userId, cutoffDate) => {
  const cutoff = dayjs(cutoffDate).tz(USER_TZ).endOf('day');

  const occurrences = await Occurrence.find({
    userId,
    date: { $gt: cutoff.toDate() }
  }).select('_id');

  if (!occurrences.length) {
    return { removed: 0, blocked: false };
  }

  const occurrenceIds = occurrences.map(o => o._id);
  const recordsCount = await AttendanceRecord.countDocuments({
    userId,
    occurrenceId: { $in: occurrenceIds }
  });

  if (recordsCount > 0) {
    return { removed: 0, blocked: true };
  }

  await AttendanceRecord.deleteMany({ occurrenceId: { $in: occurrenceIds } });
  await Occurrence.deleteMany({ _id: { $in: occurrenceIds } });

  return { removed: occurrenceIds.length, blocked: false };
};

module.exports = { generateOccurrences, deleteOccurrencesAfter };
