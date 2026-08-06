import { parseISO } from 'date-fns';
import type {
  ChecklistAnchor,
  ChecklistItem,
  ChecklistItemStatus,
  ChecklistSection,
  ChecklistSummary,
  Project,
  ProjectChecklistState,
  SuggestedDates,
} from '../types';
import { CHECKLIST_SECTIONS } from './checklistTemplate';
import { addWorkdays, toISODate } from './dateUtils';

export const EMPTY_CHECKLIST_STATE: ProjectChecklistState = {
  completed: {},
  longDistance: false,
};

/** How many days out an item is still counted as "upcoming". */
const UPCOMING_WINDOW_DAYS = 3;

/**
 * Resolve a checklist anchor to a date from the generated plan.
 * Returns null when the plan has nothing to hang the item on.
 */
function resolveAnchor(anchor: ChecklistAnchor, dates: SuggestedDates): string | null {
  switch (anchor) {
    case 'firstVisit':
      return dates.firstVisit || null;
    case 'secondVisit':
      return dates.secondVisit || dates.firstVisit || null;
    case 'sortDayFirst':
      return dates.sortDays[0] ?? dates.secondVisit ?? null;
    case 'sortDayLast':
      return dates.sortDays[dates.sortDays.length - 1] ?? dates.sortDays[0] ?? dates.secondVisit ?? null;
    case 'finalPackDay':
      return dates.finalPackDay || null;
    case 'moveDay':
      return dates.moveDay || null;
    case 'cleanoutDay':
      // Cleanout is an optional service. When it isn't scheduled, fall back to a
      // few workdays after the move so the section still carries a target date.
      if (dates.cleanoutDays[0]) return dates.cleanoutDays[0];
      return dates.moveDay ? toISODate(addWorkdays(parseISO(dates.moveDay), 3)) : null;
    case 'auctionPickup':
      return dates.auctionPickup ?? null;
    default:
      return null;
  }
}

function applyOffset(date: string | null, offsetWorkdays: number | undefined): string | null {
  if (!date) return null;
  if (!offsetWorkdays) return date;
  return toISODate(addWorkdays(parseISO(date), offsetWorkdays));
}

function daysBetween(fromISO: string, toISO: string): number {
  const ms = parseISO(toISO).getTime() - parseISO(fromISO).getTime();
  return Math.round(ms / 86_400_000);
}

function itemStatus(dueDate: string | null, done: boolean, todayISO: string): ChecklistItemStatus {
  if (done) return 'complete';
  if (!dueDate) return 'unscheduled';
  const delta = daysBetween(todayISO, dueDate);
  if (delta < 0) return 'overdue';
  if (delta === 0) return 'today';
  if (delta <= UPCOMING_WINDOW_DAYS) return 'upcoming';
  return 'scheduled';
}

/**
 * Build the checklist for a project: the template sections filtered to the
 * services and move type on the project, each item dated from the plan's
 * suggested dates and merged with the saved completion state.
 *
 * Returns null when the project has no generated schedule — due dates come
 * from the Move Plan Builder, so there is nothing to show until it has run.
 */
export function buildChecklist(
  project: Project,
  state: ProjectChecklistState = EMPTY_CHECKLIST_STATE,
  today: Date = new Date()
): ChecklistSummary | null {
  if (!project.schedule) return null;

  const dates = project.schedule.suggestedDates;
  const { moveType, auction, cleanout } = project.inputs;
  const todayISO = toISODate(today);

  const sections: ChecklistSection[] = [];

  for (const template of CHECKLIST_SECTIONS) {
    if (template.moveTypes && !template.moveTypes.includes(moveType)) continue;
    if (template.requiresAuction && !auction.enabled) continue;
    if (template.requiresCleanout && !cleanout.enabled) continue;
    if (template.requiresLongDistance && !state.longDistance) continue;

    const sectionDue = applyOffset(resolveAnchor(template.anchor, dates), template.offsetWorkdays);

    const items: ChecklistItem[] = [];
    for (const item of template.items) {
      if (item.requiresAuction && !auction.enabled) continue;
      if (item.requiresCleanout && !cleanout.enabled) continue;

      // An item-level anchor replaces the section anchor entirely; an item-level
      // offset without an anchor shifts off the section's own due date.
      const base = item.anchor
        ? applyOffset(resolveAnchor(item.anchor, dates), item.offsetWorkdays)
        : applyOffset(sectionDue, item.offsetWorkdays);

      const completedAt = state.completed[item.id] ?? null;
      const done = completedAt !== null;

      items.push({
        ...item,
        sectionId: template.id,
        dueDate: base,
        done,
        completedAt,
        status: itemStatus(base, done, todayISO),
      });
    }

    if (items.length === 0) continue;

    sections.push({
      id: template.id,
      name: template.name,
      owner: template.owner,
      note: template.note,
      dueDate: sectionDue,
      items,
      doneCount: items.filter((i) => i.done).length,
      overdueCount: items.filter((i) => i.status === 'overdue').length,
    });
  }

  const allItems = sections.flatMap((s) => s.items);
  const doneItems = allItems.filter((i) => i.done).length;
  const overdueItems = allItems.filter((i) => i.status === 'overdue').length;

  const nextDue =
    allItems
      .filter((i) => !i.done && i.dueDate)
      .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : a.dueDate! > b.dueDate! ? 1 : 0))[0] ?? null;

  return {
    sections,
    totalItems: allItems.length,
    doneItems,
    overdueItems,
    percentComplete: allItems.length > 0 ? (doneItems / allItems.length) * 100 : 0,
    nextDue,
  };
}

/** Plain-text rendering of a checklist, for sharing or printing. */
export function checklistToText(project: Project, summary: ChecklistSummary): string {
  const lines: string[] = [];
  lines.push(`${project.inputs.clientName || 'Untitled Project'} — PM Checklist`);
  if (project.inputs.community) lines.push(project.inputs.community);
  lines.push(`${summary.doneItems} of ${summary.totalItems} complete`);
  lines.push('');
  for (const section of summary.sections) {
    lines.push(`${section.name}${section.dueDate ? ` — due ${section.dueDate}` : ''}`);
    for (const item of section.items) {
      lines.push(`  [${item.done ? 'x' : ' '}] ${item.dueDate ?? 'no date'}  ${item.text}`);
      for (const sub of item.subItems ?? []) lines.push(`        - ${sub}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}
