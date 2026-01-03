const express = require('express');
const { getHolidays, createHoliday, deleteHoliday } = require('../controllers/holiday.controller');
const { getGranted, createGranted } = require('../controllers/granted.controller');
const { protect } = require('../middleware/auth.middleware');
const router = express.Router();

router.use(protect);

// Holiday Routes
router.get('/holidays', getHolidays);
router.post('/holidays', createHoliday);
router.delete('/holidays/:id', deleteHoliday);

// Granted Routes
router.get('/granted', getGranted);
router.post('/granted', createGranted);

module.exports = router;
