'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const VARIANTS = [
  {
    top: 'remember what all of this is for.',
    cta: "don't give up. You can do this, kid :D",
  },
  {
    top: 'every decision you make today is a vote for this.',
    cta: "keep going. you're closer than you think.",
  },
  {
    top: 'this is the reason you wake up.',
    cta: "don't give up. You can do this, kid :D",
  },
  {
    top: 'when it gets hard — come back to this.',
    cta: "you chose this path. see it through.",
  },
];

export default function DreamReminder({ dream, forceShow, onClose }: { dream: string; forceShow?: boolean; onClose?: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (forceShow) { setVisible(true); return; }
  }, [forceShow]);

  useEffect(() => {
    const KEY = 'life_os_dream_reminder_date';
    const todayStr = new Date().toISOString().slice(0, 10);
    if (typeof window !== 'undefined' && localStorage.getItem(KEY) === todayStr) return;

    // Random delay: 45s–150s after mount so it feels organic
    const delay = 45_000 + Math.random() * 105_000;
    const t = setTimeout(() => {
      setVisible(true);
      if (typeof window !== 'undefined') localStorage.setItem(KEY, todayStr);
    }, delay);

    return () => clearTimeout(t);
  }, []);

  function handleClose() {
    setVisible(false);
    onClose?.();
  }

  const msg = VARIANTS[Math.floor(Date.now() / 86_400_000) % VARIANTS.length];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="dream-reminder"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: 'rgba(4,2,12,0.94)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="relative max-w-md w-full mx-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient glow behind content */}
            <div className="pointer-events-none absolute inset-0 -z-10" style={{
              background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(109,40,217,0.18) 0%, transparent 70%)',
              filter: 'blur(40px)',
              transform: 'scale(1.6)',
            }} />

            {/* Label */}
            <p className="font-mono text-[9px] tracking-[0.55em] uppercase mb-8" style={{ color: 'rgba(139,92,246,0.45)' }}>
              LIFE.OS / FINAL DESTINATION
            </p>

            {/* Message */}
            <p className="text-sm font-light italic mb-5 leading-relaxed" style={{ color: 'rgba(226,226,236,0.45)' }}>
              {msg.top}
            </p>

            {/* The Dream — hero */}
            <p className="font-black leading-tight tracking-tight mb-5" style={{
              fontSize: 'clamp(1.6rem, 4vw, 2.6rem)',
              color: 'rgba(226,226,236,0.97)',
              textShadow: '0 0 30px rgba(139,92,246,0.7), 0 0 70px rgba(109,40,217,0.35), 0 0 120px rgba(109,40,217,0.15)',
            }}>
              {dream}
            </p>

            {/* CTA */}
            <p className="text-sm italic mb-10" style={{ color: 'rgba(167,139,250,0.65)' }}>
              {msg.cta}
            </p>

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleClose}
              className="px-8 py-2.5 rounded-full font-mono text-[10px] tracking-[0.35em] uppercase transition-all"
              style={{
                background: 'rgba(109,40,217,0.2)',
                border: '1px solid rgba(139,92,246,0.28)',
                color: 'rgba(167,139,250,0.8)',
                boxShadow: '0 0 20px rgba(109,40,217,0.15)',
              }}
            >
              I REMEMBER
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
