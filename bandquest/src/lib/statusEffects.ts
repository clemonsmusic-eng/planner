// ── Status Effects ──────────────────────────────────────────────────────────
// Single source of truth for every battle status: the buff/debuff catalog, the
// numeric rules that govern them, and helpers for applying / ticking them.
//
// A status applies to either combatant (player or enemy). The battle loop reads
// these rules in three places:
//   • per-turn tick   — poison / regen change HP at the end of the owner's turn
//   • action modifier — blind / manic / confusion / deflect alter a resolved action
//   • turn flow       — sleep / slow / haste / cramped change how many turns the owner gets
//
// cramped vs. sleep: both skip a turn, but cramped is NOT cleared by taking damage
// and always lasts exactly 1 turn. Think carpal-tunnel-style muscle seize — you
// can't just shake it off mid-performance.

export type StatusType =
  // debuffs
  | 'sleep'
  | 'slow'
  | 'manic'
  | 'confusion'
  | 'poison'
  | 'blind'
  | 'vulnerable'
  | 'cramped'     // hard 1-turn stun — not cleared by damage
  // buffs (each is the opposite of one debuff)
  | 'alert'      // ↔ sleep
  | 'haste'      // ↔ slow
  | 'calm'       // ↔ manic
  | 'clarity'    // ↔ confusion
  | 'regen'      // ↔ poison
  | 'focus'      // ↔ blind
  | 'deflect'    // ↔ vulnerable
  | 'limber';    // ↔ cramped

export interface StatusEffect {
  type: StatusType;
  turnsLeft: number;
}

export interface StatusDef {
  type: StatusType;
  name: string;
  kind: 'buff' | 'debuff';
  icon: string;        // emoji shown in the badge
  badge: string;       // short uppercase label
  colorClass: string;  // tailwind text + bg classes
  defaultDuration: number;
  opposite: StatusType; // the status this one cancels / is cancelled by
  description: string;
}

// ── Numeric rules ─────────────────────────────────────────────────────────────
export const POISON_PCT = 0.10;            // % of max HP lost at end of turn
export const REGEN_PCT = 0.10;             // % of max HP restored at end of turn
export const BLIND_TOLERANCE_MULT = 0.5;   // performer's pitch window when blinded
export const BLIND_MISS_CHANCE = 0.4;      // chance a blinded attacker whiffs
export const MANIC_DEAL_MULT = 1.5;        // damage dealt while manic
export const MANIC_TAKEN_MULT = 1.25;      // damage taken while manic
export const DEFLECT_PCT = 0.5;            // share of incoming damage reflected
export const CONFUSION_FAIL_CHANCE = 0.5;  // chance a confused action fizzles
export const MANIC_TOLERANCE_MULT = 0.75;  // performer's pitch window when manic (narrowed)
export const FOCUS_TOLERANCE_MULT = 1.5;   // performer's pitch window when focused
export const CALM_DEAL_MULT = 0.75;        // damage dealt while calm
export const CALM_TAKEN_MULT = 0.75;       // damage taken while calm
export const VULNERABLE_TAKEN_MULT = 1.5;  // damage taken while vulnerable

// Endurance mitigates incoming enemy damage, but cannot reduce a hit below this
// fraction of the enemy's power — otherwise high-endurance classes (Tuba/Euphonium)
// take only 1 damage and become effectively invincible. Keeps every class mortal
// while preserving the tank fantasy (tanks still take far less per hit).
export const ENEMY_DAMAGE_FLOOR = 0.4;

