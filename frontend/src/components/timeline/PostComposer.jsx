import { useRef, useState } from 'react';
import { Image as ImageIcon, Video, X } from 'lucide-react';
import api from '../../api/client';

export default function PostComposer({ currentUser, onPostCreated }) {
  const fileInputRef = useRef(null);
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [isVideo, setIsVideo] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    setIsVideo(file.type.startsWith('video/'));
    setMediaPreview(URL.createObjectURL(file));
  }

  function clearMedia() {
    setMediaFile(null);
    setMediaPreview(null);
    setIsVideo(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit() {
    if (!content.trim() && !mediaFile) return;

    setError('');
    setPosting(true);
    try {
      const formData = new FormData();
      if (content.trim()) formData.append('content', content.trim());
      if (mediaFile) formData.append('image', mediaFile);

      const res = await api.post('/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      onPostCreated(res.data.post);
      setContent('');
      clearMedia();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create post. Please try again.');
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-3 mx-4 mb-3">
      <div className="flex gap-2">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0 overflow-hidden">
          {currentUser?.photos?.[0]?.url ? (
            <img src={currentUser.photos[0].url} alt="" className="w-full h-full object-cover" />
          ) : (
            currentUser?.name?.[0]
          )}
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          rows={2}
          className="flex-1 text-sm resize-none focus:outline-none placeholder:text-gray-400"
        />
      </div>

      {mediaPreview && (
        <div className="relative mt-2 rounded-lg overflow-hidden">
          {isVideo ? (
            <video src={mediaPreview} controls playsInline className="w-full max-h-64 object-cover" />
          ) : (
            <img src={mediaPreview} alt="" className="w-full max-h-64 object-cover" />
          )}
          <button
            onClick={clearMedia}
            className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 text-gray-500 text-xs font-medium hover:text-primary transition"
          >
            <ImageIcon size={16} />
            Photo
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 text-gray-500 text-xs font-medium hover:text-primary transition"
          >
            <Video size={16} />
            Video
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        <button
          onClick={handleSubmit}
          disabled={posting || (!content.trim() && !mediaFile)}
          className="bg-primary text-white text-xs font-semibold rounded-full px-4 py-1.5 disabled:opacity-40 transition"
        >
          {posting ? 'Posting…' : 'Post'}
        </button>
      </div>
    </div>
  );
}
