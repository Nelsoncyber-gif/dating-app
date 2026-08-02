import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', dob: '', gender: 'MALE',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/discover');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 px-4 py-8">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-primary rounded-full p-3 mb-3">
            <Heart className="text-white" size={28} fill="white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-500 text-sm mt-1">Find your person</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Full name"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            required
            className="border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            required
            className="border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <input
            type="password"
            placeholder="Password (min. 8 characters)"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            required
            minLength={8}
            className="border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <div>
            <label className="text-xs text-gray-500 block mb-1 ml-1">Date of birth</label>
            <input
              type="date"
              value={form.dob}
              onChange={(e) => update('dob', e.target.value)}
              required
              className="border border-gray-200 rounded-lg px-4 py-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1 ml-1">I am</label>
            <select
              value={form.gender}
              onChange={(e) => update('gender', e.target.value)}
              className="border border-gray-200 rounded-lg px-4 py-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-primary hover:bg-primary-dark text-white font-medium rounded-lg py-3 transition disabled:opacity-60"
          >
            {loading ? 'Creating account…' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
