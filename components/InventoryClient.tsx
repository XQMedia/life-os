'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getInventory, addInventoryItem, deleteInventoryItem, generateId, today } from '@/lib/db';
import type { InventoryItem } from '@/lib/types';
import Modal from './Modal';
import RevealSection from './RevealSection';

const TYPE_ICONS: Record<InventoryItem['type'], string> = {
  achievement: '🏆',
  badge: '🎖️',
  trophy: '🥇',
  milestone: '🎯',
};

const TYPE_COLORS: Record<InventoryItem['type'], { bg: string; border: string; label: string }> = {
  achievement: { bg: 'rgba(234,179,8,0.08)',    border: 'rgba(234,179,8,0.25)',    label: 'rgba(234,179,8,0.8)' },
  badge:       { bg: 'rgba(59,130,246,0.08)',   border: 'rgba(59,130,246,0.25)',   label: 'rgba(147,197,253,0.8)' },
  trophy:      { bg: 'rgba(251,146,60,0.08)',   border: 'rgba(251,146,60,0.25)',   label: 'rgba(253,186,116,0.8)' },
  milestone:   { bg: 'rgba(139,92,246,0.08)',   border: 'rgba(139,92,246,0.25)',   label: 'rgba(167,139,250,0.8)' },
};

function ItemCard({ item, onDelete }: { item: InventoryItem; onDelete: () => void }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const colors = TYPE_COLORS[item.type];

  useEffect(() => {
    if (!item.imageBlob) return;
    const url = URL.createObjectURL(item.imageBlob);
    setImgUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [item.imageBlob]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className="group relative rounded-2xl overflow-hidden flex flex-col"
      style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${colors.bg}`)}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = 'none')}
    >
      {/* Thumbnail */}
      <div className="h-32 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.02)' }}>
        {imgUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgUrl} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <span style={{ fontSize: '2.5rem' }}>{TYPE_ICONS[item.type]}</span>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(239,68,68,0.7)' }}
        aria-label="Delete"
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 1l6 6M7 1l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </button>

      <div className="p-4 flex flex-col gap-1.5 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-sm leading-tight" style={{ color: 'rgba(226,226,236,0.88)' }}>{item.title}</p>
          <span className="font-mono text-[8px] tracking-[0.15em] uppercase px-1.5 py-0.5 rounded flex-shrink-0"
            style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.label }}>
            {item.type}
          </span>
        </div>
        {item.description && (
          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'rgba(226,226,236,0.4)' }}>{item.description}</p>
        )}
        <p className="font-mono text-[9px] mt-auto pt-1" style={{ color: 'rgba(226,226,236,0.2)' }}>
          {item.dateEarned}
        </p>
      </div>
    </motion.div>
  );
}

export default function InventoryClient() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', type: 'achievement' as InventoryItem['type'], dateEarned: today() });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<InventoryItem['type'] | 'all'>('all');

  const load = useCallback(async () => setItems(await getInventory()), []);
  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    const item: InventoryItem = {
      id: generateId(),
      title: form.title.trim(),
      description: form.description.trim(),
      type: form.type,
      imageBlob: imageFile ?? null,
      imageName: imageFile?.name,
      imageType: imageFile?.type,
      dateEarned: form.dateEarned || today(),
      createdAt: Date.now(),
    };
    await addInventoryItem(item);
    setItems((prev) => [item, ...prev]);
    setForm({ title: '', description: '', type: 'achievement', dateEarned: today() });
    setImageFile(null);
    setSaving(false);
    setShowAdd(false);
  }

  async function handleDelete(id: string) {
    await deleteInventoryItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const filtered = filter === 'all' ? items : items.filter((i) => i.type === filter);
  const counts = { all: items.length, achievement: 0, badge: 0, trophy: 0, milestone: 0 };
  items.forEach((i) => { counts[i.type]++; });

  return (
    <div className="relative min-h-dvh">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div style={{ position: 'absolute', top: '-5%', right: '-5%', width: '40vw', height: '40vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(234,179,8,0.04) 0%, transparent 65%)', filter: 'blur(80px)' }} />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-5 py-8 space-y-8">

        {/* Header */}
        <RevealSection>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-2" style={{ color: 'rgba(234,179,8,0.5)' }}>LIFE.OS / HALL OF FAME</p>
              <h1 className="font-black tracking-tighter leading-none" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', color: 'rgba(226,226,236,0.95)' }}>INVENTORY</h1>
              <p className="text-sm mt-1.5" style={{ color: 'rgba(226,226,236,0.35)' }}>Your certificates, trophies &amp; milestones — everything you&apos;ve earned.</p>
              <p className="font-mono text-xs mt-1" style={{ color: 'rgba(226,226,236,0.2)' }}>
                {items.length} ITEM{items.length !== 1 ? 'S' : ''} IN THE VAULT
              </p>
            </div>
            <motion.button
              onClick={() => setShowAdd(true)}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="px-5 py-2.5 rounded-xl font-mono text-[11px] tracking-[0.2em] uppercase"
              style={{ background: 'linear-gradient(135deg, rgba(234,179,8,0.7) 0%, rgba(251,146,60,0.5) 100%)', border: '1px solid rgba(234,179,8,0.3)', color: 'rgba(255,255,255,0.9)', boxShadow: '0 0 20px rgba(234,179,8,0.15)' }}
            >
              + ADD ITEM
            </motion.button>
          </div>
        </RevealSection>

        {/* Filter tabs */}
        {items.length > 0 && (
          <RevealSection delay={0.02}>
            <div className="flex flex-wrap gap-2">
              {(['all', 'achievement', 'badge', 'trophy', 'milestone'] as const).map((type) => (
                <button key={type} onClick={() => setFilter(type)}
                  className="px-3 py-1.5 rounded-lg font-mono text-[10px] tracking-[0.15em] uppercase transition-all"
                  style={{
                    background: filter === type ? 'rgba(234,179,8,0.2)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${filter === type ? 'rgba(234,179,8,0.4)' : 'rgba(255,255,255,0.06)'}`,
                    color: filter === type ? 'rgba(234,179,8,0.9)' : 'rgba(226,226,236,0.3)',
                  }}
                >
                  {type === 'all' ? 'ALL' : type.toUpperCase()} ({counts[type]})
                </button>
              ))}
            </div>
          </RevealSection>
        )}

        {/* Grid */}
        {filtered.length === 0 ? (
          <RevealSection delay={0.04}>
            <button
              onClick={() => setShowAdd(true)}
              className="w-full rounded-2xl p-16 text-center transition-all"
              style={{ background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(234,179,8,0.12)' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(234,179,8,0.3)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(234,179,8,0.12)')}
            >
              <p className="font-mono text-[11px] tracking-[0.25em] uppercase mb-2" style={{ color: 'rgba(226,226,236,0.2)' }}>INVENTORY EMPTY</p>
              <p className="font-mono text-[10px] tracking-widest" style={{ color: 'rgba(234,179,8,0.35)' }}>ADD YOUR FIRST COLLECTIBLE →</p>
            </button>
          </RevealSection>
        ) : (
          <RevealSection delay={0.04}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <AnimatePresence>
                {filtered.map((item) => (
                  <ItemCard key={item.id} item={item} onDelete={() => handleDelete(item.id)} />
                ))}
              </AnimatePresence>
            </div>
          </RevealSection>
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <Modal title="Add Collectible" subtitle="INVENTORY / NEW" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block font-mono text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: 'rgba(226,226,236,0.3)' }}>Title</label>
              <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. 100 Days of Code Badge" required maxLength={60} autoFocus
                className="input-glow w-full rounded-xl px-4 py-2.5 text-sm text-white/90 placeholder:text-white/20 transition-all"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(234,179,8,0.2)' }} />
            </div>
            <div>
              <label className="block font-mono text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: 'rgba(226,226,236,0.3)' }}>Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(['achievement', 'badge', 'trophy', 'milestone'] as const).map((type) => (
                  <button type="button" key={type} onClick={() => setForm((f) => ({ ...f, type }))}
                    className="px-3 py-2 rounded-xl font-mono text-[10px] tracking-[0.15em] uppercase transition-all"
                    style={{
                      background: form.type === type ? TYPE_COLORS[type].bg : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${form.type === type ? TYPE_COLORS[type].border : 'rgba(255,255,255,0.06)'}`,
                      color: form.type === type ? TYPE_COLORS[type].label : 'rgba(226,226,236,0.3)',
                    }}
                  >
                    {TYPE_ICONS[type]} {type}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block font-mono text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: 'rgba(226,226,236,0.3)' }}>Description</label>
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What did you achieve?" rows={2} maxLength={200}
                className="input-glow w-full rounded-xl px-4 py-2.5 text-sm text-white/90 placeholder:text-white/20 transition-all resize-none"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(234,179,8,0.15)' }} />
            </div>
            <div>
              <label className="block font-mono text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: 'rgba(226,226,236,0.3)' }}>Date Earned</label>
              <input type="date" value={form.dateEarned} onChange={(e) => setForm((f) => ({ ...f, dateEarned: e.target.value }))}
                className="input-glow w-full rounded-xl px-4 py-2.5 text-sm text-white/90 transition-all"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(234,179,8,0.15)', colorScheme: 'dark' }} />
            </div>
            <div>
              <label className="block font-mono text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: 'rgba(226,226,236,0.3)' }}>Image (optional)</label>
              <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-1.5 file:text-[10px] file:font-mono file:font-bold file:tracking-widest file:uppercase file:text-white/80 cursor-pointer"
                style={{ color: 'rgba(226,226,236,0.4)' }} />
            </div>
            <motion.button type="submit" disabled={saving || !form.title.trim()}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl font-mono font-bold text-xs tracking-[0.25em] uppercase transition-all disabled:opacity-40 disabled:pointer-events-none"
              style={{ background: 'linear-gradient(135deg, rgba(234,179,8,0.8) 0%, rgba(251,146,60,0.6) 100%)', color: 'rgba(255,255,255,0.95)', boxShadow: '0 0 20px rgba(234,179,8,0.2)' }}
            >
              {saving ? 'SAVING...' : 'ADD TO INVENTORY'}
            </motion.button>
          </form>
        </Modal>
      )}
    </div>
  );
}
