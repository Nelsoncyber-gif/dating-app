import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, Calendar, Mail, LogOut, ShieldCheck, X, Plus, Shield, Eye, EyeOff, Crown, Zap, Moon, Sun, Briefcase, GraduationCap, Heart, Upload, Trash2, Star, Camera } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import MediaViewer from '../components/media/MediaViewer';
import PostCard from '../components/timeline/PostCard';
import PostComposer from '../components/timeline/PostComposer';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: authUser, logout, refreshUser } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('photos');
  const [viewingMedia, setViewingMedia] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [interests, setInterests] = useState([]);
  const [newInterest, setNewInterest] = useState('');
  const [isIncognito, setIsIncognito] = useState(false);
  const [premiumSuccess, setPremiumSuccess] = useState(false);
  const [boosting, setBoosting] = useState(false);
  const [boostActive, setBoostActive] = useState(false);
  const [boostCooldown, setBoostCooldown] = useState(null);
  const [form, setForm] = useState({ occupation: '', education: '', zodiacSign: '', loveLanguage: '' });
  const [uploading, setUploading] = useState(false);
  const [photoMenuId, setPhotoMenuId] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  useEffect(() => {
    loadMyProfile();
    // Show premium success message if returning from Stripe
    if (searchParams.get('premium') === 'success') {
      refreshUser(); // Refresh global auth state to pick up isPremium
      setPremiumSuccess(true);
      setSearchParams({}, { replace: true });
      setTimeout(() => setPremiumSuccess(false), 5000);
    }
  }, []);

  async function loadMyProfile() {
    setLoading(true);
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
      setInterests(res.data.user.interests?.map(ui => ui.interest.name) || []);
      setIsIncognito(res.data.user.isIncognito || false);
      setForm({
        occupation: res.data.user.occupation || '',
        education: res.data.user.education || '',
        zodiacSign: res.data.user.zodiacSign || '',
        loveLanguage: res.data.user.loveLanguage || '',
      });

      // Check boost status
      const now = new Date();
      if (res.data.user.boostedUntil && new Date(res.data.user.boostedUntil) > now) {
        setBoostActive(true);
      }
    } catch (err) {
      console.error('Failed to load profile', err);
    } finally {
      setLoading(false);
    }
  }

  const handlePhotoClick = (photo, index) => {
    setViewingMedia({
      items: user.photos.map(p => ({ url: p.url, type: 'image' })),
      currentIndex: index
    });
  };

  function handleLogout() {
    logout();
    navigate('/login');
  }

  async function startVerification() {
    setVerifying(true);
    try {
      const res = await api.post('/verification/verify');
      if (res.data.url) {
        window.open(res.data.url, '_blank');
      }
    } catch (err) {
      console.error('Failed to start verification', err);
      alert('Could not start verification. Please try again.');
    } finally {
      setVerifying(false);
    }
  }

  async function addInterest() {
    if (!newInterest.trim()) return;
    try {
      await api.post('/profile/interests', { name: newInterest.trim() });
      setInterests(prev => [...prev, newInterest.trim()]);
      setNewInterest('');
    } catch (err) {
      console.error(err);
    }
  }

  async function removeInterest(name) {
    try {
      await api.delete(`/profile/interests/${encodeURIComponent(name)}`);
      setInterests(prev => prev.filter(i => i !== name));
    } catch (err) {
      console.error(err);
    }
  }

  async function toggleIncognito(checked) {
    setIsIncognito(checked);
    try {
      await api.patch('/profile', { isIncognito: checked });
    } catch (err) {
      setIsIncognito(!checked); // revert on failure
      console.error(err);
    }
  }

  async function toggleTheme() {
    const newTheme = user.theme === 'light' ? 'dark' : 'light';
    setUser(prev => ({ ...prev, theme: newTheme }));
    try {
      await api.patch('/profile', { theme: newTheme });
      refreshUser();
    } catch (err) {
      setUser(prev => ({ ...prev, theme: newTheme === 'dark' ? 'light' : 'dark' }));
      console.error(err);
    }
  }

  function updateField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
    api.patch('/profile', { [field]: value }).catch(err => console.error(err));
  }

  async function handleBoost() {
    setBoosting(true);
    try {
      const res = await api.post('/profile/boost');
      setBoostActive(true);
      setUser(prev => ({ ...prev, boostedUntil: res.data.boostedUntil }));
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to activate boost';
      if (msg.includes('hours')) {
        setBoostCooldown(msg);
      }
      alert(msg);
    } finally {
      setBoosting(false);
    }
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await api.post('/profile/photos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUser(prev => ({ ...prev, photos: [...(prev.photos || []), res.data.photo] }));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to upload photo');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleDeletePhoto(photoId) {
    try {
      await api.delete(`/profile/photos/${photoId}`);
      setUser(prev => ({ ...prev, photos: (prev.photos || []).filter(p => p.id !== photoId) }));
      setPhotoMenuId(null);
    } catch (err) {
      alert('Failed to delete photo');
    }
  }

  async function handleSetPrimary(photoId) {
    try {
      await api.patch(`/profile/photos/${photoId}/set-primary`);
      setUser(prev => ({
        ...prev,
        photos: (prev.photos || []).map(p => ({ ...p, isProfilePic: p.id === photoId })),
      }));
      setPhotoMenuId(null);
    } catch (err) {
      alert('Failed to set primary photo');
    }
  }

  async function loadPosts() {
    if (!authUser?.id) return;
    setLoadingPosts(true);
    try {
      const res = await api.get(`/posts/user/${authUser.id}`);
      setPosts(res.data.posts);
    } catch (err) {
      console.error('Failed to load posts', err);
    } finally {
      setLoadingPosts(false);
    }
  }

  function handlePostCreated(newPost) {
    setPosts(prev => [newPost, ...prev]);
  }

  function handlePostDeleted(postId) {
    setPosts(prev => prev.filter(p => p.id !== postId));
  }

  if (loading) return <div className="p-4 text-center text-gray-400 mt-12">Loading...</div>;
  if (!user) return <div className="p-4 text-center text-gray-400 mt-12">Profile not found</div>;

  const profilePhoto = user.photos?.find((p) => p.isProfilePic) || user.photos?.[0];

  return (
    <div className="p-4 pb-8 max-w-2xl mx-auto w-full">
      {/* Premium Success Banner */}
      {premiumSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 mb-4 flex items-center gap-2 text-sm animate-pulse">
          <Crown size={16} className="text-amber-500" />
          <span className="font-semibold">Premium activated! Welcome to Waplike Premium.</span>
          <button onClick={() => setPremiumSuccess(false)} className="ml-auto p-1">
            <X size={14} />
          </button>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
        <div className="flex items-center gap-2">
          {user.isVerified && (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <ShieldCheck size={14} /> Verified
            </span>
          )}
          <button onClick={handleLogout} className="text-gray-500 hover:text-gray-700 p-2" title="Log out">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Go Premium Card */}
      {!user.isPremium && (
        <button
          onClick={() => navigate('/premium')}
          className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-white rounded-xl p-3 flex items-center gap-3 transition mb-4 shadow-sm"
        >
          <Crown size={20} />
          <div className="text-left">
            <p className="text-sm font-bold">Go Premium</p>
            <p className="text-xs opacity-90">Unlimited swipes, see who liked you & more</p>
          </div>
        </button>
      )}

      {user.isPremium && (
        <div className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-white rounded-xl p-3 flex items-center gap-3 mb-4 shadow-sm">
          <Crown size={20} />
          <div className="text-left">
            <p className="text-sm font-bold">Premium Active</p>
            <p className="text-xs opacity-90">
              {user.premiumUntil ? `Valid until ${new Date(user.premiumUntil).toLocaleDateString()}` : 'Enjoy all premium features'}
            </p>
          </div>
        </div>
      )}

      {/* Safety Center Link */}
      <button
        onClick={() => navigate('/safety')}
        className="w-full bg-red-50 hover:bg-red-100 text-red-600 rounded-xl p-3 flex items-center gap-3 transition mb-4"
      >
        <Shield size={20} />
        <div className="text-left">
          <p className="text-sm font-semibold">Safety Center</p>
          <p className="text-xs opacity-70">Emergency contacts & date safety checks</p>
        </div>
      </button>

      {/* Profile Boost — Premium Only */}
      {user.isPremium && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${boostActive ? 'bg-purple-100' : 'bg-gray-100'}`}>
                <Zap size={20} className={boostActive ? 'text-purple-500' : 'text-gray-400'} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Profile Boost</p>
                <p className="text-xs text-gray-500">
                  {boostActive
                    ? 'Your profile is boosted right now! More people will see you.'
                    : boostCooldown || 'Get seen by more people for 30 minutes'}
                </p>
              </div>
            </div>
            {!boostActive && (
              <button
                onClick={handleBoost}
                disabled={boosting}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-2 rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition whitespace-nowrap"
              >
                {boosting ? '...' : 'Boost Now'}
              </button>
            )}
            {boostActive && (
              <span className="bg-purple-100 text-purple-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                Active
              </span>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <div className="flex flex-col items-center">
          <div className="w-32 h-32 rounded-full bg-primary/10 overflow-hidden mb-4">
            {profilePhoto ? (
              <img src={profilePhoto.url} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-primary text-4xl font-bold">{user.name[0]}</div>
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
          {user.location && (
            <div className="flex items-center gap-1 text-gray-500 mt-1">
              <MapPin size={14} /><span className="text-sm">{user.location}</span>
            </div>
          )}
          {!user.isEmailVerified && (
            <p className="text-xs text-amber-600 mt-2">Email not verified</p>
          )}
        </div>

        {/* Stripe Identity Verification */}
        {!user.isVerified && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            {user.verificationStatus === 'pending' ? (
              <div className="flex items-center justify-center gap-2 text-sm text-amber-600">
                <ShieldCheck size={16} />
                <span>Verification pending — check back soon</span>
              </div>
            ) : user.verificationStatus === 'rejected' ? (
              <div className="text-center">
                <p className="text-sm text-red-500 mb-2">Verification was rejected</p>
                <button
                  onClick={startVerification}
                  disabled={verifying}
                  className="bg-primary text-white text-sm font-medium rounded-lg px-4 py-2 w-full hover:bg-primary/90 disabled:opacity-50 transition"
                >
                  {verifying ? 'Starting...' : 'Try Again'}
                </button>
              </div>
            ) : (
              <button
                onClick={startVerification}
                disabled={verifying}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white text-sm font-medium rounded-lg px-4 py-2.5 hover:bg-primary/90 disabled:opacity-50 transition"
              >
                <ShieldCheck size={16} />
                {verifying ? 'Starting...' : 'Verify My Profile'}
              </button>
            )}
            <p className="text-[11px] text-gray-400 text-center mt-2">
              Verified by Stripe Identity — photo ID required
            </p>
          </div>
        )}
      </div>

      {/* Incognito Toggle */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isIncognito ? <EyeOff size={20} className="text-gray-500" /> : <Eye size={20} className="text-primary" />}
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Incognito Mode</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Only appear to people you've liked</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isIncognito}
              onChange={(e) => toggleIncognito(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
      </div>

      {/* Dark Mode Toggle */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {user.theme === 'dark' ? <Moon size={20} className="text-indigo-500" /> : <Sun size={20} className="text-amber-500" />}
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Dark Mode</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Switch between light and dark theme</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={user.theme === 'dark'}
              onChange={toggleTheme}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
          </label>
        </div>
      </div>

      <div className="flex border-b border-gray-100 mb-4">
        <button onClick={() => setActiveTab('photos')} className={`flex-1 py-3 text-sm font-medium transition ${activeTab === 'photos' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}>
          Photos ({user.photos?.length || 0})
        </button>
        <button onClick={() => { setActiveTab('posts'); if (posts.length === 0) loadPosts(); }} className={`flex-1 py-3 text-sm font-medium transition ${activeTab === 'posts' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}>
          Posts ({posts.length})
        </button>
        <button onClick={() => setActiveTab('about')} className={`flex-1 py-3 text-sm font-medium transition ${activeTab === 'about' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}>
          About
        </button>
      </div>

      {activeTab === 'photos' && (
        <div className="space-y-3">
          {/* Upload Button */}
          <label className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-gray-200 hover:border-primary rounded-xl py-6 cursor-pointer transition text-gray-400 hover:text-primary">
            {uploading ? (
              <span className="text-sm animate-pulse">Uploading...</span>
            ) : (
              <>
                <Camera size={20} />
                <span className="text-sm font-medium">Add a photo</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>

          {/* Photo Grid */}
          <div className="grid grid-cols-3 gap-2">
            {user.photos?.map((photo, index) => (
              <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group">
                <img
                  src={photo.url}
                  alt=""
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => handlePhotoClick(photo, index)}
                />
                {photo.isProfilePic && (
                  <span className="absolute top-1 left-1 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    Primary
                  </span>
                )}
                {/* Photo Actions Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  {!photo.isProfilePic && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSetPrimary(photo.id); }}
                      className="bg-white/90 hover:bg-white text-gray-700 p-1.5 rounded-full transition"
                      title="Set as primary"
                    >
                      <Star size={14} />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photo.id); }}
                    className="bg-white/90 hover:bg-red-100 text-red-500 p-1.5 rounded-full transition"
                    title="Delete photo"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {(!user.photos || user.photos.length === 0) && (
              <p className="col-span-3 text-center text-gray-400 text-sm py-8">No photos yet — upload your first one above!</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'about' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 space-y-4">
          {user.bio && <div><h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Bio</h3><p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{user.bio}</p></div>}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"><Calendar size={16} /><span>Joined {new Date(user.createdAt).toLocaleDateString()}</span></div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"><Mail size={16} /><span>{user.gender ? user.gender.toLowerCase() : 'Not specified'}</span></div>

          {/* Advanced Profile Fields */}
          <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">About You</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-1"><Briefcase size={12} /> Occupation</label>
                <input type="text" value={form.occupation} onChange={(e) => updateField('occupation', e.target.value)} placeholder="e.g. Designer" className="border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-1"><GraduationCap size={12} /> Education</label>
                <input type="text" value={form.education} onChange={(e) => updateField('education', e.target.value)} placeholder="e.g. University" className="border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Zodiac Sign</label>
                <select value={form.zodiacSign} onChange={(e) => updateField('zodiacSign', e.target.value)} className="border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm w-full">
                  <option value="">Select...</option>
                  {['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-1"><Heart size={12} /> Love Language</label>
                <select value={form.loveLanguage} onChange={(e) => updateField('loveLanguage', e.target.value)} className="border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm w-full">
                  <option value="">Select...</option>
                  {['Words of Affirmation','Acts of Service','Receiving Gifts','Quality Time','Physical Touch'].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Interests Section */}
          <div className="border-t border-gray-100 pt-4">
            <label className="text-sm font-semibold text-gray-900 block mb-2">Interests ({interests.length}/5)</label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addInterest()}
                placeholder="e.g. Hiking, Coffee, Music"
                disabled={interests.length >= 5}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary disabled:opacity-50"
              />
              <button type="button" onClick={addInterest} disabled={interests.length >= 5 || !newInterest.trim()} className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 px-3 rounded-lg transition">
                <Plus size={16} className="text-gray-600" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {interests.map((name, idx) => (
                <span key={idx} className="bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                  {name}
                  <button onClick={() => removeInterest(name)} className="hover:text-red-500 transition">
                    <X size={12} />
                  </button>
                </span>
              ))}
              {interests.length === 0 && <p className="text-xs text-gray-400">No interests yet. Add some above!</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'posts' && (
        <div className="space-y-3">
          <PostComposer currentUser={user} onPostCreated={handlePostCreated} />
          {loadingPosts && <p className="text-center text-gray-400 text-sm py-4">Loading posts...</p>}
          {!loadingPosts && posts.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">No posts yet. Share something!</p>
          )}
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={user.id}
              onDelete={handlePostDeleted}
            />
          ))}
        </div>
      )}

      {viewingMedia && (
        <MediaViewer items={viewingMedia.items} currentIndex={viewingMedia.currentIndex} onClose={() => setViewingMedia(null)} />
      )}
    </div>
  );
}
