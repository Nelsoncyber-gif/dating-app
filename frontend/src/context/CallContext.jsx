import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

const CallContext = createContext(null);

// Public STUN server for NAT traversal - sufficient for most direct connections.
// Note: without a TURN server, calls between users on restrictive/symmetric NATs
// (common on some mobile carriers/corporate networks) may fail to connect.
// Fine for a school project demo; a production app would add a TURN server too.
const ICE_SERVERS = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export function CallProvider({ children }) {
  const { socket } = useSocket();
  const { user } = useAuth();

  // 'idle' | 'ringing_incoming' | 'ringing_outgoing' | 'connected'
  const [callState, setCallState] = useState('idle');
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const pcRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  // Mirror state into refs so socket handlers (registered once per socket instance)
  // always read the *current* value instead of a stale closure from mount time.
  const callStateRef = useRef(callState);
  const localStreamRef = useRef(localStream);
  useEffect(() => { callStateRef.current = callState; }, [callState]);
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);

  useEffect(() => {
    if (!socket) return;

    function handleIncoming({ conversationId, fromUserId, offer, callType }) {
      if (callStateRef.current !== 'idle') return; // no call-waiting support in this scope
      setIncomingCall({ conversationId, fromUserId, offer, callType });
      setCallState('ringing_incoming');
    }

    async function handleAnswered({ answer }) {
      const pc = pcRef.current;
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      for (const candidate of pendingCandidatesRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidatesRef.current = [];
      setCallState('connected');
    }

    async function handleRemoteIceCandidate({ candidate }) {
      const pc = pcRef.current;
      if (pc && pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        pendingCandidatesRef.current.push(candidate);
      }
    }

    function handleRemoteEnd() {
      cleanup();
    }

    socket.on('call_incoming', handleIncoming);
    socket.on('call_answered', handleAnswered);
    socket.on('call_declined', handleRemoteEnd);
    socket.on('call_ended', handleRemoteEnd);
    socket.on('call_unavailable', handleRemoteEnd);
    socket.on('call_ice_candidate', handleRemoteIceCandidate);

    return () => {
      socket.off('call_incoming', handleIncoming);
      socket.off('call_answered', handleAnswered);
      socket.off('call_declined', handleRemoteEnd);
      socket.off('call_ended', handleRemoteEnd);
      socket.off('call_unavailable', handleRemoteEnd);
      socket.off('call_ice_candidate', handleRemoteIceCandidate);
    };
  }, [socket]);

  function createPeerConnection(toUserId, conversationId) {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('call_ice_candidate', { toUserId, candidate: event.candidate, conversationId });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    pcRef.current = pc;
    return pc;
  }

  async function startCall(conversationId, otherUserId, callType) {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === 'video',
    });
    setLocalStream(stream);

    const pc = createPeerConnection(otherUserId, conversationId);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit('call_offer', { conversationId, toUserId: otherUserId, offer, callType });

    setActiveCall({ conversationId, otherUserId, callType });
    setCallState('ringing_outgoing');
  }

  async function acceptCall() {
    if (!incomingCall) return;
    const { conversationId, fromUserId, offer, callType } = incomingCall;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === 'video',
    });
    setLocalStream(stream);

    const pc = createPeerConnection(fromUserId, conversationId);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    for (const candidate of pendingCandidatesRef.current) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
    pendingCandidatesRef.current = [];

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit('call_answer', { toUserId: fromUserId, answer, conversationId });

    setActiveCall({ conversationId, otherUserId: fromUserId, callType });
    setIncomingCall(null);
    setCallState('connected');
  }

  function declineCall() {
    if (!incomingCall) return;
    socket.emit('call_decline', {
      toUserId: incomingCall.fromUserId,
      conversationId: incomingCall.conversationId,
    });
    setIncomingCall(null);
    setCallState('idle');
  }

  function endCall() {
    if (activeCall) {
      socket.emit('call_end', { toUserId: activeCall.otherUserId, conversationId: activeCall.conversationId });
    }
    cleanup();
  }

  function cleanup() {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    pcRef.current = null;
    pendingCandidatesRef.current = [];
    setLocalStream(null);
    setRemoteStream(null);
    setActiveCall(null);
    setIncomingCall(null);
    setCallState('idle');
  }

  return (
    <CallContext.Provider
      value={{
        callState,
        incomingCall,
        activeCall,
        localStream,
        remoteStream,
        startCall,
        acceptCall,
        declineCall,
        endCall,
        currentUser: user,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within a CallProvider');
  return ctx;
}
