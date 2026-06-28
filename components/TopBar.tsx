'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getCharacter, getSkills } from '@/lib/db';
import { skillTotalXP } from '@/lib/db';
import type { Character, Skill } from '@/lib/types';

const PAGE_META: Record<string, { section: string; title: string }> = {
  '/dashboard':    { section: 'WORKSPACE', title: 'Dashboard' },
  '/quests':       { section: 'PROGRESS',  title: 'Quests' },
  '/skills':       { section: 'PROGRESS',  title: 'Skill Trees' },
  '/focus':        { section: 'DEEP WORK', title: 'Focus Timer' },
  '/habits':       { section: 'DAILY',     title: 'Habits' },
  '/journal':      { section: 'REFLECT',   title: 'Journal' },
  '/brain':        { section: 'KNOWLEDGE', title: 'Brain' },
  '/boss-battles': { section: 'CHALLENGES','title': 'Boss Battles' },
  '/ideas':        { section: 'CAPTURE',   title: 'Ideas' },
  '/courses':      { section: 'LEARNING',  title: 'Courses' },
  '/profile':      { section: 'YOU',       title: 'Profile' },
};

export default function TopBar() {
  const pathname = usePathname();
  const [character, setCharacter] = useState<Character | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [todayXP] = useState(() => Math.floor(Math.random() * 300) + 50);

  useEffect(() => {
    Promise.all([getCharacter(), getSkills()]).then(([c, s]) => {
      setCharacter(c);
      setSkills(s);
    });
  }, []);

  const meta = Object.entries(PAGE_META).find(([key]) =>
    key === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(key)
  )?.[1] ?? { section: 'LIFE.OS', title: 'Dashboard' };

  const streak = character?.currentStreak ?? 0;

  return (
    <div className="topbar">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: 'var(--text-3)' }}>
          {meta.section}
        </span>
        <span style={{ color: 'var(--text-3)', fontSize: 11 }}>/</span>
        <span className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{meta.title}</span>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-xs mx-auto">
        <div className="flex items-center gap-2 rounded-xl px-3 py-1.5"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--card-border)' }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ color: 'var(--text-3)', flexShrink: 0 }}>
            <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M9 9l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input
            placeholder="Search or ask anything"
            className="bg-transparent text-xs flex-1 outline-none"
            style={{ color: 'var(--text-2)' }}
            readOnly
          />
          <kbd className="font-mono text-[9px] px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-3)' }}>⌘K</kbd>
        </div>
      </div>

      {/* Right chips */}
      <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
        {/* XP today */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
          style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1L7.5 4.5L11 5L8.5 7.5L9 11L6 9.5L3 11L3.5 7.5L1 5L4.5 4.5L6 1Z" fill="#a78bfa" stroke="#a78bfa" strokeWidth="0.5" strokeLinejoin="round"/>
          </svg>
          <span className="font-mono text-xs font-bold" style={{ color: 'var(--accent-text)' }}>+{todayXP}</span>
          <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>today</span>
        </div>

        {/* Streak */}
        {streak > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
            style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <span style={{ fontSize: 12 }}>🔥</span>
            <span className="font-mono text-xs font-bold" style={{ color: '#f59e0b' }}>{streak}</span>
          </div>
        )}
      </div>
    </div>
  );
}
