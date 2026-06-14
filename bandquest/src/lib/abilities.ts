import type { InstrumentId } from '../types/game';
import type { StatusType } from './statusEffects';

export type ChallengeType =
  | 'prepared_performance'
  | 'technique_scale'
  | 'rhythm_performance'
  | 'aural_pitch_spy'
  | 'aural_rhythm_echo'
  | 'aural_melody_mapper'
  | 'aural_interval_quest'
  | 'aural_chord_oracle';

export type AbilityTier = 'basic' | 'medium' | 'strong';

export interface Ability {
  id: string;
  name: string;
  description: string;
  levelGate: number;
  challengeType: ChallengeType; // used for zone challenges; battle always uses prepared_performance
  tier: AbilityTier;
  damageMultiplier: number;     // applied to character power
  isHealing: boolean;
  isRevive: boolean;
  isAoE: boolean;
  inflicts?: StatusType;          // status applied to the enemy on a Good-or-better hit
  inflictsMany?: StatusType[];    // multiple statuses applied to the enemy at once
  selfStatus?: StatusType;        // buff applied to the player when used (Good or better)
  selfStatusMany?: StatusType[];  // multiple buffs applied to the player at once
  clearsSelfDebuffs?: boolean;    // strips all debuffs from the player
  clearsEnemyBuffs?: boolean;     // strips all buffs from the enemy
  generatesCooldown?: number;     // turns before reuse
  flavorText?: string;
}

// Beat counts scale by act (zones 1-4, 5-8, 9-12)
export function battleBeatCount(tier: AbilityTier, zone: number): number {
  const act = zone <= 4 ? 0 : zone <= 8 ? 1 : 2;
  const BEATS: Record<AbilityTier, [number, number, number]> = {
    basic:  [4,  8,  16],
    medium: [8,  16, 32],
    strong: [16, 32, 48],
  };
  return BEATS[tier][act];
}

// Tempo: every zone starts at a 60 BPM floor; the ceiling climbs with
// progression using a two-segment curve:
//   Zones 1–4:  60 → 112 BPM  (steeper early climb)
//   Zones 4–12: 112 → 160 BPM (shallower late climb)
const BPM_FLOOR = 60;

export function battleBpmRange(zone: number): [number, number] {
  let ceiling: number;
  if (zone <= 4) {
    ceiling = Math.round(60 + (112 - 60) * (zone - 1) / 3);
  } else {
    ceiling = Math.round(112 + (160 - 112) * (zone - 4) / 8);
  }
  return [BPM_FLOOR, ceiling];
}

export function battleBpm(zone: number): number {
  const [min, max] = battleBpmRange(zone);
  return min + Math.floor(Math.random() * (max - min + 1));
}

