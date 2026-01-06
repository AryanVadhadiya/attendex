const HolidayRange = require('../models/HolidayRange');
const Joi = require('joi');

const DEFAULT_HOLIDAYS = [
  { startDate: '2025-12-25', endDate: '2025-12-25', reason: 'Christmas' },
  { startDate: '2026-01-14', endDate: '2026-01-14', reason: 'Makar Sankranti' },
  { startDate: '2026-01-26', endDate: '2026-01-26', reason: 'Republic Day' },
  { startDate: '2026-02-15', endDate: '2026-02-15', reason: 'Maha Shivratri' },
  { startDate: '2026-03-04', endDate: '2026-03-04', reason: 'Holi (2nd Day – Dhuleti)' },
  { startDate: '2026-03-21', endDate: '2026-03-21', reason: 'Eid-ul-Fitr' },
  { startDate: '2026-03-26', endDate: '2026-03-26', reason: 'Ram Navmi' },
  { startDate: '2026-03-31', endDate: '2026-03-31', reason: 'Mahavir Jayanti' },
  { startDate: '2026-04-14', endDate: '2026-04-14', reason: 'Ambedkar Jayanti' },
];

const getHolidays = async (req, res) => {
  const startTime = Date.now();
  try {
    let holidays = await HolidayRange.find({ userId: req.user._id }).sort({ startDate: 1 });

    if (holidays.length === 0) {
        const toInsert = DEFAULT_HOLIDAYS.map(h => ({ ...h, userId: req.user._id }));
        holidays = await HolidayRange.insertMany(toInsert);
        holidays.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    }

    console.log('[PERF] getHolidays', req.user._id.toString(), Date.now() - startTime, 'ms', 'count:', holidays.length);
    res.json(holidays);
  } catch (err) {
    console.error('[PERF] getHolidays error', req.user._id.toString(), Date.now() - startTime, 'ms', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const createHoliday = async (req, res) => {
  const schema = Joi.object({
    startDate: Joi.date().required(),
    endDate: Joi.date().required(),
    reason: Joi.string().allow('', null)
  });

  const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    if (req.user.isTimetableLocked) {
      return res.status(403).json({ message: 'Configuration is locked. Unlock to add holidays.' });
    }

    const startTime = Date.now();
    try {
    const holiday = await HolidayRange.create({
      ...req.body,
      userId: req.user._id
    });

    // NOTE: When a holiday is created, we should strictly speaking RE-GENERATE or DELETE occurrences that fall in this range.
    // The spec says "When generating occurrences, exclude...".
    // If I add a holiday AFTER generation, occurrences might still exist.
    // Robustness: Flag existing occurrences as excluded?
    // Let's implement that for "Apple-level" polish.
    /*
    const Occurrence = require('../models/Occurrence');
    await Occurrence.updateMany({
       userId: req.user._id,
       date: { $gte: holiday.startDate, $lte: holiday.endDate }
    }, { isExcluded: true });
    */
    // I will dynamically import to avoid circular dep issues in some architectures, though fine here.
    const Occurrence = require('../models/Occurrence');
    await Occurrence.updateMany({
       userId: req.user._id,
       date: { $gte: new Date(req.body.startDate), $lte: new Date(req.body.endDate) }
    }, { isExcluded: true });
    console.log('[PERF] createHoliday', req.user._id.toString(), Date.now() - startTime, 'ms');

    res.status(201).json(holiday);
  } catch (err) {
    console.error('[PERF] createHoliday error', req.user._id.toString(), Date.now() - startTime, 'ms', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const deleteHoliday = async (req, res) => {
  const startTime = Date.now();
  try {
    if (req.user.isTimetableLocked) {
        return res.status(403).json({ message: 'Configuration is locked. Unlock to remove holidays.' });
    }
    const holiday = await HolidayRange.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!holiday) {
      console.log('[PERF] deleteHoliday not-found', req.user._id.toString(), Date.now() - startTime, 'ms');
      return res.status(404).json({ message: 'Holiday not found' });
    }

    // Re-include occurrences?
    const Occurrence = require('../models/Occurrence');
    await Occurrence.updateMany({
       userId: req.user._id,
       date: { $gte: holiday.startDate, $lte: holiday.endDate }
    }, { isExcluded: false });

    console.log('[PERF] deleteHoliday', req.user._id.toString(), Date.now() - startTime, 'ms');
    res.json({ message: 'Holiday removed' });
  } catch (err) {
    console.error('[PERF] deleteHoliday error', req.user._id.toString(), Date.now() - startTime, 'ms', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getHolidays, createHoliday, deleteHoliday };
