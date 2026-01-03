const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const isBetween = require('dayjs/plugin/isBetween');
const Occurrence = require('../models/Occurrence');

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

  // 1. Mark ALL existing occurrences for this user as excluded initially.
  // This ensures that the global load strictly reflects the LATEST published range.
  // Classes outside this range (past or future publishing sessions) will be hidden.
  await Occurrence.updateMany(
    { userId },
    { $set: { isExcluded: true } }
  );

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
              isExcluded: false // Reactivate
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

  // Final cleanup: If an occurrence was excluded and has NO attendance record, we can safely delete it.
  // If it HAS an attendance record, we might want to keep it or handle it separately.
  // For now, keeping them excluded is enough to remove them from stats.

  return {
    count: occurrencesToUpsert.length,
    startDate,
    endDate
  };
};

module.exports = { generateOccurrences };
