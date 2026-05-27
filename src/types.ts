// ─── Availability ────────────────────────────────────────────────────────────
export type AvailabilitySlot = 'Full Day' | 'AM' | 'PM' | 'Unavailable';

export interface TeamMemberAvailability {
  Mon: AvailabilitySlot;
  Tue: AvailabilitySlot;
  Wed: AvailabilitySlot;
  Thu: AvailabilitySlot;
  Fri: AvailabilitySlot;
  Sat: AvailabilitySlot;
  Sun: AvailabilitySlot;
}

export type RoleType =
  | 'PM'
  | 'Lead'
  | 'PM/Lead'
  | 'Specialist'
  | 'Assist PM'
  | 'Mover';

export type ShiftRole = RoleType | 'N/A';

export interface ShiftRoles {
  AM: ShiftRole;
  PM: ShiftRole;
  'Full Day': ShiftRole;
}

export interface TeamMember {
  id: string;
  name: string;
  shiftRoles: ShiftRoles;
  availability: TeamMemberAvailability;
  minHoursPerWeek: number;
  maxHoursPerWeek: number;
  isPriority: boolean;
}

// ─── Phase Templates ──────────────────────────────────────────────────────────
export type PhaseShift = 'AM' | 'PM' | 'Full Day' | 'client-pref' | '8am-move-day';

export interface PhaseRole {
  role: RoleType;
  isLocked?: boolean; // PM / Assist PM locked across project
}

export interface PhaseTemplate {
  id: string;
  order: number | string;
  name: string;
  hours: number;
  teamSize: number;
  roles: PhaseRole[];
  shift: PhaseShift;
  isAM?: boolean; // true = AM block
  isPM?: boolean; // true = PM block
}

// ─── List Category ────────────────────────────────────────────────────────────
export interface ListCategory {
  id: string;
  name: string;
  items: string[];
}

// ─── Project Inputs ───────────────────────────────────────────────────────────
export type MoveType = 'Full Move' | 'Emergency Move' | 'Downsize Only' | 'Cleanout' | 'Pack Only';
export type FlexibilityLevel = 'None' | 'Low' | 'Medium' | 'High';
export type DensityLevel = 'Light' | 'Moderate' | 'Heavy';
export type TimePreference = 'AM' | 'PM';

export interface CleanoutOptions {
  enabled: boolean;
  type: string;
  startDate: string; // ISO date string
}

export interface AuctionOptions {
  enabled: boolean;
}

export interface DateOverride {
  id: string;
  date: string; // ISO date string
  shift: AvailabilitySlot;
  reason: string;
}

export interface ProjectInputs {
  // Client Info
  clientName: string;
  projectName: string;
  community: string;
  moveType: MoveType;
  status: 'draft' | 'active' | 'archived';
  // Dates
  targetMoveDate: string; // ISO date string
  earliestStartDate: string; // ISO date string
  hardDeadline: string; // ISO date string
  flexibilityLevel: FlexibilityLevel;
  // Property
  originSqFt: number;
  destinationSqFt: number;
  densityLevel: DensityLevel;
  // Budget & Preferences
  budgetedManHours: number;
  clientTimePreference: TimePreference;
  specialNotes: string;
  // Optional Services
  cleanout: CleanoutOptions;
  auction: AuctionOptions;
  // Schedule Overrides
  dateOverrides: DateOverride[];
}

// ─── Schedule ─────────────────────────────────────────────────────────────────
export type AssignmentStatus = 'assigned' | 'needs-assignment' | 'over-max' | 'conflict';

export interface ScheduleEntry {
  id: string;
  date: string; // ISO date string
  phaseName: string;
  phaseId: string;
  role: RoleType;
  assignedMember: string | null; // TeamMember id, or null
  assignedMemberName: string | null;
  shift: 'AM' | 'PM' | 'Full Day';
  hours: number;
  status: AssignmentStatus;
  warnings: string[];
}

export interface ScheduleDay {
  date: string;
  label: string; // e.g. "Mon Apr 28"
  entries: ScheduleEntry[];
}

export interface TeamHoursSummary {
  memberId: string;
  memberName: string;
  scheduledHours: number;
  maxHours: number;
  isOverMax: boolean;
}

export interface ScheduleResult {
  days: ScheduleDay[];
  totalScheduledHours: number;
  remainingHours: number;
  percentScheduled: number;
  status: 'ON TRACK' | 'OVER BUDGET' | 'UNDER SCHEDULED';
  teamHours: TeamHoursSummary[];
  lockedPM: string | null;
  lockedAssistPM: string | null;
  suggestedDates: SuggestedDates;
}

export interface SuggestedDates {
  firstVisit: string;
  secondVisit: string;
  sortDays: string[];
  finalPackDay: string;
  moveDay: string;
  cleanoutDays: string[];
  auctionLotOrg: string | null;
  auctionStart: string | null;
  auctionPickup: string | null;
}

// ─── Project ──────────────────────────────────────────────────────────────────
export interface Project {
  id: string;
  createdAt: string;
  updatedAt: string;
  inputs: ProjectInputs;
  schedule: ScheduleResult | null;
}

// ─── App State ────────────────────────────────────────────────────────────────
export type TabName = 'projects' | 'inputs' | 'plan' | 'schedule' | 'settings' | 'calendar';

export interface AppState {
  projects: Project[];
  activeProjectId: string | null;
  activeTab: TabName;
  teamMembers: TeamMember[];
  communities: string[];
  lists: ListCategory[];
  phaseTemplates: PhaseTemplate[];
}
