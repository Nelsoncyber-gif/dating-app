const prisma = require('../config/db');

// Curated date ideas by category
const DATE_IDEAS = [
  // Food & Drink
  { title: 'Coffee Crawl', description: 'Visit 3 local coffee shops and rate each one', category: 'food' },
  { title: 'Cooking Challenge', description: 'Pick a cuisine neither of you has tried and cook it together', category: 'food' },
  { title: 'Wine & Paint Night', description: 'Grab some wine, follow a Bob Ross tutorial, and see who paints better', category: 'food' },
  { title: 'Farmers Market Date', description: 'Browse a local farmers market and pick out ingredients for a meal together', category: 'food' },
  { title: 'Dessert Hop', description: 'Hit up 2-3 dessert spots in one night', category: 'food' },
  { title: 'Picnic in the Park', description: 'Pack your favorite snacks and find a cozy spot outdoors', category: 'food' },
  // Adventure
  { title: 'Sunset Hike', description: 'Find a trail with a view and catch the sunset together', category: 'adventure' },
  { title: 'Rock Climbing', description: 'Indoor or outdoor — see who reaches the top first', category: 'adventure' },
  { title: 'Bike Ride', description: 'Rent bikes and explore a new neighborhood or trail', category: 'adventure' },
  { title: 'Kayaking', description: 'Paddle together on a local lake or river', category: 'adventure' },
  { title: 'Geocaching', description: 'Download the app and hunt for hidden treasures nearby', category: 'adventure' },
  { title: 'Amusement Park', description: 'Scream your lungs out on the roller coasters', category: 'adventure' },
  // Arts & Culture
  { title: 'Museum Date', description: 'Wander through a museum and pick your favorite exhibits', category: 'arts' },
  { title: 'Art Gallery Hop', description: 'Visit 2-3 galleries and critique the art together', category: 'arts' },
  { title: 'Pottery Class', description: 'Get messy and make something together', category: 'arts' },
  { title: 'Live Music', description: 'Catch a local band at a cozy venue', category: 'arts' },
  { title: 'Comedy Show', description: 'Laugh together at a stand-up comedy night', category: 'arts' },
  { title: 'Bookstore Browse', description: 'Pick books for each other at a local bookstore', category: 'arts' },
  // Chill
  { title: 'Movie Marathon', description: 'Pick a theme and watch 3 movies with all the snacks', category: 'chill' },
  { title: 'Stargazing', description: 'Drive out of the city, lay back, and count shooting stars', category: 'chill' },
  { title: 'Board Game Cafe', description: 'Spend an afternoon playing strategy games', category: 'chill' },
  { title: 'Spa Day', description: 'Book a couples massage or do DIY face masks at home', category: 'chill' },
  { title: 'Trivia Night', description: 'Test your knowledge at a local bar trivia event', category: 'chill' },
  { title: 'Drive-in Movie', description: 'Classic date — snacks in the car under the stars', category: 'chill' },
  // Unique
  { title: 'Volunteer Together', description: 'Spend a few hours at a local shelter or food bank', category: 'unique' },
  { title: 'Photography Walk', description: 'Take photos of each other and the city — best shot wins', category: 'unique' },
  { title: 'Time Capsule', description: 'Write letters to your future selves and seal them in a box', category: 'unique' },
  { title: 'Escape Room', description: 'Work together to solve puzzles and escape in time', category: 'unique' },
  { title: 'Karaoke Night', description: 'Sing your hearts out, even if you are off-key', category: 'unique' },
  { title: 'Thrift Store Challenge', description: 'Pick outfits for each other with a $20 budget', category: 'unique' },
];

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

  // Create milestone for first date proposed
  const match = await prisma.match.findUnique({ where: { conversationId } });
  if (match) {
    await prisma.milestone.upsert({
      where: { matchId_type: { matchId: match.id, type: 'first_date_proposed' } },
      update: {},
      create: { matchId: match.id, type: 'first_date_proposed' },
    });
  }

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

  // Create milestone for first date accepted
  if (status === 'accepted') {
    const conv = await prisma.conversation.findUnique({
      where: { id: proposal.conversationId },
      select: { id: true },
    });
    if (conv) {
      const match = await prisma.match.findUnique({ where: { conversationId: conv.id } });
      if (match) {
        await prisma.milestone.upsert({
          where: { matchId_type: { matchId: match.id, type: 'first_date_accepted' } },
          update: {},
          create: { matchId: match.id, type: 'first_date_accepted' },
        });
      }
    }
  }

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

// GET /api/dates/ideas?conversationId=xxx
// Returns 3 date ideas based on shared interests
async function getDateIdeas(req, res) {
  const { conversationId } = req.query;
  if (!conversationId) {
    return res.status(400).json({ error: 'conversationId is required' });
  }

  // Get both users' interests from the conversation
  const participants = await prisma.conversationParticipant.findMany({
    where: { conversationId },
    include: {
      user: {
        include: {
          interests: { include: { interest: { select: { name: true } } } },
        },
      },
    },
  });

  // Find shared interest categories
  const allInterests = participants.flatMap((p) => p.user.interests.map((ui) => ui.interest.name.toLowerCase()));
  const interestSet = new Set(allInterests);

  // Map interests to categories
  const categoryMap = {
    food: ['food', 'cooking', 'coffee', 'wine', 'beer', 'pizza', 'sushi', 'brunch', 'baking'],
    adventure: ['hiking', 'travel', 'adventure', 'sports', 'fitness', 'outdoors', 'camping', 'climbing'],
    arts: ['art', 'music', 'painting', 'drawing', 'photography', 'film', 'movies', 'reading', 'books', 'theater'],
    chill: ['gaming', 'movies', 'relaxing', 'yoga', 'meditation', 'nature'],
    unique: ['volunteering', 'crafts', 'puzzles', 'games', 'learning'],
  };

  // Score categories based on matching interests
  const scores = { food: 0, adventure: 0, arts: 0, chill: 0, unique: 0 };
  for (const interest of interestSet) {
    for (const [category, keywords] of Object.entries(categoryMap)) {
      if (keywords.some((kw) => interest.includes(kw))) {
        scores[category]++;
      }
    }
  }

  // Sort categories by score
  const sortedCategories = Object.entries(scores).sort((a, b) => b[1] - a[1]).map(([cat]) => cat);

  // Pick 3 ideas — prefer top-scored categories but add variety
  const selected = [];
  const usedCategories = new Set();
  for (const category of sortedCategories) {
    if (selected.length >= 3) break;
    const ideas = DATE_IDEAS.filter((d) => d.category === category && !usedCategories.has(d.title));
    if (ideas.length > 0) {
      const pick = ideas[Math.floor(Math.random() * ideas.length)];
      selected.push(pick);
      usedCategories.add(pick.title);
    }
  }

  // Fill remaining slots with random ideas
  while (selected.length < 3) {
    const remaining = DATE_IDEAS.filter((d) => !usedCategories.has(d.title));
    if (remaining.length === 0) break;
    const pick = remaining[Math.floor(Math.random() * remaining.length)];
    selected.push(pick);
    usedCategories.add(pick.title);
  }

  res.json({ ideas: selected });
}

module.exports = { proposeDate, updateDateProposal, getProposalsByConversation, getDateIdeas };
