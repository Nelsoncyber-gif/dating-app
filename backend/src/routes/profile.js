const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  updateProfile, addPhoto, deletePhoto, setPrimaryPhoto, getUserById,
} = require('../controllers/profileController');

router.patch('/', requireAuth, updateProfile);
router.post('/photos', requireAuth, upload.single('photo'), addPhoto);
router.delete('/photos/:id', requireAuth, deletePhoto);
router.patch('/photos/:id/set-primary', requireAuth, setPrimaryPhoto);
router.get('/:userId', requireAuth, getUserById);

module.exports = router;
