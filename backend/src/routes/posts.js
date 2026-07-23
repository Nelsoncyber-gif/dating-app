const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { uploadMedia } = require('../middleware/upload');
const {
  getFeed, getUserPosts, createPost, toggleLike, addComment, deletePost,
} = require('../controllers/postController');

router.get('/', requireAuth, getFeed);
router.get('/user/:userId', requireAuth, getUserPosts);
router.post('/', requireAuth, uploadMedia.single('image'), createPost);
router.post('/:id/like', requireAuth, toggleLike);
router.post('/:id/comments', requireAuth, addComment);
router.delete('/:id', requireAuth, deletePost);

module.exports = router;
