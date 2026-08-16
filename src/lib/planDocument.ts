import { formatDateLabel, shiftTimeRange } from './dateUtils';
import { BUDGET_POOLS, poolBudget, poolScheduled, totalBudgetedHours } from './budgets';
import type { DocBlock, DocumentModel } from './docModel';
import type {
  Project,
  ProjectInputs,
  RoleType,
  ScheduleResult,
  ServiceCategory,
  ShiftTimeSettings,
  TeamMember,
} from '../types';

/**
 * The Plan tab as a document — the same content the tab shows, in the order it
 * shows it, described in format-neutral blocks so PDF and .docx render the one
 * definition rather than each building their own from the project.
 */

const dash = (v: string | number | null | undefined): string =>
  v === null || v === undefined || v === '' ? '-' : String(v);

const hours = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** Which shift a date is worked, read off the schedule so hand edits count. */
function shiftOn(schedule: ScheduleResult, date: string): 'AM' | 'PM' | 'Full Day' | 'AM/PM' | null {
  const entries = schedule.days.find((d) => d.date === date)?.entries ?? [];
  if (entries.length === 0) return null;
  const shifts = new Set(entries.map((e) => e.shift));
  if (shifts.has('Full Day')) return 'Full Day';
  if (shifts.has('AM') && shifts.has('PM')) return 'AM/PM';
  return shifts.has('AM') ? 'AM' : shifts.has('PM') ? 'PM' : null;
}

/**
 * Notes written against the shifts on a date.
 *
 * Matched on the phases actually scheduled then, the same way the Plan tab
 * does it, so a note left on a shift that has since moved doesn't stay behind
 * on the date the shift used to be on.
 */
function notesOn(schedule: ScheduleResult, inputs: ProjectInputs, date: string): string {
  const phaseIds = new Set((schedule.days.find((d) => d.date === date)?.entries ?? []).map((e) => e.phaseId));
  return (inputs.shiftNotes ?? [])
    .filter((n) => n.date === date && phaseIds.has(n.phaseId))
    .map((n) => n.note.trim())
    .filter(Boolean)
    .join(' — ');
}

/** The milestone list, in the order the Plan tab shows it. */
function dateRows(
  schedule: ScheduleResult,
  inputs: ProjectInputs,
  shiftTimes: ShiftTimeSettings
): string[][] {
  const s = schedule.suggestedDates;
  const items: { label: string; date: string }[] = [
    { label: 'First Visit', date: s.firstVisit },
    { label: 'Second Visit', date: s.secondVisit },
    ...s.sortDays.map((d, i) => ({ label: `Sort & Pack Day ${i + 1}`, date: d })),
    { label: 'Final Pack Day', date: s.finalPackDay },
    { label: 'Move Day', date: s.moveDay },
    ...s.cleanoutDays.map((d, i) => ({
      label: s.cleanoutDays.length > 1 ? `Cleanout Day ${i + 1}` : 'Cleanout Day',
      date: d,
    })),
    ...(s.lotPrepDays ?? []).map((d, i) => ({
      label: (s.lotPrepDays ?? []).length > 1 ? `Lot Prep Day ${i + 1}` : 'Lot Prep Day',
      date: d,
    })),
    ...(s.auctionStart ? [{ label: 'Auction Start', date: s.auctionStart }] : []),
    ...(s.auctionPickupPrep ? [{ label: 'Pickup Prep Day', date: s.auctionPickupPrep }] : []),
    ...(s.auctionPickup ? [{ label: 'Pickup Day', date: s.auctionPickup }] : []),
  ].filter((i) => i.date);

  return items.map(({ label, date }) => {
    const slot = shiftOn(schedule, date);
    const entries = schedule.days.find((d) => d.date === date)?.entries ?? [];
    // One window per shift on the date. A day running both an AM and a PM
    // shift — move day, usually — states both rather than neither.
    const window = [...new Map(entries.map((e) => [e.shift, e])).values()]
      .map((e) => shiftTimeRange(e.shift, e.hours, shiftTimes))
      .filter(Boolean)
      .join(', ');
    return [label, formatDateLabel(date), slot ?? '-', window || '-', notesOn(schedule, inputs, date) || '-'];
  });
}

/** Move day's crew, named off the day itself rather than the locked picks. */
function moveDayCrew(schedule: ScheduleResult, teamMembers: TeamMember[], moveDate: string) {
  const entries = schedule.days.find((d) => d.date === moveDate)?.entries ?? [];
  const nameFor = (role: RoleType): string => {
    const onDay = entries.find((e) => e.role === role && e.assignedMemberName)?.assignedMemberName;
    if (onDay) return onDay;
    const locked = role === 'PM' ? schedule.lockedPM : role === 'Assist PM' ? schedule.lockedAssistPM : null;
    return locked ? teamMembers.find((m) => m.id === locked)?.name ?? 'TBD' : 'TBD';
  };
  const specialists = entries
    .filter((e) => e.role === 'Specialist' && e.assignedMemberName)
    .map((e) => e.assignedMemberName!)
    .filter((v, i, arr) => arr.indexOf(v) === i);
  return { pm: nameFor('PM'), assistPm: nameFor('Assist PM'), specialists, size: entries.length };
}

