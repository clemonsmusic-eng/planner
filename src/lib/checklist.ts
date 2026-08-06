import { parseISO, differenceInCalendarDays, addDays } from 'date-fns';
import type {
  ChecklistAnchor,
  ChecklistItemState,
  ChecklistOffsetMode,
  ChecklistOwner,
  ChecklistTemplateItem,
  ChecklistTemplateSection,
  Project,
  ProjectChecklist,
} from '../types';
import { addWorkdays, toISODate } from './dateUtils';
import { ANCHOR_LABELS } from './checklistData';

// ─── Derived view types ───────────────────────────────────────────────────────

export type ChecklistItemStatus =
  | 'done'
  | 'overdue'
  | 'due-today'
  | 'due-soon'
  | 'upcoming'
  | 'no-date';

export interface ChecklistItemView {
  id: string;
  sectionId: string;
  sectionName: string;
  text: string;
  owner: ChecklistOwner;
  note: string;
  anchor: ChecklistAnchor;
  anchorLabel: string;
  offsetDays: number;
  offsetMode: ChecklistOffsetMode;
  /** Null when the plan has no date for this item's anchor. */
  dueDate: string | null;
  isDueDateOverridden: boolean;
  done: boolean;
  completedAt: string | null;
  status: ChecklistItemStatus;
  /** Days until due; negative when overdue. Null when undated. */
  daysUntilDue: number | null;
  isCustom: boolean;
}

export interface ChecklistSectionView {
  id: string;
  name: string;
  description?: string;
  items: ChecklistItemView[];
  total: number;
  completed: number;
  overdueCount: number;
  /** Earliest due date among open items, for sorting and headers. */
  nextDueDate: string | null;
}

