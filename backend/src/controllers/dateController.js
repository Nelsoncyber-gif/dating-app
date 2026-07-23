const prisma = require('../config/db');

// POST /api/dates/propose
async function proposeDate(req, res) {
  const { conversationId, proposedDate, proposedLocation } = req.body;

  const proposal = await prisma.dateProposal.create({
    data: {
      conversationId,
      proposerId: req.userId,
      proposedDate: new Date(proposedDate),
      proposedLocation,
    },
  });

  // Emit Socket.IO event to notify the other user in real-time
  // Room name matches chat.js — uses raw conversationId (no prefix)
  const io = req.app.locals.io;
  if (io) {
    io.to(conversationId).emit('date_proposal', proposal);
  }

  res.status(201).json({ proposal });
}

// PATCH /api/dates/:id
async function updateDateProposal(req, res) {
  const { id } = req.params;
  const { status } = req.body; // "accepted" or "declined"

  const proposal = await prisma.dateProposal.update({
    where: { id },
    data: { status },
  });

  // Emit Socket.IO event to notify the proposer
  const io = req.app.locals.io;
  if (io) {
    io.to(proposal.conversationId).emit('date_proposal_update', proposal);
  }

  res.json({ proposal });
}

// GET /api/dates/conversation/:conversationId
async function getProposalsByConversation(req, res) {
  const { conversationId } = req.params;
  const proposals = await prisma.dateProposal.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ proposals });
}

module.exports = { proposeDate, updateDateProposal, getProposalsByConversation };
