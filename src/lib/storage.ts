import type { Project, TeamMember } from '../types';
import { DEFAULT_TEAM_MEMBERS, COMMUNITIES as DEFAULT_COMMUNITIES } from './data';

const STORAGE_KEY_PROJECTS    = 'st-planner-projects';
const STORAGE_KEY_TEAM        = 'st-planner-team';
const STORAGE_KEY_COMMUNITIES = 'st-planner-communities';

// ─── Projects ─────────────────────────────────────────────────────────────────

export function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROJECTS);
    if (!raw) return [];
    return JSON.parse(raw) as Project[];
  } catch {
    return [];
  }
}

export function saveProjects(projects: Project[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
  } catch (e) {
    console.error('Failed to save projects', e);
  }
}

export function loadTeamMembers(): TeamMember[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TEAM);
    if (!raw) return DEFAULT_TEAM_MEMBERS;
    const parsed = JSON.parse(raw) as TeamMember[];
    // Backfill minHoursPerWeek for records saved before this field existed
    return parsed.map((m) => ({ ...m, minHoursPerWeek: m.minHoursPerWeek ?? 0 }));
  } catch {
    return DEFAULT_TEAM_MEMBERS;
  }
}

export function saveTeamMembers(members: TeamMember[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_TEAM, JSON.stringify(members));
  } catch (e) {
    console.error('Failed to save team members', e);
  }
}

// ─── Communities ──────────────────────────────────────────────────────────────

export function loadCommunities(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COMMUNITIES);
    if (raw) return JSON.parse(raw) as string[];
  } catch {}
  return [...DEFAULT_COMMUNITIES];
}

export function saveCommunities(communities: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_COMMUNITIES, JSON.stringify(communities));
  } catch (e) {
    console.error('Failed to save communities', e);
  }
}
