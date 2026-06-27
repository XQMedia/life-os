'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { addQuest, generateId, today } from '@/lib/db';
import type { Quest } from '@/lib/types';

interface CheckInModalProps {
  existingDailies: Quest[]; // incomplete daily quests to optionally focus on
  onDismiss: () => void;
}

export default function CheckInModal({ existingDailies, onDismiss }: CheckInModalProps) {
  const [input, setInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [done, setDone] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) { onDismiss(); return; }
    setAdding(true);
    const quest: Quest = {
      id: generateId(),
      title: input.trim(),
      description: '',
      isMainQuest: false,
      isComplete: false,
      repeatsDaily: true,
      createdAt: Date.now(),
    };
    await addQuest(quest);
    setDone(true);
    setTimeout(onDismiss, 600);
  }

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          className="fixed inset-0 z-[150] flex items-center justify-center p-4"
          style={{ background: 'rgba(7,7,13,0.88)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="absolute inset-0 backdrop-blur-md" />

          <motion.div
            className="relative z-10 w-full max-w-md"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{
              background: 'linear-gradient(160deg, rgba(15,10,32,0.98) 0%, rgba(8,5,20,0.99) 100%)',
              border: '1px solid rgba(139,92,246,0.2)',
              borderRadius: '20px',
              boxShadow: '0 0 0 1px rgba(139,92,246,0.06), 0 32px 80px rgba(0,0,0,0.7), 0 0 80px rgba(139,92,246,0.06)',
            }}
          >
            {/* Top label */}
            <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid rgba(139,92,246,0.08)' }}>
              <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: 'rgba(139,92,246,0.5)' }}>
                DAILY BRIEFING / {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}
              </p>
              <h2 className="font-black text-xl tracking-tight" style={{ color: 'rgba(226,226,236,0.95)' }}>
                What's today's mission?
              </h2>
              <p className="text-sm mt-1" style={{ color: 'rgba(226,226,236,0.35)' }}>
                Set a daily quest or skip — your call.
              </p>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Existing incomplete dailies — quick select */}
              {existingDailies.length > 0 && (
                <div>
                  <p className="font-mono text-[9px] tracking-[0.25em] uppercase mb-2" style={{ color: 'rgba(139,92,246,0.4)' }}>
                    ACTIVE DAILIES
                  </p>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {existingDailies.slice(0, 5).map((q) => (
                      <div
                        key={q.id}
                        className="flex items-center gap-3 rounded-lg px-3 py-2"
                        style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.1)' }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'rgba(139,92,246,0.5)' }} />
                        <span className="text-xs" style={{ color: 'rgba(226,226,236,0.65)' }}>{q.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New quest input */}
              <form onSubmit={handleAdd}>
                <label className="block font-mono text-[9px] tracking-[0.25em] uppercase mb-2" style={{ color: 'rgba(226,226,236,0.3)' }}>
                  ADD A DAILY QUEST
                </label>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="e.g. Practice guitar for 30 min..."
                  autoFocus
                  maxLength={80}
                  className="input-glow w-full rounded-xl px-4 py-3 text-sm placeholder:opacity-20 transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(139,92,246,0.15)',
                    color: 'rgba(226,226,236,0.88)',
                  }}
                />

                <div className="flex gap-3 mt-4">
                  <motion.button
                    type="submit"
                    disabled={adding}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex-1 py-2.5 rounded-xl font-mono font-bold text-[11px] tracking-[0.2em] uppercase disabled:opacity-50"
                    style={{
                      background: input.trim()
                        ? 'linear-gradient(135deg, rgba(109,40,217,0.9) 0%, rgba(139,92,246,0.7) 100%)'
                        : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${input.trim() ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
                      color: input.trim() ? 'rgba(255,255,255,0.9)' : 'rgba(226,226,236,0.4)',
                      boxShadow: input.trim() ? '0 0 20px rgba(109,40,217,0.2)' : 'none',
                      transition: 'all 0.2s',
                    }}
                  >
                    {adding ? 'ADDING...' : input.trim() ? "LET'S GO →" : 'ADD & GO →'}
                  </motion.button>

                  <button
                    type="button"
                    onClick={onDismiss}
                    className="px-4 py-2.5 rounded-xl font-mono text-[10px] tracking-[0.2em] uppercase transition-all"
                    style={{
                      border: '1px solid rgba(255,255,255,0.07)',
                      color: 'rgba(226,226,236,0.3)',
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(226,226,236,0.6)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(226,226,236,0.3)')}
                  >
                    SKIP
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
