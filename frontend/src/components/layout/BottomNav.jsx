import { NavLink } from 'react-router-dom';
import { Flame, MessageCircle, Newspaper, Users, User } from 'lucide-react';

const navItems = [
  { to: '/discover', icon: Flame, label: 'Discover' },
  { to: '/chats', icon: MessageCircle, label: 'Chats' },
  { to: '/timeline', icon: Newspaper, label: 'Timeline' },
  { to: '/communities', icon: Users, label: 'Groups' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-around items-center h-16 z-40 max-w-md mx-auto">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-xs px-2 py-1 transition ${
              isActive ? 'text-primary' : 'text-gray-400 dark:text-gray-500'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={22} fill={isActive ? 'currentColor' : 'none'} strokeWidth={isActive ? 2 : 1.8} />
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
