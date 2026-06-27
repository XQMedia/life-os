'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { getCourses, getSkills, getCourseLogEntries, addCourseLogEntry, updateCourse, grantSkillXP, generateId, today } from '@/lib/db';
import type { Course, Skill, CourseLogEntry } from '@/lib/types';
import RevealSection from './RevealSection';

export default function CoursesClient() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [allLogs, setAllLogs] = useState<CourseLogEntry[]>([]);
  const [logForms, setLogForms] = useState<Record<string, string>>({});
  const [loggingCourse, setLoggingCourse] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [c, s, l] = await Promise.all([getCourses(), getSkills(), getCourseLogEntries()]);
    setCourses(c);
    setSkills(s);
    setAllLogs(l);
  }, []);
  useEffect(() => { load(); }, [load]);

  function skillName(id: string) {
    return skills.find((s) => s.id === id)?.name ?? 'Unknown';
  }

  async function handleLog(course: Course) {
    const note = logForms[course.id]?.trim();
    if (!note) return;
    setLoggingCourse(course.id);
    const entry: CourseLogEntry = {
      id: generateId(),
      courseId: course.id,
      date: today(),
      progressNote: note,
      createdAt: Date.now(),
    };
    await addCourseLogEntry(entry);
    setAllLogs((prev) => [entry, ...prev]);
    setLogForms((prev) => ({ ...prev, [course.id]: '' }));
    await grantSkillXP(course.linkedSkillId, 3);
    setLoggingCourse(null);
  }

  const coursesWithLogs = courses.map((c) => ({
    course: c,
    logs: allLogs.filter((l) => l.courseId === c.id),
  }));

  return (
    <div className="relative min-h-dvh">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div style={{ position: 'absolute', top: '-5%', right: '-10%', width: '40vw', height: '40vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 65%)', filter: 'blur(80px)' }} />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-5 py-8 space-y-8">

        {/* Header */}
        <RevealSection>
          <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-2" style={{ color: 'rgba(59,130,246,0.5)' }}>LIFE.OS / LEARNING</p>
          <h1 className="font-black tracking-tighter leading-none" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', color: 'rgba(226,226,236,0.95)' }}>COURSES</h1>
          <p className="font-mono text-xs mt-2" style={{ color: 'rgba(226,226,236,0.25)' }}>
            {courses.length} COURSE{courses.length !== 1 ? 'S' : ''} · {allLogs.length} LOGS
          </p>
        </RevealSection>

        {courses.length === 0 ? (
          <RevealSection delay={0.03}>
            <div className="py-16 text-center rounded-2xl" style={{ background: 'rgba(255,255,255,0.015)', border: '1px dashed rgba(59,130,246,0.15)' }}>
              <p className="font-mono text-[11px] tracking-[0.25em] uppercase mb-2" style={{ color: 'rgba(226,226,236,0.2)' }}>NO COURSES YET</p>
              <p className="text-xs" style={{ color: 'rgba(226,226,236,0.3)' }}>
                Go to a <Link href="/skills" className="underline" style={{ color: 'rgba(59,130,246,0.6)' }}>skill page</Link> and add a course there.
              </p>
            </div>
          </RevealSection>
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {coursesWithLogs.map(({ course, logs }, i) => {
                const progress = course.totalUnits && course.completedUnits !== undefined
                  ? Math.min(100, Math.round((course.completedUnits / course.totalUnits) * 100))
                  : null;

                return (
                  <RevealSection key={course.id} delay={0.03 + i * 0.02}>
                    <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm" style={{ color: 'rgba(226,226,236,0.88)' }}>{course.title}</p>
                          <p className="font-mono text-[9px] mt-0.5" style={{ color: 'rgba(59,130,246,0.5)' }}>
                            LINKED TO: {skillName(course.linkedSkillId)}
                          </p>
                          {progress !== null && (
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[9px]" style={{ color: 'rgba(59,130,246,0.4)' }}>{course.completedUnits}/{course.totalUnits} units</span>
                                <span className="font-mono text-[9px]" style={{ color: 'rgba(59,130,246,0.4)' }}>{progress}%</span>
                              </div>
                              <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(59,130,246,0.1)' }}>
                                <div className="h-full rounded-full" style={{ width: `${progress}%`, background: 'rgba(59,130,246,0.6)' }} />
                              </div>
                            </div>
                          )}
                        </div>
                        <a href={course.link} target="_blank" rel="noopener noreferrer"
                          className="flex-shrink-0 px-3 py-1.5 rounded-lg font-mono text-[9px] tracking-[0.15em] uppercase transition-colors"
                          style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)', color: 'rgba(147,197,253,0.8)' }}>
                          OPEN →
                        </a>
                      </div>

                      {/* Quick log */}
                      <div className="flex gap-2">
                        <input
                          value={logForms[course.id] ?? ''}
                          onChange={(e) => setLogForms((p) => ({ ...p, [course.id]: e.target.value }))}
                          placeholder="Log today's progress..."
                          className="input-glow flex-1 rounded-xl px-4 py-2 text-sm placeholder:opacity-20 transition-all"
                          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(59,130,246,0.15)', color: 'rgba(226,226,236,0.8)' }}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleLog(course); }}
                        />
                        <motion.button
                          onClick={() => handleLog(course)}
                          disabled={!logForms[course.id]?.trim() || loggingCourse === course.id}
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
                          <p className="font-mono text-[8px] tracking-[0.2em] uppercase" style={{ color: 'rgba(59,130,246,0.3)' }}>
                            HISTORY ({logs.length} {logs.length === 1 ? 'entry' : 'entries'})
                          </p>
                          {logs.slice(0, 4).map((entry) => (
                            <div key={entry.id} className="flex items-start gap-3 rounded-lg px-3 py-2" style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.08)' }}>
                              <span className="font-mono text-[9px] flex-shrink-0 mt-0.5" style={{ color: 'rgba(59,130,246,0.45)' }}>{entry.date}</span>
                              <span className="text-xs flex-1" style={{ color: 'rgba(226,226,236,0.55)' }}>{entry.progressNote}</span>
                            </div>
                          ))}
                          {logs.length > 4 && (
                            <p className="font-mono text-[9px] text-center" style={{ color: 'rgba(59,130,246,0.3)' }}>
                              +{logs.length - 4} more entries — view on skill page
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </RevealSection>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