export interface ChecklistView {
  sections: ChecklistSectionView[];
  total: number;
  completed: number;
  overdueCount: number;
  dueSoonCount: number;
  percentComplete: number;
  /** True when the project has no generated schedule, so nothing can be dated. */
  isUndated: boolean;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const EMPTY_ITEM_STATE: ChecklistItemState = {
  done: false,
  completedAt: null,
  dueDateOverride: null,
  note: '',
};

export function emptyChecklist(): ProjectChecklist {
  return { itemStates: {}, customItems: [], excludedItemIds: [] };
}

/** Tolerate checklists persisted before a field existed. */
export function normalizeChecklist(checklist: ProjectChecklist | null | undefined): ProjectChecklist {
  if (!checklist) return emptyChecklist();
  return {
    itemStates: checklist.itemStates ?? {},
    customItems: checklist.customItems ?? [],
    excludedItemIds: checklist.excludedItemIds ?? [],
  };
}

// ─── Anchor resolution ────────────────────────────────────────────────────────

/**
 * Map an anchor to a concrete date from the project's generated plan.
 *
 * Anchors that the plan didn't produce — sort days squeezed out by budget, a
 * cleanout that isn't enabled — resolve to null rather than silently borrowing a
 * neighbouring milestone, so the UI can say "no date" instead of showing a wrong
 * one. The single exception is the sort window, which falls back to the pack
 * phases that bracket it, since a sort-anchored item is still real work even
 * when the budget collapsed the dedicated sort days.
 */
export function resolveAnchorDate(anchor: ChecklistAnchor, project: Project): string | null {
  const { inputs, schedule } = project;
  const dates = schedule?.suggestedDates;

  switch (anchor) {
    case 'earliest-start':
      return inputs.earliestStartDate || null;
    case 'hard-deadline':
      return inputs.hardDeadline || null;
    case 'first-visit':
      return dates?.firstVisit || null;
    case 'second-visit':
      return dates?.secondVisit || null;
    case 'sort-start':
      return dates?.sortDays?.[0] || dates?.secondVisit || null;
    case 'sort-end':
      return (
        dates?.sortDays?.[dates.sortDays.length - 1] ||
        dates?.finalPackDay ||
        null
      );
    case 'final-pack':
      return dates?.finalPackDay || null;
    case 'move-day':
      // Fall back to the client's target date so move-day items stay dated even
      // before a schedule has been generated.
      return dates?.moveDay || inputs.targetMoveDate || null;
    case 'cleanout-start':
      return dates?.cleanoutDays?.[0] || null;
    case 'cleanout-end':
      return dates?.cleanoutDays?.[dates.cleanoutDays.length - 1] || null;
    // Lot prep days are only scheduled once a lot count is entered, so fall back
    // to the lot organization date — the day lot prep begins either way.
    case 'lot-prep-start':
      return dates?.lotPrepDays?.[0] || dates?.auctionLotOrg || null;
    case 'lot-prep-end':
      return (
        dates?.lotPrepDays?.[dates.lotPrepDays.length - 1] ||
        dates?.auctionLotOrg ||
        null
      );
    case 'auction-lot-org':
      return dates?.auctionLotOrg || null;
    case 'auction-start':
      return dates?.auctionStart || null;
    case 'auction-pickup-prep':
      return dates?.auctionPickupPrep || null;
    case 'auction-pickup':
      return dates?.auctionPickup || null;
    default:
      return null;
  }
}

/** Apply an item's offset to its resolved anchor date. */
export function computeDueDate(item: ChecklistTemplateItem, project: Project): string | null {
  const anchorDate = resolveAnchorDate(item.anchor, project);
  if (!anchorDate) return null;

  const base = parseISO(anchorDate);
  if (item.offsetDays === 0) return toISODate(base);
  return toISODate(
    item.offsetMode === 'workday'
      ? addWorkdays(base, item.offsetDays)
      : addDays(base, item.offsetDays)
  );
}

// ─── Applicability ────────────────────────────────────────────────────────────

/** Whether a section/item's move-type and optional-service gates are satisfied. */
function isApplicable(
  gates: { moveTypes?: ChecklistTemplateSection['moveTypes']; requires?: ChecklistTemplateSection['requires'] },
  project: Project
): boolean {
  if (gates.moveTypes && gates.moveTypes.length > 0) {
    if (!gates.moveTypes.includes(project.inputs.moveType)) return false;
  }
  if (gates.requires === 'cleanout' && !project.inputs.cleanout?.enabled) return false;
  if (gates.requires === 'auction' && !project.inputs.auction?.enabled) return false;
  return true;
}

// ─── Status ───────────────────────────────────────────────────────────────────

const DUE_SOON_WINDOW_DAYS = 3;

function computeStatus(
  done: boolean,
  dueDate: string | null,
  today: Date
): { status: ChecklistItemStatus; daysUntilDue: number | null } {
  if (done) {
    return {
      status: 'done',
      daysUntilDue: dueDate ? differenceInCalendarDays(parseISO(dueDate), today) : null,
    };
  }
  if (!dueDate) return { status: 'no-date', daysUntilDue: null };

  const days = differenceInCalendarDays(parseISO(dueDate), today);
  if (days < 0) return { status: 'overdue', daysUntilDue: days };
  if (days === 0) return { status: 'due-today', daysUntilDue: days };
  if (days <= DUE_SOON_WINDOW_DAYS) return { status: 'due-soon', daysUntilDue: days };
  return { status: 'upcoming', daysUntilDue: days };
}

// ─── Build ────────────────────────────────────────────────────────────────────

/**
 * Combine the template, the project's plan dates, and stored progress into the
 * view the checklist page renders. Pure — nothing is persisted here.
 */
export function buildChecklistView(
  project: Project,
  template: ChecklistTemplateSection[],
  today: Date = new Date()
): ChecklistView {
  const checklist = normalizeChecklist(project.checklist);
  const excluded = new Set(checklist.excludedItemIds);

  // Custom items are grouped onto their section so they render inline with the
  // template items they were added beside.
  const customBySection = new Map<string, ChecklistTemplateItem[]>();
  for (const custom of checklist.customItems) {
    const list = customBySection.get(custom.sectionId) ?? [];
    list.push(custom);
    customBySection.set(custom.sectionId, list);
  }
  const customIds = new Set(checklist.customItems.map((c) => c.id));

  const sections: ChecklistSectionView[] = [];

  for (const section of [...template].sort((a, b) => a.order - b.order)) {
    if (!isApplicable(section, project)) continue;

    const templateItems = section.items.filter((item) => {
      if (excluded.has(item.id)) return false;
      // An item inherits its section's gates unless it declares its own.
      const gates = {
        moveTypes: item.moveTypes ?? section.moveTypes,
        requires: item.requires ?? section.requires,
      };
      return isApplicable(gates, project);
    });

    const allItems = [...templateItems, ...(customBySection.get(section.id) ?? [])];
    if (allItems.length === 0) continue;

    const views: ChecklistItemView[] = allItems.map((item) => {
      const state = checklist.itemStates[item.id] ?? EMPTY_ITEM_STATE;
      const derivedDue = computeDueDate(item, project);
      const dueDate = state.dueDateOverride ?? derivedDue;
      const { status, daysUntilDue } = computeStatus(state.done, dueDate, today);

      return {
        id: item.id,
        sectionId: section.id,
        sectionName: section.name,
        text: item.text,
        owner: item.owner,
        note: state.note || item.note || '',
        anchor: item.anchor,
        anchorLabel: ANCHOR_LABELS[item.anchor] ?? item.anchor,
        offsetDays: item.offsetDays,
        offsetMode: item.offsetMode,
        dueDate,
        isDueDateOverridden: state.dueDateOverride !== null,
        done: state.done,
        completedAt: state.completedAt,
        status,
        daysUntilDue,
        isCustom: customIds.has(item.id),
      };
    });

    // Undated items sink to the bottom; otherwise chronological.
    views.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });

