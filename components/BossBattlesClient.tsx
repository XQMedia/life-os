'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getBossBattles, addBossBattle, updateBossBattle, deleteBossBattle, generateId } from '@/lib/db';
import type { BossBattle } from '@/lib/types';
import RevealSection from './RevealSection';
import SectionLabel from './SectionLabel';
import Modal from './Modal';

function getCountdown(deadlineDate: string): { days: number; hours: number; urgent: boolean; expired: boolean } {
  const now = Date.now();
  const deadline = new Date(deadlineDate + 'T23:59:59').getTime();
  const diff = deadline - now;
  if (diff <= 0) return { days: 0, hours: 0, urgent: true, expired: true };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  return { days, hours, urgent: days < 3, expired: false };
}

function formatDate(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
}

export default function BossBattlesClient() {
  const [battles, setBattles] = useState<BossBattle[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', deadlineDate: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [celebrating, setCelebrating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBattles(await getBossBattles());
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setFormError('Title is required.'); return; }
    if (!form.deadlineDate) { setFormError('Deadline date is required.'); return; }
    setFormError('');
    setSaving(true);
    const battle: BossBattle = {
      id: generateId(),
      title: form.title.trim(),
      description: form.description.trim(),
      deadlineDate: form.deadlineDate,
      isDefeated: false,
      createdAt: Date.now(),
    };
    await addBossBattle(battle);
    setBattles((prev) => [...prev, battle]);
    setForm({ title: '', description: '', deadlineDate: '' });
    setSaving(false);
    setShowAdd(false);
  }

  async function handleDefeat(battle: BossBattle) {
    const updated = { ...battle, isDefeated: true };
    await updateBossBattle(updated);
    setCelebrating(battle.id);
    setBattles((prev) => prev.map((b) => (b.id === battle.id ? updated : b)));
    setTimeout(() => setCelebrating(null), 1500);
  }

  async function handleDelete(id: string) {
    await deleteBossBattle(id);
    setBattles((prev) => prev.filter((b) => b.id !== id));
  }

  const active = battles.filter((b) => !b.isDefeated).sort((a, b) => a.deadlineDate.localeCompare(b.deadlineDate));
  const defeated = battles.filter((b) => b.isDefeated);

  return (
    <div className="relative min-h-dvh">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div style={{ position: 'absolute', top: '-5%', left: '20%', width: '60vw', height: '60vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(239,68,68,0.05) 0%, transparent 65%)', filter: 'blur(100px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '-10%', width: '50vw', height: '50vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,40,217,0.06) 0%, transparent 65%)', filter: 'blur(80px)' }} />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-5 py-10 space-y-10">
        {/* Header */}
        <RevealSection>
          <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: 'rgba(239,68,68,0.55)' }}>LIFE.OS / THREAT BOARD</p>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <h1 className="font-black leading-none tracking-tighter" style={{ fontSize: 'clamp(2.2rem, 5vw, 3rem)', color: 'rgba(226,226,236,0.95)' }}>
              BOSS BATTLES
            </h1>
            <motion.button onClick={() => setShowAdd(true)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-[10px] tracking-[0.2em] uppercase"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: 'rgba(239,68,68,0.85)' }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              NEW BOSS
            </motion.button>
          </div>
        </RevealSection>

        {/* Active bosses */}
        <RevealSection delay={0.05}>
          <SectionLabel index="01" label={`Active Threats (${active.length})`} />
          {active.length === 0 ? (
            <div className="rounded-2xl p-12 text-center" style={{ background: 'rgba(255,255,255,0.015)', border: '1px dashed rgba(239,68,68,0.1)' }}>
              <p className="font-mono text-[11px] tracking-[0.2em] uppercase mb-2" style={{ color: 'rgba(226,226,236,0.15)' }}>NO ACTIVE THREATS.</p>
              <p className="font-mono text-[10px]" style={{ color: 'rgba(139,92,246,0.3)' }}>SPAWN A BOSS TO FIGHT.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {active.map((battle, i) => {
                const cd = getCountdown(battle.deadlineDate);
                const isDefeated = battle.isDefeated;
                const isCelebrating = celebrating === battle.id;
                return (
                  <motion.div key={battle.id} layout
                    className={`rounded-2xl p-6 ${cd.urgent && !isDefeated ? 'animate-urgent' : ''} ${isCelebrating ? 'animate-defeat' : ''}`}
                    style={{
                      background: cd.urgent
                        ? 'linear-gradient(135deg, rgba(40,8,8,0.95) 0%, rgba(25,5,5,0.98) 100%)'
                        : 'linear-gradient(135deg, rgba(18,10,30,0.9) 0%, rgba(10,6,20,0.95) 100%)',
                      border: `1px solid ${cd.urgent ? 'rgba(239,68,68,0.25)' : 'rgba(139,92,246,0.2)'}`,
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className="flex items-start gap-4 flex-wrap">
                      {/* Boss index badge */}
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-mono text-xs font-bold tracking-widest"
                        style={{
                          background: cd.urgent ? 'rgba(239,68,68,0.15)' : 'rgba(109,40,217,0.15)',
                          border: `1px solid ${cd.urgent ? 'rgba(239,68,68,0.3)' : 'rgba(139,92,246,0.25)'}`,
                          color: cd.urgent ? 'rgba(239,68,68,0.8)' : 'rgba(167,139,250,0.8)',
                        }}
                      >
                        B{String(i + 1).padStart(2, '0')}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-[10px] tracking-[0.25em] uppercase mb-1"
                          style={{ color: cd.urgent ? 'rgba(239,68,68,0.5)' : 'rgba(139,92,246,0.45)' }}>
                          {cd.expired ? 'DEADLINE PASSED' : cd.urgent ? 'CRITICAL — DEADLINE NEAR' : 'ACTIVE THREAT'}
                        </p>
                        <h3 className="font-black tracking-tight text-xl" style={{ color: 'rgba(226,226,236,0.92)' }}>{battle.title}</h3>
                        {battle.description && <p className="text-sm mt-1" style={{ color: 'rgba(226,226,236,0.4)' }}>{battle.description}</p>}

                        {/* Countdown */}
                        {!cd.expired && (
                          <div className="flex items-center gap-4 mt-4">
                            <div className="text-center">
                              <p className="font-mono font-black text-3xl leading-none" style={{ color: cd.urgent ? 'rgba(239,68,68,0.9)' : 'rgba(167,139,250,0.9)', textShadow: cd.urgent ? '0 0 20px rgba(239,68,68,0.5)' : '0 0 20px rgba(139,92,246,0.4)' }}>{cd.days}</p>
                              <p className="font-mono text-[9px] tracking-widest uppercase mt-1" style={{ color: 'rgba(226,226,236,0.3)' }}>DAYS</p>
                            </div>
                            <span className="font-mono text-xl" style={{ color: 'rgba(226,226,236,0.2)' }}>:</span>
                            <div className="text-center">
                              <p className="font-mono font-black text-3xl leading-none" style={{ color: cd.urgent ? 'rgba(239,68,68,0.7)' : 'rgba(139,92,246,0.7)' }}>{String(cd.hours).padStart(2, '0')}</p>
                              <p className="font-mono text-[9px] tracking-widest uppercase mt-1" style={{ color: 'rgba(226,226,236,0.3)' }}>HOURS</p>
                            </div>
                            <div className="flex-1" />
                            <p className="font-mono text-[10px] tracking-widest uppercase text-right" style={{ color: 'rgba(226,226,236,0.2)' }}>
                              {formatDate(battle.deadlineDate)}
                            </p>
                          </div>
                        )}

                        {cd.expired && (
                          <p className="font-mono text-[10px] tracking-widest uppercase mt-3" style={{ color: 'rgba(239,68,68,0.5)' }}>
                            DEADLINE: {formatDate(battle.deadlineDate)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-5 pt-4" style={{ borderTop: `1px solid ${cd.urgent ? 'rgba(239,68,68,0.08)' : 'rgba(139,92,246,0.08)'}` }}>
                      <motion.button onClick={() => handleDefeat(battle)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        className="flex-1 py-2.5 rounded-xl font-mono font-bold text-[11px] tracking-[0.2em] uppercase"
                        style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: 'rgba(34,197,94,0.85)' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(34,197,94,0.2)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(34,197,94,0.12)'; }}
                      >
                        ✓ MARK DEFEATED
                      </motion.button>
                      <button onClick={() => handleDelete(battle.id)}
                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(226,226,236,0.25)' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(239,68,68,0.7)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.3)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(226,226,236,0.25)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; }}
                        aria-label="Delete"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </RevealSection>

        {/* Defeated */}
        {defeated.length > 0 && (
          <RevealSection delay={0.08}>
            <SectionLabel index="02" label={`Defeated (${defeated.length})`} />
            <div className="space-y-2 opacity-40">
              {defeated.map((battle) => (
                <div key={battle.id} className="flex items-center gap-4 rounded-xl px-4 py-3"
                  style={{ background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.12)' }}>
                  <span className="font-mono text-[9px] tracking-widest" style={{ color: 'rgba(34,197,94,0.5)' }}>DEFEATED</span>
                  <span className="text-sm flex-1 line-through" style={{ color: 'rgba(226,226,236,0.4)' }}>{battle.title}</span>
                  <span className="font-mono text-[9px]" style={{ color: 'rgba(226,226,236,0.2)' }}>{formatDate(battle.deadlineDate)}</span>
                  <button onClick={() => handleDelete(battle.id)} className="w-5 h-5 flex items-center justify-center transition-colors" style={{ color: 'rgba(226,226,236,0.2)' }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(239,68,68,0.6)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(226,226,236,0.2)')}
                    aria-label="Delete">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </button>
                </div>
              ))}
            </div>
          </RevealSection>
        )}
      </div>

      {/* Add Boss Modal */}
      {showAdd && (
        <Modal title="New Boss Battle" subtitle="THREAT BOARD / SPAWN" onClose={() => { setShowAdd(false); setFormError(''); }}>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block font-mono text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: 'rgba(226,226,236,0.3)' }}>Boss Name</label>
              <input type="text" value={form.title} onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); setFormError(''); }}
                placeholder="e.g. Final Exam, Product Launch, Deadline"
                required maxLength={80} autoFocus
                className="input-glow w-full rounded-xl px-4 py-2.5 text-sm placeholder:opacity-20 transition-all"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${formError && !form.title.trim() ? 'rgba(239,68,68,0.4)' : 'rgba(139,92,246,0.15)'}`, color: 'rgba(226,226,236,0.9)' }}
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: 'rgba(226,226,236,0.3)' }}>Description</label>
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What's at stake?" rows={2} maxLength={300}
                className="input-glow w-full rounded-xl px-4 py-2.5 text-sm placeholder:opacity-20 transition-all resize-none"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.15)', color: 'rgba(226,226,236,0.9)' }}
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: 'rgba(226,226,236,0.3)' }}>Deadline Date</label>
              <input type="date" value={form.deadlineDate} onChange={(e) => { setForm((f) => ({ ...f, deadlineDate: e.target.value })); setFormError(''); }}
                required
                className="input-glow w-full rounded-xl px-4 py-2.5 text-sm transition-all"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${formError && !form.deadlineDate ? 'rgba(239,68,68,0.4)' : 'rgba(139,92,246,0.15)'}`, color: form.deadlineDate ? 'rgba(226,226,236,0.9)' : 'rgba(226,226,236,0.25)', colorScheme: 'dark' }}
              />
            </div>
            {formError && <p className="font-mono text-[10px]" style={{ color: 'rgba(239,68,68,0.7)' }}>{formError}</p>}
            <motion.button type="submit" disabled={saving} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl font-mono font-bold text-[11px] tracking-[0.25em] uppercase disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.5) 0%, rgba(200,40,40,0.4) 100%)', border: '1px solid rgba(239,68,68,0.35)', color: 'rgba(255,255,255,0.9)', boxShadow: '0 0 20px rgba(239,68,68,0.15)' }}
            >
              {saving ? 'SPAWNING...' : 'SPAWN BOSS'}
            </motion.button>
          </form>
        </Modal>
      )}
    </div>
  );
}
