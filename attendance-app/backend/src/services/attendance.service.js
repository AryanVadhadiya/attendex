const mongoose = require('mongoose');
const AttendanceRecord = require('../models/AttendanceRecord');
const Occurrence = require('../models/Occurrence');
const GrantedAttendance = require('../models/GrantedAttendance');
const dayjs = require('dayjs');
const { logAudit } = require('./audit.service');

const calculateStats = async (userId, subjectId, startDate, endDate, threshold = 75, options = {}) => {
  const lectureUnit = 1;
  const labUnit = Math.max(1, Math.min(4, options.labUnitValue || 1));

  // 1. Get ALL valid occurrences count (for semester budget)
  const baseQuery = { userId, isExcluded: false };
  if (subjectId) baseQuery.subjectId = subjectId;

  const lectureCountPromise = Occurrence.countDocuments({ ...baseQuery, sessionType: 'lecture' });
  const labCountPromise = Occurrence.countDocuments({ ...baseQuery, sessionType: 'lab' });
  const [totalLectureCount, totalLabCount] = await Promise.all([lectureCountPromise, labCountPromise]);
  const totalSemesterLoad = (totalLectureCount * lectureUnit) + (totalLabCount * labUnit);

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

  let currentLoad = 0;

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

  let presentUnits = 0;
  let lectureLoad = 0;
  let labLoad = 0;

  currentOccurrences.forEach(occ => {
    const isLab = occ.sessionType === 'lab';
    const unitValue = isLab ? labUnit : lectureUnit;
    if (isLab) {
      labLoad += unitValue;
    } else {
      lectureLoad += unitValue;
    }
    currentLoad += unitValue;

    if (presentSet.has(occ._id.toString())) {
      presentUnits += unitValue;
    }
  });

  const absentCount = currentLoad - presentUnits;
  const presentPercent = currentLoad > 0 ? Number(((presentUnits / currentLoad) * 100).toFixed(2)) : 0;

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
    presentCount: presentUnits,
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
            createdBy: userId,
            isAutoMarked: false
          },
          $setOnInsert: {
            subjectId: occ.subjectId,
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

// Helper to normalize stats structure from aggregation groups
const buildStatsFromGroup = (group, threshold = 75) => {
  const totalLoad = group ? group.totalLoad || 0 : 0;
  const currentLoad = group ? group.currentLoad || 0 : 0;
  const lectureLoad = group ? group.lectureLoad || 0 : 0;
  const labLoad = group ? group.labLoad || 0 : 0;
  const presentCount = group ? group.presentCount || 0 : 0;

  const absentCount = currentLoad - presentCount;
  const presentPercent = currentLoad > 0
    ? Number(((presentCount / currentLoad) * 100).toFixed(2))
    : 0;

  const requiredPercent = threshold || 75;
  const requiredClasses = Math.ceil(totalLoad * (requiredPercent / 100));
  const semesterBudget = totalLoad - requiredClasses;
  const remainingAllowed = semesterBudget - absentCount;

  return {
    totalLoad,
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

// Optimized dashboard stats using a single aggregation over occurrences
const getDashboardData = async (user, threshold = 75) => {
  const Subject = require('../models/Subject');
  const lectureUnit = 1;
  const labUnit = Math.max(1, Math.min(4, user.labUnitValue || 1));
  const userId = user._id;

  const subjects = await Subject.find({ ownerId: userId }).lean();
  if (!subjects || subjects.length === 0) {
    const empty = buildStatsFromGroup(null, threshold);
    return { global: empty, subjects: [] };
  }

  const now = new Date();
  const userObjectId = typeof userId === 'string'
    ? new mongoose.Types.ObjectId(userId)
    : userId;

  const unitWeightExpr = {
    $cond: [{ $eq: ['$sessionType', 'lab'] }, labUnit, lectureUnit]
  };

  const [agg] = await Occurrence.aggregate([
    {
      $match: {
        userId: userObjectId,
        isExcluded: false
      }
    },
    {
      $lookup: {
        from: 'attendancerecords',
        let: { occId: '$_id', userId: userObjectId },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$occurrenceId', '$$occId'] },
                  { $eq: ['$userId', '$$userId'] }
                ]
              }
            }
          },
          { $project: { _id: 0, present: 1 } }
        ],
        as: 'attendance'
      }
    },
    {
      $addFields: {
        present: {
          $cond: [
            { $gt: [{ $size: '$attendance' }, 0] },
            { $arrayElemAt: ['$attendance.present', 0] },
            false
          ]
        },
        isCurrent: { $lte: ['$date', now] },
        unitWeight: unitWeightExpr
      }
    },
    {
      $facet: {
        bySubject: [
          {
            $group: {
              _id: '$subjectId',
              totalLoad: { $sum: '$unitWeight' },
              lectureLoad: {
                $sum: {
                  $cond: [{ $eq: ['$sessionType', 'lecture'] }, '$unitWeight', 0]
                }
              },
              labLoad: {
                $sum: {
                  $cond: [{ $eq: ['$sessionType', 'lab'] }, '$unitWeight', 0]
                }
              },
              currentLoad: {
                $sum: { $cond: ['$isCurrent', '$unitWeight', 0] }
              },
              presentCount: {
                $sum: {
                  $cond: [
                    { $and: ['$isCurrent', '$present'] },
                    '$unitWeight',
                    0
                  ]
                }
              }
            }
          }
        ],
        global: [
          {
            $group: {
              _id: null,
              totalLoad: { $sum: '$unitWeight' },
              lectureLoad: {
                $sum: {
                  $cond: [{ $eq: ['$sessionType', 'lecture'] }, '$unitWeight', 0]
                }
              },
              labLoad: {
                $sum: {
                  $cond: [{ $eq: ['$sessionType', 'lab'] }, '$unitWeight', 0]
                }
              },
              currentLoad: {
                $sum: { $cond: ['$isCurrent', '$unitWeight', 0] }
              },
              presentCount: {
                $sum: {
                  $cond: [
                    { $and: ['$isCurrent', '$present'] },
                    '$unitWeight',
                    0
                  ]
                }
              }
            }
          }
        ]
      }
    }
  ]);

  const bySubject = (agg && agg.bySubject) || [];
  const globalGroup = (agg && agg.global && agg.global[0]) || null;

  const subjectStats = subjects.map((sub) => {
    const group = bySubject.find(
      (g) => g._id && g._id.toString() === sub._id.toString()
    ) || null;

    const stats = buildStatsFromGroup(group, threshold);
    return {
      subject: sub,
      stats
    };
  });

  const globalStats = buildStatsFromGroup(globalGroup, threshold);

  return {
    global: globalStats,
    subjects: subjectStats
  };
};

