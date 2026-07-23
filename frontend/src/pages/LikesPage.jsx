import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Heart, ArrowLeft } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function LikesPage() {
  const { user } = useAuth();
  const [likes, setLikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadLikes();
  }, []);

  async function loadLikes() {
    try {
      const res = await api.get('/social/likes');
      setLikes(res.data.likes);
    } catch (err) {
      console.error('Failed to load likes', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 pb-8 max-w-3xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-gray-600 hover:text-gray-900">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Heart size={20} className="text-primary" fill="currentColor" /> Who Liked You
        </h1>
      </div>

      {/* Premium upsell */}
      {!user?.isPremium && (
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl p-4 mb-6 text-white text-center">
          <Lock className="mx-auto mb-2" size={24} />
          <h2 className="font-bold text-lg">Upgrade to Premium</h2>
          <p className="text-sm mb-3">See exactly who likes you and match instantly!</p>
          <button
            onClick={() => navigate('/premium')}
            className="bg-white text-orange-500 font-bold py-2 px-6 rounded-full text-sm"
          >
            Upgrade Now
          </button>
        </div>
      )}

      {loading && <p className="text-center text-gray-400 text-sm mt-12">Loading...</p>}

      {!loading && likes.length === 0 && (
        <div className="text-center mt-16 text-gray-400">
          <Heart className="mx-auto mb-2" size={32} />
          <p className="text-sm">No one has liked you yet.</p>
          <p className="text-xs mt-1">Keep swiping and someone will!</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {likes.map((like) => (
          <div key={like.id} className="bg-white rounded-xl shadow-sm overflow-hidden relative">
            <div className="aspect-square bg-gray-100 relative">
              <img
                src={like.photos?.[0]?.url}
                alt={like.name}
                className="w-full h-full object-cover"
              />
              {!user?.isPremium && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-md flex items-center justify-center">
                  <Lock size={24} className="text-gray-600" />
                </div>
              )}
            </div>
            <div className="p-2 text-center">
              <p className="font-semibold text-sm truncate">
                {user?.isPremium ? like.name : 'Someone'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