export function buildPlanDocument(
  project: Project,
  schedule: ScheduleResult,
  teamMembers: TeamMember[],
  serviceCatalog: ServiceCategory[],
  shiftTimes: ShiftTimeSettings
): DocumentModel {
  const { inputs } = project;
  const client = inputs.clientName || 'Untitled project';
  const moveDate = schedule.suggestedDates.moveDay || inputs.targetMoveDate;
  const pmName = inputs.projectManagerId
    ? teamMembers.find((m) => m.id === inputs.projectManagerId)?.name ?? 'Unassigned'
    : 'Unassigned';

  const blocks: DocBlock[] = [];

  // ── Project ──────────────────────────────────────────────────────────────
  blocks.push({ kind: 'heading', text: 'Project' });
  blocks.push({
    kind: 'fields',
    rows: [
      ['Client', dash(client)],
      ['Community', dash(inputs.community)],
      ['Project Type', dash(inputs.moveType)],
      ['Project Manager', pmName],
      ['Origin', dash(inputs.originAddress)],
      ['Destination', dash(inputs.destinationAddress)],
      ['Target Move Date', inputs.targetMoveDate ? formatDateLabel(inputs.targetMoveDate) : '-'],
      ['Status', dash(inputs.status)],
    ],
  });

  // ── Dates ────────────────────────────────────────────────────────────────
  blocks.push({ kind: 'heading', text: 'Dates' });
  const dates = dateRows(schedule, inputs, shiftTimes);
  if (dates.length === 0) {
    blocks.push({ kind: 'paragraph', text: 'No dates scheduled yet.', muted: true });
  } else {
    blocks.push({
      kind: 'table',
      columns: [
        { header: 'Milestone', weight: 20 },
        { header: 'Date', weight: 20 },
        { header: 'Shift', weight: 9, align: 'center' },
        { header: 'Time', weight: 19 },
        { header: 'Notes', weight: 32 },
      ],
      rows: dates,
    });
  }

  // ── Services Contracted ──────────────────────────────────────────────────
  blocks.push({ kind: 'heading', text: 'Services Contracted' });
  const selected = new Set(inputs.contractedServices ?? []);
  const groups = serviceCatalog
    .map(({ category, services }) => ({ label: category, items: services.filter((s) => selected.has(s)) }))
    .filter((g) => g.items.length > 0);
  if (groups.length === 0) {
    blocks.push({ kind: 'paragraph', text: 'No services selected.', muted: true });
  } else {
    blocks.push({ kind: 'bullets', groups });
  }

  // ── Move Day Snapshot ────────────────────────────────────────────────────
  blocks.push({ kind: 'heading', text: 'Move Day Snapshot' });
  const crew = moveDayCrew(schedule, teamMembers, moveDate);
  blocks.push({
    kind: 'fields',
    rows: [
      ['Date', moveDate ? formatDateLabel(moveDate) : '-'],
      ['PM', crew.pm],
      ['Assist PM', crew.assistPm],
      ['Specialists', crew.specialists.length > 0 ? crew.specialists.join(', ') : '-'],
      ['Total Team', `${crew.size} member${crew.size === 1 ? '' : 's'}`],
    ],
  });

  // ── Project Hourly Budget ────────────────────────────────────────────────
  blocks.push({ kind: 'heading', text: 'Project Hourly Budget' });
  const budgeted = totalBudgetedHours(inputs.phaseBudgets);
  blocks.push({
    kind: 'fields',
    rows: [
      ['Status', schedule.status],
      ['Scheduled', `${hours(schedule.totalScheduledHours)} hrs`],
      ['Budget', `${hours(budgeted)} hrs`],
      [
        'Remaining',
        `${schedule.remainingHours < 0 ? '-' : '+'}${hours(Math.abs(schedule.remainingHours))} hrs`,
      ],
      ['Scheduled vs Budget', `${Math.round(schedule.percentScheduled)}%`],
    ],
  });
  blocks.push({
    kind: 'table',
    columns: [
      { header: 'Allowance', weight: 46 },
      { header: 'Scheduled', weight: 18, align: 'center' },
      { header: 'Budget', weight: 18, align: 'center' },
      { header: 'Remaining', weight: 18, align: 'center' },
    ],
    rows: BUDGET_POOLS.map(({ pool, label }) => {
      const budget = poolBudget(inputs.phaseBudgets, pool);
      const used = poolScheduled(schedule, pool);
      return [
        label,
        hours(used),
        budget > 0 ? hours(budget) : '-',
        budget > 0 ? `${budget - used < 0 ? '-' : '+'}${hours(Math.abs(budget - used))}` : '-',
      ];
    }),
  });

  // ── Team Hours ───────────────────────────────────────────────────────────
  blocks.push({ kind: 'heading', text: 'Team Hours' });
  if (schedule.teamHours.length === 0) {
    blocks.push({ kind: 'paragraph', text: 'Nobody is assigned yet.', muted: true });
  } else {
    blocks.push({
      kind: 'table',
      columns: [
        { header: 'Team Member', weight: 70 },
        { header: 'Hours on this project', weight: 30, align: 'center' },
      ],
      rows: [...schedule.teamHours]
        .sort((a, b) => b.scheduledHours - a.scheduledHours)
        .map((t) => [t.memberName, hours(t.scheduledHours)]),
    });
  }

  return {
    title: `${client} — Plan`,
    subtitle: [inputs.community, inputs.moveType, moveDate ? `Move ${formatDateLabel(moveDate)}` : null]
      .filter(Boolean)
      .join('  ·  '),
    blocks,
  };
}

/** A filename stem safe on every platform, e.g. "Smith-Move-Plan". */
export function planFileStem(project: Project): string {
  const base = (project.inputs.clientName || 'project').trim();
  return `${base.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project'}-Plan`;
}
