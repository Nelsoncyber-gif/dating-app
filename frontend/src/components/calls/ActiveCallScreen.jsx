import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react';
import { useCall } from '../../context/CallContext';

export default function ActiveCallScreen({ otherUserName }) {
  const { callState, activeCall, localStream, remoteStream, endCall } = useCall();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(activeCall?.callType === 'video');

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (!activeCall) return null;

  const isVideo = activeCall.callType === 'video';

  function toggleMic() {
    localStream?.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    setMicOn((m) => !m);
  }

  function toggleCam() {
    localStream?.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
    setCamOn((c) => !c);
  }

  return (
    <div className="fixed inset-0 bg-gray-900 z-[60] flex flex-col max-w-md mx-auto">
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {isVideo && remoteStream ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center text-white">
            <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center text-3xl font-bold mb-4">
              {otherUserName?.[0] || '?'}
            </div>
            <p className="font-medium">{otherUserName || 'Connecting…'}</p>
            <p className="text-white/60 text-sm mt-1">
              {callState === 'ringing_outgoing' ? 'Ringing…' : callState === 'connected' ? 'Voice call' : 'Connecting…'}
            </p>
          </div>
        )}

        {isVideo && (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute top-4 right-4 w-24 h-32 object-cover rounded-lg border-2 border-white/20"
          />
        )}

        {isVideo && callState === 'ringing_outgoing' && (
          <p className="absolute top-4 left-4 text-white/80 text-sm bg-black/40 px-3 py-1 rounded-full">
            Ringing…
          </p>
        )}
      </div>

      <div className="flex items-center justify-center gap-5 py-6 bg-gray-900/80">
        <button
          onClick={toggleMic}
          className={`rounded-full p-4 transition ${micOn ? 'bg-white/10 text-white' : 'bg-white text-gray-900'}`}
        >
          {micOn ? <Mic size={20} /> : <MicOff size={20} />}
        </button>

        {isVideo && (
          <button
            onClick={toggleCam}
            className={`rounded-full p-4 transition ${camOn ? 'bg-white/10 text-white' : 'bg-white text-gray-900'}`}
          >
            {camOn ? <Video size={20} /> : <VideoOff size={20} />}
          </button>
        )}

        <button
          onClick={endCall}
          className="bg-red-500 text-white rounded-full p-4 hover:bg-red-600 transition"
        >
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  );
}
