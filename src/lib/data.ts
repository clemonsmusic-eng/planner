import type { TeamMember, PhaseTemplate, RoleType, MemberPhaseRoles, ListCategory } from '../types';

// Default phase roles for a standard specialist
const SPECIALIST_PHASES: MemberPhaseRoles = {
  'phase-1': ['Specialist'], 'phase-2': ['Specialist'], 'phase-3': ['Specialist'],
  'phase-4-1': ['Specialist'], 'phase-4-2': ['Specialist'],
  'phase-5-1': ['Specialist'], 'phase-5-2': ['Specialist'],
  'phase-6': ['Specialist'], 'phase-7': ['Specialist'],
};

// ─── Team Members ─────────────────────────────────────────────────────────────
export const DEFAULT_TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'gabe',
    name: 'Gabe',
    phaseRoles: {
      'phase-1': ['PM'], 'phase-2': ['PM'], 'phase-3': ['PM/Lead'],
      'phase-4-1': ['PM'], 'phase-4-2': 'N/A',
      'phase-5-1': ['PM'], 'phase-5-2': 'N/A',
      'phase-6': ['PM'], 'phase-7': ['PM'],
    },
    availability: { Mon: 'Full Day', Tue: 'Full Day', Wed: 'Full Day', Thu: 'Full Day', Fri: 'Full Day', Sat: 'Unavailable', Sun: 'Unavailable' },
    minHoursPerWeek: 0,
    maxHoursPerWeek: 40,
    isPriority: true,
  },
  {
    id: 'reicse',
    name: 'Reicse',
    phaseRoles: { ...SPECIALIST_PHASES },
    availability: { Mon: 'PM', Tue: 'Full Day', Wed: 'PM', Thu: 'Full Day', Fri: 'Unavailable', Sat: 'Unavailable', Sun: 'Unavailable' },
    minHoursPerWeek: 0,
    maxHoursPerWeek: 30,
    isPriority: true,
  },
  {
    id: 'cheryl',
    name: 'Cheryl',
    phaseRoles: {
      'phase-1': ['Lead'], 'phase-2': ['Lead'], 'phase-3': ['Lead'],
      'phase-4-1': 'N/A', 'phase-4-2': ['Specialist'],
      'phase-5-1': 'N/A', 'phase-5-2': ['Specialist'],
      'phase-6': ['Lead'], 'phase-7': ['Lead'],
    },
    availability: { Mon: 'Full Day', Tue: 'Full Day', Wed: 'Full Day', Thu: 'Unavailable', Fri: 'Unavailable', Sat: 'Unavailable', Sun: 'Unavailable' },
    minHoursPerWeek: 0,
    maxHoursPerWeek: 20,
    isPriority: true,
  },
  {
    id: 'peyton',
    name: 'Peyton',
    phaseRoles: { ...SPECIALIST_PHASES },
    availability: { Mon: 'Full Day', Tue: 'Full Day', Wed: 'Full Day', Thu: 'Full Day', Fri: 'Full Day', Sat: 'Unavailable', Sun: 'Unavailable' },
    minHoursPerWeek: 0,
    maxHoursPerWeek: 25,
    isPriority: true,
  },
  {
    id: 'autumn',
    name: 'Autumn',
    phaseRoles: {
      'phase-1': 'N/A', 'phase-2': 'N/A', 'phase-3': ['Specialist'],
      'phase-4-1': 'N/A', 'phase-4-2': ['Specialist'],
      'phase-5-1': 'N/A', 'phase-5-2': ['Specialist'],
      'phase-6': ['Specialist'], 'phase-7': ['Specialist'],
    },
    availability: { Mon: 'PM', Tue: 'Unavailable', Wed: 'PM', Thu: 'Unavailable', Fri: 'PM', Sat: 'Unavailable', Sun: 'Unavailable' },
    minHoursPerWeek: 0,
    maxHoursPerWeek: 20,
    isPriority: true,
  },
  {
    id: 'sofia',
    name: 'Sofia',
    phaseRoles: { ...SPECIALIST_PHASES },
    availability: { Mon: 'Full Day', Tue: 'Unavailable', Wed: 'Full Day', Thu: 'Unavailable', Fri: 'Full Day', Sat: 'Unavailable', Sun: 'Unavailable' },
    minHoursPerWeek: 0,
    maxHoursPerWeek: 25,
    isPriority: true,
  },
  {
    id: 'glen',
    name: 'Glen',
    phaseRoles: {
      'phase-1': ['Specialist'], 'phase-2': ['Specialist'], 'phase-3': ['Specialist'],
      'phase-4-1': ['Assist PM'], 'phase-4-2': 'N/A',
      'phase-5-1': ['Assist PM'], 'phase-5-2': 'N/A',
      'phase-6': ['Specialist'], 'phase-7': ['Specialist'],
    },
    availability: { Mon: 'Full Day', Tue: 'Full Day', Wed: 'Full Day', Thu: 'Full Day', Fri: 'Full Day', Sat: 'Unavailable', Sun: 'Unavailable' },
    minHoursPerWeek: 0,
    maxHoursPerWeek: 0,
    isPriority: false,
  },
  {
    id: 'tilson',
    name: 'Tilson',
    phaseRoles: {
      'phase-1': 'N/A', 'phase-2': 'N/A', 'phase-3': ['Specialist'],
      'phase-4-1': 'N/A', 'phase-4-2': ['Specialist'],
      'phase-5-1': 'N/A', 'phase-5-2': ['Specialist'],
      'phase-6': ['Specialist'], 'phase-7': ['Specialist'],
    },
    availability: { Mon: 'PM', Tue: 'PM', Wed: 'PM', Thu: 'PM', Fri: 'PM', Sat: 'Unavailable', Sun: 'Unavailable' },
    minHoursPerWeek: 0,
    maxHoursPerWeek: 0,
    isPriority: false,
  },
  {
    id: 'jessica',
    name: 'Jessica',
    phaseRoles: { ...SPECIALIST_PHASES },
    availability: { Mon: 'Full Day', Tue: 'Full Day', Wed: 'Full Day', Thu: 'Full Day', Fri: 'Full Day', Sat: 'Unavailable', Sun: 'Unavailable' },
    minHoursPerWeek: 0,
    maxHoursPerWeek: 0,
    isPriority: false,
  },
  {
    id: 'josh',
    name: 'Josh',
    phaseRoles: { ...SPECIALIST_PHASES },
    availability: { Mon: 'Full Day', Tue: 'Full Day', Wed: 'Full Day', Thu: 'Full Day', Fri: 'Full Day', Sat: 'Unavailable', Sun: 'Unavailable' },
    minHoursPerWeek: 0,
    maxHoursPerWeek: 0,
    isPriority: false,
  },
];

