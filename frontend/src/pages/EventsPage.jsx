import { useEffect, useState } from 'react';
import { Calendar, MapPin, Users, Plus, Check } from 'lucide-react';
import api from '../api/client';
import CreateEventModal from '../components/events/CreateEventModal';

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      const res = await api.get('/events');
      setEvents(res.data.events);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRsvp(eventId) {
    try {
      const res = await api.post(`/events/${eventId}/rsvp`);
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? {
                ...e,
                isAttending: res.data.attending,
                attendeeCount: res.data.attending ? e.attendeeCount + 1 : e.attendeeCount - 1,
              }
            : e
        )
      );
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to RSVP');
    }
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (loading) return <p className="p-4 text-center text-gray-400">Loading events...</p>;

  return (
    <div className="p-4 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Local Events</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
        >
          <Plus size={16} /> Create
        </button>
      </div>

      {events.length === 0 ? (
        <p className="text-center text-gray-400 mt-12">No upcoming events. Be the first to create one!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700"
            >
              <div className="p-4">
                <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1">{event.title}</h3>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <Calendar size={14} /> {formatDate(event.date)}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-3">
                  <MapPin size={14} /> {event.location}
                </div>
                {event.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">{event.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                    <Users size={14} /> {event.attendeeCount} going
                  </div>
                  <button
                    onClick={() => handleRsvp(event.id)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                      event.isAttending
                        ? 'bg-green-100 text-green-700'
                        : 'bg-primary/10 text-primary hover:bg-primary/20'
                    }`}
                  >
                    {event.isAttending ? (
                      <span className="flex items-center gap-1">
                        <Check size={12} /> Going
                      </span>
                    ) : (
                      'RSVP'
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {showCreateModal && <CreateEventModal onClose={() => setShowCreateModal(false)} onCreated={fetchEvents} />}
    </div>
  );
}
