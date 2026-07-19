import { Phone, PhoneOff, Video } from 'lucide-react';
import { useCall } from '../../context/CallContext';

export default function IncomingCallModal({ callerName }) {
  const { incomingCall, acceptCall, declineCall } = useCall();

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center px-6">
      <div className="bg-white rounded-2xl p-6 text-center max-w-xs w-full">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold mx-auto mb-3 animate-pulse">
          {callerName?.[0] || '?'}
        </div>
        <p className="font-semibold text-gray-900">{callerName || 'Someone'}</p>
        <p className="text-sm text-gray-500 mt-1">
          Incoming {incomingCall.callType === 'video' ? 'video' : 'voice'} call…
        </p>

        <div className="flex justify-center gap-6 mt-6">
          <button
            onClick={declineCall}
            className="bg-red-500 text-white rounded-full p-4 hover:bg-red-600 transition"
          >
            <PhoneOff size={22} />
          </button>
          <button
            onClick={acceptCall}
            className="bg-green-500 text-white rounded-full p-4 hover:bg-green-600 transition"
          >
            {incomingCall.callType === 'video' ? <Video size={22} /> : <Phone size={22} />}
          </button>
        </div>
      </div>
    </div>
  );
}
