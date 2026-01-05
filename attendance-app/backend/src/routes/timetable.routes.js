const express = require('express');

const { saveTimetable, publishTimetable, getOccurrences, getTimetable } = require('../controllers/timetable.controller');
const { protect } = require('../middleware/auth.middleware');
const cacheMiddleware = require('../middleware/cacheMiddleware');
const router = express.Router();

router.use(protect);

// Cache timetable GET
router.get(
	'/',
	cacheMiddleware(req => {
		const userId = req.user && (req.user._id || req.user.id) ? (req.user._id || req.user.id).toString() : '';
		return `timetable:user:${userId}`;
	}, 600),
	getTimetable
);
router.post('/', saveTimetable);
router.post('/publish', publishTimetable);
// Cache occurrences GET
router.get(
	'/occurrences',
	cacheMiddleware(req => {
		const userId = req.user && (req.user._id || req.user.id) ? (req.user._id || req.user.id).toString() : '';
		const start = req.query.start || '';
		const end = req.query.end || '';
		const subjectId = req.query.subjectId || 'all';
		return `timetable:occurrences:user:${userId}:start:${start}:end:${end}:subject:${subjectId}`;
	}, 600),
	getOccurrences
);

module.exports = router;
