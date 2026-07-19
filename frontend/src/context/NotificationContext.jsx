import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!socket) return;

    // A live event just means "something changed" - refetch for the real record
    // rather than trying to reconstruct the notification shape client-side.
    function handleLiveNotification() {
      refresh();
    }

    socket.on('notification', handleLiveNotification);
    return () => socket.off('notification', handleLiveNotification);
  }, [socket]);

  async function refresh() {
    try {
      const [listRes, countRes] = await Promise.all([
        api.get('/notifications'),
        api.get('/notifications/unread-count'),
      ]);
      setNotifications(listRes.data.notifications);
      setUnreadCount(countRes.data.count);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  }

  async function markAllRead() {
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await api.patch('/notifications/read-all');
    } catch (err) {
      console.error('Failed to mark notifications as read', err);
    }
  }

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, refresh, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within a NotificationProvider');
  return ctx;
}
