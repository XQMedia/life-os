'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  getQuests, addQuest, updateQuest, setMainQuest, deleteQuest, generateId,
  completeDailyAndUpdateStreak, resetDailyQuestsIfNeeded,
  inferQuestType, isRepeatingDaily,
} from '@/lib/db';
import type { Quest } from '@/lib/types';
import RevealSection from './RevealSection';
import SectionLabel from './SectionLabel';
import Modal from './Modal';

export default function QuestsClient() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [tab, setTab] = useState<'longTerm' | 'daily'>('longTerm');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newRepeating, setNewRepeating] = useState(false);
  const [titleError, setTitleError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const load = useCallback(async () => {
    await resetDailyQuestsIfNeeded();
    setQuests(await getQuests());
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleTabChange(t: 'longTerm' | 'daily') {
    setTab(t);
    setNewTitle(''); setNewDesc(''); setNewDueDate('');
    setNewRepeating(false); setTitleError('');
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) { setTitleError('Quest title is required.'); return; }
    setTitleError('');
    const quest: Quest = {
      id: generateId(),
      title: newTitle.trim(),
      description: newDesc.trim(),
      questType: tab,
      isMainQuest: false,
      isComplete: false,
      repeatsDaily: tab === 'daily' ? newRepeating : false,
      dueDate: tab === 'longTerm' && newDueDate ? newDueDate : undefined,
      createdAt: Date.now(),
    };
    await addQuest(quest);
    setQuests(await getQuests());
    setNewTitle(''); setNewDesc(''); setNewDueDate('');
    setNewRepeating(false);
    setShowAddModal(false);
  }

  async function handleToggleComplete(quest: Quest) {
    if (isRepeatingDaily(quest) && !quest.isComplete) {
      await completeDailyAndUpdateStreak(quest.id);
    } else {
      await updateQuest({ ...quest, isComplete: !quest.isComplete, isMainQuest: quest.isComplete ? quest.isMainQuest : false });
    }
    setQuests(await getQuests());
  }

  async function handleSetMain(id: string) {
    await setMainQuest(id);
    setQuests((prev) => prev.map((q) => ({ ...q, isMainQuest: q.id === id })));
  }

  // Derived lists
  const longTermActive = quests.filter((q) => inferQuestType(q) === 'longTerm' && !q.isComplete);
  const longTermDone   = quests.filter((q) => inferQuestType(q) === 'longTerm' && q.isComplete);
  const mainQuest      = longTermActive.find((q) => q.isMainQuest);
  const sideQuests     = longTermActive.filter((q) => !q.isMainQuest);

  const dailyRepeating = quests.filter((q) => inferQuestType(q) === 'daily' && isRepeatingDaily(q) && !q.isComplete);
  const dailyOneTime   = quests.filter((q) => inferQuestType(q) === 'daily' && !isRepeatingDaily(q) && !q.isComplete);
  const dailyDone      = quests.filter((q) => inferQuestType(q) === 'daily' && q.isComplete);

  const tabs = [
    { id: 'longTerm' as const, label: 'LONG-TERM', count: longTermActive.length },
    { id: 'daily'   as const, label: 'DAILY',     count: dailyRepeating.length + dailyOneTime.length },
  ];

  return (
    <div className="relative min-h-dvh">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div style={{ position: 'absolute', top: '-5%', right: '-15%', width: '55vw', height: '55vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,40,217,0.06) 0%, transparent 65%)', filter: 'blur(80px)' }} />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl px-5 py-10 space-y-8">
        <RevealSection>
          <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: 'rgba(139,92,246,0.5)' }}>LIFE.OS / MISSION LOG</p>
          <h1 className="font-black leading-none tracking-tighter" style={{ fontSize: 'clamp(2.2rem, 5vw, 3rem)', color: 'rgba(226,226,236,0.95)' }}>QUESTS</h1>
        </RevealSection>

        {/* Tab switcher */}
        <RevealSection delay={0.04}>
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.1)' }}>
            {tabs.map((t) => (
              <button key={t.id} onClick={() => handleTabChange(t.id)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-mono text-[10px] tracking-[0.15em] uppercase transition-all duration-200"
                style={{
                  background: tab === t.id ? 'rgba(109,40,217,0.3)' : 'transparent',
                  border: tab === t.id ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent',
                  color: tab === t.id ? 'rgba(167,139,250,0.95)' : 'rgba(226,226,236,0.4)',
                }}
              >
                {t.id === 'daily' && <span style={{ fontSize: '11px' }}>↻</span>}
                {t.label}
                {t.count > 0 && (
                  <span className="px-1.5 py-0.5 rounded font-mono text-[9px]"
                    style={{ background: tab === t.id ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.06)', color: tab === t.id ? 'rgba(167,139,250,0.9)' : 'rgba(226,226,236,0.35)' }}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </RevealSection>

        {/* Add quest button */}
        <RevealSection delay={0.06}>
          <div className="flex justify-end">
            <motion.button onClick={() => setShowAddModal(true)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="px-5 py-2.5 rounded-xl font-mono text-[10px] tracking-[0.2em] uppercase"
              style={{ background: 'rgba(109,40,217,0.35)', border: '1px solid rgba(139,92,246,0.35)', color: 'rgba(167,139,250,0.95)', boxShadow: '0 0 14px rgba(109,40,217,0.15)' }}
            >+ ADD QUEST</motion.button>
          </div>
        </RevealSection>

        {/* ── Quest lists ─────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">

          {/* LONG-TERM tab */}
          {tab === 'longTerm' && (
            <motion.div key="longTerm" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.22 }} className="space-y-8">
              {mainQuest && (
                <RevealSection>
                  <SectionLabel index="01" label="Main Quest" />
                  <QuestRow quest={mainQuest} onToggle={handleToggleComplete} onSetMain={handleSetMain} />
                </RevealSection>
              )}
              {sideQuests.length > 0 && (
                <RevealSection delay={0.03}>
                  <SectionLabel index={mainQuest ? '02' : '01'} label="Active Quests" />
                  <div className="space-y-2">
                    {sideQuests.map((q, i) => (
                      <QuestRow key={q.id} quest={q} index={i} onToggle={handleToggleComplete} onSetMain={handleSetMain} />
                    ))}
                  </div>
                </RevealSection>
              )}
              {longTermActive.length === 0 && (
                <div className="rounded-2xl p-10 text-center" style={{ background: 'rgba(255,255,255,0.015)', border: '1px dashed rgba(139,92,246,0.1)' }}>
                  <p className="font-mono text-[11px] tracking-[0.2em] uppercase mb-1.5" style={{ color: 'rgba(226,226,236,0.2)' }}>NO LONG-TERM QUESTS YET.</p>
                  <p className="font-mono text-[10px]" style={{ color: 'rgba(139,92,246,0.4)' }}>ADD ONE ABOVE — THESE PERSIST UNTIL YOU MARK THEM DONE.</p>
                </div>
              )}
              {longTermDone.length > 0 && (
                <RevealSection delay={0.06}>
                  <SectionLabel index="—" label="Completed" />
                  <div className="space-y-2 opacity-35">
                    {longTermDone.map((q, i) => (
                      <QuestRow key={q.id} quest={q} index={i} onToggle={handleToggleComplete} onSetMain={handleSetMain} />
                    ))}
                  </div>
                </RevealSection>
              )}
            </motion.div>
          )}

          {/* DAILY tab */}
          {tab === 'daily' && (
            <motion.div key="daily" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.22 }} className="space-y-8">
              {dailyRepeating.length > 0 && (
                <RevealSection>
                  <SectionLabel index="01" label="Repeating — builds streak" />
                  <div className="space-y-2">
                    {dailyRepeating.map((q, i) => (
                      <QuestRow key={q.id} quest={q} index={i} repeating onToggle={handleToggleComplete} onSetMain={handleSetMain} />
                    ))}
                  </div>
                </RevealSection>
              )}
              {dailyOneTime.length > 0 && (
                <RevealSection delay={0.03}>
                  <SectionLabel index={dailyRepeating.length > 0 ? '02' : '01'} label="One-time daily" />
                  <div className="space-y-2">
                    {dailyOneTime.map((q, i) => (
                      <QuestRow key={q.id} quest={q} index={i} onToggle={handleToggleComplete} onSetMain={handleSetMain} />
                    ))}
                  </div>
                </RevealSection>
              )}
              {dailyRepeating.length === 0 && dailyOneTime.length === 0 && (
                <div className="rounded-2xl p-10 text-center" style={{ background: 'rgba(255,255,255,0.015)', border: '1px dashed rgba(139,92,246,0.1)' }}>
                  <p className="font-mono text-[11px] tracking-[0.2em] uppercase mb-1.5" style={{ color: 'rgba(226,226,236,0.2)' }}>NO DAILY QUESTS YET.</p>
                  <p className="font-mono text-[10px]" style={{ color: 'rgba(139,92,246,0.4)' }}>ADD ONE ABOVE — THEY APPEAR IN YOUR TODAY ZONE.</p>
                </div>
              )}
              {dailyDone.length > 0 && (
                <RevealSection delay={0.06}>
                  <SectionLabel index="—" label="Done today" />
                  <div className="space-y-2 opacity-35">
                    {dailyDone.map((q, i) => (
                      <QuestRow key={q.id} quest={q} index={i} repeating={isRepeatingDaily(q)} onToggle={handleToggleComplete} onSetMain={handleSetMain} />
                    ))}
                  </div>
                </RevealSection>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Quest Modal */}
      {showAddModal && (
        <Modal
          title={tab === 'daily' ? 'New Daily Quest' : 'New Quest'}
          subtitle={tab === 'daily' ? 'QUESTS / ADD DAILY' : 'QUESTS / ADD LONG-TERM'}
          onClose={() => { setShowAddModal(false); setNewTitle(''); setNewDesc(''); setNewDueDate(''); setNewRepeating(false); setTitleError(''); }}
        >
          <form onSubmit={handleAdd} className="space-y-3">
            {/* Context hint */}
            <div className="flex items-center gap-2">
              {tab === 'longTerm' ? (
                <>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ color: 'rgba(139,92,246,0.55)', flexShrink: 0 }}>
                    <path d="M5 1L6.5 4H9L7 6L7.8 9L5 7.5L2.2 9L3 6L1 4H3.5L5 1Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/>
                  </svg>
                  <span className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: 'rgba(139,92,246,0.5)' }}>PERSISTS UNTIL COMPLETE — OPTIONAL TARGET DATE</span>
                </>
              ) : (
                <>
                  <span style={{ color: 'rgba(139,92,246,0.55)', fontSize: '11px' }}>↻</span>
                  <span className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: 'rgba(139,92,246,0.5)' }}>LIVES IN YOUR TODAY ZONE — TOGGLE REPEATING BELOW</span>
                </>
              )}
            </div>
            <div>
              <input type="text" value={newTitle} onChange={(e) => { setNewTitle(e.target.value); setTitleError(''); }}
                placeholder={tab === 'daily' ? 'Daily quest title...' : 'Quest title...'}
                autoFocus
                className="input-glow w-full rounded-xl px-4 py-3 text-sm placeholder:opacity-20 transition-all"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${titleError ? 'rgba(239,68,68,0.4)' : 'rgba(139,92,246,0.14)'}`, color: 'rgba(226,226,236,0.88)' }}
              />
              {titleError && <p className="font-mono text-[10px] mt-1.5 ml-1" style={{ color: 'rgba(239,68,68,0.7)' }}>{titleError}</p>}
            </div>
            <input type="text" value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              className="input-glow w-full rounded-xl px-4 py-3 text-sm placeholder:opacity-20 transition-all"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.1)', color: 'rgba(226,226,236,0.88)' }}
            />
            {tab === 'longTerm' && (
              <input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)}
                className="input-glow w-full rounded-xl px-4 py-3 text-sm transition-all"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.1)', color: newDueDate ? 'rgba(226,226,236,0.88)' : 'rgba(226,226,236,0.25)', colorScheme: 'dark' }}
              />
            )}
            {tab === 'daily' && (
              <label className="flex items-center gap-3 cursor-pointer px-1 py-1">
                <div onClick={() => setNewRepeating((v) => !v)}
                  className="relative w-8 h-4 rounded-full transition-all duration-200 flex-shrink-0"
                  style={{ background: newRepeating ? 'rgba(109,40,217,0.7)' : 'rgba(255,255,255,0.08)', border: `1px solid ${newRepeating ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.12)'}` }}>
                  <div className="absolute top-0.5 w-3 h-3 rounded-full bg-white/90 transition-all duration-200"
                    style={{ left: newRepeating ? '17px' : '1px', opacity: newRepeating ? 1 : 0.4 }} />
                </div>
                <span className="font-mono text-[10px] tracking-[0.15em] uppercase" style={{ color: newRepeating ? 'rgba(167,139,250,0.85)' : 'rgba(226,226,236,0.4)' }}>
                  ↻ {newRepeating ? 'Repeats Daily (builds streak)' : 'One-time today (carries forward if missed)'}
                </span>
              </label>
            )}
            <motion.button type="submit" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl font-mono font-bold text-xs tracking-[0.25em] uppercase transition-all"
              style={{ background: 'linear-gradient(135deg, rgba(109,40,217,0.9) 0%, rgba(139,92,246,0.7) 100%)', color: 'rgba(255,255,255,0.9)', boxShadow: '0 0 20px rgba(109,40,217,0.25)' }}
            >{tab === 'daily' ? 'ADD DAILY QUEST' : 'ADD QUEST'}</motion.button>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── QuestRow ──────────────────────────────────────────────────────────────────
function QuestRow({ quest, index, repeating, onToggle, onSetMain }: {
  quest: Quest; index?: number; repeating?: boolean;
  onToggle: (q: Quest) => void; onSetMain: (id: string) => void;
}) {
  const subtasks = quest.subtasks ?? [];
  const doneCount = subtasks.filter((s) => s.isComplete).length;

  return (
    <motion.div layout className="group flex items-start gap-4 rounded-xl px-4 py-4 transition-all duration-150"
      style={{
        background: quest.isMainQuest ? 'linear-gradient(135deg, rgba(20,10,45,0.95) 0%, rgba(12,7,28,0.97) 100%)' : 'rgba(109,40,217,0.07)',
        border: `1px solid ${quest.isMainQuest ? 'rgba(139,92,246,0.5)' : 'rgba(139,92,246,0.25)'}`,
        boxShadow: quest.isMainQuest ? '0 0 35px rgba(139,92,246,0.14)' : 'none',
      }}
    >
      {/* index or repeat symbol */}
      <span className="font-mono text-[9px] tracking-widest flex-shrink-0 mt-1"
        style={{ color: repeating ? 'rgba(139,92,246,0.55)' : 'rgba(139,92,246,0.35)' }}>
        {repeating ? '↻' : index !== undefined ? String(index + 1).padStart(2, '0') : ''}
      </span>

      {/* checkbox */}
      <button onClick={() => onToggle(quest)}
        className="flex-shrink-0 w-5 h-5 rounded-md mt-0.5 flex items-center justify-center transition-all duration-150"
        style={{
          background: quest.isComplete ? 'rgba(109,40,217,0.8)' : 'transparent',
          border: `1px solid ${quest.isComplete ? 'rgba(139,92,246,0.8)' : 'rgba(139,92,246,0.28)'}`,
          boxShadow: quest.isComplete ? '0 0 8px rgba(109,40,217,0.4)' : 'none',
        }}
        aria-label={quest.isComplete ? 'Mark incomplete' : 'Mark complete'}
      >
        {quest.isComplete && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </button>

      {/* content */}
      <Link href={`/quests/${quest.id}`} className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium leading-snug" style={{ color: quest.isComplete ? 'rgba(226,226,236,0.25)' : 'rgba(226,226,236,0.85)', textDecoration: quest.isComplete ? 'line-through' : 'none' }}>
            {quest.title}
          </p>
          {repeating && !quest.isComplete && (
            <span className="font-mono text-[8px] tracking-[0.15em] px-1.5 py-0.5 rounded" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', color: 'rgba(139,92,246,0.65)' }}>↻ REPEATS</span>
          )}
        </div>
        {quest.description && <p className="text-xs mt-0.5" style={{ color: 'rgba(226,226,236,0.4)' }}>{quest.description}</p>}
        {quest.dueDate && !quest.isComplete && (
          <p className="font-mono text-[9px] tracking-widest uppercase mt-1" style={{ color: 'rgba(139,92,246,0.5)' }}>TARGET {quest.dueDate}</p>
        )}
        {subtasks.length > 0 && (
          <p className="font-mono text-[9px] tracking-widest mt-1" style={{ color: 'rgba(139,92,246,0.45)' }}>{doneCount}/{subtasks.length} STEPS</p>
        )}
      </Link>

      <span className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" style={{ color: 'rgba(139,92,246,0.35)' }}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 1l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </span>

      {!quest.isComplete && !quest.isMainQuest && inferQuestType(quest) === 'longTerm' && (
        <button onClick={(e) => { e.preventDefault(); onSetMain(quest.id); }}
          className="flex-shrink-0 px-2.5 py-1 rounded-lg font-mono text-[9px] tracking-[0.15em] uppercase transition-all"
          style={{ border: '1px solid rgba(139,92,246,0.18)', color: 'rgba(139,92,246,0.45)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.45)'; (e.currentTarget as HTMLElement).style.color = 'rgba(167,139,250,0.85)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.18)'; (e.currentTarget as HTMLElement).style.color = 'rgba(139,92,246,0.45)'; }}
        >SET MAIN</button>
      )}
      {quest.isMainQuest && !quest.isComplete && (
        <span className="flex-shrink-0 px-2.5 py-1 rounded-lg font-mono text-[9px] tracking-[0.15em] uppercase" style={{ background: 'rgba(109,40,217,0.2)', border: '1px solid rgba(139,92,246,0.32)', color: 'rgba(167,139,250,0.85)' }}>MAIN</span>
      )}
    </motion.div>
  );
}
