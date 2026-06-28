'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getQuickLinks, saveQuickLinks, addQuickLink, deleteQuickLink, generateId } from '@/lib/db';
import type { QuickLink } from '@/lib/types';

// Map known domains to a short label color so pills feel distinct
const DOMAIN_COLORS: Record<string, string> = {
  'youtube.com':    'rgba(239,68,68,0.7)',
  'github.com':     'rgba(226,226,236,0.6)',
  'claude.ai':      'rgba(139,92,246,0.8)',
  'chatgpt.com':    'rgba(34,197,94,0.65)',
  'instagram.com':  'rgba(236,72,153,0.7)',
  'x.com':          'rgba(226,226,236,0.55)',
  'twitter.com':    'rgba(226,226,236,0.55)',
  'linear.app':     'rgba(100,116,255,0.8)',
  'notion.so':      'rgba(226,226,236,0.5)',
};

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return ''; }
}

function getLinkColor(url: string): string {
  const d = getDomain(url);
  return DOMAIN_COLORS[d] ?? 'rgba(139,92,246,0.55)';
}

function getInitials(label: string): string {
  const words = label.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return label.slice(0, 2).toUpperCase();
}

function FaviconOrBadge({ url, label }: { url: string; label: string }) {
  const domain = getDomain(url);
  const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32` : null;
  const [failed, setFailed] = useState(false);
  const color = getLinkColor(url);

  if (faviconUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={faviconUrl}
        alt=""
        width={14}
        height={14}
        className="rounded-sm flex-shrink-0"
        onError={() => setFailed(true)}
        style={{ imageRendering: 'auto' }}
      />
    );
  }

  return (
    <span className="font-mono text-[9px] font-bold flex-shrink-0" style={{ color }}>
      {getInitials(label)}
    </span>
  );
}

export default function QuickAccessBar({ compact }: { compact?: boolean }) {
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ label: '', url: '' });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    getQuickLinks().then((l) => setLinks(l.slice().sort((a, b) => a.order - b.order)));
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.label.trim()) { setFormError('Label required.'); return; }
    let url = form.url.trim();
    if (!url) { setFormError('URL required.'); return; }
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    setFormError('');
    const link: QuickLink = { id: generateId(), label: form.label.trim(), url, order: links.length };
    await addQuickLink(link);
    setLinks((prev) => [...prev, link]);
    setForm({ label: '', url: '' });
  }

  async function handleDelete(id: string) {
    await deleteQuickLink(id);
    const updated = links.filter((l) => l.id !== id).map((l, i) => ({ ...l, order: i }));
    await saveQuickLinks(updated);
    setLinks(updated);
  }

  async function handleMove(id: string, dir: -1 | 1) {
    const idx = links.findIndex((l) => l.id === id);
    const target = idx + dir;
    if (target < 0 || target >= links.length) return;
    const reordered = [...links];
    [reordered[idx], reordered[target]] = [reordered[target], reordered[idx]];
    const updated = reordered.map((l, i) => ({ ...l, order: i }));
    await saveQuickLinks(updated);
    setLinks(updated);
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--card-border)', color: 'var(--text-2)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.3)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-1)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--card-border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-2)'; }}
          >
            <FaviconOrBadge url={link.url} label={link.label} />
            {link.label}
          </a>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(139,92,246,0.08)' }}>
      <div className="flex items-center gap-3">
        {/* Links row */}
        <div className="flex items-center gap-2 flex-1 flex-wrap min-w-0">
          {links.map((link) => (
            <motion.div key={link.id} layout className="relative group">
              {editing ? (
                <div className="flex items-center gap-1">
                  <button onClick={() => handleMove(link.id, -1)}
                    className="w-4 h-4 flex items-center justify-center rounded"
                    style={{ color: 'rgba(226,226,236,0.2)' }}
                  ><svg width="7" height="7" viewBox="0 0 7 7" fill="none"><path d="M1 4.5l2.5-2.5 2.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                  <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono text-[10px] tracking-[0.12em]"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(139,92,246,0.15)', color: 'rgba(226,226,236,0.5)' }}>
                    <FaviconOrBadge url={link.url} label={link.label} />
                    {link.label}
                  </span>
                  <button onClick={() => handleMove(link.id, 1)}
                    className="w-4 h-4 flex items-center justify-center rounded"
                    style={{ color: 'rgba(226,226,236,0.2)' }}
                  ><svg width="7" height="7" viewBox="0 0 7 7" fill="none"><path d="M1 2.5l2.5 2.5 2.5-2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                  <button onClick={() => handleDelete(link.id)}
                    className="w-4 h-4 flex items-center justify-center rounded"
                    style={{ color: 'rgba(239,68,68,0.4)' }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(239,68,68,0.8)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(239,68,68,0.4)')}
                  ><svg width="7" height="7" viewBox="0 0 7 7" fill="none"><path d="M1 1l5 5M6 1l-5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg></button>
                </div>
              ) : (
                <a href={link.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono text-[10px] tracking-[0.12em] transition-all duration-150"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.1)', color: 'rgba(226,226,236,0.5)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.1)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.25)'; (e.currentTarget as HTMLElement).style.color = 'rgba(226,226,236,0.85)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.1)'; (e.currentTarget as HTMLElement).style.color = 'rgba(226,226,236,0.5)'; }}
                >
                  <FaviconOrBadge url={link.url} label={link.label} />
                  {link.label}
                </a>
              )}
            </motion.div>
          ))}

          {/* Add form (shown in edit mode) */}
          <AnimatePresence>
            {editing && (
              <motion.form onSubmit={handleAdd}
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-1.5 flex-wrap"
              >
                <input value={form.label} onChange={(e) => { setForm((f) => ({ ...f, label: e.target.value })); setFormError(''); }}
                  placeholder="Label"
                  className="rounded-lg px-2.5 py-1.5 font-mono text-[10px] w-20 transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${formError ? 'rgba(239,68,68,0.4)' : 'rgba(139,92,246,0.2)'}`, color: 'rgba(226,226,236,0.8)' }}
                />
                <input value={form.url} onChange={(e) => { setForm((f) => ({ ...f, url: e.target.value })); setFormError(''); }}
                  placeholder="URL"
                  className="rounded-lg px-2.5 py-1.5 font-mono text-[10px] w-36 transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${formError ? 'rgba(239,68,68,0.4)' : 'rgba(139,92,246,0.2)'}`, color: 'rgba(226,226,236,0.8)' }}
                />
                <button type="submit"
                  className="px-2.5 py-1.5 rounded-lg font-mono text-[9px] tracking-widest uppercase"
                  style={{ background: 'rgba(109,40,217,0.25)', border: '1px solid rgba(139,92,246,0.25)', color: 'rgba(167,139,250,0.8)' }}
                >+</button>
                {formError && <span className="font-mono text-[9px]" style={{ color: 'rgba(239,68,68,0.7)' }}>{formError}</span>}
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Edit toggle */}
        <button onClick={() => setEditing((v) => !v)}
          className="flex-shrink-0 px-2 py-1 rounded-lg font-mono text-[9px] tracking-widest uppercase transition-all"
          style={{
            background: editing ? 'rgba(139,92,246,0.15)' : 'transparent',
            border: `1px solid ${editing ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.1)'}`,
            color: editing ? 'rgba(167,139,250,0.8)' : 'rgba(139,92,246,0.3)',
          }}
        >{editing ? 'DONE' : 'EDIT'}</button>
      </div>
    </div>
  );
}
