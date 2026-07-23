const express = require('express');
const router = express.Router();
const { register, login, me, verifyEmail } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, me);
router.post('/verify-email', requireAuth, verifyEmail);

module.exports = router;
