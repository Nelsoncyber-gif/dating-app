import { useEffect, useRef, useState } from 'react';
import { X, Trash2, Download, Eye } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const STORY_DURATION_MS = 5000;

export default function StoryViewer({ group, currentUserId, onClose, onDeleted }) {
  const { user } = useAuth();
  const isPremium = user?.isPremium || false;
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef(null);
  const story = group.stories[index];
  const isMine = group.user.id === currentUserId;
  const isVideo = story.mediaUrl?.match(/\.(mp4|webm|mov)$/i);
  const isText = story.type === 'text' || (!story.mediaUrl && story.caption);

  // Viewers state
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState([]);
  const [loadingViewers, setLoadingViewers] = useState(false);

  useEffect(() => {
    // Mark as viewed as soon as it's shown
    api.post(`/stories/${story.id}/view`).catch(() => {});

    setProgress(0);
    const start = Date.now();
    intervalRef.current = setInterval(() => {
      const pct = ((Date.now() - start) / STORY_DURATION_MS) * 100;
      if (pct >= 100) {
        goNext();
      } else {
        setProgress(pct);
      }
    }, 50);

    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Reset viewers panel when switching stories
  useEffect(() => {
    setShowViewers(false);
    setViewers([]);
  }, [index]);

  function goNext() {
    clearInterval(intervalRef.current);
    if (index < group.stories.length - 1) {
      setIndex((i) => i + 1);
    } else {
      onClose();
    }
  }

  function goPrev() {
    clearInterval(intervalRef.current);
    if (index > 0) setIndex((i) => i - 1);
  }

  async function toggleViewers() {
    if (showViewers) {
      setShowViewers(false);
      return;
    }
    setShowViewers(true);
    if (viewers.length === 0 && story.viewCount > 0) {
      setLoadingViewers(true);
      try {
        const res = await api.get(`/stories/${story.id}/viewers`);
        setViewers(res.data.viewers);
      } catch (err) {
        console.error('Failed to load viewers', err);
      } finally {
        setLoadingViewers(false);
      }
    }
  }

  async function handleDelete() {
    try {
      await api.delete(`/stories/${story.id}`);
      onDeleted(story.id);
      if (group.stories.length <= 1) {
        onClose();
      } else {
        goNext();
      }
    } catch (err) {
      console.error('Failed to delete story', err);
    }
  }

  const handleDownload = async () => {
    if (!isPremium) {
      alert('Upgrade to premium to download stories');
      return;
    }
    if (isText) {
      alert('Text stories cannot be downloaded');
      return;
    }

    try {
      const response = await fetch(story.mediaUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `story_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download story');
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col max-w-md mx-auto">
      {/* Progress bars */}
      <div className="flex gap-1 px-2 pt-2">
        {group.stories.map((s, i) => (
          <div key={s.id} className="flex-1 h-0.5 bg-white/30 rounded overflow-hidden">
            <div
              className="h-full bg-white"
              style={{
                width: i < index ? '100%' : i === index ? `${progress}%` : '0%',
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center text-white text-xs font-semibold">
            {group.user.photos?.[0]?.url ? (
              <img src={group.user.photos[0].url} alt="" className="w-full h-full object-cover" />
            ) : (
              group.user.name[0]
            )}
          </div>
          <span className="text-white text-sm font-medium">{group.user.name}</span>
        </div>
        <div className="flex items-center gap-3">
          {isMine && story.viewCount > 0 && (
            <button
              onClick={toggleViewers}
              className={`flex items-center gap-1 text-sm font-medium ${showViewers ? 'text-primary' : 'text-white/80 hover:text-white'}`}
              title="Viewers"
            >
              <Eye size={16} />
              <span className="text-xs">{story.viewCount}</span>
            </button>
          )}
          {isPremium && !isText && (
            <button 
              onClick={handleDownload}
              className="text-white/80 hover:text-white"
              title="Download"
            >
              <Download size={18} />
            </button>
          )}
          {isMine && (
            <button onClick={handleDelete} className="text-white/80">
              <Trash2 size={18} />
            </button>
          )}
          <button onClick={onClose} className="text-white/80">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative flex items-center justify-center">
        {/* Tap zones for prev/next */}
        <button onClick={goPrev} className="absolute left-0 top-0 h-full w-1/3 z-10" aria-label="Previous" />
        <button onClick={goNext} className="absolute right-0 top-0 h-full w-1/3 z-10" aria-label="Next" />

        {isText ? (
          /* Text-only story */
          <div
            className="absolute inset-0 flex items-center justify-center p-8"
            style={{ backgroundColor: story.backgroundColor || '#ec4899' }}
          >
            <p className="text-white text-2xl font-bold text-center leading-relaxed whitespace-pre-wrap">
              {story.caption}
            </p>
          </div>
        ) : (
          /* Media story */
          <>
            {isVideo ? (
              <video src={story.mediaUrl} autoPlay muted playsInline className="max-h-full max-w-full" />
            ) : (
              <img src={story.mediaUrl} alt="" className="max-h-full max-w-full object-contain" />
            )}

            {story.caption && (
              <p className="absolute bottom-6 left-4 right-4 text-white text-sm bg-black/40 rounded-lg px-3 py-2">
                {story.caption}
              </p>
            )}
          </>
        )}
      </div>

      {/* Viewers Panel */}
      {showViewers && isMine && (
        <div className="absolute bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm rounded-t-2xl max-h-[50%] overflow-y-auto z-20">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h3 className="text-white text-sm font-semibold">Viewers ({story.viewCount})</h3>
            <button onClick={() => setShowViewers(false)} className="text-white/60 hover:text-white">
              <X size={18} />
            </button>
          </div>
          <div className="px-4 py-2">
            {loadingViewers && (
              <p className="text-white/50 text-sm text-center py-4">Loading viewers...</p>
            )}
            {!loadingViewers && viewers.length === 0 && (
              <p className="text-white/50 text-sm text-center py-4">No viewers yet</p>
            )}
            {viewers.map((viewer) => (
              <div key={viewer.id} className="flex items-center gap-3 py-2">
                <div className="w-9 h-9 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center text-white text-xs font-semibold shrink-0">
                  {viewer.photo ? (
                    <img src={viewer.photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    viewer.name?.[0] || '?'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{viewer.name}</p>
                  <p className="text-white/40 text-xs">
                    {new Date(viewer.viewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isPremium && !isText && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-primary/90 text-white px-4 py-2 rounded-full text-sm">
          Upgrade to premium to download
        </div>
      )}
    </div>
  );
}
