import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { CallProvider } from './context/CallContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import CallManager from './components/calls/CallManager';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DiscoverPage from './pages/DiscoverPage';
import ChatsPage from './pages/ChatsPage';
import ChatRoomPage from './pages/ChatRoomPage';
import TimelinePage from './pages/TimelinePage';
import CommunitiesPage from './pages/CommunitiesPage';
import CommunityDetailPage from './pages/CommunityDetailPage';
import ProfilePage from './pages/ProfilePage';
import UserProfilePage from './pages/UserProfilePage';
import MatchesPage from './pages/MatchesPage';
import PendingPage from './pages/PendingPage';
import CallLogPage from './pages/CallLogPage';
import SafetyPage from './pages/SafetyPage';
import LikesPage from './pages/LikesPage';
import PremiumPage from './pages/PremiumPage';
import EventsPage from './pages/EventsPage';

function ThemeManager({ children }) {
  const { user } = useAuth();
  useEffect(() => {
    const root = document.documentElement;
    if (user?.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [user?.theme]);
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeManager>
        <SocketProvider>
          <CallProvider>
            <NotificationProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route path="/discover" element={<DiscoverPage />} />
                  <Route path="/chats" element={<ChatsPage />} />
                  <Route path="/timeline" element={<TimelinePage />} />
                  <Route path="/communities" element={<CommunitiesPage />} />
                  <Route path="/communities/:id" element={<CommunityDetailPage />} />
                  <Route path="/matches" element={<MatchesPage />} />
                  <Route path="/pending" element={<PendingPage />} />
                  <Route path="/calls" element={<CallLogPage />} />
                  <Route path="/safety" element={<SafetyPage />} />
                  <Route path="/likes" element={<LikesPage />} />
                  <Route path="/premium" element={<PremiumPage />} />
                  <Route path="/events" element={<EventsPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/profile/:userId" element={<UserProfilePage />} />
                </Route>
                <Route path="/chats/:id" element={<ProtectedRoute><ChatRoomPage /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/discover" replace />} />
              </Routes>
              <CallManager />
            </NotificationProvider>
          </CallProvider>
        </SocketProvider>
        </ThemeManager>
      </AuthProvider>
    </BrowserRouter>
  );
}