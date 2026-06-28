'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getCharacter, saveCharacter, getSkills, getQuests, getBossBattles,
  addQuest, updateQuest, generateId,
  resetDailyQuestsIfNeeded, completeDailyAndUpdateStreak, today,
  inferQuestType, isRepeatingDaily, skillTotalXP, skillLevel,
} from '@/lib/db';
import type { Character, Skill, Quest, BossBattle } from '@/lib/types';
import CheckInModal from './CheckInModal';
import DreamReminder from './DreamReminder';
import NotificationManager from './NotificationManager';
import IntroSequence, { useIntroGate } from './IntroSequence';
import QuickAccessBar from './QuickAccessBar';

const GREETINGS = ['Good morning', 'Good afternoon', 'Good evening'];
function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? GREETINGS[0] : h < 17 ? GREETINGS[1] : GREETINGS[2];
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
}

type BriefArgs = { name: string; streak: number; done: number; total: number };
const COACH_MESSAGES: Array<(a: BriefArgs) => string> = [
  ({ name, streak }) => streak > 0 ? `${name}, you're on a ${streak}-day streak. That's momentum — protect it.` : `Set your first daily quest and start your streak, ${name}.`,
  ({ done, total }) => total > 0 ? `${done}/${total} dailies done. ${done === total ? 'Clean sweep today — now compound it.' : 'Your remaining dailies are the gap between good and great.'}` : 'No dailies yet. Add one and start moving.',
  ({ name }) => `What's the one thing that would make today a 10/10, ${name}?`,
  ({ streak }) => streak > 7 ? `${streak} days straight. Most people quit before they see results. You're not most people.` : 'Every day you show up, you widen the gap between you and yesterday.',
  ({ name }) => `${name} — your Brain is waiting for new learnings. Your Journal is waiting for today's story.`,
];

function LevelRing({ level, xpProgress }: { level: number; xpProgress: number }) {
  const size = 130;
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
          <motion.circle
            cx={size/2} cy={size/2} r={r}
            fill="none"
            stroke="url(#levelGrad)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ * (1 - xpProgress / 100) }}
            transition={{ duration: 1.2, ease: [0.16,1,0.3,1], delay: 0.3 }}
          />
          <defs>
            <linearGradient id="levelGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7c3aed"/>
              <stop offset="100%" stopColor="#a78bfa"/>
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: 'var(--text-3)' }}>LEVEL</span>
          <span className="font-black" style={{ fontSize: 38, color: 'var(--text-1)', lineHeight: 1 }}>{level}</span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon, color }: { label: string; value: string; sub?: string; icon: React.ReactNode; color: string }) {
  return (
    <motion.div
      className="rounded-2xl p-4 flex flex-col gap-2"
      style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ borderColor: 'rgba(139,92,246,0.2)', y: -1 }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--text-3)' }}>{label}</span>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="font-black text-2xl tracking-tight" style={{ color: 'var(--text-1)' }}>{value}</div>
      {sub && <div className="text-xs" style={{ color }}>{sub}</div>}
    </motion.div>
  );
}

