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
// The checklist is a *derived* view: its sections and items come from the
// checklist template, and every due date is anchored to a date the move plan
// builder produced (SuggestedDates) or the user entered (ProjectInputs).
// Only completion state is stored per project.

/** A named date on the move plan that checklist due dates hang off of. */
export type ChecklistAnchor =
  | 'earliestStart'
  | 'firstVisit'
  | 'secondVisit'
  | 'sortDayFirst'
  | 'sortDayLast'
  | 'finalPackDay'
  | 'moveDay'
  | 'cleanoutDay'
  | 'auctionLotOrg'
  | 'auctionStart'
  | 'auctionPickup'
  | 'hardDeadline';

/** 'workday' offsets skip weekends; 'calendar' counts every day. */
export type OffsetMode = 'calendar' | 'workday';

/** Gates an item or section to jobs that actually include the work. */
export interface ChecklistRequirement {
  cleanout?: boolean;
  auction?: boolean;
  moveTypes?: MoveType[];
}

export interface ChecklistItemTemplate {
  id: string;
  label: string;
  detail?: string;
  /** Which move-plan date this item's due date is measured from. */
  anchor: ChecklistAnchor;
  /** Days before (negative) or after (positive) the anchor. */
  offsetDays: number;
  /** Defaults to 'workday'. */
  offsetMode?: OffsetMode;
  /** Who typically owns the item — display only, not used for assignment. */
  owner?: RoleType;
  requires?: ChecklistRequirement;
}

export interface ChecklistSectionTemplate {
  id: string;
  title: string;
  description?: string;
  requires?: ChecklistRequirement;
  items: ChecklistItemTemplate[];
}

/** Per-item completion state — the only part that is persisted. */
export interface ChecklistItemState {
  done: boolean;
  completedAt: string | null;
}

export type ChecklistState = Record<string, ChecklistItemState>;

export type ChecklistItemStatus = 'done' | 'overdue' | 'due-soon' | 'upcoming' | 'unscheduled';

export interface ChecklistItem extends ChecklistItemTemplate {
  sectionId: string;
  sectionTitle: string;
  /** null when the anchoring date doesn't exist on this job. */
  dueDate: string | null;
  done: boolean;
  completedAt: string | null;
  status: ChecklistItemStatus;
}

export interface ChecklistSection {
  id: string;
  title: string;
  description?: string;
  items: ChecklistItem[];
  doneCount: number;
  overdueCount: number;
}

export interface ChecklistProgress {
  total: number;
  done: number;
  overdue: number;
  dueSoon: number;
  percent: number;
}

export interface ChecklistResult {
  sections: ChecklistSection[];
  /** Flat, sorted by due date (unscheduled last). */
  items: ChecklistItem[];
  progress: ChecklistProgress;
  /** Resolved anchor → ISO date, for display and debugging. */
  anchorDates: Record<ChecklistAnchor, string | null>;
}

// ─── Project ──────────────────────────────────────────────────────────────────
export interface Project {
  id: string;
  createdAt: string;
  updatedAt: string;
  inputs: ProjectInputs;
  schedule: ScheduleResult | null;
  /** Completion state only — items and due dates are always re-derived. */
  checklist?: ChecklistState;
}

// ─── App State ────────────────────────────────────────────────────────────────
export type TabName = 'projects' | 'inputs' | 'plan' | 'schedule' | 'settings' | 'calendar' | 'checklist';

export interface AppState {
  projects: Project[];
  activeProjectId: string | null;
  activeTab: TabName;
  teamMembers: TeamMember[];
  communities: string[];
  lists: ListCategory[];
  phaseTemplates: PhaseTemplate[];
}