// ─── Phase Templates ──────────────────────────────────────────────────────────
export const PHASE_TEMPLATES: PhaseTemplate[] = [
  {
    id: 'phase-1',
    order: 1,
    name: 'First Visit: Planning',
    minHours: 2,
    maxHours: 3,
    minTeamSize: 2,
    maxTeamSize: 2,
    roles: [
      { role: 'PM', isLocked: true },
      { role: 'Specialist' },
    ],
    shift: 'client-pref',
  },
  {
    id: 'phase-2',
    order: 2,
    name: 'Second Visit: Initial Sort & Pack',
    minHours: 3,
    maxHours: 5,
    minTeamSize: 2,
    maxTeamSize: 2,
    roles: [
      { role: 'PM', isLocked: true },
      { role: 'Specialist' },
    ],
    shift: 'client-pref',
  },
  {
    id: 'phase-3',
    order: 3,
    name: 'Sort and Pack',
    minHours: 4,
    maxHours: 8,
    minTeamSize: 2,
    maxTeamSize: 5,
    roles: [
      { role: 'PM/Lead', isLocked: false },
      { role: 'Specialist' },
    ],
    shift: 'client-pref',
  },
  {
    id: 'phase-4-1',
    order: 4.1,
    name: 'AM Final Pack & Pre-Move',
    minHours: 4,
    maxHours: 8,
    minTeamSize: 2,
    maxTeamSize: 2,
    roles: [
      { role: 'PM', isLocked: true },
      { role: 'Assist PM', isLocked: true },
    ],
    shift: 'AM',
    isAM: true,
  },
  {
    id: 'phase-4-2',
    order: 4.2,
    name: 'PM Final Pack & Pre-Move',
    minHours: 2,
    maxHours: 4,
    minTeamSize: 1,
    maxTeamSize: 4,
    roles: [
      { role: 'Specialist' },
    ],
    shift: 'PM',
    isPM: true,
  },
  {
    id: 'phase-5-1',
    order: 5.1,
    name: 'AM Move Day',
    minHours: 6,
    maxHours: 10,
    minTeamSize: 2,
    maxTeamSize: 2,
    roles: [
      { role: 'PM', isLocked: true },
      { role: 'Assist PM', isLocked: true },
    ],
    shift: '8am-move-day',
    isAM: true,
  },
  {
    id: 'phase-5-2',
    order: 5.2,
    name: 'PM Move Day',
    minHours: 3,
    maxHours: 6,
    minTeamSize: 1,
    maxTeamSize: 8,
    roles: [
      { role: 'Specialist' },
      { role: 'Specialist' },
    ],
    shift: 'PM',
    isPM: true,
  },
  {
    id: 'phase-6',
    order: 6,
    name: 'Cleanout',
    minHours: 3,
    maxHours: 6,
    minTeamSize: 2,
    maxTeamSize: 4,
    roles: [
      { role: 'PM', isLocked: true },
      { role: 'Specialist' },
    ],
    shift: 'client-pref',
  },
  {
    id: 'phase-7',
    order: 7,
    name: 'Pickup Day',
    minHours: 6,
    maxHours: 10,
    minTeamSize: 2,
    maxTeamSize: 6,
    roles: [
      { role: 'PM', isLocked: true },
      { role: 'Specialist' },
      { role: 'Specialist' },
      { role: 'Specialist' },
    ],
    shift: 'client-pref',
  },
];

