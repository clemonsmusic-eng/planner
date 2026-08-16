import { formatDateLabel, shiftTimeRange } from './dateUtils';
import { BUDGET_POOLS, poolBudget, poolScheduled, totalBudgetedHours } from './budgets';
import { resolveContact } from './contacts';
import type { DocBlock, DocumentModel } from './docModel';
import type {
  CrmContact,
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

/**
 * The sections a Plan document can be built from, in the order they appear.
 *
 * Exported so the export sheet can offer them by name without keeping its own
 * copy of the list — a section added here shows up as a tick box on its own.
 */
export const PLAN_SECTIONS: { key: string; label: string; hint: string }[] = [
  { key: 'project', label: 'Project details', hint: 'Client, community, PM, addresses' },
  { key: 'dates', label: 'Dates', hint: 'Every milestone, its shift and its notes' },
  { key: 'services', label: 'Services contracted', hint: 'What the client is paying for' },
  { key: 'contacts', label: 'Project contacts', hint: 'Communities, movers and disposal firms' },
  { key: 'moveDay', label: 'Move day snapshot', hint: 'Who is on move day' },
  { key: 'budget', label: 'Project hourly budget', hint: 'Scheduled against each allowance' },
  { key: 'teamHours', label: 'Team hours', hint: 'Hours per person on this project' },
];

export const ALL_PLAN_SECTIONS = new Set(PLAN_SECTIONS.map((s) => s.key));

export function buildPlanDocument(
  project: Project,
  schedule: ScheduleResult,
  teamMembers: TeamMember[],
  serviceCatalog: ServiceCategory[],
  shiftTimes: ShiftTimeSettings,
  crmContacts: CrmContact[],
  sections: Set<string> = ALL_PLAN_SECTIONS
): DocumentModel {
  const { inputs } = project;
  const client = inputs.clientName || 'Untitled project';
  const moveDate = schedule.suggestedDates.moveDay || inputs.targetMoveDate;
  const pmName = inputs.projectManagerId
    ? teamMembers.find((m) => m.id === inputs.projectManagerId)?.name ?? 'Unassigned'
    : 'Unassigned';

  const dates = dateRows(schedule, inputs, shiftTimes);
  const crew = moveDayCrew(schedule, teamMembers, moveDate);
  const budgeted = totalBudgetedHours(inputs.phaseBudgets);
  const selected = new Set(inputs.contractedServices ?? []);
  // Contacts link to the CRM, so what a row says has to be looked up. A link
  // whose entry has gone is left out rather than printed as an empty line.
  const contactRows = (inputs.contacts ?? [])
    .map((row) => resolveContact(row, crmContacts))
    .filter((r) => !r.missing)
    .map(({ details }) => [
      dash(details.contactType),
      dash(details.company),
      dash(details.name),
      [details.workPhone, details.cellPhone].filter(Boolean).join(' / ') || '-',
      dash(details.email),
    ]);

  const serviceGroups = serviceCatalog
    .map(({ category, services }) => ({ label: category, items: services.filter((s) => selected.has(s)) }))
    .filter((g) => g.items.length > 0);

  /*
   * Each section is built whole and filed under its key, then only the chosen
   * ones are laid end to end. Building them separately is what lets the export
   * sheet leave one out without every section growing a condition around it.
   */
  const bySection: Record<string, DocBlock[]> = {
    project: [
      { kind: 'heading', text: 'Project' },
      {
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
      },
    ],

    dates: [
      { kind: 'heading', text: 'Dates' },
      dates.length === 0
        ? { kind: 'paragraph', text: 'No dates scheduled yet.', muted: true }
        : {
            kind: 'table',
            columns: [
              { header: 'Milestone', weight: 20 },
              { header: 'Date', weight: 20 },
              { header: 'Shift', weight: 9, align: 'center' },
              { header: 'Time', weight: 19 },
              { header: 'Notes', weight: 32 },
            ],
            rows: dates,
          },
    ],

    services: [
      { kind: 'heading', text: 'Services Contracted' },
      serviceGroups.length === 0
        ? { kind: 'paragraph', text: 'No services selected.', muted: true }
        : { kind: 'bullets', groups: serviceGroups },
    ],

    contacts: [
      { kind: 'heading', text: 'Project Contacts' },
      contactRows.length === 0
        ? { kind: 'paragraph', text: 'No contacts on this project.', muted: true }
        : {
            kind: 'table',
            columns: [
              { header: 'Type', weight: 18 },
              { header: 'Company', weight: 22 },
              { header: 'Contact', weight: 18 },
              { header: 'Phone', weight: 21 },
              { header: 'E-mail', weight: 21 },
            ],
            rows: contactRows,
          },
    ],

    moveDay: [
      { kind: 'heading', text: 'Move Day Snapshot' },
      {
        kind: 'fields',
        rows: [
          ['Date', moveDate ? formatDateLabel(moveDate) : '-'],
          ['PM', crew.pm],
          ['Assist PM', crew.assistPm],
          ['Specialists', crew.specialists.length > 0 ? crew.specialists.join(', ') : '-'],
          ['Total Team', `${crew.size} member${crew.size === 1 ? '' : 's'}`],
        ],
      },
    ],

    budget: [
      { kind: 'heading', text: 'Project Hourly Budget' },
      {
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
      },
      {
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
      },
    ],

    teamHours: [
      { kind: 'heading', text: 'Team Hours' },
      schedule.teamHours.length === 0
        ? { kind: 'paragraph', text: 'Nobody is assigned yet.', muted: true }
        : {
            kind: 'table',
            columns: [
              { header: 'Team Member', weight: 70 },
              { header: 'Hours on this project', weight: 30, align: 'center' },
            ],
            rows: [...schedule.teamHours]
              .sort((a, b) => b.scheduledHours - a.scheduledHours)
              .map((t) => [t.memberName, hours(t.scheduledHours)]),
          },
    ],
  };

  return {
    title: `${client} — Plan`,
    subtitle: [inputs.community, inputs.moveType, moveDate ? `Move ${formatDateLabel(moveDate)}` : null]
      .filter(Boolean)
      .join('  ·  '),
    blocks: PLAN_SECTIONS.filter((s) => sections.has(s.key)).flatMap((s) => bySection[s.key]),
  };
}

/** A filename stem safe on every platform, e.g. "Smith-Move-Plan". */
export function planFileStem(project: Project): string {
  const base = (project.inputs.clientName || 'project').trim();
  return `${base.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project'}-Plan`;
}

/**
 * The client-facing document.
 *
 * Deliberately not a subset of the internal one. A client is told what is
 * happening and when — the project, where it is, when the move is, and the
 * dates and times a crew will be there. Everything else the internal document
 * carries is the office's working detail: what it costs, how the hours are
 * budgeted, who is on which shift, what was written on a job note.
 */
export function buildClientDocument(
  project: Project,
  schedule: ScheduleResult,
  shiftTimes: ShiftTimeSettings
): DocumentModel {
  const { inputs } = project;
  const client = inputs.clientName || 'Untitled project';
  const moveDate = schedule.suggestedDates.moveDay || inputs.targetMoveDate;

  // One row per shift, so a day running an AM and a PM crew states both.
  const rows: string[][] = [];
  for (const day of schedule.days) {
    const seen = new Set<string>();
    for (const entry of day.entries) {
      if (seen.has(entry.phaseId)) continue;
      seen.add(entry.phaseId);
      rows.push([
        formatDateLabel(day.date),
        entry.phaseName,
        entry.shift,
        shiftTimeRange(entry.shift, entry.hours, shiftTimes).split('–')[0].trim(),
      ]);
    }
  }

  return {
    title: client,
    subtitle: [inputs.community, moveDate ? `Move ${formatDateLabel(moveDate)}` : null]
      .filter(Boolean)
      .join('  ·  '),
    blocks: [
      {
        kind: 'fields',
        rows: [
          ['Project', client],
          ['Community', dash(inputs.community)],
          ['Move Date', moveDate ? formatDateLabel(moveDate) : '-'],
        ],
      },
      { kind: 'heading', text: 'Schedule' },
      rows.length === 0
        ? { kind: 'paragraph', text: 'No dates scheduled yet.', muted: true }
        : {
            kind: 'table',
            columns: [
              { header: 'Date', weight: 34 },
              { header: 'Shift', weight: 36 },
              { header: 'Type', weight: 14, align: 'center' },
              { header: 'Start', weight: 16, align: 'center' },
            ],
            rows,
          },
    ],
  };
}