const ABILITIES: Record<string, Ability> = {
  // ── Flute / Wind Dancer ─────────────────────────────────────────────────────
  zephyr_strike: {
    id: 'zephyr_strike',
    name: 'Zephyr Strike',
    description: 'Basic pitch attack; damage scales with pitch accuracy.',
    levelGate: 1,
    challengeType: 'prepared_performance',
    tier: 'basic',
    damageMultiplier: 1.0,
    isHealing: false,
    isRevive: false,
    isAoE: false,
  },
  ethereal_trill: {
    id: 'ethereal_trill',
    name: 'Ethereal Trill',
    description: 'Hits 3× at reduced damage; generates bonus Resonance Points.',
    levelGate: 5,
    challengeType: 'technique_scale',
    tier: 'medium',
    damageMultiplier: 0.6,
    isHealing: false,
    isRevive: false,
    isAoE: false,
    inflicts: 'confusion',
    flavorText: 'The trill carries on the wind, three strikes of pure sound.',
  },
  breath_of_life: {
    id: 'breath_of_life',
    name: 'Breath of Life',
    description: 'Revive a fallen ally. Rating determines HP restored.',
    levelGate: 20,
    challengeType: 'prepared_performance',
    tier: 'strong',
    damageMultiplier: 0,
    isHealing: true,
    isRevive: true,
    isAoE: false,
    flavorText: 'The Wind Dancer\'s exclusive gift.',
  },
  wind_barrier: {
    id: 'wind_barrier',
    name: 'Wind Barrier',
    description: 'Raise a barrier: clears your debuffs and reflects incoming damage.',
    levelGate: 15,
    challengeType: 'prepared_performance',
    tier: 'medium',
    damageMultiplier: 0,
    isHealing: false,
    isRevive: false,
    isAoE: false,
    selfStatusMany: ['deflect', 'focus'],
    clearsSelfDebuffs: true,
    flavorText: 'A spinning shield of air turns the enemy\'s force aside.',
  },

  // ── Clarinet / Chromatic Monk ────────────────────────────────────────────────
  register_strike: {
    id: 'register_strike',
    name: 'Register Strike',
    description: 'Basic melee attack; deals damage based on register clarity.',
    levelGate: 1,
    challengeType: 'prepared_performance',
    tier: 'basic',
    damageMultiplier: 1.0,
    isHealing: false,
    isRevive: false,
    isAoE: false,
  },
  scale_rush: {
    id: 'scale_rush',
    name: 'Scale Rush',
    description: 'Rapid scale-passage strike; hits equal to notes played correctly.',
    levelGate: 5,
    challengeType: 'technique_scale',
    tier: 'medium',
    damageMultiplier: 1.4,
    isHealing: false,
    isRevive: false,
    isAoE: false,
    flavorText: 'Twenty-four notes. Twenty-four strikes.',
  },
  chromatic_flurry: {
    id: 'chromatic_flurry',
    name: 'Chromatic Flurry',
    description: 'Full chromatic scale at speed. Max 24 hits.',
    levelGate: 20,
    challengeType: 'technique_scale',
    tier: 'strong',
    damageMultiplier: 2.4,
    isHealing: false,
    isRevive: false,
    isAoE: false,
    flavorText: 'The signature ultimate of the Chromatic Monk.',
  },

  // ── Alto Sax / Shadow Shifter ────────────────────────────────────────────────
  smooth_tone_strike: {
    id: 'smooth_tone_strike',
    name: 'Smooth Tone Strike',
    description: 'Basic warm-tone attack.',
    levelGate: 1,
    challengeType: 'prepared_performance',
    tier: 'basic',
    damageMultiplier: 1.0,
    isHealing: false,
    isRevive: false,
    isAoE: false,
  },
  vibrato_lash: {
    id: 'vibrato_lash',
    name: 'Vibrato Lash',
    description: 'Hits twice; second hit always applies a debuff.',
    levelGate: 5,
    challengeType: 'technique_scale',
    tier: 'medium',
    damageMultiplier: 1.3,
    isHealing: false,
    isRevive: false,
    isAoE: false,
    inflicts: 'blind',
  },

  // ── Trumpet / Vanguard ───────────────────────────────────────────────────────
  reveille: {
    id: 'reveille',
    name: 'Reveille',
    description: 'Basic attack; wakes stunned/charmed allies as secondary effect.',
    levelGate: 1,
    challengeType: 'prepared_performance',
    tier: 'basic',
    damageMultiplier: 1.0,
    isHealing: false,
    isRevive: false,
    isAoE: false,
  },
  double_tongue_flurry: {
    id: 'double_tongue_flurry',
    name: 'Double Tongue Flurry',
    description: 'Low damage per hit, many hits.',
    levelGate: 5,
    challengeType: 'rhythm_performance',
    tier: 'medium',
    damageMultiplier: 1.2,
    isHealing: false,
    isRevive: false,
    isAoE: false,
    flavorText: 'Ta-ka, ta-ka, ta-ka — the Vanguard\'s rapid assault.',
  },
  buglers_holiday: {
    id: 'buglers_holiday',
    name: "Bugler's Holiday",
    description: 'Summons three legendary trumpet players for a four-trumpet assault.',
    levelGate: 20,
    challengeType: 'prepared_performance',
    tier: 'strong',
    damageMultiplier: 3.0,
    isHealing: false,
    isRevive: false,
    isAoE: true,
    flavorText: 'André, Marsalis, Balsom — the greatest gather at the call.',
  },
  bugle_cry: {
    id: 'bugle_cry',
    name: 'Bugle Cry',
    description: 'A rallying call: clears your debuffs and grants Haste and Focus.',
    levelGate: 15,
    challengeType: 'prepared_performance',
    tier: 'medium',
    damageMultiplier: 0,
    isHealing: false,
    isRevive: false,
    isAoE: true,
    selfStatusMany: ['haste', 'focus'],
    clearsSelfDebuffs: true,
    flavorText: 'The signal that turns a retreat into a charge.',
  },

  // ── Trombone / Slide Knight ──────────────────────────────────────────────────
  sustained_tone_trombone: {
    id: 'sustained_tone_trombone',
    name: 'Sustained Tone',
    description: 'Deals damage over 2 turns.',
    levelGate: 1,
    challengeType: 'prepared_performance',
    tier: 'basic',
    damageMultiplier: 1.0,
    isHealing: false,
    isRevive: false,
    isAoE: false,
    inflicts: 'poison',
  },
  slide_glissando: {
    id: 'slide_glissando',
    name: 'Slide Glissando',
    description: 'Sweeping AoE attack hitting all enemies.',
    levelGate: 5,
    challengeType: 'prepared_performance',
    tier: 'medium',
    damageMultiplier: 1.2,
    isHealing: false,
    isRevive: false,
    isAoE: true,
    inflicts: 'slow',
  },

  // ── Euphonium / Resonant ─────────────────────────────────────────────────────
  sustained_tone_euphonium: {
    id: 'sustained_tone_euphonium',
    name: 'Sustained Tone',
    description: 'Deals damage over 2 turns.',
    levelGate: 1,
    challengeType: 'prepared_performance',
    tier: 'basic',
    damageMultiplier: 1.0,
    isHealing: false,
    isRevive: false,
    isAoE: false,
    inflicts: 'poison',
  },
  low_brass_heal: {
    id: 'low_brass_heal',
    name: 'Low Brass Heal',
    description: 'Restores HP to one party member.',
    levelGate: 5,
    challengeType: 'prepared_performance',
    tier: 'medium',
    damageMultiplier: 0,
    isHealing: true,
    isRevive: false,
    isAoE: false,
    selfStatus: 'regen',
  },
  full_resonance: {
    id: 'full_resonance',
    name: 'Full Resonance',
    description: 'Party-wide restore: clears your debuffs and grants Regen and Calm.',
    levelGate: 20,
    challengeType: 'technique_scale',
    tier: 'strong',
    damageMultiplier: 0,
    isHealing: true,
    isRevive: false,
    isAoE: true,
    selfStatusMany: ['regen', 'calm'],
    clearsSelfDebuffs: true,
    flavorText: 'The whole instrument rings as one — and so does the party.',
  },

  // ── Percussion / Stryker Artificer ───────────────────────────────────────────
  mallet_strike: {
    id: 'mallet_strike',
    name: 'Mallet Strike',
    description: 'Basic pitched attack; note accuracy determines damage.',
    levelGate: 1,
    challengeType: 'prepared_performance',
    tier: 'basic',
    damageMultiplier: 1.0,
    isHealing: false,
    isRevive: false,
    isAoE: false,
  },
  rhythm_pulse: {
    id: 'rhythm_pulse',
    name: 'Rhythm Pulse',
    description: 'Party-wide Technique buff for 3 turns.',
    levelGate: 5,
    challengeType: 'rhythm_performance',
    tier: 'medium',
    damageMultiplier: 0.5,
    isHealing: false,
    isRevive: false,
    isAoE: true,
    selfStatus: 'haste',
  },
  percussion_purge: {
    id: 'percussion_purge',
    name: 'Percussion Purge',
    description: 'AoE damage + shakes all debuffs off the party.',
    levelGate: 20,
    challengeType: 'rhythm_performance',
    tier: 'strong',
    damageMultiplier: 2.0,
    isHealing: false,
    isRevive: false,
    isAoE: true,
    clearsSelfDebuffs: true,
    flavorText: 'The shockwave of the strike vibrates every debuff loose.',
  },

  // ── French Horn / Forest Caller ─────────────────────────────────────────────
  horn_call: {
    id: 'horn_call',
    name: 'Horn Call',
    description: 'Long-range attack targeting back-row enemies.',
    levelGate: 1,
    challengeType: 'prepared_performance',
    tier: 'basic',
    damageMultiplier: 1.0,
    isHealing: false,
    isRevive: false,
    isAoE: false,
  },

  // ── Tuba / Brass Bastion ─────────────────────────────────────────────────────
  pedal_tone: {
    id: 'pedal_tone',
    name: 'Pedal Tone',
    description: 'Sustained damage-over-time; holds for up to 4 turns.',
    levelGate: 1,
    challengeType: 'prepared_performance',
    tier: 'basic',
    damageMultiplier: 1.0,
    isHealing: false,
    isRevive: false,
    isAoE: false,
    inflicts: 'poison',
  },

  // ── Oboe / Crystal Mystic ────────────────────────────────────────────────────
  reed_strike: {
    id: 'reed_strike',
    name: 'Reed Strike',
    description: 'High-damage single hit; scales steeply with pitch accuracy.',
    levelGate: 1,
    challengeType: 'prepared_performance',
    tier: 'basic',
    damageMultiplier: 1.5,
    isHealing: false,
    isRevive: false,
    isAoE: false,
  },

  // ── Bassoon / Sage ────────────────────────────────────────────────────────────
  standing_wave: {
    id: 'standing_wave',
    name: 'Standing Wave',
    description: "Applies Resonance Lock — target's Endurance is reduced for 3 turns.",
    levelGate: 1,
    challengeType: 'prepared_performance',
    tier: 'basic',
    damageMultiplier: 0.8,
    isHealing: false,
    isRevive: false,
    isAoE: false,
    inflicts: 'slow',
  },
  resonant_frequency: {
    id: 'resonant_frequency',
    name: 'Resonant Frequency',
    description: "Exposes the target's weak point — next hit deals double damage.",
    levelGate: 5,
    challengeType: 'aural_interval_quest',
    tier: 'medium',
    damageMultiplier: 0.5,
    isHealing: false,
    isRevive: false,
    isAoE: false,
  },
  fundamental_collapse: {
    id: 'fundamental_collapse',
    name: 'Fundamental Collapse',
    description: 'Strips all enemy buffs and inflicts Slow, Blind, and Poison at once.',
    levelGate: 20,
    challengeType: 'technique_scale',
    tier: 'strong',
    damageMultiplier: 0,
    isHealing: false,
    isRevive: false,
    isAoE: false,
    inflictsMany: ['slow', 'blind', 'poison'],
    clearsEnemyBuffs: true,
    flavorText: 'The Sage does not strike. The Sage dismantles.',
  },

  // ── Universal (defend) ───────────────────────────────────────────────────────
  defend: {
    id: 'defend',
    name: 'Defend',
    description: 'Brace for impact — incoming damage halved next turn.',
    levelGate: 1,
    challengeType: 'aural_pitch_spy',
    tier: 'basic',
    damageMultiplier: 0,
    isHealing: false,
    isRevive: false,
    isAoE: false,
  },
};

