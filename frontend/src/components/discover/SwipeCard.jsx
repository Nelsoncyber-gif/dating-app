import { useRef, useState } from 'react';
import { MapPin, Info, Sparkles, Play, X } from 'lucide-react';

const SWIPE_THRESHOLD = 120;
const ROTATION_FACTOR = 0.12;

export default function SwipeCard({ candidate, onSwipe, onSuperLike, onInfo, isTop }) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [dragState, setDragState] = useState({ x: 0, y: 0, dragging: false });
  const [flyOff, setFlyOff] = useState(null); // 'left' | 'right' | 'up' | null
  const [showVideoIntro, setShowVideoIntro] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);

  const photos = candidate.photos || [];
  const age = calculateAge(candidate.dob);

  function calculateAge(dob) {
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  }

  // --- Drag handlers ---
  function handleStart(clientX, clientY) {
    if (!isTop || flyOff) return;
    isDragging.current = true;
    startPos.current = { x: clientX, y: clientY };
    currentPos.current = { x: 0, y: 0 };
    setDragState({ x: 0, y: 0, dragging: true });
  }

  function handleMove(clientX, clientY) {
    if (!isDragging.current) return;
    const dx = clientX - startPos.current.x;
    const dy = clientY - startPos.current.y;
    currentPos.current = { x: dx, y: dy };
    setDragState({ x: dx, y: dy, dragging: true });
  }

  function handleEnd() {
    if (!isDragging.current) return;
    isDragging.current = false;
    const { x, y } = currentPos.current;

    // Super like (swipe up)
    if (y < -SWIPE_THRESHOLD && Math.abs(y) > Math.abs(x)) {
      triggerFlyOff('up');
      return;
    }

    // Like (swipe right)
    if (x > SWIPE_THRESHOLD) {
      triggerFlyOff('right');
      return;
    }

    // Pass (swipe left)
    if (x < -SWIPE_THRESHOLD) {
      triggerFlyOff('left');
      return;
    }

    // Snap back
    setDragState({ x: 0, y: 0, dragging: false });
  }

  function triggerFlyOff(direction) {
    setFlyOff(direction);
    setDragState({ x: 0, y: 0, dragging: false });

    setTimeout(() => {
      if (direction === 'right') onSwipe('LIKE');
      else if (direction === 'left') onSwipe('PASS');
      else if (direction === 'up') onSuperLike();
    }, 300);
  }

  // --- Photo gallery ---
  function handlePhotoTap(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const tapX = e.clientX - rect.left;
    const half = rect.width / 2;

    // Don't change photo if we were dragging
    if (Math.abs(currentPos.current.x) > 5 || Math.abs(currentPos.current.y) > 5) return;

    if (tapX < half && photoIndex > 0) {
      setPhotoIndex((i) => i - 1);
    } else if (tapX > half && photoIndex < photos.length - 1) {
      setPhotoIndex((i) => i + 1);
    }
  }

  // --- Computed styles ---
  const rotation = dragState.x * ROTATION_FACTOR;
  const opacity = Math.min(Math.abs(dragState.x) / SWIPE_THRESHOLD, 1);

  let flyStyle = {};
  if (flyOff === 'right') flyStyle = { transform: 'translateX(150vw) rotate(30deg)', transition: 'transform 0.3s ease-out' };
  else if (flyOff === 'left') flyStyle = { transform: 'translateX(-150vw) rotate(-30deg)', transition: 'transform 0.3s ease-out' };
  else if (flyOff === 'up') flyStyle = { transform: 'translateY(-150vh)', transition: 'transform 0.3s ease-out' };

  const cardStyle = {
    transform: `translateX(${dragState.x}px) translateY(${dragState.y}px) rotate(${rotation}deg)`,
    transition: dragState.dragging ? 'none' : 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    ...flyStyle,
  };

  // Like/Pass overlay opacity
  const likeOpacity = dragState.x > 0 ? opacity : 0;
  const passOpacity = dragState.x < 0 ? opacity : 0;
  const superLikeOpacity = dragState.y < 0 ? Math.min(Math.abs(dragState.y) / SWIPE_THRESHOLD, 1) : 0;

  if (!isTop && !flyOff) {
    // Show stacked cards behind
    return (
      <div className="absolute inset-0 scale-[0.95] opacity-60 rounded-2xl overflow-hidden pointer-events-none">
        {photos[0]?.url ? (
          <img src={photos[0].url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-6xl font-bold">
            {candidate.name[0]}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="absolute inset-0 rounded-2xl overflow-hidden bg-white shadow-2xl select-none cursor-grab active:cursor-grabbing"
      style={cardStyle}
      onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
      onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={handleEnd}
    >
      {/* Photo area */}
      <div className="absolute inset-0" onClick={handlePhotoTap}>
        {photos[photoIndex]?.url ? (
          <img
            src={photos[photoIndex].url}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-gray-200 to-gray-300 flex items-center justify-center text-gray-400 text-8xl font-bold">
            {candidate.name[0]}
          </div>
        )}
        {/* Video Intro Play Button */}
        {candidate.videoIntro && photoIndex === 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowVideoIntro(true); }}
            className="absolute bottom-20 right-4 bg-black/60 hover:bg-black/80 text-white rounded-full p-3 transition z-20"
          >
            <Play size={20} fill="white" />
          </button>
        )}
      </div>

      {/* Video Intro Modal */}
      {showVideoIntro && candidate.videoIntro && (
        <div className="absolute inset-0 bg-black z-30 flex flex-col">
          <div className="flex items-center justify-between p-3">
            <span className="text-white text-sm font-medium">{candidate.name}'s Intro</span>
            <button onClick={() => setShowVideoIntro(false)} className="text-white p-1">
              <X size={20} />
            </button>
          </div>
          <video
            src={candidate.videoIntro.videoUrl}
            controls
            autoPlay
            playsInline
            className="flex-1 w-full object-contain"
          />
        </div>
      )}

      {/* Photo dots */}
      {photos.length > 1 && (
        <div className="absolute top-3 left-0 right-0 flex justify-center gap-1 px-3 z-10">
          {photos.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all ${
                i === photoIndex ? 'w-6 bg-white' : 'w-3 bg-white/50'
              }`}
            />
          ))}
        </div>
      )}

      {/* LIKE stamp */}
      <div
        className="absolute top-16 left-6 z-10 border-4 border-green-500 rounded-lg px-4 py-2 -rotate-12 pointer-events-none"
        style={{ opacity: likeOpacity }}
      >
        <span className="text-green-500 text-3xl font-black tracking-wider">LIKE</span>
      </div>

      {/* PASS stamp */}
      <div
        className="absolute top-16 right-6 z-10 border-4 border-red-500 rounded-lg px-4 py-2 rotate-12 pointer-events-none"
        style={{ opacity: passOpacity }}
      >
        <span className="text-red-500 text-3xl font-black tracking-wider">NOPE</span>
      </div>

      {/* SUPER LIKE stamp */}
      <div
        className="absolute bottom-32 left-1/2 -translate-x-1/2 z-10 border-4 border-blue-500 rounded-lg px-4 py-2 pointer-events-none"
        style={{ opacity: superLikeOpacity }}
      >
        <span className="text-blue-500 text-2xl font-black tracking-wider">SUPER LIKE</span>
      </div>

      {/* Gradient overlay at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

      {/* User info */}
      <div className="absolute bottom-0 left-0 right-0 p-5 z-10 pointer-events-none">
        <div className="flex items-end justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-white text-2xl font-bold">{candidate.name}</h2>
              <span className="text-white/80 text-xl">{age}</span>
            </div>

            {/* Distance + Compatibility row */}
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {candidate.distance != null && (
                <div className="flex items-center gap-1">
                  <MapPin size={13} className="text-white/70" />
                  <span className="text-white/70 text-xs font-medium">{candidate.distance} km away</span>
                </div>
              )}
              {candidate.compatibility > 0 && (
                <div className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5">
                  <Sparkles size={11} className="text-amber-300" />
                  <span className="text-white text-xs font-bold">{candidate.compatibility}% match</span>
                </div>
              )}
            </div>

            {/* Shared interests */}
            {candidate.sharedInterestNames && candidate.sharedInterestNames.length > 0 && (
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                {candidate.sharedInterestNames.slice(0, 3).map((name) => (
                  <span key={name} className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                    {name}
                  </span>
                ))}
                {candidate.sharedInterestNames.length > 3 && (
                  <span className="text-white/50 text-[10px]">+{candidate.sharedInterestNames.length - 3} more</span>
                )}
              </div>
            )}

            {candidate.bio && (
              <p className="text-white/60 text-sm mt-2 line-clamp-2 max-w-xs">{candidate.bio}</p>
            )}

            {/* First prompt teaser */}
            {candidate.profilePrompts && candidate.profilePrompts.length > 0 && (
              <div className="mt-2 bg-white/10 rounded-lg px-3 py-1.5 max-w-xs">
                <p className="text-white/50 text-[10px] font-medium">{candidate.profilePrompts[0].question}</p>
                <p className="text-white/80 text-xs line-clamp-1">{candidate.profilePrompts[0].answer}</p>
              </div>
            )}
          </div>
          <button
            className="pointer-events-auto bg-white/20 hover:bg-white/30 rounded-full p-2 transition ml-2 shrink-0"
            onClick={(e) => { e.stopPropagation(); onInfo(); }}
          >
            <Info size={18} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
