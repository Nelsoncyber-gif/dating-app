import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '../api/client';

const SocketContext = createContext(null);

// Socket.IO connects to the server root, not /api, so strip that suffix
const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, '');

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!user || !token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      return;
    }

    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setError(null);
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      setError(err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, error }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within a SocketProvider');
  return ctx;
}
