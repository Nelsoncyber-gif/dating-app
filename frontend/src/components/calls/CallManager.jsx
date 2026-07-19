import { useEffect, useState } from 'react';
import { useCall } from '../../context/CallContext';
import api from '../../api/client';
import IncomingCallModal from './IncomingCallModal';
import ActiveCallScreen from './ActiveCallScreen';

export default function CallManager() {
  const { callState, incomingCall, activeCall } = useCall();
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

  if (callState === 'ringing_incoming') {
    return <IncomingCallModal callerName={otherUserName} />;
  }

  if (callState === 'ringing_outgoing' || callState === 'connected') {
    return <ActiveCallScreen otherUserName={otherUserName} />;
  }

  return null;
}
