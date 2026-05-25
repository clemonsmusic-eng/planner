import { parseISO, addDays } from 'date-fns';
import type {
  ProjectInputs,
  ScheduleResult,
  ScheduleEntry,
  ScheduleDay,
  TeamHoursSummary,
  SuggestedDates,
  RoleType,
  TeamMember,
  AvailabilitySlot,
} from '../types';
import {
  addWorkdays,
  toISODate,
  formatDateLabel,
  getDayOfWeekKey,
  getWeekKey,
} from './dateUtils';
import {
  PHASE_TEMPLATES,
  getPackSortTeamSize,
  getPreMoveTeamSize,
  getMoveDayTeamSize,
  getDensityMultiplier,
  getRoleQualifiers,
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
  teamMembers: TeamMember[]
): ScheduleResult {
  const {
    targetMoveDate,
    earliestStartDate,
    budgetedManHours,
    originSqFt,
    destinationSqFt,
    densityLevel,
    clientTimePreference,
    cleanout,
    auction,
    dateOverrides,
  } = inputs;

  // ── 1. Team sizes (needed for sort day calculation) ──────────────────────────

  const densityMult = getDensityMultiplier(densityLevel);
  // Pack/Sort team size: driven by origin sq ft + density
  const packSortSize = Math.ceil(getPackSortTeamSize(originSqFt) * densityMult);
  // Pre-move and Move Day: driven by destination sq ft + density
  const preMoveSize  = Math.ceil(getPreMoveTeamSize(destinationSqFt) * densityMult);
  const moveDaySize  = Math.ceil(getMoveDayTeamSize(destinationSqFt) * densityMult);

  // ── 2. Compute suggested dates ───────────────────────────────────────────────

  const moveDayDate = parseISO(targetMoveDate);
  const startDate = parseISO(earliestStartDate);

  const firstVisitDate = startDate;
  const secondVisitDate = addWorkdays(firstVisitDate, 3);
  const finalPackDayDate = addWorkdays(moveDayDate, -1);
  const finalSettleDate = addWorkdays(moveDayDate, 2);

  // Fixed hours use DEFAULT (unscaled) team sizes per the spreadsheet formula:
  // First Visit(5) + Second Visit(8) + AM Final Pack(12) + PM Final Pack(3)
  // + AM Move Day(16) + PM Move Day(8) = 52
  const FIXED_HOURS = 52;
  // Sort hours per day = packSortSize × 4 hrs/person
  const sortDayCount = Math.max(1, Math.ceil((budgetedManHours - FIXED_HOURS) / (packSortSize * 4)));

  // Sort starts 2 workdays after secondVisit, every other workday
  const sortStartBase = addWorkdays(secondVisitDate, 2);
  const sortDates: Date[] = [];
  {
    let cur = sortStartBase;
    for (let i = 0; i < sortDayCount; i++) {
      // Ensure sort days don't overlap with final pack day
      if (toISODate(cur) >= toISODate(finalPackDayDate)) break;
      sortDates.push(new Date(cur));
      cur = addWorkdays(cur, 2);
    }
    // If we didn't get enough due to cut-off, still include up to limit
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
    finalSettle: toISODate(finalSettleDate),
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
    const template = PHASE_TEMPLATES.find((p) => p.id === phaseId);
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

  // Phase 1 – First Visit
  addPhaseOnDate('phase-1', firstVisitDate);

  // Phase 2 – Second Visit
  addPhaseOnDate('phase-2', secondVisitDate);

  // Phase 3 – Sort and Pack (multiple days)
  for (const sd of sortDates) {
    addPhaseOnDate('phase-3', sd, packSortSize);
  }

  // Phase 4.1 & 4.2 – Final Pack Pre-Move (day before move)
  // AM is FIXED at 2 (PM + Assist PM); PM scales to preMoveSize - 2 specialists
  addPhaseOnDate('phase-4-1', finalPackDayDate);
  addPhaseOnDate('phase-4-2', finalPackDayDate, Math.max(1, preMoveSize - 2));

  // Phase 5.1 & 5.2 – Move Day
  // AM is FIXED at 2 (PM + Assist PM); PM scales to moveDaySize - 2 specialists
  addPhaseOnDate('phase-5-1', moveDayDate);
  addPhaseOnDate('phase-5-2', moveDayDate, Math.max(1, moveDaySize - 2));

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
        // Must have a qualifying role
        if (!m.roles.some((r) => qualifyingRoles.includes(r as RoleType))) return false;
        // Must not be already used as a locked role if we're not assigning to locked
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

        // Skip if already booked on this date (double-booking check)
        // Exception: AM/PM splits on same day are allowed for different shift tasks
        if (isBooked(member.id, task.date)) {
          // Check if it's an AM/PM split scenario
          const existingEntries = entries.filter(
            (e) => e.date === task.date && e.assignedMember === member.id
          );
          const hasAMBooking = existingEntries.some((e) => e.shift === 'AM');
          const hasPMBooking = existingEntries.some((e) => e.shift === 'PM');
          if (task.shift === 'AM' && hasAMBooking) continue;
          if (task.shift === 'PM' && hasPMBooking) continue;
          if (task.shift === 'Full Day') continue;
        }

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
  if (percentScheduled > 100) scheduleStatus = 'OVER BUDGET';
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
