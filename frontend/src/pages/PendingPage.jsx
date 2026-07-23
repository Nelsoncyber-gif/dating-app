import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ArrowLeft } from 'lucide-react';
import api from '../api/client';

export default function PendingPage() {
  const navigate = useNavigate();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/social/pending')
      .then((res) => {
        setPending(res.data.pending);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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
              <div key={user.id} className="bg-white rounded-xl shadow-sm p-3 flex items-center gap-3">
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
    </div>
  );
}
