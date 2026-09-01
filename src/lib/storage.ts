import { DEFAULT_PASSCODES, type AccessLevel, type Passcodes } from './access';
import type { CrmContact, Project, TeamMember, PhaseTemplate, ListCategory, RoleType, MemberPhaseRole, AuctionAppSettings, ChecklistTemplateSection, SupplyItem, ShiftTimeSettings, ServiceCategory } from '../types';
import {
  DEFAULT_TEAM_MEMBERS,
  COMMUNITIES as DEFAULT_COMMUNITIES,
  PHASE_TEMPLATES as DEFAULT_PHASE_TEMPLATES,
  DEFAULT_LISTS,
  SERVICE_CATALOG,
} from './data';
import { DEFAULT_CHECKLIST_TEMPLATE } from './checklistData';
import { normalizeChecklist } from './checklist';
import { DEFAULT_SUPPLIES, DEFAULT_SUPPLY_CATEGORIES, normalizeSupplies, normalizeCategories } from './supplies';
import { normalizePhaseBudgets } from './budgets';
import { normalizeProjectContacts } from './contacts';
import type { SettingsOrder } from './settingsLayout';

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
const STORAGE_KEY_SUPPLY_CATS      = 'st-planner-supply-categories';
const STORAGE_KEY_SHIFT_TIMES      = 'st-planner-shift-times';
const STORAGE_KEY_SETTINGS_ORDER   = 'st-planner-settings-order';
const STORAGE_KEY_SERVICES         = 'st-planner-services';
const STORAGE_KEY_ACCESS           = 'st-planner-access';
const STORAGE_KEY_CRM              = 'st-planner-crm';

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
        scheduleLocked: p.inputs.scheduleLocked ?? false,
        phaseDateMoves: p.inputs.phaseDateMoves ?? [],
        auction: { ...p.inputs.auction, lotCount: p.inputs.auction?.lotCount ?? 0 },
        contractedServices: p.inputs.contractedServices ?? [],
        projectManagerId: p.inputs.projectManagerId ?? null,
        originAddress: p.inputs.originAddress ?? '',
        destinationAddress: p.inputs.destinationAddress ?? '',
        shiftNotes: p.inputs.shiftNotes ?? [],
        // Contacts were copied onto the project before they were linked to it.
        contacts: normalizeProjectContacts(p.inputs.contacts),
        // Projects budgeted before the split start empty rather than having
        // their old single figure divided up by guesswork.
        phaseBudgets: normalizePhaseBudgets(p.inputs.phaseBudgets),
      },
      // Backfill for projects saved before the checklist companion existed
      checklist: normalizeChecklist(p.checklist),
    }));
  } catch {
    return [];
  }
}

export function saveProjectsLocal(projects: Project[]): void {
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

export function saveTeamMembersLocal(members: TeamMember[]): void {
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
      // Backfill lists added after this install was first saved.
      for (const def of DEFAULT_LISTS) {
        if (!filtered.some(l => l.id === def.id)) filtered.push({ ...def, items: [...def.items] });
      }
      // Migrate: add 'None' to flexibility list if missing
      return filtered.map(l => {
        if (l.id === 'flexibility' && !l.items.includes('None')) {
          return { ...l, items: ['None', ...l.items] };
        }
        // Migrate: add 'Long Distance Move', inserted after 'Full Move' to match
        // the default ordering rather than being appended to the end.
        // Migrate: communities now live in the CRM as 'Community' entries, so
        // the contact-type list needs the type the migration files them under.
        if (l.id === 'crm-contact-type' && !l.items.includes('Community')) {
          return { ...l, items: ['Community', ...l.items] };
        }
        if (l.id === 'move-types') {
          const items = [...l.items];
          if (!items.includes('Long Distance Move')) {
            const at = items.indexOf('Full Move');
            items.splice(at >= 0 ? at + 1 : items.length, 0, 'Long Distance Move');
          }
          if (!items.includes('Inbound')) {
            const at = items.indexOf('Long Distance Move');
            items.splice(at >= 0 ? at + 1 : items.length, 0, 'Inbound');
          }
          if (items.length !== l.items.length) return { ...l, items };
        }
        return l;
      });
    }
  } catch {}
  return DEFAULT_LISTS.map(l => ({ ...l, items: [...l.items] }));
}

export function saveListsLocal(lists: ListCategory[]): void {
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

export function savePhaseTemplatesLocal(templates: PhaseTemplate[]): void {
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

export function saveAuctionSettingsLocal(settings: AuctionAppSettings): void {
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

export function saveChecklistTemplateLocal(template: ChecklistTemplateSection[]): void {
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

export function saveSuppliesLocal(supplies: SupplyItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_SUPPLIES, JSON.stringify(supplies));
  } catch (e) {
    console.error('Failed to save supplies', e);
  }
}

export function loadSupplyCategories(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SUPPLY_CATS);
    if (raw !== null) return normalizeCategories(JSON.parse(raw) as string[]);
  } catch {}
  return [...DEFAULT_SUPPLY_CATEGORIES];
}

