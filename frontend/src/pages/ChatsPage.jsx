import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import ConversationListItem from '../components/chat/ConversationListItem';

export default function ChatsPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

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
      const res = await api.get('/conversations');
      setConversations(res.data.conversations);
    } catch (err) {
      console.error('Failed to load conversations', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pt-3">
      <h1 className="text-xl font-bold text-gray-900 px-4 mb-2">Chats</h1>

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
