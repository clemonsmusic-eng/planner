import type { TeamMember, PhaseTemplate, RoleType, MemberPhaseRoles, ListCategory } from '../types';

// Default phase roles for a standard specialist
const SPECIALIST_PHASES: MemberPhaseRoles = {
  'phase-1': ['Specialist'], 'phase-2': ['Specialist'], 'phase-3': ['Specialist'],
  'phase-4-1': ['Specialist'], 'phase-4-2': ['Specialist'],
  'phase-5-1': ['Specialist'], 'phase-5-2': ['Specialist'],
  'phase-6': ['Specialist'], 'phase-lot-prep': ['Specialist'], 'phase-pickup-prep': ['Specialist'], 'phase-7': ['Specialist'],
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
      'phase-6': ['PM'], 'phase-lot-prep': ['PM'], 'phase-pickup-prep': ['PM'], 'phase-7': ['PM'],
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
      'phase-6': ['Lead'], 'phase-lot-prep': ['Lead'], 'phase-pickup-prep': ['Lead'], 'phase-7': ['Lead'],
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
      'phase-6': ['Specialist'], 'phase-lot-prep': ['Specialist'], 'phase-pickup-prep': ['Specialist'], 'phase-7': ['Specialist'],
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
      'phase-6': ['Specialist'], 'phase-lot-prep': ['Specialist'], 'phase-pickup-prep': ['Specialist'], 'phase-7': ['Specialist'],
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
      'phase-6': ['Specialist'], 'phase-lot-prep': ['Specialist'], 'phase-pickup-prep': ['Specialist'], 'phase-7': ['Specialist'],
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
    minTeamSize: 2,
    maxTeamSize: 4,
    roles: [
      { role: 'Specialist' },
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
    minTeamSize: 2,
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
    id: 'phase-lot-prep',
    order: 6.5,
    name: 'Lot Prep',
    minHours: 3,
    maxHours: 6,
    minTeamSize: 2,
    maxTeamSize: 4,
    roles: [
      { role: 'PM', isLocked: true },
      { role: 'Specialist' },
      { role: 'Specialist' },
    ],
    shift: 'client-pref',
  },
  {
    id: 'phase-pickup-prep',
    order: 6.8,
    name: 'Pickup Prep Day',
    minHours: 3,
    maxHours: 6,
    minTeamSize: 2,
    maxTeamSize: 4,
    roles: [
      { role: 'PM', isLocked: true },
      { role: 'Specialist' },
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

export type DensityLevel = 'Light' | 'Moderate' | 'Heavy';

export function getDensityMultiplier(density: DensityLevel): number {
  switch (density) {
    case 'Light': return 1.0;
    case 'Moderate': return 1.25;
    case 'Heavy': return 1.5;
  }
}

// ─── Default Lists ────────────────────────────────────────────────────────────
// These lists define the scheduling parameters and dropdown options.
// 'shift-type-hours' uses "ShiftName=hours"; the rest are plain dropdown values.
// Crew sizes are not listed here — every phase starts from its template team size
// and is adjusted per shift on the Schedule tab.
export const DEFAULT_LISTS: ListCategory[] = [
  { id: 'move-types',          name: 'Move Types',          items: ['Full Move', 'Long Distance Move', 'Emergency Move', 'Downsize Only', 'Cleanout', 'Pack Only'] },
  { id: 'flexibility',         name: 'Flexibility',         items: ['None', 'Low', 'Medium', 'High'] },
  { id: 'shift-type',          name: 'Shift Type',          items: ['AM', 'PM', 'Full Day'] },
  { id: 'role',                name: 'Role',                items: ['PM', 'Assist PM', 'Lead', 'PM/Lead', 'Specialist', 'Mover'] },
  { id: 'phase',               name: 'Phase',               items: ['First Visit: Planning', 'Second Visit: Initial Sort & Pack', 'Sort and Pack', 'AM Final Pack & Pre-Move', 'PM Final Pack & Pre-Move', 'AM Move Day', 'PM Move Day', 'Cleanout', 'Pickup Day'] },
  { id: 'priority',            name: 'Priority',            items: ['Urgent', 'High', 'Medium', 'Low'] },
  // Who a CRM entry is. Drives the Contact Type dropdown on the CRM page.
  { id: 'crm-contact-type',    name: 'CRM Contact Type',    items: ['Community Sales', 'Community Main', 'Community ED', 'Mover', 'Disposal/Removal', 'Specialized Services'] },
  { id: 'availability-block',  name: 'Availability Block',  items: ['Full Day', 'AM', 'PM', 'Unavailable'] },
  // Shift Type Hours: "ShiftName=hours" — used as sort-phase hour default per person
  { id: 'shift-type-hours',    name: 'Shift Type Hours',    items: ['AM=4', 'PM=4', 'Full Day=8'] },
  // Rooms and dispositions offered on the Furniture Inventory's origination and
  // destination fields. Covers both ends of a move plus where items go instead.
  { id: 'locations',           name: 'Locations',           items: [
    'Living Room', 'Family Room', 'Den', 'Dining Room', 'Kitchen', 'Breakfast Nook',
    'Master Bedroom', 'Bedroom 2', 'Bedroom 3', 'Guest Room', 'Office',
    'Master Bath', 'Bathroom', 'Foyer', 'Hallway', 'Laundry',
    'Basement', 'Attic', 'Garage', 'Shed', 'Patio', 'Closet', 'Storage',
    'Donation', 'Auction', 'Family', 'Dispersal', 'Trash',
  ] },
];

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
  'Long Distance Move',
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

// ─── Services Contracted ──────────────────────────────────────────────────────
// The sub-services a client can contract, grouped by service category. Selected
// values are stored on ProjectInputs.contractedServices as the sub-service label.
export const SERVICE_CATALOG: { category: string; services: string[] }[] = [
  {
    category: 'Planning the Move',
    services: [
      'Space Planning',
      'Natural State Photo Documentation',
      'Sorting and Planning Downsize of Items',
      'Document Sort',
      'Safety Inspection',
      'Change Utilities',
      'Administrative Tasks',
    ],
  },
  {
    category: 'Packing Services',
    services: [
      'Packing for a Local Move',
      'Packing for an Out of Area Move',
      'Packing for an Out of State Move',
      'Shipping to Family',
      'Packing for Dispersal',
      'Pack Regular Use Last Minute Items',
      'Pack Perishables',
      'Heavy Lifting – Packing & Sorting',
    ],
  },
  {
    category: 'Moving & Resettlement',
    services: [
      'Management of Your Move',
      'Unpack',
      'Setup of Your Home',
      'Hang Pictures and Devices',
      'Connect Electronics',
      'Specialty TV Mounting 76"+',
    ],
  },
  {
    category: 'Dispersals & Cleanouts',
    services: [
      'Total Clean Out',
      'Total Clean Out Delivery',
      'Post Services Clean Out',
      'Post Services Clean Out Delivery',
      'Document Shredding',
      'Hazmat Clean Out',
      'Refuse Disposal (Various Levels)',
      'Removal of 50+ Pound Items',
      'Specialized Donation',
      'Max Sold Staffing for Pickup',
    ],
  },
];
