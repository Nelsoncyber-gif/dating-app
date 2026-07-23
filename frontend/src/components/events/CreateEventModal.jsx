import { useState } from 'react';
import { X } from 'lucide-react';
import api from '../../api/client';

export default function CreateEventModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', date: '', location: '', maxAttendees: '' });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/events', {
        ...form,
        maxAttendees: form.maxAttendees ? parseInt(form.maxAttendees) : null,
      });
      onCreated();
      onClose();
    } catch (err) {
      alert('Failed to create event');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400">
          <X size={20} />
        </button>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Create Event</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            placeholder="Event Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Description (Optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm resize-none"
          />
          <input
            type="datetime-local"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
            className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm"
          />
          <input
            placeholder="Location (e.g. Central Park)"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            required
            className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="Max Attendees (Optional)"
            value={form.maxAttendees}
            onChange={(e) => setForm({ ...form, maxAttendees: e.target.value })}
            className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white font-medium rounded-lg py-2.5 text-sm disabled:opacity-60"
          >
            {loading ? 'Creating...' : 'Create Event'}
          </button>
        </form>
      </div>
    </div>
  );
}
