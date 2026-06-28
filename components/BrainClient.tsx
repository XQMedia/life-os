'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getBrainNotes, addBrainNote, updateBrainNote, deleteBrainNote, generateId } from '@/lib/db';
import type { BrainNote, BrainCategory } from '@/lib/types';

const CATEGORIES: { key: BrainCategory; label: string; icon: string; color: string }[] = [
  { key: 'learning', label: 'Learning', icon: '📚', color: 'rgba(59,130,246,1)' },
  { key: 'resource', label: 'Resource', icon: '🔗', color: 'rgba(16,185,129,1)' },
  { key: 'idea', label: 'Idea', icon: '💡', color: 'rgba(245,158,11,1)' },
  { key: 'reflection', label: 'Reflection', icon: '🪞', color: 'rgba(139,92,246,1)' },
  { key: 'note', label: 'Note', icon: '📝', color: 'rgba(226,226,236,0.5)' },
];

function catMeta(key: BrainCategory) {
  return CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[4];
}

const EMPTY_FORM: Omit<BrainNote, 'id' | 'createdAt' | 'updatedAt'> = {
  title: '',
  content: '',
  category: 'note',
  tags: [],
  linkedSkillIds: [],
  isPinned: false,
};

function NoteCard({ note, onClick }: { note: BrainNote; onClick: () => void }) {
  const cat = catMeta(note.category);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -3, boxShadow: `0 8px 32px ${cat.color.replace('1)', '0.15)')}` }}
      onClick={onClick}
      className="rounded-2xl p-4 cursor-pointer transition-all duration-200"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: `1px solid ${note.isPinned ? cat.color.replace('1)', '0.3)') : 'rgba(255,255,255,0.06)'}`,
      }}
    >
      {/* Category + pin */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: 13 }}>{cat.icon}</span>
          <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: cat.color.replace('1)', '0.6)') }}>
            {cat.label}
          </span>
        </div>
        {note.isPinned && (
          <span style={{ fontSize: 11, color: 'rgba(245,158,11,0.7)' }}>📌</span>
        )}
      </div>

      {/* Title */}
      <h3 className="font-semibold text-sm mb-2 leading-tight" style={{ color: 'rgba(226,226,236,0.9)' }}>
        {note.title || 'Untitled'}
      </h3>

      {/* Content preview */}
      {note.content && (
        <p className="text-xs leading-relaxed line-clamp-3" style={{ color: 'rgba(226,226,236,0.4)' }}>
          {note.content}
        </p>
      )}

      {/* Tags */}
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {note.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="font-mono text-[9px] px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(139,92,246,0.1)', color: 'rgba(139,92,246,0.6)', border: '1px solid rgba(139,92,246,0.15)' }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Date */}
      <div className="mt-3 font-mono text-[9px]" style={{ color: 'rgba(226,226,236,0.2)' }}>
        {new Date(note.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </div>
    </motion.div>
  );
}

function NoteModal({
  note,
  onSave,
  onDelete,
  onClose,
}: {
  note: BrainNote | null;
  onSave: (n: BrainNote) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const isNew = !note?.id || note.id === 'new';
  const [form, setForm] = useState<BrainNote>(
    note ?? { ...EMPTY_FORM, id: 'new', createdAt: Date.now(), updatedAt: Date.now() }
  );
  const [tagInput, setTagInput] = useState('');

  function addTag() {
    const t = tagInput.trim().toLowerCase().replace(/^#/, '');
    if (t && !form.tags.includes(t)) {
      setForm((f) => ({ ...f, tags: [...f.tags, t] }));
    }
    setTagInput('');
  }

  function removeTag(tag: string) {
    setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 py-6"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <motion.div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }} onClick={onClose} />
      <motion.div
        className="relative w-full max-w-lg rounded-3xl p-6 max-h-[90vh] overflow-y-auto"
        style={{ background: 'rgba(7,7,13,0.99)', border: '1px solid rgba(139,92,246,0.2)' }}
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="font-mono text-[10px] tracking-[0.35em] uppercase" style={{ color: 'rgba(139,92,246,0.5)' }}>
            {isNew ? 'New Note' : 'Edit Note'}
          </div>
          <div className="flex items-center gap-3">
            {!isNew && (
              <button
                onClick={() => { onDelete(form.id); onClose(); }}
                className="font-mono text-[10px] tracking-wider uppercase"
                style={{ color: 'rgba(239,68,68,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Delete
              </button>
            )}
            <button onClick={onClose} style={{ color: 'rgba(226,226,236,0.4)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}>×</button>
          </div>
        </div>

        {/* Category */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setForm((f) => ({ ...f, category: cat.key }))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-[10px] tracking-wider"
              style={{
                background: form.category === cat.key ? cat.color.replace('1)', '0.15)') : 'rgba(255,255,255,0.03)',
                border: `1px solid ${form.category === cat.key ? cat.color.replace('1)', '0.4)') : 'rgba(255,255,255,0.06)'}`,
                color: form.category === cat.key ? cat.color : 'rgba(226,226,236,0.3)',
              }}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {/* Title */}
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="Title"
          className="input-glow w-full rounded-xl px-4 py-3 mb-4 font-semibold"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.15)', color: 'rgba(226,226,236,0.9)', fontSize: 16 }}
          autoFocus
        />

        {/* Content */}
        <textarea
          value={form.content}
          onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
          placeholder="Write your thoughts, learnings, links, anything..."
          rows={8}
          className="input-glow w-full rounded-xl px-4 py-3 mb-4 text-sm resize-none leading-relaxed"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(139,92,246,0.12)', color: 'rgba(226,226,236,0.75)' }}
        />

        {/* Tags */}
        <div className="mb-5">
          <div className="font-mono text-[10px] tracking-widest uppercase mb-2" style={{ color: 'rgba(226,226,236,0.25)' }}>Tags</div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {form.tags.map((tag) => (
              <span
                key={tag}
                className="font-mono text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1.5 cursor-pointer"
                style={{ background: 'rgba(139,92,246,0.12)', color: 'rgba(139,92,246,0.7)', border: '1px solid rgba(139,92,246,0.2)' }}
                onClick={() => removeTag(tag)}
              >
                #{tag} ×
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              placeholder="Add tag (Enter)"
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: 'rgba(226,226,236,0.6)', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 4 }}
            />
          </div>
        </div>

        {/* Pin toggle */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setForm((f) => ({ ...f, isPinned: !f.isPinned }))}
            className="flex items-center gap-2 font-mono text-[10px] tracking-wider uppercase"
            style={{ color: form.isPinned ? 'rgba(245,158,11,0.8)' : 'rgba(226,226,236,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {form.isPinned ? '📌 Pinned' : '📌 Pin this note'}
          </button>
        </div>

        {/* Save */}
        <motion.button
          onClick={() => { onSave(form); onClose(); }}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          className="w-full py-3.5 rounded-xl font-mono text-xs tracking-[0.3em] uppercase font-bold"
          style={{ background: 'linear-gradient(135deg, rgba(109,40,217,1), rgba(139,92,246,0.8))', color: 'white' }}
        >
          {isNew ? 'Save Note' : 'Update Note'}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

export default function BrainClient() {
  const [notes, setNotes] = useState<BrainNote[]>([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<BrainCategory | 'all'>('all');
  const [editing, setEditing] = useState<BrainNote | null | 'new'>('new' as never);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    setNotes(await getBrainNotes());
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(note: BrainNote) {
    const isNew = note.id === 'new';
    const toSave: BrainNote = { ...note, id: isNew ? generateId() : note.id, updatedAt: Date.now(), createdAt: isNew ? Date.now() : note.createdAt };
    if (isNew) await addBrainNote(toSave);
    else await updateBrainNote(toSave);
    await load();
  }

  async function handleDelete(id: string) {
    await deleteBrainNote(id);
    await load();
  }

  const filtered = notes
    .filter((n) => filterCat === 'all' || n.category === filterCat)
    .filter((n) =>
      !search ||
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase()) ||
      n.tags.some((t) => t.includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.updatedAt - a.updatedAt;
    });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {/* Header */}
      <motion.div className="mb-8 flex items-end justify-between" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <div className="font-mono text-[10px] tracking-[0.4em] uppercase mb-1" style={{ color: 'rgba(139,92,246,0.5)' }}>LIFE.OS / 11</div>
          <h1 className="font-black text-3xl tracking-tight" style={{ color: 'rgba(226,226,236,0.95)' }}>Brain</h1>
          <p className="font-mono text-[11px] tracking-wider mt-1" style={{ color: 'rgba(226,226,236,0.25)' }}>
            Your second digital brain · {notes.length} notes
          </p>
        </div>
        <motion.button
          onClick={() => { setEditing(null); setShowModal(true); }}
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
          className="px-5 py-2.5 rounded-xl font-mono text-xs tracking-[0.25em] uppercase font-bold"
          style={{ background: 'linear-gradient(135deg, rgba(109,40,217,1), rgba(139,92,246,0.8))', color: 'white', boxShadow: '0 0 20px rgba(109,40,217,0.3)' }}
        >
          + New
        </motion.button>
      </motion.div>

      {/* Search */}
      <motion.div className="relative mb-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <svg className="absolute left-4 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'rgba(139,92,246,0.4)' }}>
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M10 10l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes, tags..."
          className="input-glow w-full rounded-xl pl-10 pr-4 py-3 text-sm"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(139,92,246,0.15)', color: 'rgba(226,226,236,0.8)' }}
        />
      </motion.div>

      {/* Category filter */}
      <motion.div className="flex gap-2 mb-8 flex-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}>
        <button
          onClick={() => setFilterCat('all')}
          className="px-3 py-1.5 rounded-xl font-mono text-[10px] tracking-wider uppercase"
          style={{
            background: filterCat === 'all' ? 'rgba(109,40,217,0.2)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${filterCat === 'all' ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.06)'}`,
            color: filterCat === 'all' ? 'rgba(167,139,250,0.9)' : 'rgba(226,226,236,0.35)',
          }}
        >
          All ({notes.length})
        </button>
        {CATEGORIES.map((cat) => {
          const count = notes.filter((n) => n.category === cat.key).length;
          return (
            <button
              key={cat.key}
              onClick={() => setFilterCat(cat.key)}
              className="px-3 py-1.5 rounded-xl font-mono text-[10px] tracking-wider uppercase flex items-center gap-1"
              style={{
                background: filterCat === cat.key ? cat.color.replace('1)', '0.15)') : 'rgba(255,255,255,0.02)',
                border: `1px solid ${filterCat === cat.key ? cat.color.replace('1)', '0.35)') : 'rgba(255,255,255,0.06)'}`,
                color: filterCat === cat.key ? cat.color : 'rgba(226,226,236,0.35)',
              }}
            >
              {cat.icon} {cat.label} ({count})
            </button>
          );
        })}
      </motion.div>

      {/* Notes grid */}
      {filtered.length > 0 ? (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          layout
        >
          <AnimatePresence>
            {filtered.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onClick={() => { setEditing(note); setShowModal(true); }}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <motion.div className="text-center py-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🧠</div>
          <p className="font-mono text-sm mb-2" style={{ color: 'rgba(226,226,236,0.3)' }}>
            {search || filterCat !== 'all' ? 'No notes match your filter.' : 'Your second brain is empty.'}
          </p>
          {!search && filterCat === 'all' && (
            <p className="font-mono text-xs" style={{ color: 'rgba(139,92,246,0.4)' }}>
              Capture what you learn. Build it every day.
            </p>
          )}
        </motion.div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <NoteModal
            note={editing as BrainNote | null}
            onSave={handleSave}
            onDelete={handleDelete}
            onClose={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
