'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCharacter, getSkills } from '@/lib/db';
import { skillLevel, skillTotalXP } from '@/lib/db';
import type { Character, Skill } from '@/lib/types';

const NAV = [
  {
    section: 'WORKSPACE',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="1" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.3"/><rect x="8.5" y="1" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.3"/><rect x="1" y="8.5" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.3"/><rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.3"/></svg>
      )},
      { href: '/quests', label: 'Quests', icon: (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5L9.2 5.2L13.2 5.8L10.35 8.55L11.05 12.55L7.5 10.65L3.95 12.55L4.65 8.55L1.8 5.8L5.8 5.2L7.5 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
      )},
      { href: '/skills', label: 'Skills', icon: (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 2L9.5 6H13.5L10.5 8.5L11.5 12.5L7.5 10L3.5 12.5L4.5 8.5L1.5 6H5.5L7.5 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round"/></svg>
      )},
      { href: '/focus', label: 'Focus', icon: (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.3"/><circle cx="7.5" cy="7.5" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M7.5 1.5v1.2M7.5 12.3v1.2M1.5 7.5h1.2M12.3 7.5h1.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
      )},
      { href: '/habits', label: 'Habits', icon: (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.3"/><path d="M4.5 7.5l2.3 2.3L10.5 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
      )},
      { href: '/journal', label: 'Journal', icon: (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2.5" y="1.5" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5 5.5h5M5 8h3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
      )},
      { href: '/brain', label: 'Brain', icon: (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 2.5C5.3 2.5 3.5 4 3.5 6c0 1 .4 1.9 1 2.5C3.8 9 3.5 9.8 4 10.5c.5.8 1.6 1.3 3.5 1.3s3-.5 3.5-1.3c.5-.7.2-1.5-.5-2 .6-.6 1-1.5 1-2.5 0-2-1.8-3.5-4-3.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M7.5 11.8V13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
      )},
    ],
  },
  {
    section: 'MORE',
    items: [
      { href: '/boss-battles', label: 'Boss Battles', icon: (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5L9.5 5.5H13.5L10.5 8L11.5 12L7.5 9.8L3.5 12L4.5 8L1.5 5.5H5.5L7.5 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M5 13h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
      )},
      { href: '/ideas', label: 'Ideas', icon: (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="5.5" r="3.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5.8 9.2c0 1.1.76 2.3 1.7 2.3s1.7-1.2 1.7-2.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M5.8 9.2h3.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
      )},
      { href: '/courses', label: 'Courses', icon: (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="2.5" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M4.5 6h6M4.5 8.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
      )},
      { href: '/profile', label: 'Profile', icon: (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="5" r="3" stroke="currentColor" strokeWidth="1.3"/><path d="M2 13c0-3.04 2.46-5.5 5.5-5.5S13 9.96 13 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
      )},
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [character, setCharacter] = useState<Character | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    Promise.all([getCharacter(), getSkills()]).then(([c, s]) => {
      setCharacter(c);
      setSkills(s);
    });
  }, []);

  const totalXP = skills.reduce((a, s) => a + skillTotalXP(s), 0);
  const level = skills.length > 0 ? Math.floor(totalXP / 500) + 1 : 1;
  const xpInLevel = totalXP % 500;
  const xpProgress = (xpInLevel / 500) * 100;

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="md:hidden fixed top-3 left-3 z-[60] w-9 h-9 rounded-lg flex items-center justify-center"
        style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
        onClick={() => setMobileOpen((o) => !o)}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 flex-shrink-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)' }}>
            <div className="w-3 h-3 rounded-sm bg-white/90" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight" style={{ color: 'var(--text-1)' }}>Life</span>
            <span className="font-bold text-sm tracking-tight" style={{ color: 'var(--accent-text)' }}>.OS</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2" style={{ scrollbarWidth: 'none' }}>
          {NAV.map(({ section, items }) => (
            <div key={section} className="mb-4">
              <div className="px-5 py-1.5 font-mono text-[9px] tracking-[0.4em] uppercase"
                style={{ color: 'var(--text-3)' }}>
                {section}
              </div>
              {items.map(({ href, label, icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`nav-item ${isActive(href) ? 'active' : ''}`}
                >
                  {icon}
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* User card */}
        {character && (
          <div className="flex-shrink-0 p-4 mx-3 mb-4 rounded-2xl"
            style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: 'white' }}>
                {character.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>{character.name}</div>
                <div className="font-mono text-[10px]" style={{ color: 'var(--text-3)' }}>
                  Lvl {level} · {totalXP.toLocaleString()} XP
                </div>
              </div>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${xpProgress}%`, background: 'linear-gradient(90deg, #7c3aed, #a78bfa)' }} />
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
