import { formatDateLabel } from './dateUtils';
import { budgetOf } from './budgets';
import { withRecomputedTotals } from './scheduleEdits';
import type { ImportedShift } from './scheduleImport';
import type {
  AssignmentStatus,
  ManualShift,
  PhaseTemplate,
  Project,
  RoleType,
  ScheduleDay,
  ScheduleEntry,
  ScheduleResult,
  SuggestedDates,
  TeamMember,
} from '../types';

/**
 * Turning reviewed import rows into a plan.
 *
 * The generator builds a schedule out of phases; an imported file has titles.
 * Matching the two up is what makes an import worth doing — an imported "Move
 * Day" that lands on phase-5-1 dates the checklist and fills the Plan tab,
 * while one left as loose text is just a list. Anything that can't be matched
 * still comes in, under a phase of its own, rather than being dropped.
 */

/** Title patterns that name a phase, most specific first. */
const PHASE_KEYWORDS: [RegExp, string][] = [
  [/\bfirst\s+visit|initial\s+visit|walk\s*-?\s*through|assessment|planning\b/i, 'phase-1'],
  [/\bsecond\s+visit\b/i, 'phase-2'],
  [/\blot\s+prep/i, 'phase-lot-prep'],
  [/\bpick\s*-?\s*up\s+prep/i, 'phase-pickup-prep'],
  [/\b(?:auction\s+)?pick\s*-?\s*up\b|\bauction\b/i, 'phase-7'],
  [/\bclean\s*-?\s*out\b/i, 'phase-6'],
  [/\bfinal\s+pack\b|\bpre\s*-?\s*move\b/i, 'phase-4-1'],
  [/\bmove\s+day\b|\bmoving\s+day\b|^\s*move\b/i, 'phase-5-1'],
  [/\bsort\b|\bpack\b/i, 'phase-3'],
];

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * The phase an imported title belongs to, or null when nothing fits.
 *
 * An exact name match against the phase list wins — a file exported from this
 * app names its phases exactly — then the keyword table for everything else.
 */
export function matchPhase(title: string, templates: PhaseTemplate[], shift: 'AM' | 'PM' | 'Full Day'): string | null {
  const wanted = normalize(title);
  if (!wanted) return null;

  const exact = templates.find((t) => normalize(t.name) === wanted);
  if (exact) return exact.id;
  const contained = templates.find((t) => wanted.includes(normalize(t.name)));
  if (contained) return contained.id;

  for (const [pattern, id] of PHASE_KEYWORDS) {
    if (!pattern.test(title)) continue;
    // Move day and final pack come in AM and PM variants; the shift picks one.
    if (id === 'phase-5-1') return shift === 'PM' ? 'phase-5-2' : 'phase-5-1';
    if (id === 'phase-4-1') return shift === 'PM' ? 'phase-4-2' : 'phase-4-1';
    return id;
  }
  return null;
}

/** A stable id for a title the phase list doesn't cover. */
const syntheticPhaseId = (title: string) =>
  `import-${normalize(title).replace(/\s+/g, '-').slice(0, 32) || 'shift'}`;

/**
 * The phase each row will be filed under.
 *
 * Two rows can't share a phase on one date — the whole app keys a shift by
 * (date, phase) — so a collision falls back to a synthetic phase, and a second
 * collision on that gets a numeric suffix. Nothing is silently dropped.
 */
export function assignPhases(
  shifts: ImportedShift[],
  templates: PhaseTemplate[]
): { shift: ImportedShift; phaseId: string; phaseName: string }[] {
  const takenPerDate = new Map<string, Set<string>>();
  const taken = (date: string) => {
    let set = takenPerDate.get(date);
    if (!set) takenPerDate.set(date, (set = new Set()));
    return set;
  };

  return shifts.map((shift) => {
    const matched = matchPhase(shift.title, templates, shift.shift);
    const used = taken(shift.date);
    let phaseId = matched && !used.has(matched) ? matched : syntheticPhaseId(shift.title);
    for (let n = 2; used.has(phaseId); n++) phaseId = `${syntheticPhaseId(shift.title)}-${n}`;
    used.add(phaseId);

    const template = templates.find((t) => t.id === phaseId);
    return { shift, phaseId, phaseName: template?.name ?? shift.title };
  });
}

const emptySuggestedDates = (): SuggestedDates => ({
  firstVisit: '',
  secondVisit: '',
  sortDays: [],
  finalPackDay: '',
  moveDay: '',
  cleanoutDays: [],
  lotPrepDays: [],
  auctionLotOrg: null,
  auctionStart: null,
  auctionPickupPrep: null,
  auctionPickup: null,
});

