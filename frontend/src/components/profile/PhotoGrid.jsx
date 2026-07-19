import { useRef, useState } from 'react';
import { Plus, Star, Trash2, X } from 'lucide-react';
import api from '../../api/client';

export default function PhotoGrid({ photos, onPhotosChange }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [viewingPhoto, setViewingPhoto] = useState(null);

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await api.post('/profile/photos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onPhotosChange([...photos, res.data.photo]);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleDelete(photoId) {
    try {
      await api.delete(`/profile/photos/${photoId}`);
      onPhotosChange(photos.filter((p) => p.id !== photoId));
      setViewingPhoto((v) => (v?.id === photoId ? null : v));
    } catch (err) {
      setError('Could not delete photo. Please try again.');
    }
  }

  async function handleSetPrimary(photoId) {
    try {
      await api.patch(`/profile/photos/${photoId}/set-primary`);
      onPhotosChange(
        photos.map((p) => ({ ...p, isProfilePic: p.id === photoId })),
      );
      setViewingPhoto((v) => (v ? { ...v, isProfilePic: v.id === photoId } : v));
    } catch (err) {
      setError('Could not update primary photo. Please try again.');
    }
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo) => (
          <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden group bg-gray-100">
            <img
              src={photo.url}
              alt=""
              onClick={() => setViewingPhoto(photo)}
              className="w-full h-full object-cover cursor-pointer"
            />

            {photo.isProfilePic && (
              <div className="absolute top-1 left-1 bg-primary text-white rounded-full p-1 pointer-events-none">
                <Star size={10} fill="white" />
              </div>
            )}

            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              {!photo.isProfilePic && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleSetPrimary(photo.id); }}
                  title="Set as main photo"
                  className="bg-white rounded-full p-1.5"
                >
                  <Star size={14} className="text-gray-700" />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(photo.id); }}
                title="Delete photo"
                className="bg-white rounded-full p-1.5"
              >
                <Trash2 size={14} className="text-red-500" />
              </button>
            </div>
          </div>
        ))}

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-primary/40 hover:text-primary transition disabled:opacity-50"
        >
          <Plus size={20} />
          <span className="text-[10px] mt-1">{uploading ? 'Uploading…' : 'Add photo'}</span>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
      {photos.length === 0 && (
        <p className="text-xs text-gray-400 mt-2">
          Add your first photo — it'll automatically become your main profile picture.
        </p>
      )}

      {viewingPhoto && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center px-4"
          onClick={() => setViewingPhoto(null)}
        >
          <button
            onClick={() => setViewingPhoto(null)}
            className="absolute top-4 right-4 text-white bg-white/10 rounded-full p-2"
          >
            <X size={20} />
          </button>

          <img
            src={viewingPhoto.url}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-h-[75vh] max-w-full rounded-lg object-contain"
          />

          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-8 flex gap-3"
          >
            {!viewingPhoto.isProfilePic && (
              <button
                onClick={() => handleSetPrimary(viewingPhoto.id)}
                className="flex items-center gap-1.5 bg-white text-gray-800 text-sm font-medium rounded-full px-4 py-2"
              >
                <Star size={14} /> Set as main
              </button>
            )}
            <button
              onClick={() => handleDelete(viewingPhoto.id)}
              className="flex items-center gap-1.5 bg-white text-red-500 text-sm font-medium rounded-full px-4 py-2"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
