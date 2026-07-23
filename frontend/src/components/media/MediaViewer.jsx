import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function MediaViewer({ items, currentIndex = 0, onClose }) {
  const [index, setIndex] = useState(currentIndex);
  const [isLoading, setIsLoading] = useState(true);

  const current = items[index];

  useEffect(() => {
    setIsLoading(true);
    const img = new Image();
    img.src = current.url;
    img.onload = () => setIsLoading(false);
  }, [current.url]);

  const goToPrevious = () => {
    setIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
    setIsLoading(true);
  };

  const goToNext = () => {
    setIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
    setIsLoading(true);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!current) return null;

  const isVideo = current.type === 'video' || /\.(mp4|webm|mov)$/i.test(current.url);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-black/80">
        <div className="text-white text-sm">
          {index + 1} / {items.length}
        </div>
        <button onClick={onClose} className="text-white/80 hover:text-white p-1">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {isVideo ? (
          <video src={current.url} className="max-w-full max-h-full object-contain" controls autoPlay />
        ) : (
          <img
            src={current.url}
            alt=""
            className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${
              isLoading ? 'opacity-0' : 'opacity-100'
            }`}
          />
        )}

        {items.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-3 transition"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-3 transition"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}
      </div>

      {current.caption && (
        <div className="bg-black/80 px-4 py-3">
          <p className="text-white text-sm text-center">{current.caption}</p>
        </div>
      )}
    </div>
  );
}
