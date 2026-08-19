import { applyScheduleEdit, type ScheduleEdit } from './scheduleEdits';
import { startTimeLookup } from './shiftStartTimes';
import type { Project, TeamMember } from '../types';
import type { ShiftEditValues } from '../components/ShiftEditSheet';

/**
 * Apply the edit window's three answers to a project.
 *
 * Lives here rather than on the Schedule tab because the calendar asks the same
 * question of the same dialog, and a second copy of this ordering is a second
 * chance to get it wrong.
 *
 * The date goes first so the rest lands where the shift ended up: a move onto a
 * day already running the same phase is refused, and a shift type written
 * against the date that was asked for rather than the one it is on would
 * override a day nothing moved to.
 */
export function applyShiftEdit(
  project: Project,
  target: { date: string; phaseId?: string },
  values: ShiftEditValues,
  teamMembers: TeamMember[]
): Project {
  let next = project;
  const apply = (e: ScheduleEdit) => { next = applyScheduleEdit(next, e, teamMembers); };
  const startTimeOf = startTimeLookup(project.inputs);

  const phases = target.phaseId
    ? [target.phaseId]
    : [...new Set(
        project.schedule?.days.find((d) => d.date === target.date)?.entries.map((e) => e.phaseId) ?? []
      )];

  if (values.date && values.date !== target.date) {
    apply({ kind: 'moveShift', fromDate: target.date, toDate: values.date, phaseId: target.phaseId });
  }

  for (const phaseId of phases) {
    const on = (date: string) =>
      next.schedule?.days.find((d) => d.date === date)?.entries.find((e) => e.phaseId === phaseId);
    const date = on(values.date) ? values.date : target.date;
    const current = on(date);
    if (!current) continue;
    if (current.shift !== values.shift) apply({ kind: 'setShiftType', date, phaseId, shift: values.shift });
    if ((startTimeOf(phaseId, target.date) ?? null) !== values.startTime) {
      apply({ kind: 'setStartTime', date, phaseId, time: values.startTime });
    }
  }

  return next;
}
