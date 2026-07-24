const multer = require('multer');

// Store in memory, then stream straight to Cloudinary — no disk writes,
// which matters because most hosts (Render/Railway) have ephemeral filesystems.
const storage = multer.memoryStorage();

// Allowlist of accepted MIME types for security
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_AUDIO_TYPES = ['audio/webm', 'audio/wav', 'audio/mpeg', 'audio/ogg', 'audio/mp4'];
const ALLOWED_ALL = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_AUDIO_TYPES];

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
  },
});

// Separate config for media uploads (chat, stories) — supports video + audio too
const uploadMedia = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB - video needs more room than a photo
  fileFilter: (req, file, cb) => {
    if (ALLOWED_ALL.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`File type ${file.mimetype} is not allowed. Accepted: images, MP4/WebM video, WebM/WAV/MP3 audio`));
  },
});

module.exports = upload;
module.exports.uploadMedia = uploadMedia;
