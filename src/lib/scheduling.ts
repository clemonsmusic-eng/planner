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
  PhaseBudgetHours,
} from '../types';
import {
  addWorkdays,
  toISODate,
  formatDateLabel,
  getDayOfWeekKey,
  getWeekKey,
} from './dateUtils';
import { getRoleQualifiers } from './data';
import { poolBudget, totalBudgetedHours } from './budgets';

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

// ─── Suggested dates from an edited schedule ──────────────────────────────────

/**
 * Re-read the plan milestones off the schedule's own entries.
 *
 * `generateSchedule` produces `suggestedDates` alongside the days, but hand
 * edits on the Schedule tab — moving a shift, adding one, deleting the last
 * role of a phase — change the days without going back through the generator.
 * The checklist dates itself from these milestones, so they have to be
 * rederived after every edit or the checklist keeps showing the plan as it was
 * first generated.
 *
 * Phases that no longer appear resolve to empty rather than keeping their old
 * value: a milestone with no shift behind it isn't a date any more, and the
 * checklist renders that as "no date". The two auction milestones that have no
 * phase of their own (lot organization and auction start) are carried forward,
 * since nothing in the days could tell us about them.
 */
export function deriveSuggestedDates(days: ScheduleDay[], previous: SuggestedDates): SuggestedDates {
  const datesFor = (phaseId: string): string[] =>
    [...new Set(days.filter((d) => d.entries.some((e) => e.phaseId === phaseId)).map((d) => d.date))].sort();

  const first = (phaseId: string): string => datesFor(phaseId)[0] ?? '';

  return {
    firstVisit: first('phase-1'),
    secondVisit: first('phase-2'),
    sortDays: datesFor('phase-3'),
    finalPackDay: first('phase-4-1') || first('phase-4-2'),
    moveDay: first('phase-5-1') || first('phase-5-2'),
    cleanoutDays: datesFor('phase-6'),
    lotPrepDays: datesFor('phase-lot-prep'),
    auctionLotOrg: previous.auctionLotOrg,
    auctionStart: previous.auctionStart,
    auctionPickupPrep: first('phase-pickup-prep') || null,
    auctionPickup: first('phase-7') || null,
  };
}

// ─── Main Scheduling Function ─────────────────────────────────────────────────

// memberId → dateStr → shift already committed in a prior project
export type ExternalBookings = Record<string, Record<string, 'AM' | 'PM' | 'Full Day'>>;

const AUCTION_MIN_PER_LOT: Record<string, number> = { High: 13, Average: 18, Low: 25 };
const AUCTION_PICKUP_TEAM_SIZE = 4;
const AUCTION_PICKUP_HOURS = 8;
const AUCTION_PREP_TEAM_SIZE = 3;

/**
 * Hours the dispersal allowance leaves for lot prep, once the auction's fixed
 * pickup commitments are covered.
 *
 * Exported so the Inputs tab can say why a lot count larger than the budget
 * won't all be scheduled, using the same arithmetic the generator uses rather
 * than a second copy of it.
 */
