import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Mail } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import ReportBlockModal from '../components/safety/ReportBlockModal';
import MediaViewer from '../components/media/MediaViewer';
import PostCard from '../components/timeline/PostCard';

export default function UserProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('photos');
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [viewingMedia, setViewingMedia] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, [userId]);

  async function loadUserProfile() {
    setLoading(true);
    try {
      const res = await api.get(`/profile/${userId}`);
      setUser(res.data.user);
    } catch (err) {
      console.error('Failed to load user profile', err);
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

  async function loadPosts() {
    setLoadingPosts(true);
    try {
      const res = await api.get(`/posts/user/${userId}`);
      setPosts(res.data.posts);
    } catch (err) {
      console.error('Failed to load posts', err);
    } finally {
      setLoadingPosts(false);
    }
  }

  function handlePostDeleted(postId) {
    setPosts(prev => prev.filter(p => p.id !== postId));
  }

  if (loading) return <div className="p-4 text-center text-gray-400 mt-12">Loading...</div>;
  if (!user) return <div className="p-4 text-center text-gray-400 mt-12">User not found</div>;

  const profilePhoto = user.photos?.find((p) => p.isProfilePic) || user.photos?.[0];

  return (
    <div className="p-4 pb-8">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700"><ArrowLeft size={20} /></button>
        <h1 className="text-xl font-bold text-gray-900">Profile</h1>
      </div>

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
        </div>
        <button onClick={() => setShowSafetyModal(true)} className="w-full mt-4 flex items-center justify-center gap-2 text-gray-600 text-sm font-medium border border-gray-200 rounded-lg px-4 py-2 hover:bg-gray-50 transition">
          Report or block this account
        </button>
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
        <div className="grid grid-cols-3 gap-2">
          {user.photos?.map((photo, index) => (
            <div key={photo.id} onClick={() => handlePhotoClick(photo, index)} className="aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer hover:opacity-90 transition">
              <img src={photo.url} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
          {(!user.photos || user.photos.length === 0) && <p className="col-span-3 text-center text-gray-400 text-sm py-8">No photos yet</p>}
        </div>
      )}

      {activeTab === 'posts' && (
        <div className="space-y-3">
          {loadingPosts && <p className="text-center text-gray-400 text-sm py-4">Loading posts...</p>}
          {!loadingPosts && posts.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">No posts yet</p>
          )}
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUser?.id}
              onDelete={handlePostDeleted}
            />
          ))}
        </div>
      )}

      {activeTab === 'about' && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
          {user.bio && <div><h3 className="text-sm font-semibold text-gray-900 mb-2">Bio</h3><p className="text-sm text-gray-600 whitespace-pre-wrap">{user.bio}</p></div>}
          <div className="flex items-center gap-2 text-sm text-gray-600"><Calendar size={16} /><span>Joined {new Date(user.createdAt).toLocaleDateString()}</span></div>
          <div className="flex items-center gap-2 text-sm text-gray-600"><Mail size={16} /><span>{user.gender ? user.gender.toLowerCase() : 'Not specified'}</span></div>
        </div>
      )}

      {showSafetyModal && (
        <ReportBlockModal targetUserId={userId} targetUserName={user.name} onClose={() => setShowSafetyModal(false)} onBlocked={() => navigate('/discover')} />
      )}

      {viewingMedia && (
        <MediaViewer items={viewingMedia.items} currentIndex={viewingMedia.currentIndex} onClose={() => setViewingMedia(null)} />
      )}
    </div>
  );
}