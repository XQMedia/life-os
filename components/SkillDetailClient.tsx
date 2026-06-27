'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getSkillById, updateSkill, getProjectsBySkillId,
  addProject, deleteProject, generateId,
  skillTotalXP, skillLevel, xpInCurrentLevel,
  grantSkillXP, getCoursesBySkillId, addCourse, updateCourse, deleteCourse,
  addCourseLogEntry, getLogEntriesForCourse, today,
} from '@/lib/db';
import type { Skill, Project, SkillObjective, Course, CourseLogEntry } from '@/lib/types';
import Modal from './Modal';
import XpGain from './XpGain';
import RevealSection from './RevealSection';
import SectionLabel from './SectionLabel';
import SkillBadge from './SkillBadge';

function LevelBar({ xp, animated }: { xp: number; animated?: boolean }) {
  const inLevel = xpInCurrentLevel(xp);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] tracking-widest" style={{ color: 'rgba(139,92,246,0.5)' }}>
          LVL {skillLevel(xp)}
        </span>
        <span className="font-mono text-[9px]" style={{ color: 'rgba(139,92,246,0.4)' }}>
          {inLevel} / 100 XP
        </span>
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(139,92,246,0.1)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, rgba(109,40,217,0.9), rgba(167,139,250,0.7))' }}
          initial={animated ? { width: 0 } : undefined}
          animate={{ width: `${inLevel}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}

function LevelUpOverlay({ level, onDone }: { level: number; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0" style={{ background: 'rgba(109,40,217,0.08)' }} />
      <motion.div
        initial={{ scale: 0.5, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 1.1, opacity: 0, y: -20 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative text-center"
      >
        <div className="w-24 h-24 rounded-full mx-auto flex items-center justify-center mb-4"
          style={{ background: 'linear-gradient(135deg, rgba(109,40,217,0.8), rgba(167,139,250,0.6))', boxShadow: '0 0 80px rgba(139,92,246,0.5)' }}>
          <span className="font-black text-white text-3xl">{level}</span>
        </div>
        <p className="font-mono font-bold tracking-[0.4em] text-sm uppercase" style={{ color: 'rgba(167,139,250,0.95)', textShadow: '0 0 30px rgba(139,92,246,0.8)' }}>
          LEVEL UP!
        </p>
        <p className="font-mono text-[10px] tracking-widest mt-1" style={{ color: 'rgba(226,226,236,0.4)' }}>
          YOU REACHED LEVEL {level}
        </p>
      </motion.div>
    </motion.div>
  );
}

export default function SkillDetailClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [skill, setSkill] = useState<Skill | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseLogs, setCourseLogs] = useState<Record<string, CourseLogEntry[]>>({});
  const [showUpload, setShowUpload] = useState(false);
  const [showXpGain, setShowXpGain] = useState(false);
  const [xpGainAmount, setXpGainAmount] = useState(5);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpLevel, setLevelUpLevel] = useState(1);
  const [goalDraft, setGoalDraft] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);
  const [newObjective, setNewObjective] = useState('');
  const [uploadForm, setUploadForm] = useState({ title: '', description: '' });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [courseForm, setCourseForm] = useState({ title: '', link: '', totalUnits: '' });
  const [savingCourse, setSavingCourse] = useState(false);
  const [logForms, setLogForms] = useState<Record<string, { note: string; units: string }>>({});
  const [loggingCourse, setLoggingCourse] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [s, p, c] = await Promise.all([
      getSkillById(id),
      getProjectsBySkillId(id),
      getCoursesBySkillId(id),
    ]);
    if (!s) { router.replace('/dashboard'); return; }
    setSkill(s);
    setGoalDraft(s.goal ?? '');
    setProjects(p);
    setCourses(c);
    const logs: Record<string, CourseLogEntry[]> = {};
    await Promise.all(c.map(async (course) => {
      logs[course.id] = await getLogEntriesForCourse(course.id);
    }));
    setCourseLogs(logs);
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  async function triggerXpGrant(amount: number) {
    if (!skill) return;
    const result = await grantSkillXP(skill.id, amount);
    setSkill(result.skill);
    setXpGainAmount(amount);
    setShowXpGain(true);
    if (result.leveled) {
      setTimeout(() => { setLevelUpLevel(result.newLevel); setShowLevelUp(true); }, 600);
    }
  }

  async function handleSaveGoal() {
    if (!skill) return;
    setSavingGoal(true);
    const updated = { ...skill, goal: goalDraft.trim() };
    await updateSkill(updated);
    setSkill(updated);
    setSavingGoal(false);
  }

  async function handleAddObjective(e: React.FormEvent) {
    e.preventDefault();
    if (!skill || !newObjective.trim()) return;
    const obj: SkillObjective = { id: generateId(), text: newObjective.trim(), isComplete: false };
    const updated = { ...skill, objectives: [...(skill.objectives ?? []), obj] };
    await updateSkill(updated);
    setSkill(updated);
    setNewObjective('');
  }

  async function handleToggleObjective(objId: string) {
    if (!skill) return;
    const objectives = (skill.objectives ?? []).map((o) =>
      o.id === objId ? { ...o, isComplete: !o.isComplete } : o
    );
    const toggled = objectives.find((o) => o.id === objId)!;
    const updated = { ...skill, objectives };
    await updateSkill(updated);
    setSkill(updated);
    if (toggled.isComplete) {
      await triggerXpGrant(3);
    }
  }

  async function handleDeleteObjective(objId: string) {
    if (!skill) return;
    const updated = { ...skill, objectives: (skill.objectives ?? []).filter((o) => o.id !== objId) };
    await updateSkill(updated);
    setSkill(updated);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!skill || !uploadForm.title.trim()) return;
    setSaving(true);
    const file = uploadFile;
    const project: Project = {
      id: generateId(),
      skillId: skill.id,
      title: uploadForm.title.trim(),
      description: uploadForm.description.trim(),
      fileBlob: file ?? null,
      fileName: file?.name ?? '',
      fileType: file?.type ?? '',
      createdAt: Date.now(),
    };
    await addProject(project);
    setProjects((prev) => [...prev, project]);
    setShowUpload(false);
    setUploadForm({ title: '', description: '' });
    setUploadFile(null);
    setSaving(false);
    await triggerXpGrant(5);
  }

  async function handleDeleteProject(projectId: string) {
    await deleteProject(projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  }

  async function handleAddCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!skill || !courseForm.title.trim() || !courseForm.link.trim()) return;
    setSavingCourse(true);
    const course: Course = {
      id: generateId(),
      title: courseForm.title.trim(),
      link: courseForm.link.trim(),
      linkedSkillId: skill.id,
      totalUnits: courseForm.totalUnits ? Number(courseForm.totalUnits) : undefined,
      completedUnits: 0,
      createdAt: Date.now(),
    };
    await addCourse(course);
    setCourses((prev) => [...prev, course]);
    setCourseLogs((prev) => ({ ...prev, [course.id]: [] }));
    setCourseForm({ title: '', link: '', totalUnits: '' });
    setSavingCourse(false);
    setShowAddCourse(false);
  }

  async function handleDeleteCourse(courseId: string) {
    await deleteCourse(courseId);
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
  }

  async function handleLogCourse(courseId: string) {
    if (!skill) return;
    const form = logForms[courseId] ?? { note: '', units: '' };
    if (!form.note.trim()) return;
    setLoggingCourse(courseId);
    const entry: CourseLogEntry = {
      id: generateId(),
      courseId,
      date: today(),
      progressNote: form.note.trim(),
      unitsCompleted: form.units ? Number(form.units) : undefined,
      createdAt: Date.now(),
    };
    await addCourseLogEntry(entry);
    setCourseLogs((prev) => ({ ...prev, [courseId]: [entry, ...(prev[courseId] ?? [])] }));
    // Update completedUnits on course if units logged
    if (entry.unitsCompleted) {
      const course = courses.find((c) => c.id === courseId);
      if (course) {
        const updated = { ...course, completedUnits: (course.completedUnits ?? 0) + (entry.unitsCompleted ?? 0) };
        await updateCourse(updated);
        setCourses((prev) => prev.map((c) => c.id === courseId ? updated : c));
      }
    }
    setLogForms((prev) => ({ ...prev, [courseId]: { note: '', units: '' } }));
    setLoggingCourse(null);
    await triggerXpGrant(3);
  }

  function getPreviewUrl(project: Project): string | null {
    if (!project.fileBlob || !project.fileType.startsWith('image/')) return null;
    return URL.createObjectURL(project.fileBlob);
  }

  if (!skill) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <span className="font-mono text-xs tracking-widest" style={{ color: 'rgba(139,92,246,0.4)' }}>LOADING...</span>
      </div>
    );
  }

  const totalXP = skillTotalXP(skill);

  return (
    <div className="relative min-h-dvh" style={{ background: '#07070d' }}>
      {showXpGain && <XpGain amount={xpGainAmount} onDone={() => setShowXpGain(false)} />}
      <AnimatePresence>
        {showLevelUp && (
          <LevelUpOverlay level={levelUpLevel} onDone={() => setShowLevelUp(false)} />
        )}
      </AnimatePresence>

      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '60vw', height: '60vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,40,217,0.07) 0%, transparent 65%)', filter: 'blur(80px)' }} />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-5 py-10 space-y-12">

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <RevealSection>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 mb-8 transition-colors"
            style={{ color: 'rgba(139,92,246,0.4)' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(167,139,250,0.8)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(139,92,246,0.4)')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-mono text-[10px] tracking-[0.25em] uppercase">Back</span>
          </button>

          <div className="flex items-end gap-5 mb-8">
            <SkillBadge name={skill.name} size="lg" />
            <div className="flex-1">
              <p className="font-mono text-[10px] tracking-[0.3em] uppercase mb-1" style={{ color: 'rgba(139,92,246,0.5)' }}>SKILL / RECORD</p>
              <h1 className="font-black leading-none tracking-tighter" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', color: 'rgba(226,226,236,0.95)' }}>
                {skill.name}
              </h1>
              {skill.isStrength && (
                <span className="inline-block font-mono text-[8px] tracking-widest px-2 py-0.5 rounded mt-1" style={{ background: 'rgba(20,184,166,0.1)', color: 'rgba(20,184,166,0.6)', border: '1px solid rgba(20,184,166,0.2)' }}>
                  STRENGTH
                </span>
              )}
            </div>
          </div>

          <LevelBar xp={totalXP} animated />
        </RevealSection>

        {/* ── [01] GOAL ─────────────────────────────────────────────────── */}
        <RevealSection delay={0.05}>
          <SectionLabel index="01" label="Goal" />
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(139,92,246,0.18)' }}>
            <textarea
              value={goalDraft}
              onChange={(e) => setGoalDraft(e.target.value)}
              placeholder="Define your objective for this skill..."
              rows={3}
              maxLength={300}
              className="input-glow w-full rounded-xl px-4 py-3 text-sm placeholder:opacity-25 transition-all resize-none"
              style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(139,92,246,0.18)', color: 'rgba(226,226,236,0.8)' }}
            />
            <div className="mt-3 flex justify-end">
              <motion.button
                onClick={handleSaveGoal}
                disabled={savingGoal || goalDraft === (skill.goal ?? '')}
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                className="px-5 py-2 rounded-lg font-mono text-[10px] tracking-[0.2em] uppercase transition-all disabled:opacity-30 disabled:pointer-events-none"
                style={{ background: 'rgba(109,40,217,0.3)', border: '1px solid rgba(139,92,246,0.3)', color: 'rgba(167,139,250,0.9)' }}
              >
                {savingGoal ? 'SAVING...' : 'SAVE OBJECTIVE'}
              </motion.button>
            </div>
          </div>
        </RevealSection>

        {/* ── [02] OBJECTIVES ────────────────────────────────────────────── */}
        <RevealSection delay={0.08}>
          <SectionLabel index="02" label={`Objectives (${(skill.objectives ?? []).filter((o) => o.isComplete).length}/${(skill.objectives ?? []).length})`} />
          <div className="rounded-2xl p-5 space-y-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(139,92,246,0.18)' }}>
            <div className="space-y-1.5">
              <AnimatePresence>
                {(skill.objectives ?? []).map((obj) => (
                  <motion.div key={obj.id} layout
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="group flex items-center gap-3 rounded-xl px-3 py-2.5"
                    style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(139,92,246,0.14)' }}
                  >
                    <button onClick={() => handleToggleObjective(obj.id)}
                      className="flex-shrink-0 w-4 h-4 rounded flex items-center justify-center transition-all duration-150"
                      style={{
                        background: obj.isComplete ? 'rgba(109,40,217,0.8)' : 'transparent',
                        border: `1px solid ${obj.isComplete ? 'rgba(139,92,246,0.8)' : 'rgba(139,92,246,0.25)'}`,
                        boxShadow: obj.isComplete ? '0 0 6px rgba(109,40,217,0.4)' : 'none',
                      }}
                    >
                      {obj.isComplete && <svg width="7" height="7" viewBox="0 0 7 7" fill="none"><path d="M1 3.5l1.5 1.5 3-3" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </button>
                    <span className="flex-1 text-sm" style={{ color: obj.isComplete ? 'rgba(226,226,236,0.2)' : 'rgba(226,226,236,0.75)', textDecoration: obj.isComplete ? 'line-through' : 'none', transition: 'all 0.2s' }}>
                      {obj.text}
                    </span>
                    {!obj.isComplete && (
                      <span className="font-mono text-[8px] tracking-widest flex-shrink-0" style={{ color: 'rgba(139,92,246,0.35)' }}>+3 XP</span>
                    )}
                    <button onClick={() => handleDeleteObjective(obj.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity w-4 h-4 flex items-center justify-center rounded flex-shrink-0"
                      style={{ color: 'rgba(226,226,236,0.3)' }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(239,68,68,0.7)')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(226,226,236,0.3)')}
                    >
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 1l6 6M7 1l-6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {(skill.objectives ?? []).length === 0 && (
                <p className="font-mono text-[10px] tracking-widest py-4 text-center" style={{ color: 'rgba(226,226,236,0.12)' }}>
                  NO OBJECTIVES YET. ADD MILESTONES TO EARN XP AS YOU HIT THEM.
                </p>
              )}
            </div>
            <form onSubmit={handleAddObjective} className="flex gap-2 pt-1">
              <input
                value={newObjective}
                onChange={(e) => setNewObjective(e.target.value)}
                placeholder="Add an objective..."
                className="input-glow flex-1 rounded-xl px-4 py-2.5 text-sm placeholder:opacity-20 transition-all"
                style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(139,92,246,0.18)', color: 'rgba(226,226,236,0.8)' }}
              />
              <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                className="px-4 py-2.5 rounded-xl font-mono text-[10px] tracking-[0.15em] uppercase flex-shrink-0"
                style={{ background: 'rgba(109,40,217,0.25)', border: '1px solid rgba(139,92,246,0.25)', color: 'rgba(167,139,250,0.85)' }}
              >ADD</motion.button>
            </form>
          </div>
        </RevealSection>

        {/* ── [03] PROJECTS ──────────────────────────────────────────────── */}
        <RevealSection delay={0.11}>
          <div className="flex items-center justify-between mb-5">
            <SectionLabel index="03" label={`Projects (${projects.length})`} className="mb-0" />
            <motion.button
              onClick={() => setShowUpload(true)}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-[10px] tracking-[0.2em] uppercase"
              style={{ background: 'linear-gradient(135deg, rgba(109,40,217,0.8) 0%, rgba(139,92,246,0.6) 100%)', border: '1px solid rgba(139,92,246,0.35)', color: 'rgba(255,255,255,0.9)', boxShadow: '0 0 16px rgba(109,40,217,0.2)' }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              UPLOAD PROJECT
            </motion.button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project, i) => {
              const previewUrl = getPreviewUrl(project);
              const isPdf = project.fileType === 'application/pdf';
              return (
                <motion.div key={project.id} className="group relative rounded-2xl overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(139,92,246,0.18)' }}
                  whileHover={{ y: -3 }} transition={{ duration: 0.2 }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.25)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.1)')}
                >
                  <div className="h-28 flex items-center justify-center overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    {previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previewUrl} alt={project.title} className="w-full h-full object-cover" onLoad={() => URL.revokeObjectURL(previewUrl)} />
                    ) : (
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-mono text-[10px] font-bold tracking-widest"
                        style={{ background: 'rgba(109,40,217,0.2)', border: '1px solid rgba(139,92,246,0.2)', color: 'rgba(167,139,250,0.7)' }}>
                        {isPdf ? 'PDF' : 'DOC'}
                      </div>
                    )}
                  </div>
                  <div className="flex items-start justify-between px-4 pt-3 pb-1">
                    <span className="font-mono text-[9px] tracking-widest" style={{ color: 'rgba(139,92,246,0.35)' }}>PRJ_{String(i + 1).padStart(2, '0')}</span>
                    <button onClick={() => handleDeleteProject(project.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded"
                      style={{ color: 'rgba(226,226,236,0.3)' }} aria-label="Delete"
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(239,68,68,0.7)')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(226,226,236,0.3)')}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </button>
                  </div>
                  <div className="px-4 pb-4">
                    <p className="text-sm font-semibold mb-0.5 truncate" style={{ color: 'rgba(226,226,236,0.8)' }}>{project.title}</p>
                    {project.description && <p className="text-xs line-clamp-2" style={{ color: 'rgba(226,226,236,0.35)' }}>{project.description}</p>}
                    {project.fileName && <p className="font-mono text-[9px] mt-1 truncate" style={{ color: 'rgba(139,92,246,0.35)' }}>{project.fileName}</p>}
                  </div>
                </motion.div>
              );
            })}
            {projects.length === 0 && (
              <div className="col-span-full py-12 text-center font-mono text-[11px] tracking-[0.2em]" style={{ color: 'rgba(226,226,236,0.15)' }}>
                NO PROJECTS LOGGED. UPLOAD TO EARN +5 XP.
              </div>
            )}
          </div>
        </RevealSection>

        {/* ── [04] COURSES ───────────────────────────────────────────────── */}
        <RevealSection delay={0.14}>
          <div className="flex items-center justify-between mb-5">
            <SectionLabel index="04" label={`Courses (${courses.length})`} className="mb-0" />
            <motion.button
              onClick={() => setShowAddCourse(true)}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-[10px] tracking-[0.2em] uppercase"
              style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)', color: 'rgba(147,197,253,0.9)' }}
            >
              + ADD COURSE
            </motion.button>
          </div>

          <div className="space-y-4">
            {courses.map((course) => {
              const logs = courseLogs[course.id] ?? [];
              const logForm = logForms[course.id] ?? { note: '', units: '' };
              const progress = course.totalUnits && course.completedUnits !== undefined
                ? Math.min(100, Math.round((course.completedUnits / course.totalUnits) * 100))
                : null;

              return (
                <div key={course.id} className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ color: 'rgba(226,226,236,0.88)' }}>{course.title}</p>
                      {progress !== null && (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[9px]" style={{ color: 'rgba(59,130,246,0.5)' }}>{course.completedUnits}/{course.totalUnits} units</span>
                            <span className="font-mono text-[9px]" style={{ color: 'rgba(59,130,246,0.5)' }}>{progress}%</span>
                          </div>
                          <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(59,130,246,0.1)' }}>
                            <div className="h-full rounded-full" style={{ width: `${progress}%`, background: 'rgba(59,130,246,0.6)' }} />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a href={course.link} target="_blank" rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg font-mono text-[9px] tracking-[0.15em] uppercase transition-colors"
                        style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)', color: 'rgba(147,197,253,0.8)' }}>
                        OPEN →
                      </a>
                      <button onClick={() => handleDeleteCourse(course.id)}
                        className="w-6 h-6 flex items-center justify-center rounded"
                        style={{ color: 'rgba(226,226,236,0.2)' }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(239,68,68,0.6)')}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(226,226,236,0.2)')}
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </button>
                    </div>
                  </div>

                  {/* Log form */}
                  <div className="flex gap-2">
                    <input
                      value={logForm.note}
                      onChange={(e) => setLogForms((p) => ({ ...p, [course.id]: { ...logForm, note: e.target.value } }))}
                      placeholder="Log today's progress..."
                      className="input-glow flex-1 rounded-xl px-4 py-2 text-sm placeholder:opacity-20 transition-all"
                      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(59,130,246,0.15)', color: 'rgba(226,226,236,0.8)' }}
                    />
                    {course.totalUnits && (
                      <input
                        type="number" min="0"
                        value={logForm.units}
                        onChange={(e) => setLogForms((p) => ({ ...p, [course.id]: { ...logForm, units: e.target.value } }))}
                        placeholder="Units"
                        className="input-glow w-16 rounded-xl px-3 py-2 text-sm placeholder:opacity-20 text-center"
                        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(59,130,246,0.15)', color: 'rgba(226,226,236,0.8)' }}
                      />
                    )}
                    <motion.button
                      onClick={() => handleLogCourse(course.id)}
                      disabled={!logForm.note.trim() || loggingCourse === course.id}
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      className="px-4 py-2 rounded-xl font-mono text-[9px] tracking-[0.15em] uppercase flex-shrink-0 disabled:opacity-30 disabled:pointer-events-none"
                      style={{ background: 'rgba(59,130,246,0.25)', border: '1px solid rgba(59,130,246,0.3)', color: 'rgba(147,197,253,0.9)' }}
                    >
                      {loggingCourse === course.id ? '...' : 'LOG +3XP'}
                    </motion.button>
                  </div>

                  {/* Log history */}
                  {logs.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="font-mono text-[8px] tracking-[0.2em] uppercase" style={{ color: 'rgba(59,130,246,0.35)' }}>HISTORY</p>
                      {logs.slice(0, 5).map((entry) => (
                        <div key={entry.id} className="flex items-start gap-3 rounded-lg px-3 py-2" style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.08)' }}>
                          <span className="font-mono text-[9px] flex-shrink-0 mt-0.5" style={{ color: 'rgba(59,130,246,0.45)' }}>{entry.date}</span>
                          <span className="text-xs flex-1" style={{ color: 'rgba(226,226,236,0.55)' }}>{entry.progressNote}</span>
                          {entry.unitsCompleted && (
                            <span className="font-mono text-[9px] flex-shrink-0" style={{ color: 'rgba(59,130,246,0.5)' }}>+{entry.unitsCompleted}u</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {courses.length === 0 && (
              <div className="py-10 text-center font-mono text-[10px] tracking-[0.2em]" style={{ color: 'rgba(226,226,236,0.12)' }}>
                NO COURSES LINKED. ADD A COURSE TO TRACK YOUR LEARNING.
              </div>
            )}
          </div>
        </RevealSection>

      </div>

      {/* Upload Modal */}
      {showUpload && (
        <Modal title="Upload Project" subtitle="PROJECTS / NEW" onClose={() => setShowUpload(false)}>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block font-mono text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: 'rgba(226,226,236,0.3)' }}>Title</label>
              <input type="text" value={uploadForm.title} onChange={(e) => setUploadForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Project title" required maxLength={80} autoFocus
                className="input-glow w-full rounded-xl px-4 py-2.5 text-sm text-white/90 placeholder:text-white/20 transition-all"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.15)' }} />
            </div>
            <div>
              <label className="block font-mono text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: 'rgba(226,226,236,0.3)' }}>Description</label>
              <textarea value={uploadForm.description} onChange={(e) => setUploadForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What did you build or learn?" rows={2} maxLength={300}
                className="input-glow w-full rounded-xl px-4 py-2.5 text-sm text-white/90 placeholder:text-white/20 transition-all resize-none"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.15)' }} />
            </div>
            <div>
              <label className="block font-mono text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: 'rgba(226,226,236,0.3)' }}>File (image or PDF)</label>
              <input type="file" accept="image/*,application/pdf" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-1.5 file:text-[10px] file:font-mono file:font-bold file:tracking-widest file:uppercase file:text-white/80 cursor-pointer"
                style={{ color: 'rgba(226,226,236,0.4)' }} />
            </div>
            <div className="rounded-xl px-4 py-3 font-mono text-[10px] tracking-[0.2em]"
              style={{ background: 'rgba(109,40,217,0.1)', border: '1px solid rgba(139,92,246,0.2)', color: 'rgba(167,139,250,0.7)' }}>
              ✦ UPLOADING A PROJECT GRANTS +5 XP TO THIS SKILL
            </div>
            <motion.button type="submit" disabled={saving || !uploadForm.title.trim()}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl font-mono font-bold text-[11px] tracking-[0.25em] uppercase transition-all disabled:opacity-40 disabled:pointer-events-none"
              style={{ background: 'linear-gradient(135deg, rgba(109,40,217,0.9) 0%, rgba(139,92,246,0.7) 100%)', color: 'rgba(255,255,255,0.9)', boxShadow: '0 0 20px rgba(109,40,217,0.25)' }}
            >
              {saving ? 'UPLOADING...' : 'UPLOAD & EARN XP'}
            </motion.button>
          </form>
        </Modal>
      )}

      {/* Add Course Modal */}
      {showAddCourse && (
        <Modal title="Add Course" subtitle="COURSES / NEW" onClose={() => setShowAddCourse(false)}>
          <form onSubmit={handleAddCourse} className="space-y-4">
            <div>
              <label className="block font-mono text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: 'rgba(226,226,236,0.3)' }}>Course Title</label>
              <input type="text" value={courseForm.title} onChange={(e) => setCourseForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. CS50, Fullstack Open..." required maxLength={80} autoFocus
                className="input-glow w-full rounded-xl px-4 py-2.5 text-sm text-white/90 placeholder:text-white/20 transition-all"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(59,130,246,0.2)' }} />
            </div>
            <div>
              <label className="block font-mono text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: 'rgba(226,226,236,0.3)' }}>Link</label>
              <input type="url" value={courseForm.link} onChange={(e) => setCourseForm((f) => ({ ...f, link: e.target.value }))}
                placeholder="https://..." required
                className="input-glow w-full rounded-xl px-4 py-2.5 text-sm text-white/90 placeholder:text-white/20 transition-all"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(59,130,246,0.2)' }} />
            </div>
            <div>
              <label className="block font-mono text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: 'rgba(226,226,236,0.3)' }}>Total Units (optional)</label>
              <input type="number" min="1" value={courseForm.totalUnits} onChange={(e) => setCourseForm((f) => ({ ...f, totalUnits: e.target.value }))}
                placeholder="e.g. 12 weeks, 50 lessons..."
                className="input-glow w-full rounded-xl px-4 py-2.5 text-sm text-white/90 placeholder:text-white/20 transition-all"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(59,130,246,0.2)' }} />
            </div>
            <div className="rounded-xl px-4 py-3 font-mono text-[10px] tracking-[0.2em]"
              style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', color: 'rgba(147,197,253,0.7)' }}>
              ✦ EACH PROGRESS LOG GRANTS +3 XP TO THIS SKILL
            </div>
            <motion.button type="submit" disabled={savingCourse || !courseForm.title.trim() || !courseForm.link.trim()}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl font-mono font-bold text-[11px] tracking-[0.25em] uppercase transition-all disabled:opacity-40 disabled:pointer-events-none"
              style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.8) 0%, rgba(147,197,253,0.6) 100%)', color: 'rgba(255,255,255,0.9)', boxShadow: '0 0 20px rgba(59,130,246,0.2)' }}
            >
              {savingCourse ? 'SAVING...' : 'ADD COURSE'}
            </motion.button>
          </form>
        </Modal>
      )}
    </div>
  );
}