export function saveSupplyCategoriesLocal(categories: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_SUPPLY_CATS, JSON.stringify(categories));
  } catch (e) {
    console.error('Failed to save supply categories', e);
  }
}


// ─── Shift Times ──────────────────────────────────────────────────────────────

export const DEFAULT_SHIFT_TIMES: ShiftTimeSettings = { am: '09:00', pm: '13:00' };

/** Rejects anything that isn't HH:mm so a bad save can't poison every label. */
function validTime(v: unknown, fallback: string): string {
  return typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : fallback;
}

export function loadShiftTimes(): ShiftTimeSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SHIFT_TIMES);
    if (!raw) return { ...DEFAULT_SHIFT_TIMES };
    const parsed = JSON.parse(raw) as Partial<ShiftTimeSettings>;
    return {
      am: validTime(parsed.am, DEFAULT_SHIFT_TIMES.am),
      pm: validTime(parsed.pm, DEFAULT_SHIFT_TIMES.pm),
    };
  } catch {
    return { ...DEFAULT_SHIFT_TIMES };
  }
}

export function saveShiftTimesLocal(times: ShiftTimeSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_SHIFT_TIMES, JSON.stringify(times));
  } catch (e) {
    console.error('Failed to save shift times', e);
  }
}


// ─── Settings Layout ──────────────────────────────────────────────────────────

/**
 * The order the Settings submenus are shown in. A display preference rather
 * than project data, so it stays out of AppState — only the Settings page
 * reads it.
 */
export function loadSettingsOrder(): SettingsOrder {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS_ORDER);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as SettingsOrder) : {};
  } catch {
    return {};
  }
}

export function saveSettingsOrder(order: SettingsOrder): void {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS_ORDER, JSON.stringify(order));
  } catch (e) {
    console.error('Failed to save settings order', e);
  }
}


// ─── Services Contracted ──────────────────────────────────────────────────────

export function loadServices(): ServiceCategory[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SERVICES);
    if (!raw) return SERVICE_CATALOG.map((c) => ({ ...c, services: [...c.services] }));
    const parsed = JSON.parse(raw) as ServiceCategory[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return SERVICE_CATALOG.map((c) => ({ ...c, services: [...c.services] }));
    }
    return parsed
      .filter((c) => c && typeof c.category === 'string')
      .map((c) => ({ category: c.category, services: Array.isArray(c.services) ? c.services.filter(Boolean) : [] }));
  } catch {
    return SERVICE_CATALOG.map((c) => ({ ...c, services: [...c.services] }));
  }
}

export function saveServicesLocal(services: ServiceCategory[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_SERVICES, JSON.stringify(services));
  } catch (e) {
    console.error('Failed to save services', e);
  }
}


// ─── Access level ─────────────────────────────────────────────────────────────

/**
 * The level this device is signed in at, and the passcode that guards stepping
 * up from Team Member. Kept together because they are read and written as one
 * decision, and stored on the device rather than in a project: it says who is
 * holding this phone, not anything about the work.
 */
export interface AccessState {
  level: AccessLevel;
  /** One passcode per level that can be stepped up to. */
  passcodes: Passcodes;
}

/**
 * A device that has never been set up is a Team Member.
 *
 * The most limited level is the safe default: a phone picked up off a van seat
 * shows the schedule and nothing else until someone types a passcode into it.
 */
const DEFAULT_ACCESS: AccessState = { level: 'team', passcodes: DEFAULT_PASSCODES };

export function loadAccess(): AccessState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACCESS);
    if (!raw) return DEFAULT_ACCESS;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const level = parsed.level;
    const stored = (parsed.passcodes ?? {}) as Partial<Passcodes>;
    return {
      level: level === 'admin' || level === 'pm' || level === 'team' ? level : 'team',
      passcodes: {
        // A single `passcode` is what the first version stored; it guarded
        // every step up, so it carries over as the admin one.
        admin:
          typeof stored.admin === 'string' && stored.admin
            ? stored.admin
            : typeof parsed.passcode === 'string' && parsed.passcode
            ? parsed.passcode
            : DEFAULT_PASSCODES.admin,
        pm: typeof stored.pm === 'string' && stored.pm ? stored.pm : DEFAULT_PASSCODES.pm,
      },
    };
  } catch {
    return DEFAULT_ACCESS;
  }
}

