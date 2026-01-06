const express = require('express');

const { getAttendanceByDate, submitAttendance, getStats, getDashboard, getPendingAttendance, acknowledgePending, getSubjectHistory, addExtraClass, removeExtraClass } = require('../controllers/attendance.controller');
const { protect } = require('../middleware/auth.middleware');
const cacheMiddleware = require('../middleware/cacheMiddleware');
const router = express.Router();

router.use(protect);

// Cache attendance by date (query string as key)
router.get(
	'/',
	cacheMiddleware(req => {
		const userId = req.user && (req.user._id || req.user.id) ? (req.user._id || req.user.id).toString() : '';
		const date = req.query.date || '';
		return `attendance:date:${date}:user:${userId}`;
	}, 300), // 5 min
	getAttendanceByDate
);
// Cache dashboard
router.get(
	'/dashboard',
	cacheMiddleware(req => {
		const userId = req.user && (req.user._id || req.user.id) ? (req.user._id || req.user.id).toString() : '';
		return `attendance:dashboard:user:${userId}`;
	}, 300),
	getDashboard
);
router.get('/pending', getPendingAttendance);
router.post('/acknowledge', acknowledgePending);
router.post('/bulk', submitAttendance);
router.post('/extra', addExtraClass);
router.delete('/extra/:occurrenceId', removeExtraClass);
// Cache stats
router.get(
	'/stats',
	cacheMiddleware(req => {
		const userId = req.user && (req.user._id || req.user.id) ? (req.user._id || req.user.id).toString() : '';
		const subjectId = req.query.subjectId || 'all';
		const start = req.query.start || '';
		const end = req.query.end || '';
		return `attendance:stats:user:${userId}:subject:${subjectId}:start:${start}:end:${end}`;
	}, 300),
	getStats
);
// Cache subject history
router.get(
	'/subject/:subjectId/history',
	cacheMiddleware(req => {
		const userId = req.user && (req.user._id || req.user.id) ? (req.user._id || req.user.id).toString() : '';
		return `attendance:subject:${req.params.subjectId}:user:${userId}`;
	}, 300),
	getSubjectHistory
);

module.exports = router;
