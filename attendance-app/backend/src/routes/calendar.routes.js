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
	cacheMiddleware(req => {
		const userId = req.user && (req.user._id || req.user.id) ? (req.user._id || req.user.id).toString() : '';
		return `calendar:holidays:user:${userId}`;
	}, 1800), // 30 min
	getHolidays
);
router.post('/holidays', createHoliday);
router.delete('/holidays/:id', deleteHoliday);

// Granted Routes (cache GET)
router.get(
	'/granted',
	cacheMiddleware(req => {
		const userId = req.user && (req.user._id || req.user.id) ? (req.user._id || req.user.id).toString() : '';
		return `calendar:granted:user:${userId}`;
	}, 600),
	getGranted
);
router.post('/granted', createGranted);

module.exports = router;
