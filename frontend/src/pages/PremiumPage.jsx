import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, ArrowLeft, Heart, Eye, RotateCcw, Star, Infinity, CheckCircle, Zap } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function PremiumPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleGoPremium() {
    setLoading(true);
    try {
      const res = await api.post('/premium/checkout');
      if (res.data.url) {
        window.location.href = res.data.url; // Redirect to Stripe Checkout
      }
    } catch (err) {
      console.error('Failed to start checkout', err);
      alert('Could not start checkout. Please try again.');
      setLoading(false);
    }
  }

  const features = [
    { icon: Infinity, text: 'Unlimited daily swipes' },
    { icon: Star, text: '5 Super Likes per day' },
    { icon: Eye, text: 'See who liked you (clear photos)' },
    { icon: RotateCcw, text: 'Rewind your last swipe' },
    { icon: Zap, text: 'Profile Boost — get seen by more people' },
    { icon: Heart, text: 'Priority in Discover feed' },
    { icon: Crown, text: 'Premium badge on your profile' },
  ];

  return (
    <div className="p-4 pb-8 max-w-lg mx-auto w-full">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-gray-600 hover:text-gray-900">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Go Premium</h1>
      </div>

      {user?.isPremium ? (
        <div className="bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl p-6 text-center text-white">
          <Crown className="mx-auto mb-3" size={48} />
          <h2 className="text-2xl font-bold mb-2">You're Premium!</h2>
          <p className="text-sm opacity-90">
            Enjoy all premium features. {user.premiumUntil && `Active until ${new Date(user.premiumUntil).toLocaleDateString()}.`}
          </p>
        </div>
      ) : (
        <>
          {/* Hero Card */}
          <div className="bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl p-6 text-center text-white mb-6">
            <Crown className="mx-auto mb-3" size={48} />
            <h2 className="text-2xl font-bold mb-1">Waplike Premium</h2>
            <p className="text-sm opacity-90 mb-4">Unlock the full dating experience</p>
            <div className="bg-white/20 rounded-lg py-2 px-4 inline-block">
              <span className="text-2xl font-bold">$9.99</span>
              <span className="text-sm opacity-80 ml-1">/month</span>
            </div>
          </div>

          {/* Features List */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6 space-y-3">
            {features.map(({ icon: Icon, text }, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                <Icon size={18} className="text-amber-500 flex-shrink-0" />
                <span className="text-sm text-gray-700">{text}</span>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <button
            onClick={handleGoPremium}
            disabled={loading}
            className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-white font-bold rounded-xl py-4 text-lg shadow-lg hover:shadow-xl hover:from-yellow-500 hover:to-amber-600 disabled:opacity-50 transition"
          >
            {loading ? 'Loading...' : 'Get Premium Now'}
          </button>
          <p className="text-[11px] text-gray-400 text-center mt-3">
            Secure payment powered by Stripe. Cancel anytime.
          </p>
        </>
      )}
    </div>
  );
}
