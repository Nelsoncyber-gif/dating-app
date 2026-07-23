import { Calendar, MapPin, Check, X } from 'lucide-react';
import api from '../../api/client';

export default function DateProposalCard({ proposal, currentUserId, onStatusChange }) {
  const isProposer = proposal.proposerId === currentUserId;

  async function handleAction(status) {
    try {
      await api.patch(`/dates/${proposal.id}`, { status });
      onStatusChange(proposal.id, status);
    } catch (err) {
      alert('Failed to update proposal');
    }
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-4 my-2 max-w-xs">
      <div className="flex items-center gap-2 mb-2">
        <Calendar size={16} className="text-primary" />
        <span className="text-xs font-bold text-primary uppercase">Date Proposal</span>
      </div>
      <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{formatDate(proposal.proposedDate)}</p>
      <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-3">
        <MapPin size={12} /> {proposal.proposedLocation}
      </div>

      {proposal.status === 'pending' ? (
        isProposer ? (
          <p className="text-xs text-gray-500 italic">Waiting for response...</p>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => handleAction('accepted')}
              className="flex-1 bg-green-500 text-white text-xs font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1"
            >
              <Check size={14} /> Accept
            </button>
            <button
              onClick={() => handleAction('declined')}
              className="flex-1 bg-gray-200 text-gray-700 text-xs font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1"
            >
              <X size={14} /> Decline
            </button>
          </div>
        )
      ) : (
        <p
          className={`text-xs font-semibold ${
            proposal.status === 'accepted' ? 'text-green-600' : 'text-red-500'
          }`}
        >
          {proposal.status === 'accepted' ? '\u2713 Date Accepted!' : '\u2717 Date Declined'}
        </p>
      )}
    </div>
  );
}