    const openDueDates = views.filter((v) => !v.done && v.dueDate).map((v) => v.dueDate!);

    sections.push({
      id: section.id,
      name: section.name,
      description: section.description,
      items: views,
      total: views.length,
      completed: views.filter((v) => v.done).length,
      overdueCount: views.filter((v) => v.status === 'overdue').length,
      nextDueDate: openDueDates.length > 0 ? openDueDates.sort()[0] : null,
    });
  }

  const allViews = sections.flatMap((s) => s.items);
  const completed = allViews.filter((v) => v.done).length;

  return {
    sections,
    total: allViews.length,
    completed,
    overdueCount: allViews.filter((v) => v.status === 'overdue').length,
    dueSoonCount: allViews.filter((v) => v.status === 'due-today' || v.status === 'due-soon').length,
    percentComplete: allViews.length > 0 ? (completed / allViews.length) * 100 : 0,
    isUndated: !project.schedule,
  };
}

/** Flatten a view into date-ordered items, for the "By Date" grouping. */
export function groupByDueDate(view: ChecklistView): Array<{ date: string | null; items: ChecklistItemView[] }> {
  const buckets = new Map<string, ChecklistItemView[]>();
  const undated: ChecklistItemView[] = [];

  for (const item of view.sections.flatMap((s) => s.items)) {
    if (!item.dueDate) {
      undated.push(item);
      continue;
    }
    const list = buckets.get(item.dueDate) ?? [];
    list.push(item);
    buckets.set(item.dueDate, list);
  }

  const groups = Array.from(buckets.keys())
    .sort()
    .map((date) => ({ date: date as string | null, items: buckets.get(date)! }));

  if (undated.length > 0) groups.push({ date: null, items: undated });
  return groups;
}

// ─── Export ───────────────────────────────────────────────────────────────────

/** Plain-text checklist for sharing with a client or family. */
export function checklistToText(project: Project, view: ChecklistView): string {
  const lines: string[] = [];
  const title = project.inputs.clientName || project.inputs.projectName || 'Move Checklist';
  lines.push(`${title} — Move Checklist`);
  if (project.inputs.community) lines.push(project.inputs.community);
  lines.push(`${view.completed} of ${view.total} complete`);
  lines.push('');

  for (const section of view.sections) {
    lines.push(`${section.name.toUpperCase()}  (${section.completed}/${section.total})`);
    for (const item of section.items) {
      const box = item.done ? '[x]' : '[ ]';
      const due = item.dueDate ? item.dueDate : 'no date';
      lines.push(`  ${box} ${due}  ${item.text}  — ${item.owner}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}
