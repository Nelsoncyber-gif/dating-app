import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Heart, MessageCircle, ThumbsUp, X } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const NOTIF_CONFIG = {
  MATCH: { icon: Heart, label: 'You have a new match! 🎉', color: 'text-primary' },
  MESSAGE: { icon: MessageCircle, label: 'You have a new message', color: 'text-blue-500' },
  LIKE: { icon: Heart, label: 'Someone liked you', color: 'text-primary' },
  POST_LIKE: { icon: ThumbsUp, label: 'Someone liked your post', color: 'text-blue-500' },
  POST_COMMENT: { icon: MessageCircle, label: 'Someone commented on your post', color: 'text-blue-500' },
  GROUP_INVITE: { icon: Bell, label: 'Group invite', color: 'text-gray-500' },
};

export default function NotificationBell() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);

  function handleOpen() {
    setOpen(true);
    if (unreadCount > 0) markAllRead();
  }

  function handleNotificationClick(notification) {
    setOpen(false);
    if (notification.type === 'MATCH' || notification.type === 'MESSAGE') {
      navigate('/chats');
    } else if (notification.type === 'POST_LIKE' || notification.type === 'POST_COMMENT') {
      navigate('/timeline');
    }
  }

  return (
    <div className="relative">
      <button onClick={handleOpen} className="relative text-gray-600 p-1">
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-primary text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto border border-gray-100">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 sticky top-0 bg-white">
              <p className="text-sm font-semibold text-gray-900">Notifications</p>
              <button onClick={() => setOpen(false)} className="text-gray-400">
                <X size={16} />
              </button>
            </div>

            {notifications.length === 0 && (
              <p className="text-center text-gray-400 text-xs py-8">No notifications yet.</p>
            )}

            {notifications.map((n) => {
              const config = NOTIF_CONFIG[n.type] || NOTIF_CONFIG.GROUP_INVITE;
              const Icon = config.icon;
              return (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 transition ${
                    !n.read ? 'bg-primary/5' : ''
                  }`}
                >
                  <Icon size={16} className={`${config.color} mt-0.5 shrink-0`} />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-800">{config.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(n.createdAt)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
