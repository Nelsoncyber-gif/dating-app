const prisma = require('../config/db');
const cloudinary = require('../config/cloudinary');

// GET /api/profile/:userId - public-safe view of another user's basic info
// (used for call screens, viewing a match's profile, etc.)
async function getUserById(req, res) {
  const { userId } = req.params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, bio: true, location: true,
      photos: { select: { id: true, url: true, isProfilePic: true } },
    },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json({ user });
}

// PATCH /api/profile { bio, location, name }
async function updateProfile(req, res) {
  const userId = req.userId;
  const { bio, location, name } = req.body;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(bio !== undefined && { bio }),
      ...(location !== undefined && { location }),
      ...(name !== undefined && { name }),
    },
    select: { id: true, name: true, bio: true, location: true },
  });

  return res.json({ user });
}

// POST /api/profile/photos - multipart, field name "photo"
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
      isProfilePic: existingCount === 0, // first photo uploaded becomes the profile pic
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

module.exports = { updateProfile, addPhoto, deletePhoto, setPrimaryPhoto, getUserById };
