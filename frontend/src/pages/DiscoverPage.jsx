import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ShieldAlert, X, Sparkles, Info, Star, Zap, RotateCcw, Filter, Crown, Calendar } from 'lucide-react';
import api from '../api/client';
import ReportBlockModal from '../components/safety/ReportBlockModal';
import ProfilePreviewModal from '../components/profile/ProfilePreviewModal';
import OnboardingModal from '../components/onboarding/OnboardingModal';

export default function DiscoverPage() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matchPopup, setMatchPopup] = useState(null);
  const [safetyTarget, setSafetyTarget] = useState(null);
  const [previewUserId, setPreviewUserId] = useState(null);
  const [lastSwiped, setLastSwiped] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ minAge: '', maxAge: '', gender: '' });
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    loadCandidates();
    // Show onboarding tutorial if first visit
    if (!localStorage.getItem('hasSeenTutorial')) {
      setShowTutorial(true);
    }
  }, []);

  function closeTutorial() {
    setShowTutorial(false);
    localStorage.setItem('hasSeenTutorial', 'true');
  }

  async function loadCandidates() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.minAge) params.set('minAge', filters.minAge);
      if (filters.maxAge) params.set('maxAge', filters.maxAge);
      if (filters.gender) params.set('gender', filters.gender);
      const qs = params.toString();
      const res = await api.get(`/discover${qs ? `?${qs}` : ''}`);
      setCandidates(res.data.candidates);
    } catch (err) {
      console.error('Failed to load candidates', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSwipe(candidateId, direction) {
    setLastSwiped({ id: candidateId, index: candidates.findIndex(c => c.id === candidateId) });
    setCandidates((prev) => prev.filter((c) => c.id !== candidateId));
    try {
      const res = await api.post('/swipe', { swipedId: candidateId, direction });
      if (res.data.matched) {
        const candidate = candidates.find((c) => c.id === candidateId);
        setMatchPopup(candidate);
      }
    } catch (err) {
      console.error('Swipe failed', err);
      if (err.response?.status === 403) {
        alert(err.response.data.error);
      }
    }
  }

  async function handleSuperLike(candidateId) {
    setCandidates((prev) => prev.filter((c) => c.id !== candidateId));
    try {
      const res = await api.post('/swipe', { swipedId: candidateId, direction: 'LIKE', isSuperLike: true });
      if (res.data.matched) {
        const candidate = candidates.find((c) => c.id === candidateId);
        setMatchPopup(candidate);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Super like failed');
      // Put the candidate back if it failed
      loadCandidates();
    }
  }

  async function handleRewind() {
    if (!lastSwiped) return;
    try {
      await api.post('/swipe/undo');
      // Reload candidates to get the undone one back
      loadCandidates();
      setLastSwiped(null);
    } catch (err) {
      alert('Rewind failed');
    }
  }

  function calculateAge(dob) {
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  }

  return (
    <div className="p-4">
      {/* Header with filters and rewind */}
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => setShowFilters(true)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition" title="Filters">
          <Filter size={18} className="text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Discover</h1>
        <div className="flex gap-2">
          <button onClick={() => navigate('/likes')} className="p-2 bg-primary/10 hover:bg-primary/20 rounded-full transition" title="Who Liked You">
            <Heart size={18} className="text-primary" />
          </button>
          <button onClick={() => navigate('/events')} className="p-2 bg-green-100 hover:bg-green-200 rounded-full transition" title="Events">
            <Calendar size={18} className="text-green-600" />
          </button>
          <button onClick={() => navigate('/premium')} className="p-2 bg-amber-100 hover:bg-amber-200 rounded-full transition" title="Go Premium">
            <Crown size={18} className="text-amber-500" />
          </button>
          {lastSwiped && (
            <button onClick={handleRewind} className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full transition animate-pulse" title="Rewind">
              <RotateCcw size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Filter Modal */}
      {showFilters && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl p-5 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Filters</h2>
              <button onClick={() => setShowFilters(false)} className="p-1"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">Min Age</label>
                <input type="number" min="18" max="99" value={filters.minAge} onChange={e => setFilters({ ...filters, minAge: e.target.value })} className="w-full border rounded-lg p-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Max Age</label>
                <input type="number" min="18" max="99" value={filters.maxAge} onChange={e => setFilters({ ...filters, maxAge: e.target.value })} className="w-full border rounded-lg p-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Gender</label>
                <select value={filters.gender} onChange={e => setFilters({ ...filters, gender: e.target.value })} className="w-full border rounded-lg p-2 text-sm">
                  <option value="">All</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <button onClick={() => { loadCandidates(); setShowFilters(false); }} className="w-full bg-primary text-white rounded-lg py-2.5 text-sm font-medium">
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Fixed: Removed the extra '>' that was causing the parse error */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-w-6xl mx-auto px-2">
        {candidates.map((candidate) => (
          <div key={candidate.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div 
              className="aspect-[3/4] bg-gray-100 relative cursor-pointer group"
              onClick={() => setPreviewUserId(candidate.id)}
            >
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
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition flex items-start justify-end p-2 opacity-0 group-hover:opacity-100">
                <Info size={18} className="text-white drop-shadow-md" />
              </div>
            </div>
            
            <div className="p-2">
              <p className="font-semibold text-sm text-gray-900 truncate">
                {candidate.name}, {calculateAge(candidate.dob)}
              </p>
              {candidate.location && (
                <p className="text-xs text-gray-400 truncate">{candidate.location}</p>
              )}
              {/* Compatibility badge */}
              {candidate.sharedInterests > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <Sparkles size={12} className="text-amber-500" />
                  <span className="text-[11px] text-amber-600 font-medium">
                    {candidate.sharedInterests} shared interest{candidate.sharedInterests > 1 ? 's' : ''}
                  </span>
                </div>
              )}
              {/* Boost badge */}
              {candidate.score >= 50 && candidate.sharedInterests === 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <Zap size={12} className="text-purple-500" />
                  <span className="text-[11px] text-purple-600 font-medium">Boosted profile</span>
                </div>
              )}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleSwipe(candidate.id, 'PASS')}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 rounded-lg py-2 flex items-center justify-center transition"
                >
                  <X size={16} className="text-gray-500" />
                </button>
                <button
                  onClick={() => handleSuperLike(candidate.id)}
                  className="flex-1 bg-blue-50 hover:bg-blue-100 rounded-lg py-2 flex items-center justify-center transition"
                  title="Super Like"
                >
                  <Star size={16} className="text-blue-500" fill="currentColor" />
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
                className="mt-2 flex items-center gap-1 text-[11px] text-gray-400 hover:text-primary mx-auto"
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

      {previewUserId && (
        <ProfilePreviewModal
          userId={previewUserId}
          onClose={() => setPreviewUserId(null)}
          onLike={(id) => { handleSwipe(id, 'LIKE'); setPreviewUserId(null); }}
          onPass={(id) => { handleSwipe(id, 'PASS'); setPreviewUserId(null); }}
        />
      )}

      {showTutorial && <OnboardingModal onClose={closeTutorial} />}
    </div>
  );
}