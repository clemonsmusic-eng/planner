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

export type PhaseId =
  | 'phase-1'
  | 'phase-2'
  | 'phase-3'
  | 'phase-4-1'
  | 'phase-4-2'
  | 'phase-5-1'
  | 'phase-5-2'
  | 'phase-6'
  | 'phase-lot-prep'
  | 'phase-pickup-prep'
  | 'phase-7';

export type MemberPhaseRole = RoleType[] | 'N/A';
export type MemberPhaseRoles = Record<PhaseId, MemberPhaseRole>;

export interface TeamMember {
  id: string;
  name: string;
  phaseRoles: MemberPhaseRoles;
  availability: TeamMemberAvailability;
  minHoursPerWeek: number;
  maxHoursPerWeek: number;
  isPriority: boolean;
  experience?: TeamMemberExperience;
  timeOff?: TimeOffRequest[];
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
  minHours: number;
  maxHours: number;
  minTeamSize: number;
  maxTeamSize: number;
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
export type MoveType =
  | 'Full Move'
  | 'Long Distance Move'
  | 'Emergency Move'
  | 'Downsize Only'
  | 'Cleanout'
  | 'Pack Only';

export interface PhaseDateMove {
  id: string;
  phaseId: string;
  originalDate: string;
  newDate: string;
}
export type FlexibilityLevel = 'None' | 'Low' | 'Medium' | 'High';
export type DensityLevel = 'Light' | 'Moderate' | 'Heavy';
export type TimePreference = 'AM' | 'PM';

export interface CleanoutOptions {
  enabled: boolean;
  type: string;
  startDate: string; // ISO date string
}

export type ExperienceLevel = 'High' | 'Average' | 'Low';

export interface TeamMemberExperience {
  packAndSort: ExperienceLevel;
  cleanout: ExperienceLevel;
}

export interface TimeOffRequest {
  id: string;
  startDate: string; // ISO date YYYY-MM-DD
  endDate: string;   // ISO date YYYY-MM-DD
  note?: string;
}

export interface AuctionOptions {
  enabled: boolean;
  lotCount?: number;
}

export interface AuctionAppSettings {
  hourlyRate: number;
  performanceLevel: ExperienceLevel;
}

export interface DateOverride {
  id: string;
  date: string; // ISO date string
  shift: AvailabilitySlot;
  reason: string;
}

export type ProjectStatus = 'draft' | 'active' | 'archived';

export interface ProjectInputs {
  // Client Info
  clientName: string;
  projectName: string;
  community: string;
  moveType: MoveType;
  status: ProjectStatus;
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
  isLocked?: boolean;
  phaseDateMoves?: PhaseDateMove[];
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
  lotPrepDays: string[];
  auctionLotOrg: string | null;
  auctionStart: string | null;
  auctionPickupPrep: string | null;
  auctionPickup: string | null;
}

// ─── Project ──────────────────────────────────────────────────────────────────
// ─── Checklist ────────────────────────────────────────────────────────────────
/**
 * Every checklist item hangs off a milestone the move plan builder produces.
 * Due dates are never stored on the template — they're resolved from the active
 * project's generated schedule, so regenerating the plan re-dates the checklist.
 */
export type ChecklistAnchor =
  | 'earliest-start'
  | 'first-visit'
  | 'second-visit'
  | 'sort-start'
  | 'sort-end'
  | 'final-pack'
  | 'move-day'
  | 'cleanout-start'
  | 'cleanout-end'
  | 'lot-prep-start'
  | 'lot-prep-end'
  | 'auction-lot-org'
  | 'auction-start'
  | 'auction-pickup-prep'
  | 'auction-pickup'
  | 'hard-deadline';

/** Calendar days count weekends; workdays skip them. */
export type ChecklistOffsetMode = 'calendar' | 'workday';

/** Roles named in the PM Checklist. */
export type ChecklistOwner =
  | 'Dir. Bus. Dev'
  | 'Dir. Ops'
  | 'PM'
  | 'Specialist'
  | 'Movers'
  | 'Client'
  | 'Community';

/** Optional services from ProjectInputs that gate a section or item. */
export type ChecklistRequirement = 'cleanout' | 'auction';

export interface ChecklistTemplateItem {
  id: string;
  text: string;
  anchor: ChecklistAnchor;
  offsetDays: number;
  offsetMode: ChecklistOffsetMode;
  owner: ChecklistOwner;
  /** When set, the item only appears for these move types. */
  moveTypes?: MoveType[];
  /** When set, the item only appears if that optional service is enabled. */
  requires?: ChecklistRequirement;
  note?: string;
}

export interface ChecklistTemplateSection {
  id: string;
  name: string;
  order: number;
  description?: string;
  /** Applied to every item in the section unless the item overrides it. */
  moveTypes?: MoveType[];
  requires?: ChecklistRequirement;
  items: ChecklistTemplateItem[];
}

export interface ChecklistItemState {
  done: boolean;
  completedAt: string | null;
  /** Manual due date, overriding the anchor-derived one. */
  dueDateOverride: string | null;
  note: string;
}

/** Per-project checklist progress. Keyed by template item id so it survives regeneration. */
export interface ProjectChecklist {
  itemStates: Record<string, ChecklistItemState>;
  customItems: Array<ChecklistTemplateItem & { sectionId: string }>;
  excludedItemIds: string[];
}

// ─── Project ──────────────────────────────────────────────────────────────────
export interface Project {
  id: string;
  createdAt: string;
  updatedAt: string;
  inputs: ProjectInputs;
  schedule: ScheduleResult | null;
  checklist?: ProjectChecklist | null;
}

// ─── App State ────────────────────────────────────────────────────────────────
export type TabName = 'home' | 'projects' | 'inputs' | 'plan' | 'schedule' | 'checklist' | 'settings' | 'calendar';

export interface AppState {
  projects: Project[];
  activeProjectId: string | null;
  activeTab: TabName;
  teamMembers: TeamMember[];
  communities: string[];
  lists: ListCategory[];
  phaseTemplates: PhaseTemplate[];
  auctionSettings: AuctionAppSettings;
  projectListFilter: ProjectStatus | 'all';
  checklistTemplate: ChecklistTemplateSection[];
}
