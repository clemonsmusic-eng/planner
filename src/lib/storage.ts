import type { Project, TeamMember, PhaseTemplate, ListCategory, RoleType, MemberPhaseRole, AuctionAppSettings } from '../types';
import {
  DEFAULT_TEAM_MEMBERS,
  COMMUNITIES as DEFAULT_COMMUNITIES,
  PHASE_TEMPLATES as DEFAULT_PHASE_TEMPLATES,
  DEFAULT_LISTS,
} from './data';

const STORAGE_KEY_PROJECTS         = 'st-planner-projects';
const STORAGE_KEY_TEAM             = 'st-planner-team';
const STORAGE_KEY_COMMUNITIES      = 'st-planner-communities';
const STORAGE_KEY_LISTS            = 'st-planner-lists';
const STORAGE_KEY_PHASE_TEMPLATES  = 'st-planner-phase-templates';
const STORAGE_KEY_AUCTION_SETTINGS = 'st-planner-auction-settings';

// ─── Projects ─────────────────────────────────────────────────────────────────

export function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROJECTS);
    if (!raw) return [];
    return (JSON.parse(raw) as Project[]).map(p => ({
      ...p,
      inputs: {
        ...p.inputs,
        status: p.inputs.status ?? 'active',
        isLocked: p.inputs.isLocked ?? false,
        phaseDateMoves: p.inputs.phaseDateMoves ?? [],
        auction: { ...p.inputs.auction, lotCount: p.inputs.auction?.lotCount ?? 0 },
      },
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
    const ALL_PHASE_IDS = ['phase-1','phase-2','phase-3','phase-4-1','phase-4-2','phase-5-1','phase-5-2','phase-6','phase-7'] as const;
    type AnyMember = TeamMember & { roles?: string[]; shiftRoles?: Record<string, string> };

    // Migrate any stored phase role value to RoleType[] | 'N/A'
    function migrateRole(r: unknown): MemberPhaseRole {
      if (!r || r === 'N/A') return 'N/A';
      if (Array.isArray(r)) return r as RoleType[];
      if (typeof r === 'string') return [r as RoleType];
      return 'N/A';
    }

    const parsed = JSON.parse(raw) as AnyMember[];
    return parsed.map((m) => {
      // Backfill minHoursPerWeek and experience for records saved before these fields existed
      let member: AnyMember = {
        ...m,
        minHoursPerWeek: m.minHoursPerWeek ?? 0,
        experience: m.experience ?? { packAndSort: 'Average', cleanout: 'Average' },
        timeOff: m.timeOff ?? [],
      };
      // Migrate to phaseRoles if missing (from shiftRoles or old roles[])
      if (!member.phaseRoles) {
        let primary: RoleType = 'Specialist';
        if (m.shiftRoles) {
          primary = (m.shiftRoles['Full Day'] ?? m.shiftRoles['AM'] ?? 'Specialist') as RoleType;
        } else if (m.roles && m.roles.length > 0) {
          primary = m.roles[0] as RoleType;
        }
        const phaseRoles = Object.fromEntries(ALL_PHASE_IDS.map(id => [id, [primary]])) as TeamMember['phaseRoles'];
        member = { ...member, phaseRoles };
      } else {
        // Migrate existing phaseRoles: any string values → RoleType[]
        const migratedRoles = Object.fromEntries(
          ALL_PHASE_IDS.map(id => [id, migrateRole((member.phaseRoles as Record<string, unknown>)[id])])
        ) as TeamMember['phaseRoles'];
        member = { ...member, phaseRoles: migratedRoles };
      }
      return member as TeamMember;
    });
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
      // Migrate: remove density list if present
      const filtered = data.filter(l => l.id !== 'density');
      // Migrate: add 'None' to flexibility list if missing
      return filtered.map(l => {
        if (l.id === 'flexibility' && !l.items.includes('None')) {
          return { ...l, items: ['None', ...l.items] };
        }
        return l;
      });
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
    if (raw) {
      // Migrate legacy templates that used `hours`/`teamSize` single fields
      type LegacyTemplate = PhaseTemplate & { hours?: number; teamSize?: number };
      const parsed = JSON.parse(raw) as LegacyTemplate[];
      return parsed.map((t): PhaseTemplate => ({
        ...t,
        minHours: t.minHours ?? t.hours ?? 4,
        maxHours: t.maxHours ?? t.hours ?? 8,
        minTeamSize: t.minTeamSize ?? t.teamSize ?? 2,
        maxTeamSize: t.maxTeamSize ?? t.teamSize ?? 4,
      }));
    }
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

// ─── Auction Settings ─────────────────────────────────────────────────────────

const DEFAULT_AUCTION_SETTINGS: AuctionAppSettings = { hourlyRate: 95, performanceLevel: 'Average' };

export function loadAuctionSettings(): AuctionAppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUCTION_SETTINGS);
    if (raw) return { ...DEFAULT_AUCTION_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_AUCTION_SETTINGS };
}

export function saveAuctionSettings(settings: AuctionAppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_AUCTION_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save auction settings', e);
  }
}
