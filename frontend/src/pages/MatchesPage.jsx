import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, ArrowLeft } from 'lucide-react';
import api from '../api/client';

export default function MatchesPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/social/matches')
      .then((res) => {
        setMatches(res.data.matches);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p className="p-4 text-center text-gray-400">Loading matches...</p>;

  return (
    <div className="p-4 max-w-3xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/chats')} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Matches</h1>
      </div>
      {matches.length === 0 ? (
        <p className="text-center text-gray-400 text-sm mt-8">No matches yet. Keep swiping!</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {matches.map((m) => {
            const photo = m.user.photos?.find((p) => p.isProfilePic) || m.user.photos?.[0];
            return (
              <div key={m.matchId} className="bg-white rounded-xl shadow-sm overflow-hidden relative group">
                <div
                  className="aspect-square bg-gray-100 cursor-pointer hover:opacity-90 transition"
                  onClick={() => navigate(`/profile/${m.user.id}`)}
                >
                  {photo ? (
                    <img src={photo.url} alt={m.user.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl font-bold">
                      {m.user.name[0]}
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p
                    className="font-semibold text-sm text-gray-900 truncate cursor-pointer hover:text-primary transition"
                    onClick={() => navigate(`/profile/${m.user.id}`)}
                  >
                    {m.user.name}
                  </p>
                  {m.conversationId && (
                    <button
                      onClick={() => navigate(`/chats/${m.conversationId}`)}
                      className="mt-2 w-full bg-primary/10 text-primary text-xs font-medium rounded-lg py-1.5 flex items-center justify-center gap-1 hover:bg-primary/20 transition"
                    >
                      <MessageCircle size={14} /> Message
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