export function saveAccess(access: AccessState): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACCESS, JSON.stringify(access));
  } catch {
    /* storage full or blocked; the level simply won't persist */
  }
}


// ─── CRM ──────────────────────────────────────────────────────────────────────

/**
 * The contact book. Shared across projects rather than owned by one, which is
 * the whole point of it — the same community sales office turns up on every
 * job at that community.
 */
export function loadCrmContacts(): CrmContact[] {
  let contacts: CrmContact[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CRM);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        contacts = parsed.filter((c): c is CrmContact => !!c && typeof c.id === 'string');
      }
    }
  } catch {}
  return migrateCommunitiesIntoCrm(contacts);
}

/**
 * Fold the old Communities settings list into the contact book.
 *
 * Communities used to be a bare name list edited in Settings; they are now CRM
 * entries of type 'Community', which is also where their phone numbers and
 * sales contacts already lived. Runs once per device: names not yet in the book
 * become entries, ones already there (as any community-typed contact's company)
 * are left alone, and the flag stops a deleted community from coming back.
 */
const STORAGE_KEY_COMMUNITIES_MIGRATED = 'st-planner-communities-in-crm';
function migrateCommunitiesIntoCrm(contacts: CrmContact[]): CrmContact[] {
  try {
    if (localStorage.getItem(STORAGE_KEY_COMMUNITIES_MIGRATED)) return contacts;
    const have = new Set(
      contacts.map((c) => (c.company || c.name).trim().toLowerCase()).filter(Boolean)
    );
    const now = new Date().toISOString();
    const added = loadCommunities()
      .map((n) => n.trim())
      .filter((n) => n && !have.has(n.toLowerCase()))
      .map((name): CrmContact => ({
        id: crypto.randomUUID(),
        contactType: 'Community',
        company: name,
        name: '',
        workPhone: '',
        cellPhone: '',
        email: '',
        serviceDescription: '',
        notes: '',
        createdAt: now,
        updatedAt: now,
      }));
    const merged = added.length > 0 ? [...contacts, ...added] : contacts;
    if (added.length > 0) saveCrmContactsLocal(merged);
    localStorage.setItem(STORAGE_KEY_COMMUNITIES_MIGRATED, '1');
    return merged;
  } catch {
    return contacts;
  }
}

export function saveCrmContactsLocal(contacts: CrmContact[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CRM, JSON.stringify(contacts));
  } catch {
    /* storage full or blocked */
  }
}


// ─── Telling the sync layer what changed ─────────────────────────────────────

/**
 * Where a save goes after it has hit local storage.
 *
 * The sync engine registers itself here rather than being imported, because
 * the engine has to import this module to write a pull back down and the two
 * would otherwise depend on each other. It is also what keeps the split
 * honest: a `saveX` is a save the user made and gets queued for the server, a
 * `saveXLocal` is a save the server made and must not be echoed back to it.
 */
type SaveObserver = (key: string, after: unknown) => void;

let observer: SaveObserver | null = null;

export function observeSaves(fn: SaveObserver | null): void {
  observer = fn;
}

export const saveProjects: typeof saveProjectsLocal = (value) => {
  saveProjectsLocal(value);
  observer?.('projects', value);
};

export const saveTeamMembers: typeof saveTeamMembersLocal = (value) => {
  saveTeamMembersLocal(value);
  observer?.('teamMembers', value);
};

export const saveLists: typeof saveListsLocal = (value) => {
  saveListsLocal(value);
  observer?.('lists', value);
};

export const savePhaseTemplates: typeof savePhaseTemplatesLocal = (value) => {
  savePhaseTemplatesLocal(value);
  observer?.('phaseTemplates', value);
};

export const saveAuctionSettings: typeof saveAuctionSettingsLocal = (value) => {
  saveAuctionSettingsLocal(value);
  observer?.('appSettings', value);
};

export const saveChecklistTemplate: typeof saveChecklistTemplateLocal = (value) => {
  saveChecklistTemplateLocal(value);
  observer?.('checklistTemplate', value);
};

export const saveSupplies: typeof saveSuppliesLocal = (value) => {
  saveSuppliesLocal(value);
  observer?.('supplies', value);
};

export const saveSupplyCategories: typeof saveSupplyCategoriesLocal = (value) => {
  saveSupplyCategoriesLocal(value);
  observer?.('supplyCategories', value);
};

export const saveShiftTimes: typeof saveShiftTimesLocal = (value) => {
  saveShiftTimesLocal(value);
  observer?.('appSettings', value);
};

export const saveServices: typeof saveServicesLocal = (value) => {
  saveServicesLocal(value);
  observer?.('services', value);
};

export const saveCrmContacts: typeof saveCrmContactsLocal = (value) => {
  saveCrmContactsLocal(value);
  observer?.('crmContacts', value);
};
