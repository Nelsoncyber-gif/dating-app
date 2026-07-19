import { useEffect, useRef, useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import api from '../../api/client';

const STORY_DURATION_MS = 5000;

export default function StoryViewer({ group, currentUserId, onClose, onDeleted }) {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef(null);
  const story = group.stories[index];
  const isMine = group.user.id === currentUserId;

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

      {/* Media */}
      <div className="flex-1 relative flex items-center justify-center">
        {/* Tap zones for prev/next */}
        <button onClick={goPrev} className="absolute left-0 top-0 h-full w-1/3 z-10" aria-label="Previous" />
        <button onClick={goNext} className="absolute right-0 top-0 h-full w-1/3 z-10" aria-label="Next" />

        {story.mediaUrl.match(/\.(mp4|webm|mov)$/i) ? (
          <video src={story.mediaUrl} autoPlay muted playsInline className="max-h-full max-w-full" />
        ) : (
          <img src={story.mediaUrl} alt="" className="max-h-full max-w-full object-contain" />
        )}

        {story.caption && (
          <p className="absolute bottom-6 left-4 right-4 text-white text-sm bg-black/40 rounded-lg px-3 py-2">
            {story.caption}
          </p>
        )}
      </div>
    </div>
  );
}
