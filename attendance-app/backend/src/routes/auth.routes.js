const express = require('express');
const { registerUser, loginUser, refreshToken } = require('../controllers/auth.controller');
const router = express.Router();

router.post('/signup', registerUser);
router.post('/login', loginUser);
router.post('/refresh', refreshToken);

module.exports = router;
