'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getAchievements, seedBuiltinAchievements, addAchievement, updateAchievement,
  deleteAchievement, generateId, getSkills, getProjects, getCourseLogEntries,
  getCharacter, addInventoryItem, today, skillTotalXP, skillLevel,
} from '@/lib/db';
import type { Achievement, InventoryItem } from '@/lib/types';
import Modal from './Modal';
import RevealSection from './RevealSection';

function ProgressRing({ value, max, size = 52 }: { value: number; max: number; size?: number }) {
  const pct = Math.min(1, value / Math.max(1, max));
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(139,92,246,0.1)" strokeWidth="3" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(139,92,246,0.7)" strokeWidth="3" strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fontSize="10" fontFamily="monospace" fill="rgba(167,139,250,0.85)">
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}

export default function AchievementsClient() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customForm, setCustomForm] = useState({ title: '', description: '', targetValue: '1' });
  const [saving, setSaving] = useState(false);
  const [addedToInventory, setAddedToInventory] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    await seedBuiltinAchievements();
    const [achievements, skills, projects, logs, character] = await Promise.all([
      getAchievements(),
      getSkills(),
      getProjects(),
      getCourseLogEntries(),
      getCharacter(),
    ]);

    // Auto-update built-in progress
    const updated = achievements.map((a) => {
      if (a.type !== 'builtin' || a.isComplete) return a;
      let progress = a.currentProgress;
      switch (a.builtinKey) {
        case 'streak_7':
        case 'streak_100':
          progress = character?.currentStreak ?? 0;
          break;
        case 'projects_10':
          progress = projects.length;
          break;
        case 'skill_level_5':
          progress = skills.length > 0 ? Math.max(...skills.map((s) => skillLevel(skillTotalXP(s)))) : 0;
          break;
        case 'course_logs_5':
          progress = logs.length;
          break;
        case 'quests_50':
          break;
      }
      const isComplete = progress >= a.targetValue;
      return { ...a, currentProgress: progress, isComplete, completedAt: isComplete && !a.completedAt ? Date.now() : a.completedAt };
    });
    setAchievements(updated);
    // Persist updated progress quietly
    await Promise.all(updated.map((a, i) => {
      if (a.currentProgress !== achievements[i].currentProgress || a.isComplete !== achievements[i].isComplete) {
        return updateAchievement(a);
      }
    }));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAddCustom(e: React.FormEvent) {
    e.preventDefault();
    if (!customForm.title.trim()) return;
    setSaving(true);
    const achievement: Achievement = {
      id: generateId(),
      title: customForm.title.trim(),
      description: customForm.description.trim(),
      type: 'custom',
      targetValue: Math.max(1, Number(customForm.targetValue)),
      currentProgress: 0,
      isComplete: false,
      createdAt: Date.now(),
    };
    await addAchievement(achievement);
    setAchievements((prev) => [...prev, achievement]);
    setCustomForm({ title: '', description: '', targetValue: '1' });
    setSaving(false);
    setShowAddCustom(false);
  }

  async function handleIncrementCustom(id: string) {
    const a = achievements.find((x) => x.id === id);
    if (!a || a.isComplete) return;
    const newProgress = Math.min(a.targetValue, a.currentProgress + 1);
    const isComplete = newProgress >= a.targetValue;
    const updated: Achievement = { ...a, currentProgress: newProgress, isComplete, completedAt: isComplete ? Date.now() : undefined };
    await updateAchievement(updated);
    setAchievements((prev) => prev.map((x) => x.id === id ? updated : x));
  }

  async function handleDeleteCustom(id: string) {
    await deleteAchievement(id);
    setAchievements((prev) => prev.filter((x) => x.id !== id));
  }

  async function handleAddToInventory(a: Achievement) {
    const item: InventoryItem = {
      id: generateId(),
      title: a.title,
      description: a.description,
      type: 'achievement',
      dateEarned: today(),
      createdAt: Date.now(),
    };
    await addInventoryItem(item);
    setAddedToInventory((prev) => new Set([...prev, a.id]));
  }

  const builtin = achievements.filter((a) => a.type === 'builtin');
  const custom = achievements.filter((a) => a.type === 'custom');
  const completed = achievements.filter((a) => a.isComplete).length;

  return (
    <div className="relative min-h-dvh">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div style={{ position: 'absolute', top: '-5%', left: '-10%', width: '45vw', height: '45vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.055) 0%, transparent 65%)', filter: 'blur(80px)' }} />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-5 py-8 space-y-10">

        {/* Header */}
        <RevealSection>
          <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-2" style={{ color: 'rgba(139,92,246,0.5)' }}>LIFE.OS / CHALLENGES</p>
          <h1 className="font-black tracking-tighter leading-none" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', color: 'rgba(226,226,236,0.95)' }}>ACHIEVEMENTS</h1>
          <p className="font-mono text-xs mt-2" style={{ color: 'rgba(226,226,236,0.25)' }}>
            {completed}/{achievements.length} UNLOCKED
          </p>
        </RevealSection>

        {/* Built-in achievements */}
        <RevealSection delay={0.03}>
          <p className="font-mono text-[10px] tracking-[0.3em] uppercase mb-4" style={{ color: 'rgba(139,92,246,0.4)' }}>CHALLENGES</p>
          <div className="space-y-3">
            {builtin.map((a) => (
              <motion.div key={a.id} layout
                className="rounded-2xl p-4 flex items-center gap-4"
                style={{
                  background: a.isComplete ? 'rgba(109,40,217,0.12)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${a.isComplete ? 'rgba(139,92,246,0.4)' : 'rgba(139,92,246,0.2)'}`,
                  opacity: 1,
                }}
              >
                <ProgressRing value={a.currentProgress} max={a.targetValue} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm" style={{ color: a.isComplete ? 'rgba(167,139,250,0.95)' : 'rgba(226,226,236,0.8)' }}>
                      {a.title}
                    </p>
                    {a.isComplete && (
                      <span className="font-mono text-[8px] tracking-[0.2em] uppercase px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(109,40,217,0.3)', color: 'rgba(167,139,250,0.9)', border: '1px solid rgba(139,92,246,0.4)' }}>
                        COMPLETE
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(226,226,236,0.35)' }}>{a.description}</p>
                  <p className="font-mono text-[9px] mt-1" style={{ color: 'rgba(139,92,246,0.4)' }}>
                    {a.currentProgress} / {a.targetValue}
                  </p>
                </div>
                {a.isComplete && !addedToInventory.has(a.id) && (
                  <motion.button
                    onClick={() => handleAddToInventory(a)}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg font-mono text-[9px] tracking-[0.15em] uppercase"
                    style={{ background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.3)', color: 'rgba(234,179,8,0.8)' }}
                  >
                    + INVENTORY
                  </motion.button>
                )}
                {addedToInventory.has(a.id) && (
                  <span className="flex-shrink-0 font-mono text-[9px]" style={{ color: 'rgba(34,197,94,0.6)' }}>✓ ADDED</span>
                )}
              </motion.div>
            ))}
          </div>
        </RevealSection>

        {/* Custom achievements */}
        <RevealSection delay={0.06}>
          <div className="flex items-center justify-between mb-4">
            <p className="font-mono text-[10px] tracking-[0.3em] uppercase" style={{ color: 'rgba(139,92,246,0.4)' }}>CUSTOM CHALLENGES</p>
            <motion.button
              onClick={() => setShowAddCustom(true)}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="px-4 py-1.5 rounded-lg font-mono text-[10px] tracking-[0.2em] uppercase"
              style={{ background: 'rgba(109,40,217,0.25)', border: '1px solid rgba(139,92,246,0.3)', color: 'rgba(167,139,250,0.9)' }}
            >
              + ADD CHALLENGE
            </motion.button>
          </div>
          <div className="space-y-3">
            <AnimatePresence>
              {custom.map((a) => (
                <motion.div key={a.id} layout
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8, scale: 0.97 }}
                  className="group rounded-2xl p-4 flex items-center gap-4"
                  style={{
                    background: a.isComplete ? 'rgba(109,40,217,0.12)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${a.isComplete ? 'rgba(139,92,246,0.4)' : 'rgba(139,92,246,0.2)'}`,
                  }}
                >
                  <ProgressRing value={a.currentProgress} max={a.targetValue} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm" style={{ color: a.isComplete ? 'rgba(167,139,250,0.95)' : 'rgba(226,226,236,0.8)' }}>
                        {a.title}
                      </p>
                      {a.isComplete && (
                        <span className="font-mono text-[8px] tracking-[0.2em] uppercase px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(109,40,217,0.3)', color: 'rgba(167,139,250,0.9)', border: '1px solid rgba(139,92,246,0.4)' }}>
                          COMPLETE
                        </span>
                      )}
                    </div>
                    {a.description && <p className="text-xs mt-0.5" style={{ color: 'rgba(226,226,236,0.35)' }}>{a.description}</p>}
                    <p className="font-mono text-[9px] mt-1" style={{ color: 'rgba(139,92,246,0.4)' }}>
                      {a.currentProgress} / {a.targetValue}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!a.isComplete && (
                      <motion.button
                        onClick={() => handleIncrementCustom(a.id)}
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        className="px-3 py-1.5 rounded-lg font-mono text-[10px] tracking-[0.1em] uppercase"
                        style={{ background: 'rgba(109,40,217,0.25)', border: '1px solid rgba(139,92,246,0.3)', color: 'rgba(167,139,250,0.9)' }}
                      >
                        +1
                      </motion.button>
                    )}
                    {a.isComplete && !addedToInventory.has(a.id) && (
                      <motion.button
                        onClick={() => handleAddToInventory(a)}
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        className="px-3 py-1.5 rounded-lg font-mono text-[9px] tracking-[0.1em] uppercase"
                        style={{ background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.3)', color: 'rgba(234,179,8,0.8)' }}
                      >
                        + INVENTORY
                      </motion.button>
                    )}
                    {addedToInventory.has(a.id) && (
                      <span className="font-mono text-[9px]" style={{ color: 'rgba(34,197,94,0.6)' }}>✓</span>
                    )}
                    <button
                      onClick={() => handleDeleteCustom(a.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded"
                      style={{ color: 'rgba(226,226,236,0.25)' }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(239,68,68,0.6)')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(226,226,236,0.25)')}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {custom.length === 0 && (
              <div className="py-10 text-center font-mono text-[10px] tracking-[0.2em]" style={{ color: 'rgba(226,226,236,0.12)' }}>
                NO CUSTOM CHALLENGES YET — CREATE YOUR OWN GOALS
              </div>
            )}
          </div>
        </RevealSection>

      </div>

      {/* Add Custom Challenge Modal */}
      {showAddCustom && (
        <Modal title="New Challenge" subtitle="ACHIEVEMENTS / CUSTOM" onClose={() => setShowAddCustom(false)}>
          <form onSubmit={handleAddCustom} className="space-y-4">
            <div>
              <label className="block font-mono text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: 'rgba(226,226,236,0.3)' }}>Title</label>
              <input type="text" value={customForm.title} onChange={(e) => setCustomForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Build 5 Side Projects" required maxLength={60} autoFocus
                className="input-glow w-full rounded-xl px-4 py-2.5 text-sm text-white/90 placeholder:text-white/20 transition-all"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.2)' }} />
            </div>
            <div>
              <label className="block font-mono text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: 'rgba(226,226,236,0.3)' }}>Description</label>
              <textarea value={customForm.description} onChange={(e) => setCustomForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What does this challenge involve?" rows={2} maxLength={200}
                className="input-glow w-full rounded-xl px-4 py-2.5 text-sm text-white/90 placeholder:text-white/20 transition-all resize-none"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.15)' }} />
            </div>
            <div>
              <label className="block font-mono text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: 'rgba(226,226,236,0.3)' }}>
                Target — <span style={{ color: 'rgba(167,139,250,0.7)' }}>{customForm.targetValue}</span>
              </label>
              <input type="number" min="1" value={customForm.targetValue} onChange={(e) => setCustomForm((f) => ({ ...f, targetValue: e.target.value }))}
                className="input-glow w-full rounded-xl px-4 py-2.5 text-sm text-white/90 transition-all"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.15)' }} />
            </div>
            <motion.button type="submit" disabled={saving || !customForm.title.trim()}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl font-mono font-bold text-xs tracking-[0.25em] uppercase transition-all disabled:opacity-40 disabled:pointer-events-none"
              style={{ background: 'linear-gradient(135deg, rgba(109,40,217,0.9) 0%, rgba(139,92,246,0.7) 100%)', color: 'rgba(255,255,255,0.9)', boxShadow: '0 0 20px rgba(109,40,217,0.25)' }}
            >
              {saving ? 'SAVING...' : 'CREATE CHALLENGE'}
            </motion.button>
          </form>
        </Modal>
      )}
    </div>
  );
}
