import { useState } from 'react';
import { X } from 'lucide-react';
import api from '../../api/client';

export default function CreateCommunityModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;

    setError('');
    setSubmitting(true);
    try {
      const res = await api.post('/communities', {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      onCreated(res.data.community);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create group. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Create a Group</h2>
          <button onClick={onClose} className="text-gray-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name"
            required
            className="border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this group about? (optional)"
            rows={3}
            className="border border-gray-200 rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
          />

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="bg-primary text-white font-medium rounded-lg py-3 mt-1 disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create Group'}
          </button>
        </form>
      </div>
    </div>
  );
}
