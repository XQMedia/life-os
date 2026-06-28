'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { getSkills, addSkill, generateId, skillTotalXP, skillLevel, xpInCurrentLevel, profileTitle } from '@/lib/db';
import type { Skill } from '@/lib/types';
import Modal from './Modal';
import RevealSection from './RevealSection';
import SkillBadge from './SkillBadge';

function LevelBar({ xp }: { xp: number }) {
  const inLevel = xpInCurrentLevel(xp);
  return (
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${inLevel}%` }} />
    </div>
  );
}

function SkillCard({ skill }: { skill: Skill }) {
  const xp = skillTotalXP(skill);
  const lvl = skillLevel(xp);
  const inLevel = xpInCurrentLevel(xp);

  return (
    <Link
      href={`/skills/${skill.id}`}
      className="flex flex-col gap-3 rounded-2xl p-5 transition-all duration-200 group"
      style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'var(--card-hover)';
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.35)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'var(--card)';
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--card-border)';
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <SkillBadge name={skill.name} size="md" />
          <div className="min-w-0">
            <h3 className="font-semibold text-sm leading-tight truncate" style={{ color: 'var(--text-1)' }}>
              {skill.name}
            </h3>
            {skill.goal && (
              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-3)' }}>{skill.goal}</p>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 flex items-center gap-1.5">
          <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)', border: '1px solid rgba(139,92,246,0.25)' }}>
            LVL {lvl}
          </span>
          <svg className="opacity-0 group-hover:opacity-100 transition-opacity" width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M2 1l3 3-3 3" stroke="rgba(139,92,246,0.5)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      <LevelBar xp={xp} />
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px]" style={{ color: 'rgba(139,92,246,0.4)' }}>{inLevel} / 100 XP</span>
        {skill.isStrength && (
          <span className="font-mono text-[8px] tracking-widest px-1.5 py-0.5 rounded" style={{ background: 'rgba(20,184,166,0.1)', color: 'rgba(20,184,166,0.6)', border: '1px solid rgba(20,184,166,0.2)' }}>
            STRENGTH
          </span>
        )}
      </div>

      {skill.objectives && skill.objectives.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(139,92,246,0.08)' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.round((skill.objectives.filter(o => o.isComplete).length / skill.objectives.length) * 100)}%`,
                background: 'linear-gradient(90deg, rgba(109,40,217,0.6), rgba(167,139,250,0.5))',
              }}
            />
          </div>
          <span className="font-mono text-[9px]" style={{ color: 'rgba(139,92,246,0.35)' }}>
            {skill.objectives.filter(o => o.isComplete).length}/{skill.objectives.length} OBJ
          </span>
        </div>
      )}
    </Link>
  );
}

