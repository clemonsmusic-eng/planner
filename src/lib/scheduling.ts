import { parseISO, addDays } from 'date-fns';
import type {
  ProjectInputs,
  ScheduleResult,
  ScheduleEntry,
  ScheduleDay,
  TeamHoursSummary,
  SuggestedDates,
  RoleType,
  PhaseId,
  TeamMember,
  AvailabilitySlot,
  PhaseTemplate,
  ListCategory,
  AuctionAppSettings,
} from '../types';
import {
  addWorkdays,
  toISODate,
  formatDateLabel,
  getDayOfWeekKey,
  getWeekKey,
} from './dateUtils';
import { getRoleQualifiers } from './data';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Returns true if the member has approved time off covering this ISO date */
function isMemberOnTimeOff(member: TeamMember, dateStr: string): boolean {
  return (member.timeOff ?? []).some((t) => dateStr >= t.startDate && dateStr <= t.endDate);
}

/** Check whether a team member is available on a given date for a given shift type */
function isMemberAvailableForShift(
  member: TeamMember,
  date: Date,
  requiredShift: 'AM' | 'PM' | 'Full Day',
  overrideShift?: AvailabilitySlot
): boolean {
  const dateStr = toISODate(date);
  if (isMemberOnTimeOff(member, dateStr)) return false;

  const dayKey = getDayOfWeekKey(date);
  const slot: AvailabilitySlot = overrideShift ?? member.availability[dayKey];

  if (slot === 'Unavailable') return false;
  if (slot === 'Full Day') return true;
  // At this point slot is 'AM' or 'PM'
  if (requiredShift === 'Full Day') return false; // need full day but only have half
  if (requiredShift === 'AM') return slot === 'AM';
  if (requiredShift === 'PM') return slot === 'PM';
  return false;
}

/** Determine the effective shift for a phase on a given date */
function resolveShift(
  phaseShift: string,
  isAM: boolean | undefined,
  isPM: boolean | undefined,
  clientPref: 'AM' | 'PM',
  dateOverrideShift?: AvailabilitySlot
): 'AM' | 'PM' | 'Full Day' {
  if (dateOverrideShift) {
    if (dateOverrideShift === 'AM') return 'AM';
    if (dateOverrideShift === 'PM') return 'PM';
    if (dateOverrideShift === 'Full Day') return 'Full Day';
  }
  if (phaseShift === 'AM' || isAM) return 'AM';
  if (phaseShift === 'PM' || isPM) return 'PM';
  if (phaseShift === '8am-move-day') return 'AM';
  if (phaseShift === 'client-pref') return clientPref;
  return clientPref;
}

// ─── Main Scheduling Function ─────────────────────────────────────────────────

// memberId → dateStr → shift already committed in a prior project
export type ExternalBookings = Record<string, Record<string, 'AM' | 'PM' | 'Full Day'>>;

const AUCTION_MIN_PER_LOT: Record<string, number> = { High: 13, Average: 18, Low: 25 };
const AUCTION_PICKUP_TEAM_SIZE = 4;
const AUCTION_PICKUP_HOURS = 8;
const AUCTION_PREP_TEAM_SIZE = 3;

