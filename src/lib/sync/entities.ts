import * as store from '../storage';
import type {
  AuctionAppSettings, ChecklistTemplateSection, CrmContact, ListCategory,
  PhaseTemplate, Project, ServiceCategory, ShiftTimeSettings, SupplyItem, TeamMember,
} from '../../types';

/**
 * What the app keeps, and how each piece of it looks as a database row.
 *
 * One descriptor per table, so the engine can push, pull and diff anything
 * without knowing what it is. The mapping lives here rather than in the engine
 * because it is the only part that differs between a team member and a
 * community, and the only part that has to change when a column does.
 */

export interface Entity<T = unknown> {
  /** Stable name, used in the outbox and in status messages. */
  key: string;
  table: string;
  /** Human name, for "3 projects" in the sync panel. */
  label: string;
  load: () => T[];
  /** Writes straight to local storage without enqueuing — used by a pull. */
  applyLocal: (rows: T[]) => void;
  id: (item: T) => string;
  toRow: (item: T, index: number) => Record<string, unknown>;
  fromRow: (row: Record<string, any>) => T;
  /** Whether the table carries a sort_order column to read the list back in. */
  ordered?: boolean;
  /**
   * A version to compare against the server before overwriting it. Only
   * projects carry one; reference data is edited by admins in Settings, where
   * two people racing is not the failure worth building for.
   */
  version?: (item: T) => string | undefined;
}

/** Order is carried by a column, since json arrays are what the app reorders. */
const ordered = (index: number) => ({ sort_order: index });

// ─── Projects ────────────────────────────────────────────────────────────────

const projects: Entity<Project> = {
  key: 'projects',
  table: 'projects',
  label: 'Projects',
  load: store.loadProjects,
  applyLocal: store.saveProjectsLocal,
  id: (p) => p.id,
  version: (p) => p.updatedAt,
  toRow: (p) => ({
    id: p.id,
    inputs: p.inputs,
    schedule: p.schedule,
    checklist: p.checklist ?? null,
    documents: p.documents ?? null,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  }),
  fromRow: (r) => ({
    id: r.id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    inputs: r.inputs,
    schedule: r.schedule,
    checklist: r.checklist,
    documents: r.documents,
  }),
};

// ─── Reference data ──────────────────────────────────────────────────────────

const teamMembers: Entity<TeamMember> = {
  key: 'teamMembers',
  table: 'team_members',
  label: 'Team members',
  ordered: true,
  load: store.loadTeamMembers,
  applyLocal: store.saveTeamMembersLocal,
  id: (m) => m.id,
  toRow: (m, i) => ({
    id: m.id,
    name: m.name,
    phase_roles: m.phaseRoles,
    availability: m.availability,
    min_hours_per_week: m.minHoursPerWeek,
    max_hours_per_week: m.maxHoursPerWeek,
    is_priority: m.isPriority,
    experience: m.experience ?? null,
    time_off: m.timeOff ?? [],
    ...ordered(i),
  }),
  fromRow: (r) => ({
    id: r.id,
    name: r.name,
    phaseRoles: r.phase_roles,
    availability: r.availability,
    minHoursPerWeek: Number(r.min_hours_per_week),
    maxHoursPerWeek: Number(r.max_hours_per_week),
    isPriority: r.is_priority,
    experience: r.experience ?? undefined,
    timeOff: r.time_off ?? [],
  }),
};

/*
 * A community is its name — the app stores a bare list of strings and a
 * project names its community by that string, so the name is already the key
 * everything else points at. Same for supply categories.
 */
const nameOnly = (
  key: string, table: string, label: string,
  load: () => string[], applyLocal: (v: string[]) => void
): Entity<string> => ({
  key, table, label, load, applyLocal,
  ordered: true,
  id: (name) => name,
  toRow: (name, i) => ({ id: name, name, ...ordered(i) }),
  fromRow: (r) => r.name,
});

const supplyCategories = nameOnly(
  'supplyCategories', 'supply_categories', 'Supply categories',
  store.loadSupplyCategories, store.saveSupplyCategoriesLocal);

const lists: Entity<ListCategory> = {
  key: 'lists',
  table: 'lists',
  label: 'Lists',
  ordered: true,
  load: store.loadLists,
  applyLocal: store.saveListsLocal,
  id: (l) => l.id,
  toRow: (l, i) => ({ id: l.id, name: l.name, items: l.items, ...ordered(i) }),
  fromRow: (r) => ({ id: r.id, name: r.name, items: r.items ?? [] }),
};

const phaseTemplates: Entity<PhaseTemplate> = {
  key: 'phaseTemplates',
  table: 'phase_templates',
  label: 'Phase templates',
  ordered: true,
  load: store.loadPhaseTemplates,
  applyLocal: store.savePhaseTemplatesLocal,
  id: (t) => t.id,
  toRow: (t, i) => ({
    id: t.id,
    name: t.name,
    phase_order: String(t.order ?? ''),
    min_hours: t.minHours,
    max_hours: t.maxHours,
    min_team_size: t.minTeamSize,
    max_team_size: t.maxTeamSize,
    roles: t.roles,
    shift: t.shift,
    is_am: t.isAM ?? null,
    is_pm: t.isPM ?? null,
    ...ordered(i),
  }),
  fromRow: (r) => ({
    id: r.id,
    name: r.name,
    // Written back as a number where it started as one, since the phase list
    // sorts on it and '10' < '9' as text. Decimals included: the two halves of
    // final pack are 4.1 and 4.2, and an integers-only test left them strings.
    order: /^\d+(\.\d+)?$/.test(r.phase_order ?? '')
      ? Number(r.phase_order)
      : r.phase_order ?? '',
    minHours: Number(r.min_hours),
    maxHours: Number(r.max_hours),
    minTeamSize: Number(r.min_team_size),
    maxTeamSize: Number(r.max_team_size),
    roles: r.roles ?? [],
    shift: r.shift,
    isAM: r.is_am ?? undefined,
    isPM: r.is_pm ?? undefined,
  }),
};

