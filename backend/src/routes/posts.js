const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getFeed, getUserPosts, createPost, toggleLike, addComment,
} = require('../controllers/postController');

router.get('/', requireAuth, getFeed);
router.get('/user/:userId', requireAuth, getUserPosts);
router.post('/', requireAuth, upload.single('image'), createPost);
router.post('/:id/like', requireAuth, toggleLike);
router.post('/:id/comments', requireAuth, addComment);

module.exports = router;
