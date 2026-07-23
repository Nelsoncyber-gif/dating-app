import { useState } from 'react';
import { Heart, MessageCircle, Send, MoreVertical, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import MediaViewer from '../media/MediaViewer';

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

export default function PostCard({ post, currentUserId, onDelete }) {
  const navigate = useNavigate();
  const [likes, setLikes] = useState(post.likes || []);
  const [comments, setComments] = useState(post.comments || []);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const liked = likes.some((l) => l.userId === currentUserId);
  const isOwner = post.userId === currentUserId;

  function handleViewProfile(e) {
    e.stopPropagation();
    if (post.user?.id) {
      navigate(`/profile/${post.user.id}`);
    }
  }

  async function toggleLike() {
    if (liked) {
      setLikes((prev) => prev.filter((l) => l.userId !== currentUserId));
    } else {
      setLikes((prev) => [...prev, { userId: currentUserId }]);
    }

    try {
      await api.post(`/posts/${post.id}/like`);
    } catch (err) {
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

  async function handleDelete() {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    setDeleting(true);
    try {
      await api.delete(`/posts/${post.id}`);
      onDelete?.(post.id);
    } catch (err) {
      console.error('Failed to delete post', err);
      alert('Failed to delete post');
    } finally {
      setDeleting(false);
      setShowMenu(false);
    }
  }

  const mediaItems = post.imageUrl ? [{ url: post.imageUrl, type: post.mediaType === 'video' ? 'video' : 'image', caption: post.content }] : [];

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm mx-4 mb-3 overflow-hidden">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <div
              onClick={handleViewProfile}
              className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0 overflow-hidden cursor-pointer hover:opacity-80 transition"
            >
              {post.user?.photos?.[0]?.url ? (
                <img src={post.user.photos[0].url} alt="" className="w-full h-full object-cover" />
              ) : (
                post.user?.name?.[0]
              )}
            </div>
            <div className="min-w-0">
              <p
                onClick={handleViewProfile}
                className="text-sm font-semibold text-gray-900 truncate cursor-pointer hover:text-primary transition"
              >
                {post.user?.name}
              </p>
              <p className="text-xs text-gray-400">{timeAgo(post.createdAt)}</p>
            </div>
          </div>

          {isOwner && (
            <div className="relative">
              <button onClick={() => setShowMenu((prev) => !prev)} className="text-gray-400 hover:text-gray-600 p-1">
                <MoreVertical size={18} />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20 min-w-[120px]">
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                      {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {post.content && (
          <p className="text-sm text-gray-800 px-3 pb-2 whitespace-pre-wrap">{post.content}</p>
        )}

        {post.imageUrl && post.mediaType === 'video' && (
          <div className="cursor-pointer" onClick={() => setShowMediaViewer(true)}>
            <video src={post.imageUrl} controls playsInline className="w-full max-h-96 object-cover hover:opacity-95 transition" />
          </div>
        )}

        {post.imageUrl && post.mediaType !== 'video' && (
          <div className="cursor-pointer" onClick={() => setShowMediaViewer(true)}>
            <img src={post.imageUrl} alt="" className="w-full max-h-96 object-cover hover:opacity-95 transition" />
          </div>
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

      {showMediaViewer && mediaItems.length > 0 && (
        <MediaViewer items={mediaItems} currentIndex={0} onClose={() => setShowMediaViewer(false)} />
      )}
    </>
  );
}
