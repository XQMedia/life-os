'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getFocusSessions, addFocusSession, getSkills, generateId, grantSkillXP } from '@/lib/db';
import type { FocusSession, Skill } from '@/lib/types';

const PRESETS = [
  { label: 'Deep Work', minutes: 25, break: 5 },
  { label: 'Sprint', minutes: 50, break: 10 },
  { label: 'Flow', minutes: 90, break: 20 },
];

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function FocusClient() {
  const [preset, setPreset] = useState(0);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [secs, setSecs] = useState(PRESETS[0].minutes * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<string>('');
  const [label, setLabel] = useState('');
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [completedToday, setCompletedToday] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalSecs = (mode === 'work' ? PRESETS[preset].minutes : PRESETS[preset].break) * 60;

  const load = useCallback(async () => {
    const [s, sk] = await Promise.all([getFocusSessions(), getSkills()]);
    setSessions(s);
    setSkills(sk);
    setCompletedToday(s.filter((x) => new Date(x.createdAt).toISOString().slice(0, 10) === todayStr()).length);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecs((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          setRunning(false);
          handleComplete();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, mode, preset]);

  async function handleComplete() {
    if (!sessionStartTime) return;
    const dur = mode === 'work' ? PRESETS[preset].minutes : PRESETS[preset].break;
    const xp = mode === 'work' ? Math.round(dur / 5) * 10 : 0;
    const session: FocusSession = {
      id: generateId(),
      startTime: sessionStartTime,
      endTime: Date.now(),
      duration: dur,
      skillId: selectedSkillId || undefined,
      label: label || undefined,
      xpEarned: xp,
      createdAt: Date.now(),
    };
    await addFocusSession(session);
    if (selectedSkillId && xp > 0) await grantSkillXP(selectedSkillId, xp);
    setSessionStartTime(null);
    await load();
    // Auto-switch mode
    setMode((m) => (m === 'work' ? 'break' : 'work'));
  }

  function start() {
    setSessionStartTime(Date.now());
    setRunning(true);
  }

  function pause() { setRunning(false); }

  function reset() {
    setRunning(false);
    setSessionStartTime(null);
    setSecs((mode === 'work' ? PRESETS[preset].minutes : PRESETS[preset].break) * 60);
  }

  function switchMode(m: 'work' | 'break') {
    setMode(m);
    setRunning(false);
    setSessionStartTime(null);
    setSecs((m === 'work' ? PRESETS[preset].minutes : PRESETS[preset].break) * 60);
  }

  function selectPreset(i: number) {
    setPreset(i);
    setRunning(false);
    setSessionStartTime(null);
    setSecs((mode === 'work' ? PRESETS[i].minutes : PRESETS[i].break) * 60);
  }

  const progress = 1 - secs / totalSecs;
  const size = 220;
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;

  const modeColor = mode === 'work' ? 'rgba(139,92,246,1)' : 'rgba(16,185,129,1)';
  const modeGlow = mode === 'work' ? 'rgba(139,92,246,0.35)' : 'rgba(16,185,129,0.35)';

  const todaySessions = sessions.filter((s) => new Date(s.createdAt).toISOString().slice(0, 10) === todayStr());
  const totalFocusToday = todaySessions.filter((s) => s.xpEarned > 0).reduce((a, s) => a + s.duration, 0);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {/* Header */}
      <motion.div className="mb-10" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="font-mono text-[10px] tracking-[0.4em] uppercase mb-1" style={{ color: 'rgba(139,92,246,0.5)' }}>LIFE.OS / 09</div>
        <div className="flex items-end justify-between">
          <h1 className="font-black text-3xl tracking-tight" style={{ color: 'rgba(226,226,236,0.95)' }}>Focus Timer</h1>
          <div className="text-right">
            <div className="font-mono text-xl font-bold" style={{ color: modeColor }}>{totalFocusToday}m</div>
            <div className="font-mono text-[10px] tracking-widest uppercase" style={{ color: 'rgba(226,226,236,0.3)' }}>focused today</div>
          </div>
        </div>
      </motion.div>

      {/* Mode toggle */}
      <motion.div
        className="flex gap-2 mb-8 p-1 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
      >
        {(['work', 'break'] as const).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className="flex-1 py-2.5 rounded-xl font-mono text-xs tracking-widest uppercase font-bold transition-all duration-200"
            style={{
              background: mode === m ? (m === 'work' ? 'rgba(109,40,217,0.3)' : 'rgba(16,185,129,0.2)') : 'transparent',
              color: mode === m ? (m === 'work' ? 'rgba(167,139,250,1)' : 'rgba(16,185,129,1)') : 'rgba(226,226,236,0.3)',
              border: mode === m ? `1px solid ${m === 'work' ? 'rgba(139,92,246,0.4)' : 'rgba(16,185,129,0.4)'}` : '1px solid transparent',
            }}
          >
            {m === 'work' ? '⚡ Focus' : '☕ Break'}
          </button>
        ))}
      </motion.div>

      {/* Preset selector */}
      <motion.div
        className="flex gap-2 mb-10"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
      >
        {PRESETS.map((p, i) => (
          <button
            key={i}
            onClick={() => selectPreset(i)}
            className="flex-1 py-2 rounded-xl font-mono text-[11px] tracking-wider transition-all"
            style={{
              background: preset === i ? 'rgba(109,40,217,0.15)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${preset === i ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.05)'}`,
              color: preset === i ? 'rgba(167,139,250,0.9)' : 'rgba(226,226,236,0.35)',
            }}
          >
            <div>{p.label}</div>
            <div style={{ opacity: 0.6, fontSize: 10 }}>{p.minutes}m</div>
          </button>
        ))}
      </motion.div>

      {/* Timer circle */}
      <motion.div
        className="flex justify-center mb-10"
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
      >
        <div className="relative" style={{ width: size, height: size }}>
          {/* Glow */}
          {running && (
            <motion.div
              className="absolute inset-4 rounded-full"
              style={{ background: modeGlow, filter: 'blur(30px)' }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}

          <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
            <motion.circle
              cx={size / 2} cy={size / 2} r={r}
              fill="none"
              stroke={modeColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circ}
              animate={{ strokeDashoffset: circ * (1 - progress) }}
              transition={{ duration: 0.5, ease: 'linear' }}
              style={{ filter: `drop-shadow(0 0 8px ${modeColor})` }}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div
              className="font-mono font-black"
              style={{
                fontSize: 52,
                color: 'rgba(226,226,236,0.95)',
                letterSpacing: '-0.05em',
                lineHeight: 1,
              }}
              animate={running ? { opacity: [1, 0.85, 1] } : { opacity: 1 }}
              transition={running ? { duration: 1, repeat: Infinity } : {}}
            >
              {formatTime(secs)}
            </motion.div>
            <div className="font-mono text-[11px] tracking-[0.3em] uppercase mt-2" style={{ color: modeColor, opacity: 0.7 }}>
              {mode === 'work' ? PRESETS[preset].label : 'Rest'}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Controls */}
      <motion.div
        className="flex items-center justify-center gap-4 mb-8"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
      >
        <motion.button
          onClick={reset}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.93 }}
          className="w-11 h-11 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(226,226,236,0.4)' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2.5 7a4.5 4.5 0 1 0 .9-2.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <path d="M2.5 3v4h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.button>

        <motion.button
          onClick={running ? pause : start}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.93 }}
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${modeColor.replace('1)', '0.9)')}, ${modeColor.replace('1)', '0.6)')})`,
            boxShadow: `0 0 30px ${modeGlow}, 0 0 60px ${modeGlow.replace('0.35', '0.12')}`,
          }}
        >
          <AnimatePresence mode="wait">
            {running ? (
              <motion.svg key="pause" width="16" height="20" viewBox="0 0 16 20" fill="none"
                initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }}>
                <rect x="1" y="1" width="5" height="18" rx="2" fill="white"/>
                <rect x="10" y="1" width="5" height="18" rx="2" fill="white"/>
              </motion.svg>
            ) : (
              <motion.svg key="play" width="18" height="20" viewBox="0 0 18 20" fill="none"
                initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }}>
                <path d="M2 1.5l14 8.5L2 18.5V1.5z" fill="white"/>
              </motion.svg>
            )}
          </AnimatePresence>
        </motion.button>

        <div className="w-11 h-11" />
      </motion.div>

      {/* Session config */}
      <motion.div
        className="rounded-2xl p-4 mb-8 space-y-3"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
      >
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="What are you working on? (optional)"
          className="w-full bg-transparent text-sm outline-none"
          style={{ color: 'rgba(226,226,236,0.7)', caretColor: modeColor }}
        />
        {skills.length > 0 && (
          <select
            value={selectedSkillId}
            onChange={(e) => setSelectedSkillId(e.target.value)}
            className="w-full bg-transparent text-sm outline-none cursor-pointer"
            style={{ color: selectedSkillId ? 'rgba(226,226,236,0.7)' : 'rgba(226,226,236,0.3)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}
          >
            <option value="" style={{ background: '#07070d' }}>Link to skill (earn XP)</option>
            {skills.map((s) => (
              <option key={s.id} value={s.id} style={{ background: '#07070d' }}>{s.icon} {s.name}</option>
            ))}
          </select>
        )}
      </motion.div>

      {/* Today's sessions */}
      {todaySessions.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
          <div className="font-mono text-[10px] tracking-[0.35em] uppercase mb-3" style={{ color: 'rgba(226,226,236,0.25)' }}>
            Today's Sessions
          </div>
          <div className="space-y-2">
            {todaySessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div>
                  <div className="text-sm" style={{ color: 'rgba(226,226,236,0.7)' }}>{s.label || 'Focus session'}</div>
                  <div className="font-mono text-[10px]" style={{ color: 'rgba(226,226,236,0.3)' }}>
                    {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-bold" style={{ color: s.xpEarned > 0 ? 'rgba(139,92,246,0.8)' : 'rgba(226,226,236,0.3)' }}>
                    {s.duration}m
                  </div>
                  {s.xpEarned > 0 && (
                    <div className="font-mono text-[10px]" style={{ color: 'rgba(139,92,246,0.5)' }}>+{s.xpEarned} XP</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
