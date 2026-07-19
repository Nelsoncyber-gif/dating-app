import { useNavigate } from 'react-router-dom';

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function ConversationListItem({ conversation, currentUserId }) {
  const navigate = useNavigate();
  const lastMessage = conversation.messages?.[0];

  // For 1-on-1 chats, show the other person. For group chats, show the group name.
  const otherParticipant = conversation.participants.find(
    (p) => p.user.id !== currentUserId,
  )?.user;

  const displayName = conversation.isGroup ? conversation.name : otherParticipant?.name;
  const avatarUrl = conversation.isGroup ? null : otherParticipant?.photos?.[0]?.url;

  return (
    <button
      onClick={() => navigate(`/chats/${conversation.id}`)}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left"
    >
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0 overflow-hidden">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          displayName?.[0] || '?'
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
        <p className="text-xs text-gray-400 truncate">
          {lastMessage ? lastMessage.content : 'Say hello 👋'}
        </p>
      </div>

      {lastMessage && (
        <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(lastMessage.createdAt)}</span>
      )}
    </button>
  );
}
