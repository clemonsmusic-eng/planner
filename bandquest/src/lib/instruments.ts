import type { InstrumentDef, InstrumentId } from '../types/game';

export const INSTRUMENTS: Record<InstrumentId, InstrumentDef> = {
  flute: {
    id: 'flute',
    name: 'Flute',
    className: 'Wind Dancer',
    family: 'woodwind',
    archetype: 'Elf Ranger / Healer — only class capable of reviving fallen allies',
    baseStats: { power: 8, accuracy: 18, technique: 14, endurance: 8 },
    statGrowth: { power: 0.5, accuracy: 2.0, technique: 1.5, endurance: 0.5 },
    available: true,
    optional: false,
  },
  clarinet: {
    id: 'clarinet',
    name: 'Clarinet',
    className: 'Chromatic Monk',
    family: 'woodwind',
    archetype: 'Martial Arts Master — speed, range, fingering precision',
    baseStats: { power: 14, accuracy: 16, technique: 16, endurance: 12 },
    statGrowth: { power: 1.5, accuracy: 1.5, technique: 1.5, endurance: 1.5 },
    available: true,
    optional: false,
  },
  alto_sax: {
    id: 'alto_sax',
    name: 'Alto Saxophone',
    className: 'Shadow Spectre',
    family: 'woodwind',
    archetype: 'Shapeshifter / Mimic Mage — can clone any player on the field',
    baseStats: { power: 14, accuracy: 12, technique: 16, endurance: 12 },
    statGrowth: { power: 2.0, accuracy: 1.0, technique: 2.0, endurance: 1.0 },
    available: true,
    optional: false,
  },
  trumpet: {
    id: 'trumpet',
    name: 'Trumpet',
    className: 'Vanguard',
    family: 'brass',
    archetype: 'Soldier / Military Leader — high Power, signal-caller',
    baseStats: { power: 18, accuracy: 16, technique: 12, endurance: 16 },
    statGrowth: { power: 2.5, accuracy: 1.5, technique: 1.0, endurance: 1.5 },
    available: true,
    optional: false,
  },
  trombone: {
    id: 'trombone',
    name: 'Trombone',
    className: 'Slide Knight',
    family: 'brass',
    archetype: 'Paladin (attack-focused) — AoE specialist',
    baseStats: { power: 16, accuracy: 10, technique: 10, endurance: 16 },
    statGrowth: { power: 2.0, accuracy: 1.0, technique: 1.0, endurance: 2.0 },
    available: true,
    optional: false,
  },
  euphonium: {
    id: 'euphonium',
    name: 'Euphonium',
    className: 'Resonant',
    family: 'brass',
    archetype: 'Cleric-Knight — defense and healing focused',
    baseStats: { power: 12, accuracy: 16, technique: 10, endurance: 20 },
    statGrowth: { power: 1.5, accuracy: 2.0, technique: 1.0, endurance: 2.5 },
    available: true,
    optional: false,
  },
  percussion: {
    id: 'percussion',
    name: 'Percussion',
    className: 'Stryking Artificer',
    family: 'percussion',
    archetype: 'Mechanic / Gadget-Maker — most versatile stat spread',
    baseStats: { power: 12, accuracy: 12, technique: 16, endurance: 12 },
    statGrowth: { power: 1.2, accuracy: 1.2, technique: 2.0, endurance: 1.2 },
    available: true,
    optional: false,
  },
  french_horn: {
    id: 'french_horn',
    name: 'French Horn',
    className: 'Forest Caller',
    family: 'brass',
    archetype: 'Support Mage / Druid — long-range echoing attacks',
    baseStats: { power: 12, accuracy: 16, technique: 12, endurance: 12 },
    statGrowth: { power: 1.5, accuracy: 2.0, technique: 1.5, endurance: 1.5 },
    available: false,
    optional: true,
  },
  tuba: {
    id: 'tuba',
    name: 'Tuba',
    className: 'Brass Bastion',
    family: 'brass',
    archetype: 'Heavy Armored Tank — slow, devastating, highest HP',
    baseStats: { power: 20, accuracy: 8, technique: 10, endurance: 20 },
    statGrowth: { power: 3.0, accuracy: 0.5, technique: 1.0, endurance: 2.5 },
    available: false,
    optional: true,
  },
  oboe: {
    id: 'oboe',
    name: 'Oboe',
    className: 'Crystal Mystic',
    family: 'woodwind',
    archetype: 'Attack Mage — highest damage per hit, steep accuracy scaling',
    baseStats: { power: 16, accuracy: 20, technique: 16, endurance: 12 },
    statGrowth: { power: 2.0, accuracy: 2.5, technique: 2.0, endurance: 1.0 },
    available: false,
    optional: true,
  },
  bassoon: {
    id: 'bassoon',
    name: 'Bassoon',
    className: 'Sage',
    family: 'woodwind',
    archetype: 'Scientist / Disruptor — status effects, debuffs, analysis',
    baseStats: { power: 8, accuracy: 16, technique: 12, endurance: 16 },
    statGrowth: { power: 1.0, accuracy: 2.0, technique: 1.5, endurance: 2.0 },
    available: false,
    optional: true,
  },
};

export const BASE_SIX: InstrumentId[] = [
  'flute',
  'clarinet',
  'alto_sax',
  'trumpet',
  'trombone',
  'euphonium',
  'percussion',
];

export const OPTIONAL_INSTRUMENTS: InstrumentId[] = [
  'french_horn',
  'tuba',
  'oboe',
  'bassoon',
];

export function getInstrumentColor(id: InstrumentId): string {
  const colors: Record<InstrumentId, string> = {
    flute: '#7DD3FC',        // sky blue
    clarinet: '#86EFAC',     // green
    alto_sax: '#FDE68A',     // amber
    trumpet: '#FCA5A5',      // red
    trombone: '#C4B5FD',     // purple
    euphonium: '#6EE7B7',    // teal
    percussion: '#94A3B8',   // slate
    french_horn: '#FCD34D',  // yellow
    tuba: '#F97316',         // orange
    oboe: '#E879F9',         // fuchsia
    bassoon: '#A78BFA',      // violet
  };
  return colors[id];
}

export function getInstrumentEmoji(id: InstrumentId): string {
  const emojis: Record<InstrumentId, string> = {
    flute: '🪈',
    clarinet: '🎵',
    alto_sax: '🎷',
    trumpet: '🎺',
    trombone: '📯',
    euphonium: '🎶',
    percussion: '🥁',
    french_horn: '📯',
    tuba: '🎺',
    oboe: '🪘',
    bassoon: '🎵',
  };
  return emojis[id];
}

export function xpToNextLevel(level: number): number {
  return 100 + 50 * level;
}

export function pitchToleranceCents(accuracy: number): number {
  if (accuracy <= 10) return 30;
  if (accuracy <= 20) return 25;
  if (accuracy <= 30) return 20;
  if (accuracy <= 40) return 15;
  return 10;
}

export function rhythmToleranceMs(technique: number): number {
  if (technique <= 10) return 150;
  if (technique <= 20) return 120;
  if (technique <= 30) return 100;
  if (technique <= 40) return 75;
  return 50;
}
