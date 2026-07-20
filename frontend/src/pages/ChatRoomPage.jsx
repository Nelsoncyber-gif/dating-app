import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, Phone, Send, Smile, Video } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useCall } from '../context/CallContext';
import ReportBlockModal from '../components/safety/ReportBlockModal';
import EmojiPicker from '../components/chat/EmojiPicker';

export default function ChatRoomPage() {
  const { id: conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();
  const { startCall, callState } = useCall();

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherTyping, setOtherTyping] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    loadConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    if (!socket) return;

    // Make sure we're subscribed to this room even if the socket connected
    // before this conversation existed (e.g. a brand-new match).
    socket.emit('join_conversation', conversationId);

    function handleNewMessage(message) {
      if (message.conversationId !== conversationId) return;
      setMessages((prev) => [...prev, message]);
      setOtherTyping(false);
    }

    function handleTyping({ userId, conversationId: convId }) {
      if (convId === conversationId && userId !== user?.id) {
        setOtherTyping(true);
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setOtherTyping(false), 2000);
      }
    }

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleTyping);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleTyping);
    };
  }, [socket, conversationId, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherTyping]);

  async function loadConversation() {
    setLoading(true);
    try {
      const [conversationsRes, messagesRes] = await Promise.all([
        api.get('/conversations'),
        api.get(`/conversations/${conversationId}/messages`),
      ]);
      const conv = conversationsRes.data.conversations.find((c) => c.id === conversationId);
      setConversation(conv || null);
      setMessages(messagesRes.data.messages);
    } catch (err) {
      console.error('Failed to load conversation', err);
    } finally {
      setLoading(false);
    }
  }

  function handleTypingInput(value) {
    setText(value);
    socket?.emit('typing', { conversationId });
  }

  function handleSend(e) {
    e.preventDefault();
    if (!text.trim() || !socket) return;

    socket.emit('send_message', { conversationId, content: text.trim() }, (res) => {
      if (res?.error) console.error(res.error);
    });
    setText('');
  }

  function sendRawContent(content) {
    if (!socket) return;
    socket.emit('send_message', { conversationId, content }, (res) => {
      if (res?.error) console.error(res.error);
    });
  }

  function handleSelectEmoji(emoji) {
    setText((prev) => prev + emoji);
  }

  function handleSelectSticker(sticker) {
    // Stickers send immediately as their own message, rather than being typed
    sendRawContent(sticker);
    setShowEmojiPicker(false);
  }

  function handleBackspace() {
    setText((prev) => {
      // Remove the last "character" the way a person perceives it - emoji can be
      // multiple UTF-16 code units, so use Array.from to split by actual glyph.
      const chars = Array.from(prev);
      chars.pop();
      return chars.join('');
    });
  }

  const otherParticipant = conversation?.participants.find((p) => p.user.id !== user?.id)?.user;
  const displayName = conversation?.isGroup ? conversation.name : otherParticipant?.name;
  const avatarUrl = conversation?.isGroup ? null : otherParticipant?.photos?.[0]?.url;

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center gap-3 px-3 py-3 border-b border-gray-100 shrink-0">
        <button onClick={() => navigate('/chats')} className="text-gray-500">
          <ArrowLeft size={20} />
        </button>
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            displayName?.[0] || '?'
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">{displayName || 'Loading…'}</p>
          {otherTyping && <p className="text-xs text-primary">typing…</p>}
        </div>

        {!conversation?.isGroup && otherParticipant && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => startCall(conversationId, otherParticipant.id, 'audio')}
              disabled={callState !== 'idle'}
              className="text-gray-500 p-2 disabled:opacity-40"
              title="Voice call"
            >
              <Phone size={18} />
            </button>
            <button
              onClick={() => startCall(conversationId, otherParticipant.id, 'video')}
              disabled={callState !== 'idle'}
              className="text-gray-500 p-2 disabled:opacity-40"
              title="Video call"
            >
              <Video size={18} />
            </button>
            <button
              onClick={() => setShowSafetyModal(true)}
              className="text-gray-500 p-2"
              title="More options"
            >
              <MoreVertical size={18} />
            </button>
          </div>
        )}
      </div>

      {showSafetyModal && otherParticipant && (
        <ReportBlockModal
          targetUserId={otherParticipant.id}
          targetUserName={otherParticipant.name}
          onClose={() => setShowSafetyModal(false)}
          onBlocked={() => navigate('/chats')}
        />
      )}

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {loading && <p className="text-center text-gray-400 text-sm mt-8">Loading messages…</p>}

        {!loading && messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm mt-8">
            Say hello to start the conversation 👋
          </p>
        )}

        <div className="flex flex-col gap-2">
          {messages.map((msg) => {
            const isMine = msg.senderId === user?.id;
            const showSenderName = conversation?.isGroup && !isMine;
            return (
              <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                {showSenderName && (
                  <span className="text-[10px] text-gray-400 ml-1 mb-0.5">{msg.sender?.name}</span>
                )}
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                    isMine
                      ? 'bg-primary text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })}
        </div>
        <div ref={bottomRef} />
      </div>

      {showEmojiPicker && (
        <EmojiPicker
          onSelectEmoji={handleSelectEmoji}
          onSelectSticker={handleSelectSticker}
          onBackspace={handleBackspace}
        />
      )}

      <form onSubmit={handleSend} className="flex items-center gap-2 px-3 py-3 border-t border-gray-100 shrink-0">
        <button
          type="button"
          onClick={() => setShowEmojiPicker((s) => !s)}
          className={`p-2 rounded-full transition ${showEmojiPicker ? 'text-primary bg-primary/10' : 'text-gray-400'}`}
        >
          <Smile size={20} />
        </button>
        <input
          value={text}
          onChange={(e) => handleTypingInput(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 bg-gray-50 rounded-full px-4 py-2.5 text-sm focus:outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="bg-primary text-white rounded-full p-2.5 disabled:opacity-40 transition"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
