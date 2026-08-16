import { formatDateLabel, shiftTimeRange } from './dateUtils';
import { totalBudgetedHours } from './budgets';
import type { DocBlock, DocumentModel } from './docModel';
import type { Project, ScheduleDay, ScheduleResult, ShiftTimeSettings } from '../types';

/**
 * The Schedule tab as a document — every shift, in date order, with who is on
 * it. Where the Plan document is the summary a client sees, this is the one a
 * crew works from, so it leads with dates and names rather than budgets.
 */

const hours = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** One row per shift, not per person: the crew is a cell within the shift. */
interface ShiftRow {
  date: string;
  phaseId: string;
  phaseName: string;
  shift: 'AM' | 'PM' | 'Full Day';
  hoursEach: number;
  crew: { role: string; name: string }[];
  note: string;
}

export function shiftsOf(days: ScheduleDay[], project: Project): ShiftRow[] {
  const notes = project.inputs.shiftNotes ?? [];
  const rows: ShiftRow[] = [];
  for (const day of days) {
    // Entries arrive grouped by phase; a Map keeps that grouping and its order.
    const byPhase = new Map<string, typeof day.entries>();
    for (const entry of day.entries) {
      byPhase.set(entry.phaseId, [...(byPhase.get(entry.phaseId) ?? []), entry]);
    }
    for (const [phaseId, entries] of byPhase) {
      rows.push({
        date: day.date,
        phaseId,
        phaseName: entries[0].phaseName,
        shift: entries[0].shift,
        hoursEach: entries[0].hours,
        crew: entries.map((e) => ({ role: e.role, name: e.assignedMemberName ?? 'Unassigned' })),
        note: notes.find((n) => n.phaseId === phaseId && n.date === day.date)?.note ?? '',
      });
    }
  }
  return rows;
}

export function buildScheduleDocument(
  project: Project,
  schedule: ScheduleResult,
  shiftTimes: ShiftTimeSettings
): DocumentModel {
  const client = project.inputs.clientName || 'Untitled project';
  const rows = shiftsOf(schedule.days, project);
  const budget = totalBudgetedHours(project.inputs.phaseBudgets);

  const blocks: DocBlock[] = [
    {
      kind: 'fields',
      rows: [
        ['Community', project.inputs.community || '-'],
        ['Project Type', project.inputs.moveType || '-'],
        ['Days Scheduled', String(schedule.days.length)],
        [
          'Hours',
          budget > 0
            ? `${hours(schedule.totalScheduledHours)} of ${hours(budget)} budgeted (${Math.round(schedule.percentScheduled)}%)`
            : `${hours(schedule.totalScheduledHours)} scheduled`,
        ],
      ],
    },
  ];

  if (rows.length === 0) {
    blocks.push({ kind: 'paragraph', text: 'No shifts scheduled yet.', muted: true });
  } else {
    blocks.push({ kind: 'heading', text: 'Shifts' });
    blocks.push({
      kind: 'table',
      columns: [
        { header: 'Date', weight: 16 },
        { header: 'Shift', weight: 24 },
        { header: 'Time', weight: 18 },
        { header: 'Hrs', weight: 6, align: 'center' },
        { header: 'Crew', weight: 36 },
      ],
      rows: rows.map((r) => [
        formatDateLabel(r.date),
        r.phaseName,
        // The slot name is dropped: "9:00 AM-1:00 PM" already says which half
        // of the day it is, and repeating it cost the column a second line.
        shiftTimeRange(r.shift, r.hoursEach, shiftTimes),
        hours(r.hoursEach),
        r.crew.map((c) => `${c.name} (${c.role})`).join(', '),
      ]),
    });

    // Notes are set out under the table rather than squeezed into a column:
    // they are sentences, and a table cell three words wide mangles them.
    const noted = rows.filter((r) => r.note.trim());
    if (noted.length > 0) {
      blocks.push({ kind: 'heading', text: 'Shift Notes' });
      blocks.push({
        kind: 'bullets',
        groups: noted.map((r) => ({
          label: `${formatDateLabel(r.date)} · ${r.phaseName}`,
          items: [r.note.trim()],
        })),
      });
    }
  }

  if (schedule.teamHours.length > 0) {
    blocks.push({ kind: 'heading', text: 'Team Hours' });
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

  const first = schedule.days[0]?.date;
  const last = schedule.days[schedule.days.length - 1]?.date;
  return {
    title: `${client} — Schedule`,
    subtitle: [
      project.inputs.community,
      first && last ? `${formatDateLabel(first)} to ${formatDateLabel(last)}` : null,
    ]
      .filter(Boolean)
      .join('  ·  '),
    blocks,
  };
}