export function lotPrepAllowance(
  phaseBudgets: PhaseBudgetHours,
  phaseTemplates: PhaseTemplate[],
  auctionEnabled: boolean
): number {
  if (!auctionEnabled) return poolBudget(phaseBudgets, 'dispersal');
  const prep = phaseTemplates.find((t) => t.id === 'phase-pickup-prep');
  const fixed =
    AUCTION_PICKUP_HOURS * AUCTION_PICKUP_TEAM_SIZE +
    (prep?.minHours ?? 3) * (prep?.minTeamSize ?? 3);
  return Math.max(0, poolBudget(phaseBudgets, 'dispersal') - fixed);
}

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
    phaseBudgets,
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

  // What the lot count says the auction prep is worth, before any budget.
  const auctionEstHoursRaw: number = (() => {
    if (!auction.enabled || cleanout.type !== 'Full - Auction' || !auction.lotCount || auction.lotCount <= 0) return 0;
    const minPerLot = AUCTION_MIN_PER_LOT[auctionSettings?.performanceLevel ?? 'Average'] ?? 18;
    return Math.round((auction.lotCount * minPerLot) / 60 * 10) / 10;
  })();

  // ── Budget-aware phase inclusion ────────────────────────────────────────────
  // Priority order: Phase 1 (required) → Phase 5-1 (required) → Phase 5-2
  // → Phase 2 → Phase 4-1 → Sort days (budget-scaled) → Phase 4-2 (last resort)

  // Required: Phase 1 + AM Move Day (always included, 2 people each).
  // The auction phases used to be deducted here too, back when one pool paid
  // for everything; they now spend from the dispersal allowance instead.
  /*
   * Each group of phases spends from its own allowance, so a long cleanout can
   * no longer quietly eat the hours that were sold for packing. Planning and
   * packing share one pool: they are priced separately on the quote, but moving
   * an hour between the first visit and a sort day is a scheduling call.
   */
  let packPool = poolBudget(phaseBudgets, 'pack') - (h1 * 2);
  let movePool = poolBudget(phaseBudgets, 'move') - (h51 * 2);
  /*
   * The dispersal allowance is not deducted here and does not gate anything.
   * How much cleanout there is comes from the cleanout type and the lot count,
   * not from an hours figure, so an allowance can only report on that work, not
   * shrink it — the Plan tab shows scheduled against budget per pool. What
   * matters is that these hours no longer come out of the packing pool, which
   * is what used to let a big auction quietly eat the packing that was sold.
   */

  // PM Move Day (5-2) — its own allowance has to cover a full crew, since a
  // phase can't run below its minimum team size however tight the budget is.
  const moveDayPMActual = movePool >= h52 * moveDaySize ? moveDaySize : 0;
  movePool -= moveDayPMActual * h52;

  // Second Visit (Phase 2) — include if the packing allowance covers it
  const includePhase2 = packPool >= h2 * 2;
  if (includePhase2) packPool -= h2 * 2;

  // AM Final Pack (Phase 4-1) — include if the packing allowance covers it
  const includePhase41 = packPool >= h41 * 2;
  if (includePhase41) packPool -= h41 * 2;

  // Sort days — fill remaining budget, scale team size to fit
  let sortDayCount = 0;
  let actualSortTeamSize = 0;
  /*
   * Sort days fill what's left of the packing allowance.
   *
   * The crew can't be scaled below the phase's minimum team size — addPhaseOnDate
   * clamps it back up, and you can't send one person on a two-person job — so the
   * day count is what flexes. Rounding the days up and the crew down, as this
   * used to, budgeted for a crew that never turned up: a 100-hour allowance
   * bought 102 hours of work, and a 30-hour one bought 38.
   */
  const sortDayHours = packSortSize * h3;
  if (packPool >= sortDayHours) {
    actualSortTeamSize = packSortSize;
    sortDayCount = Math.floor(packPool / sortDayHours);
    packPool -= sortDayCount * sortDayHours;
  }

  // PM Final Pack (Phase 4-2) — lowest priority, and likewise all-or-nothing:
  // budgeting for a half crew just meant overspending by the other half.
  const preMoveActual = packPool >= h42 * preMoveSize ? preMoveSize : 0;
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

  /*
   * Cleanout is sized by its budget rather than by a toggle and a template.
   *
   * The dispersal allowance is what was sold, so it decides both whether there
   * is a cleanout at all and how much of one: hours left after any auction
   * commitments are spread over as many days as it takes at the phase's own
   * daily maximum. No hours, no cleanout.
   */
  /*
   * The dispersal allowance, spent in priority order.
   *
   * Pickup day and its prep are fixed: if there is an auction, the buyers turn
   * up on a date and a crew has to be there, so they are a floor in the same way
   * AM Move Day is. Lot prep is the part that flexes — the lot count says what
   * it is worth, but the allowance says what was sold, so it takes the smaller
   * of the two. Cleanout then gets whatever is left.
   *
   * Without this cap a big lot count quietly booked days nobody had paid for:
   * 300 lots at 18 min each is 90 hours of prep against a 40-hour allowance.
   */
  const dispersalPool = poolBudget(phaseBudgets, 'dispersal');
  const auctionPickupHours = auction.enabled ? AUCTION_PICKUP_HOURS * AUCTION_PICKUP_TEAM_SIZE : 0;
  const pickupPrepTemplate = phaseTemplates.find((t) => t.id === 'phase-pickup-prep');
  const auctionPickupPrepHours = auction.enabled
    ? (pickupPrepTemplate?.minHours ?? 3) * (pickupPrepTemplate?.minTeamSize ?? 3)
    : 0;

  const lotPrepBudget = Math.max(0, dispersalPool - auctionPickupHours - auctionPickupPrepHours);
  const auctionEstHours = Math.min(auctionEstHoursRaw, lotPrepBudget);
  const cleanoutBudget = Math.max(0, lotPrepBudget - auctionEstHours);
  const cleanoutTeam = templateSize('phase-6', 2);
  const cleanoutMaxPerPerson = phaseTemplates.find((t) => t.id === 'phase-6')?.maxHours ?? 6;

  const cleanoutDates: string[] = [];
  let cleanoutHoursPerPerson = 0;
  if (cleanoutBudget > 0 && cleanoutTeam > 0) {
    const perDay = cleanoutTeam * cleanoutMaxPerPerson;
    // Half-hours are the finest granularity the rest of the app shows, so the
    // per-person figure is floored to one: rounding it up bought hours the
    // allowance didn't have. Day count is capped at what the budget can pay for
    // at that minimum, so a small allowance means fewer days, not free ones.
    const affordableDays = Math.floor(cleanoutBudget / (cleanoutTeam * 0.5));
    if (affordableDays >= 1) {
      const dayCount = Math.min(Math.max(1, Math.ceil(cleanoutBudget / perDay)), affordableDays);
      cleanoutHoursPerPerson = Math.max(
        0.5,
        Math.floor((cleanoutBudget / (dayCount * cleanoutTeam)) * 2) / 2
      );
      let cur = cleanout.startDate ? parseISO(cleanout.startDate) : addWorkdays(moveDayDate, 2);
      for (let i = 0; i < dayCount; i++) {
        cleanoutDates.push(toISODate(cur));
        cur = addWorkdays(cur, 1);
      }
    }
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

  // Phase 6 – Cleanout, as many days as its budget buys
  for (const dateStr of cleanoutDates) {
    addPhaseOnDate('phase-6', parseISO(dateStr), cleanoutTeam, cleanoutHoursPerPerson);
  }

  // Lot Prep – auction only, driven by auction estimate
  for (const lp of lotPrepSchedule) {
    addPhaseOnDate('phase-lot-prep', parseISO(lp.date), lp.teamSizeOverride, lp.hoursPerPerson);
  }

  // Pickup Prep Day – 1 day before auction pickup
  if (auction.enabled && auctionPickupPrep) {
    addPhaseOnDate(
      'phase-pickup-prep',
      parseISO(auctionPickupPrep),
      phaseTemplates.find((t) => t.id === 'phase-pickup-prep')?.minTeamSize
    );
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

  // Replay the hand edits made on the Schedule tab. Without this a regenerate —
  // which any date move triggers — would drop shifts the user added and bring
  // back ones they deleted. Additions come first so a later deletion of one of
  // them still lands; both are matched on phase + date, after the moves above.
  for (const added of inputs.addedShifts ?? []) {
    for (const role of added.roles) {
      tasks.push({
        phaseId: added.phaseId,
        phaseName: added.phaseName,
        date: added.date,
        role,
        shift: added.shift,
        hours: added.hours,
        shiftFlexible: false,
      });
    }
  }

  const removedShifts = inputs.removedShifts ?? [];
  if (removedShifts.length > 0) {
    for (let i = tasks.length - 1; i >= 0; i--) {
      const t = tasks[i];
      if (removedShifts.some((r) => r.phaseId === t.phaseId && r.date === t.date)) {
        tasks.splice(i, 1);
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
  const budgetedManHours = totalBudgetedHours(phaseBudgets);
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
