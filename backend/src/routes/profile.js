const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  updateProfile, addPhoto, deletePhoto, setPrimaryPhoto, getUserById,
  addInterest, removeInterest, boostProfile,
} = require('../controllers/profileController');

router.patch('/', requireAuth, updateProfile);
router.post('/photos', requireAuth, upload.single('photo'), addPhoto);
router.delete('/photos/:id', requireAuth, deletePhoto);
router.patch('/photos/:id/set-primary', requireAuth, setPrimaryPhoto);
router.post('/interests', requireAuth, addInterest);
router.delete('/interests/:name', requireAuth, removeInterest);
router.post('/boost', requireAuth, boostProfile);
router.get('/:userId', requireAuth, getUserById);

module.exports = router;