export function generateSchedule(
  inputs: ProjectInputs,
  teamMembers: TeamMember[],
  phaseTemplates: PhaseTemplate[],
  /** Reserved: parameter lists no longer feed scheduling now that crew sizes come from templates. */
  _lists: ListCategory[] = [],
  existingBookings: ExternalBookings = {},
  auctionSettings?: AuctionAppSettings
): ScheduleResult {
  const {
    targetMoveDate,
    earliestStartDate,
    budgetedManHours,
    clientTimePreference,
    cleanout,
    auction,
    dateOverrides,
  } = inputs;

  // ── 1. Team sizes (needed for sort day calculation) ──────────────────────────
  // Crew size is no longer derived from square footage. Every phase starts at its
  // template team size (2 by default) and is adjusted per shift on the Schedule tab.

  const templateSize = (phaseId: PhaseId | string, fallback: number) =>
    phaseTemplates.find(t => t.id === phaseId)?.minTeamSize ?? fallback;

  const packSortSize = templateSize('phase-3', 2);
  const preMoveSize  = templateSize('phase-4-2', 2);
  const moveDaySize  = templateSize('phase-5-2', 2);

  // ── 2. Compute suggested dates ───────────────────────────────────────────────

  // Determine effective move day based on flexibility level
  const baseMoveDayDate = parseISO(targetMoveDate);
  let moveDayDate: Date;
  const flexibilityLevel = inputs.flexibilityLevel ?? 'Low';
  if (flexibilityLevel === 'None' || teamMembers.length === 0) {
    moveDayDate = baseMoveDayDate;
  } else {
    const flexDays = flexibilityLevel === 'Low' ? 1 : flexibilityLevel === 'Medium' ? 3 : 7;
    // Generate candidate workdays: target ± flexDays workdays
    const candidates: Date[] = [];
    for (let offset = -flexDays; offset <= flexDays; offset++) {
      candidates.push(offset === 0 ? new Date(baseMoveDayDate) : addWorkdays(baseMoveDayDate, offset));
    }
    // Score each candidate by number of available team members; prefer target date on tie
    const targetIso = toISODate(baseMoveDayDate);
    let bestDate = baseMoveDayDate;
    let bestScore = -1;
    for (const candidate of candidates) {
      const score = teamMembers.filter(
        (m) => m.availability[getDayOfWeekKey(candidate)] !== 'Unavailable'
      ).length;
      const isTarget = toISODate(candidate) === targetIso;
      if (score > bestScore || (score === bestScore && isTarget)) {
        bestScore = score;
        bestDate = candidate;
      }
    }
    moveDayDate = bestDate;
  }

  const startDate = parseISO(earliestStartDate);

  const firstVisitDate = startDate;
  // Keep ~2 workdays between the first and second visit (weekends skipped).
  const secondVisitDate = addWorkdays(firstVisitDate, 3);
  const finalPackDayDate = addWorkdays(moveDayDate, -1);

  // Phase hours derived from editable templates (use minHours as the scheduling baseline)
  const th = (id: string, fallback: number) =>
    phaseTemplates.find((t) => t.id === id)?.minHours ?? fallback;

  const h1  = th('phase-1',   2.5);
  const h2  = th('phase-2',   4);
  const h3  = th('phase-3',   4);
  const h41 = th('phase-4-1', 6);
  const h42 = th('phase-4-2', 3);
  const h51 = th('phase-5-1', 8);
  const h52 = th('phase-5-2', 4);

  // Auction cleanout estimated hours (computed from lot count × min/lot performance)
  const auctionEstHours: number = (() => {
    if (cleanout.type !== 'Full - Auction' || !auction.lotCount || auction.lotCount <= 0) return 0;
    const minPerLot = AUCTION_MIN_PER_LOT[auctionSettings?.performanceLevel ?? 'Average'] ?? 18;
    return Math.round((auction.lotCount * minPerLot) / 60 * 10) / 10;
  })();

  // ── Budget-aware phase inclusion ────────────────────────────────────────────
  // Priority order: Phase 1 (required) → Phase 5-1 (required) → Phase 5-2
  // → Phase 2 → Phase 4-1 → Sort days (budget-scaled) → Phase 4-2 (last resort)

  // Required: Phase 1 + AM Move Day (always included, 2 people each)
  // Auction phases (lot prep, pickup prep, pickup) are committed upfront and deducted from the pool.
  const auctionPickupHours = auction.enabled ? AUCTION_PICKUP_HOURS * AUCTION_PICKUP_TEAM_SIZE : 0;
  const pickupPrepTpl = phaseTemplates.find(t => t.id === 'phase-pickup-prep');
  const auctionPickupPrepHours = auction.enabled
    ? (pickupPrepTpl?.minHours ?? 3) * (pickupPrepTpl?.minTeamSize ?? 3)
    : 0;
  let budgetPool = budgetedManHours - (h1 * 2) - (h51 * 2) - auctionEstHours - auctionPickupHours - auctionPickupPrepHours;

  // PM Move Day (5-2) — scale team size down if budget is tight
  const moveDayPMActual = Math.min(moveDaySize, Math.max(0, Math.floor(budgetPool / h52)));
  budgetPool -= moveDayPMActual * h52;

  // Second Visit (Phase 2) — include if budget allows
  const includePhase2 = budgetPool >= h2 * 2;
  if (includePhase2) budgetPool -= h2 * 2;

  // AM Final Pack (Phase 4-1) — include if budget allows
  const includePhase41 = budgetPool >= h41 * 2;
  if (includePhase41) budgetPool -= h41 * 2;

  // Sort days — fill remaining budget, scale team size to fit
  let sortDayCount = 0;
  let actualSortTeamSize = 0;
  if (budgetPool >= h3) {
    const sortHoursFullDay = packSortSize * h3;
    sortDayCount = Math.max(1, Math.ceil(budgetPool / sortHoursFullDay));
    // Scale down team size so total sort hours stay within budget
    actualSortTeamSize = Math.min(
      packSortSize,
      Math.max(1, Math.floor(budgetPool / (sortDayCount * h3)))
    );
    budgetPool -= sortDayCount * actualSortTeamSize * h3;
  }

  // PM Final Pack (Phase 4-2) — only if budget remains (lowest priority)
  const preMoveActual = budgetPool >= h42 ? Math.min(preMoveSize, Math.floor(budgetPool / h42)) : 0;
  const includePhase42 = preMoveActual > 0;

  // Sort/pack days: prioritize staff availability over spreading the days out.
  // addWorkdays skips weekends (so weekends stay free) and we advance one workday
  // at a time — back-to-back days at the same client are fine. Days where no team
  // member is available are skipped in favor of the next workday.
  const hasTeam = teamMembers.length > 0;
  const sortStartBase = addWorkdays(secondVisitDate, 1);
  const sortDates: Date[] = [];
  {
    let cur = sortStartBase;
    let guard = 0;
    while (sortDates.length < sortDayCount && guard < 120) {
      guard++;
      // Ensure sort days don't overlap with final pack day
      if (toISODate(cur) >= toISODate(finalPackDayDate)) break;
      const availableCount = hasTeam
        ? teamMembers.filter((m) => m.availability[getDayOfWeekKey(cur)] !== 'Unavailable').length
        : 1;
      if (availableCount > 0) {
        sortDates.push(new Date(cur));
      }
      cur = addWorkdays(cur, 1);
    }
  }

  // Regular cleanout (phase-6) — scheduled when cleanout is enabled regardless of auction
  const cleanoutDates: string[] = [];
  if (cleanout.enabled) {
    const cleanoutStart = cleanout.startDate
      ? parseISO(cleanout.startDate)
      : addWorkdays(moveDayDate, 2);
    cleanoutDates.push(toISODate(cleanoutStart));
  }

  // Auction dates and lot prep scheduling
  let auctionLotOrg: string | null = null;
  let auctionStart: string | null = null;
  let auctionPickupPrep: string | null = null;
  let auctionPickup: string | null = null;
  const lotPrepDates: string[] = [];
  interface LotPrepDay { date: string; hoursPerPerson: number | undefined; teamSizeOverride?: number }
  const lotPrepSchedule: LotPrepDay[] = [];

  if (auction.enabled) {
    const lotOrgDate = addWorkdays(moveDayDate, 8);
    auctionLotOrg = toISODate(lotOrgDate);

    const auctionStartDate = (() => {
      let d = addWorkdays(moveDayDate, 10);
      while (d.getDay() !== 1) d = addDays(d, 1);
      return d;
    })();
    auctionStart = toISODate(auctionStartDate);

    // Pickup Day = first Friday that is at least 13 calendar days after lot prep start
    let pickupDayDate = addDays(new Date(lotOrgDate), 13);
    while (pickupDayDate.getDay() !== 5) pickupDayDate = addDays(pickupDayDate, 1);
    auctionPickup = toISODate(pickupDayDate);
    auctionPickupPrep = toISODate(addDays(pickupDayDate, -1));

    // Lot Prep scheduling — driven by auction estimate (auctionEstHours)
    if (auctionEstHours > 0) {
      const ctLotPrep = phaseTemplates.find((t) => t.id === 'phase-lot-prep');
      const teamSize = ctLotPrep?.minTeamSize ?? AUCTION_PREP_TEAM_SIZE;
      const maxHoursPerPerson = ctLotPrep?.maxHours ?? 6;
      const capacityPerDay = teamSize * maxHoursPerPerson;
      const daysNeeded = Math.max(1, Math.ceil(auctionEstHours / capacityPerDay));
      let remaining = auctionEstHours;
      let cur = new Date(lotOrgDate);
      for (let i = 0; i < daysNeeded && remaining > 0.05; i++) {
        const hoursPerPerson = Math.min(maxHoursPerPerson, Math.round((remaining / teamSize) * 10) / 10);
        const dateStr = toISODate(cur);
        lotPrepDates.push(dateStr);
        lotPrepSchedule.push({ date: dateStr, hoursPerPerson, teamSizeOverride: teamSize });
        remaining -= hoursPerPerson * teamSize;
        cur = addWorkdays(cur, 1);
      }
    }
  }

  const suggestedDates: SuggestedDates = {
    firstVisit: toISODate(firstVisitDate),
    secondVisit: toISODate(secondVisitDate),
    sortDays: sortDates.map(toISODate),
    finalPackDay: toISODate(finalPackDayDate),
    moveDay: toISODate(moveDayDate),
    cleanoutDays: cleanoutDates,
    lotPrepDays: lotPrepDates,
    auctionLotOrg,
    auctionStart,
    auctionPickupPrep,
    auctionPickup,
  };

  // ── 2. Build date → override map ─────────────────────────────────────────────

  const overrideMap: Record<string, AvailabilitySlot> = {};
  for (const ov of dateOverrides) {
    overrideMap[ov.date] = ov.shift;
  }

  // ── 3. Build list of (phaseId, date, role, shift) tasks ─────────────────────

  interface Task {
    phaseId: string;
    phaseName: string;
    date: string;
    role: RoleType;
    shift: 'AM' | 'PM' | 'Full Day';
    hours: number;
    isLocked?: boolean;
    teamSizeOverride?: number;
    shiftFlexible: boolean; // true when phase shift is 'client-pref' — can flip AM↔PM to avoid conflicts
  }

  const tasks: Task[] = [];

  function addPhaseOnDate(
    phaseId: string,
    date: Date,
    teamSizeOverride?: number,
    hoursOverride?: number
  ) {
    const template = phaseTemplates.find((p) => p.id === phaseId);
    if (!template) return;

    const dateStr = toISODate(date);
    const overrideShift = overrideMap[dateStr];
    const shift = resolveShift(
      template.shift,
      template.isAM,
      template.isPM,
      clientTimePreference,
      overrideShift
    );

    // Cap team size: override (from the budget calc) bounded by template min/max
    const rawSize = teamSizeOverride ?? template.minTeamSize;
    const size = Math.min(Math.max(rawSize, template.minTeamSize), template.maxTeamSize);
    // Build role list, padding with Specialist if size > template.roles.length
    const roles: Array<{ role: RoleType; isLocked?: boolean }> = [
      ...template.roles,
    ];
    while (roles.length < size) {
      roles.push({ role: 'Specialist' });
    }

    const shiftFlexible = template.shift === 'client-pref';
    for (const roleSpec of roles.slice(0, size)) {
      tasks.push({
        phaseId,
        phaseName: template.name,
        date: dateStr,
        role: roleSpec.role,
        shift,
        hours: hoursOverride ?? template.minHours,
        isLocked: roleSpec.isLocked,
        teamSizeOverride: size,
        shiftFlexible,
      });
    }
  }

  // Phase 1 – First Visit (always required)
  addPhaseOnDate('phase-1', firstVisitDate);

  // Phase 2 – Second Visit (if budget allows)
  if (includePhase2) addPhaseOnDate('phase-2', secondVisitDate);

  // Phase 3 – Sort and Pack (budget-scaled team size)
  for (const sd of sortDates) {
    addPhaseOnDate('phase-3', sd, actualSortTeamSize > 0 ? actualSortTeamSize : 1);
  }

  // Phase 4-1 – AM Final Pack (if budget allows)
  if (includePhase41) addPhaseOnDate('phase-4-1', finalPackDayDate);

  // Phase 4-2 – PM Final Pack (last resort — only if budget remains)
  if (includePhase42) addPhaseOnDate('phase-4-2', finalPackDayDate, preMoveActual);

  // Phase 5-1 – AM Move Day (always required)
  addPhaseOnDate('phase-5-1', moveDayDate);

  // Phase 5-2 – PM Move Day (budget-scaled team size)
  if (moveDayPMActual > 0) addPhaseOnDate('phase-5-2', moveDayDate, moveDayPMActual);

  // Phase 6 – Cleanout (if enabled, single day regardless of auction)
  for (const dateStr of cleanoutDates) {
    addPhaseOnDate('phase-6', parseISO(dateStr));
  }

  // Lot Prep – auction only, driven by auction estimate
  for (const lp of lotPrepSchedule) {
    addPhaseOnDate('phase-lot-prep', parseISO(lp.date), lp.teamSizeOverride, lp.hoursPerPerson);
  }

  // Pickup Prep Day – 1 day before auction pickup
  if (auction.enabled && auctionPickupPrep) {
    addPhaseOnDate('phase-pickup-prep', parseISO(auctionPickupPrep), pickupPrepTpl?.minTeamSize);
  }

  // Phase 7 – Pickup Day (if auction enabled); always 4 people × 8 hours
  if (auction.enabled && auctionPickup) {
    addPhaseOnDate('phase-7', parseISO(auctionPickup), AUCTION_PICKUP_TEAM_SIZE, AUCTION_PICKUP_HOURS);
  }

  // Apply phaseDateMoves: shift specific phase occurrences to a new date
  if (inputs.phaseDateMoves && inputs.phaseDateMoves.length > 0) {
    for (const move of inputs.phaseDateMoves) {
      for (const task of tasks) {
        if (task.phaseId === move.phaseId && task.date === move.originalDate) {
          task.date = move.newDate;
        }
      }
    }
  }

  // Ensure move-day tasks are assigned before cleanout/pickup regardless of date
  const PHASE_PRIORITY: Record<string, number> = {
    'phase-1': 0, 'phase-2': 1, 'phase-3': 2,
    'phase-4-1': 3, 'phase-4-2': 4,
    'phase-5-1': 5, 'phase-5-2': 6,
    'phase-6': 7, 'phase-lot-prep': 8, 'phase-pickup-prep': 9, 'phase-7': 10,
  };
  tasks.sort((a, b) => (PHASE_PRIORITY[a.phaseId] ?? 5) - (PHASE_PRIORITY[b.phaseId] ?? 5));

  // ── 5. Assign team members ────────────────────────────────────────────────────

  // Track bookings: memberId → dateStr → Set<shift> (allows AM+PM on same day)
  const bookings: Record<string, Record<string, Set<'AM' | 'PM' | 'Full Day'>>> = {};
  // Track weekly hours: memberId → weekKey → hours
  const weeklyHours: Record<string, Record<string, number>> = {};
  // Track locked assignments: 'PM' | 'Assist PM' → memberId
  const lockedRoles: Record<string, string> = {};

  function initMember(id: string) {
    if (!bookings[id]) bookings[id] = {};
    if (!weeklyHours[id]) weeklyHours[id] = {};
  }

  function getWeekHours(memberId: string, weekKey: string): number {
    return weeklyHours[memberId]?.[weekKey] ?? 0;
  }

  function addWeekHours(memberId: string, weekKey: string, hours: number) {
    initMember(memberId);
    weeklyHours[memberId][weekKey] = (weeklyHours[memberId][weekKey] ?? 0) + hours;
  }

  /**
   * One person works at most one shift per day on a project.
   *
   * The AM and PM halves of a day don't overlap in clock time, but putting the
   * same person on both — both move-day shifts, or AM and PM final pack — is a
   * scheduling error, not a legitimate double shift. So any existing booking on
   * the date blocks another, whatever the shift.
   *
   * This is deliberately per-project: `existingBookings` handles other projects
   * separately, where a half-day on each of two jobs is still allowed.
   */
  function isShiftConflict(memberId: string, dateStr: string): boolean {
    const dayShifts = bookings[memberId]?.[dateStr];
    return !!dayShifts && dayShifts.size > 0;
  }

  function book(memberId: string, dateStr: string, weekKey: string, hours: number, shift: 'AM' | 'PM' | 'Full Day') {
    initMember(memberId);
    if (!bookings[memberId][dateStr]) bookings[memberId][dateStr] = new Set();
    bookings[memberId][dateStr].add(shift);
    addWeekHours(memberId, weekKey, hours);
  }

  const entries: ScheduleEntry[] = [];

  // ── Helper: check if a member is blocked by an external (cross-project) booking ──
  function isExternallyBlocked(
    memberId: string,
    dateStr: string,
    shift: 'AM' | 'PM' | 'Full Day'
  ): boolean {
    const ext = existingBookings[memberId]?.[dateStr];
    if (!ext) return false;
    if (ext === 'Full Day' || shift === 'Full Day') return true;
    return ext === shift; // same half-day booked
  }

  // ── Helper: attempt to assign a candidate list for a given shift ──────────────
  function findCandidate(
    sorted: TeamMember[],
    date: Date,
    dateStr: string,
    weekKey: string,
    shift: 'AM' | 'PM' | 'Full Day',
    hours: number,
    overrideShift: AvailabilitySlot | undefined
  ): { id: string; name: string; overMax: boolean } | null {
    let fallback: { id: string; name: string } | null = null;

    for (const member of sorted) {
      if (!isMemberAvailableForShift(member, date, shift, overrideShift)) continue;
      if (isShiftConflict(member.id, dateStr)) continue;
      if (isExternallyBlocked(member.id, dateStr, shift)) continue;

      const wkHours = getWeekHours(member.id, weekKey);
      const wouldExceed = member.maxHoursPerWeek > 0 && (wkHours + hours) > member.maxHoursPerWeek;
      if (wouldExceed) {
        if (!fallback) fallback = { id: member.id, name: member.name };
        continue;
      }
      return { id: member.id, name: member.name, overMax: false };
    }
    return fallback ? { ...fallback, overMax: true } : null;
  }

  for (const task of tasks) {
    const date = parseISO(task.date);
    const dayKey = getDayOfWeekKey(date);
    const weekKey = getWeekKey(task.date);
    const overrideShift = overrideMap[task.date] as AvailabilitySlot | undefined;

    const warnings: string[] = [];
    let assignedMemberId: string | null = null;
    let assignedMemberName: string | null = null;
    let effectiveShift = task.shift; // may flip for flexible tasks
    let status: ScheduleEntry['status'] = 'needs-assignment';

    // Only true PM and Assist PM slots are locked (not PM/Lead in Sort and Pack)
    const lockKey = task.role === 'PM' ? 'PM' : task.role === 'Assist PM' ? 'Assist PM' : null;

    if (lockKey && lockedRoles[lockKey]) {
      // Use the locked member
      const lockedId = lockedRoles[lockKey];
      const member = teamMembers.find((m) => m.id === lockedId);
      if (member) {
        const memberDayAvail = member.availability[dayKey];
        const effectiveAvail = overrideShift ?? memberDayAvail;

        if (effectiveAvail === 'Unavailable') {
          warnings.push(`${member.name} unavailable on ${task.date}`);
          status = 'conflict';
        } else if (!isMemberAvailableForShift(member, date, task.shift, overrideShift)) {
          warnings.push(`${member.name} shift conflict`);
          status = 'conflict';
        } else if (isShiftConflict(lockedId, task.date)) {
          warnings.push(`${member.name} already booked on this day`);
          status = 'conflict';
        } else if (isExternallyBlocked(lockedId, task.date, task.shift)) {
          warnings.push(`${member.name} booked on another project`);
          status = 'conflict';
        }

        const wkHours = getWeekHours(lockedId, weekKey);
        const wouldExceed = member.maxHoursPerWeek > 0 && (wkHours + task.hours) > member.maxHoursPerWeek;
        if (wouldExceed) {
          warnings.push(`${member.name} over weekly max`);
          status = status === 'conflict' ? 'conflict' : 'over-max';
        }

        if (status !== 'conflict' && status !== 'over-max') status = 'assigned';
        else if (status !== 'conflict') status = 'over-max';

        assignedMemberId = lockedId;
        assignedMemberName = member.name;
        if (!isShiftConflict(lockedId, task.date)) {
          book(lockedId, task.date, weekKey, task.hours, task.shift);
        } else {
          addWeekHours(lockedId, weekKey, task.hours);
        }
      }
    } else {
      // Build candidate list: members whose phase roles include a qualifying role
      const qualifyingRoles = getRoleQualifiers(task.role);
      const candidates = teamMembers.filter((m) => {
        const phaseRole = m.phaseRoles[task.phaseId as PhaseId];
        if (!phaseRole || phaseRole === 'N/A') return false;
        // phaseRole is RoleType[] — member qualifies if any selected role matches
        return phaseRole.some((r) => qualifyingRoles.includes(r));
      });

      // Sort: priority members first, then by roster index
      const sorted = [...candidates].sort((a, b) => {
        if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1;
        return teamMembers.indexOf(a) - teamMembers.indexOf(b);
      });

      // Try primary shift first
      let found = findCandidate(sorted, date, task.date, weekKey, task.shift, task.hours, overrideShift);

      // If not found and shift is flexible (client-pref), try the opposite shift
      if (!found && task.shiftFlexible && (task.shift === 'AM' || task.shift === 'PM')) {
        const alt: 'AM' | 'PM' = task.shift === 'AM' ? 'PM' : 'AM';
        const altFound = findCandidate(sorted, date, task.date, weekKey, alt, task.hours, overrideShift);
        if (altFound && !altFound.overMax) {
          // Only flip if the alt gives a clean (not over-max) assignment
          found = altFound;
          effectiveShift = alt;
        } else if (!found && altFound) {
          found = altFound;
          effectiveShift = alt;
        }
      }

      if (found) {
        assignedMemberId = found.id;
        assignedMemberName = found.name;
        if (found.overMax) {
          const wkHours = getWeekHours(found.id, weekKey);
          const m = teamMembers.find(m => m.id === found!.id)!;
          warnings.push(`${found.name} over weekly max (${wkHours + task.hours} / ${m.maxHoursPerWeek})`);
          status = 'over-max';
        } else {
          status = 'assigned';
        }

        if (!isShiftConflict(assignedMemberId, task.date)) {
          book(assignedMemberId, task.date, weekKey, task.hours, effectiveShift);
        } else {
          addWeekHours(assignedMemberId, weekKey, task.hours);
        }

        // Lock PM/Assist PM on first assignment
        if (task.role === 'PM' && !lockedRoles['PM']) lockedRoles['PM'] = assignedMemberId;
        if (task.role === 'Assist PM' && !lockedRoles['Assist PM']) lockedRoles['Assist PM'] = assignedMemberId;
      }
    }

    if (!assignedMemberId) status = 'needs-assignment';

    entries.push({
      id: makeId('entry'),
      date: task.date,
      phaseName: task.phaseName,
      phaseId: task.phaseId,
      role: task.role,
      assignedMember: assignedMemberId,
      assignedMemberName,
      shift: effectiveShift,
      hours: task.hours,
      status,
      warnings,
    });
  }

  // ── 6. Group entries by date ──────────────────────────────────────────────────

  const dayMap = new Map<string, ScheduleEntry[]>();
  for (const entry of entries) {
    if (!dayMap.has(entry.date)) dayMap.set(entry.date, []);
    dayMap.get(entry.date)!.push(entry);
  }

  const sortedDates = Array.from(dayMap.keys()).sort();
  const days: ScheduleDay[] = sortedDates.map((date) => ({
    date,
    label: formatDateLabel(date),
    entries: dayMap.get(date)!,
  }));

  // ── 7. Compute totals ─────────────────────────────────────────────────────────

  const totalScheduledHours = entries.reduce((sum, e) => sum + e.hours, 0);
  const remainingHours = budgetedManHours - totalScheduledHours;
  const percentScheduled = budgetedManHours > 0 ? (totalScheduledHours / budgetedManHours) * 100 : 0;

  let scheduleStatus: ScheduleResult['status'];
  if (percentScheduled > 120) scheduleStatus = 'OVER BUDGET';
  else if (percentScheduled < 85) scheduleStatus = 'UNDER SCHEDULED';
  else scheduleStatus = 'ON TRACK';

  // ── 8. Team hours summary ─────────────────────────────────────────────────────

  const memberHoursMap: Record<string, number> = {};
  for (const entry of entries) {
    if (entry.assignedMember) {
      memberHoursMap[entry.assignedMember] =
        (memberHoursMap[entry.assignedMember] ?? 0) + entry.hours;
    }
  }

  const teamHours: TeamHoursSummary[] = teamMembers
    .filter((m) => memberHoursMap[m.id] !== undefined)
    .map((m) => ({
      memberId: m.id,
      memberName: m.name,
      scheduledHours: memberHoursMap[m.id],
      maxHours: m.maxHoursPerWeek,
      isOverMax:
        m.maxHoursPerWeek > 0 &&
        Object.values(weeklyHours[m.id] ?? {}).some((wkHrs) => wkHrs > m.maxHoursPerWeek),
    }));

  return {
    days,
    totalScheduledHours,
    remainingHours,
    percentScheduled,
    status: scheduleStatus,
    teamHours,
    lockedPM: lockedRoles['PM'] ?? null,
    lockedAssistPM: lockedRoles['Assist PM'] ?? null,
    suggestedDates,
  };
}
