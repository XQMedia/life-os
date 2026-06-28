'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  {
    href: '/dashboard', label: 'Dashboard', code: '01',
    icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="1" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="7.5" y="1" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="1" y="7.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="7.5" y="7.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg>,
  },
  {
    href: '/quests', label: 'Quests', code: '02',
    icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1L8.2 4.5L12 5.1L9.25 7.8L9.9 11.6L6.5 9.8L3.1 11.6L3.75 7.8L1 5.1L4.8 4.5L6.5 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>,
  },
  {
    href: '/skills', label: 'Skills', code: '03',
    icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1.5L8 4H11L8.5 6L9.5 9L6.5 7.2L3.5 9L4.5 6L2 4H5L6.5 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round"/></svg>,
  },
  {
    href: '/boss-battles', label: 'Bosses', code: '04',
    icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1.5L8 4H11L8.5 6L9.5 9L6.5 7.2L3.5 9L4.5 6L2 4H5L6.5 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round"/><path d="M4 11h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  },
  {
    href: '/habits', label: 'Habits', code: '05',
    icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.2"/><path d="M4 6.5l2 2 3.5-3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  },
  {
    href: '/focus', label: 'Focus', code: '06',
    icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.2"/><circle cx="6.5" cy="6.5" r="2" stroke="currentColor" strokeWidth="1.2"/><path d="M6.5 1.5v1M6.5 10v1M1.5 6.5h1M10 6.5h1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  },
  {
    href: '/journal', label: 'Journal', code: '07',
    icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="2" y="1.5" width="9" height="10" rx="1.2" stroke="currentColor" strokeWidth="1.2"/><path d="M4.5 5h4M4.5 7.5h2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  },
  {
    href: '/brain', label: 'Brain', code: '08',
    icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 2C4.5 2 3 3.3 3 5c0 .8.3 1.5.8 2C3 7.4 3 8 3.5 8.5S5 9.5 6.5 9.5s2.5-.5 3-1 .5-1.1-.3-1.5c.5-.5.8-1.2.8-2C10 3.3 8.5 2 6.5 2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/><path d="M6.5 9.5V11.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  },
  {
    href: '/ideas', label: 'Ideas', code: '09',
    icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="5" r="3.2" stroke="currentColor" strokeWidth="1.2"/><path d="M5 8.5c0 1 .67 2 1.5 2s1.5-1 1.5-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M5.2 8.5h2.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  },
  {
    href: '/courses', label: 'Courses', code: '10',
    icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1.5" y="2" width="10" height="9" rx="1.2" stroke="currentColor" strokeWidth="1.2"/><path d="M4 5.5h5M4 7.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  },
  {
    href: '/profile', label: 'Profile', code: '11',
    icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.2"/><path d="M1.5 11.5c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  },
];

export default function Nav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14"
      style={{ background: 'rgba(7,7,13,0.9)', borderBottom: '1px solid rgba(139,92,246,0.18)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
      <div className="mx-auto max-w-7xl px-4 flex items-center h-full gap-0.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {/* Wordmark */}
        <Link href="/dashboard" className="mr-5 flex items-center gap-2 flex-shrink-0">
          <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(109,40,217,1) 0%, rgba(139,92,246,0.8) 100%)', boxShadow: '0 0 8px rgba(139,92,246,0.5)' }}>
            <div className="w-2 h-2 rounded-sm bg-white/90" />
          </div>
          <span className="font-mono text-xs font-bold tracking-[0.25em] uppercase hidden sm:inline" style={{ color: 'rgba(226,226,236,0.6)' }}>Life.OS</span>
        </Link>

        {links.map(({ href, label, code, icon }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono font-medium transition-all duration-150 flex-shrink-0 whitespace-nowrap"
              style={{
                fontSize: '11px',
                color: active ? 'rgba(167,139,250,0.95)' : 'rgba(226,226,236,0.3)',
                background: active ? 'rgba(139,92,246,0.16)' : 'transparent',
                border: `1px solid ${active ? 'rgba(139,92,246,0.38)' : 'transparent'}`,
              }}
              onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = 'rgba(226,226,236,0.65)'; }}
              onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = 'rgba(226,226,236,0.3)'; }}
            >
              <span style={{ opacity: active ? 0.9 : 0.5 }}>{icon}</span>
              <span className="hidden sm:inline tracking-[0.15em]" style={{ color: active ? 'rgba(139,92,246,0.55)' : 'rgba(226,226,236,0.15)', fontSize: '9px' }}>{code}</span>
              <span className="hidden lg:inline">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
