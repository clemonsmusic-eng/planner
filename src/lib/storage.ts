import type { Project, TeamMember, PhaseTemplate, ListCategory, RoleType, MemberPhaseRole, AuctionAppSettings, ChecklistTemplateSection, SupplyItem } from '../types';
import {
  DEFAULT_TEAM_MEMBERS,
  COMMUNITIES as DEFAULT_COMMUNITIES,
  PHASE_TEMPLATES as DEFAULT_PHASE_TEMPLATES,
  DEFAULT_LISTS,
} from './data';
import { DEFAULT_CHECKLIST_TEMPLATE } from './checklistData';
import { normalizeChecklist } from './checklist';
import { DEFAULT_SUPPLIES, normalizeSupplies } from './supplies';

const STORAGE_KEY_PROJECTS         = 'st-planner-projects';
const STORAGE_KEY_TEAM             = 'st-planner-team';
const STORAGE_KEY_COMMUNITIES      = 'st-planner-communities';
const STORAGE_KEY_LISTS            = 'st-planner-lists';
const STORAGE_KEY_PHASE_TEMPLATES  = 'st-planner-phase-templates';
const STORAGE_KEY_AUCTION_SETTINGS = 'st-planner-auction-settings';
// v3 = the revised PM Checklist (Client/Community visit split, reordered
// sections, MaxSold). Bumping the key retires the stored copy so existing
// installs pick up the new order instead of the one they cached. Per-project
// progress lives on the project and is keyed by item id, so it survives.
const STORAGE_KEY_CHECKLIST        = 'st-planner-checklist-template-v3';
const STORAGE_KEY_SUPPLIES         = 'st-planner-supplies';

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
        contractedServices: p.inputs.contractedServices ?? [],
      },
      // Backfill for projects saved before the checklist companion existed
      checklist: normalizeChecklist(p.checklist),
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
    const ALL_PHASE_IDS = ['phase-1','phase-2','phase-3','phase-4-1','phase-4-2','phase-5-1','phase-5-2','phase-6','phase-lot-prep','phase-pickup-prep','phase-7'] as const;
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
          const existingRoles = member.phaseRoles as Record<string, unknown>;
        // Migrate 'phase-auction-prep' → 'phase-lot-prep'
        if (!existingRoles['phase-lot-prep']) {
          existingRoles['phase-lot-prep'] = existingRoles['phase-auction-prep'] ?? existingRoles['phase-6'] ?? ['Specialist'];
        }
        // Backfill 'phase-pickup-prep' if missing
        if (!existingRoles['phase-pickup-prep']) {
          existingRoles['phase-pickup-prep'] = existingRoles['phase-6'] ?? ['Specialist'];
        }
        const migratedRoles = Object.fromEntries(
          ALL_PHASE_IDS.map(id => [id, migrateRole(existingRoles[id])])
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
      // Migrate: if stored data is the old 23-list format (missing the shift hours
      // list the scheduler reads), reset to defaults
      if (!data.some(l => l.id === 'shift-type-hours')) {
        return DEFAULT_LISTS.map(l => ({ ...l, items: [...l.items] }));
      }
      // Migrate: drop the density list and the retired sq ft → team size tables
      const filtered = data.filter(
        l => !['density', 'sqft-ranges', 'pre-move-team-sizes', 'move-day-team-sizes'].includes(l.id)
      );
      // Migrate: add 'None' to flexibility list if missing
      return filtered.map(l => {
        if (l.id === 'flexibility' && !l.items.includes('None')) {
          return { ...l, items: ['None', ...l.items] };
        }
        // Migrate: add 'Long Distance Move', inserted after 'Full Move' to match
        // the default ordering rather than being appended to the end.
        if (l.id === 'move-types' && !l.items.includes('Long Distance Move')) {
          const at = l.items.indexOf('Full Move');
          const items = [...l.items];
          items.splice(at >= 0 ? at + 1 : items.length, 0, 'Long Distance Move');
          return { ...l, items };
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
      let migrated = parsed.map((t): PhaseTemplate => ({
        ...t,
        minHours: t.minHours ?? t.hours ?? 4,
        maxHours: t.maxHours ?? t.hours ?? 8,
        minTeamSize: t.minTeamSize ?? t.teamSize ?? 2,
        maxTeamSize: t.maxTeamSize ?? t.teamSize ?? 4,
      }));
      // Rename 'phase-auction-prep' → 'phase-lot-prep' in stored templates
      migrated = migrated.map(t => t.id === 'phase-auction-prep' ? { ...t, id: 'phase-lot-prep', name: 'Lot Prep' } : t);
      // Backfill 'phase-lot-prep' template if still missing
      if (!migrated.some(t => t.id === 'phase-lot-prep')) {
        const def = DEFAULT_PHASE_TEMPLATES.find(t => t.id === 'phase-lot-prep');
        if (def) migrated = [...migrated, { ...def }];
      }
      // Backfill 'phase-pickup-prep' template if missing
      if (!migrated.some(t => t.id === 'phase-pickup-prep')) {
        const def = DEFAULT_PHASE_TEMPLATES.find(t => t.id === 'phase-pickup-prep');
        if (def) migrated = [...migrated, { ...def }];
      }
      return migrated;
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

// ─── Checklist Template ───────────────────────────────────────────────────────

function cloneChecklistTemplate(template: ChecklistTemplateSection[]): ChecklistTemplateSection[] {
  return template.map((s) => ({ ...s, items: s.items.map((i) => ({ ...i })) }));
}

export function loadChecklistTemplate(): ChecklistTemplateSection[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CHECKLIST);
    if (raw) {
      const parsed = JSON.parse(raw) as ChecklistTemplateSection[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((s, i) => ({
          ...s,
          order: s.order ?? i + 1,
          items: (s.items ?? []).map((item) => ({
            ...item,
            offsetDays: item.offsetDays ?? 0,
            offsetMode: item.offsetMode ?? 'calendar',
            owner: item.owner ?? 'PM',
          })),
        }));
      }
    }
  } catch {}
  return cloneChecklistTemplate(DEFAULT_CHECKLIST_TEMPLATE);
}

export function saveChecklistTemplate(template: ChecklistTemplateSection[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CHECKLIST, JSON.stringify(template));
  } catch (e) {
    console.error('Failed to save checklist template', e);
  }
}

// ─── Supplies ─────────────────────────────────────────────────────────────────

export function loadSupplies(): SupplyItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SUPPLIES);
    // An empty stored list is a real state — the Director may have cleared it —
    // so only a missing key falls back to the defaults.
    if (raw !== null) return normalizeSupplies(JSON.parse(raw) as SupplyItem[]).filter(Boolean);
  } catch {}
  return DEFAULT_SUPPLIES.map((s) => ({ ...s }));
}

export function saveSupplies(supplies: SupplyItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_SUPPLIES, JSON.stringify(supplies));
  } catch (e) {
    console.error('Failed to save supplies', e);
  }
}
