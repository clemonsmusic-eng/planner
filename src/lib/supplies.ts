import type { ProjectDocuments, SupplyItem, SupplyUsage } from '../types';

/**
 * Master supply inventory.
 *
 * The Director of Operations owns this list; project managers draw against it
 * from their own job's supply page. Stock is modelled as a `stocked` figure
 * with usage derived from the projects rather than decremented in place —
 * see availableOf() for why.
 */

/**
 * Starting sections. The live list is stored on app state and editable — this
 * is only what a fresh install begins with.
 */
export const DEFAULT_SUPPLY_CATEGORIES = [
  'Packing & Tools',
  'Tote Bag',
  'Tool Bag',
  'In Van',
  'Storage',
];

/** Sections are user-editable, so a category is just a string. */
export type SupplyCategory = string;

/**
 * The sections to render: the stored list, plus any section an item still
 * claims. Without the second part a row whose section was renamed or removed
 * out from under it would render nowhere and look deleted.
 */
export function visibleCategories(stored: string[], supplies: SupplyItem[]): string[] {
  const seen = new Set(stored);
  const extra = supplies.map((s) => s.category).filter((c) => c && !seen.has(c));
  return [...stored, ...extra].filter((c, i, arr) => arr.indexOf(c) === i);
}

export function normalizeCategories(categories: string[] | null | undefined): string[] {
  if (!categories || categories.length === 0) return [...DEFAULT_SUPPLY_CATEGORIES];
  const cleaned = categories.map((c) => c.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned.filter((c, i, a) => a.indexOf(c) === i) : [...DEFAULT_SUPPLY_CATEGORIES];
}

function item(
  id: string,
  name: string,
  category: SupplyCategory,
  consumable: boolean,
  unit = '',
  description = ''
): SupplyItem {
  return { id, name, category, unit, description, stocked: 0, costPerUnit: null, consumable };
}

/**
 * Starting list, transcribed from the operations supply sheet. Everything here
 * can be edited, removed, or added to — it's only the default.
 *
 * The kit sections (Tote Bag, Tool Bag, In Van, Storage) are what each staffer
 * carries, so their sheet "Amount" is kept as a carry note rather than a stock
 * count.
 */
const C = true;   // consumable — used up on a job, so projects draw it
const E = false;  // equipment — tracked here, never drawn down

export const DEFAULT_SUPPLIES: SupplyItem[] = [
  item('sup-small-box', 'Small Box', 'Packing & Tools', C),
  item('sup-medium-box', 'Medium Box', 'Packing & Tools', C),
  item('sup-large-box', 'Large Box', 'Packing & Tools', C),
  item('sup-small-bubble', 'Small Bubble Wrap', 'Packing & Tools', C, 'roll', "300'"),
  item('sup-large-bubble', 'Large Bubble Wrap', 'Packing & Tools', C, 'roll'),
  item('sup-small-bubble-box', 'Small Bubble Wrap Box', 'Packing & Tools', C, 'box', "150'"),
  item('sup-large-bubble-box', 'Large Bubble Wrap Box', 'Packing & Tools', C, 'box', "100'"),
  item('sup-paper-tape', 'Paper Packing Tape', 'Packing & Tools', C, 'roll'),
  item('sup-packing-paper-200', 'Packing Paper', 'Packing & Tools', C, '200 ct'),
  item('sup-packing-paper-500', 'Packing Paper', 'Packing & Tools', C, '500 ct'),
  item('sup-permanent-marker', 'Permanent Marker', 'Packing & Tools', C),
  item('sup-box-cutter', 'Box Cutter', 'Packing & Tools', E),
  item('sup-drill', 'Drill', 'Packing & Tools', E),
  item('sup-electric-driver', 'Electric Driver', 'Packing & Tools', E),
  item('sup-flathead-driver', 'Flathead Driver', 'Packing & Tools', E),
  item('sup-phillipshead-driver', 'Phillipshead Driver', 'Packing & Tools', E),

  item('sup-tote-trash-bags', 'Trash Bags', 'Tote Bag', C, '', 'Carry 2–3'),
  item('sup-tote-freezer-bags', 'Freezer Bags', 'Tote Bag', C, 'box', 'Carry 1 box'),
  item('sup-tote-quart-bags', 'Quart Bags', 'Tote Bag', C, 'box', 'Carry 1 box'),

  item('sup-tb-drill', 'Drill', 'Tool Bag', E),
  item('sup-tb-level', 'Level', 'Tool Bag', E),
  item('sup-tb-laser-measurer', 'Laser Measurer', 'Tool Bag', E),
  item('sup-tb-tape-measure', 'Tape Measure', 'Tool Bag', E),
  item('sup-tb-phillips', 'Phillips Head Driver', 'Tool Bag', E),
  item('sup-tb-flat', 'Flat Head Driver', 'Tool Bag', E),
  item('sup-tb-wire-cutters', 'Wire Cutters', 'Tool Bag', E),

  item('sup-van-ladder', "6' Ladder", 'In Van', E, '', 'Carry 2'),
  item('sup-van-step-stool', '3 Step Step Stool', 'In Van', E, '', 'Carry 2'),
  item('sup-van-small-step', 'Small Step', 'In Van', E),
];

export function emptySupplyItem(category: SupplyCategory = 'Packing & Tools'): SupplyItem {
  return {
    id: `sup-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    category,
    unit: '',
    description: '',
    stocked: 0,
    costPerUnit: null,
    // New items are consumables, which is what most additions to a supply
    // list are; the toggle is right there for the exceptions.
    consumable: true,
  };
}

/** Sections that no longer exist; their rows move rather than vanish. */
const RETIRED_CATEGORIES: Record<string, SupplyCategory> = {
  'Fanny Pack': 'Packing & Tools',
};

/** Tolerate items persisted before a field existed, or in a retired section. */
export function normalizeSupplies(supplies: SupplyItem[] | null | undefined): SupplyItem[] {
  if (!supplies || supplies.length === 0) return DEFAULT_SUPPLIES.map((s) => ({ ...s }));
  return supplies.map((s) => ({
    ...s,
    stocked: Number.isFinite(s.stocked) ? s.stocked : 0,
    costPerUnit: typeof s.costPerUnit === 'number' ? s.costPerUnit : null,
    unit: s.unit ?? '',
    description: s.description ?? '',
    // A row left in a removed section would render nowhere and look deleted.
    category: RETIRED_CATEGORIES[s.category] ?? s.category,
    // Lists saved before the consumable flag existed: take the seeded answer
    // for the items we shipped, and assume consumable for anything hand-added.
    consumable:
      typeof s.consumable === 'boolean'
        ? s.consumable
        : DEFAULT_SUPPLIES.find((d) => d.id === s.id)?.consumable ?? true,
  }));
}

export function normalizeUsage(usage: SupplyUsage[] | null | undefined): SupplyUsage[] {
  return (usage ?? []).filter((u) => u && typeof u.supplyId === 'string');
}

/** Total drawn against one supply on one project. */
export function usedOnProject(usage: SupplyUsage[], supplyId: string): number {
  return usage.filter((u) => u.supplyId === supplyId).reduce((n, u) => n + (u.quantity || 0), 0);
}

/** Total drawn against one supply across every project. */
export function usedEverywhere(
  documentsByProject: (ProjectDocuments | null | undefined)[],
  supplyId: string
): number {
  return documentsByProject.reduce(
    (n, docs) => n + usedOnProject(normalizeUsage(docs?.supplyUsage), supplyId),
    0
  );
}

/**
 * What's actually on the shelf: what's been stocked, less everything projects
 * have drawn.
 *
 * Deriving this rather than decrementing `stocked` in place means correcting a
 * mis-typed usage entry — or deleting one — puts the stock back automatically,
 * and no sequence of edits can drift the two numbers apart.
 */
export function availableOf(item: SupplyItem, usedTotal: number): number {
  return item.stocked - usedTotal;
}

/**
 * Set the on-hand figure from a physical recount. Usage already logged still
 * has to net out, so the stocked figure absorbs the difference.
 */
export function stockedForOnHand(onHand: number, usedTotal: number): number {
  return onHand + usedTotal;
}

export function newUsageEntry(supplyId: string, quantity: number, note = ''): SupplyUsage {
  return {
    id: `use-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    supplyId,
    quantity,
    date: new Date().toISOString().slice(0, 10),
    note,
  };
}
