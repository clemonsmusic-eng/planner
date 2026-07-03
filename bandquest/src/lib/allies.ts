// ── Symphony Ally Definitions ─────────────────────────────────────────────────
// Each ally is tied to one or more instruments. Characters can only summon the
// ally that matches their instrument. Summons cost Summon Points (SP) — a
// cross-battle resource distinct from in-battle RP. SP is earned proportional
// to RP earned; bigger summons have higher SP costs.

import type { AllyId, InstrumentId, SymphonyAlly } from '../types/game';

// Scale applied to ally effect amounts based on the summon confirmation rating.
export const SUMMON_SCALE: Record<string, number> = {
  superior: 1.0,
  excellent: 0.8,
  good:      0.6,
  fair:      0.4,
  poor:      0.2,
};

// Extended ally definition used by BattleScreen.
export interface AllyBattleDef {
  id: AllyId;
  name: string;
  abilityName: string;
  abilityDescription: string;
  instruments: InstrumentId[];  // which player instruments can summon this ally
  spCost: number;               // Summon Point cost
}

export const ALLY_BATTLE_DEFS: Record<AllyId, AllyBattleDef> = {
  percival: {
    id: 'percival', name: 'Paige', abilityName: 'Grand Drum Roll',
    instruments: ['percussion'],
    spCost: 90,
    abilityDescription: 'A timpani solo: 4 small hits then a massive finale — leaves the enemy Vulnerable.',
  },
  syrinx: {
    id: 'syrinx', name: 'Flaura', abilityName: 'Ethereal Aria',
    instruments: ['flute'],
    spCost: 100,
    abilityDescription: 'Full restore — heals up to 100% of max HP.',
  },
  salpinx: {
    id: 'salpinx', name: 'Cornelius', abilityName: 'Fanfare of Light',
    instruments: ['trumpet'],
    spCost: 110,
    abilityDescription: 'A legendary trumpet chorus delivers 7 escalating strikes, then grants Haste and Focus.',
  },
  chalumeau: {
    id: 'chalumeau', name: 'Clarence', abilityName: 'Crystalline Cascade',
    instruments: ['clarinet'],
    spCost: 80,
    abilityDescription: '12 rapid precision strikes, then grants Focus.',
  },
  hautbois: {
    id: 'hautbois', name: 'Hautbois', abilityName: 'The Tuning A',
    instruments: ['oboe'],
    spCost: 90,
    abilityDescription: 'Restores 50% HP, clears all debuffs, and grants Deflect.',
  },
  waldhorn: {
    id: 'waldhorn', name: 'Waldhorn', abilityName: 'Mountain Echo',
    instruments: ['french_horn'],
    spCost: 80,
    abilityDescription: 'Three reverberating strikes with escalating power — then inflicts Confusion or Cramped.',
  },
  posaune: {
    id: 'posaune', name: 'Sackbut', abilityName: 'Slide into Shadow',
    instruments: ['trombone'],
    spCost: 100,
    abilityDescription: 'Massive single-target damage, then inflicts Slow and Cramped on the enemy.',
  },
  cantora: {
    id: 'cantora', name: 'Torbult', abilityName: 'Pedal Tone Quake',
    instruments: ['euphonium', 'tuba'],
    spCost: 90,
    abilityDescription: 'Euphonium: heavy damage to the enemy. Tuba: medium damage + Deflect + taunts enemy into basic attacks for 1 turn.',
  },
  bassanello: {
    id: 'bassanello', name: 'Fagotto', abilityName: 'Cantus Antiquus',
    instruments: ['bassoon'],
    spCost: 70,
    abilityDescription: 'Restores 30% HP, clears all negative status effects, and grants Regen for 5 turns.',
  },
  vela: {
    id: 'vela', name: 'Adolpha', abilityName: 'Cool Jazz Improv',
    instruments: ['alto_sax'],
    spCost: 50,
    abilityDescription: 'Improvised solo — random damage and a random debuff on the enemy. High variance.',
  },
  grand_symphony: {
    id: 'grand_symphony', name: 'The Grand Symphony', abilityName: 'Sacred Score',
    instruments: [],
    spCost: 300,
    abilityDescription: 'All ten freed allies perform together. Massive damage, full heal, and all buffs.',
  },
};

