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

// ─── Checklist ────────────────────────────────────────────────────────────────
/**
 * Points in the generated move plan that a checklist item can be anchored to.
 * Every anchor resolves to a date from `ScheduleResult.suggestedDates`.
 */
export type ChecklistAnchor =
  | 'firstVisit'
  | 'secondVisit'
  | 'sortDayFirst'
  | 'sortDayLast'
  | 'finalPackDay'
  | 'moveDay'
  | 'cleanoutDay'
  | 'auctionPickup';

export interface ChecklistItemTemplate {
  /** Stable id derived from the section id + item text */
  id: string;
  text: string;
  /** Indented reference bullets shown under the item (not separately checkable) */
  subItems?: string[];
  /** Overrides the section anchor when this item is due at a different point */
  anchor?: ChecklistAnchor;
  /** Workdays before (negative) / after (positive) the anchor date */
  offsetWorkdays?: number;
  /** Only include when the project has auction services enabled */
  requiresAuction?: boolean;
  /** Only include when the project has cleanout services enabled */
  requiresCleanout?: boolean;
}

export interface ChecklistSectionTemplate {
  id: string;
  name: string;
  /** Who owns the section, e.g. "Project Manager" */
  owner: string;
  /** Extra context printed under the section heading */
  note?: string;
  anchor: ChecklistAnchor;
  offsetWorkdays?: number;
  /** Move types this section applies to. Omitted = all move types. */
  moveTypes?: MoveType[];
  /** Only include when the project has auction services enabled */
  requiresAuction?: boolean;
  /** Only include when the project has cleanout services enabled */
  requiresCleanout?: boolean;
  /** Only include when the PM flags the move as an outbound long distance move */
  requiresLongDistance?: boolean;
  items: ChecklistItemTemplate[];
}

export type ChecklistItemStatus =
  | 'complete'
  | 'overdue'
  | 'today'
  | 'upcoming'
  | 'scheduled'
  | 'unscheduled';

/** A template item resolved against a project's generated schedule */
export interface ChecklistItem extends ChecklistItemTemplate {
  sectionId: string;
  dueDate: string | null; // ISO date string
  done: boolean;
  completedAt: string | null;
  status: ChecklistItemStatus;
}

export interface ChecklistSection {
  id: string;
  name: string;
  owner: string;
  note?: string;
  dueDate: string | null;
  items: ChecklistItem[];
  doneCount: number;
  overdueCount: number;
}

export interface ChecklistSummary {
  sections: ChecklistSection[];
  totalItems: number;
  doneItems: number;
  overdueItems: number;
  percentComplete: number;
  nextDue: ChecklistItem | null;
}

/** Per-project checklist state persisted alongside the projects */
export interface ProjectChecklistState {
  /** itemId → ISO timestamp the item was completed */
  completed: Record<string, string>;
  /** PM-set flag: this move is an outbound long distance move */
  longDistance: boolean;
}

export type ChecklistStore = Record<string, ProjectChecklistState>;

// ─── Project ──────────────────────────────────────────────────────────────────
export interface Project {
  id: string;
  createdAt: string;
  updatedAt: string;
  inputs: ProjectInputs;
  schedule: ScheduleResult | null;
}

// ─── App State ────────────────────────────────────────────────────────────────
export type TabName = 'projects' | 'inputs' | 'plan' | 'schedule' | 'checklist' | 'settings' | 'calendar';

export interface AppState {
  projects: Project[];
  activeProjectId: string | null;
  activeTab: TabName;
  teamMembers: TeamMember[];
  communities: string[];
  lists: ListCategory[];
  phaseTemplates: PhaseTemplate[];
  checklists: ChecklistStore;
}
