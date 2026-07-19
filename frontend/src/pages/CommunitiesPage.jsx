import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
import api from '../api/client';
import CreateCommunityModal from '../components/communities/CreateCommunityModal';

export default function CommunitiesPage() {
  const navigate = useNavigate();
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadCommunities();
  }, []);

  async function loadCommunities() {
    setLoading(true);
    try {
      const res = await api.get('/communities');
      setCommunities(res.data.communities);
    } catch (err) {
      console.error('Failed to load communities', err);
    } finally {
      setLoading(false);
    }
  }

  function handleCreated(newCommunity) {
    setCommunities((prev) => [{ ...newCommunity, _count: { members: 1 } }, ...prev]);
    setShowCreateModal(false);
    navigate(`/communities/${newCommunity.id}`);
  }

  return (
    <div className="pt-3">
      <div className="flex items-center justify-between px-4 mb-2">
        <h1 className="text-xl font-bold text-gray-900">Groups</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1 bg-primary text-white text-xs font-semibold rounded-full px-3 py-1.5"
        >
          <Plus size={14} /> New
        </button>
      </div>

      {loading && <p className="text-center text-gray-400 text-sm mt-8">Loading groups…</p>}

      {!loading && communities.length === 0 && (
        <div className="text-center mt-16 text-gray-400 px-4">
          <Users className="mx-auto mb-2" size={32} />
          <p className="text-sm">No groups yet.</p>
          <p className="text-xs mt-1">Create one and invite people who share your interests!</p>
        </div>
      )}

      <div className="px-4 flex flex-col gap-2 mt-1">
        {communities.map((community) => (
          <button
            key={community.id}
            onClick={() => navigate(`/communities/${community.id}`)}
            className="bg-white rounded-xl shadow-sm p-3 text-left flex items-center gap-3 hover:bg-gray-50 transition"
          >
            <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
              {community.name[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{community.name}</p>
              <p className="text-xs text-gray-400 truncate">
                {community._count.members} member{community._count.members !== 1 ? 's' : ''}
              </p>
            </div>
          </button>
        ))}
      </div>

      {showCreateModal && (
        <CreateCommunityModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
