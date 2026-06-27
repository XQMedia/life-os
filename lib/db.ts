/**
 * IndexedDB persistence layer via idb-keyval.
 *
 * idb-keyval wraps the IndexedDB API as a simple key/value store.
 * We store each entity type under its own string key as a plain array
 * (or a single object for Character). Blobs are stored natively — no base64.
 *
 * All exports are async — call only in Client Components or event handlers.
 */

import { get, set } from 'idb-keyval';
import type { Character, Skill, Project, Quest, Idea, BossBattle, QuickLink, InventoryItem, Achievement, Course, CourseLogEntry } from './types';

// ── Keys ──────────────────────────────────────────────────────────────────────

const KEY_CHARACTER   = 'character';
const KEY_SKILLS      = 'skills';
const KEY_PROJECTS    = 'projects';
const KEY_QUESTS      = 'quests';
const KEY_IDEAS       = 'ideas';
const KEY_BOSS        = 'boss_battles';
const KEY_QUICK_LINKS = 'quick_links';

// ── Date helpers ──────────────────────────────────────────────────────────────

export function today(): string {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

function yesterday(): string {
  return new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
}

// ── Character ─────────────────────────────────────────────────────────────────

export async function getCharacter(): Promise<Character | null> {
  return (await get<Character>(KEY_CHARACTER)) ?? null;
}

export async function saveCharacter(character: Character): Promise<void> {
  await set(KEY_CHARACTER, character);
}

// ── Skills ────────────────────────────────────────────────────────────────────

export async function getSkills(): Promise<Skill[]> {
  return (await get<Skill[]>(KEY_SKILLS)) ?? [];
}

export async function saveSkills(skills: Skill[]): Promise<void> {
  await set(KEY_SKILLS, skills);
}

export async function addSkill(skill: Skill): Promise<void> {
  const skills = await getSkills();
  await saveSkills([...skills, skill]);
}

export async function updateSkill(updated: Skill): Promise<void> {
  const skills = await getSkills();
  await saveSkills(skills.map((s) => (s.id === updated.id ? updated : s)));
}

export async function getSkillById(id: string): Promise<Skill | null> {
  const skills = await getSkills();
  return skills.find((s) => s.id === id) ?? null;
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function getProjects(): Promise<Project[]> {
  return (await get<Project[]>(KEY_PROJECTS)) ?? [];
}

export async function saveProjects(projects: Project[]): Promise<void> {
  await set(KEY_PROJECTS, projects);
}

export async function addProject(project: Project): Promise<void> {
  const projects = await getProjects();
  await saveProjects([...projects, project]);
}

export async function getProjectsBySkillId(skillId: string): Promise<Project[]> {
  const projects = await getProjects();
  return projects.filter((p) => p.skillId === skillId);
}

export async function deleteProject(id: string): Promise<void> {
  const projects = await getProjects();
  await saveProjects(projects.filter((p) => p.id !== id));
}

// ── Quest helpers ─────────────────────────────────────────────────────────────

/** Infer questType for legacy data that pre-dates the field. */
export function inferQuestType(q: Quest): 'longTerm' | 'daily' {
  if (q.questType) return q.questType;
  if (q.isDaily || q.repeatsDaily) return 'daily';
  return 'longTerm';
}

/** True only for daily quests that repeat (resets each morning, builds streak). */
export function isRepeatingDaily(q: Quest): boolean {
  return inferQuestType(q) === 'daily' && (q.repeatsDaily ?? q.isDaily ?? false);
}

// ── Quests ────────────────────────────────────────────────────────────────────

export async function getQuests(): Promise<Quest[]> {
  return (await get<Quest[]>(KEY_QUESTS)) ?? [];
}

export async function saveQuests(quests: Quest[]): Promise<void> {
  await set(KEY_QUESTS, quests);
}

export async function addQuest(quest: Quest): Promise<void> {
  const quests = await getQuests();
  await saveQuests([...quests, quest]);
}

export async function updateQuest(updated: Quest): Promise<void> {
  const quests = await getQuests();
  await saveQuests(quests.map((q) => (q.id === updated.id ? updated : q)));
}

export async function deleteQuest(id: string): Promise<void> {
  const quests = await getQuests();
  await saveQuests(quests.filter((q) => q.id !== id));
}

export async function setMainQuest(id: string): Promise<void> {
  const quests = await getQuests();
  await saveQuests(quests.map((q) => ({ ...q, isMainQuest: q.id === id })));
}

/**
 * Called on dashboard load. Any daily quest whose lastCompletedDate isn't
 * today gets reset to incomplete so it can be ticked again.
 * Returns true if any quests were actually reset (so callers can refresh state).
 */
export async function resetDailyQuestsIfNeeded(): Promise<boolean> {
  const t = today();
  const quests = await getQuests();
  const needsWork = quests.some(
    (q) => isRepeatingDaily(q) && q.isComplete && q.lastCompletedDate !== t
  );
  if (!needsWork) return false;
  await saveQuests(
    quests.map((q) =>
      isRepeatingDaily(q) && q.isComplete && q.lastCompletedDate !== t
        ? { ...q, isComplete: false }
        : q
    )
  );
  return true;
}

/**
 * Complete a daily quest and update the character's streak.
 * Streak rules:
 *   - If lastActiveDate === today: already active today, streak unchanged
 *   - If lastActiveDate === yesterday: consecutive, increment
 *   - Otherwise: streak resets to 1 (new streak starting today)
 */
export async function completeDailyAndUpdateStreak(questId: string): Promise<Character | null> {
  const t = today();
  const yest = yesterday();

  const [quests, character] = await Promise.all([getQuests(), getCharacter()]);
  if (!character) return null;

  const targetQuest = quests.find((q) => q.id === questId);

  // Mark the quest complete
  await saveQuests(
    quests.map((q) =>
      q.id === questId ? { ...q, isComplete: true, lastCompletedDate: t } : q
    )
  );

  // Only repeating daily quests contribute to streak
  if (!targetQuest || !isRepeatingDaily(targetQuest)) return character;

  // Update streak only if first completion today
  if (character.lastActiveDate === t) return character; // already counted

  const streak =
    character.lastActiveDate === yest
      ? (character.currentStreak ?? 0) + 1
      : 1;

  const updated: Character = { ...character, currentStreak: streak, lastActiveDate: t };
  await saveCharacter(updated);
  return updated;
}

// ── Ideas ─────────────────────────────────────────────────────────────────────

export async function getIdeas(): Promise<Idea[]> {
  return (await get<Idea[]>(KEY_IDEAS)) ?? [];
}

export async function saveIdeas(ideas: Idea[]): Promise<void> {
  await set(KEY_IDEAS, ideas);
}

export async function addIdea(idea: Idea): Promise<void> {
  const ideas = await getIdeas();
  await saveIdeas([idea, ...ideas]); // prepend — newest first
}

export async function deleteIdea(id: string): Promise<void> {
  const ideas = await getIdeas();
  await saveIdeas(ideas.filter((i) => i.id !== id));
}

// ── Boss Battles ──────────────────────────────────────────────────────────────

export async function getBossBattles(): Promise<BossBattle[]> {
  return (await get<BossBattle[]>(KEY_BOSS)) ?? [];
}

export async function saveBossBattles(battles: BossBattle[]): Promise<void> {
  await set(KEY_BOSS, battles);
}

export async function addBossBattle(battle: BossBattle): Promise<void> {
  const battles = await getBossBattles();
  await saveBossBattles([...battles, battle]);
}

export async function updateBossBattle(updated: BossBattle): Promise<void> {
  const battles = await getBossBattles();
  await saveBossBattles(battles.map((b) => (b.id === updated.id ? updated : b)));
}

export async function deleteBossBattle(id: string): Promise<void> {
  const battles = await getBossBattles();
  await saveBossBattles(battles.filter((b) => b.id !== id));
}

// ── Quick Links ───────────────────────────────────────────────────────────────

const DEFAULT_QUICK_LINKS: QuickLink[] = [
  { id: 'ql-yt',  label: 'YouTube',   url: 'https://youtube.com',       order: 0 },
  { id: 'ql-gh',  label: 'GitHub',    url: 'https://github.com',        order: 1 },
  { id: 'ql-cl',  label: 'Claude',    url: 'https://claude.ai',         order: 2 },
  { id: 'ql-gpt', label: 'ChatGPT',   url: 'https://chatgpt.com',       order: 3 },
  { id: 'ql-ig',  label: 'Instagram', url: 'https://instagram.com',     order: 4 },
  { id: 'ql-x',   label: 'X',         url: 'https://x.com',             order: 5 },
];

export async function getQuickLinks(): Promise<QuickLink[]> {
  const links = await get<QuickLink[]>(KEY_QUICK_LINKS);
  if (!links) {
    await set(KEY_QUICK_LINKS, DEFAULT_QUICK_LINKS);
    return DEFAULT_QUICK_LINKS;
  }
  return links;
}

export async function saveQuickLinks(links: QuickLink[]): Promise<void> {
  await set(KEY_QUICK_LINKS, links);
}

export async function addQuickLink(link: QuickLink): Promise<void> {
  const links = await getQuickLinks();
  await saveQuickLinks([...links, link]);
}

export async function deleteQuickLink(id: string): Promise<void> {
  const links = await getQuickLinks();
  await saveQuickLinks(links.filter((l) => l.id !== id));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── XP / Level helpers ─────────────────────────────────────────────────────────

export function skillTotalXP(skill: Skill): number {
  return skill.totalXP ?? skill.masteryLevel ?? 0;
}

export function skillLevel(totalXP: number): number {
  return Math.floor(totalXP / 100) + 1;
}

export function xpInCurrentLevel(totalXP: number): number {
  return totalXP % 100;
}

export function profileTitle(skills: Skill[]): string {
  if (skills.length === 0) return 'Beginner';
  const avg = Math.floor(
    skills.reduce((s, sk) => s + skillLevel(skillTotalXP(sk)), 0) / skills.length
  );
  if (avg >= 50) return 'Hacker';
  if (avg >= 20) return 'Master';
  if (avg >= 10) return 'Pro';
  if (avg >= 5) return 'Intermediate';
  return 'Beginner';
}

export async function grantSkillXP(
  skillId: string,
  amount: number
): Promise<{ skill: Skill; leveled: boolean; newLevel: number }> {
  const skill = await getSkillById(skillId);
  if (!skill) throw new Error(`Skill ${skillId} not found`);
  const oldXP = skillTotalXP(skill);
  const newXP = oldXP + amount;
  const oldLevel = skillLevel(oldXP);
  const newLvl = skillLevel(newXP);
  const updated: Skill = { ...skill, totalXP: newXP, masteryLevel: Math.min(100, skill.masteryLevel) };
  await updateSkill(updated);
  return { skill: updated, leveled: newLvl > oldLevel, newLevel: newLvl };
}

// ── Inventory ──────────────────────────────────────────────────────────────────

const KEY_INVENTORY = 'inventory';

export async function getInventory(): Promise<InventoryItem[]> {
  return (await get<InventoryItem[]>(KEY_INVENTORY)) ?? [];
}

export async function saveInventory(items: InventoryItem[]): Promise<void> {
  await set(KEY_INVENTORY, items);
}

export async function addInventoryItem(item: InventoryItem): Promise<void> {
  const items = await getInventory();
  await saveInventory([item, ...items]);
}

export async function deleteInventoryItem(id: string): Promise<void> {
  const items = await getInventory();
  await saveInventory(items.filter((i) => i.id !== id));
}

// ── Achievements ───────────────────────────────────────────────────────────────

const KEY_ACHIEVEMENTS = 'achievements';

const BUILTIN_DEFS: Array<{ builtinKey: string; title: string; description: string; targetValue: number }> = [
  { builtinKey: 'streak_7',      title: '7-Day Streak',          description: 'Complete daily quests 7 days in a row.',  targetValue: 7  },
  { builtinKey: 'projects_10',   title: 'Complete 10 Projects',  description: 'Upload 10 projects across all skills.',   targetValue: 10 },
  { builtinKey: 'skill_level_5', title: 'Reach Level 5',         description: 'Reach Level 5 in any skill.',            targetValue: 5  },
];

export async function getAchievements(): Promise<Achievement[]> {
  return (await get<Achievement[]>(KEY_ACHIEVEMENTS)) ?? [];
}

export async function saveAchievements(achievements: Achievement[]): Promise<void> {
  await set(KEY_ACHIEVEMENTS, achievements);
}

export async function seedBuiltinAchievements(): Promise<void> {
  const existing = await getAchievements();
  const existingKeys = new Set(existing.filter((a) => a.builtinKey).map((a) => a.builtinKey!));
  const toAdd: Achievement[] = BUILTIN_DEFS.filter((d) => !existingKeys.has(d.builtinKey)).map((d) => ({
    id: generateId(),
    title: d.title,
    description: d.description,
    type: 'builtin' as const,
    builtinKey: d.builtinKey,
    targetValue: d.targetValue,
    currentProgress: 0,
    isComplete: false,
    createdAt: Date.now(),
  }));
  if (toAdd.length > 0) await saveAchievements([...existing, ...toAdd]);
}

export async function addAchievement(achievement: Achievement): Promise<void> {
  const achievements = await getAchievements();
  await saveAchievements([...achievements, achievement]);
}

export async function updateAchievement(updated: Achievement): Promise<void> {
  const achievements = await getAchievements();
  await saveAchievements(achievements.map((a) => (a.id === updated.id ? updated : a)));
}

export async function deleteAchievement(id: string): Promise<void> {
  const achievements = await getAchievements();
  await saveAchievements(achievements.filter((a) => a.id !== id));
}

// ── Courses ────────────────────────────────────────────────────────────────────

const KEY_COURSES = 'courses';

export async function getCourses(): Promise<Course[]> {
  return (await get<Course[]>(KEY_COURSES)) ?? [];
}

export async function saveCourses(courses: Course[]): Promise<void> {
  await set(KEY_COURSES, courses);
}

export async function addCourse(course: Course): Promise<void> {
  const courses = await getCourses();
  await saveCourses([...courses, course]);
}

export async function updateCourse(updated: Course): Promise<void> {
  const courses = await getCourses();
  await saveCourses(courses.map((c) => (c.id === updated.id ? updated : c)));
}

export async function deleteCourse(id: string): Promise<void> {
  const courses = await getCourses();
  await saveCourses(courses.filter((c) => c.id !== id));
}

export async function getCoursesBySkillId(skillId: string): Promise<Course[]> {
  const courses = await getCourses();
  return courses.filter((c) => c.linkedSkillId === skillId);
}

// ── Course Log Entries ─────────────────────────────────────────────────────────

const KEY_COURSE_LOGS = 'course_logs';

export async function getCourseLogEntries(): Promise<CourseLogEntry[]> {
  return (await get<CourseLogEntry[]>(KEY_COURSE_LOGS)) ?? [];
}

export async function saveCourseLogEntries(entries: CourseLogEntry[]): Promise<void> {
  await set(KEY_COURSE_LOGS, entries);
}

export async function addCourseLogEntry(entry: CourseLogEntry): Promise<void> {
  const entries = await getCourseLogEntries();
  await saveCourseLogEntries([entry, ...entries]);
}

export async function getLogEntriesForCourse(courseId: string): Promise<CourseLogEntry[]> {
  const entries = await getCourseLogEntries();
  return entries.filter((e) => e.courseId === courseId);
}

export async function deleteCourseLogEntry(id: string): Promise<void> {
  const entries = await getCourseLogEntries();
  await saveCourseLogEntries(entries.filter((e) => e.id !== id));
}