const services: Entity<ServiceCategory> = {
  key: 'services',
  table: 'service_categories',
  label: 'Services',
  ordered: true,
  load: store.loadServices,
  applyLocal: store.saveServicesLocal,
  // A category has no id of its own and is named uniquely, so its name is it.
  id: (s) => s.category,
  toRow: (s, i) => ({ id: s.category, category: s.category, services: s.services, ...ordered(i) }),
  fromRow: (r) => ({ category: r.category, services: r.services ?? [] }),
};

const supplies: Entity<SupplyItem> = {
  key: 'supplies',
  table: 'supply_items',
  label: 'Supplies',
  ordered: true,
  load: store.loadSupplies,
  applyLocal: store.saveSuppliesLocal,
  id: (s) => s.id,
  toRow: (s, i) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    unit: s.unit,
    description: s.description,
    stocked: s.stocked,
    cost_per_unit: s.costPerUnit,
    consumable: s.consumable,
    ...ordered(i),
  }),
  fromRow: (r) => ({
    id: r.id,
    name: r.name,
    category: r.category ?? '',
    unit: r.unit ?? '',
    description: r.description ?? '',
    stocked: Number(r.stocked),
    costPerUnit: r.cost_per_unit === null ? null : Number(r.cost_per_unit),
    consumable: r.consumable,
  }),
};

const checklistTemplate: Entity<ChecklistTemplateSection> = {
  key: 'checklistTemplate',
  table: 'checklist_sections',
  label: 'Checklist template',
  ordered: true,
  load: store.loadChecklistTemplate,
  applyLocal: store.saveChecklistTemplateLocal,
  id: (s) => s.id,
  toRow: (s, i) => ({
    id: s.id,
    name: s.name,
    description: s.description ?? null,
    move_types: s.moveTypes ?? null,
    requires: s.requires ?? null,
    items: s.items,
    sort_order: s.order ?? i,
  }),
  fromRow: (r) => ({
    id: r.id,
    name: r.name,
    order: Number(r.sort_order),
    description: r.description ?? undefined,
    moveTypes: r.move_types ?? undefined,
    requires: r.requires ?? undefined,
    items: r.items ?? [],
  }),
};

const crmContacts: Entity<CrmContact> = {
  key: 'crmContacts',
  table: 'crm_contacts',
  label: 'Contacts',
  load: store.loadCrmContacts,
  applyLocal: store.saveCrmContactsLocal,
  id: (c) => c.id,
  toRow: (c) => ({
    id: c.id,
    contact_type: c.contactType,
    company: c.company,
    name: c.name,
    work_phone: c.workPhone,
    cell_phone: c.cellPhone,
    email: c.email,
    service_description: c.serviceDescription,
    notes: c.notes,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  }),
  fromRow: (r) => ({
    id: r.id,
    contactType: r.contact_type ?? '',
    company: r.company ?? '',
    name: r.name ?? '',
    workPhone: r.work_phone ?? '',
    cellPhone: r.cell_phone ?? '',
    email: r.email ?? '',
    serviceDescription: r.service_description ?? '',
    notes: r.notes ?? '',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }),
};

/*
 * The singletons — shift times and the auction defaults — share one key/value
 * table, so they are modelled as a two-row collection keyed by setting name
 * rather than as two entities with one row each.
 */
interface Setting { key: string; value: unknown }

const appSettings: Entity<Setting> = {
  key: 'appSettings',
  table: 'app_settings',
  label: 'Settings',
  load: () => [
    { key: 'shift_times', value: store.loadShiftTimes() },
    { key: 'auction', value: store.loadAuctionSettings() },
  ],
  applyLocal: (rows) => {
    for (const row of rows) {
      if (row.key === 'shift_times') store.saveShiftTimesLocal(row.value as ShiftTimeSettings);
      if (row.key === 'auction') store.saveAuctionSettingsLocal(row.value as AuctionAppSettings);
    }
  },
  id: (s) => s.key,
  toRow: (s) => ({ key: s.key, value: s.value }),
  fromRow: (r) => ({ key: r.key, value: r.value }),
};

/**
 * In the order a pull applies them: everything a project refers to before the
 * projects themselves, so a half-finished sync never shows a job whose
 * community or phase names have not arrived.
 */
export const ENTITIES: Entity<any>[] = [
  teamMembers,
  lists,
  phaseTemplates,
  services,
  supplyCategories,
  supplies,
  checklistTemplate,
  appSettings,
  crmContacts,
  projects,
];

export const entityByKey = new Map(ENTITIES.map((e) => [e.key, e]));
