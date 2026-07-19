import { useEffect, useState } from 'react';
import { Heart, ShieldAlert, X, Sparkles } from 'lucide-react';
import api from '../api/client';
import ReportBlockModal from '../components/safety/ReportBlockModal';

export default function DiscoverPage() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matchPopup, setMatchPopup] = useState(null);
  const [safetyTarget, setSafetyTarget] = useState(null);

  useEffect(() => {
    loadCandidates();
  }, []);

  async function loadCandidates() {
    setLoading(true);
    try {
      const res = await api.get('/discover');
      setCandidates(res.data.candidates);
    } catch (err) {
      console.error('Failed to load candidates', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSwipe(candidateId, direction) {
    // Remove immediately from the grid for a snappy feel, then confirm with the server
    setCandidates((prev) => prev.filter((c) => c.id !== candidateId));
    try {
      const res = await api.post('/swipe', { swipedId: candidateId, direction });
      if (res.data.matched) {
        const candidate = candidates.find((c) => c.id === candidateId);
        setMatchPopup(candidate);
      }
    } catch (err) {
      console.error('Swipe failed', err);
    }
  }

  function calculateAge(dob) {
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-gray-900 mb-4">Discover</h1>

      {loading && (
        <p className="text-center text-gray-400 text-sm mt-12">Finding people near you…</p>
      )}

      {!loading && candidates.length === 0 && (
        <div className="text-center mt-16 text-gray-400">
          <Sparkles className="mx-auto mb-2" size={32} />
          <p className="text-sm">No new profiles right now.</p>
          <p className="text-xs mt-1">Check back soon, or invite friends to join!</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {candidates.map((candidate) => (
          <div key={candidate.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="aspect-[3/4] bg-gray-100 relative">
              {candidate.photos?.[0]?.url ? (
                <img
                  src={candidate.photos[0].url}
                  alt={candidate.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl font-bold">
                  {candidate.name[0]}
                </div>
              )}
            </div>
            <div className="p-2">
              <p className="font-semibold text-sm text-gray-900 truncate">
                {candidate.name}, {calculateAge(candidate.dob)}
              </p>
              {candidate.location && (
                <p className="text-xs text-gray-400 truncate">{candidate.location}</p>
              )}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleSwipe(candidate.id, 'PASS')}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 rounded-lg py-2 flex items-center justify-center transition"
                >
                  <X size={16} className="text-gray-500" />
                </button>
                <button
                  onClick={() => handleSwipe(candidate.id, 'LIKE')}
                  className="flex-1 bg-primary/10 hover:bg-primary/20 rounded-lg py-2 flex items-center justify-center transition"
                >
                  <Heart size={16} className="text-primary" fill="currentColor" />
                </button>
              </div>
              <button
                onClick={() => setSafetyTarget(candidate)}
                className="mt-2 flex items-center gap-1 text-[11px] text-gray-400 hover:text-primary"
              >
                <ShieldAlert size={12} /> Report or block
              </button>
            </div>
          </div>
        ))}
      </div>

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

      {safetyTarget && (
        <ReportBlockModal
          targetUserId={safetyTarget.id}
          targetUserName={safetyTarget.name}
          onClose={() => setSafetyTarget(null)}
          onBlocked={() => setSafetyTarget(null)}
        />
      )}
    </div>
  );
}
