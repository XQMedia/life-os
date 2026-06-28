'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getJournalEntries, getJournalEntryForDate, saveJournalEntry, generateId, today } from '@/lib/db';
import type { JournalEntry } from '@/lib/types';

const MOODS = [
  { value: 1, emoji: '😔', label: 'Rough', color: 'rgba(239,68,68,1)' },
  { value: 2, emoji: '😕', label: 'Meh', color: 'rgba(245,158,11,1)' },
  { value: 3, emoji: '😐', label: 'Okay', color: 'rgba(226,226,236,0.5)' },
  { value: 4, emoji: '😊', label: 'Good', color: 'rgba(59,130,246,1)' },
  { value: 5, emoji: '🔥', label: 'Epic', color: 'rgba(139,92,246,1)' },
];

const AI_PROMPTS = [
  "What's one thing you learned today that surprised you?",
  "What would you do differently if you repeated today?",
  "Name one person who helped you this week — how can you return the favor?",
  "What's the gap between where you are and where you want to be?",
  "What fear did you face today, even a small one?",
  "What decision is hardest for you right now?",
  "What are you tolerating that you shouldn't be?",
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export default function JournalClient() {
  const todayDate = today();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [allEntries, setAllEntries] = useState<JournalEntry[]>([]);
  const [viewing, setViewing] = useState<JournalEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiPrompt, setShowAiPrompt] = useState(false);

  const load = useCallback(async () => {
    const [todayEntry, all] = await Promise.all([
      getJournalEntryForDate(todayDate),
      getJournalEntries(),
    ]);
    setEntry(
      todayEntry ?? {
        id: generateId(),
        date: todayDate,
        mood: 3,
        intention: '',
        wins: '',
        challenges: '',
        gratitude: '',
        freeform: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
    );
    setAllEntries(all);
  }, [todayDate]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    if (!entry) return;
    setSaving(true);
    await saveJournalEntry({ ...entry, updatedAt: Date.now() });
    await load();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function update(field: keyof JournalEntry, value: string | number) {
    setEntry((e) => e ? { ...e, [field]: value } : e);
    setSaved(false);
  }

  function getRandomPrompt() {
    const p = AI_PROMPTS[Math.floor(Math.random() * AI_PROMPTS.length)];
    setAiPrompt(p);
    setShowAiPrompt(true);
  }

  const pastEntries = allEntries.filter((e) => e.date !== todayDate).slice(0, 10);

  if (!entry) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {/* Header */}
      <motion.div className="mb-8" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="font-mono text-[10px] tracking-[0.4em] uppercase mb-1" style={{ color: 'rgba(139,92,246,0.5)' }}>LIFE.OS / 10</div>
        <h1 className="font-black text-3xl tracking-tight mb-1" style={{ color: 'rgba(226,226,236,0.95)' }}>Journal</h1>
        <p className="font-mono text-[11px] tracking-wider" style={{ color: 'rgba(226,226,236,0.3)' }}>
          {formatDate(todayDate)}
        </p>
      </motion.div>

      {/* Mood selector */}
      <motion.div
        className="mb-8 p-5 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
      >
        <div className="font-mono text-[10px] tracking-[0.35em] uppercase mb-4" style={{ color: 'rgba(226,226,236,0.3)' }}>
          How are you feeling?
        </div>
        <div className="flex gap-3">
          {MOODS.map((m) => (
            <motion.button
              key={m.value}
              onClick={() => update('mood', m.value)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all duration-200"
              style={{
                background: entry.mood === m.value ? `${m.color.replace('1)', '0.15)')}` : 'rgba(255,255,255,0.02)',
                border: `1px solid ${entry.mood === m.value ? m.color.replace('1)', '0.5)') : 'rgba(255,255,255,0.05)'}`,
                boxShadow: entry.mood === m.value ? `0 0 16px ${m.color.replace('1)', '0.25)')}` : 'none',
              }}
            >
              <span style={{ fontSize: 22 }}>{m.emoji}</span>
              <span className="font-mono text-[9px] tracking-wider" style={{ color: entry.mood === m.value ? m.color : 'rgba(226,226,236,0.3)' }}>
                {m.label}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Journal sections */}
      {[
        { field: 'intention' as const, label: "Today's Intention", placeholder: "What's your focus for today? What will make it a win?", emoji: '🎯' },
        { field: 'wins' as const, label: 'Wins', placeholder: 'What went well? Big or small — celebrate it.', emoji: '✅' },
        { field: 'challenges' as const, label: 'Challenges', placeholder: 'What was hard? What are you working through?', emoji: '⚡' },
        { field: 'gratitude' as const, label: 'Gratitude', placeholder: "Three things you're grateful for right now.", emoji: '🙏' },
      ].map(({ field, label, placeholder, emoji }, i) => (
        <motion.div
          key={field}
          className="mb-5"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05 }}
        >
          <label className="flex items-center gap-2 font-mono text-[10px] tracking-[0.35em] uppercase mb-2" style={{ color: 'rgba(226,226,236,0.35)' }}>
            <span>{emoji}</span> {label}
          </label>
          <textarea
            value={entry[field] as string}
            onChange={(e) => update(field, e.target.value)}
            placeholder={placeholder}
            rows={3}
            className="input-glow w-full rounded-xl px-4 py-3.5 text-sm resize-none leading-relaxed transition-all"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(139,92,246,0.12)',
              color: 'rgba(226,226,236,0.8)',
            }}
          />
        </motion.div>
      ))}

      {/* AI Prompt section */}
      <motion.div
        className="mb-5"
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
      >
        <div className="flex items-center justify-between mb-2">
          <label className="flex items-center gap-2 font-mono text-[10px] tracking-[0.35em] uppercase" style={{ color: 'rgba(226,226,236,0.35)' }}>
            <span>✦</span> Free Notes
          </label>
          <motion.button
            onClick={getRandomPrompt}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
            className="font-mono text-[9px] tracking-[0.25em] uppercase px-3 py-1 rounded-lg"
            style={{
              background: 'rgba(109,40,217,0.12)',
              border: '1px solid rgba(139,92,246,0.2)',
              color: 'rgba(139,92,246,0.7)',
            }}
          >
            ✦ AI Prompt
          </motion.button>
        </div>

        <AnimatePresence>
          {showAiPrompt && (
            <motion.div
              className="mb-3 px-4 py-3 rounded-xl flex items-start gap-3"
              style={{ background: 'rgba(109,40,217,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
            >
              <span style={{ color: 'rgba(139,92,246,0.7)', fontSize: 14 }}>✦</span>
              <p className="text-sm leading-relaxed flex-1" style={{ color: 'rgba(226,226,236,0.65)' }}>{aiPrompt}</p>
              <button onClick={() => setShowAiPrompt(false)} style={{ color: 'rgba(226,226,236,0.3)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>×</button>
            </motion.div>
          )}
        </AnimatePresence>

        <textarea
          value={entry.freeform}
          onChange={(e) => update('freeform', e.target.value)}
          placeholder="Anything else on your mind..."
          rows={5}
          className="input-glow w-full rounded-xl px-4 py-3.5 text-sm resize-none leading-relaxed transition-all"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(139,92,246,0.12)',
            color: 'rgba(226,226,236,0.8)',
          }}
        />
      </motion.div>

      {/* Save button */}
      <motion.button
        onClick={handleSave}
        disabled={saving}
        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
        className="w-full py-4 rounded-2xl font-mono text-xs tracking-[0.3em] uppercase font-bold mb-12 transition-all"
        style={{
          background: saved
            ? 'rgba(16,185,129,0.2)'
            : 'linear-gradient(135deg, rgba(109,40,217,1), rgba(139,92,246,0.8))',
          border: saved ? '1px solid rgba(16,185,129,0.4)' : 'none',
          color: saved ? 'rgba(16,185,129,1)' : 'white',
          boxShadow: saved ? 'none' : '0 0 24px rgba(109,40,217,0.3)',
        }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
      >
        {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save Entry'}
      </motion.button>

      {/* Past entries */}
      {pastEntries.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
          <div className="font-mono text-[10px] tracking-[0.35em] uppercase mb-4" style={{ color: 'rgba(226,226,236,0.2)' }}>
            Past Entries
          </div>
          <div className="space-y-2">
            {pastEntries.map((e) => {
              const mood = MOODS.find((m) => m.value === e.mood);
              return (
                <motion.button
                  key={e.id}
                  onClick={() => setViewing(e)}
                  whileHover={{ x: 4 }}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-left"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <span style={{ fontSize: 18 }}>{mood?.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[11px] tracking-wider" style={{ color: 'rgba(226,226,236,0.6)' }}>
                      {formatDate(e.date).split(',')[0]}
                    </div>
                    {e.intention && (
                      <div className="text-xs truncate mt-0.5" style={{ color: 'rgba(226,226,236,0.3)' }}>{e.intention}</div>
                    )}
                  </div>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.3 }}>
                    <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Past entry viewer modal */}
      <AnimatePresence>
        {viewing && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 py-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }} onClick={() => setViewing(null)} />
            <motion.div
              className="relative w-full max-w-lg rounded-3xl p-6 max-h-[80vh] overflow-y-auto"
              style={{ background: 'rgba(7,7,13,0.99)', border: '1px solid rgba(139,92,246,0.2)' }}
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="font-black text-lg" style={{ color: 'rgba(226,226,236,0.9)' }}>{formatDate(viewing.date).split(',')[0]}</div>
                  <div className="font-mono text-[10px] tracking-wider" style={{ color: 'rgba(226,226,236,0.3)' }}>{formatDate(viewing.date)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 22 }}>{MOODS.find((m) => m.value === viewing.mood)?.emoji}</span>
                  <button onClick={() => setViewing(null)} style={{ color: 'rgba(226,226,236,0.4)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}>×</button>
                </div>
              </div>
              {[
                { key: 'intention', label: '🎯 Intention' },
                { key: 'wins', label: '✅ Wins' },
                { key: 'challenges', label: '⚡ Challenges' },
                { key: 'gratitude', label: '🙏 Gratitude' },
                { key: 'freeform', label: '✦ Notes' },
              ].map(({ key, label }) => viewing[key as keyof JournalEntry] ? (
                <div key={key} className="mb-4">
                  <div className="font-mono text-[10px] tracking-widest uppercase mb-1.5" style={{ color: 'rgba(226,226,236,0.25)' }}>{label}</div>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(226,226,236,0.65)' }}>{viewing[key as keyof JournalEntry] as string}</p>
                </div>
              ) : null)}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
