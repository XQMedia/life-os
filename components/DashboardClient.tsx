'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import {
  getCharacter, saveCharacter, getSkills, getQuests, getBossBattles,
  addSkill, addQuest, updateQuest, generateId,
  resetDailyQuestsIfNeeded, completeDailyAndUpdateStreak, today,
  inferQuestType, isRepeatingDaily, profileTitle, skillTotalXP, skillLevel, xpInCurrentLevel,
} from '@/lib/db';
import type { Character, Skill, Quest, BossBattle } from '@/lib/types';
import XpBar from './XpBar';
import Modal from './Modal';
import RevealSection from './RevealSection';
import InitialsBadge from './InitialsBadge';
import SkillBadge from './SkillBadge';
import StreakBadge from './StreakBadge';
import CheckInModal from './CheckInModal';
import QuickAccessBar from './QuickAccessBar';
import DreamReminder from './DreamReminder';
import NotificationManager from './NotificationManager';

const QUOTES = [
  "The gap between who you are and who you want to be is closed by what you do today.",
  "Discipline is choosing between what you want now and what you want most.",
  "Every expert was once a beginner who refused to quit.",
  "You don't rise to the level of your goals. You fall to the level of your systems.",
  "Small moves, executed daily, compound into everything.",
  "The best time to start was yesterday. The next best time is now.",
  "Clarity comes from action, not thought.",
  "Do the work. The feeling follows.",
  "Your future self is watching. Make them proud.",
  "Hard days build the character that easy days never could.",
  "Momentum is fragile. Protect it.",
  "One focused hour beats five scattered ones.",
];

function getCountdown(deadlineDate: string, now = Date.now()) {
  const diff = new Date(deadlineDate + 'T23:59:59').getTime() - now;
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, urgent: true, expired: true };
  const days    = Math.floor(diff / 86_400_000);
  const hours   = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000)  / 60_000);
  const seconds = Math.floor((diff % 60_000)     / 1_000);
  return { days, hours, minutes, seconds, urgent: days < 3, expired: false };
}

function formatTodayDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
}

