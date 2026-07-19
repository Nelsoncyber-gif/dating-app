import { useState } from 'react';
import { Heart, MessageCircle, Send } from 'lucide-react';
import api from '../../api/client';

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function PostCard({ post, currentUserId }) {
  const [likes, setLikes] = useState(post.likes || []);
  const [comments, setComments] = useState(post.comments || []);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const liked = likes.some((l) => l.userId === currentUserId);

  async function toggleLike() {
    // Optimistic update
    if (liked) {
      setLikes((prev) => prev.filter((l) => l.userId !== currentUserId));
    } else {
      setLikes((prev) => [...prev, { userId: currentUserId }]);
    }
    try {
      await api.post(`/posts/${post.id}/like`);
    } catch (err) {
      // Revert on failure
      setLikes(post.likes || []);
    }
  }

  async function submitComment(e) {
    e.preventDefault();
    if (!commentText.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await api.post(`/posts/${post.id}/comments`, { content: commentText.trim() });
      setComments((prev) => [...prev, res.data.comment]);
      setCommentText('');
    } catch (err) {
      console.error('Failed to add comment', err);
    } finally {
      setSubmittingComment(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm mx-4 mb-3 overflow-hidden">
      <div className="flex items-center gap-2 p-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0 overflow-hidden">
          {post.user?.photos?.[0]?.url ? (
            <img src={post.user.photos[0].url} alt="" className="w-full h-full object-cover" />
          ) : (
            post.user?.name?.[0]
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{post.user?.name}</p>
          <p className="text-xs text-gray-400">{timeAgo(post.createdAt)}</p>
        </div>
      </div>

      {post.content && (
        <p className="text-sm text-gray-800 px-3 pb-2 whitespace-pre-wrap">{post.content}</p>
      )}

      {post.imageUrl && (
        <img src={post.imageUrl} alt="" className="w-full max-h-96 object-cover" />
      )}

      <div className="flex items-center gap-4 px-3 py-2">
        <button onClick={toggleLike} className="flex items-center gap-1.5 text-xs text-gray-500">
          <Heart
            size={18}
            className={liked ? 'text-primary' : 'text-gray-400'}
            fill={liked ? 'currentColor' : 'none'}
          />
          {likes.length > 0 && <span>{likes.length}</span>}
        </button>
        <button
          onClick={() => setShowComments((s) => !s)}
          className="flex items-center gap-1.5 text-xs text-gray-500"
        >
          <MessageCircle size={18} className="text-gray-400" />
          {comments.length > 0 && <span>{comments.length}</span>}
        </button>
      </div>

      {showComments && (
        <div className="border-t border-gray-100 px-3 py-2">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2 py-1 text-xs">
              <span className="font-semibold text-gray-900 shrink-0">{c.user?.name || 'Someone'}</span>
              <span className="text-gray-600">{c.content}</span>
            </div>
          ))}

          <form onSubmit={submitComment} className="flex items-center gap-2 mt-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment…"
              className="flex-1 text-xs bg-gray-50 rounded-full px-3 py-2 focus:outline-none"
            />
            <button
              type="submit"
              disabled={submittingComment || !commentText.trim()}
              className="text-primary disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