export const STATUS_DEFS: Record<StatusType, StatusDef> = {
  // ── Debuffs ──────────────────────────────────────────────────────────────────
  sleep: {
    type: 'sleep', name: 'Sleep', kind: 'debuff', icon: '💤', badge: 'SLEEP',
    colorClass: 'text-sky-300 bg-sky-300/10', defaultDuration: 3, opposite: 'alert',
    description: 'Skips every turn until woken by taking damage.',
  },
  slow: {
    type: 'slow', name: 'Slow', kind: 'debuff', icon: '🐌', badge: 'SLOW',
    colorClass: 'text-indigo-300 bg-indigo-300/10', defaultDuration: 3, opposite: 'haste',
    description: 'Acts only every other turn.',
  },
  manic: {
    type: 'manic', name: 'Manic', kind: 'debuff', icon: '🔥', badge: 'MANIC',
    colorClass: 'text-orange-400 bg-orange-400/10', defaultDuration: 3, opposite: 'calm',
    description: 'Deals 1.5× damage but takes 1.25× damage; cannot defend.',
  },
  confusion: {
    type: 'confusion', name: 'Confusion', kind: 'debuff', icon: '💫', badge: 'CONFUSE',
    colorClass: 'text-fuchsia-300 bg-fuchsia-300/10', defaultDuration: 2, opposite: 'clarity',
    description: 'Half the time the action scatters and fails.',
  },
  poison: {
    type: 'poison', name: 'Poison', kind: 'debuff', icon: '☠️', badge: 'POISON',
    colorClass: 'text-lime-400 bg-lime-400/10', defaultDuration: 3, opposite: 'regen',
    description: 'Loses 10% max HP at the end of each turn.',
  },
  blind: {
    type: 'blind', name: 'Blind', kind: 'debuff', icon: '🌫️', badge: 'BLIND',
    colorClass: 'text-rating-fair bg-rating-fair/10', defaultDuration: 2, opposite: 'focus',
    description: 'Pitch window halved; attacks may miss entirely.',
  },
  vulnerable: {
    type: 'vulnerable', name: 'Vulnerable', kind: 'debuff', icon: '💥', badge: 'VULN',
    colorClass: 'text-red-400 bg-red-400/10', defaultDuration: 2, opposite: 'deflect',
    description: 'Takes 1.5× damage from all sources.',
  },
  cramped: {
    type: 'cramped', name: 'Cramped', kind: 'debuff', icon: '🤝', badge: 'CRAMP',
    colorClass: 'text-rose-300 bg-rose-300/10', defaultDuration: 1, opposite: 'limber',
    description: 'Hand seizes up — skips next turn. Unlike sleep, not cleared by damage.',
  },

  // ── Buffs (opposite of the matching debuff) ──────────────────────────────────
  alert: {
    type: 'alert', name: 'Alert', kind: 'buff', icon: '👁️', badge: 'ALERT',
    colorClass: 'text-sky-200 bg-sky-200/10', defaultDuration: 3, opposite: 'sleep',
    description: 'Cannot be put to sleep.',
  },
  haste: {
    type: 'haste', name: 'Haste', kind: 'buff', icon: '⚡', badge: 'HASTE',
    colorClass: 'text-yellow-300 bg-yellow-300/10', defaultDuration: 3, opposite: 'slow',
    description: 'Takes an extra action each turn.',
  },
  calm: {
    type: 'calm', name: 'Calm', kind: 'buff', icon: '🧘', badge: 'CALM',
    colorClass: 'text-teal-200 bg-teal-200/10', defaultDuration: 3, opposite: 'manic',
    description: 'Deals 0.75× but takes only 0.75× damage.',
  },
  clarity: {
    type: 'clarity', name: 'Clarity', kind: 'buff', icon: '🔮', badge: 'CLARITY',
    colorClass: 'text-fuchsia-200 bg-fuchsia-200/10', defaultDuration: 3, opposite: 'confusion',
    description: 'Actions never scatter; immune to confusion.',
  },
  regen: {
    type: 'regen', name: 'Regen', kind: 'buff', icon: '🌿', badge: 'REGEN',
    colorClass: 'text-emerald-300 bg-emerald-300/10', defaultDuration: 3, opposite: 'poison',
    description: 'Restores 10% max HP at the end of each turn.',
  },
  focus: {
    type: 'focus', name: 'Focus', kind: 'buff', icon: '🎯', badge: 'FOCUS',
    colorClass: 'text-amber-200 bg-amber-200/10', defaultDuration: 3, opposite: 'blind',
    description: 'Pitch window widened; attacks never miss.',
  },
  deflect: {
    type: 'deflect', name: 'Deflect', kind: 'buff', icon: '🛡️', badge: 'DEFLECT',
    colorClass: 'text-cyan-300 bg-cyan-300/10', defaultDuration: 2, opposite: 'vulnerable',
    description: 'Reflects half of incoming damage back at the attacker.',
  },
  limber: {
    type: 'limber', name: 'Limber', kind: 'buff', icon: '🤸', badge: 'LIMBER',
    colorClass: 'text-rose-200 bg-rose-200/10', defaultDuration: 3, opposite: 'cramped',
    description: 'Hands are warm and loose — immune to Cramped.',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function hasStatus(list: StatusEffect[], type: StatusType): boolean {
  return list.some((s) => s.type === type);
}

// Add a status, refreshing the duration to the longer of the two if it already exists.
export function mergeStatus(list: StatusEffect[], effect: StatusEffect): StatusEffect[] {
  const existing = list.find((s) => s.type === effect.type);
  if (existing) {
    return list.map((s) =>
      s.type === effect.type ? { ...s, turnsLeft: Math.max(s.turnsLeft, effect.turnsLeft) } : s,
    );
  }
  return [...list, effect];
}

// Decrement all durations and drop expired statuses.
export function tickDurations(list: StatusEffect[]): StatusEffect[] {
  return list.map((s) => ({ ...s, turnsLeft: s.turnsLeft - 1 })).filter((s) => s.turnsLeft > 0);
}

// Remove a status (e.g. sleep cleared by taking damage).
export function clearStatus(list: StatusEffect[], type: StatusType): StatusEffect[] {
  return list.filter((s) => s.type !== type);
}

// Remove every status of a given kind (used by cleanse abilities).
export function clearByKind(list: StatusEffect[], kind: 'buff' | 'debuff'): StatusEffect[] {
  return list.filter((s) => STATUS_DEFS[s.type].kind !== kind);
}

// Apply a status with opposite-cancel semantics: if the target already carries
// the opposite status, the two neutralize (opposite removed, new one NOT added).
// Otherwise the new status is merged in. Returns whether a cancel happened.
export function applyStatus(
  list: StatusEffect[],
  effect: StatusEffect,
): { list: StatusEffect[]; neutralized: boolean } {
  const opp = STATUS_DEFS[effect.type].opposite;
  if (hasStatus(list, opp)) {
    return { list: clearStatus(list, opp), neutralized: true };
  }
  return { list: mergeStatus(list, effect), neutralized: false };
}

// HP delta applied at the end of an owner's turn from poison/regen.
export function endOfTurnHpDelta(list: StatusEffect[], maxHp: number): number {
  let delta = 0;
  if (hasStatus(list, 'regen')) delta += Math.round(maxHp * REGEN_PCT);
  if (hasStatus(list, 'poison')) delta -= Math.round(maxHp * POISON_PCT);
  return delta;
}

export function newStatus(type: StatusType, turnsLeft?: number): StatusEffect {
  return { type, turnsLeft: turnsLeft ?? STATUS_DEFS[type].defaultDuration };
}
