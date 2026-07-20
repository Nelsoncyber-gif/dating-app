import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Users } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function CommunityDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [community, setCommunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCommunity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadCommunity() {
    setLoading(true);
    try {
      const res = await api.get(`/communities/${id}`);
      setCommunity(res.data.community);
    } catch (err) {
      console.error('Failed to load community', err);
    } finally {
      setLoading(false);
    }
  }

  const isMember = community?.members.some((m) => m.userId === user?.id);

  async function handleJoin() {
    setActionLoading(true);
    setError('');
    try {
      await api.post(`/communities/${id}/join`);
      setCommunity((prev) => ({
        ...prev,
        members: [...prev.members, { userId: user.id, user }],
      }));
    } catch (err) {
      setError(err.response?.data?.error || 'Could not join. Please try again.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleLeave() {
    setActionLoading(true);
    setError('');
    try {
      await api.post(`/communities/${id}/leave`);
      setCommunity((prev) => ({
        ...prev,
        members: prev.members.filter((m) => m.userId !== user.id),
      }));
    } catch (err) {
      setError(err.response?.data?.error || 'Could not leave. Please try again.');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return <p className="text-center text-gray-400 text-sm mt-16">Loading group…</p>;
  }

  if (!community) {
    return <p className="text-center text-gray-400 text-sm mt-16">Group not found.</p>;
  }

  return (
    <div className="pt-3">
      <div className="flex items-center gap-3 px-4 mb-4">
        <button onClick={() => navigate('/communities')} className="text-gray-500">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-gray-900 truncate">{community.name}</h1>
      </div>

      <div className="px-4">
        <div className="bg-white rounded-xl shadow-sm p-4 mb-3">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold shrink-0">
              {community.name[0]}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{community.name}</p>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Users size={12} /> {community.members.length} member
                {community.members.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {community.description && (
            <p className="text-sm text-gray-600 mt-2">{community.description}</p>
          )}

          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}

          <button
            onClick={isMember ? handleLeave : handleJoin}
            disabled={actionLoading}
            className={`w-full mt-3 rounded-lg py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
              isMember
                ? 'border border-red-200 text-red-500 hover:bg-red-50'
                : 'bg-primary text-white'
            }`}
          >
            {actionLoading ? 'Please wait…' : isMember ? 'Leave Group' : 'Join Group'}
          </button>

          {isMember && community.conversationId && (
            <button
              onClick={() => navigate(`/chats/${community.conversationId}`)}
              className="w-full mt-2 rounded-lg py-2.5 text-sm font-semibold bg-primary/10 text-primary flex items-center justify-center gap-1.5"
            >
              <MessageCircle size={16} /> Open Group Chat
            </button>
          )}
        </div>

        <h2 className="text-sm font-semibold text-gray-700 mb-2 px-1">Members</h2>
        <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
          {community.members.map((member) => (
            <div key={member.userId} className="flex items-center gap-3 px-3 py-2.5">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                {member.user.name[0]}
              </div>
              <p className="text-sm text-gray-800">{member.user.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
