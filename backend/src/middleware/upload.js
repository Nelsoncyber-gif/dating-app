const multer = require('multer');

// Store in memory, then stream straight to Cloudinary — no disk writes,
// which matters because most hosts (Render/Railway) have ephemeral filesystems.
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// Separate config for Stories, which supports short video clips in addition to images.
// Kept distinct from `upload` above so posts/profile photos stay strictly image-only.
const uploadMedia = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB - video needs more room than a photo
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Only image or video files are allowed'));
  },
});

module.exports = upload;
module.exports.uploadMedia = uploadMedia;
