'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface IntroSequenceProps {
  characterName: string;
  onComplete: () => void;
}

const INTRO_KEY = 'lifeos_intro_date';

function shouldShowIntro(): boolean {
  if (typeof window === 'undefined') return false;
  const last = localStorage.getItem(INTRO_KEY);
  const today = new Date().toISOString().slice(0, 10);
  return last !== today;
}

function markIntroShown() {
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem(INTRO_KEY, today);
}

export function useIntroGate(characterName: string) {
  const [show, setShow] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setShow(shouldShowIntro());
    setChecked(true);
  }, []);

  function dismiss() {
    markIntroShown();
    setShow(false);
  }

  return { show: checked && show, dismiss };
}

// Individual letter animation
function GlitchLetter({ char, delay }: { char: string; delay: number }) {
  return (
    <motion.span
      style={{ display: 'inline-block', position: 'relative' }}
      initial={{ opacity: 0, y: 8, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {char}
    </motion.span>
  );
}

export default function IntroSequence({ characterName, onComplete }: IntroSequenceProps) {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'scan' | 'exit'>('enter');
  const [visible, setVisible] = useState(true);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 1400);
    const t2 = setTimeout(() => setPhase('scan'), 2800);
    const t3 = setTimeout(() => setPhase('exit'), 3500);
    const t4 = setTimeout(() => {
      setVisible(false);
      onCompleteRef.current();
    }, 4200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wordmark = 'LIFE.OS';
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: '#07070d' }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.06, filter: 'blur(20px)' }}
          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Background glow */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === 'exit' ? 0 : 1 }}
            transition={{ duration: 1.2, delay: 0.4 }}
            style={{
              background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(109,40,217,0.12) 0%, transparent 70%)',
            }}
          />

          {/* Grid overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(rgba(139,92,246,0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(139,92,246,0.03) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
              maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 40%, transparent 100%)',
            }}
          />

          {/* Scan line */}
          <AnimatePresence>
            {phase === 'scan' && (
              <motion.div
                className="absolute left-0 right-0 h-px pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.8) 20%, rgba(167,139,250,1) 50%, rgba(139,92,246,0.8) 80%, transparent 100%)',
                  boxShadow: '0 0 20px rgba(139,92,246,0.6), 0 0 40px rgba(139,92,246,0.3)',
                  top: '50%',
                }}
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: [0, 1, 1, 0] }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
              />
            )}
          </AnimatePresence>

          {/* Main content */}
          <div className="relative flex flex-col items-center gap-6 select-none">
            {/* System label */}
            <motion.div
              className="flex items-center gap-3"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: phase === 'exit' ? 0 : 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <motion.div
                className="w-1 h-1 rounded-full"
                style={{ background: 'rgba(139,92,246,0.9)' }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
              <span
                className="font-mono text-[10px] tracking-[0.5em] uppercase"
                style={{ color: 'rgba(139,92,246,0.5)' }}
              >
                SYSTEM BOOT
              </span>
            </motion.div>

            {/* LIFE.OS Wordmark */}
            <motion.div
              animate={{
                scale: phase === 'exit' ? 1.15 : 1,
                opacity: phase === 'exit' ? 0 : 1,
                filter: phase === 'exit' ? 'blur(12px)' : 'blur(0px)',
              }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            >
              <h1
                className="font-black font-mono tracking-[0.15em]"
                style={{
                  fontSize: 'clamp(3rem, 10vw, 6rem)',
                  background: 'linear-gradient(135deg, rgba(226,226,236,1) 0%, rgba(167,139,250,0.9) 50%, rgba(139,92,246,0.7) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  textShadow: 'none',
                  filter: 'drop-shadow(0 0 30px rgba(139,92,246,0.35))',
                }}
              >
                {wordmark.split('').map((char, i) => (
                  <GlitchLetter key={i} char={char} delay={0.3 + i * 0.06} />
                ))}
              </h1>
            </motion.div>

            {/* Subtitle */}
            <motion.p
              className="font-mono text-[11px] tracking-[0.45em] uppercase"
              style={{ color: 'rgba(139,92,246,0.45)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: phase === 'enter' ? 0 : phase === 'exit' ? 0 : 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              Personal Operating System
            </motion.p>

            {/* Divider */}
            <motion.div
              className="w-32 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.4), transparent)' }}
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: phase === 'enter' ? 0 : 1, opacity: phase === 'exit' ? 0 : 0.6 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            />

            {/* User info */}
            <motion.div
              className="flex flex-col items-center gap-2"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: phase === 'enter' ? 0 : phase === 'exit' ? 0 : 1, y: phase === 'enter' ? 6 : 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <span
                className="font-mono text-[10px] tracking-[0.35em] uppercase"
                style={{ color: 'rgba(226,226,236,0.35)' }}
              >
                {today}
              </span>
              {characterName && (
                <span
                  className="font-mono text-[11px] tracking-[0.3em] uppercase"
                  style={{ color: 'rgba(226,226,236,0.55)' }}
                >
                  Welcome back, {characterName}
                </span>
              )}
            </motion.div>

            {/* Loading bar */}
            <motion.div
              className="w-48 h-px overflow-hidden rounded-full"
              style={{ background: 'rgba(139,92,246,0.1)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: phase === 'enter' ? 0 : phase === 'exit' ? 0 : 1 }}
              transition={{ duration: 0.4 }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, rgba(109,40,217,0.8), rgba(167,139,250,1))' }}
                initial={{ width: '0%' }}
                animate={{ width: phase === 'exit' ? '100%' : phase === 'scan' ? '85%' : phase === 'hold' ? '60%' : '0%' }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              />
            </motion.div>

            {/* Status text */}
            <motion.span
              className="font-mono text-[9px] tracking-[0.4em] uppercase"
              style={{ color: 'rgba(139,92,246,0.3)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: phase === 'hold' || phase === 'scan' ? 1 : 0 }}
              transition={{ duration: 0.4 }}
            >
              {phase === 'scan' ? 'READY' : 'INITIALIZING...'}
            </motion.span>
          </div>

          {/* Corner decorations */}
          {['top-4 left-4', 'top-4 right-4', 'bottom-4 left-4', 'bottom-4 right-4'].map((pos, i) => (
            <motion.div
              key={i}
              className={`absolute ${pos}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: phase === 'exit' ? 0 : 0.4 }}
              transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
            >
              <div
                className="w-4 h-4"
                style={{
                  borderTop: i < 2 ? '1px solid rgba(139,92,246,0.4)' : 'none',
                  borderBottom: i >= 2 ? '1px solid rgba(139,92,246,0.4)' : 'none',
                  borderLeft: i % 2 === 0 ? '1px solid rgba(139,92,246,0.4)' : 'none',
                  borderRight: i % 2 === 1 ? '1px solid rgba(139,92,246,0.4)' : 'none',
                }}
              />
            </motion.div>
          ))}

          {/* Skip hint */}
          <motion.button
            className="absolute bottom-6 right-6 font-mono text-[9px] tracking-[0.3em] uppercase cursor-pointer"
            style={{ color: 'rgba(139,92,246,0.25)', background: 'none', border: 'none' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 1.5 }}
            onClick={() => { markIntroShown(); setVisible(false); onComplete(); }}
            whileHover={{ color: 'rgba(139,92,246,0.6)' } as never}
          >
            Skip →
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
