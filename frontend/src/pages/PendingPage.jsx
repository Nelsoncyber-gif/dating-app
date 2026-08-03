import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ArrowLeft, Heart } from 'lucide-react';
import api from '../api/client';
import ProfilePreviewModal from '../components/profile/ProfilePreviewModal';

export default function PendingPage() {
  const navigate = useNavigate();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewUserId, setPreviewUserId] = useState(null);
  const [matchPopup, setMatchPopup] = useState(null);

  useEffect(() => {
    api.get('/social/pending')
      .then((res) => {
        setPending(res.data.pending);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Actually call the swipe API when user likes from the preview modal
  async function handlePendingLike(swipedId) {
    try {
      const res = await api.post('/swipe', { swipedId, direction: 'LIKE' });
      if (res.data.matched) {
        const matchedUser = pending.find((u) => u.id === swipedId);
        setMatchPopup(matchedUser || { name: 'Someone' });
      }
      // Remove from pending list (either matched or still waiting)
      setPending((prev) => prev.filter((u) => u.id !== swipedId));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to like');
    }
  }

  // Actually call the swipe API when user passes from the preview modal
  async function handlePendingPass(swipedId) {
    try {
      await api.post('/swipe', { swipedId, direction: 'PASS' });
      // Remove from pending list since we passed
      setPending((prev) => prev.filter((u) => u.id !== swipedId));
    } catch (err) {
      console.error('Failed to pass', err);
    }
  }

  if (loading) return <p className="p-4 text-center text-gray-400">Loading...</p>;

  return (
    <div className="p-4 max-w-3xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/chats')} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Pending Likes</h1>
      </div>
      {pending.length === 0 ? (
        <p className="text-center text-gray-400 text-sm mt-8">
          You haven't sent any likes, or they've all responded!
        </p>
      ) : (
        <div className="space-y-3">
          {pending.map((user) => {
            const photo = user.photos?.find((p) => p.isProfilePic) || user.photos?.[0];
            return (
              <div
                key={user.id}
                onClick={() => setPreviewUserId(user.id)}
                className="bg-white rounded-xl shadow-sm p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition"
              >
                <div className="w-14 h-14 rounded-full bg-gray-100 overflow-hidden shrink-0">
                  {photo ? (
                    <img src={photo.url} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold">
                      {user.name[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">{user.name}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock size={12} /> Waiting for response
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {previewUserId && (
        <ProfilePreviewModal
          userId={previewUserId}
          onClose={() => setPreviewUserId(null)}
          onLike={handlePendingLike}
          onPass={handlePendingPass}
        />
      )}

      {/* Match Popup */}
      {matchPopup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-2xl p-6 text-center max-w-xs w-full">
            <Heart className="mx-auto text-primary mb-3" size={40} fill="currentColor" />
            <h2 className="text-xl font-bold text-gray-900">It's a Match!</h2>
            <p className="text-sm text-gray-500 mt-1">
              You and {matchPopup.name} liked each other.
            </p>
            <button
              onClick={() => setMatchPopup(null)}
              className="mt-4 bg-primary text-white rounded-lg py-2 px-6 font-medium w-full"
            >
              Keep Browsing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