// ─── Square Footage Tables ────────────────────────────────────────────────────
export function getPackSortTeamSize(originSqFt: number): number {
  if (originSqFt <= 1200) return 2;
  if (originSqFt <= 1500) return 3;
  if (originSqFt <= 2001) return 4;
  return 5;
}

export function getPreMoveTeamSize(destSqFt: number): number {
  if (destSqFt <= 400) return 2;
  if (destSqFt <= 600) return 2;
  if (destSqFt <= 800) return 3;
  if (destSqFt <= 1000) return 4;
  if (destSqFt <= 1200) return 5;
  if (destSqFt <= 1500) return 6;
  if (destSqFt <= 1800) return 6;
  return 6;
}

export function getMoveDayTeamSize(destSqFt: number): number {
  if (destSqFt <= 400) return 2;
  if (destSqFt <= 600) return 3;
  if (destSqFt <= 800) return 4;
  if (destSqFt <= 1000) return 5;
  if (destSqFt <= 1200) return 6;
  if (destSqFt <= 1500) return 7;
  if (destSqFt <= 1800) return 8;
  return 10;
}

export type DensityLevel = 'Light' | 'Moderate' | 'Heavy';

export function getDensityMultiplier(density: DensityLevel): number {
  switch (density) {
    case 'Light': return 1.0;
    case 'Moderate': return 1.25;
    case 'Heavy': return 1.5;
  }
}