const emptySchedule = (): ScheduleResult => ({
  days: [],
  totalScheduledHours: 0,
  remainingHours: 0,
  percentScheduled: 0,
  status: 'UNDER SCHEDULED',
  teamHours: [],
  lockedPM: null,
  lockedAssistPM: null,
  suggestedDates: emptySuggestedDates(),
});

let seq = 0;
const entryId = () => `entry-import-${Date.now().toString(36)}-${seq++}`;

/**
 * The crew rows for one imported shift.
 *
 * A name is matched to a team member so the hours land on the right person;
 * one that matches nobody is still carried, as an unassigned slot labelled
 * with the name that was read, so it shows up as something to fix rather than
 * quietly disappearing. A shift with no names at all gets one open slot.
 */
function entriesFor(
  shift: ImportedShift,
  phaseId: string,
  phaseName: string,
  teamMembers: TeamMember[]
): ScheduleEntry[] {
  const base = {
    date: shift.date,
    phaseId,
    phaseName,
    shift: shift.shift,
    hours: shift.hours,
    warnings: [] as string[],
  };

  if (shift.crew.length === 0) {
    return [
      {
        ...base,
        id: entryId(),
        role: 'Specialist' as RoleType,
        assignedMember: null,
        assignedMemberName: null,
        status: 'needs-assignment' as AssignmentStatus,
      },
    ];
  }

  return shift.crew.map(({ name, role }) => {
    const member = teamMembers.find((m) => m.name.toLowerCase() === name.toLowerCase());
    return {
      ...base,
      id: entryId(),
      role,
      assignedMember: member?.id ?? null,
      assignedMemberName: member?.name ?? null,
      status: (member ? 'assigned' : 'needs-assignment') as AssignmentStatus,
      warnings: member ? [] : [`"${name}" is not on the team list`],
    };
  });
}

export interface ApplyImportResult {
  project: Project;
  /** Rows that could not be added because that shift was already scheduled. */
  skipped: ImportedShift[];
}

/**
 * Write reviewed rows into a project.
 *
 * Merging rather than replacing: an import into a project that already has a
 * plan adds to it, and a shift already scheduled on that date is left exactly
 * as it is. Replacing what is there is not something an import should decide.
 */
export function applyImport(
  project: Project,
  shifts: ImportedShift[],
  templates: PhaseTemplate[],
  teamMembers: TeamMember[]
): ApplyImportResult {
  const schedule = project.schedule ?? emptySchedule();
  const existing = new Map<string, Set<string>>();
  for (const day of schedule.days) {
    existing.set(day.date, new Set(day.entries.map((e) => e.phaseId)));
  }

  const skipped: ImportedShift[] = [];
  const added: ManualShift[] = [];
  const byDate = new Map<string, ScheduleEntry[]>();

  for (const { shift, phaseId, phaseName } of assignPhases(shifts, templates)) {
    if (existing.get(shift.date)?.has(phaseId)) {
      skipped.push(shift);
      continue;
    }
    const entries = entriesFor(shift, phaseId, phaseName, teamMembers);
    byDate.set(shift.date, [...(byDate.get(shift.date) ?? []), ...entries]);
    added.push({
      date: shift.date,
      phaseId,
      phaseName,
      shift: shift.shift,
      hours: shift.hours,
      roles: entries.map((e) => e.role),
    });
  }

  let days: ScheduleDay[] = schedule.days.map((d) => ({ ...d, entries: [...d.entries] }));
  for (const [date, entries] of byDate) {
    const day = days.find((d) => d.date === date);
    if (day) day.entries.push(...entries);
    else days.push({ date, label: formatDateLabel(date), entries });
  }
  days = days.sort((a, b) => a.date.localeCompare(b.date));

  const notes = [...(project.inputs.shiftNotes ?? [])];
  for (const { shift, phaseId } of assignPhases(shifts, templates)) {
    const note = shift.note.trim();
    if (!note || skipped.includes(shift)) continue;
    if (notes.some((n) => n.phaseId === phaseId && n.date === shift.date)) continue;
    notes.push({ phaseId, date: shift.date, note });
  }

  const inputs = {
    ...project.inputs,
    // Recorded as hand-added shifts, which is what they are — so regenerating
    // the plan replays the import rather than throwing it away.
    addedShifts: [...(project.inputs.addedShifts ?? []), ...added],
    shiftNotes: notes,
  };

  return {
    project: {
      ...project,
      inputs,
      schedule: withRecomputedTotals(schedule, days, teamMembers, budgetOf(inputs)),
      updatedAt: new Date().toISOString(),
    },
    skipped,
  };
}
