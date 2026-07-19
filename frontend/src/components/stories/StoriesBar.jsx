import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import api from '../../api/client';

export default function StoriesBar({ storyGroups, currentUser, onAddStory, onOpenStory }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const myGroup = storyGroups.find((g) => g.user.id === currentUser?.id);
  const otherGroups = storyGroups.filter((g) => g.user.id !== currentUser?.id);

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('media', file);
      const res = await api.post('/stories', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onAddStory(res.data.story);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload story.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function avatarFor(user) {
    return user.photos?.[0]?.url || null;
  }

  return (
    <div className="flex gap-3 overflow-x-auto px-4 py-3 no-scrollbar">
      {/* My story bubble - either "add" (no stories yet) or my existing story ring */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <button
          onClick={() => (myGroup ? onOpenStory(myGroup) : fileInputRef.current?.click())}
          disabled={uploading}
          className="relative w-14 h-14 rounded-full disabled:opacity-60"
        >
          <div
            className={`w-14 h-14 rounded-full p-0.5 ${
              myGroup ? 'bg-gradient-to-tr from-primary to-primary-light' : 'bg-gray-200'
            }`}
          >
            <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
              {avatarFor(currentUser || {}) ? (
                <img src={avatarFor(currentUser)} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-400 font-semibold">{currentUser?.name?.[0]}</span>
              )}
            </div>
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 bg-primary text-white rounded-full p-0.5 border-2 border-white">
            <Plus size={10} />
          </span>
        </button>
        <span className="text-[10px] text-gray-500">
          {uploading ? 'Uploading…' : 'Your story'}
        </span>
      </div>

      {otherGroups.map((group) => {
        const allViewed = group.stories.every((s) => s.viewedByMe);
        return (
          <div key={group.user.id} className="flex flex-col items-center gap-1 shrink-0">
            <button onClick={() => onOpenStory(group)} className="w-14 h-14 rounded-full">
              <div
                className={`w-14 h-14 rounded-full p-0.5 ${
                  allViewed ? 'bg-gray-200' : 'bg-gradient-to-tr from-primary to-primary-light'
                }`}
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border-2 border-white">
                  {avatarFor(group.user) ? (
                    <img src={avatarFor(group.user)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-400 font-semibold">{group.user.name[0]}</span>
                  )}
                </div>
              </div>
            </button>
            <span className="text-[10px] text-gray-500 max-w-[56px] truncate">{group.user.name}</span>
          </div>
        );
      })}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {error && <p className="text-red-500 text-[10px] shrink-0 self-center">{error}</p>}
    </div>
  );
}
