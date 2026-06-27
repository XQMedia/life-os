'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getCharacter, saveCharacter } from '@/lib/db';
import type { Character } from '@/lib/types';
import InitialsBadge from './InitialsBadge';

export default function CharacterGate() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [exiting, setExiting] = useState(false);
  const [form, setForm] = useState<Character>({ name: '', avatar: '', dream: '', class: '' });

  useEffect(() => {
    getCharacter().then((c) => {
      if (c) router.replace('/dashboard');
      else setChecking(false);
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.dream.trim()) return;
    setExiting(true);
    // Let exit animation run, then save + navigate
    await new Promise((r) => setTimeout(r, 500));
    await saveCharacter({ ...form, avatar: form.name.slice(0, 2).toUpperCase() });
    router.push('/dashboard');
  }

  if (checking) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <span className="font-mono text-xs tracking-widest" style={{ color: 'rgba(139,92,246,0.4)' }}>
          INITIALIZING...
        </span>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          className="relative min-h-dvh flex flex-col items-center justify-center px-5 py-16 overflow-hidden"
          style={{ background: '#07070d' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          {/* ── Animated background orbs ─────────────────────────────────── */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              className="orb-a absolute rounded-full"
              style={{
                width: '60vw',
                height: '60vw',
                top: '-20vw',
                left: '-10vw',
                background: 'radial-gradient(circle, rgba(109,40,217,0.18) 0%, rgba(109,40,217,0.04) 55%, transparent 70%)',
                filter: 'blur(40px)',
              }}
            />
            <div
              className="orb-b absolute rounded-full"
              style={{
                width: '50vw',
                height: '50vw',
                bottom: '-15vw',
                right: '-5vw',
                background: 'radial-gradient(circle, rgba(139,92,246,0.14) 0%, rgba(109,40,217,0.04) 55%, transparent 70%)',
                filter: 'blur(50px)',
              }}
            />
            <div
              className="orb-c absolute rounded-full"
              style={{
                width: '40vw',
                height: '40vw',
                top: '40%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'radial-gradient(circle, rgba(167,139,250,0.07) 0%, transparent 65%)',
                filter: 'blur(60px)',
              }}
            />
            {/* Fine grid overlay */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(139,92,246,0.025) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(139,92,246,0.025) 1px, transparent 1px)
                `,
                backgroundSize: '48px 48px',
              }}
            />
          </div>

          {/* ── Form card ───────────────────────────────────────────────── */}
          <motion.div
            className="relative w-full max-w-[440px] z-10"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          >
            {/* System label */}
            <motion.div
              className="flex items-center gap-3 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="w-1 h-1 rounded-full" style={{ background: 'rgba(139,92,246,0.7)' }} />
              <span
                className="font-mono text-[10px] tracking-[0.4em] uppercase"
                style={{ color: 'rgba(139,92,246,0.55)' }}
              >
                LIFE.OS / INITIALIZE
              </span>
              <div className="flex-1 h-px" style={{ background: 'rgba(139,92,246,0.15)' }} />
            </motion.div>

            {/* Heading */}
            <motion.h1
              className="font-black leading-none tracking-tighter mb-10"
              style={{
                fontSize: 'clamp(2.4rem, 6vw, 3.5rem)',
                color: 'rgba(226,226,236,0.95)',
                letterSpacing: '-0.04em',
              }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              CREATE YOUR<br />
              <span
                style={{
                  background: 'linear-gradient(90deg, rgba(167,139,250,1) 0%, rgba(139,92,246,0.7) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                CHARACTER
              </span>
            </motion.h1>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Initials badge + Name — side by side */}
              <div className="flex items-center gap-4">
                <InitialsBadge name={form.name} size="lg" />
                <div className="flex-1">
                  <label
                    className="block font-mono text-[10px] tracking-[0.25em] uppercase mb-2"
                    style={{ color: 'rgba(226,226,236,0.3)' }}
                  >
                    Name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Your name"
                    required
                    maxLength={40}
                    className="input-glow w-full rounded-xl px-4 py-3 text-sm text-white/90 placeholder:text-white/20 transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(139,92,246,0.15)',
                    }}
                  />
                </div>
              </div>

              {/* Class */}
              <div>
                <label
                  className="block font-mono text-[10px] tracking-[0.25em] uppercase mb-2"
                  style={{ color: 'rgba(226,226,236,0.3)' }}
                >
                  Class
                </label>
                <input
                  type="text"
                  value={form.class}
                  onChange={(e) => setForm((f) => ({ ...f, class: e.target.value }))}
                  placeholder="e.g. Student, Founder, Builder, Designer"
                  maxLength={40}
                  className="input-glow w-full rounded-xl px-4 py-3 text-sm text-white/90 placeholder:text-white/20 transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(139,92,246,0.15)',
                  }}
                />
              </div>

              {/* Dream */}
              <div>
                <label
                  className="block font-mono text-[10px] tracking-[0.25em] uppercase mb-2"
                  style={{ color: 'rgba(226,226,236,0.3)' }}
                >
                  Dream
                </label>
                <textarea
                  value={form.dream}
                  onChange={(e) => setForm((f) => ({ ...f, dream: e.target.value }))}
                  placeholder="What are you building toward?"
                  required
                  maxLength={200}
                  rows={3}
                  className="input-glow w-full rounded-xl px-4 py-3 text-sm text-white/90 placeholder:text-white/20 transition-all resize-none"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(139,92,246,0.15)',
                  }}
                />
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={!form.name.trim() || !form.dream.trim()}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.975 }}
                className="relative w-full py-4 rounded-xl font-black tracking-widest text-sm uppercase overflow-hidden disabled:opacity-40 disabled:pointer-events-none"
                style={{
                  background: 'linear-gradient(135deg, rgba(109,40,217,1) 0%, rgba(139,92,246,0.85) 100%)',
                  color: 'rgba(255,255,255,0.95)',
                  boxShadow: '0 0 0 1px rgba(139,92,246,0.4), 0 0 30px rgba(109,40,217,0.35), 0 0 60px rgba(109,40,217,0.12)',
                  letterSpacing: '0.2em',
                }}
                transition={{ duration: 0.15 }}
              >
                {/* Shimmer layer */}
                <span
                  className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.07) 50%, transparent 100%)',
                  }}
                />
                BEGIN YOUR JOURNEY
              </motion.button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