export default function SkillsClient() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '' });
  const [saving, setSaving] = useState(false);
  const [strengthInput, setStrengthInput] = useState('');
  const [addingStrength, setAddingStrength] = useState(false);
  const strengthInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setSkills(await getSkills());
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const skill: Skill = {
      id: generateId(),
      name: form.name.trim(),
      icon: form.name.slice(0, 2).toUpperCase(),
      masteryLevel: 0,
      totalXP: 0,
      createdAt: Date.now(),
    };
    await addSkill(skill);
    setSkills((prev) => [...prev, skill]);
    setForm({ name: '' });
    setSaving(false);
    setShowAdd(false);
  }

  async function handleAddStrength(e: React.FormEvent) {
    e.preventDefault();
    if (!strengthInput.trim()) return;
    setAddingStrength(true);
    const skill: Skill = {
      id: generateId(),
      name: strengthInput.trim(),
      icon: strengthInput.slice(0, 2).toUpperCase(),
      masteryLevel: 0,
      totalXP: 0,
      isStrength: true,
      createdAt: Date.now(),
    };
    await addSkill(skill);
    setSkills((prev) => [...prev, skill]);
    setStrengthInput('');
    setAddingStrength(false);
    strengthInputRef.current?.focus();
  }

  const allSkills = skills;
  const strengths = skills.filter((s) => s.isStrength);
  const regularSkills = skills.filter((s) => !s.isStrength);
  const title = profileTitle(skills);

  return (
    <div className="min-h-dvh">
      <div className="mx-auto max-w-6xl px-5 py-8 space-y-10">

        {/* Header */}
        <RevealSection delay={0}>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-2" style={{ color: 'var(--text-3)' }}>
                SKILL TREE / OVERVIEW
              </p>
              <h1 className="font-black tracking-tighter leading-none" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', color: 'var(--text-1)' }}>
                Skill Trees
              </h1>
              {allSkills.length > 0 && (
                <p className="font-mono text-xs mt-2" style={{ color: 'var(--text-3)' }}>
                  {allSkills.length} SKILL{allSkills.length !== 1 ? 'S' : ''} · {title.toUpperCase()}
                </p>
              )}
            </div>
            <motion.button
              onClick={() => setShowAdd(true)}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="px-5 py-2.5 rounded-xl font-mono text-[11px] tracking-[0.2em] uppercase"
              style={{
                background: 'linear-gradient(135deg, rgba(109,40,217,0.8) 0%, rgba(139,92,246,0.6) 100%)',
                border: '1px solid rgba(139,92,246,0.35)',
                color: 'rgba(255,255,255,0.9)',
                boxShadow: '0 0 20px rgba(109,40,217,0.2)',
              }}
            >
              + ADD SKILL
            </motion.button>
          </div>
        </RevealSection>

        {/* Your Strengths */}
        <RevealSection delay={0.03}>
          <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--card)', border: '1px solid rgba(20,184,166,0.15)' }}>
            <div className="flex items-center gap-2">
              <p className="font-mono text-[10px] tracking-[0.3em] uppercase" style={{ color: 'rgba(20,184,166,0.6)' }}>
                YOUR STRENGTHS
              </p>
              <span className="font-mono text-[8px]" style={{ color: 'rgba(20,184,166,0.3)' }}>— skills you&apos;re naturally good at</span>
            </div>
            <form onSubmit={handleAddStrength} className="flex gap-2">
              <input
                ref={strengthInputRef}
                type="text"
                value={strengthInput}
                onChange={(e) => setStrengthInput(e.target.value)}
                placeholder="e.g. Problem Solving, Communication..."
                maxLength={40}
                className="input-glow flex-1 rounded-xl px-4 py-2.5 text-sm placeholder:opacity-20 transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(20,184,166,0.2)', color: 'var(--text-1)' }}
              />
              <motion.button
                type="submit"
                disabled={!strengthInput.trim() || addingStrength}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                className="px-4 py-2.5 rounded-xl font-mono text-[10px] tracking-[0.15em] uppercase flex-shrink-0 disabled:opacity-30 disabled:pointer-events-none"
                style={{ background: 'rgba(20,184,166,0.2)', border: '1px solid rgba(20,184,166,0.3)', color: 'rgba(20,184,166,0.9)' }}
              >ADD</motion.button>
            </form>
            {strengths.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <AnimatePresence>
                  {strengths.map((skill, i) => (
                    <RevealSection key={skill.id} delay={0.02 + i * 0.02}>
                      <SkillCard skill={skill} />
                    </RevealSection>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <p className="font-mono text-[10px] tracking-widest py-2" style={{ color: 'var(--text-3)' }}>
                ADD YOUR FIRST STRENGTH — IT BECOMES A SKILL CARD YOU CAN LEVEL UP
              </p>
            )}
          </div>
        </RevealSection>

        {/* All Skills grid */}
        {regularSkills.length === 0 && strengths.length === 0 ? (
          <RevealSection delay={0.04}>
            <button
              onClick={() => setShowAdd(true)}
              className="w-full rounded-2xl p-12 text-center transition-all"
              style={{ background: 'var(--card)', border: '1px dashed var(--card-border)' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.3)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--card-border)')}
            >
              <p className="font-mono text-[11px] tracking-[0.25em] uppercase mb-2" style={{ color: 'var(--text-3)' }}>
                YOUR SKILL TREE IS EMPTY
              </p>
              <p className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--accent-text)' }}>
                CLICK TO ADD YOUR FIRST SKILL →
              </p>
            </button>
          </RevealSection>
        ) : regularSkills.length > 0 ? (
          <RevealSection delay={0.06}>
            <p className="font-mono text-[10px] tracking-[0.3em] uppercase mb-4" style={{ color: 'var(--text-3)' }}>ALL SKILLS</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {regularSkills.map((skill, i) => (
                  <RevealSection key={skill.id} delay={0.04 + i * 0.03}>
                    <SkillCard skill={skill} />
                  </RevealSection>
                ))}
              </AnimatePresence>
            </div>
          </RevealSection>
        ) : null}
      </div>

      {/* Add Skill Modal */}
      {showAdd && (
        <Modal title="New Skill" subtitle="SKILL_TREE / ADD" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd} className="space-y-5">
            <div>
              <label className="block font-mono text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: 'rgba(226,226,236,0.3)' }}>Skill Name</label>
              <div className="flex items-center gap-3">
                <SkillBadge name={form.name || '?'} size="sm" />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. TypeScript, Piano, Design"
                  required maxLength={40} autoFocus
                  className="input-glow flex-1 rounded-xl px-4 py-2.5 text-sm text-white/90 placeholder:text-white/20 transition-all"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.15)' }}
                />
              </div>
            </div>
            <div className="rounded-xl px-4 py-3 font-mono text-[10px] tracking-[0.15em]"
              style={{ background: 'rgba(109,40,217,0.1)', border: '1px solid rgba(139,92,246,0.2)', color: 'rgba(167,139,250,0.7)' }}>
              ✦ ALL SKILLS START AT LEVEL 1 — EARN XP BY COMPLETING OBJECTIVES, UPLOADING PROJECTS & LOGGING COURSES
            </div>
            <motion.button
              type="submit" disabled={saving || !form.name.trim()}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl font-mono font-bold text-xs tracking-[0.25em] uppercase transition-all disabled:opacity-40 disabled:pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, rgba(109,40,217,0.9) 0%, rgba(139,92,246,0.7) 100%)',
                color: 'rgba(255,255,255,0.9)',
                boxShadow: '0 0 20px rgba(109,40,217,0.25)',
              }}
            >
              {saving ? 'SAVING...' : 'ADD TO SKILL TREE'}
            </motion.button>
          </form>
        </Modal>
      )}
    </div>
  );
}
