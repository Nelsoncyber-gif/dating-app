const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { proposeDate, updateDateProposal, getProposalsByConversation } = require('../controllers/dateController');

router.post('/propose', requireAuth, proposeDate);
router.patch('/:id', requireAuth, updateDateProposal);
router.get('/conversation/:conversationId', requireAuth, getProposalsByConversation);

module.exports = router;
