'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getQuests, updateQuest, deleteQuest, generateId, today } from '@/lib/db';
import type { Quest, Subtask } from '@/lib/types';
import RevealSection from './RevealSection';
import SectionLabel from './SectionLabel';

export default function QuestDetailClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [quest, setQuest] = useState<Quest | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [descDraft, setDescDraft] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [showAllDonePrompt, setShowAllDonePrompt] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const quests = await getQuests();
    const q = quests.find((q) => q.id === id);
    if (!q) { router.replace('/quests'); return; }
    setQuest(q);
    setTitleDraft(q.title);
    setDescDraft(q.description);
    setNotesDraft(q.notes ?? '');
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  async function persist(updated: Quest) {
    setQuest(updated);
    await updateQuest(updated);
  }

  async function handleTitleBlur() {
    if (!quest || !titleDraft.trim() || titleDraft.trim() === quest.title) return;
    await persist({ ...quest, title: titleDraft.trim() });
  }

  async function handleDescBlur() {
    if (!quest || descDraft.trim() === quest.description) return;
    await persist({ ...quest, description: descDraft.trim() });
  }

  function handleNotesChange(val: string) {
    setNotesDraft(val);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(async () => {
      if (!quest) return;
      await updateQuest({ ...quest, notes: val });
      setQuest((q) => q ? { ...q, notes: val } : q);
    }, 800);
  }

  async function handleAddSubtask(e: React.FormEvent) {
    e.preventDefault();
    if (!quest || !newSubtask.trim()) return;
    const sub: Subtask = { id: generateId(), text: newSubtask.trim(), isComplete: false };
    const updated = { ...quest, subtasks: [...(quest.subtasks ?? []), sub] };
    await persist(updated);
    setNewSubtask('');
  }

  async function handleToggleSubtask(subId: string) {
    if (!quest) return;
    const subtasks = (quest.subtasks ?? []).map((s) =>
      s.id === subId ? { ...s, isComplete: !s.isComplete } : s
    );
    const updated = { ...quest, subtasks };
    await persist(updated);
    const allDone = subtasks.length > 0 && subtasks.every((s) => s.isComplete);
    setShowAllDonePrompt(allDone && !quest.isComplete);
  }

  async function handleDeleteSubtask(subId: string) {
    if (!quest) return;
    const updated = { ...quest, subtasks: (quest.subtasks ?? []).filter((s) => s.id !== subId) };
    await persist(updated);
    setShowAllDonePrompt(false);
  }

  async function handleMoveSubtask(subId: string, dir: -1 | 1) {
    if (!quest) return;
    const subs = [...(quest.subtasks ?? [])];
    const idx = subs.findIndex((s) => s.id === subId);
    const target = idx + dir;
    if (target < 0 || target >= subs.length) return;
    [subs[idx], subs[target]] = [subs[target], subs[idx]];
    await persist({ ...quest, subtasks: subs });
  }

  async function handleToggleRepeats() {
    if (!quest) return;
    await persist({ ...quest, repeatsDaily: !(quest.repeatsDaily ?? quest.isDaily ?? false) });
  }

  async function handleDelete() {
    if (!quest) return;
    await deleteQuest(quest.id);
    router.replace('/quests');
  }

  async function handleMarkComplete() {
    if (!quest) return;
    const updated = {
      ...quest,
      isComplete: !quest.isComplete,
      ...(quest.isDaily && !quest.isComplete ? { lastCompletedDate: today() } : {}),
    };
    await persist(updated);
    setShowAllDonePrompt(false);
  }

  if (!quest) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <span className="font-mono text-xs tracking-widest" style={{ color: 'rgba(139,92,246,0.4)' }}>LOADING...</span>
      </div>
    );
  }

  const subtasks = quest.subtasks ?? [];
  const completedCount = subtasks.filter((s) => s.isComplete).length;
  const progress = subtasks.length > 0 ? Math.round((completedCount / subtasks.length) * 100) : 0;

  return (
    <div className="relative min-h-dvh">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div style={{ position: 'absolute', top: '5%', right: '-10%', width: '55vw', height: '55vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,40,217,0.06) 0%, transparent 65%)', filter: 'blur(80px)' }} />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl px-5 py-10 space-y-10">
        {/* Back */}
        <RevealSection>
          <button onClick={() => router.back()} className="flex items-center gap-2 mb-6 transition-colors"
            style={{ color: 'rgba(139,92,246,0.4)' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(167,139,250,0.8)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(139,92,246,0.4)')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span className="font-mono text-[10px] tracking-[0.25em] uppercase">Quests</span>
          </button>

          {/* Breadcrumb */}
          <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: 'rgba(139,92,246,0.5)' }}>
            LIFE.OS / MISSION LOG / {quest.isDaily ? 'DAILY' : quest.isMainQuest ? 'MAIN QUEST' : 'SIDE QUEST'}
          </p>

          {/* Editable title */}
          <input
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={handleTitleBlur}
            className="font-black leading-none tracking-tighter w-full bg-transparent border-none outline-none"
            style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', color: 'rgba(226,226,236,0.95)' }}
          />

          {/* Tags */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {quest.isMainQuest && (
              <span className="px-2.5 py-1 rounded-lg font-mono text-[9px] tracking-[0.15em] uppercase" style={{ background: 'rgba(109,40,217,0.2)', border: '1px solid rgba(139,92,246,0.3)', color: 'rgba(167,139,250,0.8)' }}>MAIN QUEST</span>
            )}
            <button onClick={handleToggleRepeats}
              className="px-2.5 py-1 rounded-lg font-mono text-[9px] tracking-[0.15em] uppercase transition-all duration-150"
              style={(quest.repeatsDaily ?? quest.isDaily)
                ? { background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.35)', color: 'rgba(167,139,250,0.9)' }
                : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.1)', color: 'rgba(226,226,236,0.25)' }
              }
              title="Toggle daily repeat"
            >↻ {(quest.repeatsDaily ?? quest.isDaily) ? 'REPEATS DAILY' : 'ONE-OFF'}</button>
            {quest.dueDate && (
              <span className="px-2.5 py-1 rounded-lg font-mono text-[9px] tracking-[0.15em] uppercase" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.1)', color: 'rgba(226,226,236,0.35)' }}>DUE {quest.dueDate}</span>
            )}
            {quest.isComplete && (
              <span className="px-2.5 py-1 rounded-lg font-mono text-[9px] tracking-[0.15em] uppercase" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: 'rgba(34,197,94,0.7)' }}>✓ COMPLETE</span>
            )}
          </div>

          {/* Progress bar (only when subtasks exist) */}
          {subtasks.length > 0 && (
            <div className="mt-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: 'rgba(226,226,236,0.25)' }}>BREAKDOWN PROGRESS</span>
                <span className="font-mono text-[10px]" style={{ color: 'rgba(139,92,246,0.6)' }}>{completedCount}/{subtasks.length}</span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, rgba(109,40,217,0.8), rgba(167,139,250,0.7))' }}
                  initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.5, ease: [0.16,1,0.3,1] }}
                />
              </div>
            </div>
          )}
        </RevealSection>

        {/* Description */}
        <RevealSection delay={0.04}>
          <SectionLabel index="01" label="Goal Statement" />
          <textarea
            value={descDraft}
            onChange={(e) => setDescDraft(e.target.value)}
            onBlur={handleDescBlur}
            placeholder="Describe the objective of this quest..."
            rows={3}
            className="input-glow w-full rounded-xl px-4 py-3 text-sm placeholder:opacity-20 transition-all resize-none"
            style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(139,92,246,0.18)', color: 'rgba(226,226,236,0.8)' }}
          />
        </RevealSection>

        {/* Subtasks */}
        <RevealSection delay={0.06}>
          <SectionLabel index="02" label={`Breakdown (${completedCount}/${subtasks.length})`} />

          <AnimatePresence>
            {showAllDonePrompt && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="flex items-center justify-between rounded-xl px-4 py-3 mb-3"
                style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}
              >
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase" style={{ color: 'rgba(34,197,94,0.7)' }}>ALL SUBTASKS DONE — MARK QUEST COMPLETE?</span>
                <button onClick={handleMarkComplete}
                  className="px-3 py-1 rounded-lg font-mono text-[9px] tracking-widest uppercase"
                  style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: 'rgba(34,197,94,0.9)' }}
                >COMPLETE →</button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1.5 mb-3">
            <AnimatePresence>
              {subtasks.map((sub, i) => (
                <motion.div key={sub.id} layout
                  initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.2 }}
                  className="group flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(139,92,246,0.07)' }}
                >
                  <button onClick={() => handleToggleSubtask(sub.id)}
                    className="flex-shrink-0 w-4 h-4 rounded flex items-center justify-center transition-all duration-150"
                    style={{
                      background: sub.isComplete ? 'rgba(109,40,217,0.8)' : 'transparent',
                      border: `1px solid ${sub.isComplete ? 'rgba(139,92,246,0.8)' : 'rgba(139,92,246,0.25)'}`,
                    }}
                  >
                    {sub.isComplete && <svg width="7" height="7" viewBox="0 0 7 7" fill="none"><path d="M1 3.5l1.5 1.5 3-3" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </button>
                  <span className="flex-1 text-sm" style={{ color: sub.isComplete ? 'rgba(226,226,236,0.2)' : 'rgba(226,226,236,0.75)', textDecoration: sub.isComplete ? 'line-through' : 'none', transition: 'all 0.2s' }}>
                    {sub.text}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleMoveSubtask(sub.id, -1)} disabled={i === 0}
                      className="w-5 h-5 flex items-center justify-center rounded disabled:opacity-20"
                      style={{ color: 'rgba(226,226,236,0.3)' }}
                    >
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 5l3-3 3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <button onClick={() => handleMoveSubtask(sub.id, 1)} disabled={i === subtasks.length - 1}
                      className="w-5 h-5 flex items-center justify-center rounded disabled:opacity-20"
                      style={{ color: 'rgba(226,226,236,0.3)' }}
                    >
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 3l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <button onClick={() => handleDeleteSubtask(sub.id)}
                      className="w-5 h-5 flex items-center justify-center rounded"
                      style={{ color: 'rgba(226,226,236,0.3)' }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(239,68,68,0.7)')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(226,226,236,0.3)')}
                    >
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 1l6 6M7 1l-6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Add subtask */}
          <form onSubmit={handleAddSubtask} className="flex gap-2">
            <input
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              placeholder="Add a step..."
              className="input-glow flex-1 rounded-xl px-4 py-2.5 text-sm placeholder:opacity-20 transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(139,92,246,0.18)', color: 'rgba(226,226,236,0.8)' }}
            />
            <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="px-4 py-2.5 rounded-xl font-mono text-[10px] tracking-[0.15em] uppercase flex-shrink-0"
              style={{ background: 'rgba(109,40,217,0.25)', border: '1px solid rgba(139,92,246,0.25)', color: 'rgba(167,139,250,0.85)' }}
            >ADD</motion.button>
          </form>
        </RevealSection>

        {/* Notes */}
        <RevealSection delay={0.08}>
          <SectionLabel index="03" label="Notes / Log" />
          <textarea
            value={notesDraft}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Progress notes, blockers, thoughts... (autosaves)"
            rows={7}
            className="input-glow w-full rounded-xl px-4 py-3 text-sm placeholder:opacity-20 transition-all resize-y"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(139,92,246,0.18)', color: 'rgba(226,226,236,0.75)', minHeight: '140px' }}
          />
          <p className="font-mono text-[9px] mt-1.5 ml-1 tracking-widest" style={{ color: 'rgba(226,226,236,0.15)' }}>AUTOSAVES AS YOU TYPE</p>
        </RevealSection>

        {/* Complete / Reopen + Delete */}
        <RevealSection delay={0.1}>
          <div className="flex items-center gap-3 pt-2 flex-wrap">
            <motion.button onClick={handleMarkComplete} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="px-5 py-2.5 rounded-xl font-mono text-[10px] tracking-[0.2em] uppercase"
              style={quest.isComplete
                ? { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(139,92,246,0.15)', color: 'rgba(226,226,236,0.4)' }
                : { background: 'linear-gradient(135deg, rgba(109,40,217,0.7) 0%, rgba(139,92,246,0.5) 100%)', border: '1px solid rgba(139,92,246,0.35)', color: 'rgba(255,255,255,0.9)', boxShadow: '0 0 16px rgba(109,40,217,0.2)' }
              }
            >
              {quest.isComplete ? 'REOPEN QUEST' : 'MARK COMPLETE'}
            </motion.button>

            <div className="ml-auto">
              <AnimatePresence mode="wait">
                {confirmDelete ? (
                  <motion.div key="confirm" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                    className="flex items-center gap-2">
                    <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: 'rgba(239,68,68,0.6)' }}>DELETE?</span>
                    <button onClick={handleDelete}
                      className="px-3 py-2 rounded-lg font-mono text-[9px] tracking-widest uppercase"
                      style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: 'rgba(239,68,68,0.9)' }}
                    >YES</button>
                    <button onClick={() => setConfirmDelete(false)}
                      className="px-3 py-2 rounded-lg font-mono text-[9px] tracking-widest uppercase"
                      style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(226,226,236,0.35)' }}
                    >CANCEL</button>
                  </motion.div>
                ) : (
                  <motion.button key="trash" onClick={() => setConfirmDelete(true)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    className="p-2.5 rounded-xl transition-colors"
                    style={{ border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(226,226,236,0.2)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(239,68,68,0.7)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.25)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(226,226,236,0.2)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; }}
                    title="Delete quest"
                  >
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path d="M2 3.5h9M5 3.5V2.5h3v1M10.5 3.5l-.7 7a1 1 0 01-1 .9H4.2a1 1 0 01-1-.9l-.7-7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        </RevealSection>
      </div>
    </div>
  );
}
