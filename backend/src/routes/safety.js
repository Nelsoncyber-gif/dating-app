const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  reportUser, blockUser, unblockUser, getBlockedUsers,
  setEmergencyContact, getEmergencyContact, startSafetyCheck, checkIn,
} = require('../controllers/safetyController');

router.post('/report', requireAuth, reportUser);
router.post('/block', requireAuth, blockUser);
router.delete('/block/:blockedId', requireAuth, unblockUser);
router.get('/blocked', requireAuth, getBlockedUsers);
router.post('/emergency-contact', requireAuth, setEmergencyContact);
router.get('/emergency-contact', requireAuth, getEmergencyContact);
router.post('/safety-check/start', requireAuth, startSafetyCheck);
router.post('/safety-check/check-in', requireAuth, checkIn);

module.exports = router;
