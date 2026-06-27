'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { getCharacter, saveCharacter } from '@/lib/db';
import type { Character } from '@/lib/types';
import InitialsBadge from './InitialsBadge';
import RevealSection from './RevealSection';

export default function ProfileClient() {
  const router = useRouter();
  const [character, setCharacter] = useState<Character | null>(null);
  const [form, setForm] = useState({ name: '', class: '', dream: '', bio: '' });
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifFreq, setNotifFreq] = useState(60);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getCharacter().then((c) => {
      if (!c) { router.replace('/'); return; }
      setCharacter(c);
      setForm({ name: c.name, class: c.class || '', dream: c.dream || '', bio: c.bio || '' });
      if (typeof Notification !== 'undefined') setNotifPermission(Notification.permission);
      setNotifEnabled(localStorage.getItem('notif_enabled') === 'true');
      setNotifFreq(Number(localStorage.getItem('notif_frequency') ?? '60'));
    });
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!character || !form.name.trim()) return;
    setSaving(true);
    const updated: Character = {
      ...character,
      name: form.name.trim(),
      class: form.class.trim(),
      dream: form.dream.trim(),
      bio: form.bio.trim(),
    };
    await saveCharacter(updated);
    setCharacter(updated);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  if (!character) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <span className="font-mono text-xs tracking-widest" style={{ color: 'rgba(139,92,246,0.4)' }}>LOADING...</span>
      </div>
    );
  }

  const dirty =
    form.name.trim() !== character.name ||
    form.class.trim() !== (character.class || '') ||
    form.dream.trim() !== (character.dream || '') ||
    form.bio.trim() !== (character.bio || '');

  async function requestNotifPermission() {
    const p = await Notification.requestPermission();
    setNotifPermission(p);
    if (p === 'granted') { setNotifEnabled(true); localStorage.setItem('notif_enabled', 'true'); }
  }
  function toggleNotif(v: boolean) { setNotifEnabled(v); localStorage.setItem('notif_enabled', String(v)); }
  function changeFreq(v: number) { setNotifFreq(v); localStorage.setItem('notif_frequency', String(v)); }

  return (
    <div className="relative min-h-dvh">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '50vw', height: '50vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,40,217,0.06) 0%, transparent 65%)', filter: 'blur(80px)' }} />
      </div>

      <div className="relative z-10 mx-auto max-w-xl px-5 py-10 space-y-8">

        <RevealSection>
          <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: 'rgba(139,92,246,0.5)' }}>LIFE.OS / PROFILE</p>
          <h1 className="font-black leading-none tracking-tighter mb-1" style={{ fontSize: 'clamp(2.2rem, 5vw, 3rem)', color: 'rgba(226,226,236,0.95)' }}>CHARACTER</h1>
          <p className="text-xs" style={{ color: 'rgba(226,226,236,0.35)' }}>Edit your identity. Your dream shapes the whole OS.</p>
        </RevealSection>

        {/* Avatar preview */}
        <RevealSection delay={0.03}>
          <div className="flex items-center gap-4">
            <InitialsBadge name={form.name || character.name} size="lg" />
            <div>
              <p className="font-bold text-lg leading-tight" style={{ color: 'rgba(226,226,236,0.9)' }}>{form.name || character.name}</p>
              <p className="font-mono text-[10px] tracking-[0.2em] uppercase mt-0.5" style={{ color: 'rgba(139,92,246,0.55)' }}>{form.class || 'NO CLASS SET'}</p>
            </div>
          </div>
        </RevealSection>

        {/* Form */}
        <RevealSection delay={0.05}>
          <form onSubmit={handleSave} className="space-y-5">

            <div>
              <label className="block font-mono text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: 'rgba(226,226,236,0.3)' }}>Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Your name"
                required
                maxLength={40}
                className="input-glow w-full rounded-xl px-4 py-3 text-sm placeholder:opacity-20 transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(139,92,246,0.22)', color: 'rgba(226,226,236,0.88)' }}
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: 'rgba(226,226,236,0.3)' }}>Class</label>
              <input
                type="text"
                value={form.class}
                onChange={(e) => setForm((f) => ({ ...f, class: e.target.value }))}
                placeholder="e.g. Builder, Designer, Student"
                maxLength={40}
                className="input-glow w-full rounded-xl px-4 py-3 text-sm placeholder:opacity-20 transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(139,92,246,0.22)', color: 'rgba(226,226,236,0.88)' }}
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: 'rgba(226,226,236,0.3)' }}>
                Bio <span style={{ color: 'rgba(139,92,246,0.5)' }}>— shown next to your name on the dashboard</span>
              </label>
              <input
                type="text"
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                placeholder="e.g. building things that matter"
                maxLength={80}
                className="input-glow w-full rounded-xl px-4 py-3 text-sm placeholder:opacity-20 transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(139,92,246,0.22)', color: 'rgba(226,226,236,0.88)' }}
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: 'rgba(226,226,236,0.3)' }}>
                Final Destination <span style={{ color: 'rgba(139,92,246,0.5)' }}>— your dream</span>
              </label>
              <textarea
                value={form.dream}
                onChange={(e) => setForm((f) => ({ ...f, dream: e.target.value }))}
                placeholder="What are you building toward?"
                rows={3}
                maxLength={200}
                className="input-glow w-full rounded-xl px-4 py-3 text-sm placeholder:opacity-20 transition-all resize-none leading-relaxed"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(139,92,246,0.22)', color: 'rgba(226,226,236,0.88)' }}
              />
              {form.dream && (
                <p className="mt-2 text-xs italic leading-relaxed" style={{ color: 'rgba(226,226,236,0.35)', textShadow: '0 0 20px rgba(139,92,246,0.3)' }}>
                  "{form.dream}"
                </p>
              )}
            </div>

            <motion.button
              type="submit"
              disabled={saving || !dirty || !form.name.trim()}
              whileHover={{ scale: dirty ? 1.01 : 1 }}
              whileTap={{ scale: dirty ? 0.98 : 1 }}
              className="w-full py-3 rounded-xl font-mono font-bold text-xs tracking-[0.25em] uppercase transition-all disabled:opacity-40 disabled:pointer-events-none"
              style={{
                background: saved
                  ? 'linear-gradient(135deg, rgba(34,197,94,0.6) 0%, rgba(22,163,74,0.5) 100%)'
                  : 'linear-gradient(135deg, rgba(109,40,217,0.9) 0%, rgba(139,92,246,0.7) 100%)',
                color: 'rgba(255,255,255,0.9)',
                boxShadow: saved ? '0 0 20px rgba(34,197,94,0.2)' : '0 0 20px rgba(109,40,217,0.25)',
              }}
            >
              {saved ? '✓ SAVED' : saving ? 'SAVING...' : 'SAVE CHANGES'}
            </motion.button>
          </form>
        </RevealSection>

        {/* Notifications */}
        <RevealSection delay={0.07}>
          <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(139,92,246,0.1)' }}>
            <p className="font-mono text-[9px] tracking-[0.3em] uppercase" style={{ color: 'rgba(226,226,236,0.3)' }}>NOTIFICATIONS</p>

            {typeof Notification === 'undefined' ? (
              <p className="text-xs" style={{ color: 'rgba(226,226,236,0.3)' }}>Not supported in this browser.</p>
            ) : notifPermission === 'denied' ? (
              <p className="text-xs" style={{ color: 'rgba(239,68,68,0.6)' }}>Notifications blocked by browser. Enable them in your browser settings.</p>
            ) : notifPermission !== 'granted' ? (
              <div className="flex items-center gap-3">
                <p className="text-xs flex-1" style={{ color: 'rgba(226,226,236,0.45)' }}>Enable browser notifications for daily task reminders and brainstorm nudges.</p>
                <motion.button onClick={requestNotifPermission} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  className="flex-shrink-0 px-4 py-2 rounded-lg font-mono text-[10px] tracking-[0.2em] uppercase"
                  style={{ background: 'rgba(109,40,217,0.35)', border: '1px solid rgba(139,92,246,0.3)', color: 'rgba(167,139,250,0.9)' }}
                >ENABLE</motion.button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Toggle */}
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm" style={{ color: 'rgba(226,226,236,0.7)' }}>Daily task reminders</span>
                  <div onClick={() => toggleNotif(!notifEnabled)}
                    className="relative w-10 h-5 rounded-full transition-all duration-200"
                    style={{ background: notifEnabled ? 'rgba(109,40,217,0.7)' : 'rgba(255,255,255,0.1)', border: `1px solid ${notifEnabled ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.15)'}` }}>
                    <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white/90 transition-all duration-200" style={{ left: notifEnabled ? '21px' : '2px', opacity: notifEnabled ? 1 : 0.5 }} />
                  </div>
                </label>

                {/* Frequency */}
                {notifEnabled && (
                  <div>
                    <p className="font-mono text-[9px] tracking-[0.2em] uppercase mb-2" style={{ color: 'rgba(226,226,236,0.25)' }}>REMIND ME EVERY</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: '30 min', value: 30 },
                        { label: '1 hour', value: 60 },
                        { label: '3 hours', value: 180 },
                        { label: '6 hours', value: 360 },
                        { label: '12 hours', value: 720 },
                      ].map(({ label, value }) => (
                        <button key={value} onClick={() => changeFreq(value)}
                          className="px-3 py-1.5 rounded-lg font-mono text-[10px] tracking-[0.1em] transition-all"
                          style={{
                            background: notifFreq === value ? 'rgba(109,40,217,0.35)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${notifFreq === value ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
                            color: notifFreq === value ? 'rgba(167,139,250,0.95)' : 'rgba(226,226,236,0.35)',
                          }}
                        >{label}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </RevealSection>

        {/* Back link */}
        <RevealSection delay={0.08}>
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(139,92,246,0.08)' }}>
            <p className="font-mono text-[9px] tracking-[0.3em] uppercase mb-3" style={{ color: 'rgba(226,226,236,0.25)' }}>SESSION</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="font-mono text-[10px] tracking-[0.15em] uppercase transition-colors"
              style={{ color: 'rgba(139,92,246,0.45)' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(167,139,250,0.8)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(139,92,246,0.45)')}
            >
              ← BACK TO DASHBOARD
            </button>
          </div>
        </RevealSection>

      </div>
    </div>
  );
}
