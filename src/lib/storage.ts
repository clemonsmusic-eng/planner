import type { Project, TeamMember, PhaseTemplate, ListCategory } from '../types';
import {
  DEFAULT_TEAM_MEMBERS,
  COMMUNITIES as DEFAULT_COMMUNITIES,
  PHASE_TEMPLATES as DEFAULT_PHASE_TEMPLATES,
  DEFAULT_LISTS,
} from './data';

const STORAGE_KEY_PROJECTS        = 'st-planner-projects';
const STORAGE_KEY_TEAM            = 'st-planner-team';
const STORAGE_KEY_COMMUNITIES     = 'st-planner-communities';
const STORAGE_KEY_LISTS           = 'st-planner-lists';
const STORAGE_KEY_PHASE_TEMPLATES = 'st-planner-phase-templates';

// ─── Projects ─────────────────────────────────────────────────────────────────

export function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROJECTS);
    if (!raw) return [];
    return (JSON.parse(raw) as Project[]).map(p => ({
      ...p,
      inputs: { ...p.inputs, status: p.inputs.status ?? 'active' },
    }));
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

// ─── Team Members ─────────────────────────────────────────────────────────────

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

// ─── Lists ────────────────────────────────────────────────────────────────────

export function loadLists(): ListCategory[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LISTS);
    if (raw) {
      const data = JSON.parse(raw) as ListCategory[];
      // Migrate: if stored data is the old 23-list format (missing new parameter lists), reset to defaults
      const hasParamLists = data.some(l => l.id === 'sqft-ranges' || l.id === 'pre-move-team-sizes');
      if (!hasParamLists) {
        return DEFAULT_LISTS.map(l => ({ ...l, items: [...l.items] }));
      }
      return data;
    }
  } catch {}
  return DEFAULT_LISTS.map(l => ({ ...l, items: [...l.items] }));
}

export function saveLists(lists: ListCategory[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_LISTS, JSON.stringify(lists));
  } catch (e) {
    console.error('Failed to save lists', e);
  }
}

// ─── Phase Templates ──────────────────────────────────────────────────────────

export function loadPhaseTemplates(): PhaseTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PHASE_TEMPLATES);
    if (raw) return JSON.parse(raw) as PhaseTemplate[];
  } catch {}
  return DEFAULT_PHASE_TEMPLATES.map((t) => ({ ...t }));
}

export function savePhaseTemplates(templates: PhaseTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_PHASE_TEMPLATES, JSON.stringify(templates));
  } catch (e) {
    console.error('Failed to save phase templates', e);
  }
}
