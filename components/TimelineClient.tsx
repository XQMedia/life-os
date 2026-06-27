'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { getQuests, getBossBattles, inferQuestType, isRepeatingDaily } from '@/lib/db';
import type { Quest, BossBattle } from '@/lib/types';
import RevealSection from './RevealSection';

type TimelineEvent = {
  date: string;        // 'YYYY-MM-DD'
  type: 'daily' | 'quest' | 'boss';
  label: string;
  isComplete?: boolean;
  isUrgent?: boolean;
};

function getNextDays(n: number): string[] {
  const days: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.now() + i * 86_400_000);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function formatDay(dateStr: string): { weekday: string; date: string; isToday: boolean } {
  const d = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  return {
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase(),
    isToday,
  };
}

export default function TimelineClient() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [bosses, setBosses] = useState<BossBattle[]>([]);

  const load = useCallback(async () => {
    const [q, b] = await Promise.all([getQuests(), getBossBattles()]);
    setQuests(q);
    setBosses(b);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Build event map: date → events
  const days = getNextDays(30);
  const todayStr = days[0];

  const eventMap = new Map<string, TimelineEvent[]>();

  // Repeating daily quests appear on every day in the next 30
  const dailyQuests = quests.filter((q) => isRepeatingDaily(q));
  if (dailyQuests.length > 0) {
    days.forEach((d) => {
      if (!eventMap.has(d)) eventMap.set(d, []);
      dailyQuests.forEach((q) => {
        eventMap.get(d)!.push({ date: d, type: 'daily', label: q.title, isComplete: q.isComplete && d === todayStr });
      });
    });
  }

  // Long-term quests with a dueDate plot on that date
  quests.filter((q) => inferQuestType(q) === 'longTerm' && q.dueDate && days.includes(q.dueDate)).forEach((q) => {
    if (!eventMap.has(q.dueDate!)) eventMap.set(q.dueDate!, []);
    const daysUntil = days.indexOf(q.dueDate!);
    eventMap.get(q.dueDate!)!.push({ date: q.dueDate!, type: 'quest', label: q.title, isComplete: q.isComplete, isUrgent: daysUntil <= 2 });
  });

  // Boss battle deadlines
  bosses.filter((b) => !b.isDefeated && days.includes(b.deadlineDate)).forEach((b) => {
    if (!eventMap.has(b.deadlineDate)) eventMap.set(b.deadlineDate!, []);
    const daysUntil = days.indexOf(b.deadlineDate);
    eventMap.get(b.deadlineDate)!.push({ date: b.deadlineDate, type: 'boss', label: b.title, isUrgent: daysUntil <= 3 });
  });

  // Only show days that have events (always show today)
  const activeDays = days.filter((d) => d === todayStr || (eventMap.has(d) && eventMap.get(d)!.length > 0));

  const isEmpty = activeDays.length <= 1 && (!eventMap.has(todayStr) || eventMap.get(todayStr)!.length === 0);

  return (
    <div className="relative min-h-dvh">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div style={{ position: 'absolute', top: '10%', right: '-10%', width: '50vw', height: '50vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,40,217,0.06) 0%, transparent 65%)', filter: 'blur(80px)' }} />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl px-5 py-10 space-y-10">
        {/* Header */}
        <RevealSection>
          <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: 'rgba(139,92,246,0.5)' }}>LIFE.OS / CAMPAIGN MAP</p>
          <h1 className="font-black leading-none tracking-tighter" style={{ fontSize: 'clamp(2.2rem, 5vw, 3rem)', color: 'rgba(226,226,236,0.95)' }}>TIMELINE</h1>
          <p className="text-sm mt-2" style={{ color: 'rgba(226,226,236,0.3)' }}>Next 30 days — quests, deadlines & daily missions plotted.</p>
        </RevealSection>

        {/* Legend */}
        <RevealSection delay={0.04}>
          <div className="flex items-center gap-6 flex-wrap">
            {[
              { color: 'rgba(139,92,246,0.6)', label: 'DAILY' },
              { color: 'rgba(167,139,250,0.6)', label: 'QUEST' },
              { color: 'rgba(239,68,68,0.7)', label: 'BOSS DEADLINE' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
                <span className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: 'rgba(226,226,236,0.3)' }}>{label}</span>
              </div>
            ))}
          </div>
        </RevealSection>

        {/* Timeline */}
        {isEmpty ? (
          <RevealSection delay={0.06}>
            <div className="rounded-2xl p-12 text-center" style={{ background: 'rgba(255,255,255,0.015)', border: '1px dashed rgba(139,92,246,0.08)' }}>
              <p className="font-mono text-[11px] tracking-[0.2em] uppercase mb-2" style={{ color: 'rgba(226,226,236,0.15)' }}>NO EVENTS IN THE NEXT 30 DAYS.</p>
              <p className="font-mono text-[10px]" style={{ color: 'rgba(139,92,246,0.3)' }}>ADD QUESTS WITH DUE DATES OR BOSS BATTLES TO POPULATE THE TIMELINE.</p>
            </div>
          </RevealSection>
        ) : (
          <div className="relative">
            {/* Vertical spine */}
            <div className="absolute left-[22px] top-0 bottom-0 w-px" style={{ background: 'linear-gradient(to bottom, transparent, rgba(139,92,246,0.2) 5%, rgba(139,92,246,0.15) 90%, transparent)' }} />

            <div className="space-y-1">
              {activeDays.map((day, idx) => {
                const { weekday, date, isToday } = formatDay(day);
                const events = eventMap.get(day) ?? [];
                const hasBoss = events.some((e) => e.type === 'boss');
                const hasUrgent = events.some((e) => e.isUrgent);

                return (
                  <motion.div
                    key={day}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: idx * 0.03 }}
                    className="flex gap-6 py-3"
                  >
                    {/* Node */}
                    <div className="flex flex-col items-center flex-shrink-0" style={{ width: '44px' }}>
                      <div
                        className="w-4 h-4 rounded-full border flex-shrink-0 mt-0.5"
                        style={{
                          background: isToday
                            ? 'rgba(167,139,250,0.9)'
                            : hasBoss || hasUrgent
                              ? 'rgba(239,68,68,0.6)'
                              : events.length > 0
                                ? 'rgba(109,40,217,0.6)'
                                : 'rgba(255,255,255,0.06)',
                          border: `1px solid ${isToday ? 'rgba(167,139,250,1)' : hasBoss ? 'rgba(239,68,68,0.8)' : events.length > 0 ? 'rgba(139,92,246,0.6)' : 'rgba(255,255,255,0.08)'}`,
                          boxShadow: isToday
                            ? '0 0 12px rgba(167,139,250,0.7), 0 0 24px rgba(139,92,246,0.3)'
                            : hasBoss || hasUrgent
                              ? '0 0 10px rgba(239,68,68,0.5)'
                              : events.length > 0
                                ? '0 0 8px rgba(109,40,217,0.4)'
                                : 'none',
                        }}
                      />
                    </div>

                    {/* Date label + events */}
                    <div className="flex-1 min-w-0 pb-3" style={{ borderBottom: '1px solid rgba(139,92,246,0.05)' }}>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase"
                          style={{ color: isToday ? 'rgba(167,139,250,0.9)' : 'rgba(226,226,236,0.5)' }}>
                          {isToday ? 'TODAY' : weekday}
                        </span>
                        <span className="font-mono text-[9px] tracking-widest" style={{ color: 'rgba(226,226,236,0.25)' }}>{date}</span>
                      </div>

                      {events.length === 0 && (
                        <p className="font-mono text-[9px] tracking-widest" style={{ color: 'rgba(226,226,236,0.1)' }}>—</p>
                      )}

                      <div className="space-y-1.5">
                        {events.map((ev, ei) => (
                          <div key={ei} className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{
                                background: ev.type === 'boss' ? 'rgba(239,68,68,0.8)'
                                  : ev.type === 'daily' ? 'rgba(139,92,246,0.6)'
                                  : 'rgba(167,139,250,0.6)',
                                boxShadow: ev.type === 'boss' ? '0 0 6px rgba(239,68,68,0.6)' : '0 0 4px rgba(139,92,246,0.4)',
                              }}
                            />
                            <span className="font-mono text-[9px] tracking-[0.1em] uppercase flex-shrink-0"
                              style={{
                                color: ev.type === 'boss' ? 'rgba(239,68,68,0.55)'
                                  : ev.type === 'daily' ? 'rgba(139,92,246,0.5)'
                                  : 'rgba(167,139,250,0.5)',
                              }}>
                              {ev.type === 'boss' ? '⚡ BOSS' : ev.type === 'daily' ? 'DAILY' : 'QUEST'}
                            </span>
                            <span className="text-xs truncate" style={{ color: ev.isComplete ? 'rgba(226,226,236,0.25)' : 'rgba(226,226,236,0.7)', textDecoration: ev.isComplete ? 'line-through' : 'none' }}>
                              {ev.label}
                            </span>
                            {ev.isUrgent && !ev.isComplete && (
                              <span className="font-mono text-[8px] tracking-widest px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: 'rgba(239,68,68,0.15)', color: 'rgba(239,68,68,0.8)', border: '1px solid rgba(239,68,68,0.25)' }}>
                                URGENT
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
