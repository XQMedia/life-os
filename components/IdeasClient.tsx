'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getIdeas, addIdea, deleteIdea, generateId } from '@/lib/db';
import type { Idea } from '@/lib/types';

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(ts));
}

// Color accent per note — subtle, not garish
const ACCENTS = [
  { dot: 'rgba(139,92,246,0.7)',  line: 'rgba(139,92,246,0.12)' },
  { dot: 'rgba(99,102,241,0.7)', line: 'rgba(99,102,241,0.12)'  },
  { dot: 'rgba(168,85,247,0.7)', line: 'rgba(168,85,247,0.12)'  },
  { dot: 'rgba(59,130,246,0.6)', line: 'rgba(59,130,246,0.1)'   },
  { dot: 'rgba(20,184,166,0.6)', line: 'rgba(20,184,166,0.1)'   },
];

function accentFor(id: string) {
  const h = [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return ACCENTS[h % ACCENTS.length];
}

function firstLine(content: string) {
  const nl = content.indexOf('\n');
  return nl === -1 ? (content.length > 60 ? content.slice(0, 60) + '…' : content) : content.slice(0, nl);
}

function restLines(content: string) {
  const nl = content.indexOf('\n');
  return nl === -1 ? '' : content.slice(nl + 1).trim();
}

export default function IdeasClient() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [input, setInput] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => setIdeas(await getIdeas()), []);
  useEffect(() => { load(); }, [load]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const idea: Idea = { id: generateId(), content: input.trim(), createdAt: Date.now() };
    await addIdea(idea);
    setIdeas((prev) => [idea, ...prev]);
    setInput('');
  }

  async function handleDelete(id: string) {
    await deleteIdea(id);
    setIdeas((prev) => prev.filter((i) => i.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  return (
    <div className="relative min-h-dvh">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div style={{ position: 'absolute', top: '-5%', right: '-10%', width: '45vw', height: '45vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,40,217,0.055) 0%, transparent 65%)', filter: 'blur(80px)' }} />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-5 py-10">

        {/* Header */}
        <div className="mb-8">
          <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: 'rgba(139,92,246,0.5)' }}>LIFE.OS / SIGNAL CAPTURE</p>
          <h1 className="font-black leading-none tracking-tighter" style={{ fontSize: 'clamp(2.2rem, 5vw, 3rem)', color: 'rgba(226,226,236,0.95)' }}>IDEAS</h1>
          <p className="text-sm mt-1.5" style={{ color: 'rgba(226,226,236,0.3)' }}>
            {ideas.length === 0 ? 'Blank canvas. Dump everything.' : `${ideas.length} note${ideas.length !== 1 ? 's' : ''} — first line is the title`}
          </p>
        </div>

        {/* Composer */}
        <form onSubmit={handleAdd} className="mb-8">
          <div className="rounded-2xl overflow-hidden transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}
            onFocus={() => {}} // keep visible
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAdd(e as unknown as React.FormEvent);
              }}
              placeholder={"Start typing a note...\nFirst line becomes the title. ⌘↵ to save."}
              rows={3}
              className="input-glow w-full px-5 pt-4 pb-2 text-sm leading-relaxed placeholder:opacity-20 resize-none transition-all outline-none bg-transparent"
              style={{ color: 'rgba(226,226,236,0.88)', minHeight: '80px' }}
            />
            <div className="flex items-center justify-between px-5 pb-4 pt-1">
              <span className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: 'rgba(226,226,236,0.2)' }}>
                {input.length > 0 ? `${input.length} chars` : '⌘↵ to save'}
              </span>
              <motion.button type="submit" disabled={!input.trim()} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                className="px-4 py-1.5 rounded-lg font-mono text-[10px] tracking-[0.2em] uppercase disabled:opacity-30 disabled:pointer-events-none"
                style={{ background: 'rgba(109,40,217,0.4)', border: '1px solid rgba(139,92,246,0.3)', color: 'rgba(167,139,250,0.95)' }}
              >SAVE NOTE</motion.button>
            </div>
          </div>
        </form>

        {/* Notes list */}
        {ideas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.07)', border: '1px dashed rgba(139,92,246,0.18)' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 4h12M3 8h8M3 12h10" stroke="rgba(139,92,246,0.4)" strokeWidth="1.4" strokeLinecap="round"/></svg>
            </div>
            <p className="font-mono text-[11px] tracking-[0.25em] uppercase" style={{ color: 'rgba(226,226,236,0.15)' }}>NO NOTES YET</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {ideas.map((idea) => {
                const accent = accentFor(idea.id);
                const title = firstLine(idea.content);
                const body = restLines(idea.content);
                const isExpanded = expandedId === idea.id;

                return (
                  <motion.div
                    key={idea.id}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="group rounded-xl overflow-hidden cursor-pointer"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(139,92,246,0.1)' }}
                    onClick={() => setExpandedId(isExpanded ? null : idea.id)}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(139,92,246,0.22)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(139,92,246,0.1)')}
                  >
                    {/* Accent bar */}
                    <div className="h-px w-full" style={{ background: `linear-gradient(90deg, ${accent.dot}, transparent 60%)` }} />

                    <div className="px-5 py-3.5">
                      {/* Title row */}
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-1.5" style={{ background: accent.dot, boxShadow: `0 0 6px ${accent.dot}` }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-snug" style={{ color: 'rgba(226,226,236,0.88)' }}>{title}</p>
                          {body && !isExpanded && (
                            <p className="text-xs mt-0.5 truncate leading-relaxed" style={{ color: 'rgba(226,226,236,0.35)' }}>{body}</p>
                          )}
                          <AnimatePresence>
                            {isExpanded && body && (
                              <motion.p
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="text-xs mt-1.5 leading-relaxed whitespace-pre-wrap overflow-hidden"
                                style={{ color: 'rgba(226,226,236,0.55)' }}
                              >{body}</motion.p>
                            )}
                          </AnimatePresence>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="font-mono text-[9px]" style={{ color: 'rgba(226,226,236,0.2)' }}>{formatRelative(idea.createdAt)}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(idea.id); }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded flex items-center justify-center"
                            style={{ color: 'rgba(226,226,236,0.25)' }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(239,68,68,0.6)')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(226,226,236,0.25)')}
                            aria-label="Delete"
                          >
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