export default function DashboardClient() {
  const router = useRouter();
  const { scrollY } = useScroll();
  const glowY = useTransform(scrollY, [0, 800], [0, -80]);

  const [character, setCharacter] = useState<Character | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [bosses, setBosses] = useState<BossBattle[]>([]);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showDream, setShowDream] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(() => Math.floor(Date.now() / 86_400_000) % QUOTES.length);
  const [quoteFade, setQuoteFade] = useState(true);
  const [tick, setTick] = useState(Date.now());
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [justChecked, setJustChecked] = useState<string | null>(null);
  const [skillForm, setSkillForm] = useState({ name: '' });
  const [savingSkill, setSavingSkill] = useState(false);
  const loaded = useRef(false);

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

  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setQuoteFade(false);
      setTimeout(() => { setQuoteIdx((i) => (i + 1) % QUOTES.length); setQuoteFade(true); }, 400);
    }, 10_000);
    return () => clearInterval(t);
  }, []);

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
    setTimeout(() => setJustChecked(null), 600);
    setQuests(await getQuests());
  }

  async function handleToggleOneOff(quest: Quest) {
    await updateQuest({ ...quest, isComplete: !quest.isComplete });
    setJustChecked(quest.id);
    setTimeout(() => setJustChecked(null), 600);
    setQuests(await getQuests());
  }

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    const q: Quest = {
      id: generateId(),
      title: newTaskText.trim(),
      description: '',
      questType: 'daily',
      isMainQuest: false,
      isComplete: false,
      repeatsDaily: false,
      createdAt: Date.now(),
    };
    await addQuest(q);
    setQuests(await getQuests());
    setNewTaskText('');
  }

  async function handleAddSkill(e: React.FormEvent) {
    e.preventDefault();
    if (!skillForm.name.trim()) return;
    setSavingSkill(true);
    const skill: Skill = {
      id: generateId(),
      name: skillForm.name.trim(),
      icon: skillForm.name.slice(0, 2).toUpperCase(),
      masteryLevel: 0,
      totalXP: 0,
      createdAt: Date.now(),
    };
    await addSkill(skill);
    setSkills((prev) => [...prev, skill]);
    setSkillForm({ name: '' });
    setSavingSkill(false);
    setShowAddSkill(false);
  }

  // ── Derived state ──────────────────────────────────────────────────────────
  const t = today();
  const repeatingActive = quests.filter((q) => inferQuestType(q) === 'daily' && isRepeatingDaily(q) && !q.isComplete);
  const repeatingDone   = quests.filter((q) => inferQuestType(q) === 'daily' && isRepeatingDaily(q) && q.isComplete && q.lastCompletedDate === t);
  const carried = quests.filter((q) => inferQuestType(q) === 'daily' && !isRepeatingDaily(q) && !q.isComplete);
  const todayTotal = repeatingActive.length + repeatingDone.length;
  const todayDone  = repeatingDone.length;
  const todayProgress = todayTotal > 0 ? (todayDone / todayTotal) * 100 : 0;

  const mainQuest = quests.find((q) => q.isMainQuest && !q.isComplete);
  const sideQuests = quests.filter((q) => inferQuestType(q) === 'longTerm' && !q.isMainQuest && !q.isComplete).slice(0, 4);
  const title = profileTitle(skills);
  const nearestBoss = bosses.filter((b) => !b.isDefeated).sort((a, b) => a.deadlineDate.localeCompare(b.deadlineDate))[0];
  const countdown = nearestBoss ? getCountdown(nearestBoss.deadlineDate, tick) : null;

  if (!character) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <span className="font-mono text-xs tracking-widest" style={{ color: 'rgba(139,92,246,0.4)' }}>LOADING...</span>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh">
      {showCheckIn && <CheckInModal existingDailies={repeatingActive} onDismiss={handleDismissCheckIn} />}
      {character.dream && <DreamReminder dream={character.dream} forceShow={showDream} onClose={() => setShowDream(false)} />}
      <NotificationManager />

      <motion.div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ y: glowY }} aria-hidden>
        <div style={{ position: 'absolute', top: '-15%', right: '-5%', width: '60vw', height: '60vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,40,217,0.055) 0%, transparent 65%)', filter: 'blur(90px)' }} />
        <div style={{ position: 'absolute', top: '50%', left: '-10%', width: '40vw', height: '40vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.03) 0%, transparent 65%)', filter: 'blur(100px)' }} />
      </motion.div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 py-6 space-y-4">

        {/* ══ HEADER ════════════════════════════════════════════════════════ */}
        <RevealSection delay={0}>
          <div className="rounded-2xl px-6 py-5 flex items-center gap-5 flex-wrap" style={{ background: 'rgba(109,40,217,0.06)', border: '1px solid rgba(139,92,246,0.18)' }}>
            <InitialsBadge name={character.name} size="lg" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <span className="font-black tracking-tight" style={{ fontSize: 'clamp(1.3rem, 3vw, 1.75rem)', color: 'rgba(226,226,236,0.95)' }}>{character.name}</span>
                <span className="px-2.5 py-1 rounded-full font-mono text-[9px] font-bold tracking-widest" style={{ background: 'rgba(109,40,217,0.3)', border: '1px solid rgba(139,92,246,0.4)', color: 'rgba(167,139,250,1)' }}>{title.toUpperCase()}</span>
                <StreakBadge streak={character.currentStreak ?? 0} />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase" style={{ color: 'rgba(139,92,246,0.65)' }}>{character.class || 'UNDEFINED CLASS'}</span>
                {character.bio && <><span style={{ color: 'rgba(139,92,246,0.25)' }}>·</span><span className="text-sm truncate" style={{ color: 'rgba(226,226,236,0.45)' }}>{character.bio}</span></>}
              </div>
            </div>
            {/* Rotating quote */}
            <div className="hidden xl:flex items-start gap-2 max-w-xs" style={{ paddingLeft: '20px', borderLeft: '1px solid rgba(139,92,246,0.18)' }}>
              <p className="text-xs italic leading-relaxed transition-opacity duration-300" style={{ color: 'rgba(226,226,236,0.35)', opacity: quoteFade ? 1 : 0 }}>
                &ldquo;{QUOTES[quoteIdx]}&rdquo;
              </p>
            </div>
          </div>
        </RevealSection>

        {/* ══ FINAL DESTINATION ═════════════════════════════════════════════ */}
        {character.dream && (
          <RevealSection delay={0.01}>
            <button
              onClick={() => setShowDream(true)}
              className="w-full relative text-center py-2.5 px-6 overflow-hidden rounded-xl transition-all duration-200"
              style={{ background: 'rgba(109,40,217,0.06)', border: '1px solid rgba(139,92,246,0.12)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.28)'; (e.currentTarget as HTMLElement).style.background = 'rgba(109,40,217,0.1)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.12)'; (e.currentTarget as HTMLElement).style.background = 'rgba(109,40,217,0.06)'; }}
            >
              <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 100% at 50% 50%, rgba(109,40,217,0.07) 0%, transparent 70%)' }} />
              <p className="relative font-mono text-[8px] tracking-[0.5em] uppercase mb-0.5" style={{ color: 'rgba(139,92,246,0.4)' }}>FINAL DESTINATION</p>
              <p className="relative font-semibold leading-snug" style={{ fontSize: 'clamp(0.8rem, 1.5vw, 0.95rem)', color: 'rgba(226,226,236,0.78)', textShadow: '0 0 20px rgba(139,92,246,0.4)' }}>
                {character.dream}
              </p>
            </button>
          </RevealSection>
        )}

        {/* ══ QUICK ACCESS ══════════════════════════════════════════════════ */}
        <RevealSection delay={0.02}>
          <QuickAccessBar />
        </RevealSection>

        {/* ══ MAIN GRID — TODAY (left) + PANEL (right) ══════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

          {/* LEFT: TODAY */}
          <RevealSection delay={0.04} className="lg:col-span-7">
            <div className="rounded-2xl overflow-hidden" style={{
              background: 'linear-gradient(160deg, rgba(18,10,40,0.97) 0%, rgba(10,7,24,0.98) 100%)',
              border: '1px solid rgba(139,92,246,0.28)',
              boxShadow: '0 0 50px rgba(109,40,217,0.14), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}>
              {/* Header */}
              <div className="px-6 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(139,92,246,0.12)' }}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-mono text-[9px] tracking-[0.45em] uppercase mb-0.5" style={{ color: 'rgba(139,92,246,0.6)' }}>MISSION BRIEFING</p>
                    <h2 className="font-black leading-none tracking-tighter" style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', color: 'rgba(226,226,236,0.95)' }}>TODAY</h2>
                    <p className="font-mono text-[9px] tracking-[0.3em] mt-0.5" style={{ color: 'rgba(226,226,236,0.35)' }}>{formatTodayDate()}</p>
                  </div>
                  {todayTotal > 0 && (
                    <div className="flex flex-col items-end gap-0.5">
                      <div className="flex items-baseline gap-1">
                        <span className="font-mono font-black" style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', color: todayProgress >= 100 ? 'rgba(34,197,94,0.9)' : 'rgba(167,139,250,0.95)' }}>{todayDone}</span>
                        <span className="font-mono text-xs" style={{ color: 'rgba(226,226,236,0.4)' }}>/ {todayTotal}</span>
                      </div>
                      <div className="w-16 h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(139,92,246,0.15)' }}>
                        <motion.div className="h-full rounded-full"
                          style={{ background: todayProgress >= 100 ? 'rgba(34,197,94,0.8)' : 'linear-gradient(90deg, rgba(109,40,217,1), rgba(167,139,250,0.9))' }}
                          initial={{ width: 0 }} animate={{ width: `${todayProgress}%` }}
                          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Task list */}
              <div className="px-6 py-4">
                {repeatingActive.length === 0 && repeatingDone.length === 0 && carried.length === 0 ? (
                  <div className="py-5 text-center">
                    <p className="font-mono text-[10px] tracking-[0.2em] uppercase mb-1.5" style={{ color: 'rgba(226,226,236,0.35)' }}>NO TASKS YET</p>
                    <p className="font-mono text-[9px]" style={{ color: 'rgba(139,92,246,0.45)' }}>ADD ONE BELOW — REPEATING QUESTS BUILD YOUR STREAK</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <AnimatePresence>
                      {repeatingActive.map((q) => (
                        <TodayTaskRow key={q.id} quest={q} justChecked={justChecked === q.id} onToggle={() => handleToggleRepeating(q)} />
                      ))}
                    </AnimatePresence>

                    {carried.length > 0 && (
                      <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(234,179,8,0.15)' }}>
                        <AnimatePresence>
                          {carried.map((q) => (
                            <TodayTaskRow key={q.id} quest={q} justChecked={justChecked === q.id} onToggle={() => handleToggleOneOff(q)} overdue />
                          ))}
                        </AnimatePresence>
                      </div>
                    )}

                    {repeatingDone.length > 0 && (
                      <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(139,92,246,0.1)' }}>
                        <AnimatePresence>
                          {repeatingDone.map((q) => (
                            <TodayTaskRow key={q.id} quest={q} justChecked={false} onToggle={() => handleToggleRepeating(q)} />
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quick-add */}
              <div className="px-6 pb-5" style={{ borderTop: '1px solid rgba(139,92,246,0.1)' }}>
                <form onSubmit={handleQuickAdd} className="flex gap-2 mt-4">
                  <input
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    placeholder="Add a task for today..."
                    className="input-glow flex-1 rounded-xl px-4 py-2.5 text-sm placeholder:opacity-20 transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(139,92,246,0.12)', color: 'rgba(226,226,236,0.85)' }}
                  />
                  <motion.button type="submit" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    className="px-4 py-2.5 rounded-xl font-mono text-[10px] tracking-[0.2em] uppercase flex-shrink-0"
                    style={{ background: 'rgba(109,40,217,0.4)', border: '1px solid rgba(139,92,246,0.3)', color: 'rgba(167,139,250,0.95)' }}
                  >ADD</motion.button>
                </form>
              </div>
            </div>
          </RevealSection>

          {/* RIGHT: Everything else stacked */}
          <RevealSection delay={0.05} className="lg:col-span-5">
            <div className="flex flex-col gap-3">

              {/* Main Quest */}
              {mainQuest ? (
                <Link href={`/quests/${mainQuest.id}`}
                  className="block rounded-2xl p-4 transition-all duration-200 group animate-quest-glow"
                  style={{ background: 'rgba(15,9,35,0.92)', border: '1px solid rgba(139,92,246,0.28)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.55)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.28)'; }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-mono text-[9px] font-bold" style={{ background: 'rgba(109,40,217,0.25)', border: '1px solid rgba(139,92,246,0.3)', color: 'rgba(167,139,250,0.85)' }}>MQ</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-[8px] tracking-[0.3em] uppercase mb-1" style={{ color: 'rgba(139,92,246,0.6)' }}>MAIN QUEST</p>
                      <h3 className="font-bold text-sm leading-snug" style={{ color: 'rgba(226,226,236,0.95)' }}>{mainQuest.title}</h3>
                      {mainQuest.description && <p className="mt-1 text-xs leading-relaxed line-clamp-2" style={{ color: 'rgba(226,226,236,0.5)' }}>{mainQuest.description}</p>}
                      {mainQuest.subtasks && mainQuest.subtasks.length > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(139,92,246,0.15)' }}>
                            <div className="h-full rounded-full" style={{ width: `${Math.round((mainQuest.subtasks.filter(s => s.isComplete).length / mainQuest.subtasks.length) * 100)}%`, background: 'linear-gradient(90deg, rgba(109,40,217,0.8), rgba(167,139,250,0.7))' }} />
                          </div>
                          <span className="font-mono text-[8px]" style={{ color: 'rgba(139,92,246,0.6)' }}>{mainQuest.subtasks.filter(s => s.isComplete).length}/{mainQuest.subtasks.length}</span>
                        </div>
                      )}
                    </div>
                    <svg className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2.5 1.5l5 3.5-5 3.5" stroke="rgba(167,139,250,0.5)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </Link>
              ) : (
                <Link href="/quests"
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(139,92,246,0.18)' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.35)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.18)')}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center font-mono text-[9px]" style={{ background: 'rgba(109,40,217,0.12)', color: 'rgba(139,92,246,0.5)' }}>MQ</div>
                  <span className="font-mono text-[10px] tracking-[0.15em] uppercase" style={{ color: 'rgba(226,226,236,0.3)' }}>SET YOUR MAIN QUEST →</span>
                </Link>
              )}

              {/* Boss Battle — right after main quest */}
              {nearestBoss && countdown ? (
                <CompactBossCard boss={nearestBoss} countdown={countdown} />
              ) : (
                <Link href="/boss-battles"
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-200"
                  style={{ background: 'rgba(32,8,8,0.5)', border: '1px dashed rgba(239,68,68,0.2)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.4)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.2)'; }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: 'rgba(239,68,68,0.4)', flexShrink: 0 }}><path d="M8 1.5L10 5.5H14L10.5 8.5L12 12L8 9.5L4 12L5.5 8.5L2 5.5H6L8 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/><path d="M5 13.5h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                  <div>
                    <p className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: 'rgba(226,226,236,0.35)' }}>NO ACTIVE BOSS</p>
                    <p className="font-mono text-[8px] tracking-widest" style={{ color: 'rgba(239,68,68,0.4)' }}>ADD A DEADLINE →</p>
                  </div>
                </Link>
              )}

              {/* Side Quests */}
              <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.14)' }}>
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(139,92,246,0.1)' }}>
                  <span className="font-mono text-[9px] tracking-[0.3em] uppercase" style={{ color: 'rgba(226,226,236,0.45)' }}>SIDE QUESTS</span>
                  <Link href="/quests" className="font-mono text-[8px] tracking-widest uppercase transition-colors" style={{ color: 'rgba(139,92,246,0.5)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(167,139,250,0.8)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(139,92,246,0.5)')}
                  >ALL →</Link>
                </div>
                {sideQuests.length === 0 ? (
                  <div className="px-4 py-4 text-center">
                    <p className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: 'rgba(226,226,236,0.2)' }}>NO ACTIVE SIDE QUESTS</p>
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: 'rgba(139,92,246,0.08)' }}>
                    {sideQuests.map((q, i) => (
                      <Link key={q.id} href={`/quests/${q.id}`}
                        className="flex items-center gap-3 px-4 py-2.5 transition-all group"
                        style={{ background: 'transparent' }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.07)')}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                      >
                        <span className="font-mono text-[8px] tracking-widest flex-shrink-0 w-4" style={{ color: 'rgba(139,92,246,0.4)' }}>{String(i + 1).padStart(2, '0')}</span>
                        <p className="flex-1 text-sm truncate" style={{ color: 'rgba(226,226,236,0.8)' }}>{q.title}</p>
                        {q.dueDate && <span className="font-mono text-[8px] flex-shrink-0" style={{ color: 'rgba(139,92,246,0.45)' }}>{q.dueDate}</span>}
                        <svg className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" width="7" height="7" viewBox="0 0 7 7" fill="none"><path d="M1.5 1l3 2.5-3 2.5" stroke="rgba(139,92,246,0.4)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Skills */}
              <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.14)' }}>
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(139,92,246,0.1)' }}>
                  <span className="font-mono text-[9px] tracking-[0.3em] uppercase" style={{ color: 'rgba(226,226,236,0.45)' }}>SKILL TREE</span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setShowAddSkill(true)} className="font-mono text-[8px] tracking-widest uppercase transition-colors" style={{ color: 'rgba(139,92,246,0.5)' }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(167,139,250,0.8)')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(139,92,246,0.5)')}
                    >+ ADD</button>
                    {skills.length > 0 && (
                      <Link href="/skills" className="font-mono text-[8px] tracking-widest uppercase transition-colors" style={{ color: 'rgba(139,92,246,0.5)' }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(167,139,250,0.8)')}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(139,92,246,0.5)')}
                      >ALL →</Link>
                    )}
                  </div>
                </div>
                {skills.length === 0 ? (
                  <button onClick={() => setShowAddSkill(true)} className="w-full px-4 py-4 text-center transition-colors"
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.05)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                  >
                    <p className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: 'rgba(226,226,236,0.25)' }}>NO SKILLS YET — ADD YOUR FIRST →</p>
                  </button>
                ) : (
                  <div className="divide-y" style={{ borderColor: 'rgba(139,92,246,0.08)' }}>
                    {skills.slice(0, 4).map((skill) => (
                      <Link key={skill.id} href={`/skills/${skill.id}`}
                        className="flex items-center gap-3 px-4 py-2.5 transition-all group"
                        style={{ background: 'transparent' }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.07)')}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                      >
                        <SkillBadge name={skill.name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium truncate" style={{ color: 'rgba(226,226,236,0.82)' }}>{skill.name}</span>
                            <span className="font-mono text-[8px] flex-shrink-0 ml-2" style={{ color: 'rgba(139,92,246,0.6)' }}>LVL {skillLevel(skillTotalXP(skill))}</span>
                          </div>
                          <XpBar value={xpInCurrentLevel(skillTotalXP(skill))} size="sm" showLabel={false} />
                        </div>
                        <svg className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" width="7" height="7" viewBox="0 0 7 7" fill="none"><path d="M1.5 1l3 2.5-3 2.5" stroke="rgba(139,92,246,0.4)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </Link>
                    ))}
                    {skills.length > 4 && (
                      <Link href="/skills" className="block px-4 py-2 font-mono text-[8px] tracking-widest text-center uppercase transition-colors" style={{ color: 'rgba(139,92,246,0.45)' }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(167,139,250,0.8)')}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(139,92,246,0.45)')}
                      >+{skills.length - 4} MORE IN SKILL TREE →</Link>
                    )}
                  </div>
                )}
              </div>


            </div>
          </RevealSection>

        </div>
      </div>

      {/* Add Skill Modal */}
      {showAddSkill && (
        <Modal title="New Skill" subtitle="SKILL_TREE / ADD" onClose={() => setShowAddSkill(false)}>
          <form onSubmit={handleAddSkill} className="space-y-5">
            <div>
              <label className="block font-mono text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: 'rgba(226,226,236,0.3)' }}>Skill Name</label>
              <div className="flex items-center gap-3">
                <SkillBadge name={skillForm.name || '?'} size="sm" />
                <input type="text" value={skillForm.name} onChange={(e) => setSkillForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. TypeScript, Piano, Design" required maxLength={40} autoFocus
                  className="input-glow flex-1 rounded-xl px-4 py-2.5 text-sm text-white/90 placeholder:text-white/20 transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(139,92,246,0.2)' }}
                />
              </div>
            </div>
            <div className="rounded-xl px-4 py-3 font-mono text-[10px] tracking-[0.15em]"
              style={{ background: 'rgba(109,40,217,0.12)', border: '1px solid rgba(139,92,246,0.2)', color: 'rgba(167,139,250,0.7)' }}>
              ✦ ALL SKILLS START AT LEVEL 1 — EARN XP VIA OBJECTIVES, PROJECTS & COURSES
            </div>
            <motion.button type="submit" disabled={savingSkill || !skillForm.name.trim()} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl font-mono font-bold text-xs tracking-[0.25em] uppercase transition-all disabled:opacity-40 disabled:pointer-events-none"
              style={{ background: 'linear-gradient(135deg, rgba(109,40,217,0.9) 0%, rgba(139,92,246,0.7) 100%)', color: 'rgba(255,255,255,0.9)', boxShadow: '0 0 20px rgba(109,40,217,0.25)' }}
            >
              {savingSkill ? 'SAVING...' : 'ADD TO SKILL TREE'}
            </motion.button>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── Compact Boss Card ──────────────────────────────────────────────────────────
function CompactBossCard({ boss, countdown }: { boss: BossBattle; countdown: ReturnType<typeof getCountdown> }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="rounded-2xl px-4 py-3 flex items-center gap-3 transition-all duration-300"
      style={{
        background: 'linear-gradient(135deg, rgba(28,6,6,0.95) 0%, rgba(16,4,4,0.97) 100%)',
        border: `1px solid ${hovered ? 'rgba(239,68,68,0.65)' : countdown.urgent ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.25)'}`,
        boxShadow: hovered ? '0 0 40px rgba(239,68,68,0.35)' : countdown.urgent ? '0 0 30px rgba(239,68,68,0.18)' : '0 0 20px rgba(239,68,68,0.08)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: hovered || countdown.urgent ? 'rgba(239,68,68,0.9)' : 'rgba(239,68,68,0.5)', flexShrink: 0 }}>
        <path d="M8 1.5L10 5.5H14L10.5 8.5L12 12L8 9.5L4 12L5.5 8.5L2 5.5H6L8 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
        <path d="M5 13.5h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
      <div className="flex-1 min-w-0">
        <p className="font-mono text-[8px] tracking-[0.3em] uppercase mb-0.5" style={{ color: hovered || countdown.urgent ? 'rgba(239,68,68,0.85)' : 'rgba(239,68,68,0.5)' }}>
          {countdown.urgent ? '⚡ BOSS THREAT' : 'INCOMING BOSS'}
        </p>
        <p className="text-xs font-semibold truncate" style={{ color: hovered ? 'rgba(252,165,165,1)' : 'rgba(226,226,236,0.85)' }}>{boss.title}</p>
      </div>
      <div className="flex items-baseline gap-1 flex-shrink-0">
        {countdown.expired ? (
          <span className="font-mono font-black text-sm" style={{ color: 'rgba(239,68,68,1)' }}>EXPIRED</span>
        ) : (
          <>
            {countdown.days > 0 && <><span className="font-mono font-black tabular-nums text-lg leading-none" style={{ color: 'rgba(239,68,68,0.95)' }}>{countdown.days}</span><span className="font-mono text-[8px]" style={{ color: 'rgba(226,226,236,0.3)' }}>d </span></>}
            <span className="font-mono font-black tabular-nums text-lg leading-none" style={{ color: 'rgba(239,68,68,0.95)' }}>{String(countdown.hours).padStart(2,'0')}</span><span className="font-mono text-[8px]" style={{ color: 'rgba(226,226,236,0.3)' }}>h </span>
            <span className="font-mono font-black tabular-nums text-lg leading-none" style={{ color: 'rgba(239,68,68,0.95)' }}>{String(countdown.minutes).padStart(2,'0')}</span><span className="font-mono text-[8px]" style={{ color: 'rgba(226,226,236,0.3)' }}>m </span>
            <span className="font-mono font-black tabular-nums text-base leading-none opacity-80" style={{ color: 'rgba(239,68,68,0.95)' }}>{String(countdown.seconds).padStart(2,'0')}</span><span className="font-mono text-[8px]" style={{ color: 'rgba(226,226,236,0.3)' }}>s</span>
          </>
        )}
      </div>
      <Link href="/boss-battles" className="flex-shrink-0 font-mono text-[8px] tracking-widest uppercase transition-colors pl-1" style={{ color: 'rgba(226,226,236,0.3)' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(226,226,236,0.6)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(226,226,236,0.3)')}
      >→</Link>
    </div>
  );
}

// ── TodayTaskRow ──────────────────────────────────────────────────────────────
function TodayTaskRow({ quest, justChecked, onToggle, overdue }: {
  quest: Quest; justChecked: boolean; onToggle: () => void; overdue?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const subtasks = quest.subtasks ?? [];
  const previewSubs = subtasks.slice(0, 3);
  const extraCount = subtasks.length - 3;
  const hasPreview = !!quest.description || subtasks.length > 0;

  return (
    <motion.div layout
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: quest.isComplete ? 0.4 : 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl overflow-hidden"
      style={{
        background: overdue ? 'rgba(234,179,8,0.06)' : quest.isComplete ? 'rgba(255,255,255,0.02)' : 'rgba(139,92,246,0.08)',
        border: `1px solid ${overdue ? 'rgba(234,179,8,0.2)' : quest.isComplete ? 'rgba(255,255,255,0.05)' : 'rgba(139,92,246,0.18)'}`,
      }}
      onMouseEnter={() => hasPreview && !quest.isComplete && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none group" onClick={onToggle}>
        <div className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200"
          style={{
            background: quest.isComplete ? (overdue ? 'rgba(234,179,8,0.7)' : 'rgba(109,40,217,0.85)') : 'transparent',
            border: `1.5px solid ${quest.isComplete ? 'transparent' : overdue ? 'rgba(234,179,8,0.35)' : 'rgba(139,92,246,0.3)'}`,
            boxShadow: quest.isComplete && justChecked ? `0 0 12px ${overdue ? 'rgba(234,179,8,0.5)' : 'rgba(109,40,217,0.6)'}` : 'none',
          }}
        >
          <AnimatePresence>
            {quest.isComplete && (
              <motion.svg initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ duration: 0.15 }}
                width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </motion.svg>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium leading-snug transition-all duration-200"
              style={{ color: quest.isComplete ? 'rgba(226,226,236,0.25)' : 'rgba(226,226,236,0.88)', textDecoration: quest.isComplete ? 'line-through' : 'none' }}>
              {quest.title}
            </p>
            {isRepeatingDaily(quest) && (
              <span className="font-mono text-[8px] px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.15)', color: 'rgba(139,92,246,0.5)' }}>↻</span>
            )}
          </div>
        </div>

        <Link href={`/quests/${quest.id}`}
          className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-1 rounded"
          onClick={(e) => e.stopPropagation()}
          style={{ color: 'rgba(139,92,246,0.4)' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(167,139,250,0.8)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(139,92,246,0.4)')}
        >
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M2 1.5h5.5v5.5M2 7l5.5-5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </Link>
      </div>

      <AnimatePresence>
        {hovered && hasPreview && (
          <motion.div key="preview"
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-4 pb-3 pt-1 space-y-2" style={{ borderTop: `1px solid ${overdue ? 'rgba(234,179,8,0.08)' : 'rgba(139,92,246,0.07)'}` }}>
              {quest.description && <p className="text-xs leading-relaxed" style={{ color: 'rgba(226,226,236,0.4)' }}>{quest.description}</p>}
              {previewSubs.length > 0 && (
                <div className="space-y-1.5">
                  {previewSubs.map((sub) => (
                    <div key={sub.id} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm flex-shrink-0 flex items-center justify-center"
                        style={{ border: `1px solid ${sub.isComplete ? 'rgba(109,40,217,0.6)' : 'rgba(139,92,246,0.2)'}`, background: sub.isComplete ? 'rgba(109,40,217,0.4)' : 'transparent' }}>
                        {sub.isComplete && <svg width="6" height="6" viewBox="0 0 6 6" fill="none"><path d="M1 3l1.5 1.5 2.5-2.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <span className="text-xs" style={{ color: sub.isComplete ? 'rgba(226,226,236,0.2)' : 'rgba(226,226,236,0.5)', textDecoration: sub.isComplete ? 'line-through' : 'none' }}>{sub.text}</span>
                    </div>
                  ))}
                  {extraCount > 0 && <p className="font-mono text-[9px] tracking-widest" style={{ color: 'rgba(139,92,246,0.35)', paddingLeft: '20px' }}>+{extraCount} more</p>}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
