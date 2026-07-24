const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { proposeDate, updateDateProposal, getProposalsByConversation, getDateIdeas } = require('../controllers/dateController');

router.post('/propose', requireAuth, proposeDate);
router.patch('/:id', requireAuth, updateDateProposal);
router.get('/conversation/:conversationId', requireAuth, getProposalsByConversation);
router.get('/ideas', requireAuth, getDateIdeas);

module.exports = router;
