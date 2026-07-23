import { useRef, useState } from 'react';
import { Plus, X, Type, Image } from 'lucide-react';
import api from '../../api/client';

const BG_COLORS = [
  '#ec4899', '#8b5cf6', '#3b82f6', '#10b981',
  '#f59e0b', '#ef4444', '#6366f1', '#14b8a6',
];

export default function StoriesBar({ storyGroups, currentUser, onAddStory, onOpenStory }) {
  const fileInputRef = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState(null); // 'media' or 'text'
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Media story state
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [caption, setCaption] = useState('');

  // Text story state
  const [textContent, setTextContent] = useState('');
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);

  const myGroup = storyGroups.find((g) => g.user.id === currentUser?.id);
  const otherGroups = storyGroups.filter((g) => g.user.id !== currentUser?.id);

  function openModal() {
    setShowModal(true);
    setMode(null);
    setError('');
  }

  function closeModal() {
    setShowModal(false);
    setMode(null);
    setMediaFile(null);
    setMediaPreview(null);
    setCaption('');
    setTextContent('');
    setBgColor(BG_COLORS[0]);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleMediaSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  }

  async function handleMediaSubmit() {
    if (!mediaFile) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('media', mediaFile);
      if (caption.trim()) formData.append('caption', caption.trim());
      const res = await api.post('/stories', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onAddStory(res.data.story);
      closeModal();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload story.');
    } finally {
      setUploading(false);
    }
  }

  async function handleTextSubmit() {
    if (!textContent.trim()) return;
    setUploading(true);
    setError('');
    try {
      const res = await api.post('/stories', {
        type: 'text',
        caption: textContent.trim(),
        backgroundColor: bgColor,
      });
      onAddStory(res.data.story);
      closeModal();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create story.');
    } finally {
      setUploading(false);
    }
  }

  function avatarFor(user) {
    return user.photos?.[0]?.url || null;
  }

  return (
    <>
      <div className="flex gap-3 overflow-x-auto px-4 py-3 no-scrollbar">
        {/* My story bubble */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <button
            onClick={() => (myGroup ? onOpenStory(myGroup) : openModal())}
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
            {uploading ? 'Uploading...' : 'Your story'}
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
      </div>

      {/* Story Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-900">Create Story</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>

            <div className="p-4">
              {!mode && (
                <div className="space-y-3">
                  <button
                    onClick={() => setMode('media')}
                    className="w-full flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition"
                  >
                    <div className="p-3 bg-primary/10 rounded-full">
                      <Image size={24} className="text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">Photo / Video</p>
                      <p className="text-xs text-gray-500">Share a moment from your camera</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setMode('text')}
                    className="w-full flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition"
                  >
                    <div className="p-3 bg-purple-100 rounded-full">
                      <Type size={24} className="text-purple-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">Text Status</p>
                      <p className="text-xs text-gray-500">Write something on a colored background</p>
                    </div>
                  </button>
                </div>
              )}

              {mode === 'media' && (
                <div className="space-y-4">
                  {!mediaPreview ? (
                    <label className="flex flex-col items-center justify-center gap-2 w-full border-2 border-dashed border-gray-200 hover:border-primary rounded-xl py-12 cursor-pointer transition text-gray-400 hover:text-primary">
                      <Image size={32} />
                      <span className="text-sm font-medium">Tap to select photo or video</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleMediaSelect}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative rounded-lg overflow-hidden">
                        {mediaFile?.type.startsWith('video/') ? (
                          <video src={mediaPreview} controls playsInline className="w-full max-h-48 object-cover" />
                        ) : (
                          <img src={mediaPreview} alt="" className="w-full max-h-48 object-cover" />
                        )}
                        <button
                          onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                          className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Add a caption..."
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                        maxLength={100}
                      />
                      <button
                        onClick={handleMediaSubmit}
                        disabled={uploading}
                        className="w-full bg-primary text-white font-semibold rounded-lg py-3 disabled:opacity-50 transition"
                      >
                        {uploading ? 'Uploading...' : 'Share Story'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {mode === 'text' && (
                <div className="space-y-4">
                  <div
                    className="rounded-xl p-6 min-h-[180px] flex items-center justify-center"
                    style={{ backgroundColor: bgColor }}
                  >
                    <textarea
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      placeholder="Type your thoughts..."
                      className="w-full bg-transparent text-white text-center text-lg font-semibold placeholder:text-white/60 resize-none focus:outline-none"
                      rows={4}
                      maxLength={200}
                    />
                  </div>
                  <div className="flex gap-2 justify-center">
                    {BG_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setBgColor(color)}
                        className={`w-8 h-8 rounded-full border-2 transition ${bgColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={handleTextSubmit}
                    disabled={uploading || !textContent.trim()}
                    className="w-full bg-primary text-white font-semibold rounded-lg py-3 disabled:opacity-50 transition"
                  >
                    {uploading ? 'Posting...' : 'Share Status'}
                  </button>
                </div>
              )}

              {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
