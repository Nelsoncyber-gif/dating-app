import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneIncoming, PhoneOutgoing, PhoneMissed, ArrowLeft } from 'lucide-react';
import api from '../api/client';

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return (
    date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
}

export default function CallLogPage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/social/calls')
      .then((res) => {
        setLogs(res.data.logs);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p className="p-4 text-center text-gray-400">Loading call history...</p>;

  return (
    <div className="p-4 max-w-3xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/chats')} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Call History</h1>
      </div>
      {logs.length === 0 ? (
        <p className="text-center text-gray-400 text-sm mt-8">No calls yet.</p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const photo = log.user.photos?.find((p) => p.isProfilePic) || log.user.photos?.[0];
            const Icon =
              log.status === 'missed'
                ? PhoneMissed
                : log.isIncoming
                  ? PhoneIncoming
                  : PhoneOutgoing;
            const color =
              log.status === 'missed'
                ? 'text-red-500'
                : log.isIncoming
                  ? 'text-green-500'
                  : 'text-blue-500';

            return (
              <div key={log.id} className="bg-white rounded-xl shadow-sm p-3 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden shrink-0">
                  {photo ? (
                    <img src={photo.url} alt={log.user.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold">
                      {log.user.name[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">{log.user.name}</p>
                  <div className={`flex items-center gap-1.5 text-xs ${color}`}>
                    <Icon size={14} />
                    <span>
                      {log.isIncoming ? 'Incoming' : 'Outgoing'} {log.type}
                    </span>
                    {log.status === 'completed' && (
                      <span className="text-gray-400">&bull; {formatDuration(log.duration)}</span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-400 shrink-0">{formatDate(log.createdAt)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
