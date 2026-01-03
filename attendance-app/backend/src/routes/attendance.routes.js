const express = require('express');
const { getAttendanceByDate, submitAttendance, getStats, getDashboard, getPendingAttendance, acknowledgePending, getSubjectHistory } = require('../controllers/attendance.controller');
const { protect } = require('../middleware/auth.middleware');
const router = express.Router();

router.use(protect);

router.get('/', getAttendanceByDate);
router.get('/dashboard', getDashboard);
router.get('/pending', getPendingAttendance);
router.post('/acknowledge', acknowledgePending);
router.post('/bulk', submitAttendance);
router.get('/stats', getStats);
router.get('/subject/:subjectId/history', getSubjectHistory);

module.exports = router;
