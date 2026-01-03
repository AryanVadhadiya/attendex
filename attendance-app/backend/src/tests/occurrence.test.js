const { generateOccurrences } = require('../services/occurrence.service');
const Occurrence = require('../models/Occurrence');
const dayjs = require('dayjs');

// Mock Mongoose model method
jest.mock('../models/Occurrence', () => ({
  bulkWrite: jest.fn()
}));

describe('Occurrence Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const userId = 'user123';
  const subjectId = 'sub123';
  const slotId = 'slot123';

  // Slot: Monday 10:00 (1 hour)
  const weeklySlots = [
    { _id: slotId, subjectId, dayOfWeek: 1, startHour: 10, durationHours: 1, sessionType: 'lecture' }
  ];

  test('generates occurrences for Mondays in range', async () => {
    const startDate = '2026-01-01'; // Thursday
    const endDate = '2026-01-31';
    // Mondays in Jan 2026: 5, 12, 19, 26

    // No holidays
    const stats = await generateOccurrences(userId, startDate, endDate, weeklySlots, []);

    expect(stats.count).toBe(4);
    expect(Occurrence.bulkWrite).toHaveBeenCalledTimes(1);
    const ops = Occurrence.bulkWrite.mock.calls[0][0];
    expect(ops.length).toBe(4);
    expect(ops[0].updateOne.update.$set.startHour).toBe(10);
  });

  test('excludes holidays', async () => {
    const startDate = '2026-01-01';
    const endDate = '2026-01-31';
    const holidays = [
        { startDate: new Date('2026-01-05'), endDate: new Date('2026-01-05') } // First Monday is holiday
    ];

    const stats = await generateOccurrences(userId, startDate, endDate, weeklySlots, holidays);

    expect(stats.count).toBe(3); // 12, 19, 26 (5 excluded)
  });
});
