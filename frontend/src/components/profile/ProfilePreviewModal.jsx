import { useEffect, useState } from 'react';
import { X, MapPin, Heart, X as XIcon } from 'lucide-react';
import api from '../../api/client';

export default function ProfilePreviewModal({ userId, onClose, onLike, onPass }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (userId) {
      api.get(`/profile/${userId}`)
        .then((res) => {
          if (mounted) {
            setUser(res.data.user);
            setLoading(false);
          }
        })
        .catch((err) => {
          console.error('Failed to load profile', err);
          if (mounted) setLoading(false);
        });
    } else {
      setLoading(false);
    }
    return () => { mounted = false; };
  }, [userId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-24 h-24 bg-gray-200 rounded-full mb-4" />
            <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-24" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const profilePhoto = user.photos?.find((p) => p.isProfilePic) || user.photos?.[0];

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto relative">
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-3 right-3 bg-black/20 hover:bg-black/40 text-white rounded-full p-1.5 z-10 transition"
        >
          <X size={20} />
        </button>

        {/* Photos Grid */}
        <div className="grid grid-cols-2 gap-1 p-1">
          {user.photos?.map((photo, idx) => (
            <div 
              key={photo.id} 
              className={`relative rounded-lg overflow-hidden bg-gray-100 ${idx === 0 ? 'col-span-2 aspect-video' : 'aspect-square'}`}
            >
              <img src={photo.url} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
          {(!user.photos || user.photos.length === 0) && (
            <div className="col-span-2 aspect-video flex items-center justify-center text-gray-300 text-6xl font-bold bg-gray-100 rounded-lg">
              {user.name[0]}
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="p-4">
          <div className="flex items-baseline gap-2 mb-1">
            <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
            <span className="text-xl text-gray-500">{user.age}</span>
          </div>
          
          {user.location && (
            <div className="flex items-center gap-1 text-gray-500 text-sm mb-3">
              <MapPin size={14} />
              <span>{user.location}</span>
            </div>
          )}

          {user.bio && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">About</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{user.bio}</p>
            </div>
          )}

          {/* Interests */}
          {user.interests && user.interests.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Interests</h3>
              <div className="flex flex-wrap gap-2">
                {user.interests.map((ui) => (
                  <span
                    key={ui.interest.id}
                    className="bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full font-medium"
                  >
                    {ui.interest.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => { onPass(userId); onClose(); }}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition"
            >
              <XIcon size={20} /> Pass
            </button>
            <button
              onClick={() => { onLike(userId); onClose(); }}
              className="flex-1 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition"
            >
              <Heart size={20} fill="currentColor" /> Like
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}