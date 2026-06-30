import type { InstrumentId } from '../types/game';
import type { StatusType } from './statusEffects';

export type EnemyTier = 1 | 2 | 3 | 4 | 5 | 6;

export interface EnemyDef {
  id: string;
  tier: EnemyTier;
  zone: number;          // first zone where this enemy appears
  name: string;
  description: string;
  power: number;
  maxHp: number;
  attackDescription: string;
  specialAttackName?: string;
  specialAttackChallengeType?: string;
  debuff?: StatusType;
  debuffDuration?: number;
  debuffChance?: number;  // chance the enemy inflicts its status on a standard attack (default 0.4)
  vulnerableTo: InstrumentId[];
  isBoss: boolean;
  phase2Threshold?: number;
  lore?: string;
}

export const ENEMIES: Record<string, EnemyDef> = {
  // ── Tier 1: Accidentals ──────────────────────────────────────────────────────
  flatling: {
    id: 'flatling',
    tier: 1,
    zone: 1,
    name: 'Flatling',
    description: 'Small, blue-grey, droopy. Emits flat, sagging notes.',
    power: 8,
    maxHp: 60,
    attackDescription: 'Drains Accuracy — pitches harder to land',
    specialAttackName: 'Flat Pulse',
    specialAttackChallengeType: 'aural_pitch_spy',
    debuff: 'blind',
    debuffDuration: 2,
    vulnerableTo: ['oboe', 'clarinet', 'flute'],
    isBoss: false,
    lore: 'Born when a note is played flat and forgotten.',
  },
  sharp_creature: {
    id: 'sharp_creature',
    tier: 1,
    zone: 1,
    name: 'Sharp',
    description: 'Red-orange, spiked, aggressive. Screeches piercing tones.',
    power: 12,
    maxHp: 50,
    attackDescription: 'Fast physical spike attack, high crit chance',
    specialAttackName: 'Shriek',
    specialAttackChallengeType: 'aural_pitch_spy',
    vulnerableTo: ['oboe', 'clarinet', 'flute'],
    isBoss: false,
  },
  natural_creature: {
    id: 'natural_creature',
    tier: 1,
    zone: 1,
    name: 'Natural',
    description: 'White, neutral, annoying. Appears alongside others.',
    power: 6,
    maxHp: 40,
    attackDescription: 'Cancels debuffs on ally enemies; dispels player buffs',
    vulnerableTo: ['oboe', 'clarinet', 'flute'],
    isBoss: false,
  },
  double_flat_wretch: {
    id: 'double_flat_wretch',
    tier: 1,
    zone: 3,
    name: 'Double-Flat Wretch',
    description: 'Larger Flatling variant, deeper droop, more powerful.',
    power: 14,
    maxHp: 90,
    attackDescription: 'Stacks Accuracy drain; forces a lower note challenge',
    specialAttackName: 'Deep Sag',
    specialAttackChallengeType: 'aural_pitch_spy',
    debuff: 'blind',
    debuffDuration: 3,
    vulnerableTo: ['oboe', 'clarinet', 'flute'],
    isBoss: false,
  },

  // ── Tier 2: Chronotons ────────────────────────────────────────────────────────
  chronoton_scout: {
    id: 'chronoton_scout',
    tier: 2,
    zone: 3,
    name: 'Chronoton Scout',
    description: 'Tick-tock robot marching in perfect 4/4.',
    power: 10,
    maxHp: 70,
    attackDescription: 'Attack lands every 4 beats — completely predictable',
    specialAttackName: 'Metronomic Strike',
    specialAttackChallengeType: 'aural_rhythm_echo',
    vulnerableTo: ['percussion', 'clarinet', 'alto_sax'],
    isBoss: false,
  },
  chronoton_shifter: {
    id: 'chronoton_shifter',
    tier: 2,
    zone: 3,
    name: 'Chronoton Shifter',
    description: 'Shifts time signature mid-battle without warning.',
    power: 14,
    maxHp: 80,
    attackDescription: 'Changes attack rhythm suddenly; disrupts player timing',
    specialAttackName: 'Time Shift',
    specialAttackChallengeType: 'aural_rhythm_echo',
    vulnerableTo: ['percussion', 'clarinet', 'alto_sax'],
    isBoss: false,
  },

  shard_phantom: {
    id: 'shard_phantom',
    tier: 1,
    zone: 2,
    name: 'The Footlight Phantom',
    description: 'A mischievous theater-sprite that haunts old concert halls, drawn out by the swell of live music. Harmless but maddening — it flits through the hall scattering sheet music and tangling the ensemble\'s carefully built sound.',
    power: 20,
    maxHp: 200,
    attackDescription: 'Page Scatter — jumbles your sense of pitch relationships',
    specialAttackName: 'Footlight Flicker',
    specialAttackChallengeType: 'aural_interval_quest',
    debuff: 'confusion',
    debuffDuration: 2,
    vulnerableTo: ['bassoon', 'oboe', 'french_horn'],
    isBoss: true,
    phase2Threshold: 0.5,
    lore: 'No one is sure how long it has nested in the Theory Wing\'s old recital hall. It means no harm — it simply cannot resist a good crescendo.',
  },

  // ── Bosses ─────────────────────────────────────────────────────────────────────
  enchanted_music_stand: {
    id: 'enchanted_music_stand',
    tier: 1,
    zone: 1,
    name: 'The Enchanted Music Stand',
    description: 'A practice room stand possessed by a wandering Flatling. It rattles the music and drains your Accuracy.',
    power: 18,
    maxHp: 180,
    attackDescription: 'Rattles the score — Accuracy drain + rhythm disruption',
    specialAttackName: 'Score Rattle',
    specialAttackChallengeType: 'aural_pitch_spy',
    debuff: 'blind',
    debuffDuration: 2,
    vulnerableTo: ['oboe', 'clarinet', 'flute'],
    isBoss: true,
    phase2Threshold: 0.5,
    lore: 'The stand has stood in Practice Room 4 for thirty years. No one remembers who left the Flatling there.',
  },
  flat_dragon: {
    id: 'flat_dragon',
    tier: 1,
    zone: 1,
    name: 'The Flat Dragon',
    description: 'A dragon whose very breath pulls everything flat. Your accuracy window is halved for the entire fight.',
    power: 22,
    maxHp: 240,
    attackDescription: 'Flat Breath — all pitch challenges have halved tolerance this battle',
    specialAttackName: 'Flat Breath',
    specialAttackChallengeType: 'aural_pitch_spy',
    debuff: 'blind',
    debuffDuration: 999,
    vulnerableTo: ['oboe', 'flute', 'clarinet'],
    isBoss: true,
    phase2Threshold: 0.4,
    lore: 'Ancient texts describe this creature as the "Flattener of Harmonics."',
  },
  interval_imp: {
    id: 'interval_imp',
    tier: 2,
    zone: 2,
    name: 'The Interval Imp',
    description: 'Born from a mis-played tritone in the theory classroom. Chaotic, scrambles player timing.',
    power: 20,
    maxHp: 200,
    attackDescription: 'Tritone Scramble — confuses all active buffs',
    specialAttackName: 'Tritone Scramble',
    specialAttackChallengeType: 'aural_interval_quest',
    debuff: 'confusion',
    debuffDuration: 1,
    vulnerableTo: ['bassoon', 'oboe', 'french_horn'],
    isBoss: true,
    phase2Threshold: 0.5,
    lore: 'Maestro Persichetti swears the theory classroom was perfectly normal before this year.',
  },

  // ── Act 2 · Zone 5 — The Melodious Meadows ───────────────────────────────────
  stray_melody: {
    id: 'stray_melody',
    tier: 1,
    zone: 5,
    name: 'Stray Melody',
    description: 'A scrap of music torn loose in the Shattering, drifting the meadows with no player left to guide it.',
    power: 16,
    maxHp: 120,
    attackDescription: 'A wandering, off-key phrase that nicks at your focus',
    specialAttackName: 'Wrong Note',
    specialAttackChallengeType: 'aural_pitch_spy',
    debuff: 'blind',
    debuffDuration: 1,
    vulnerableTo: ['oboe', 'clarinet', 'flute'],
    isBoss: false,
  },
  aria_wraith: {
    id: 'aria_wraith',
    tier: 1,
    zone: 5,
    name: 'The Aria Wraith',
    description: 'Maestra Flaura, your flute professor, hollowed to a single endless note. She drifts above a field of crops she has kept standing long after they died.',
    power: 22,
    maxHp: 280,
    attackDescription: 'A sustained, sorrowful tone that drags at your limbs',
    specialAttackName: 'Endless Aria',
    specialAttackChallengeType: 'aural_melody_mapper',
    debuff: 'slow',
    debuffDuration: 2,
    vulnerableTo: ['trumpet', 'trombone', 'tuba'],
    isBoss: true,
    phase2Threshold: 0.5,
    lore: 'She will not stop playing. She does not seem to remember how.',
  },
  war_horn_berserker: {
    id: 'war_horn_berserker',
    tier: 1,
    zone: 5,
    name: 'The War Horn Berserker',
    description: 'Maestra Buccina, your trumpet professor, reduced to a single blaring call to charge. She does not know you — only sounds the attack, again and again.',
    power: 26,
    maxHp: 320,
    attackDescription: 'A blaring fanfare driving a reckless, heavy strike',
    specialAttackName: 'Endless Charge',
    specialAttackChallengeType: 'aural_rhythm_echo',
    debuff: 'confusion',
    debuffDuration: 1,
    vulnerableTo: ['clarinet', 'percussion', 'alto_sax'],
    isBoss: true,
    phase2Threshold: 0.5,
    lore: 'Beneath the noise she is still searching for someone — a brother, lost in the same storm that took her.',
  },

  // ── Act 2 · Zone 6 — Sands of Time (Register Phantoms + maestro bosses) ───────
  chalumeau_phantom: {
    id: 'chalumeau_phantom',
    tier: 1,
    zone: 6,
    name: 'Chalumeau Phantom',
    description: 'A low, dark shape that haunts the deepest Chaconne Caves, droning in the clarinet\'s bottom register.',
    power: 17,
    maxHp: 130,
    attackDescription: 'A heavy, sluggish low blow',
    specialAttackName: 'Deep Drone',
    specialAttackChallengeType: 'aural_interval_quest',
    debuff: 'slow',
    debuffDuration: 1,
    vulnerableTo: ['oboe', 'flute', 'trumpet'],
    isBoss: false,
  },
  clarion_phantom: {
    id: 'clarion_phantom',
    tier: 1,
    zone: 6,
    name: 'Clarion Phantom',
    description: 'A bright, piercing shape that flits through the upper caves, shrieking in the clarinet\'s clarion register.',
    power: 19,
    maxHp: 95,
    attackDescription: 'A fast, ringing strike with a vicious edge',
    specialAttackName: 'Clarion Shriek',
    specialAttackChallengeType: 'aural_pitch_spy',
    debuff: 'blind',
    debuffDuration: 1,
    vulnerableTo: ['oboe', 'clarinet', 'flute'],
    isBoss: false,
  },
  bassetta: {
    id: 'bassetta',
    tier: 1,
    zone: 6,
    name: 'Bassetta',
    description: 'Maestra Claribel, your clarinet professor, scattered across every register at once — a short-tempered nomad whose wail rises and plunges without warning.',
    power: 24,
    maxHp: 300,
    attackDescription: 'A register-leaping wail that lashes from nowhere',
    specialAttackName: 'Break Crossing',
    specialAttackChallengeType: 'aural_interval_quest',
    debuff: 'confusion',
    debuffDuration: 2,
    vulnerableTo: ['oboe', 'flute', 'french_horn'],
    isBoss: true,
    phase2Threshold: 0.5,
    lore: 'The desert wind carries her three registers in three directions. Pin all three and she is herself again.',
  },
  caucophonus: {
    id: 'caucophonus',
    tier: 2,
    zone: 6,
    name: 'Caucophonus',
    description: 'Maestro Percival, your percussion professor, reduced to a tireless engine of production — stamping out discord-laced goods at the Caesura Crossing.',
    power: 28,
    maxHp: 360,
    attackDescription: 'A relentless, mechanical hammering on the downbeat',
    specialAttackName: 'Discord Assembly',
    specialAttackChallengeType: 'aural_rhythm_echo',
    debuff: 'cramped',
    debuffDuration: 1,
    vulnerableTo: ['clarinet', 'alto_sax', 'percussion'],
    isBoss: true,
    phase2Threshold: 0.5,
    lore: 'He builds without pause and without purpose. Break his rhythm and the workshop falls silent at last.',
  },
};

