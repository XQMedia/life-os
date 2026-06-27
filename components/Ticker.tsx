'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const MESSAGES = [
  'ALL SYSTEMS OPERATIONAL.',
  'SKILL TREE EXPANDING.',
  'MAIN QUEST IN PROGRESS.',
  'CONSISTENCY EXCEEDS INTENSITY.',
  'EXPERIENCE POINTS ACCUMULATING.',
  'NEXT LEVEL: WITHIN REACH.',
  'CHARACTER GROWTH DETECTED.',
  'STAY ON MISSION.',
  'LOADING NEXT CHAPTER.',
  'SYNCHRONIZING LIFE DATA.',
];

export default function Ticker() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % MESSAGES.length);
    }, 4200);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="hidden md:flex items-center gap-2.5 px-4 py-2 rounded-lg overflow-hidden"
      style={{
        background: 'rgba(139,92,246,0.05)',
        border: '1px solid rgba(139,92,246,0.1)',
        minWidth: '260px',
        maxWidth: '320px',
      }}
    >
      <span className="ticker-dot w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'rgba(139,92,246,0.7)' }} />
      <div className="relative h-4 flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.span
            key={index}
            className="absolute inset-0 flex items-center font-mono text-[10px] tracking-[0.15em] truncate"
            style={{ color: 'rgba(226,226,236,0.35)' }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {MESSAGES[index]}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
