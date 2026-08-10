import type { ProjectDocuments, SupplyItem, SupplyUsage } from '../types';

/**
 * Master supply inventory.
 *
 * The Director of Operations owns this list; project managers draw against it
 * from their own job's supply page. Stock is modelled as a `stocked` figure
 * with usage derived from the projects rather than decremented in place —
 * see availableOf() for why.
 */

export const SUPPLY_CATEGORIES = [
  'Packing & Tools',
  'Fanny Pack',
  'Tote Bag',
  'Tool Bag',
  'In Van',
] as const;

export type SupplyCategory = (typeof SUPPLY_CATEGORIES)[number];

function item(
  id: string,
  name: string,
  category: SupplyCategory,
  unit = '',
  description = ''
): SupplyItem {
  return { id, name, category, unit, description, stocked: 0, costPerUnit: null };
}

/**
 * Starting list, transcribed from the operations supply sheet. Everything here
 * can be edited, removed, or added to — it's only the default.
 *
 * The kit sections (Fanny Pack, Tote Bag, Tool Bag, In Van) are what each
 * staffer carries, so their sheet "Amount" is kept as a carry note rather than
 * a stock count.
 */
export const DEFAULT_SUPPLIES: SupplyItem[] = [
  item('sup-small-box', 'Small Box', 'Packing & Tools'),
  item('sup-medium-box', 'Medium Box', 'Packing & Tools'),
  item('sup-large-box', 'Large Box', 'Packing & Tools'),
  item('sup-small-bubble', 'Small Bubble Wrap', 'Packing & Tools', 'roll', "300'"),
  item('sup-large-bubble', 'Large Bubble Wrap', 'Packing & Tools', 'roll'),
  item('sup-small-bubble-box', 'Small Bubble Wrap Box', 'Packing & Tools', 'box', "150'"),
  item('sup-large-bubble-box', 'Large Bubble Wrap Box', 'Packing & Tools', 'box', "100'"),
  item('sup-paper-tape', 'Paper Packing Tape', 'Packing & Tools', 'roll'),
  item('sup-packing-paper-200', 'Packing Paper', 'Packing & Tools', '200 ct'),
  item('sup-packing-paper-500', 'Packing Paper', 'Packing & Tools', '500 ct'),
  item('sup-permanent-marker', 'Permanent Marker', 'Packing & Tools'),
  item('sup-box-cutter', 'Box Cutter', 'Packing & Tools'),
  item('sup-drill', 'Drill', 'Packing & Tools'),
  item('sup-electric-driver', 'Electric Driver', 'Packing & Tools'),
  item('sup-flathead-driver', 'Flathead Driver', 'Packing & Tools'),
  item('sup-phillipshead-driver', 'Phillipshead Driver', 'Packing & Tools'),

  item('sup-fp-marker', 'Marker', 'Fanny Pack', '', 'Carry 2'),
  item('sup-fp-box-cutter', 'Box Cutter', 'Fanny Pack', '', 'Carry 1'),

  item('sup-tote-trash-bags', 'Trash Bags', 'Tote Bag', '', 'Carry 2–3'),
  item('sup-tote-freezer-bags', 'Freezer Bags', 'Tote Bag', 'box', 'Carry 1 box'),
  item('sup-tote-quart-bags', 'Quart Bags', 'Tote Bag', 'box', 'Carry 1 box'),

  item('sup-tb-drill', 'Drill', 'Tool Bag'),
  item('sup-tb-level', 'Level', 'Tool Bag'),
  item('sup-tb-laser-measurer', 'Laser Measurer', 'Tool Bag'),
  item('sup-tb-tape-measure', 'Tape Measure', 'Tool Bag'),
  item('sup-tb-phillips', 'Phillips Head Driver', 'Tool Bag'),
  item('sup-tb-flat', 'Flat Head Driver', 'Tool Bag'),
  item('sup-tb-wire-cutters', 'Wire Cutters', 'Tool Bag'),

  item('sup-van-ladder', "6' Ladder", 'In Van', '', 'Carry 2'),
  item('sup-van-step-stool', '3 Step Step Stool', 'In Van', '', 'Carry 2'),
  item('sup-van-small-step', 'Small Step', 'In Van'),
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
  };
}

/** Tolerate items persisted before a field existed. */
export function normalizeSupplies(supplies: SupplyItem[] | null | undefined): SupplyItem[] {
  if (!supplies || supplies.length === 0) return DEFAULT_SUPPLIES.map((s) => ({ ...s }));
  return supplies.map((s) => ({
    ...s,
    stocked: Number.isFinite(s.stocked) ? s.stocked : 0,
    costPerUnit: typeof s.costPerUnit === 'number' ? s.costPerUnit : null,
    unit: s.unit ?? '',
    description: s.description ?? '',
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
