/**
 * How the Settings page is organised.
 *
 * Settings grew one accordion at a time until it was a flat list of nine
 * unrelated panels, with every scheduling list buried together inside a single
 * "Variables" one. The panels are the same; this groups them, and gives each
 * list its own entry so it can be found by name.
 *
 * Order within a group is user-editable, so this file holds the default and
 * the merge that keeps a stored order valid when entries are added or removed.
 */

export type SettingsGroupKey = 'employees' | 'project' | 'projectVariables' | 'shiftVariables';

/** A `list:<id>` key renders that parameter list; anything else is a panel. */
export type SettingsSubKey = string;

export interface SettingsGroup {
  key: SettingsGroupKey;
  label: string;
  subtitle: string;
  subs: SettingsSubKey[];
}

export const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    key: 'employees',
    label: 'Employees',
    subtitle: 'Who works, what they can do, when',
    subs: ['team', 'phaseRoles', 'teamExperience', 'list:role', 'list:availability-block'],
  },
  {
    key: 'project',
    label: 'Project Settings',
    subtitle: 'What a job is made of',
    // Locations feeds the furniture inventory's from/to menus. It has no group
    // of its own in the layout brief, and it is a per-project list, so it sits
    // here rather than being dropped and losing its only editor.
    subs: ['list:move-types', 'checklist', 'auctionDefaults', 'communities', 'list:locations'],
  },
  {
    key: 'projectVariables',
    label: 'Project Variables',
    subtitle: 'Scheduling parameters',
    subs: ['list:flexibility', 'list:priority'],
  },
  {
    key: 'shiftVariables',
    label: 'Shift Variables',
    subtitle: 'How shifts are shaped and timed',
    // Task Template sets each phase's hours and base crew — the numbers behind
    // the Phase list, so it keeps that list company.
    subs: ['list:shift-type', 'shiftTimes', 'list:shift-type-hours', 'list:phase', 'templates'],
  },
];

/** Labels for the panels. Lists are labelled from the list itself. */
export const SUB_LABELS: Record<string, string> = {
  team: 'Team Members',
  phaseRoles: 'Phase Roles',
  teamExperience: 'Team Experience',
  checklist: 'Checklist Template',
  auctionDefaults: 'Auction Defaults',
  communities: 'Communities',
  shiftTimes: 'Shift Times',
  templates: 'Task Template',
  'list:move-types': 'Project Types',
};

export type SettingsOrder = Partial<Record<SettingsGroupKey, SettingsSubKey[]>>;

/**
 * The stored order, reconciled with the groups as they are now: entries that no
 * longer exist are dropped and new ones are appended, so a released change to
 * the layout can't leave a panel unreachable behind a stale saved order.
 */
export function resolveOrder(group: SettingsGroup, stored: SettingsOrder | null | undefined): SettingsSubKey[] {
  const saved = stored?.[group.key];
  if (!saved || saved.length === 0) return [...group.subs];
  const known = new Set(group.subs);
  const kept = saved.filter((k, i) => known.has(k) && saved.indexOf(k) === i);
  const missing = group.subs.filter((k) => !kept.includes(k));
  return [...kept, ...missing];
}

/** Which group a submenu belongs to, so a drag can't move it out of one. */
export function groupOfSub(sub: SettingsSubKey): SettingsGroupKey | null {
  return SETTINGS_GROUPS.find((g) => g.subs.includes(sub))?.key ?? null;
}
