import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, Phone, Send, Smile, Video, Lightbulb, Calendar, Check, CheckCheck, Paperclip, X, Heart, Mic, Sparkles, MapPin } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useCall } from '../context/CallContext';
import ReportBlockModal from '../components/safety/ReportBlockModal';
import EmojiPicker from '../components/chat/EmojiPicker';
import DateProposalCard from '../components/chat/DateProposalCard';
import MilestonesBar from '../components/chat/MilestonesBar';

const ICEBREAKERS = [
  "What's the best trip you've ever taken?",
  "If you could have dinner with anyone, who would it be?",
  "What's a hobby you've always wanted to pick up?",
  "What's your idea of a perfect weekend?",
  "Coffee or tea person?",
  "What's the last show you binged?",
  "If you could live anywhere, where would it be?",
  "What's your go-to comfort food?",
];

const REACTION_EMOJIS = {
  heart: '\u2764\ufe0f',
  laugh: '\ud83d\ude02',
  wow: '\ud83d\ude2e',
  sad: '\ud83d\ude22',
  fire: '\ud83d\udd25',
};

export default function ChatRoomPage() {
  const { id: conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();
  const { startCall, callState } = useCall();

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [matchId, setMatchId] = useState(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherTyping, setOtherTyping] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showIcebreakers, setShowIcebreakers] = useState(false);
  const [proposals, setProposals] = useState([]);
  const [showDateModal, setShowDateModal] = useState(false);
  const [dateForm, setDateForm] = useState({ proposedDate: '', proposedLocation: '' });
  const [showDateIdeas, setShowDateIdeas] = useState(false);
  const [dateIdeas, setDateIdeas] = useState([]);
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [reactingToMsg, setReactingToMsg] = useState(null);
  const longPressTimerRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const mediaInputRef = useRef(null);

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
      // Auto-mark as read since we're viewing this conversation
      socket.emit('mark_read', { conversationId });
    }

    function handleTyping({ userId, conversationId: convId }) {
      if (convId === conversationId && userId !== user?.id) {
        setOtherTyping(true);
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setOtherTyping(false), 2000);
      }
    }

    // When the other person has read our messages
    function handleMessagesRead({ conversationId: convId }) {
      if (convId !== conversationId) return;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.senderId === user?.id && !msg.readAt
            ? { ...msg, readAt: new Date().toISOString() }
            : msg
        )
      );
    }

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleTyping);
    socket.on('messages_read', handleMessagesRead);

    function handleDateProposal(proposal) {
      if (proposal.conversationId !== conversationId) return;
      setProposals((prev) => [proposal, ...prev]);
    }

    function handleDateProposalUpdate(proposal) {
      if (proposal.conversationId !== conversationId) return;
      setProposals((prev) => prev.map((p) => (p.id === proposal.id ? proposal : p)));
    }

    socket.on('date_proposal', handleDateProposal);
    socket.on('date_proposal_update', handleDateProposalUpdate);

    function handleReaction({ messageId, reaction, removed }) {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;
          const reactions = msg.reactions || [];
          if (removed) {
            return { ...msg, reactions: reactions.filter((r) => r.userId !== user?.id) };
          } else {
            const filtered = reactions.filter((r) => r.userId !== user?.id);
            return { ...msg, reactions: [...filtered, reaction] };
          }
        })
      );
    }
    socket.on('message_reaction', handleReaction);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleTyping);
      socket.off('messages_read', handleMessagesRead);
      socket.off('date_proposal', handleDateProposal);
      socket.off('date_proposal_update', handleDateProposalUpdate);
      socket.off('message_reaction', handleReaction);
    };
  }, [socket, conversationId, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherTyping]);

  async function loadConversation() {
    setLoading(true);
    try {
      const [conversationsRes, messagesRes, proposalsRes] = await Promise.all([
        api.get('/conversations'),
        api.get(`/conversations/${conversationId}/messages`),
        api.get(`/dates/conversation/${conversationId}`),
      ]);
      const conv = conversationsRes.data.conversations.find((c) => c.id === conversationId);
      setConversation(conv || null);
      setMessages(messagesRes.data.messages);
      setProposals(proposalsRes.data.proposals);
      // Find matchId for this conversation (for milestones)
      if (conv?.matchId) setMatchId(conv.matchId);
      // Mark existing messages as read
      socket?.emit('mark_read', { conversationId });
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
    if ((!text.trim() && !mediaFile) || !socket) return;

    if (mediaFile) {
      // Upload media first, then send message with URL
      setUploadingMedia(true);
      const formData = new FormData();
      formData.append('file', mediaFile);
      api.post(`/conversations/${conversationId}/media`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
        .then((res) => {
          socket.emit('send_message', {
            conversationId,
            content: text.trim() || '',
            mediaUrl: res.data.url,
            mediaType: res.data.mediaType,
          }, (callback) => {
            if (callback?.error) console.error(callback.error);
          });
          clearMedia();
          setText('');
        })
        .catch((err) => {
          console.error('Media upload failed', err);
          alert('Failed to upload media');
        })
        .finally(() => setUploadingMedia(false));
    } else {
      socket.emit('send_message', { conversationId, content: text.trim() }, (res) => {
        if (res?.error) console.error(res.error);
      });
      setText('');
    }
  }

  function handleMediaSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    setMediaType(file.type.startsWith('video/') ? 'video' : 'image');
    setMediaPreview(URL.createObjectURL(file));
  }

  function clearMedia() {
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType(null);
    if (mediaInputRef.current) mediaInputRef.current.value = '';
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

  function handleProposalStatusChange(id, status) {
    setProposals((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
  }

  async function submitDateProposal(e) {
    e.preventDefault();
    try {
      const res = await api.post('/dates/propose', { conversationId, ...dateForm });
      setProposals((prev) => [res.data.proposal, ...prev]);
      setShowDateModal(false);
      setDateForm({ proposedDate: '', proposedLocation: '' });
    } catch (err) {
      alert('Failed to propose date');
    }
  }

  // --- Voice note recording ---
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());
        sendVoiceNote(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Microphone access denied. Please allow microphone access.');
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    clearInterval(recordingIntervalRef.current);
  }

  function cancelRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    clearInterval(recordingIntervalRef.current);
    audioChunksRef.current = [];
  }

  function sendVoiceNote(audioBlob) {
    setUploadingMedia(true);
    const formData = new FormData();
    formData.append('file', audioBlob, 'voice-note.webm');
    api.post(`/conversations/${conversationId}/media`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
      .then((res) => {
        socket.emit('send_message', {
          conversationId,
          content: '',
          mediaUrl: res.data.url,
          mediaType: 'audio',
        }, (callback) => {
          if (callback?.error) console.error(callback.error);
        });
      })
      .catch((err) => {
        console.error('Voice note upload failed', err);
        alert('Failed to send voice note');
      })
      .finally(() => setUploadingMedia(false));
  }

  function formatRecordingTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  async function loadDateIdeas() {
    setLoadingIdeas(true);
    try {
      const res = await api.get(`/dates/ideas?conversationId=${conversationId}`);
      setDateIdeas(res.data.ideas || []);
      setShowDateIdeas(true);
    } catch (err) {
      alert('Failed to load date ideas');
    } finally {
      setLoadingIdeas(false);
    }
  }

  function proposeIdea(idea) {
    setDateForm({ proposedDate: '', proposedLocation: idea.title });
    setShowDateIdeas(false);
    setShowDateModal(true);
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
        <div
          onClick={() => otherParticipant && navigate(`/profile/${otherParticipant.id}`)}
          className="flex items-center gap-3 flex-1 cursor-pointer hover:opacity-80 transition"
        >
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

      {matchId && <MilestonesBar matchId={matchId} />}

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {loading && <p className="text-center text-gray-400 text-sm mt-8">Loading messages…</p>}

        {!loading && messages.length === 0 && proposals.length === 0 && (
          <p className="text-center text-gray-400 text-sm mt-8">
            Say hello to start the conversation 👋
          </p>
        )}

        <div className="flex flex-col gap-2">
          {/* Merge messages + proposals into a single chronological timeline */}
          {[
            ...messages.map((m) => ({ type: 'message', data: m, time: new Date(m.createdAt).getTime() })),
            ...proposals.map((p) => ({ type: 'proposal', data: p, time: new Date(p.createdAt).getTime() })),
          ]
            .sort((a, b) => a.time - b.time)
            .map((item) => {
              if (item.type === 'proposal') {
                return (
                  <DateProposalCard
                    key={`proposal-${item.data.id}`}
                    proposal={item.data}
                    currentUserId={user?.id}
                    onStatusChange={handleProposalStatusChange}
                  />
                );
              }

              const msg = item.data;
              const isMine = msg.senderId === user?.id;
              const showSenderName = conversation?.isGroup && !isMine;
              const hasMedia = msg.mediaUrl && msg.mediaType;
              const msgReactions = msg.reactions || [];
              const myReaction = msgReactions.find((r) => r.userId === user?.id);
              return (
                <div
                  key={`msg-${msg.id}`}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                  onMouseDown={() => {
                    longPressTimerRef.current = setTimeout(() => setReactingToMsg(msg.id), 500);
                  }}
                  onMouseUp={() => clearTimeout(longPressTimerRef.current)}
                  onMouseLeave={() => clearTimeout(longPressTimerRef.current)}
                  onTouchStart={() => {
                    longPressTimerRef.current = setTimeout(() => setReactingToMsg(msg.id), 500);
                  }}
                  onTouchEnd={() => clearTimeout(longPressTimerRef.current)}
                >
                  {showSenderName && (
                    <span className="text-[10px] text-gray-400 ml-1 mb-0.5">{msg.sender?.name}</span>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl text-sm overflow-hidden ${
                      isMine
                        ? 'bg-primary text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                    } ${hasMedia ? '' : 'px-3 py-2'}`}
                  >
                    {hasMedia && msg.mediaType === 'image' && (
                      <img
                        src={msg.mediaUrl}
                        alt=""
                        className="max-w-full max-h-64 object-cover cursor-pointer hover:opacity-90"
                        onClick={() => window.open(msg.mediaUrl, '_blank')}
                      />
                    )}
                    {hasMedia && msg.mediaType === 'video' && (
                      <video
                        src={msg.mediaUrl}
                        controls
                        playsInline
                        className="max-w-full max-h-64"
                      />
                    )}
                    {hasMedia && msg.mediaType === 'audio' && (
                      <audio src={msg.mediaUrl} controls className="max-w-full" />
                    )}
                    {msg.content && (
                      <div className={`text-sm ${hasMedia ? 'px-3 py-2' : ''}`}>
                        {msg.content}
                      </div>
                    )}
                  </div>
                  {/* Reaction badges */}
                  {msgReactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5 mx-1">
                      {Object.entries(
                        msgReactions.reduce((acc, r) => {
                          acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                          return acc;
                        }, {})
                      ).map(([emoji, count]) => (
                        <span
                          key={emoji}
                          className={`text-xs px-1.5 py-0.5 rounded-full border ${
                            myReaction?.emoji === emoji
                              ? 'border-primary bg-primary/10'
                              : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          {REACTION_EMOJIS[emoji]} {count > 1 && count}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Reaction picker */}
                  {reactingToMsg === msg.id && (
                    <div className="flex gap-1 mt-1 bg-white dark:bg-gray-800 shadow-lg rounded-full px-2 py-1 border border-gray-100">
                      {Object.entries(REACTION_EMOJIS).map(([key, emoji]) => (
                        <button
                          key={key}
                          onClick={() => {
                            socket?.emit('react_to_message', { messageId: msg.id, emoji: key });
                            setReactingToMsg(null);
                          }}
                          className="text-lg hover:scale-125 transition-transform px-1"
                        >
                          {emoji}
                        </button>
                      ))}
                      <button
                        onClick={() => setReactingToMsg(null)}
                        className="text-gray-400 text-xs ml-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  {/* Read receipt indicators for sent messages */}
                  {isMine && (
                    <span className="mt-0.5 mr-1">
                      {msg.readAt ? (
                        <CheckCheck size={12} className="text-blue-500" title="Read" />
                      ) : (
                        <Check size={12} className="text-gray-400" title="Sent" />
                      )}
                    </span>
                  )}
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

      {showIcebreakers && (
        <div className="mx-3 mb-2 bg-white dark:bg-gray-800 shadow-lg rounded-xl p-3 border border-gray-100 dark:border-gray-700 max-h-48 overflow-y-auto">
          <p className="text-xs font-bold text-gray-400 mb-2 uppercase flex items-center gap-1"><Lightbulb size={12} /> Icebreakers</p>
          {ICEBREAKERS.map((q, i) => (
            <button
              key={i}
              onClick={() => { setText(q); setShowIcebreakers(false); }}
              className="block w-full text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Media Preview */}
      {mediaPreview && (
        <div className="mx-3 mb-2 relative">
          {mediaType === 'image' ? (
            <img src={mediaPreview} alt="" className="max-h-32 rounded-lg object-cover" />
          ) : (
            <video src={mediaPreview} className="max-h-32 rounded-lg" muted playsInline />
          )}
          <button
            onClick={clearMedia}
            className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
          >
            <X size={14} />
          </button>
          {uploadingMedia && (
            <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">Uploading...</span>
            </div>
          )}
        </div>
      )}

      {/* Recording UI */}
      {isRecording && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border-t border-red-100 shrink-0">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-red-600">{formatRecordingTime(recordingTime)}</span>
          <div className="flex-1" />
          <button
            onClick={cancelRecording}
            className="text-gray-500 hover:text-gray-700 px-3 py-1.5 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={stopRecording}
            className="bg-red-500 text-white rounded-full px-4 py-1.5 text-sm font-medium hover:bg-red-600 transition"
          >
            Send
          </button>
        </div>
      )}

      <form onSubmit={handleSend} className="flex items-center gap-2 px-3 py-3 border-t border-gray-100 shrink-0">
        <button
          type="button"
          onClick={() => setShowEmojiPicker((s) => !s)}
          className={`p-2 rounded-full transition ${showEmojiPicker ? 'text-primary bg-primary/10' : 'text-gray-400'}`}
        >
          <Smile size={20} />
        </button>
        <button
          type="button"
          onClick={() => mediaInputRef.current?.click()}
          className="text-gray-400 hover:text-primary p-2"
          title="Attach media"
        >
          <Paperclip size={20} />
        </button>
        <input
          ref={mediaInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleMediaSelect}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => setShowIcebreakers((s) => !s)}
          className={`p-2 rounded-full transition ${showIcebreakers ? 'text-amber-500 bg-amber-50' : 'text-gray-400 hover:text-amber-400'}`}
          title="Icebreakers"
        >
          <Lightbulb size={20} />
        </button>
        <button
          type="button"
          onClick={() => setShowDateModal(true)}
          className="text-gray-400 hover:text-primary p-2"
          title="Plan a Date"
        >
          <Calendar size={20} />
        </button>
        <button
          type="button"
          onClick={loadDateIdeas}
          className="text-gray-400 hover:text-amber-500 p-2"
          title="Date Ideas"
        >
          <Sparkles size={20} />
        </button>
        <input
          value={text}
          onChange={(e) => handleTypingInput(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 bg-gray-50 rounded-full px-4 py-2.5 text-sm focus:outline-none"
        />
        {/* Mic button shows when no text, Send button shows when text */}
        {text.trim() ? (
          <button
            type="submit"
            disabled={uploadingMedia}
            className="bg-primary text-white rounded-full p-2.5 disabled:opacity-40 transition"
          >
            <Send size={18} />
          </button>
        ) : (
          <button
            type="button"
            onClick={startRecording}
            className="bg-primary text-white rounded-full p-2.5 hover:bg-primary/90 transition"
            title="Record voice note"
          >
            <Mic size={18} />
          </button>
        )}
      </form>

      {/* Date Proposal Modal */}
      {showDateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-3">Propose a Date</h3>
            <form onSubmit={submitDateProposal} className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">When</label>
                <input
                  type="datetime-local"
                  value={dateForm.proposedDate}
                  onChange={(e) => setDateForm({ ...dateForm, proposedDate: e.target.value })}
                  required
                  className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Where</label>
                <input
                  type="text"
                  placeholder="e.g. Coffee at Blue Bottle"
                  value={dateForm.proposedLocation}
                  onChange={(e) => setDateForm({ ...dateForm, proposedLocation: e.target.value })}
                  required
                  className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDateModal(false)}
                  className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg py-2.5 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary text-white font-medium rounded-lg py-2.5 text-sm"
                >
                  Send Proposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Date Ideas Bottom Sheet */}
      {showDateIdeas && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl w-full max-h-[70vh] overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles size={20} className="text-amber-500" /> Date Ideas
              </h3>
              <button onClick={() => setShowDateIdeas(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            {loadingIdeas ? (
              <p className="text-center text-gray-400 text-sm py-8">Loading ideas...</p>
            ) : (
              <div className="space-y-3">
                {dateIdeas.map((idea, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{idea.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{idea.description}</p>
                    <button
                      onClick={() => proposeIdea(idea)}
                      className="mt-3 bg-primary text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-primary/90 transition flex items-center gap-1"
                    >
                      <Calendar size={12} /> Propose this date
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
