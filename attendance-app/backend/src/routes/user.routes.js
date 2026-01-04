const express = require('express');
const router = express.Router();

const { getProfile, updateProfile } = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');
const cacheMiddleware = require('../middleware/cacheMiddleware');

// Cache user profile GET
router.get(
	'/profile',
	protect,
	cacheMiddleware(req => `user:profile:${req.user && req.user.id ? req.user.id : ''}`, 600), // 10 min
	getProfile
);
router.put('/profile', protect, updateProfile);

module.exports = router;
