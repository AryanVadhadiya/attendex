const express = require('express');
const { saveTimetable, publishTimetable, getOccurrences, getTimetable } = require('../controllers/timetable.controller');
const { protect } = require('../middleware/auth.middleware');
const router = express.Router();

router.use(protect);

router.get('/', getTimetable);
router.post('/', saveTimetable);
router.post('/publish', publishTimetable);
router.get('/occurrences', getOccurrences);

module.exports = router;
