import { addDays, parseISO, differenceInCalendarDays } from 'date-fns';
import type {
  ProjectInputs,
  ScheduleResult,
  ChecklistAnchor,
  ChecklistRequirement,
  ChecklistSectionTemplate,
  ChecklistState,
  ChecklistItem,
  ChecklistItemStatus,
  ChecklistSection,
  ChecklistResult,
  ChecklistProgress,
} from '../types';
import { addWorkdays, toISODate } from './dateUtils';
import { CHECKLIST_TEMPLATE } from './checklistTemplate';

/** Items due within this many days of today are flagged "due soon". */
export const DUE_SOON_DAYS = 3;

/**
 * Resolve every checklist anchor to a concrete date on this job.
 *
 * All dates come from the move plan builder: the generated schedule's
 * suggestedDates, falling back to the raw project inputs where the schedule
 * doesn't carry an equivalent. Anchors with no date on this job resolve to null
 * and their items surface as "unscheduled" rather than disappearing.
 */
export function resolveAnchorDates(
  inputs: ProjectInputs,
  schedule: ScheduleResult | null
): Record<ChecklistAnchor, string | null> {
  const s = schedule?.suggestedDates;
  const sortDays = s?.sortDays ?? [];

  const blank = (v: string | null | undefined) => (v && v.length > 0 ? v : null);

  return {
    earliestStart: blank(inputs.earliestStartDate),
    firstVisit:    blank(s?.firstVisit) ?? blank(inputs.earliestStartDate),
    secondVisit:   blank(s?.secondVisit),
    sortDayFirst:  blank(sortDays[0]),
    sortDayLast:   blank(sortDays[sortDays.length - 1]),
    finalPackDay:  blank(s?.finalPackDay),
    moveDay:       blank(s?.moveDay) ?? blank(inputs.targetMoveDate),
    cleanoutDay:   blank(s?.cleanoutDays?.[0]) ?? blank(inputs.cleanout?.startDate),
    auctionLotOrg: blank(s?.auctionLotOrg),
    auctionStart:  blank(s?.auctionStart),
    auctionPickup: blank(s?.auctionPickup),
    hardDeadline:  blank(inputs.hardDeadline),
  };
}

/** Shift an anchor date by an offset, skipping weekends in 'workday' mode. */
function applyOffset(
  anchorDate: string,
  offsetDays: number,
  mode: 'calendar' | 'workday'
): string {
  const base = parseISO(anchorDate);
  if (offsetDays === 0) return toISODate(base);
  return toISODate(
    mode === 'calendar' ? addDays(base, offsetDays) : addWorkdays(base, offsetDays)
  );
}

/** Does this job include the work an item or section requires? */
function meetsRequirement(req: ChecklistRequirement | undefined, inputs: ProjectInputs): boolean {
  if (!req) return true;
  if (req.cleanout && !inputs.cleanout?.enabled) return false;
  if (req.auction && !inputs.auction?.enabled) return false;
  if (req.moveTypes && req.moveTypes.length > 0 && !req.moveTypes.includes(inputs.moveType)) {
    return false;
  }
  return true;
}

function deriveStatus(
  done: boolean,
  dueDate: string | null,
  todayIso: string
): ChecklistItemStatus {
  if (done) return 'done';
  if (!dueDate) return 'unscheduled';
  const daysOut = differenceInCalendarDays(parseISO(dueDate), parseISO(todayIso));
  if (daysOut < 0) return 'overdue';
  if (daysOut <= DUE_SOON_DAYS) return 'due-soon';
  return 'upcoming';
}

/** Sort by due date ascending; unscheduled items sink to the bottom. */
function byDueDate(a: ChecklistItem, b: ChecklistItem): number {
  if (a.dueDate && b.dueDate) {
    if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
    return 0;
  }
  if (a.dueDate) return -1;
  if (b.dueDate) return 1;
  return 0;
}

/**
 * Build the checklist for a project.
 *
 * Sections and items come from the template; due dates come from the move plan.
 * Stored state contributes completion only — so regenerating the plan reshuffles
 * every due date without losing a single checked box.
 */
export function buildChecklist(
  inputs: ProjectInputs,
  schedule: ScheduleResult | null,
  state: ChecklistState = {},
  template: ChecklistSectionTemplate[] = CHECKLIST_TEMPLATE,
  today: string = toISODate(new Date())
): ChecklistResult {
  const anchorDates = resolveAnchorDates(inputs, schedule);

  const sections: ChecklistSection[] = [];
  const flat: ChecklistItem[] = [];

  for (const sectionTpl of template) {
    if (!meetsRequirement(sectionTpl.requires, inputs)) continue;

    const items: ChecklistItem[] = [];

    for (const itemTpl of sectionTpl.items) {
      if (!meetsRequirement(itemTpl.requires, inputs)) continue;

      const anchorDate = anchorDates[itemTpl.anchor];
      const dueDate = anchorDate
        ? applyOffset(anchorDate, itemTpl.offsetDays, itemTpl.offsetMode ?? 'workday')
        : null;

      const stored = state[itemTpl.id];
      const done = stored?.done ?? false;

      const item: ChecklistItem = {
        ...itemTpl,
        sectionId: sectionTpl.id,
        sectionTitle: sectionTpl.title,
        dueDate,
        done,
        completedAt: stored?.completedAt ?? null,
        status: deriveStatus(done, dueDate, today),
      };

      items.push(item);
      flat.push(item);
    }

    if (items.length === 0) continue;

    items.sort(byDueDate);

    sections.push({
      id: sectionTpl.id,
      title: sectionTpl.title,
      description: sectionTpl.description,
      items,
      doneCount: items.filter((i) => i.done).length,
      overdueCount: items.filter((i) => i.status === 'overdue').length,
    });
  }

  flat.sort(byDueDate);

  const total = flat.length;
  const done = flat.filter((i) => i.done).length;
  const progress: ChecklistProgress = {
    total,
    done,
    overdue: flat.filter((i) => i.status === 'overdue').length,
    dueSoon: flat.filter((i) => i.status === 'due-soon').length,
    percent: total > 0 ? Math.round((done / total) * 100) : 0,
  };

  return { sections, items: flat, progress, anchorDates };
}

/** Group already-derived items by their due date, for the timeline view. */
export function groupByDueDate(
  items: ChecklistItem[]
): Array<{ date: string | null; items: ChecklistItem[] }> {
  const groups = new Map<string, ChecklistItem[]>();
  const unscheduled: ChecklistItem[] = [];

  for (const item of items) {
    if (!item.dueDate) {
      unscheduled.push(item);
      continue;
    }
    if (!groups.has(item.dueDate)) groups.set(item.dueDate, []);
    groups.get(item.dueDate)!.push(item);
  }

  const result = Array.from(groups.keys())
    .sort()
    .map((date) => ({ date: date as string | null, items: groups.get(date)! }));

  if (unscheduled.length > 0) result.push({ date: null, items: unscheduled });
  return result;
}

/** Toggle one item, returning the next stored state. */
export function toggleChecklistItem(
  state: ChecklistState,
  itemId: string,
  done: boolean
): ChecklistState {
  return {
    ...state,
    [itemId]: { done, completedAt: done ? new Date().toISOString() : null },
  };
}

/** Mark every item in a list done (or not), returning the next stored state. */
export function setManyChecklistItems(
  state: ChecklistState,
  itemIds: string[],
  done: boolean
): ChecklistState {
  const next = { ...state };
  const completedAt = done ? new Date().toISOString() : null;
  for (const id of itemIds) next[id] = { done, completedAt };
  return next;
}
