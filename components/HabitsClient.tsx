'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getHabits, addHabit, deleteHabit, toggleHabitDate, generateId, today } from '@/lib/db';
import type { Habit } from '@/lib/types';

const HABIT_COLORS = [
  'rgba(139,92,246,1)',
  'rgba(59,130,246,1)',
  'rgba(16,185,129,1)',
  'rgba(245,158,11,1)',
  'rgba(239,68,68,1)',
  'rgba(236,72,153,1)',
];

const HABIT_ICONS = ['⚡', '🏋️', '📚', '🧘', '💧', '🎯', '✍️', '🌅', '🏃', '🎨', '🎸', '💻'];

function habitCurrentStreak(habit: Habit): number {
  const sorted = [...habit.completedDates].sort().reverse();
  if (!sorted.length) return 0;
  let streak = 0;
  let cur = new Date();
  for (let i = 0; i < 60; i++) {
    const d = cur.toISOString().slice(0, 10);
    if (sorted.includes(d)) {
      streak++;
      cur = new Date(cur.getTime() - 86_400_000);
    } else if (i === 0) {
      // today not done yet, start checking from yesterday
      cur = new Date(cur.getTime() - 86_400_000);
    } else {
      break;
    }
  }
  return streak;
}

// Last N days for heatmap
function lastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function CompletionRing({ habit, size = 56 }: { habit: Habit; size?: number }) {
  const todayStr = today();
  const done = habit.completedDates.includes(todayStr);
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={habit.color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: done ? 0 : circ * 0.85 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: done ? `drop-shadow(0 0 6px ${habit.color})` : 'none' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span style={{ fontSize: size * 0.35 }}>{habit.icon}</span>
      </div>
    </div>
  );
}

function Heatmap({ habit }: { habit: Habit }) {
  const days = lastNDays(91);
  // Pad so first day is Sunday
  const firstDay = new Date(days[0]).getDay();
  const padded = Array(firstDay).fill(null).concat(days);

  return (
    <div className="flex flex-wrap gap-0.5">
      {padded.map((d, i) =>
        d === null ? (
          <div key={`pad-${i}`} className="w-2.5 h-2.5 rounded-sm opacity-0" />
        ) : (
          <motion.div
            key={d}
            className="w-2.5 h-2.5 rounded-sm cursor-default"
            style={{
              background: habit.completedDates.includes(d)
                ? habit.color
                : 'rgba(255,255,255,0.05)',
              boxShadow: habit.completedDates.includes(d)
                ? `0 0 4px ${habit.color}60`
                : 'none',
            }}
            title={d}
            whileHover={{ scale: 1.4 }}
          />
        )
      )}
    </div>
  );
}

