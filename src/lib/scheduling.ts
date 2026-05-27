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
  MemberPhaseRole,
  TeamMember,
  AvailabilitySlot,
  PhaseTemplate,
  ListCategory,
} from '../types';
import {
  addWorkdays,
  toISODate,
  formatDateLabel,
  getDayOfWeekKey,
  getWeekKey,
} from './dateUtils';
import {
  getPackSortTeamSize,
  getPreMoveTeamSize,
  getMoveDayTeamSize,
  getRoleQualifiers,
  parseTeamSizeTable,
  lookupTeamSize,
} from './data';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Check whether a team member is available on a given date for a given shift type */
function isMemberAvailableForShift(
  member: TeamMember,
  date: Date,
  requiredShift: 'AM' | 'PM' | 'Full Day',
  overrideShift?: AvailabilitySlot
): boolean {
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

export function generateSchedule(
  inputs: ProjectInputs,
  teamMembers: TeamMember[],
  phaseTemplates: PhaseTemplate[],
  lists: ListCategory[] = []
): ScheduleResult {
  const {
    targetMoveDate,
    earliestStartDate,
    budgetedManHours,
    originSqFt,
    destinationSqFt,
    clientTimePreference,
    cleanout,
    auction,
    dateOverrides,
  } = inputs;

  // ── 1. Team sizes (needed for sort day calculation) ──────────────────────────

  const getItems = (id: string) => lists.find(l => l.id === id)?.items ?? [];
  const sqftTable     = parseTeamSizeTable(getItems('sqft-ranges'));
  const preMoveTable  = parseTeamSizeTable(getItems('pre-move-team-sizes'));
  const moveDayTable  = parseTeamSizeTable(getItems('move-day-team-sizes'));

  // Pack/Sort team size: driven by origin sq ft
  const packSortSize = sqftTable.length ? lookupTeamSize(originSqFt, sqftTable) : getPackSortTeamSize(originSqFt);
  // Pre-move and Move Day: driven by destination sq ft
  const preMoveSize  = preMoveTable.length ? lookupTeamSize(destinationSqFt, preMoveTable) : getPreMoveTeamSize(destinationSqFt);
  const moveDaySize  = moveDayTable.length ? lookupTeamSize(destinationSqFt, moveDayTable) : getMoveDayTeamSize(destinationSqFt);

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

  // Phase hours derived from editable templates
  const th = (id: string, fallback: number) =>
    phaseTemplates.find((t) => t.id === id)?.hours ?? fallback;

  const h1  = th('phase-1',   2.5);
  const h2  = th('phase-2',   4);
  const h3  = th('phase-3',   4);
  const h41 = th('phase-4-1', 6);
  const h42 = th('phase-4-2', 3);
  const h51 = th('phase-5-1', 8);
  const h52 = th('phase-5-2', 4);

  // ── Budget-aware phase inclusion ────────────────────────────────────────────
  // Priority order: Phase 1 (required) → Phase 5-1 (required) → Phase 5-2
  // → Phase 2 → Phase 4-1 → Sort days (budget-scaled) → Phase 4-2 (last resort)

  // Required: Phase 1 + AM Move Day (always included, 2 people each)
  let budgetPool = budgetedManHours - (h1 * 2) - (h51 * 2);

  // PM Move Day (5-2) — scale team size down if budget is tight
  const moveDayPMMax = Math.max(1, moveDaySize - 2);
  const moveDayPMActual = Math.min(moveDayPMMax, Math.max(0, Math.floor(budgetPool / h52)));
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
  const preMoveAMMax = Math.max(1, preMoveSize - 2);
  const preMoveActual = budgetPool >= h42 ? Math.min(preMoveAMMax, Math.floor(budgetPool / h42)) : 0;
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

  // Cleanout dates
  const cleanoutDates: string[] = [];
  if (cleanout.enabled) {
    const cleanoutStart = cleanout.startDate
      ? parseISO(cleanout.startDate)
      : addWorkdays(moveDayDate, 2);
    cleanoutDates.push(toISODate(cleanoutStart));
  }

  // Auction dates
  let auctionLotOrg: string | null = null;
  let auctionStart: string | null = null;
  let auctionPickup: string | null = null;
  if (auction.enabled) {
    const lotOrgDate = addWorkdays(moveDayDate, 8);
    auctionLotOrg = toISODate(lotOrgDate);
    const auctionStartDate = (() => {
      let d = addWorkdays(moveDayDate, 10);
      // next Monday on or after
      while (d.getDay() !== 1) d = addDays(d, 1);
      return d;
    })();
    auctionStart = toISODate(auctionStartDate);
    auctionPickup = toISODate(addDays(auctionStartDate, 10));
  }

  const suggestedDates: SuggestedDates = {
    firstVisit: toISODate(firstVisitDate),
    secondVisit: toISODate(secondVisitDate),
    sortDays: sortDates.map(toISODate),
    finalPackDay: toISODate(finalPackDayDate),
    moveDay: toISODate(moveDayDate),
    cleanoutDays: cleanoutDates,
    auctionLotOrg,
    auctionStart,
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
  }

  const tasks: Task[] = [];

  function addPhaseOnDate(
    phaseId: string,
    date: Date,
    teamSizeOverride?: number
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

    const size = teamSizeOverride ?? template.teamSize;
    // Build role list, padding with Specialist if size > template.roles.length
    const roles: Array<{ role: RoleType; isLocked?: boolean }> = [
      ...template.roles,
    ];
    while (roles.length < size) {
      roles.push({ role: 'Specialist' });
    }

    for (const roleSpec of roles.slice(0, size)) {
      tasks.push({
        phaseId,
        phaseName: template.name,
        date: dateStr,
        role: roleSpec.role,
        shift,
        hours: template.hours,
        isLocked: roleSpec.isLocked,
        teamSizeOverride: size,
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

  // Phase 6 – Cleanout (if enabled)
  for (const cd of cleanoutDates) {
    addPhaseOnDate('phase-6', parseISO(cd));
  }

  // Phase 7 – Pickup Day (if auction enabled)
  if (auction.enabled && auctionPickup) {
    addPhaseOnDate('phase-7', parseISO(auctionPickup));
  }

  // ── 5. Assign team members ────────────────────────────────────────────────────

  // Track bookings: memberId → Set<dateStr>
  const bookings: Record<string, Set<string>> = {};
  // Track weekly hours: memberId → weekKey → hours
  const weeklyHours: Record<string, Record<string, number>> = {};
  // Track locked assignments: 'PM' | 'Assist PM' → memberId
  const lockedRoles: Record<string, string> = {};

  function initMember(id: string) {
    if (!bookings[id]) bookings[id] = new Set();
    if (!weeklyHours[id]) weeklyHours[id] = {};
  }

  function getWeekHours(memberId: string, weekKey: string): number {
    return weeklyHours[memberId]?.[weekKey] ?? 0;
  }

  function addWeekHours(memberId: string, weekKey: string, hours: number) {
    initMember(memberId);
    weeklyHours[memberId][weekKey] = (weeklyHours[memberId][weekKey] ?? 0) + hours;
  }

  function isBooked(memberId: string, dateStr: string): boolean {
    return bookings[memberId]?.has(dateStr) ?? false;
  }

  function book(memberId: string, dateStr: string, weekKey: string, hours: number) {
    initMember(memberId);
    bookings[memberId].add(dateStr);
    addWeekHours(memberId, weekKey, hours);
  }

  const entries: ScheduleEntry[] = [];

  for (const task of tasks) {
    const date = parseISO(task.date);
    const dayKey = getDayOfWeekKey(date);
    const weekKey = getWeekKey(task.date);
    const overrideShift = overrideMap[task.date] as AvailabilitySlot | undefined;

    const warnings: string[] = [];
    let assignedMemberId: string | null = null;
    let assignedMemberName: string | null = null;
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
        } else if (isBooked(lockedId, task.date)) {
          // Same day different shift is OK for AM/PM split
          warnings.push(`${member.name} already booked`);
        }

        const wkHours = getWeekHours(lockedId, weekKey);
        const wouldExceed = member.maxHoursPerWeek > 0 && (wkHours + task.hours) > member.maxHoursPerWeek;
        if (wouldExceed) {
          warnings.push(`${member.name} over weekly max`);
          status = status === 'conflict' ? 'conflict' : 'over-max';
        }

        if (status !== 'conflict' && status !== 'over-max') {
          status = 'assigned';
        } else if (status !== 'conflict') {
          status = 'over-max';
        }

        assignedMemberId = lockedId;
        assignedMemberName = member.name;
        // Don't re-book same date – handled below
        if (!isBooked(lockedId, task.date)) {
          book(lockedId, task.date, weekKey, task.hours);
        } else {
          addWeekHours(lockedId, weekKey, task.hours);
        }
      }
    } else {
      // Find best available member
      const qualifyingRoles = getRoleQualifiers(task.role);

      const candidates = teamMembers.filter((m) => {
        // Must have a qualifying phase role for this task's phase
        const phaseRole: MemberPhaseRole | undefined = m.phaseRoles[task.phaseId as PhaseId];
        if (!phaseRole || phaseRole === 'N/A') return false;
        if (!qualifyingRoles.includes(phaseRole as RoleType)) return false;
        return true;
      });

      // Sort: priority first, then by index
      const sorted = [...candidates].sort((a, b) => {
        if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1;
        return teamMembers.indexOf(a) - teamMembers.indexOf(b);
      });

      for (const member of sorted) {
        // Skip if unavailable on this day
        if (!isMemberAvailableForShift(member, date, task.shift, overrideShift)) continue;

        // No double-booking: a person can only be assigned once per day
        if (isBooked(member.id, task.date)) continue;

        const wkHours = getWeekHours(member.id, weekKey);
        const wouldExceed = member.maxHoursPerWeek > 0 && (wkHours + task.hours) > member.maxHoursPerWeek;

        if (wouldExceed) {
          // Flag as over-max but still assign if no better option
          // Record this candidate as fallback
          if (!assignedMemberId) {
            assignedMemberId = member.id;
            assignedMemberName = member.name;
            warnings.push(`${member.name} over weekly max (${wkHours + task.hours} / ${member.maxHoursPerWeek})`);
            status = 'over-max';
          }
          continue; // still try next for a better fit
        }

        // Good fit
        assignedMemberId = member.id;
        assignedMemberName = member.name;
        status = 'assigned';
        warnings.length = 0;
        break;
      }

      if (assignedMemberId) {
        if (!isBooked(assignedMemberId, task.date)) {
          book(assignedMemberId, task.date, weekKey, task.hours);
        } else {
          addWeekHours(assignedMemberId, weekKey, task.hours);
        }

        // Lock PM/Assist PM on first assignment
        if (task.role === 'PM' && !lockedRoles['PM']) {
          lockedRoles['PM'] = assignedMemberId;
        }
        if (task.role === 'Assist PM' && !lockedRoles['Assist PM']) {
          lockedRoles['Assist PM'] = assignedMemberId;
        }
      }
    }

    if (!assignedMemberId) {
      status = 'needs-assignment';
    }

    entries.push({
      id: makeId('entry'),
      date: task.date,
      phaseName: task.phaseName,
      phaseId: task.phaseId,
      role: task.role,
      assignedMember: assignedMemberId,
      assignedMemberName,
      shift: task.shift,
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
      isOverMax: m.maxHoursPerWeek > 0 && memberHoursMap[m.id] > m.maxHoursPerWeek,
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
