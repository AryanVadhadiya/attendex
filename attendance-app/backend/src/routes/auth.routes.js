const express = require('express');
const { registerUser, loginUser, refreshToken, googleLogin } = require('../controllers/auth.controller');
const router = express.Router();

router.post('/signup', registerUser);
router.post('/login', loginUser);
router.post('/google', googleLogin);
router.post('/refresh', refreshToken);

module.exports = router;
