import { deriveSuggestedDates } from './scheduling';
import { budgetOf } from './budgets';
import { formatDateLabel } from './dateUtils';
import type {
  AssignmentStatus,
  ManualShift,
  Project,
  RoleType,
  ScheduleDay,
  ScheduleEntry,
  ScheduleResult,
  TeamMember,
} from '../types';

/**
 * Edits to a generated schedule, as pure functions on a project.
 *
 * These used to live inside the reducer, which meant an edit could only ever be
 * applied to committed state. The Schedule tab now works on a draft and commits
 * on Save, so the same transforms have to run against something that isn't in
 * the store yet — and the reducer still needs them for the Calendar tab, where
 * a drag applies straight away. One implementation, two callers.
 */

export type ScheduleEdit =
  | { kind: 'assignMember'; entryId: string; memberId: string | null; memberName: string | null }
  | { kind: 'addRole'; date: string; phaseId: string; role: RoleType }
  | { kind: 'removeRole'; entryId: string }
  | { kind: 'addShift'; shift: ManualShift }
  | { kind: 'removeShift'; date: string; phaseId: string }
  | { kind: 'setHours'; date: string; phaseId: string; hours: number }
  | { kind: 'setNote'; date: string; phaseId: string; note: string }
  /** Re-date a shift, or the whole day when phaseId is omitted. Nothing else changes. */
  | { kind: 'moveShift'; fromDate: string; toDate: string; phaseId?: string }
  /** Copy a shift, or the whole day when phaseId is omitted, onto another date. */
  | { kind: 'duplicateShift'; fromDate: string; toDate: string; phaseId?: string };

/**
 * Totals, per-member hours and the plan's milestone dates are produced by
 * generateSchedule, so any hand edit leaves them stale — and the Plan tab reads
 * the totals while the Checklist dates itself from the milestones. Recompute all
 * three from the entries so every tab agrees with the schedule as it now stands.
 */
export function withRecomputedTotals(
  schedule: ScheduleResult,
  days: ScheduleDay[],
  teamMembers: TeamMember[],
  budgetedManHours: number
): ScheduleResult {
  const entries = days.flatMap((d) => d.entries);
  const totalScheduledHours = entries.reduce((sum, e) => sum + e.hours, 0);
  const percentScheduled = budgetedManHours > 0 ? (totalScheduledHours / budgetedManHours) * 100 : 0;

  const hoursByMember: Record<string, number> = {};
  for (const e of entries) {
    if (e.assignedMember) hoursByMember[e.assignedMember] = (hoursByMember[e.assignedMember] ?? 0) + e.hours;
  }

  return {
    ...schedule,
    days,
    suggestedDates: deriveSuggestedDates(days, schedule.suggestedDates),
    totalScheduledHours,
    remainingHours: budgetedManHours - totalScheduledHours,
    percentScheduled,
    status: percentScheduled > 120 ? 'OVER BUDGET' : percentScheduled < 85 ? 'UNDER SCHEDULED' : 'ON TRACK',
    teamHours: teamMembers
      .filter((m) => hoursByMember[m.id] !== undefined)
      .map((m) => ({
        memberId: m.id,
        memberName: m.name,
        scheduledHours: hoursByMember[m.id],
        maxHours: m.maxHoursPerWeek,
        isOverMax: m.maxHoursPerWeek > 0 && hoursByMember[m.id] > m.maxHoursPerWeek,
      })),
  };
}

const newEntryId = (suffix: string | number = '') =>
  `entry-${Date.now()}-${suffix}-${Math.random().toString(36).slice(2, 7)}`;

/**
 * Drop a set of entries onto a date, adding the day if the plan didn't cover
 * it, and clearing out any day the move emptied. Days stay in date order.
 */
function placeEntries(days: ScheduleDay[], date: string, entries: ScheduleEntry[]): ScheduleDay[] {
  const landed = days.some((d) => d.date === date)
    ? days.map((d) => (d.date === date ? { ...d, entries: [...d.entries, ...entries] } : d))
    : [...days, { date, label: formatDateLabel(date), entries }];
  return landed.filter((d) => d.entries.length > 0).sort((a, b) => a.date.localeCompare(b.date));
}

/** The phases a move or copy acts on: one shift, or every shift that day. */
function phasesOn(day: ScheduleDay | undefined, phaseId: string | undefined): string[] {
  if (!day) return [];
  const ids = [...new Set(day.entries.map((e) => e.phaseId))];
  return phaseId === undefined ? ids : ids.filter((id) => id === phaseId);
}

