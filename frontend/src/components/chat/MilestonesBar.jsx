import { useEffect, useState } from 'react';
import { MessageCircle, Calendar, Heart, Clock } from 'lucide-react';
import api from '../../api/client';

const ALL_MILESTONES = [
  { type: 'first_message', label: 'First Message', icon: MessageCircle, color: 'text-blue-500' },
  { type: 'first_date_proposed', label: 'Date Proposed', icon: Calendar, color: 'text-purple-500' },
  { type: 'first_date_accepted', label: 'First Date', icon: Heart, color: 'text-pink-500' },
  { type: 'one_week', label: '1 Week', icon: Clock, color: 'text-amber-500' },
  { type: 'one_month', label: '1 Month', icon: Clock, color: 'text-green-500' },
];

export default function MilestonesBar({ matchId }) {
  const [milestones, setMilestones] = useState([]);
  const [matchCreatedAt, setMatchCreatedAt] = useState(null);
  const [newMilestone, setNewMilestone] = useState(null);

  useEffect(() => {
    if (!matchId) return;
    loadMilestones();
  }, [matchId]);

  async function loadMilestones() {
    try {
      const res = await api.get(`/matches/${matchId}/milestones`);
      setMilestones(res.data.milestones || []);
      setMatchCreatedAt(res.data.matchCreatedAt);

      // Check for time-based milestones
      if (res.data.matchCreatedAt) {
        const matchDate = new Date(res.data.matchCreatedAt);
        const now = new Date();
        const daysDiff = Math.floor((now - matchDate) / (1000 * 60 * 60 * 24));

        if (daysDiff >= 7 && !res.data.milestones.find((m) => m.type === 'one_week')) {
          // Create one_week milestone
          await api.post(`/matches/${matchId}/milestones`, { type: 'one_week' }).catch(() => {});
        }
        if (daysDiff >= 30 && !res.data.milestones.find((m) => m.type === 'one_month')) {
          await api.post(`/matches/${matchId}/milestones`, { type: 'one_month' }).catch(() => {});
        }
      }
    } catch (err) {
      // Match might not exist yet
    }
  }

  // Show celebration for new milestones
  useEffect(() => {
    if (milestones.length > 0) {
      const latest = milestones[milestones.length - 1];
      const age = Date.now() - new Date(latest.reachedAt).getTime();
      if (age < 5000) {
        // Show celebration for 3 seconds
        const ms = ALL_MILESTONES.find((m) => m.type === latest.type);
        if (ms) setNewMilestone(ms);
        const timer = setTimeout(() => setNewMilestone(null), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [milestones.length]);

  const unlockedTypes = new Set(milestones.map((m) => m.type));

  return (
    <div className="relative">
      <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 border-b border-gray-100 overflow-x-auto">
        {ALL_MILESTONES.map((ms) => {
          const Icon = ms.icon;
          const unlocked = unlockedTypes.has(ms.type);
          return (
            <div
              key={ms.type}
              className={`flex flex-col items-center min-w-[52px] ${unlocked ? '' : 'opacity-30'}`}
              title={ms.label}
            >
              <Icon size={16} className={unlocked ? ms.color : 'text-gray-400'} fill={unlocked ? 'currentColor' : 'none'} />
              <span className={`text-[9px] mt-0.5 ${unlocked ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                {ms.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Celebration banner */}
      {newMilestone && (
        <div className="absolute top-full left-0 right-0 bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 animate-pulse z-10">
          <newMilestone.icon size={16} className={newMilestone.color} />
          <span className="text-sm font-medium text-amber-700">
            Milestone unlocked: {newMilestone.label}!
          </span>
        </div>
      )}
    </div>
  );
}
