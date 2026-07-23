const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getActiveStories, getUserStories, createStory, viewStory, deleteStory, getStoryViewers,
} = require('../controllers/storyController');

router.get('/', requireAuth, getActiveStories);
router.get('/user/:userId', requireAuth, getUserStories);
router.post('/', requireAuth, upload.uploadMedia.single('media'), createStory);
router.get('/:id/viewers', requireAuth, getStoryViewers);
router.post('/:id/view', requireAuth, viewStory);
router.delete('/:id', requireAuth, deleteStory);

module.exports = router;
