import { useState } from 'react';
import { X, ArrowRight } from 'lucide-react';

const STEPS = [
  {
    title: 'Welcome to Waplike!',
    text: 'Swipe right to like, left to pass. If you both like each other, it\'s a match!',
  },
  {
    title: 'Stay Safe',
    text: 'Use the Safety Check feature before meeting someone in person. You can set an emergency contact.',
  },
  {
    title: 'Go Premium',
    text: 'Unlock unlimited swipes, see who likes you, use Super Likes, and boost your profile.',
  },
];

export default function OnboardingModal({ onClose }) {
  const [step, setStep] = useState(0);

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>

        <div className="flex justify-center mb-4">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-6 bg-primary' : 'w-2 bg-gray-200 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
          {STEPS[step].title}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-center text-sm mb-6">
          {STEPS[step].text}
        </p>

        <button
          onClick={() => (step < STEPS.length - 1 ? setStep(step + 1) : onClose())}
          className="w-full bg-primary text-white font-medium rounded-lg py-3 flex items-center justify-center gap-2 hover:bg-primary-dark transition"
        >
          {step < STEPS.length - 1 ? 'Next' : 'Get Started'} <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
