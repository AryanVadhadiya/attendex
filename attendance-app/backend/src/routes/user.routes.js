const express = require('express');
const router = express.Router();

const { getProfile, updateProfile, updateLabUnits, unlockLabUnits } = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');
const cacheMiddleware = require('../middleware/cacheMiddleware');

// Cache user profile GET
router.get(
	'/profile',
	protect,
	cacheMiddleware(req => {
		const userId = req.user && (req.user._id || req.user.id) ? (req.user._id || req.user.id).toString() : '';
		return `user:profile:${userId}`;
	}, 600), // 10 min
	getProfile
);
router.put('/profile', protect, updateProfile);
router.patch('/lab-units', protect, updateLabUnits);
router.post('/lab-units/unlock', protect, unlockLabUnits);

module.exports = router;