/** Apply one edit. A project with no schedule is returned untouched. */
export function applyScheduleEdit(
  project: Project,
  edit: ScheduleEdit,
  teamMembers: TeamMember[]
): Project {
  if (!project.schedule) return project;
  const schedule = project.schedule;
  const budget = budgetOf(project.inputs);
  const rebuild = (days: ScheduleDay[], inputs = project.inputs, touch = false): Project => ({
    ...project,
    inputs,
    schedule: withRecomputedTotals(schedule, days, teamMembers, budgetOf(inputs)),
    ...(touch ? { updatedAt: new Date().toISOString() } : {}),
  });

  switch (edit.kind) {
    case 'assignMember': {
      const days = schedule.days.map((day) => ({
        ...day,
        entries: day.entries.map((entry) =>
          entry.id === edit.entryId
            ? {
                ...entry,
                assignedMember: edit.memberId,
                assignedMemberName: edit.memberName,
                status: (edit.memberId ? 'assigned' : 'needs-assignment') as AssignmentStatus,
                warnings: [],
              }
            : entry
        ),
      }));
      return rebuild(days);
    }

    case 'addRole': {
      const days = schedule.days.map((day) => {
        if (day.date !== edit.date) return day;
        const sibling = day.entries.find((e) => e.phaseId === edit.phaseId);
        if (!sibling) return day;
        // New slot inherits the phase's shift and hours; it starts unassigned.
        const entry = {
          ...sibling,
          id: newEntryId(),
          role: edit.role,
          assignedMember: null,
          assignedMemberName: null,
          status: 'needs-assignment' as AssignmentStatus,
          warnings: [],
        };
        const lastIdx = day.entries.map((e) => e.phaseId).lastIndexOf(edit.phaseId);
        const entries = [...day.entries];
        entries.splice(lastIdx + 1, 0, entry);
        return { ...day, entries };
      });
      return rebuild(days);
    }

    case 'removeRole': {
      const days = schedule.days
        .map((day) => ({ ...day, entries: day.entries.filter((e) => e.id !== edit.entryId) }))
        .filter((day) => day.entries.length > 0);
      return rebuild(days);
    }

    case 'addShift': {
      const { date, phaseId, phaseName, shift, hours, roles, assigned } = edit.shift;
      const entries = roles.map((role, i) => {
        // The sheet can crew a shift as it is built; a slot left open here is
        // one nobody qualified for, and stays open rather than being guessed.
        const memberId = assigned?.[i] ?? null;
        const member = memberId ? teamMembers.find((m) => m.id === memberId) ?? null : null;
        return {
          id: newEntryId(i),
          date,
          phaseName,
          phaseId,
          role,
          assignedMember: member?.id ?? null,
          assignedMemberName: member?.name ?? null,
          shift,
          hours,
          status: (member ? 'assigned' : 'needs-assignment') as AssignmentStatus,
          warnings: [],
        };
      });
      const existing = schedule.days.find((d) => d.date === date);
      const days = existing
        ? schedule.days.map((d) => (d.date === date ? { ...d, entries: [...d.entries, ...entries] } : d))
        // A shift on a day the plan didn't cover adds that day, in date order.
        : [...schedule.days, { date, label: formatDateLabel(date), entries }].sort((a, b) =>
            a.date.localeCompare(b.date)
          );
      // Recorded on the inputs too, so a later regenerate replays it.
      const inputs = {
        ...project.inputs,
        addedShifts: [...(project.inputs.addedShifts ?? []), edit.shift],
        removedShifts: (project.inputs.removedShifts ?? []).filter(
          (r) => !(r.phaseId === phaseId && r.date === date)
        ),
      };
      return rebuild(days, inputs, true);
    }

    case 'removeShift': {
      const days = schedule.days
        .map((day) =>
          day.date === edit.date
            ? { ...day, entries: day.entries.filter((e) => e.phaseId !== edit.phaseId) }
            : day
        )
        .filter((day) => day.entries.length > 0);
      // Remembered on the inputs so a regenerate doesn't bring the shift back.
      // A hand-added shift is dropped outright rather than tombstoned.
      const inputs = {
        ...project.inputs,
        addedShifts: (project.inputs.addedShifts ?? []).filter(
          (a) => !(a.phaseId === edit.phaseId && a.date === edit.date)
        ),
        removedShifts: [
          ...(project.inputs.removedShifts ?? []).filter(
            (r) => !(r.phaseId === edit.phaseId && r.date === edit.date)
          ),
          { phaseId: edit.phaseId, date: edit.date },
        ],
      };
      return rebuild(days, inputs, true);
    }

    case 'setHours': {
      const hours = Math.max(0.5, edit.hours);
      const days = schedule.days.map((d) =>
        d.date === edit.date
          ? { ...d, entries: d.entries.map((e) => (e.phaseId === edit.phaseId ? { ...e, hours } : e)) }
          : d
      );
      return rebuild(days);
    }

    case 'setNote': {
      // An empty note drops the row rather than leaving a blank one behind.
      const rest = (project.inputs.shiftNotes ?? []).filter(
        (n) => !(n.phaseId === edit.phaseId && n.date === edit.date)
      );
      const trimmed = edit.note.trim();
      const inputs = {
        ...project.inputs,
        shiftNotes: trimmed ? [...rest, { phaseId: edit.phaseId, date: edit.date, note: trimmed }] : rest,
      };
      return { ...project, inputs, updatedAt: new Date().toISOString() };
    }

    /*
     * Re-dating a shift is deliberately not a regenerate. Dragging a card onto
     * another day carries the entries across exactly as they stand — crew,
     * hours, roles and note all survive — because the point of moving a shift
     * by hand is that everything about it is already right except the date.
     */
    case 'moveShift': {
      const source = schedule.days.find((d) => d.date === edit.fromDate);
      const target = schedule.days.find((d) => d.date === edit.toDate);
      // A day can't hold the same phase twice: everything else keys shifts by
      // (date, phaseId), so a collision would make two shifts indistinguishable.
      const taken = new Set(target?.entries.map((e) => e.phaseId) ?? []);
      const moving = phasesOn(source, edit.phaseId).filter((id) => !taken.has(id));
      if (edit.fromDate === edit.toDate || moving.length === 0) return project;

      const set = new Set(moving);
      const carried = source!.entries
        .filter((e) => set.has(e.phaseId))
        .map((e) => ({ ...e, date: edit.toDate }));
      const emptied = schedule.days.map((d) =>
        d.date === edit.fromDate ? { ...d, entries: d.entries.filter((e) => !set.has(e.phaseId)) } : d
      );
      const days = placeEntries(emptied, edit.toDate, carried);

      // Recorded on the inputs so a later regenerate replays the move. A shift
      // that was added by hand is re-dated in place instead, and a shift moved
      // twice extends its existing record rather than growing a chain of them.
      let addedShifts = project.inputs.addedShifts ?? [];
      let phaseDateMoves = project.inputs.phaseDateMoves ?? [];
      for (const phaseId of moving) {
        if (addedShifts.some((a) => a.phaseId === phaseId && a.date === edit.fromDate)) {
          addedShifts = addedShifts.map((a) =>
            a.phaseId === phaseId && a.date === edit.fromDate ? { ...a, date: edit.toDate } : a
          );
          continue;
        }
        const chained = phaseDateMoves.find((m) => m.phaseId === phaseId && m.newDate === edit.fromDate);
        phaseDateMoves = chained
          ? phaseDateMoves.map((m) => (m === chained ? { ...m, newDate: edit.toDate } : m))
          : [
              ...phaseDateMoves.filter((m) => !(m.phaseId === phaseId && m.originalDate === edit.fromDate)),
              { id: newEntryId('move'), phaseId, originalDate: edit.fromDate, newDate: edit.toDate },
            ];
      }

      const inputs = {
        ...project.inputs,
        addedShifts,
        phaseDateMoves,
        // The note belongs to the shift, so it travels with it.
        shiftNotes: (project.inputs.shiftNotes ?? []).map((n) =>
          set.has(n.phaseId) && n.date === edit.fromDate ? { ...n, date: edit.toDate } : n
        ),
        removedShifts: (project.inputs.removedShifts ?? []).filter(
          (r) => !(set.has(r.phaseId) && r.date === edit.toDate)
        ),
      };
      return rebuild(days, inputs, true);
    }

    /*
     * A copy is a second shift with the same shape — same roles, hours, shift
     * slot, crew and note — on another date. Phases already scheduled on the
     * target day are skipped rather than doubled, for the same keying reason.
     */
    case 'duplicateShift': {
      const source = schedule.days.find((d) => d.date === edit.fromDate);
      const target = schedule.days.find((d) => d.date === edit.toDate);
      const taken = new Set(target?.entries.map((e) => e.phaseId) ?? []);
      const copying = phasesOn(source, edit.phaseId).filter((id) => !taken.has(id));
      if (copying.length === 0) return project;

      const set = new Set(copying);
      const clones = source!.entries
        .filter((e) => set.has(e.phaseId))
        .map((e, i) => ({ ...e, id: newEntryId(i), date: edit.toDate, warnings: [] }));
      const days = placeEntries(schedule.days, edit.toDate, clones);

      const added: ManualShift[] = copying.map((phaseId) => {
        const forPhase = clones.filter((e) => e.phaseId === phaseId);
        return {
          date: edit.toDate,
          phaseId,
          phaseName: forPhase[0].phaseName,
          shift: forPhase[0].shift,
          hours: forPhase[0].hours,
          roles: forPhase.map((e) => e.role),
        };
      });
      const notes = project.inputs.shiftNotes ?? [];
      const copiedNotes = notes
        .filter((n) => set.has(n.phaseId) && n.date === edit.fromDate)
        .map((n) => ({ ...n, date: edit.toDate }));

      const inputs = {
        ...project.inputs,
        addedShifts: [...(project.inputs.addedShifts ?? []), ...added],
        shiftNotes: [...notes.filter((n) => !(set.has(n.phaseId) && n.date === edit.toDate)), ...copiedNotes],
        removedShifts: (project.inputs.removedShifts ?? []).filter(
          (r) => !(set.has(r.phaseId) && r.date === edit.toDate)
        ),
      };
      return rebuild(days, inputs, true);
    }
  }

  // Unreachable, but keeps the budget reference honest for exhaustiveness.
  return budget >= 0 ? project : project;
}
