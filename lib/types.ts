export interface Character {
  name: string;
  avatar: string;
  dream: string;
  class: string;
  bio?: string;
  currentStreak?: number;
  lastActiveDate?: string;
  lastCheckInDate?: string;
}

export interface SkillObjective {
  id: string;
  text: string;
  isComplete: boolean;
}

export interface Skill {
  id: string;
  name: string;
  icon: string;
  masteryLevel: number; // kept for backward compat; new code uses totalXP
  totalXP?: number;     // cumulative XP — never resets. Level = floor(totalXP/100)+1
  isStrength?: boolean; // flagged via "Your Strengths" add-flow
  goal?: string;
  objectives?: SkillObjective[];
  createdAt: number;
}

export interface Project {
  id: string;
  skillId: string;
  title: string;
  description: string;
  fileBlob: Blob | null;
  fileName: string;
  fileType: string;
  createdAt: number;
}

export interface Subtask {
  id: string;
  text: string;
  isComplete: boolean;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  questType?: 'longTerm' | 'daily';
  isMainQuest: boolean;
  isComplete: boolean;
  repeatsDaily?: boolean;
  isDaily?: boolean;
  lastCompletedDate?: string;
  dueDate?: string;
  subtasks?: Subtask[];
  notes?: string;
  createdAt: number;
}

export interface QuickLink {
  id: string;
  label: string;
  url: string;
  order: number;
}

export interface Idea {
  id: string;
  content: string;
  createdAt: number;
}

export interface BossBattle {
  id: string;
  title: string;
  description: string;
  deadlineDate: string;
  isDefeated: boolean;
  createdAt: number;
}

// ── Inventory ─────────────────────────────────────────────────────────────────

export interface InventoryItem {
  id: string;
  title: string;
  description: string;
  type: 'achievement' | 'badge' | 'trophy' | 'milestone';
  imageBlob?: Blob | null;
  imageName?: string;
  imageType?: string;
  dateEarned: string; // 'YYYY-MM-DD'
  createdAt: number;
}

// ── Achievements / Challenges ─────────────────────────────────────────────────

export interface Achievement {
  id: string;
  title: string;
  description: string;
  type: 'builtin' | 'custom';
  builtinKey?: string;  // used to identify which built-in to auto-track
  targetValue: number;
  currentProgress: number;
  isComplete: boolean;
  completedAt?: number;
  createdAt: number;
}

// ── Courses ───────────────────────────────────────────────────────────────────

export interface Course {
  id: string;
  title: string;
  link: string;
  linkedSkillId: string;
  totalUnits?: number;
  completedUnits?: number;
  createdAt: number;
}

export interface CourseLogEntry {
  id: string;
  courseId: string;
  date: string; // 'YYYY-MM-DD'
  progressNote: string;
  unitsCompleted?: number;
  createdAt: number;
}
