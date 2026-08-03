import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ShieldAlert, X, Sparkles, Star, RotateCcw, Filter, Crown, Calendar, Gem, Search, MapPin, User, Info } from 'lucide-react';
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
  const [dailyPick, setDailyPick] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

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

  async function handleGridLike(candidateId) {
    try {
      const res = await api.post('/swipe', { swipedId: candidateId, direction: 'LIKE' });
      if (res.data.matched) {
        const matchedUser = candidates.find((c) => c.id === candidateId);
        setMatchPopup(matchedUser || { name: 'Someone' });
      }
      setCandidates((prev) => prev.filter((c) => c.id !== candidateId));
    } catch (err) {
      if (err.response?.status === 403) {
        alert(err.response.data.error);
      } else {
        alert(err.response?.data?.error || 'Failed to like');
      }
    }
  }

  async function handleGridPass(candidateId) {
    try {
      await api.post('/swipe', { swipedId: candidateId, direction: 'PASS' });
      setCandidates((prev) => prev.filter((c) => c.id !== candidateId));
    } catch (err) {
      console.error('Failed to pass', err);
    }
  }

  async function handleGridSuperLike(candidateId) {
    try {
      const res = await api.post('/swipe', { swipedId: candidateId, direction: 'LIKE', isSuperLike: true });
      if (res.data.matched) {
        const matchedUser = candidates.find((c) => c.id === candidateId);
        setMatchPopup(matchedUser || { name: 'Someone' });
      }
      setCandidates((prev) => prev.filter((c) => c.id !== candidateId));
    } catch (err) {
      alert(err.response?.data?.error || 'Super like failed');
    }
  }

  function handleReportBlock(candidateId) {
    const candidate = candidates.find((c) => c.id === candidateId);
    if (candidate) setSafetyTarget(candidate);
  }

  async function handleSearch(query) {
    setSearchQuery(query);
    if (query.trim().length < 1) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await api.get(`/discover/search?q=${encodeURIComponent(query)}`);
      setSearchResults(res.data.results);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleSearchLike(swipedId) {
    try {
      const res = await api.post('/swipe', { swipedId, direction: 'LIKE' });
      if (res.data.matched) {
        const matchedUser = searchResults.find((u) => u.id === swipedId);
        setMatchPopup(matchedUser || { name: 'Someone' });
      }
      setSearchResults((prev) => prev.filter((u) => u.id !== swipedId));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to like user');
    }
  }

  async function handleSearchPass(swipedId) {
    try {
      await api.post('/swipe', { swipedId, direction: 'PASS' });
      setSearchResults((prev) => prev.filter((u) => u.id !== swipedId));
    } catch (err) {
      console.error('Failed to pass', err);
    }
  }

  return (
    <div className="flex flex-col h-full max-w-lg mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 shrink-0">
        <div className="flex gap-1.5">
          <button onClick={() => setShowFilters(true)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition" title="Filters">
            <Filter size={18} className="text-gray-600" />
          </button>
          <button onClick={() => setShowSearch(true)} className="p-2 bg-blue-100 hover:bg-blue-200 rounded-full transition" title="Search Users">
            <Search size={18} className="text-blue-600" />
          </button>
        </div>
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

      {/* Profile Grid */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {loading && (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-gray-100 animate-pulse aspect-[3/4]" />
            ))}
          </div>
        )}

        {!loading && candidates.length === 0 && (
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center text-gray-400 px-6">
              <Sparkles className="mx-auto mb-3" size={40} />
              <p className="text-lg font-medium mb-1">No new profiles right now</p>
              <p className="text-sm">Check back soon, or invite friends to join!</p>
            </div>
          </div>
        )}

        {!loading && candidates.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {candidates.map((candidate) => {
              const photo = candidate.photos?.find((p) => p.isProfilePic) || candidate.photos?.[0];
              const age = Math.floor((Date.now() - new Date(candidate.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
              return (
                <div key={candidate.id} className="bg-white rounded-2xl shadow-sm overflow-hidden group">
                  {/* Photo */}
                  <div
                    className="relative aspect-[3/4] bg-gray-100 cursor-pointer"
                    onClick={() => setPreviewUserId(candidate.id)}
                  >
                    {photo?.url ? (
                      <img src={photo.url} alt={candidate.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl font-bold">
                        {candidate.name?.[0] || '?'}
                      </div>
                    )}
                    {/* Compatibility badge */}
                    {candidate.compatibility > 0 && (
                      <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1">
                        <Sparkles size={10} className="text-amber-300" />
                        <span className="text-white text-[10px] font-bold">{candidate.compatibility}%</span>
                      </div>
                    )}
                    {/* Info button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setPreviewUserId(candidate.id); }}
                      className="absolute top-2 right-2 bg-black/30 hover:bg-black/50 rounded-full p-1 transition opacity-0 group-hover:opacity-100"
                    >
                      <Info size={14} className="text-white" />
                    </button>
                    {/* Gradient at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                    {/* Name + age overlay */}
                    <div className="absolute bottom-1.5 left-2 right-2 pointer-events-none">
                      <p className="text-white font-bold text-sm truncate">{candidate.name}, {age}</p>
                      {candidate.distance != null && (
                        <p className="text-white/70 text-[10px] flex items-center gap-0.5">
                          <MapPin size={8} /> {candidate.distance} km
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-center gap-1.5 py-2 px-2">
                    <button
                      onClick={() => handleReportBlock(candidate.id)}
                      className="p-1.5 hover:bg-red-50 rounded-full transition"
                      title="Report / Block"
                    >
                      <ShieldAlert size={14} className="text-gray-400 hover:text-red-400" />
                    </button>
                    <button
                      onClick={() => handleGridPass(candidate.id)}
                      className="p-2 bg-white hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-full transition"
                      title="Pass"
                    >
                      <X size={18} className="text-red-400" />
                    </button>
                    <button
                      onClick={() => handleGridSuperLike(candidate.id)}
                      className="p-1.5 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-full transition"
                      title="Super Like"
                    >
                      <Star size={14} className="text-blue-500" fill="currentColor" />
                    </button>
                    <button
                      onClick={() => handleGridLike(candidate.id)}
                      className="p-2 bg-white hover:bg-green-50 border border-gray-200 hover:border-green-300 rounded-full transition"
                      title="Like"
                    >
                      <Heart size={18} className="text-green-500" fill="currentColor" />
                    </button>
                    {lastSwiped?.id === candidate.id && (
                      <button
                        onClick={() => handleRewind()}
                        className="p-1.5 hover:bg-yellow-50 rounded-full transition"
                        title="Rewind"
                      >
                        <RotateCcw size={14} className="text-yellow-600" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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

      {/* Profile Preview Modal — view-only, use grid buttons to like/pass */}
      {previewUserId && (
        <ProfilePreviewModal
          userId={previewUserId}
          onClose={() => setPreviewUserId(null)}
        />
      )}

      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm max-h-[85vh] flex flex-col">
            {/* Search Header */}
            <div className="flex items-center gap-2 p-4 border-b border-gray-100 shrink-0">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  autoFocus
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <button onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }} className="p-2 text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto p-3">
              {searchLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {!searchLoading && searchQuery.trim() && searchResults.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <User className="mx-auto mb-2" size={28} />
                  <p className="text-sm">No users found</p>
                  <p className="text-xs mt-1">Try a different name</p>
                </div>
              )}

              {!searchLoading && searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((result) => {
                    const photo = result.photos?.find((p) => p.isProfilePic) || result.photos?.[0];
                    return (
                      <div key={result.id} className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                        <div
                          className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden shrink-0 cursor-pointer"
                          onClick={() => setPreviewUserId(result.id)}
                        >
                          {photo ? (
                            <img src={photo.url} alt={result.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-lg">
                              {result.name?.[0] || '?'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setPreviewUserId(result.id)}>
                          <p className="font-semibold text-sm text-gray-900 truncate">{result.name}</p>
                          {result.location && (
                            <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
                              <MapPin size={10} /> {result.location}
                            </p>
                          )}
                          {result.bio && (
                            <p className="text-xs text-gray-500 truncate mt-0.5">{result.bio}</p>
                          )}
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => handleSearchPass(result.id)}
                            className="p-2 bg-white hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-full transition"
                            title="Pass"
                          >
                            <X size={16} className="text-red-400" />
                          </button>
                          <button
                            onClick={() => handleSearchLike(result.id)}
                            className="p-2 bg-white hover:bg-green-50 border border-gray-200 hover:border-green-300 rounded-full transition"
                            title="Like"
                          >
                            <Heart size={16} className="text-green-500" fill="currentColor" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!searchLoading && !searchQuery.trim() && (
                <div className="text-center py-8 text-gray-400">
                  <Search className="mx-auto mb-2" size={28} />
                  <p className="text-sm">Type a name to search</p>
                  <p className="text-xs mt-1">Find and like users directly</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Tutorial */}
      {showTutorial && <OnboardingModal onClose={closeTutorial} />}
    </div>
  );
}
