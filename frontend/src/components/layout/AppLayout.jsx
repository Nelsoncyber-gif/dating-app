import { Outlet } from 'react-router-dom';
import { Heart } from 'lucide-react';
import BottomNav from './BottomNav';
import NotificationBell from '../notifications/NotificationBell';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 max-w-md mx-auto relative pb-16 border-x border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-30">
        <div className="flex items-center gap-1.5">
          <Heart size={18} className="text-primary" fill="currentColor" />
          <span className="font-bold text-gray-900 dark:text-white text-sm">Waplike</span>
        </div>
        <NotificationBell />
      </div>

      <Outlet />
      <BottomNav />
    </div>
  );
}