// ─── Default Lists ────────────────────────────────────────────────────────────
// These 12 lists define the scheduling parameters and dropdown options.
// Lists 10–12 use "maxSqFt:teamSize" format; list 9 uses "ShiftName=hours".
export const DEFAULT_LISTS: ListCategory[] = [
  { id: 'move-types',          name: 'Move Types',          items: ['Full Move', 'Emergency Move', 'Downsize Only', 'Cleanout', 'Pack Only'] },
  { id: 'flexibility',         name: 'Flexibility',         items: ['None', 'Low', 'Medium', 'High'] },
  { id: 'shift-type',          name: 'Shift Type',          items: ['AM', 'PM', 'Full Day'] },
  { id: 'role',                name: 'Role',                items: ['PM', 'Assist PM', 'Lead', 'PM/Lead', 'Specialist', 'Mover'] },
  { id: 'phase',               name: 'Phase',               items: ['First Visit: Planning', 'Second Visit: Initial Sort & Pack', 'Sort and Pack', 'AM Final Pack & Pre-Move', 'PM Final Pack & Pre-Move', 'AM Move Day', 'PM Move Day', 'Cleanout', 'Pickup Day'] },
  { id: 'priority',            name: 'Priority',            items: ['Urgent', 'High', 'Medium', 'Low'] },
  { id: 'availability-block',  name: 'Availability Block',  items: ['Full Day', 'AM', 'PM', 'Unavailable'] },
  // Shift Type Hours: "ShiftName=hours" — used as sort-phase hour default per person
  { id: 'shift-type-hours',    name: 'Shift Type Hours',    items: ['AM=4', 'PM=4', 'Full Day=8'] },
  // Team size tables: "maxSqFt:teamSize" — drives scheduler (9999 = "any above")
  { id: 'sqft-ranges',         name: 'Square Foot Ranges',  items: ['1200:2', '1500:3', '2001:4', '9999:5'] },
  { id: 'pre-move-team-sizes', name: 'Pre-Move Team Sizes', items: ['400:2', '600:2', '800:3', '1000:4', '1200:5', '1500:6', '9999:6'] },
  { id: 'move-day-team-sizes', name: 'Move Day Team Sizes', items: ['400:2', '600:3', '800:4', '1000:5', '1200:6', '1500:7', '1800:8', '9999:10'] },
];

// ─── Team size table utilities ────────────────────────────────────────────────

export function parseTeamSizeTable(items: string[]): Array<{ maxSqft: number; teamSize: number }> {
  return items
    .map(item => {
      const [a, b] = item.split(':');
      const maxSqft = parseInt(a ?? '', 10);
      const teamSize = parseInt(b ?? '', 10);
      if (isNaN(maxSqft) || isNaN(teamSize)) return null;
      return { maxSqft, teamSize };
    })
    .filter((r): r is { maxSqft: number; teamSize: number } => r !== null)
    .sort((a, b) => a.maxSqft - b.maxSqft);
}

export function lookupTeamSize(sqFt: number, table: Array<{ maxSqft: number; teamSize: number }>): number {
  for (const row of table) {
    if (sqFt <= row.maxSqft) return row.teamSize;
  }
  return table.length > 0 ? table[table.length - 1].teamSize : 2;
}

// ─── Communities ──────────────────────────────────────────────────────────────
export const COMMUNITIES: string[] = [
  'Atlantic Shores',
  'Bickford of Virginia Beach',
  'Bickford of Chesapeake',
  'Bickford of Suffolk',
  'Brookdale',
  'Discovery Commons',
  'First Colonial Inn',
  'Harmony @ Independence',
  'Hampton Manor',
  'Lighthouse Pointe by Barclay House',
  'The Vero',
  'VB Opus',
];

// ─── Move Types ───────────────────────────────────────────────────────────────
export const MOVE_TYPES: string[] = [
  'Full Move',
  'Emergency Move',
  'Downsize Only',
  'Cleanout',
  'Pack Only',
];

// ─── Role helpers ─────────────────────────────────────────────────────────────
export const ALL_ROLES: RoleType[] = ['PM', 'Lead', 'PM/Lead', 'Specialist', 'Assist PM', 'Mover'];

// Roles that qualify for each phase role slot
export function getRoleQualifiers(role: RoleType): RoleType[] {
  switch (role) {
    case 'PM': return ['PM'];
    case 'Lead': return ['PM', 'Lead'];
    case 'PM/Lead': return ['PM', 'Lead'];
    case 'Specialist': return ['PM', 'Lead', 'PM/Lead', 'Specialist', 'Assist PM', 'Mover'];
    case 'Assist PM': return ['Assist PM', 'PM'];
    case 'Mover': return ['Mover', 'Specialist'];
    default: return [role];
  }
}
