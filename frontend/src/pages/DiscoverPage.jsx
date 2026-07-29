import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ShieldAlert, X, Sparkles, Star, Zap, RotateCcw, Filter, Crown, Calendar, Gem } from 'lucide-react';
import api from '../api/client';
import ReportBlockModal from '../components/safety/ReportBlockModal';
import ProfilePreviewModal from '../components/profile/ProfilePreviewModal';
import OnboardingModal from '../components/onboarding/OnboardingModal';
import SwipeCard from '../components/discover/SwipeCard';

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
  const [dailyPick, setDailyPick] = useState(null);

  useEffect(() => {
    loadCandidates();
    loadDailyPick();
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

  async function loadDailyPick() {
    try {
      const res = await api.get('/discover/daily-pick');
      setDailyPick(res.data.dailyPick);
    } catch (err) {
      console.error('Failed to load daily pick', err);
    }
  }

  async function handleDailyPickLike() {
    if (!dailyPick) return;
    try {
      const res = await api.post('/swipe', { swipedId: dailyPick.id, direction: 'LIKE', isSuperLike: true });
      if (res.data.matched) {
        setMatchPopup(dailyPick);
      }
      setDailyPick(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to like daily pick');
    }
  }

  async function handleSwipe(direction) {
    const candidate = candidates[0];
    if (!candidate) return;

    setLastSwiped({ id: candidate.id, direction });
    setCandidates((prev) => prev.slice(1));

    try {
      const res = await api.post('/swipe', { swipedId: candidate.id, direction });
      if (res.data.matched) {
        setMatchPopup(candidate);
      }
    } catch (err) {
      console.error('Swipe failed', err);
      if (err.response?.status === 403) {
        alert(err.response.data.error);
      }
    }
  }

  async function handleSuperLike() {
    const candidate = candidates[0];
    if (!candidate) return;

    setCandidates((prev) => prev.slice(1));
    try {
      const res = await api.post('/swipe', { swipedId: candidate.id, direction: 'LIKE', isSuperLike: true });
      if (res.data.matched) {
        setMatchPopup(candidate);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Super like failed');
      loadCandidates();
    }
  }

  async function handleRewind() {
    if (!lastSwiped) return;
    try {
      await api.post('/swipe/undo');
      loadCandidates();
      setLastSwiped(null);
    } catch (err) {
      alert('Rewind failed');
    }
  }

  function handleReportBlock() {
    const candidate = candidates[0];
    if (candidate) setSafetyTarget(candidate);
  }

  return (
    <div className="flex flex-col h-full max-w-md mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 shrink-0">
        <button onClick={() => setShowFilters(true)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition" title="Filters">
          <Filter size={18} className="text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Discover</h1>
        <div className="flex gap-1.5">
          <button onClick={() => navigate('/likes')} className="p-2 bg-primary/10 hover:bg-primary/20 rounded-full transition" title="Who Liked You">
            <Heart size={16} className="text-primary" />
          </button>
          <button onClick={() => navigate('/events')} className="p-2 bg-green-100 hover:bg-green-200 rounded-full transition" title="Events">
            <Calendar size={16} className="text-green-600" />
          </button>
          <button onClick={() => navigate('/premium')} className="p-2 bg-amber-100 hover:bg-amber-200 rounded-full transition" title="Go Premium">
            <Crown size={16} className="text-amber-500" />
          </button>
          {lastSwiped && (
            <button onClick={handleRewind} className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full transition" title="Rewind">
              <RotateCcw size={16} />
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

      {/* Daily Pick Section */}
      {dailyPick && (
        <div className="px-3 pt-2 pb-1 shrink-0">
          <div className="relative rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-yellow-50 overflow-hidden shadow-sm">
            <div className="absolute top-2 left-2 bg-amber-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 z-10">
              <Gem size={10} /> Today's Pick
            </div>
            <div
              className="flex items-center gap-3 p-3 pt-8 cursor-pointer"
              onClick={() => setPreviewUserId(dailyPick.id)}
            >
              <div className="w-16 h-20 rounded-xl overflow-hidden shrink-0 bg-gray-200">
                {dailyPick.photos?.[0]?.url ? (
                  <img src={dailyPick.photos[0].url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg font-bold">
                    {dailyPick.name?.[0] || '?'}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">
                  {dailyPick.name}, {Math.floor((Date.now() - new Date(dailyPick.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25))}
                </p>
                {dailyPick.bio && (
                  <p className="text-xs text-gray-600 truncate mt-0.5">{dailyPick.bio}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                    {dailyPick.compatibility}% match
                  </span>
                  {dailyPick.sharedInterests > 0 && (
                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                      {dailyPick.sharedInterests} shared interests
                    </span>
                  )}
                  {dailyPick.distance != null && (
                    <span className="text-[10px] text-gray-400">
                      {dailyPick.distance} km
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDailyPickLike();
                }}
                className="p-2.5 bg-green-100 hover:bg-green-200 rounded-full transition shrink-0"
              >
                <Heart size={18} className="text-green-600" fill="currentColor" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card Stack Area */}
      <div className="flex-1 relative px-3 pb-2 min-h-0">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full max-w-sm aspect-[3/4] rounded-2xl bg-gray-100 animate-pulse" />
          </div>
        )}

        {!loading && candidates.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-400 px-6">
              <Sparkles className="mx-auto mb-3" size={40} />
              <p className="text-lg font-medium mb-1">No new profiles right now</p>
              <p className="text-sm">Check back soon, or invite friends to join!</p>
            </div>
          </div>
        )}

        {!loading && candidates.length > 0 && (
          <div className="relative w-full h-full">
            {/* Background cards (stacked effect) */}
            {candidates.slice(1, 3).reverse().map((candidate, i) => (
              <SwipeCard
                key={candidate.id}
                candidate={candidate}
                isTop={false}
                onSwipe={() => {}}
                onSuperLike={() => {}}
                onInfo={() => {}}
              />
            ))}

            {/* Top swipeable card */}
            <SwipeCard
              key={candidates[0].id}
              candidate={candidates[0]}
              isTop={true}
              onSwipe={handleSwipe}
              onSuperLike={handleSuperLike}
              onInfo={() => setPreviewUserId(candidates[0].id)}
            />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {candidates.length > 0 && (
        <div className="flex items-center justify-center gap-5 px-4 py-4 shrink-0">
          <button
            onClick={handleReportBlock}
            className="p-3 bg-gray-100 hover:bg-red-100 rounded-full transition group"
            title="Report / Block"
          >
            <ShieldAlert size={20} className="text-gray-500 group-hover:text-red-500" />
          </button>
          <button
            onClick={() => handleSwipe('PASS')}
            className="p-4 bg-white hover:bg-red-50 border-2 border-red-200 hover:border-red-400 rounded-full shadow-sm transition"
            title="Pass"
          >
            <X size={28} className="text-red-500" />
          </button>
          <button
            onClick={handleSuperLike}
            className="p-3 bg-white hover:bg-blue-50 border-2 border-blue-200 hover:border-blue-400 rounded-full shadow-sm transition"
            title="Super Like"
          >
            <Star size={24} className="text-blue-500" fill="currentColor" />
          </button>
          <button
            onClick={() => handleSwipe('LIKE')}
            className="p-4 bg-white hover:bg-green-50 border-2 border-green-200 hover:border-green-400 rounded-full shadow-sm transition"
            title="Like"
          >
            <Heart size={28} className="text-green-500" fill="currentColor" />
          </button>
          {lastSwiped && (
            <button
              onClick={handleRewind}
              className="p-3 bg-white hover:bg-yellow-50 border-2 border-yellow-200 hover:border-yellow-400 rounded-full shadow-sm transition"
              title="Rewind"
            >
              <RotateCcw size={20} className="text-yellow-600" />
            </button>
          )}
        </div>
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

      {/* Safety Modal */}
      {safetyTarget && (
        <ReportBlockModal
          targetUserId={safetyTarget.id}
          targetUserName={safetyTarget.name}
          onClose={() => setSafetyTarget(null)}
          onBlocked={() => setSafetyTarget(null)}
        />
      )}

      {/* Profile Preview Modal */}
      {previewUserId && (
        <ProfilePreviewModal
          userId={previewUserId}
          onClose={() => setPreviewUserId(null)}
          onLike={(id) => { handleSwipe('LIKE'); setPreviewUserId(null); }}
          onPass={(id) => { handleSwipe('PASS'); setPreviewUserId(null); }}
        />
      )}

      {/* Onboarding Tutorial */}
      {showTutorial && <OnboardingModal onClose={closeTutorial} />}
    </div>
  );
}
