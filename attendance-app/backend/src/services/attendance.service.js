const AttendanceRecord = require('../models/AttendanceRecord');
const Occurrence = require('../models/Occurrence');
const GrantedAttendance = require('../models/GrantedAttendance');
const dayjs = require('dayjs');
const { logAudit } = require('./audit.service');

const calculateStats = async (userId, subjectId, startDate, endDate, threshold = 75) => {
  // 1. Get ALL valid occurrences count (for semester budget)
  const baseQuery = { userId, isExcluded: false };
  if (subjectId) baseQuery.subjectId = subjectId;

  // OPTIMIZATION: Use countDocuments instead of fetching all docs
  const totalSemesterLoad = await Occurrence.countDocuments(baseQuery);

  // 2. Get current occurrences (till today)
  const currentQuery = { ...baseQuery, date: { $lte: new Date() } };
  if (startDate && endDate) {
    currentQuery.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  // OPTIMIZATION: Fetch only necessary fields and use lean()
  const currentOccurrences = await Occurrence.find(currentQuery)
    .select('_id sessionType')
    .lean();

  const currentLoad = currentOccurrences.length;

  if (totalSemesterLoad === 0) {
    return {
      totalLoad: 0,
      currentLoad: 0,
      lectureLoad: 0,
      labLoad: 0,
      presentCount: 0,
      absentCount: 0,
      presentPercent: 0,
      remainingAllowed: 0,
      semesterBudget: 0,
      threshold: threshold || 75
    };
  }

  // 3. Get attendance records till now
  // OPTIMIZATION: Use distinct/lean queries or optimized lookups
  const currentIds = currentOccurrences.map(occ => occ._id);
  const records = await AttendanceRecord.find({
    userId,
    occurrenceId: { $in: currentIds }
  }).select('occurrenceId present').lean();

  // Create Set for O(1) lookup
  const presentSet = new Set();
  records.forEach(r => {
    if (r.present) presentSet.add(r.occurrenceId.toString());
  });

  let presentCount = 0;
  let lectureLoad = 0;
  let labLoad = 0;

  // Single pass loop
  currentOccurrences.forEach(occ => {
    // Count Types
    if (occ.sessionType === 'lecture') lectureLoad++;
    else if (occ.sessionType === 'lab') labLoad++;

    // Count Present
    if (presentSet.has(occ._id.toString())) {
      presentCount++;
    }
  });

  const absentCount = currentLoad - presentCount;
  const presentPercent = currentLoad > 0 ? Number(((presentCount / currentLoad) * 100).toFixed(2)) : 0;

  // 4. Calculate Budgets based on Semester Load
  const requiredPercent = threshold || 75;
  const requiredClasses = Math.ceil(totalSemesterLoad * (requiredPercent / 100));
  const semesterBudget = totalSemesterLoad - requiredClasses;
  const remainingAllowed = semesterBudget - absentCount;

  return {
    totalLoad: totalSemesterLoad,
    currentLoad,
    lectureLoad,
    labLoad,
    presentCount,
    absentCount,
    presentPercent,
    semesterBudget,
    remainingAllowed,
    threshold: requiredPercent
  };
};

const bulkMarkAttendance = async (userId, entries) => {
  const ids = entries.map(e => e.occurrenceId);
  // OPTIMIZATION: Lean and Select
  const occurrences = await Occurrence.find({ _id: { $in: ids } }).select('subjectId').lean();
  const occMap = new Map(occurrences.map(o => [o._id.toString(), o]));

  const validOps = entries.map(entry => {
    const occ = occMap.get(entry.occurrenceId);
    if (!occ) return null;

    return {
      updateOne: {
        filter: { occurrenceId: entry.occurrenceId, userId },
        update: {
          $set: {
            present: entry.present,
            createdBy: userId
          },
          $setOnInsert: {
            subjectId: occ.subjectId,
            isAutoMarked: false,
            isGranted: false
          }
        },
        upsert: true
      }
    };
  }).filter(Boolean);

  if (validOps.length > 0) {
    await AttendanceRecord.bulkWrite(validOps);

    await logAudit('ATTENDANCE_UPDATE', userId, userId, {
      count: validOps.length,
      entries: entries
    });
  }
};

const getDashboardData = async (userId, threshold = 75) => {
  const Subject = require('../models/Subject');

  // OPTIMIZATION: Lean query
  const subjects = await Subject.find({ ownerId: userId }).lean();

  // Parallel fetch stats for each subject
  const subjectStats = await Promise.all(subjects.map(async (sub) => {
    const stats = await calculateStats(userId, sub._id, null, null, threshold);
    return {
      subject: sub,
      stats
    };
  }));

  const globalStats = await calculateStats(userId, null, null, null, threshold); // Global

  return {
    global: globalStats,
    subjects: subjectStats
  };
};

module.exports = { calculateStats, bulkMarkAttendance, getDashboardData };
