import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useCall } from '../../context/CallContext';
import api from '../../api/client';
import IncomingCallModal from './IncomingCallModal';
import ActiveCallScreen from './ActiveCallScreen';

export default function CallManager() {
  const { callState, incomingCall, activeCall, callError, setCallError } = useCall();
  const [otherUserName, setOtherUserName] = useState(null);

  const otherUserId = incomingCall?.fromUserId || activeCall?.otherUserId;

  useEffect(() => {
    if (!otherUserId) {
      setOtherUserName(null);
      return;
    }
    api.get(`/profile/${otherUserId}`)
      .then((res) => setOtherUserName(res.data.user.name))
      .catch(() => setOtherUserName(null));
  }, [otherUserId]);

  // Auto-dismiss call errors after 4 seconds
  useEffect(() => {
    if (!callError) return;
    const timer = setTimeout(() => setCallError(null), 4000);
    return () => clearTimeout(timer);
  }, [callError, setCallError]);

  if (callState === 'ringing_incoming') {
    return <IncomingCallModal callerName={otherUserName} />;
  }

  if (callState === 'ringing_outgoing' || callState === 'connected') {
    return <ActiveCallScreen otherUserName={otherUserName} />;
  }

  if (callError) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] bg-gray-800 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 max-w-sm animate-fade-in">
        <p className="text-sm flex-1">{callError}</p>
        <button onClick={() => setCallError(null)} className="text-white/60 hover:text-white shrink-0">
          <X size={16} />
        </button>
      </div>
    );
  }

  return null;
}
