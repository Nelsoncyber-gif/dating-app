import { Delete } from 'lucide-react';

const EMOJI_CATEGORIES = {
  Smileys: ['😀', '😂', '🥰', '😍', '😘', '😉', '😊', '🙂', '😅', '😎', '🤔', '😢', '😭', '😡', '🥺', '😴', '🤯', '😱', '🥳', '😇'],
  Gestures: ['👍', '👎', '👏', '🙌', '🤝', '🙏', '💪', '✌️', '🤞', '👋', '🤙', '💅'],
  Hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💕', '💖', '💘', '💔'],
  Animals: ['🐶', '🐱', '🦊', '🐻', '🐼', '🐨', '🦁', '🐯', '🐸', '🐵'],
  Food: ['🍕', '🍔', '🍟', '🍦', '🍩', '🍰', '☕', '🍷', '🍹', '🍿'],
};

// "Stickers" are simplified here as large single emoji sent immediately as their own
// message, similar to how sticker packs behave in WhatsApp/Telegram, without needing
// external image assets.
const STICKERS = ['👍', '❤️', '😂', '🎉', '😢', '🔥', '🥳', '😱'];

export default function EmojiPicker({ onSelectEmoji, onBackspace, onSelectSticker }) {
  return (
    <div className="bg-white border-t border-gray-100 max-h-56 overflow-y-auto px-3 py-2">
      <p className="text-[10px] text-gray-400 font-semibold mb-1.5 uppercase tracking-wide">
        Quick stickers
      </p>
      <div className="flex gap-2 mb-3">
        {STICKERS.map((sticker) => (
          <button
            key={sticker}
            onClick={() => onSelectSticker(sticker)}
            className="text-3xl hover:scale-110 transition"
          >
            {sticker}
          </button>
        ))}
      </div>

      {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
        <div key={category} className="mb-2">
          <p className="text-[10px] text-gray-400 font-semibold mb-1 uppercase tracking-wide">
            {category}
          </p>
          <div className="grid grid-cols-8 gap-1">
            {emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onSelectEmoji(emoji)}
                className="text-xl py-1 hover:bg-gray-100 rounded transition"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={onBackspace}
        className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-500 border-t border-gray-100 pt-2 mt-1"
      >
        <Delete size={14} /> Backspace
      </button>
    </div>
  );
}
