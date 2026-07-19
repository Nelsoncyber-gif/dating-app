import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
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

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <CallProvider>
            <NotificationProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                <Route
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/discover" element={<DiscoverPage />} />
                  <Route path="/chats" element={<ChatsPage />} />
                  <Route path="/timeline" element={<TimelinePage />} />
                  <Route path="/communities" element={<CommunitiesPage />} />
                  <Route path="/communities/:id" element={<CommunityDetailPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                </Route>

                <Route
                  path="/chats/:id"
                  element={
                    <ProtectedRoute>
                      <ChatRoomPage />
                    </ProtectedRoute>
                  }
                />

                <Route path="*" element={<Navigate to="/discover" replace />} />
              </Routes>

              <CallManager />
            </NotificationProvider>
          </CallProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
