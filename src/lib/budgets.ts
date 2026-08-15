import type { PhaseBudgetHours, ProjectInputs, ScheduleResult } from '../types';

/**
 * Man-hours, budgeted per group of phases rather than as one number.
 *
 * The quote a client signs prices the planning visit separately from the
 * packing, so both are entered separately here. They spend from a single pool
 * though — the scheduler treats everything up to and including Final Pack as
 * one allowance, because moving an hour between the first visit and a sort day
 * is a scheduling decision, not a change to what was sold.
 */

export type BudgetKey = keyof PhaseBudgetHours;
export type BudgetPool = 'pack' | 'move' | 'dispersal';

export interface BudgetGroup {
  key: BudgetKey;
  label: string;
  hint: string;
  /** The pool this group's hours are spent from. */
  pool: BudgetPool;
  phaseIds: string[];
}

/** The four figures entered on the Inputs tab, in the order they're worked. */
export const BUDGET_GROUPS: BudgetGroup[] = [
  {
    key: 'planning',
    label: 'Planning Move',
    hint: 'First visit',
    pool: 'pack',
    phaseIds: ['phase-1'],
  },
  {
    key: 'packing',
    label: 'Packing Services',
    hint: 'Second visit through final pack & pre-move',
    pool: 'pack',
    phaseIds: ['phase-2', 'phase-3', 'phase-4-1', 'phase-4-2'],
  },
  {
    key: 'move',
    label: 'Move & Resettlement',
    hint: 'Move day only',
    pool: 'move',
    phaseIds: ['phase-5-1', 'phase-5-2'],
  },
  {
    key: 'dispersals',
    label: 'Dispersals & Cleanout',
    hint: 'Cleanout, lot prep, auction pickup',
    pool: 'dispersal',
    phaseIds: ['phase-6', 'phase-lot-prep', 'phase-pickup-prep', 'phase-7'],
  },
];

/** What the scheduler actually spends from, and what to call it when reporting. */
export const BUDGET_POOLS: { pool: BudgetPool; label: string; keys: BudgetKey[] }[] = [
  { pool: 'pack', label: 'Planning & Packing', keys: ['planning', 'packing'] },
  { pool: 'move', label: 'Move & Resettlement', keys: ['move'] },
  { pool: 'dispersal', label: 'Dispersals & Cleanout', keys: ['dispersals'] },
];

const PHASE_TO_POOL = new Map<string, BudgetPool>(
  BUDGET_GROUPS.flatMap((g) => g.phaseIds.map((id) => [id, g.pool] as const))
);

/** Which pool a shift spends from. Unknown phases fall to the packing pool,
 *  which is where a hand-added shift before move day belongs. */
export function poolOfPhase(phaseId: string): BudgetPool {
  return PHASE_TO_POOL.get(phaseId) ?? 'pack';
}

export function emptyPhaseBudgets(): PhaseBudgetHours {
  return { planning: 0, packing: 0, move: 0, dispersals: 0 };
}

/**
 * Tolerate projects saved before the split. Their single figure is not carried
 * over: there is no way to know how it divided, and a guess would read as a
 * quote nobody gave.
 */
export function normalizePhaseBudgets(b: Partial<PhaseBudgetHours> | null | undefined): PhaseBudgetHours {
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);
  return {
    planning: num(b?.planning),
    packing: num(b?.packing),
    move: num(b?.move),
    dispersals: num(b?.dispersals),
  };
}

export function totalBudgetedHours(budgets: PhaseBudgetHours | null | undefined): number {
  const b = normalizePhaseBudgets(budgets);
  return b.planning + b.packing + b.move + b.dispersals;
}

/** Hours allowed in one pool. */
export function poolBudget(budgets: PhaseBudgetHours, pool: BudgetPool): number {
  const b = normalizePhaseBudgets(budgets);
  return BUDGET_POOLS.find((p) => p.pool === pool)!.keys.reduce((n, k) => n + b[k], 0);
}

/** Hours the generated plan actually puts in one pool. */
export function poolScheduled(schedule: ScheduleResult | null, pool: BudgetPool): number {
  if (!schedule) return 0;
  return schedule.days.reduce(
    (sum, day) =>
      sum + day.entries.filter((e) => poolOfPhase(e.phaseId) === pool).reduce((n, e) => n + e.hours, 0),
    0
  );
}

/** The total budget for a project, from its four figures. */
export function budgetOf(inputs: ProjectInputs): number {
  return totalBudgetedHours(inputs.phaseBudgets);
}