const autoMarkMissedClasses = async (userId, cutoffDate = new Date()) => {
  if (!userId) {
    return { created: 0 };
  }

  const occurrences = await Occurrence.find({
    userId,
    isExcluded: false,
    date: { $lt: cutoffDate }
  })
    .select('_id subjectId')
    .lean();

  if (!occurrences.length) {
    return { created: 0 };
  }

  const occurrenceIds = occurrences.map(occ => occ._id);
  const existingRecords = await AttendanceRecord.find({
    userId,
    occurrenceId: { $in: occurrenceIds }
  })
    .select('occurrenceId')
    .lean();

  const recordedSet = new Set(existingRecords.map(r => r.occurrenceId.toString()));
  const missing = occurrences.filter(occ => !recordedSet.has(occ._id.toString()));

  if (!missing.length) {
    return { created: 0 };
  }

  const ops = missing.map(occ => ({
    updateOne: {
      filter: { occurrenceId: occ._id, userId },
      update: {
        $setOnInsert: {
          subjectId: occ.subjectId,
          present: false,
          createdBy: 'system-auto',
          isAutoMarked: true,
          isGranted: false
        }
      },
      upsert: true
    }
  }));

  if (ops.length > 0) {
    await AttendanceRecord.bulkWrite(ops);
  }

  return { created: missing.length };
};

module.exports = { calculateStats, bulkMarkAttendance, getDashboardData, autoMarkMissedClasses };
