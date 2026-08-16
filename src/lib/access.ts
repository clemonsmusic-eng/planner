import type { TabName } from '../types';

/**
 * Who can do what.
 *
 * Three levels, chosen on the device and remembered there. Be clear about what
 * this is: the app has no login and its data lives in this browser's local
 * storage, so a level is a working mode, not a security boundary — anyone with
 * the device and the will can change it. What it does buy is that a crew phone
 * left signed in at Team Member cannot wander into Settings and rewrite the
 * phase templates, or edit a plan that has been agreed. A passcode, when an
 * admin sets one, makes stepping up deliberate rather than accidental.
 */

export type AccessLevel = 'admin' | 'pm' | 'team';

export const ACCESS_LEVELS: { level: AccessLevel; label: string; blurb: string }[] = [
  { level: 'admin', label: 'Admin', blurb: 'Everything, including Settings and deleting projects' },
  { level: 'pm', label: 'Project Manager', blurb: 'Create and run projects; no Settings' },
  { level: 'team', label: 'Team Member', blurb: 'View the calendar, schedule and plan; no edits' },
];

export const ACCESS_LABELS: Record<AccessLevel, string> = {
  admin: 'Admin',
  pm: 'Project Manager',
  team: 'Team Member',
};

/**
 * What a level is allowed to do.
 *
 * Named for the action rather than the screen, so a capability can be checked
 * wherever the action is offered instead of each page re-deriving the rules.
 */
export type Capability =
  /** Open Settings at all. */
  | 'settings'
  /** Create, edit and delete projects, and edit the Input tab. */
  | 'editProjects'
  /** Remove a project outright. */
  | 'deleteProjects'
  /** Generate, edit, lock or import into a schedule. */
  | 'editSchedule'
  /** Tick checklist items and edit the shared documents. */
  | 'editDocuments'
  /** Export and import files. */
  | 'exportFiles'
  | 'importFiles';

const MATRIX: Record<AccessLevel, Capability[]> = {
  admin: [
    'settings',
    'editProjects',
    'deleteProjects',
    'editSchedule',
    'editDocuments',
    'exportFiles',
    'importFiles',
  ],
  // A PM runs jobs but does not shape the system they run in: the team roster,
  // phase templates and rates behind every project stay with an admin.
  pm: ['editProjects', 'editSchedule', 'editDocuments', 'exportFiles', 'importFiles'],
  // Read-only, plus the ability to take a copy of what they are working from.
  team: ['exportFiles'],
};

export function can(level: AccessLevel, capability: Capability): boolean {
  return MATRIX[level].includes(capability);
}

/** Tabs a level may open. Everything not listed is hidden and unreachable. */
const HIDDEN_TABS: Record<AccessLevel, TabName[]> = {
  admin: [],
  pm: ['settings'],
  // A Team Member gets the calendar, the schedule and the plan, and nothing
  // else — the level was defined by what it can see, not by what it can edit.
  team: [
    'settings',
    'inputs',
    'projects',
    'supplies',
    'checklist',
    'furniture',
    'floorplans',
    'photos',
    'project-supplies',
  ],
};

export function canOpenTab(level: AccessLevel, tab: TabName): boolean {
  return !HIDDEN_TABS[level].includes(tab);
}

/** Where a level lands when the tab it was on is no longer open to it. */
export function fallbackTab(level: AccessLevel): TabName {
  return level === 'team' ? 'calendar' : 'home';
}
