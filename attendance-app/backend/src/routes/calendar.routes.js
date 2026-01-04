const express = require('express');

const { getHolidays, createHoliday, deleteHoliday } = require('../controllers/holiday.controller');
const { getGranted, createGranted } = require('../controllers/granted.controller');
const { protect } = require('../middleware/auth.middleware');
const cacheMiddleware = require('../middleware/cacheMiddleware');
const router = express.Router();

router.use(protect);

// Holiday Routes (cache GET)
router.get(
	'/holidays',
	cacheMiddleware(() => 'calendar:holidays', 1800), // 30 min
	getHolidays
);
router.post('/holidays', createHoliday);
router.delete('/holidays/:id', deleteHoliday);

// Granted Routes (cache GET)
router.get(
	'/granted',
	cacheMiddleware(req => `calendar:granted:user:${req.user && req.user.id ? req.user.id : ''}`, 600),
	getGranted
);
router.post('/granted', createGranted);

module.exports = router;
