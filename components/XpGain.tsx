'use client';

import { useEffect, useState } from 'react';

interface XpGainProps {
  amount: number;
  onDone: () => void;
}

export default function XpGain({ amount, onDone }: XpGainProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      onDone();
    }, 1500);
    return () => clearTimeout(t);
  }, [onDone]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center"
      aria-hidden
    >
      <span
        className="animate-xp-float font-mono font-black tracking-widest"
        style={{
          fontSize: '2.5rem',
          color: 'rgba(167,139,250,1)',
          textShadow: '0 0 20px rgba(139,92,246,0.9), 0 0 40px rgba(139,92,246,0.5)',
        }}
      >
        +{amount} XP
      </span>
    </div>
  );
}
