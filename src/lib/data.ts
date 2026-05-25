import type { TeamMember, PhaseTemplate, RoleType } from '../types';

// ─── Team Members ─────────────────────────────────────────────────────────────
export const DEFAULT_TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'gabe',
    name: 'Gabe',
    roles: ['PM', 'Lead'],
    availability: { Mon: 'Full Day', Tue: 'Full Day', Wed: 'Full Day', Thu: 'Full Day', Fri: 'Full Day', Sat: 'Unavailable', Sun: 'Unavailable' },
    maxHoursPerWeek: 40,
    isPriority: true,
  },
  {
    id: 'reicse',
    name: 'Reicse',
    roles: ['Specialist'],
    availability: { Mon: 'PM', Tue: 'Full Day', Wed: 'PM', Thu: 'Full Day', Fri: 'Unavailable', Sat: 'Unavailable', Sun: 'Unavailable' },
    maxHoursPerWeek: 30,
    isPriority: true,
  },
  {
    id: 'cheryl',
    name: 'Cheryl',
    roles: ['Specialist', 'Lead'],
    availability: { Mon: 'Full Day', Tue: 'Full Day', Wed: 'Full Day', Thu: 'Unavailable', Fri: 'Unavailable', Sat: 'Unavailable', Sun: 'Unavailable' },
    maxHoursPerWeek: 20,
    isPriority: true,
  },
  {
    id: 'peyton',
    name: 'Peyton',
    roles: ['Specialist'],
    availability: { Mon: 'Full Day', Tue: 'Full Day', Wed: 'Full Day', Thu: 'Full Day', Fri: 'Full Day', Sat: 'Unavailable', Sun: 'Unavailable' },
    maxHoursPerWeek: 25,
    isPriority: true,
  },
  {
    id: 'autumn',
    name: 'Autumn',
    roles: ['Specialist', 'Lead', 'Mover'],
    availability: { Mon: 'PM', Tue: 'Unavailable', Wed: 'PM', Thu: 'Unavailable', Fri: 'PM', Sat: 'Unavailable', Sun: 'Unavailable' },
    maxHoursPerWeek: 20,
    isPriority: true,
  },
  {
    id: 'sofia',
    name: 'Sofia',
    roles: ['Specialist'],
    availability: { Mon: 'Full Day', Tue: 'Unavailable', Wed: 'Full Day', Thu: 'Unavailable', Fri: 'Full Day', Sat: 'Unavailable', Sun: 'Unavailable' },
    maxHoursPerWeek: 25,
    isPriority: true,
  },
  {
    id: 'glen',
    name: 'Glen',
    roles: ['Specialist', 'Assist PM'],
    availability: { Mon: 'Full Day', Tue: 'Full Day', Wed: 'Full Day', Thu: 'Full Day', Fri: 'Full Day', Sat: 'Unavailable', Sun: 'Unavailable' },
    maxHoursPerWeek: 0,
    isPriority: false,
  },
  {
    id: 'tilson',
    name: 'Tilson',
    roles: ['Specialist'],
    availability: { Mon: 'PM', Tue: 'PM', Wed: 'PM', Thu: 'PM', Fri: 'PM', Sat: 'Unavailable', Sun: 'Unavailable' },
    maxHoursPerWeek: 0,
    isPriority: false,
  },
  {
    id: 'jessica',
    name: 'Jessica',
    roles: ['Specialist'],
    availability: { Mon: 'Full Day', Tue: 'Full Day', Wed: 'Full Day', Thu: 'Full Day', Fri: 'Full Day', Sat: 'Unavailable', Sun: 'Unavailable' },
    maxHoursPerWeek: 0,
    isPriority: false,
  },
  {
    id: 'josh',
    name: 'Josh',
    roles: ['Specialist'],
    availability: { Mon: 'Full Day', Tue: 'Full Day', Wed: 'Full Day', Thu: 'Full Day', Fri: 'Full Day', Sat: 'Unavailable', Sun: 'Unavailable' },
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
    hours: 2.5,
    teamSize: 2,
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
    hours: 4,
    teamSize: 2,
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
    hours: 4,
    teamSize: 2,
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
    hours: 6,
    teamSize: 2,
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
    hours: 3,
    teamSize: 1,
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
    hours: 8,
    teamSize: 2,
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
    hours: 4,
    teamSize: 2,
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
    hours: 4,
    teamSize: 2,
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
    hours: 8,
    teamSize: 4,
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