// Return the ally that a character can summon based on their instrument, or null.
export function getAllyForInstrument(instrument: InstrumentId): AllyId | null {
  for (const def of Object.values(ALLY_BATTLE_DEFS)) {
    if (def.instruments.includes(instrument)) return def.id;
  }
  return null;
}

// ── Legacy full SymphonyAlly record (used by narrative / lore system) ─────────

export const ALLIES: Record<AllyId, SymphonyAlly> = {
  percival: {
    id: 'percival', trueName: 'Paige', instrument: 'Percussion',
    corruptedName: 'Caucophonus',
    summonAbility: 'Grand Drum Roll',
    summonEffect: 'Timpani solo — 4 small hits + massive finale + Vulnerable',
    rpCost: 90, freed: false, zone: 6,
  },
  syrinx: {
    id: 'syrinx', trueName: 'Flaura', instrument: 'Flute',
    corruptedName: 'The Aria Wraith',
    summonAbility: 'Ethereal Aria',
    summonEffect: 'Heals up to 100% max HP',
    rpCost: 100, freed: false, zone: 5,
  },
  salpinx: {
    id: 'salpinx', trueName: 'Cornelius', instrument: 'Trumpet',
    corruptedName: 'The War Horn Berserker',
    summonAbility: 'Fanfare of Light',
    summonEffect: '7-hit trumpet chorus + Haste + Focus',
    rpCost: 110, freed: false, zone: 5,
  },
  chalumeau: {
    id: 'chalumeau', trueName: 'Clarence', instrument: 'Clarinet',
    corruptedName: 'Bassetto',
    summonAbility: 'Crystalline Cascade',
    summonEffect: '12-hit cascade + Focus',
    rpCost: 80, freed: false, zone: 6,
  },
  hautbois: {
    id: 'hautbois', trueName: 'Hautbois', instrument: 'Oboe',
    corruptedName: 'The Double-Reed Specter',
    summonAbility: 'The Tuning A',
    summonEffect: '50% heal + clear debuffs + Deflect',
    rpCost: 90, freed: false, zone: 8,
  },
  waldhorn: {
    id: 'waldhorn', trueName: 'Waldhorn', instrument: 'French Horn',
    corruptedName: 'The Forest Flogger',
    summonAbility: 'Mountain Echo',
    summonEffect: '3 escalating echo strikes + Confusion or Cramped',
    rpCost: 80, freed: false, zone: 8,
  },
  posaune: {
    id: 'posaune', trueName: 'Sackbut', instrument: 'Trombone',
    corruptedName: 'The Sliding Chaos Knight',
    summonAbility: 'Slide into Shadow',
    summonEffect: 'Massive damage + Slow + Cramped',
    rpCost: 100, freed: false, zone: 7,
  },
  cantora: {
    id: 'cantora', trueName: 'Torbult', instrument: 'Euphonium / Tuba',
    corruptedName: 'The Stone Colossus',
    summonAbility: 'Pedal Tone Quake',
    summonEffect: 'Euphonium: heavy damage | Tuba: AoE + Deflect + taunt',
    rpCost: 90, freed: false, zone: 7,
  },
  bassanello: {
    id: 'bassanello', trueName: 'Fagotto', instrument: 'Bassoon',
    corruptedName: 'The Ancient Revenant',
    summonAbility: 'Cantus Antiquus',
    summonEffect: '30% heal + clear debuffs + Regen ×5',
    rpCost: 70, freed: false, zone: 8,
  },
  vela: {
    id: 'vela', trueName: 'Adolpha', instrument: 'Alto Saxophone',
    corruptedName: 'The Sound Shadow',
    summonAbility: 'Cool Jazz Improv',
    summonEffect: 'Random damage + random debuff on enemy',
    rpCost: 50, freed: false, zone: 7,
  },
  grand_symphony: {
    id: 'grand_symphony', trueName: 'The Grand Symphony', instrument: 'All Instruments',
    corruptedName: '—',
    summonAbility: 'Sacred Score',
    summonEffect: 'Massive damage + full heal + all buffs',
    rpCost: 300, freed: false, zone: 12,
  },
};
