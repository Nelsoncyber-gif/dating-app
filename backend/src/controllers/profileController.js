const prisma = require('../config/db');
const cloudinary = require('../config/cloudinary');

// GET /api/profile/:userId
async function getUserById(req, res) {
  const { userId } = req.params;
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      dob: true,
      gender: true,
      bio: true,
      location: true,
      photos: { select: { id: true, url: true, isProfilePic: true } },
      interests: { include: { interest: { select: { id: true, name: true } } } },
    },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Calculate age on the fly
  const age = Math.floor((Date.now() - new Date(user.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));

  return res.json({ user: { ...user, age } });
}

// PATCH /api/profile { bio, location, name, isIncognito, theme, occupation, education, zodiacSign, loveLanguage }
async function updateProfile(req, res) {
  const userId = req.userId;
  const { bio, location, name, isIncognito, theme, occupation, education, zodiacSign, loveLanguage } = req.body;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(bio !== undefined && { bio }),
      ...(location !== undefined && { location }),
      ...(name !== undefined && { name }),
      ...(isIncognito !== undefined && { isIncognito }),
      ...(theme !== undefined && { theme }),
      ...(occupation !== undefined && { occupation }),
      ...(education !== undefined && { education }),
      ...(zodiacSign !== undefined && { zodiacSign }),
      ...(loveLanguage !== undefined && { loveLanguage }),
    },
    select: { id: true, name: true, bio: true, location: true, isIncognito: true, theme: true, occupation: true, education: true, zodiacSign: true, loveLanguage: true },
  });

  return res.json({ user });
}

// POST /api/profile/photos
async function addPhoto(req, res) {
  const userId = req.userId;
  if (!req.file) return res.status(400).json({ error: 'A photo file is required' });

  const uploadResult = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'dating-app/profiles' },
      (err, result) => (err ? reject(err) : resolve(result)),
    );
    stream.end(req.file.buffer);
  });

  const existingCount = await prisma.photo.count({ where: { userId } });

  const photo = await prisma.photo.create({
    data: {
      userId,
      url: uploadResult.secure_url,
      isProfilePic: existingCount === 0,
    },
  });

  return res.status(201).json({ photo });
}

// DELETE /api/profile/photos/:id
async function deletePhoto(req, res) {
  const userId = req.userId;
  const { id } = req.params;

  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo || photo.userId !== userId) {
    return res.status(404).json({ error: 'Photo not found' });
  }

  await prisma.photo.delete({ where: { id } });
  return res.json({ deleted: true });
}

// PATCH /api/profile/photos/:id/set-primary
async function setPrimaryPhoto(req, res) {
  const userId = req.userId;
  const { id } = req.params;

  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo || photo.userId !== userId) {
    return res.status(404).json({ error: 'Photo not found' });
  }

  await prisma.$transaction([
    prisma.photo.updateMany({ where: { userId }, data: { isProfilePic: false } }),
    prisma.photo.update({ where: { id }, data: { isProfilePic: true } }),
  ]);

  return res.json({ updated: true });
}

// SINGLE, CLEAN EXPORT
module.exports = { 
  getUserById, 
  updateProfile, 
  addPhoto, 
  deletePhoto, 
  setPrimaryPhoto,
  addInterest,
  removeInterest,
  boostProfile,
};

// POST /api/profile/boost — Activate profile boost (Premium only)
async function boostProfile(req, res) {
  const userId = req.userId;

  const user = await prisma.user.findUnique({ where: { id: userId } });

  // Must be premium
  if (!user.isPremium) {
    return res.status(403).json({ error: 'Profile Boost is a Premium feature' });
  }

  // 24-hour cooldown between boosts
  const now = new Date();
  if (user.boostedUntil && user.boostedUntil > now) {
    const remaining = Math.ceil((user.boostedUntil - now) / (1000 * 60));
    return res.status(400).json({ error: `Boost is still active for ${remaining} more minutes` });
  }

  // Check last boost was at least 24h ago
  if (user.boostedUntil) {
    const lastBoostEnd = user.boostedUntil;
    const hoursSinceLastBoost = (now - lastBoostEnd) / (1000 * 60 * 60);
    if (hoursSinceLastBoost < 24) {
      const hoursLeft = Math.ceil(24 - hoursSinceLastBoost);
      return res.status(400).json({ error: `You can boost again in ${hoursLeft} hours` });
    }
  }

  // Boost lasts 30 minutes
  const boostedUntil = new Date(now.getTime() + 30 * 60 * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: { boostedUntil },
  });

  return res.json({ success: true, boostedUntil });
}

// POST /api/profile/interests { name: "Hiking" }
async function addInterest(req, res) {
  const userId = req.userId;
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Interest name is required' });
  }

  const trimmed = name.trim();

  // Max 5 interests per user
  const count = await prisma.userInterest.count({ where: { userId } });
  if (count >= 5) {
    return res.status(400).json({ error: 'Maximum 5 interests allowed' });
  }

  // Find or create the Interest row
  const interest = await prisma.interest.upsert({
    where: { name: trimmed },
    update: {},
    create: { name: trimmed },
  });

  // Create the link (skip if already exists)
  const existing = await prisma.userInterest.findUnique({
    where: { userId_interestId: { userId, interestId: interest.id } },
  });
  if (existing) {
    return res.json({ alreadyAdded: true });
  }

  await prisma.userInterest.create({
    data: { userId, interestId: interest.id },
  });

  return res.status(201).json({ added: true });
}

// DELETE /api/profile/interests/:name
async function removeInterest(req, res) {
  const userId = req.userId;
  const { name } = req.params;

  const interest = await prisma.interest.findUnique({ where: { name } });
  if (!interest) return res.status(404).json({ error: 'Interest not found' });

  await prisma.userInterest.deleteMany({
    where: { userId, interestId: interest.id },
  });

  return res.json({ removed: true });
}