export function getAbilitiesForInstrument(
  instrument: InstrumentId,
  level: number,
): Ability[] {
  const base: Ability[] = [];

  const map: Record<InstrumentId, string[]> = {
    flute: ['zephyr_strike', 'ethereal_trill', 'wind_barrier', 'breath_of_life'],
    clarinet: ['register_strike', 'scale_rush', 'chromatic_flurry'],
    alto_sax: ['smooth_tone_strike', 'vibrato_lash'],
    trumpet: ['reveille', 'double_tongue_flurry', 'bugle_cry', 'buglers_holiday'],
    trombone: ['sustained_tone_trombone', 'slide_glissando'],
    euphonium: ['sustained_tone_euphonium', 'low_brass_heal', 'full_resonance'],
    percussion: ['mallet_strike', 'rhythm_pulse', 'percussion_purge'],
    french_horn: ['horn_call'],
    tuba: ['pedal_tone'],
    oboe: ['reed_strike'],
    bassoon: ['standing_wave', 'resonant_frequency', 'fundamental_collapse'],
  };

  const ids = map[instrument] ?? ['zephyr_strike'];
  for (const id of ids) {
    const ab = ABILITIES[id];
    if (ab && ab.levelGate <= level) base.push(ab);
  }

  return base;
}

export { ABILITIES };