function QuestRow({ quest, onToggle, justChecked }: { quest: Quest; onToggle: () => void; justChecked: boolean }) {
  const xp = Math.max(10, Math.min(150, quest.title.length * 3 + 20));
  return (
    <motion.div
      layout
      className="quest-item group"
      style={{ borderColor: quest.isComplete ? 'rgba(16,185,129,0.2)' : undefined }}
      whileHover={{ x: 2 }}
    >
      <motion.button
        onClick={onToggle}
        whileTap={{ scale: 0.85 }}
        className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
        style={{
          background: quest.isComplete ? 'var(--accent)' : 'transparent',
          border: `1.5px solid ${quest.isComplete ? 'var(--accent)' : 'rgba(255,255,255,0.18)'}`,
        }}
      >
        {quest.isComplete && (
          <motion.svg width="10" height="10" viewBox="0 0 10 10" fill="none"
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500 }}>
            <path d="M2 5l2.3 2.3L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </motion.svg>
        )}
      </motion.button>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate" style={{ color: quest.isComplete ? 'var(--text-3)' : 'var(--text-1)', textDecoration: quest.isComplete ? 'line-through' : 'none' }}>
          {quest.title}
        </div>
        {quest.description && (
          <div className="text-xs truncate mt-0.5" style={{ color: 'var(--text-3)' }}>{quest.description}</div>
        )}
      </div>

      <AnimatePresence>
        {justChecked ? (
          <motion.span key="xp" className="xp-chip" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}>
            +{xp}
          </motion.span>
        ) : (
          <span key="static" className="xp-chip" style={{ opacity: quest.isComplete ? 0.4 : 1 }}>+{xp}</span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function DashboardClient() {
  const router = useRouter();
  const [character, setCharacter] = useState<Character | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [bosses, setBosses] = useState<BossBattle[]>([]);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showDream, setShowDream] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [justChecked, setJustChecked] = useState<string | null>(null);
  const [briefIdx] = useState(() => Math.floor(Date.now() / 86_400_000) % COACH_MESSAGES.length);
  const loaded = useRef(false);

  const { show: showIntro, dismiss: dismissIntro } = useIntroGate(character?.name ?? '');

  const load = useCallback(async () => {
    const [c, s, q, b] = await Promise.all([getCharacter(), getSkills(), getQuests(), getBossBattles()]);
    if (!c) { router.replace('/'); return; }
    const wasReset = await resetDailyQuestsIfNeeded();
    const freshQ = wasReset ? await getQuests() : q;
    setCharacter(c);
    setSkills(s);
    setQuests(freshQ);
    setBosses(b);
    if (c.lastCheckInDate !== today()) setShowCheckIn(true);
  }, [router]);

  useEffect(() => {
    if (!loaded.current) { loaded.current = true; load(); }
  }, [load]);

  async function handleDismissCheckIn() {
    setShowCheckIn(false);
    if (!character) return;
    const updated = { ...character, lastCheckInDate: today() };
    await saveCharacter(updated);
    setCharacter(updated);
    setQuests(await getQuests());
  }

  async function handleToggleRepeating(quest: Quest) {
    if (!quest.isComplete) {
      const updated = await completeDailyAndUpdateStreak(quest.id);
      if (updated) setCharacter(updated);
    } else {
      await updateQuest({ ...quest, isComplete: false });
    }
    setJustChecked(quest.id);
    setTimeout(() => setJustChecked(null), 1200);
    setQuests(await getQuests());
  }

  async function handleToggleOneOff(quest: Quest) {
    await updateQuest({ ...quest, isComplete: !quest.isComplete });
    setJustChecked(quest.id);
    setTimeout(() => setJustChecked(null), 1200);
    setQuests(await getQuests());
  }

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    await addQuest({
      id: generateId(), title: newTaskText.trim(), description: '',
      questType: 'daily', isMainQuest: false, isComplete: false,
      repeatsDaily: false, createdAt: Date.now(),
    });
    setQuests(await getQuests());
    setNewTaskText('');
  }

  if (!character) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <span className="font-mono text-xs tracking-widest" style={{ color: 'var(--text-3)' }}>LOADING...</span>
      </div>
    );
  }

  const t = today();
  const repeatingActive = quests.filter((q) => isRepeatingDaily(q) && !q.isComplete);
  const repeatingDone   = quests.filter((q) => isRepeatingDaily(q) && q.isComplete && q.lastCompletedDate === t);
  const todayQuests = [...repeatingActive, ...repeatingDone];
  const carried = quests.filter((q) => inferQuestType(q) === 'daily' && !isRepeatingDaily(q) && !q.isComplete).slice(0, 5);
  const longTermActive = quests.filter((q) => inferQuestType(q) === 'longTerm' && !q.isComplete).slice(0, 3);
  const todayDone  = repeatingDone.length;
  const todayTotal = repeatingActive.length + repeatingDone.length;
  const todayProgress = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;

  const totalXP = skills.reduce((a, s) => a + skillTotalXP(s), 0);
  const level = Math.floor(totalXP / 500) + 1;
  const xpInLevel = totalXP % 500;
  const xpProgress = Math.round((xpInLevel / 500) * 100);
  const xpToNext = 500 - xpInLevel;

  const streak = character.currentStreak ?? 0;
  const mainQuest = quests.find((q) => q.isMainQuest && !q.isComplete);
  const nearestBoss = bosses.filter((b) => !b.isDefeated).sort((a, b) => a.deadlineDate.localeCompare(b.deadlineDate))[0];

  const coachMsg = COACH_MESSAGES[briefIdx]({ name: character.name, streak, done: todayDone, total: todayTotal });

  const allTodayItems = [...todayQuests, ...carried].slice(0, 8);

  return (
    <>
      {showIntro && <IntroSequence characterName={character.name} onComplete={dismissIntro} />}
      {showCheckIn && <CheckInModal existingDailies={repeatingActive} onDismiss={handleDismissCheckIn} />}
      {character.dream && <DreamReminder dream={character.dream} forceShow={showDream} onClose={() => setShowDream(false)} />}
      <NotificationManager />

      <div className="max-w-6xl mx-auto space-y-5">

        {/* ── Row 1: Hero + Level Ring ──────────────────────────────────── */}
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 200px' }}>

          {/* Hero card */}
          <motion.div
            className="rounded-2xl p-6 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #13141e 0%, #1a1330 100%)',
              border: '1px solid rgba(139,92,246,0.2)',
            }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* BG glow */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 80% at 100% 0%, rgba(109,40,217,0.12) 0%, transparent 70%)' }} />

            <div className="relative">
              <div className="font-mono text-[10px] tracking-[0.4em] uppercase mb-2" style={{ color: 'var(--text-3)' }}>
                {formatDate()}
              </div>
              <h1 className="font-black mb-1" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', color: 'var(--text-1)', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                {getGreeting()},{' '}
                <em style={{ fontStyle: 'italic', color: 'var(--accent-text)', fontFamily: 'Georgia, serif' }}>
                  {character.name}.
                </em>
              </h1>
              <p className="text-sm mb-5" style={{ color: 'var(--text-2)' }}>
                {todayTotal > 0
                  ? `You've got ${todayTotal - todayDone} quest${todayTotal - todayDone !== 1 ? 's' : ''} open${nearestBoss ? ` and a boss battle looming.` : '.'} Let's move.`
                  : character.dream ? `"${character.dream.slice(0, 60)}${character.dream.length > 60 ? '…' : ''}"` : 'Set your quests and start building.'}
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <Link href="/focus">
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: 'var(--accent)', color: 'white', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 1.5l7 4.5-7 4.5V1.5z" fill="white"/></svg>
                    Start deep work
                  </motion.button>
                </Link>
                <Link href="/quests">
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--card-border)', color: 'var(--text-2)' }}
                  >
                    View quests
                  </motion.button>
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Level ring card */}
          <motion.div
            className="rounded-2xl p-5 flex flex-col items-center justify-center gap-1"
            style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <LevelRing level={level} xpProgress={xpProgress} />
            <div className="text-center mt-1">
              <div className="text-xs" style={{ color: 'var(--text-2)' }}>{totalXP.toLocaleString()} / {((level) * 500).toLocaleString()} XP</div>
              <div className="font-mono text-[10px]" style={{ color: 'var(--text-3)' }}>{xpToNext} XP to next</div>
            </div>
          </motion.div>
        </div>

        {/* ── Row 2: Stat strip ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Streak"
            value={streak > 0 ? `${streak} days` : '—'}
            sub={streak >= 7 ? 'Personal best 🏆' : streak > 0 ? 'Keep going' : 'Start today'}
            color="var(--yellow)"
            icon={<span style={{ fontSize: 14 }}>🔥</span>}
          />
          <StatCard
            label="Daily quests"
            value={`${todayDone}/${todayTotal}`}
            sub={todayProgress > 0 ? `${todayProgress}% complete` : 'None set yet'}
            color="var(--accent-text)"
            icon={<span style={{ fontSize: 14 }}>⚡</span>}
          />
          <StatCard
            label="Skills"
            value={skills.length.toString()}
            sub={skills.length > 0 ? `Avg Lvl ${Math.round(skills.reduce((a, s) => a + skillLevel(skillTotalXP(s)), 0) / skills.length)}` : 'Add your first'}
            color="var(--green)"
            icon={<span style={{ fontSize: 14 }}>🌱</span>}
          />
          <StatCard
            label="Boss battles"
            value={bosses.filter((b) => !b.isDefeated).length.toString()}
            sub={nearestBoss ? `Next: ${new Date(nearestBoss.deadlineDate + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'No active bosses'}
            color="var(--red)"
            icon={<span style={{ fontSize: 14 }}>💀</span>}
          />
        </div>

        {/* ── Row 3: Quests + Coach ─────────────────────────────────────── */}
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 300px' }}>

          {/* Today's quests */}
          <div className="rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-base" style={{ color: 'var(--text-1)' }}>Today's quests</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                  {todayDone} of {todayTotal} complete
                  {todayTotal > 0 && <span style={{ color: 'var(--accent-text)' }}> · {(todayTotal - todayDone) * 40} XP still on the table</span>}
                </p>
              </div>
              {todayTotal > 0 && (
                <Link href="/quests" className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--accent-text)' }}>
                  All quests
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                </Link>
              )}
            </div>

            {/* Progress bar */}
            {todayTotal > 0 && (
              <div className="progress-track mb-4">
                <motion.div className="progress-fill" style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent-text))' }}
                  initial={{ width: '0%' }} animate={{ width: `${todayProgress}%` }} transition={{ duration: 0.8, ease: [0.16,1,0.3,1] }} />
              </div>
            )}

            {/* Quest list */}
            <div className="space-y-2">
              <AnimatePresence>
                {allTodayItems.map((q) => (
                  <QuestRow
                    key={q.id}
                    quest={q}
                    onToggle={() => isRepeatingDaily(q) ? handleToggleRepeating(q) : handleToggleOneOff(q)}
                    justChecked={justChecked === q.id}
                  />
                ))}
              </AnimatePresence>

              {allTodayItems.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm" style={{ color: 'var(--text-3)' }}>No quests yet — add one below</p>
                </div>
              )}
            </div>

            {/* Quick add */}
            <form onSubmit={handleQuickAdd} className="flex gap-2 mt-4">
              <input
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                placeholder="Add a quest for today..."
                className="input-glow flex-1 rounded-xl px-4 py-2.5 text-sm"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--card-border)', color: 'var(--text-1)' }}
              />
              <motion.button type="submit" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                disabled={!newTaskText.trim()}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-30"
                style={{ background: 'var(--accent)', color: 'white' }}>
                Add
              </motion.button>
            </form>
          </div>

          {/* Right column: Coach + quick links + main quest */}
          <div className="space-y-3">
            {/* Coach card */}
            <motion.div
              className="rounded-2xl p-4"
              style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(139,92,246,0.22)' }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)' }}>
                    <span style={{ fontSize: 12 }}>✦</span>
                  </div>
                  <span className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>Coach</span>
                </div>
                <span className="font-mono text-[10px]" style={{ color: 'var(--text-3)' }}>just now</span>
              </div>
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-2)' }}>{coachMsg}</p>
              <Link href="/focus">
                <button className="w-full py-2 rounded-xl text-sm font-semibold"
                  style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.3)', color: 'var(--accent-text)' }}>
                  Open Coach →
                </button>
              </Link>
            </motion.div>

            {/* Main quest */}
            {mainQuest && (
              <motion.div
                className="rounded-2xl p-4"
                style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.25 }}
              >
                <div className="font-mono text-[9px] tracking-[0.4em] uppercase mb-2" style={{ color: 'var(--text-3)' }}>
                  MAIN QUEST
                </div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{mainQuest.title}</p>
                {mainQuest.description && (
                  <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-3)' }}>{mainQuest.description}</p>
                )}
              </motion.div>
            )}

            {/* Quick links */}
            <motion.div
              className="rounded-2xl p-4"
              style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="font-mono text-[9px] tracking-[0.4em] uppercase mb-3" style={{ color: 'var(--text-3)' }}>
                QUICK ACCESS
              </div>
              <QuickAccessBar compact />
            </motion.div>

            {/* Long-term quests */}
            {longTermActive.length > 0 && (
              <motion.div
                className="rounded-2xl p-4"
                style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
              >
                <div className="font-mono text-[9px] tracking-[0.4em] uppercase mb-3" style={{ color: 'var(--text-3)' }}>
                  ACTIVE PROJECTS
                </div>
                <div className="space-y-2">
                  {longTermActive.map((q) => (
                    <Link key={q.id} href={`/quests/${q.id}`}>
                      <div className="flex items-center gap-2 py-1 rounded-lg hover:bg-white/5 -mx-2 px-2 transition-colors">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--accent-mid)' }} />
                        <span className="text-xs truncate" style={{ color: 'var(--text-2)' }}>{q.title}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* ── Dream reminder strip ──────────────────────────────────────── */}
        {character.dream && (
          <motion.button
            onClick={() => setShowDream(true)}
            whileHover={{ borderColor: 'rgba(139,92,246,0.3)' }}
            className="w-full text-center py-3 px-6 rounded-2xl transition-all"
            style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          >
            <span className="font-mono text-[9px] tracking-[0.5em] uppercase mr-3" style={{ color: 'var(--text-3)' }}>FINAL DESTINATION</span>
            <span className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>{character.dream}</span>
          </motion.button>
        )}
      </div>
    </>
  );
}
