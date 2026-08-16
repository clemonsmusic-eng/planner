import { deriveSuggestedDates } from './scheduling';
import { budgetOf } from './budgets';
import { formatDateLabel } from './dateUtils';
import type {
  AssignmentStatus,
  ManualShift,
  Project,
  RoleType,
  ScheduleDay,
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
  | { kind: 'setNote'; date: string; phaseId: string; note: string };

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
      const { date, phaseId, phaseName, shift, hours, roles } = edit.shift;
      const entries = roles.map((role, i) => ({
        id: newEntryId(i),
        date,
        phaseName,
        phaseId,
        role,
        assignedMember: null,
        assignedMemberName: null,
        shift,
        hours,
        status: 'needs-assignment' as AssignmentStatus,
        warnings: [],
      }));
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
  }

  // Unreachable, but keeps the budget reference honest for exhaustiveness.
  return budget >= 0 ? project : project;
}
