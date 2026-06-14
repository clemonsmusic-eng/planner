// ── Battle Items ────────────────────────────────────────────────────────────
// Single-use consumables that emulate a status effect in battle. Buff items
// target the player; debuff items target the enemy. There is one item for every
// status (and therefore for every opposite), so any effect can be both applied
// and cured through items.
//
// Inventory is not yet persisted, so BattleScreen seeds a small STARTER_KIT for
// each fight. When the shop / inventory system lands these hook straight into it.

import type { StatusType } from './statusEffects';

export interface BattleItem {
  id: string;
  name: string;        // real-world flavor
  fantasyName: string; // RPG name
  icon: string;
  applies: StatusType;
  target: 'self' | 'enemy';
  description: string;
}

export const BATTLE_ITEMS: Record<string, BattleItem> = {
  // ── Buff items (target: self) ────────────────────────────────────────────────
  smelling_salts: {
    id: 'smelling_salts', name: 'Smelling Salts', fantasyName: 'Waking Draught', icon: '👁️',
    applies: 'alert', target: 'self', description: 'Stay alert — cannot be put to sleep.',
  },
  tempo_charm: {
    id: 'tempo_charm', name: 'Tempo Charm', fantasyName: 'Chronoton Gear', icon: '⚡',
    applies: 'haste', target: 'self', description: 'Quicken your tempo — act twice each turn.',
  },
  calming_balm: {
    id: 'calming_balm', name: 'Calming Balm', fantasyName: 'Still Waters', icon: '🧘',
    applies: 'calm', target: 'self', description: 'Center yourself — take 0.75× damage.',
  },
  clear_mind_tonic: {
    id: 'clear_mind_tonic', name: 'Clear-Mind Tonic', fantasyName: 'Lucid Vial', icon: '🔮',
    applies: 'clarity', target: 'self', description: 'Perfect focus — actions never scatter.',
  },
  resonance_leaf: {
    id: 'resonance_leaf', name: 'Extra Reed', fantasyName: 'Resonance Leaf', icon: '🌿',
    applies: 'regen', target: 'self', description: 'Restore 10% max HP each turn.',
  },
  tuning_drops: {
    id: 'tuning_drops', name: 'Tuning Drops', fantasyName: 'Truesight Elixir', icon: '🎯',
    applies: 'focus', target: 'self', description: 'Widen your pitch window; never miss.',
  },
  mirror_polish: {
    id: 'mirror_polish', name: 'Mirror Polish', fantasyName: 'Reflective Lacquer', icon: '🛡️',
    applies: 'deflect', target: 'self', description: 'Reflect half of incoming damage.',
  },

  // ── Debuff items (target: enemy) ─────────────────────────────────────────────
  lullaby_bell: {
    id: 'lullaby_bell', name: 'Lullaby Bell', fantasyName: 'Dreaming Chime', icon: '💤',
    applies: 'sleep', target: 'enemy', description: 'Lull the enemy into sleep.',
  },
  molasses_vial: {
    id: 'molasses_vial', name: 'Molasses Vial', fantasyName: 'Draught of Drag', icon: '🐌',
    applies: 'slow', target: 'enemy', description: 'Slow the enemy to every other turn.',
  },
  frenzy_powder: {
    id: 'frenzy_powder', name: 'Frenzy Powder', fantasyName: 'Discordant Dust', icon: '🔥',
    applies: 'manic', target: 'enemy', description: 'Send the enemy into a reckless frenzy.',
  },
  dissonance_bomb: {
    id: 'dissonance_bomb', name: 'Dissonance Bomb', fantasyName: 'Tritone Flask', icon: '💫',
    applies: 'confusion', target: 'enemy', description: 'Confuse the enemy — it may flail.',
  },
  soured_reed: {
    id: 'soured_reed', name: 'Soured Reed', fantasyName: 'Rotting Cane', icon: '☠️',
    applies: 'poison', target: 'enemy', description: 'Poison the enemy — 10% max HP per turn.',
  },
  dimming_dust: {
    id: 'dimming_dust', name: 'Dimming Dust', fantasyName: 'Veil of Murk', icon: '🌫️',
    applies: 'blind', target: 'enemy', description: 'Blind the enemy — its attacks may miss.',
  },
  cracking_oil: {
    id: 'cracking_oil', name: 'Cracking Oil', fantasyName: 'Shatter Solvent', icon: '💥',
    applies: 'vulnerable', target: 'enemy', description: 'Expose the enemy — it takes 1.5× damage.',
  },
  cold_rosin: {
    id: 'cold_rosin', name: 'Cold Rosin', fantasyName: 'Seizing Grit', icon: '🤝',
    applies: 'cramped', target: 'enemy', description: "Seize the enemy's hand — it loses its next turn.",
  },
  hand_balm: {
    id: 'hand_balm', name: 'Hand Balm', fantasyName: 'Limbering Salve', icon: '🤸',
    applies: 'limber', target: 'self', description: 'Warm up your hands — immune to Cramped.',
  },
};

// A modest per-battle loadout until inventory persistence exists.
export const STARTER_KIT: Record<string, number> = {
  resonance_leaf: 2,
  tempo_charm: 1,
  tuning_drops: 1,
  soured_reed: 2,
  dissonance_bomb: 1,
  cracking_oil: 1,
};
