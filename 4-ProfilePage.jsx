import { useEffect, useState } from 'react';
import { LogOut, Check, ShieldOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import PhotoGrid from '../components/profile/PhotoGrid';

export default function ProfilePage() {
  const { user, logout, setUser } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', bio: '', location: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);

  useEffect(() => {
    loadProfile();
    loadBlockedUsers();
  }, []);

  async function loadBlockedUsers() {
    try {
      const res = await api.get('/safety/blocked');
      setBlockedUsers(res.data.blocked);
    } catch (err) {
      console.error('Failed to load blocked users', err);
    }
  }

  async function handleUnblock(blockedId) {
    try {
      await api.delete(`/safety/block/${blockedId}`);
      setBlockedUsers((prev) => prev.filter((u) => u.id !== blockedId));
    } catch (err) {
      console.error('Failed to unblock user', err);
    }
  }

  async function loadProfile() {
    setLoading(true);
    try {
      const res = await api.get('/auth/me');
      const u = res.data.user;
      setPhotos(u.photos || []);
      setForm({ name: u.name || '', bio: u.bio || '', location: u.location || '' });
    } catch (err) {
      console.error('Failed to load profile', err);
    } finally {
      setLoading(false);
    }
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.patch('/profile', form);
      setUser((prev) => ({ ...prev, ...res.data.user }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save profile', err);
    } finally {
      setSaving(false);
    }
  }

  const primaryPhoto = photos.find((p) => p.isProfilePic) || photos[0];

  if (loading) {
    return <p className="p-4 text-sm text-gray-400 text-center mt-12">Loading profile…</p>;
  }

  return (
    <div className="p-4 pb-8">
      <h1 className="text-xl font-bold text-gray-900 mb-4">Profile</h1>

      <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold overflow-hidden shrink-0">
          {primaryPhoto ? (
            <img src={primaryPhoto.url} alt="" className="w-full h-full object-cover" />
          ) : (
            user?.name?.[0]
          )}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{user?.name}</p>
          <p className="text-sm text-gray-400 truncate">{user?.email}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Photos</h2>
        <PhotoGrid photos={photos} onPhotosChange={setPhotos} />
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">About you</h2>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Location</label>
            <input
              type="text"
              placeholder="e.g. Lagos, Nigeria"
              value={form.location}
              onChange={(e) => update('location', e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Bio</label>
            <textarea
              placeholder="Tell people a bit about yourself…"
              value={form.bio}
              onChange={(e) => update('bio', e.target.value)}
              rows={3}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-primary hover:bg-primary-dark text-white font-medium rounded-lg py-2.5 text-sm transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saved ? (
              <>
                <Check size={16} /> Saved
              </>
            ) : saving ? (
              'Saving…'
            ) : (
              'Save changes'
            )}
          </button>
        </form>
      </div>

      {blockedUsers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
            <ShieldOff size={15} className="text-gray-500" /> Blocked users
          </h2>
          <div className="flex flex-col gap-2">
            {blockedUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{u.name}</span>
                <button
                  onClick={() => handleUnblock(u.id)}
                  className="text-xs text-primary font-medium"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={logout}
        className="flex items-center gap-2 text-red-500 text-sm font-medium border border-red-200 rounded-lg px-4 py-2 hover:bg-red-50 transition"
      >
        <LogOut size={16} />
        Log out
      </button>
    </div>
  );
}
