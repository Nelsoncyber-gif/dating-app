import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Heart, Clock, Phone, Crown } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import ConversationListItem from '../components/chat/ConversationListItem';

export default function ChatsPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matchCount, setMatchCount] = useState(0);

  useEffect(() => {
    loadConversations();
  }, []);

  // Bump a conversation to the top with the new message preview whenever anything arrives,
  // even if the user isn't currently inside that specific chat room.
  useEffect(() => {
    if (!socket) return;

    function handleNewMessage(message) {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === message.conversationId);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = { ...updated[idx], messages: [message] };
        const [moved] = updated.splice(idx, 1);
        return [moved, ...updated];
      });
    }

    socket.on('new_message', handleNewMessage);
    return () => socket.off('new_message', handleNewMessage);
  }, [socket]);

  async function loadConversations() {
    setLoading(true);
    try {
      const [convRes, matchRes] = await Promise.all([
        api.get('/conversations'),
        api.get('/social/matches'),
      ]);
      setConversations(convRes.data.conversations);
      setMatchCount(matchRes.data.matches.length);
    } catch (err) {
      console.error('Failed to load conversations', err);
    } finally {
      setLoading(false);
    }
  }

  return (
   <div className="pt-3 max-w-3xl mx-auto w-full">
      <h1 className="text-xl font-bold text-gray-900 px-4 mb-2">Chats</h1>

      {/* Quick-access links to Matches, Pending Likes, and Call History */}
      <div className="flex gap-2 px-4 mb-3">
        <button
          onClick={() => navigate('/matches')}
          className="flex-1 bg-primary/10 text-primary rounded-xl py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold hover:bg-primary/20 transition"
        >
          <Heart size={16} fill="currentColor" />
          Matches{matchCount > 0 ? ` (${matchCount})` : ''}
        </button>
        <button
          onClick={() => navigate('/pending')}
          className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold hover:bg-gray-200 transition"
        >
          <Clock size={16} />
          Pending
        </button>
        <button
          onClick={() => navigate('/calls')}
          className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold hover:bg-gray-200 transition"
        >
          <Phone size={16} />
          Calls
        </button>
      </div>

      {/* Go Premium Banner */}
      {!user?.isPremium && (
        <button
          onClick={() => navigate('/premium')}
          className="mx-4 mb-3 w-auto bg-gradient-to-r from-amber-100 to-yellow-100 hover:from-amber-200 hover:to-yellow-200 rounded-xl p-2.5 flex items-center gap-2 transition"
        >
          <Crown size={16} className="text-amber-500 flex-shrink-0" />
          <span className="text-xs font-semibold text-amber-700">Go Premium — unlimited swipes & more</span>
        </button>
      )}

      {loading && <p className="text-center text-gray-400 text-sm mt-8">Loading chats…</p>}

      {!loading && conversations.length === 0 && (
        <div className="text-center mt-16 text-gray-400 px-4">
          <MessageCircle className="mx-auto mb-2" size={32} />
          <p className="text-sm">No conversations yet.</p>
          <p className="text-xs mt-1">Match with someone on Discover to start chatting!</p>
        </div>
      )}

      <div className="divide-y divide-gray-100">
        {conversations.map((conv) => (
          <ConversationListItem key={conv.id} conversation={conv} currentUserId={user?.id} />
        ))}
      </div>
    </div>
  );
}