export type BattleId = string;

export interface BattleConfig {
  id: BattleId;
  name: string;
  enemies: string[]; // enemy ids
  zoneId: number;
  isBoss: boolean;
  isMiniBuffer: boolean;
  rewardXp: number;
  rewardCoins: number;
  rewardGearId?: string;
  victoryNarrative: string;
  defeatNarrative: string;
}

export const BATTLES: Record<BattleId, BattleConfig> = {
  // Zone 1 encounters
  z1_flatling_encounter: {
    id: 'z1_flatling_encounter',
    name: 'Flatling Encounter',
    enemies: ['flatling'],
    zoneId: 1,
    isBoss: false,
    isMiniBuffer: false,
    rewardXp: 200,
    rewardCoins: 5,
    victoryNarrative: 'The Flatling dissolves into a off-key sigh. Your pitch holds true.',
    defeatNarrative: 'The Flatling\'s influence drags your tone flat. Retreat to the Academy.',
  },
  z1_mini_boss: {
    id: 'z1_mini_boss',
    name: 'The Enchanted Music Stand',
    enemies: ['enchanted_music_stand'],
    zoneId: 1,
    isBoss: false,
    isMiniBuffer: true,
    rewardXp: 600,
    rewardCoins: 15,
    rewardGearId: 'iron_stand',
    victoryNarrative: 'The Flatling\'s grip on the stand shatters. It tips over harmlessly, an ordinary object once more.',
    defeatNarrative: 'The stand\'s rattling overwhelms your focus. You retreat to the practice hall.',
  },
  z1_boss: {
    id: 'z1_boss',
    name: 'The Graduation Trial',
    enemies: ['flat_dragon'],
    zoneId: 1,
    isBoss: true,
    isMiniBuffer: false,
    rewardXp: 1500,
    rewardCoins: 40,
    victoryNarrative: 'The Flat Dragon retreats into the mountains. The Academy cheers. Headmaster Fennelio nods.',
    defeatNarrative: 'The dragon\'s breath pulls every note flat. You withdraw to the practice halls.',
  },
  z2_mini_boss: {
    id: 'z2_mini_boss',
    name: 'The Interval Imp',
    enemies: ['interval_imp'],
    zoneId: 2,
    isBoss: false,
    isMiniBuffer: true,
    rewardXp: 600,
    rewardCoins: 15,
    victoryNarrative: 'The Interval Imp dissolves in a cascade of correctly identified intervals. Maestro Persichetti looks unsurprised.',
    defeatNarrative: 'The Imp\'s tritone scramble overwhelms your training. Retreat to the Theory Wing.',
  },
};
