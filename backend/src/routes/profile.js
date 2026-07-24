const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  updateProfile, addPhoto, deletePhoto, setPrimaryPhoto, getUserById,
  addInterest, removeInterest, boostProfile,
  addPrompt, deletePrompt, addVideoIntro, deleteVideoIntro,
} = require('../controllers/profileController');

router.patch('/', requireAuth, updateProfile);
router.post('/photos', requireAuth, upload.single('photo'), addPhoto);
router.delete('/photos/:id', requireAuth, deletePhoto);
router.patch('/photos/:id/set-primary', requireAuth, setPrimaryPhoto);
router.post('/interests', requireAuth, addInterest);
router.delete('/interests/:name', requireAuth, removeInterest);
router.post('/boost', requireAuth, boostProfile);
router.post('/prompts', requireAuth, addPrompt);
router.delete('/prompts/:id', requireAuth, deletePrompt);
router.post('/video-intro', requireAuth, upload.single('video'), addVideoIntro);
router.delete('/video-intro', requireAuth, deleteVideoIntro);
router.get('/:userId', requireAuth, getUserById);

module.exports = router;