export default function HabitsClient() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: '', icon: '⚡', color: HABIT_COLORS[0] });
  const [expanded, setExpanded] = useState<string | null>(null);
  const todayStr = today();

  const load = useCallback(async () => {
    setHabits(await getHabits());
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    await addHabit({
      id: generateId(),
      name: form.name.trim(),
      icon: form.icon,
      color: form.color,
      completedDates: [],
      createdAt: Date.now(),
    });
    setForm({ name: '', icon: '⚡', color: HABIT_COLORS[0] });
    setShowNew(false);
    await load();
  }

  async function handleToggle(id: string) {
    const updated = await toggleHabitDate(id, todayStr);
    if (updated) setHabits((h) => h.map((x) => (x.id === id ? updated : x)));
  }

  async function handleDelete(id: string) {
    await deleteHabit(id);
    await load();
  }

  const doneToday = habits.filter((h) => h.completedDates.includes(todayStr)).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-1">
          <span className="font-mono text-[10px] tracking-[0.4em] uppercase" style={{ color: 'rgba(139,92,246,0.5)' }}>LIFE.OS / 08</span>
        </div>
        <div className="flex items-end justify-between">
          <h1 className="font-black text-3xl tracking-tight" style={{ color: 'rgba(226,226,236,0.95)' }}>
            Habit Tracker
          </h1>
          <div className="text-right">
            <div className="font-mono text-2xl font-bold" style={{ color: 'rgba(139,92,246,0.9)' }}>
              {doneToday}<span className="text-sm opacity-50">/{habits.length}</span>
            </div>
            <div className="font-mono text-[10px] tracking-widest uppercase" style={{ color: 'rgba(226,226,236,0.3)' }}>Today</div>
          </div>
        </div>
      </motion.div>

      {/* Progress bar */}
      {habits.length > 0 && (
        <motion.div
          className="mb-8 h-1.5 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.06)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, rgba(109,40,217,1), rgba(167,139,250,1))' }}
            initial={{ width: '0%' }}
            animate={{ width: `${habits.length ? (doneToday / habits.length) * 100 : 0}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          />
        </motion.div>
      )}

      {/* Completion rings row */}
      {habits.length > 0 && (
        <motion.div
          className="flex gap-4 flex-wrap mb-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
        >
          {habits.map((h) => (
            <motion.button
              key={h.id}
              onClick={() => handleToggle(h.id)}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              className="flex flex-col items-center gap-1.5"
            >
              <CompletionRing habit={h} />
              <span className="font-mono text-[9px] tracking-wider" style={{ color: 'rgba(226,226,236,0.4)', maxWidth: 56, textAlign: 'center', lineHeight: 1.2 }}>
                {h.name.length > 8 ? h.name.slice(0, 7) + '…' : h.name}
              </span>
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Habit list */}
      <div className="space-y-3 mb-8">
        <AnimatePresence>
          {habits.map((habit, i) => {
            const done = habit.completedDates.includes(todayStr);
            const streak = habitCurrentStreak(habit);
            const isExp = expanded === habit.id;

            return (
              <motion.div
                key={habit.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                layout
              >
                <div
                  className="rounded-2xl overflow-hidden cursor-pointer"
                  style={{
                    background: done ? `${habit.color}10` : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${done ? habit.color + '40' : 'rgba(255,255,255,0.06)'}`,
                    transition: 'all 0.3s',
                  }}
                >
                  <div
                    className="flex items-center gap-4 px-5 py-4"
                    onClick={() => setExpanded(isExp ? null : habit.id)}
                  >
                    {/* Checkbox */}
                    <motion.button
                      onClick={(e) => { e.stopPropagation(); handleToggle(habit.id); }}
                      whileTap={{ scale: 0.85 }}
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: done ? habit.color : 'transparent',
                        border: `2px solid ${done ? habit.color : 'rgba(255,255,255,0.15)'}`,
                        boxShadow: done ? `0 0 12px ${habit.color}60` : 'none',
                        transition: 'all 0.2s',
                      }}
                    >
                      {done && (
                        <motion.svg width="10" height="10" viewBox="0 0 10 10" fill="none"
                          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400 }}>
                          <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </motion.svg>
                      )}
                    </motion.button>

                    <span style={{ fontSize: 20 }}>{habit.icon}</span>

                    <div className="flex-1 min-w-0">
                      <div
                        className="font-medium text-sm"
                        style={{
                          color: done ? 'rgba(226,226,236,0.6)' : 'rgba(226,226,236,0.9)',
                          textDecoration: done ? 'line-through' : 'none',
                        }}
                      >
                        {habit.name}
                      </div>
                      {streak > 0 && (
                        <div className="font-mono text-[10px] tracking-wider" style={{ color: 'rgba(245,158,11,0.7)' }}>
                          🔥 {streak} day streak
                        </div>
                      )}
                    </div>

                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: habit.color, opacity: done ? 1 : 0.3 }}
                    />
                  </div>

                  {/* Expanded heatmap */}
                  <AnimatePresence>
                    {isExp && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-4 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <div className="font-mono text-[9px] tracking-widest uppercase mb-3" style={{ color: 'rgba(226,226,236,0.25)' }}>
                            Last 91 days
                          </div>
                          <Heatmap habit={habit} />
                          <div className="mt-4 flex items-center justify-between">
                            <div className="font-mono text-[10px]" style={{ color: 'rgba(226,226,236,0.3)' }}>
                              {habit.completedDates.length} total completions
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(habit.id); }}
                              className="font-mono text-[10px] tracking-wider uppercase"
                              style={{ color: 'rgba(239,68,68,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {habits.length === 0 && (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
            <p className="font-mono text-sm" style={{ color: 'rgba(226,226,236,0.3)' }}>
              No habits yet. Build your first one.
            </p>
          </motion.div>
        )}
      </div>

      {/* Add button */}
      <motion.button
        onClick={() => setShowNew(true)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="w-full py-3.5 rounded-2xl font-mono text-xs tracking-[0.25em] uppercase font-bold"
        style={{
          background: 'rgba(109,40,217,0.12)',
          border: '1px solid rgba(139,92,246,0.25)',
          color: 'rgba(139,92,246,0.8)',
        }}
      >
        + New Habit
      </motion.button>

      {/* New habit modal */}
      <AnimatePresence>
        {showNew && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 py-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} onClick={() => setShowNew(false)} />
            <motion.div
              className="relative w-full max-w-md rounded-3xl p-6"
              style={{ background: 'rgba(7,7,13,0.98)', border: '1px solid rgba(139,92,246,0.25)' }}
              initial={{ y: 40, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            >
              <h2 className="font-black text-xl mb-6" style={{ color: 'rgba(226,226,236,0.95)' }}>New Habit</h2>
              <form onSubmit={handleAdd} className="space-y-5">
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Habit name"
                  required
                  className="input-glow w-full rounded-xl px-4 py-3 text-sm text-white/90 placeholder:text-white/20"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(139,92,246,0.2)' }}
                  autoFocus
                />
                <div>
                  <div className="font-mono text-[10px] tracking-widest uppercase mb-2" style={{ color: 'rgba(226,226,236,0.3)' }}>Icon</div>
                  <div className="flex flex-wrap gap-2">
                    {HABIT_ICONS.map((icon) => (
                      <button
                        key={icon} type="button"
                        onClick={() => setForm((f) => ({ ...f, icon }))}
                        className="w-9 h-9 rounded-xl text-lg flex items-center justify-center"
                        style={{
                          background: form.icon === icon ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${form.icon === icon ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.06)'}`,
                        }}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] tracking-widest uppercase mb-2" style={{ color: 'rgba(226,226,236,0.3)' }}>Color</div>
                  <div className="flex gap-2">
                    {HABIT_COLORS.map((color) => (
                      <button
                        key={color} type="button"
                        onClick={() => setForm((f) => ({ ...f, color }))}
                        className="w-7 h-7 rounded-full"
                        style={{
                          background: color,
                          outline: form.color === color ? `2px solid ${color}` : 'none',
                          outlineOffset: 2,
                          boxShadow: form.color === color ? `0 0 12px ${color}80` : 'none',
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowNew(false)}
                    className="flex-1 py-3 rounded-xl font-mono text-xs tracking-widest uppercase"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(226,226,236,0.4)' }}>
                    Cancel
                  </button>
                  <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    className="flex-1 py-3 rounded-xl font-mono text-xs tracking-widest uppercase font-bold"
                    style={{ background: 'linear-gradient(135deg, rgba(109,40,217,1), rgba(139,92,246,0.8))', color: 'white' }}>
                    Add Habit
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
