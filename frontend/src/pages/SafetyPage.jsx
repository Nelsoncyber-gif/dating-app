import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Phone, Clock, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import api from '../api/client';

export default function SafetyPage() {
  const navigate = useNavigate();
  const [contact, setContact] = useState({ name: '', phone: '', email: '' });
  const [duration, setDuration] = useState(60);
  const [activeCheck, setActiveCheck] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadEmergencyContact();
  }, []);

  async function loadEmergencyContact() {
    try {
      const res = await api.get('/safety/emergency-contact');
      if (res.data.contact) {
        setContact(res.data.contact);
      }
    } catch (err) {
      // 404 is fine — no contact saved yet
    }
  }

  async function saveContact() {
    if (!contact.name.trim() || !contact.phone.trim()) {
      alert('Name and phone number are required.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/safety/emergency-contact', contact);
      alert('Emergency contact saved.');
    } catch (err) {
      alert('Failed to save contact.');
    } finally {
      setSaving(false);
    }
  }

  async function startCheck() {
    try {
      const res = await api.post('/safety/safety-check/start', { durationMinutes: duration });
      setActiveCheck(res.data.check);
      setTimeLeft(duration * 60);
    } catch (err) {
      alert('Failed to start safety check.');
    }
  }

  async function handleCheckIn() {
    try {
      await api.post('/safety/safety-check/check-in');
      setActiveCheck(null);
      setTimeLeft(null);
      alert('Checked in successfully! Stay safe.');
    } catch (err) {
      alert('Failed to check in.');
    }
  }

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const formatTime = (seconds) => {
    if (seconds == null) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 pb-8 max-w-3xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-gray-600 hover:text-gray-900">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Shield size={24} className="text-primary" /> Safety Center
        </h1>
      </div>

      {/* Emergency Contact */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Phone size={18} /> Emergency Contact
        </h2>
        <div className="space-y-3">
          <input
            placeholder="Contact Name"
            value={contact.name}
            onChange={e => setContact({ ...contact, name: e.target.value })}
            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-primary"
          />
          <input
            placeholder="Phone Number"
            value={contact.phone}
            onChange={e => setContact({ ...contact, phone: e.target.value })}
            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-primary"
          />
          <input
            placeholder="Email (Optional)"
            value={contact.email || ''}
            onChange={e => setContact({ ...contact, email: e.target.value })}
            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-primary"
          />
          <button
            onClick={saveContact}
            disabled={saving}
            className="w-full bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition"
          >
            {saving ? 'Saving...' : 'Save Contact'}
          </button>
        </div>
      </div>

      {/* Safety Check Timer */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Clock size={18} /> Date Safety Check
        </h2>

        {!activeCheck ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Set a timer for your date. If you don't check in before it expires, your emergency contact will be alerted.
            </p>
            <select
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-primary"
            >
              <option value={30}>30 Minutes</option>
              <option value={60}>1 Hour</option>
              <option value={120}>2 Hours</option>
              <option value={180}>3 Hours</option>
            </select>
            <button
              onClick={startCheck}
              className="w-full bg-red-500 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-red-600 transition"
            >
              Start Safety Check
            </button>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="bg-red-50 p-4 rounded-lg">
              <AlertTriangle className="mx-auto text-red-500 mb-2" size={32} />
              <p className="text-3xl font-bold text-gray-900">{formatTime(timeLeft)}</p>
              <p className="text-xs text-gray-500 mt-1">Time remaining to check in</p>
            </div>
            <button
              onClick={handleCheckIn}
              className="w-full bg-green-500 text-white rounded-lg py-3 text-sm font-bold flex items-center justify-center gap-2 hover:bg-green-600 transition"
            >
              <CheckCircle size={18} /> I'm Safe — Check In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
