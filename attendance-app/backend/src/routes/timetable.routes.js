const express = require('express');

const { saveTimetable, publishTimetable, getOccurrences, getTimetable } = require('../controllers/timetable.controller');
const { protect } = require('../middleware/auth.middleware');
const cacheMiddleware = require('../middleware/cacheMiddleware');
const router = express.Router();

router.use(protect);

// Cache timetable GET
router.get(
	'/',
	cacheMiddleware(req => `timetable:user:${req.user && req.user.id ? req.user.id : ''}`, 600),
	getTimetable
);
router.post('/', saveTimetable);
router.post('/publish', publishTimetable);
// Cache occurrences GET
router.get(
	'/occurrences',
	cacheMiddleware(req => `timetable:occurrences:user:${req.user && req.user.id ? req.user.id : ''}`, 600),
	getOccurrences
);

module.exports = router;
