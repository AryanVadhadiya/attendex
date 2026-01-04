const express = require('express');

const { getAttendanceByDate, submitAttendance, getStats, getDashboard, getPendingAttendance, acknowledgePending, getSubjectHistory } = require('../controllers/attendance.controller');
const { protect } = require('../middleware/auth.middleware');
const cacheMiddleware = require('../middleware/cacheMiddleware');
const router = express.Router();

router.use(protect);

// Cache attendance by date (query string as key)
router.get(
	'/',
	cacheMiddleware(req => `attendance:date:${req.query.date || ''}:user:${req.user && req.user.id ? req.user.id : ''}`, 300), // 5 min
	getAttendanceByDate
);
// Cache dashboard
router.get(
	'/dashboard',
	cacheMiddleware(req => `attendance:dashboard:user:${req.user && req.user.id ? req.user.id : ''}`, 300),
	getDashboard
);
router.get('/pending', getPendingAttendance);
router.post('/acknowledge', acknowledgePending);
router.post('/bulk', submitAttendance);
// Cache stats
router.get(
	'/stats',
	cacheMiddleware(req => `attendance:stats:user:${req.user && req.user.id ? req.user.id : ''}`, 300),
	getStats
);
// Cache subject history
router.get(
	'/subject/:subjectId/history',
	cacheMiddleware(req => `attendance:subject:${req.params.subjectId}:user:${req.user && req.user.id ? req.user.id : ''}`, 300),
	getSubjectHistory
);

module.exports = router;
