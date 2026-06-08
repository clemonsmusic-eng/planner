import type { GearItem, GearSlot, GearTier, InstrumentId, InstrumentFamily } from '../types/game';
import type { Character, StatBlock } from '../types/game';
import { INSTRUMENTS } from './instruments';

// ── Instrument stat emphasis ───────────────────────────────────────────────────

type StatEmphasis = 'power' | 'accuracy' | 'technique' | 'balanced';

const INST_EMPHASIS: Record<InstrumentId, StatEmphasis> = {
  flute:       'accuracy',
  clarinet:    'balanced',
  alto_sax:    'technique',
  trumpet:     'power',
  trombone:    'power',
  euphonium:   'accuracy',
  percussion:  'technique',
  french_horn: 'accuracy',
  tuba:        'power',
  oboe:        'accuracy',
  bassoon:     'balanced',
};

const EMPH_BASE: Record<StatEmphasis, Partial<StatBlock>> = {
  power:     { power: 4, accuracy: 2, technique: 2 },
  accuracy:  { power: 2, accuracy: 4, technique: 2 },
  technique: { power: 2, accuracy: 2, technique: 4 },
  balanced:  { power: 3, accuracy: 3, technique: 2 },
};

const TIER_MULT: Record<GearTier, number> = { 1: 1, 2: 3.5, 3: 6, 4: 10 };

function scaleBonus(base: Partial<StatBlock>, mult: number): Partial<StatBlock> {
  return Object.fromEntries(
    Object.entries(base).map(([k, v]) => [k, Math.round((v ?? 0) * mult)])
  ) as Partial<StatBlock>;
}

// ── Instrument display info ────────────────────────────────────────────────────

type InstNames = { display: string; t1Fantasy: string; t2Fantasy: string; t3Fantasy: string };

const INST_NAMES: Record<InstrumentId, InstNames> = {
  flute:       { display: 'Flute',          t1Fantasy: 'Resonance Pipe',     t2Fantasy: 'Etched Wind Pipe',   t3Fantasy: 'The Galway'     },
  clarinet:    { display: 'Clarinet',        t1Fantasy: 'Chromatic Reed',     t2Fantasy: 'Register Staff',     t3Fantasy: 'The Buffet'     },
  alto_sax:    { display: 'Alto Saxophone',  t1Fantasy: 'Hybrid Horn',        t2Fantasy: 'Shadow Cone',        t3Fantasy: 'The Selmer'     },
  trumpet:     { display: 'Trumpet',         t1Fantasy: 'Brass Clarion',      t2Fantasy: 'Champion Clarion',   t3Fantasy: 'The Bach'       },
  trombone:    { display: 'Trombone',        t1Fantasy: 'Slide Lance',        t2Fantasy: 'Resonant Lance',     t3Fantasy: 'The Shires'     },
  euphonium:   { display: 'Euphonium',       t1Fantasy: 'Warm Cone',          t2Fantasy: 'Harmonic Cone',      t3Fantasy: 'The Besson'     },
  percussion:  { display: 'Percussion Kit',  t1Fantasy: 'Starter Arsenal',    t2Fantasy: 'Forge Arsenal',      t3Fantasy: 'Grand Arsenal'  },
  french_horn: { display: 'French Horn',     t1Fantasy: 'Forest Horn',        t2Fantasy: 'Echo Horn',          t3Fantasy: 'The Alexander'  },
  tuba:        { display: 'Tuba',            t1Fantasy: 'Foundation Bell',    t2Fantasy: 'Iron Foundation',    t3Fantasy: 'The Miraphone'  },
  oboe:        { display: 'Oboe',            t1Fantasy: 'Crystal Reed Staff', t2Fantasy: 'Precision Reed',     t3Fantasy: 'The Loree'      },
  bassoon:     { display: 'Bassoon',         t1Fantasy: 'Ancient Pipe',       t2Fantasy: 'Scholar Pipe',       t3Fantasy: 'The Heckel'     },
};

const INST_TIER_PREFIX: Record<GearTier, string> = {
  1: 'Academy Issued',
  2: "Journeyman's",
  3: 'Artisan',
  4: 'Legendary',
};

const INST_LORE: Partial<Record<InstrumentId, string>> = {
  flute:       'A Powell Flute in the tradition of James Galway, the Man with the Golden Flute.',
  clarinet:    'Crafted by Buffet Crampon, makers of the finest clarinets since 1825.',
  alto_sax:    'Built by Henri Selmer Paris, whose saxophones define the sound of jazz and concert band alike.',
  trumpet:     'The Vincent Bach Stradivarius — the most celebrated trumpet in the world.',
  trombone:    'Handcrafted by S.E. Shires, the gold standard of professional trombone making.',
  euphonium:   'A Besson euphonium, trusted by professional players across the globe.',
  percussion:  'A fully professional setup, built for the concert hall.',
  french_horn: 'An Alexander 103, the horn of choice for orchestras worldwide.',
  tuba:        'The Miraphone, a German-engineered tuba of exceptional resonance.',
  oboe:        "A François Loree oboe — the preferred instrument of the world's finest oboists.",
  bassoon:     'The Wilhelm Heckel bassoon, built in Biebrich since 1831.',
};

function makeInstItem(instrument: InstrumentId, tier: GearTier): GearItem {
  const emphasis = INST_EMPHASIS[instrument];
  const names = INST_NAMES[instrument];
  const fantasyByTier = [names.t1Fantasy, names.t2Fantasy, names.t3Fantasy, names.t3Fantasy];
  return {
    id: `inst_${instrument}_t${tier}`,
    slot: 'instrument',
    tier,
    name: `${INST_TIER_PREFIX[tier]} ${names.display}`,
    fantasyName: fantasyByTier[tier - 1],
    statBonus: scaleBonus(EMPH_BASE[emphasis], TIER_MULT[tier]),
    instrumentSpecific: instrument,
    loreEntry: tier >= 3 ? `${names.t3Fantasy} — ${INST_LORE[instrument] ?? 'A masterwork instrument.'}` : undefined,
  };
}

// ── Mouthpiece items ───────────────────────────────────────────────────────────

const MOUTH_TIER_NAMES: Record<GearTier, string> = { 1: 'Practice', 2: 'Performance', 3: 'Professional', 4: 'Custom' };
const MOUTH_FAMILY_SUFFIX: Record<InstrumentFamily, string> = {
  woodwind: 'Reed / Head Joint',
  brass: 'Mouthpiece',
  percussion: 'Sticks & Mallets',
};
const MOUTH_FANTASY: Record<InstrumentFamily, Record<GearTier, string>> = {
  woodwind:   { 1: 'Roughcut Reed',    2: 'Resonant Reed',   3: 'Crystalline Reed',  4: 'Noteshard Reed'    },
  brass:      { 1: 'Brass Cup',        2: 'Resonance Cup',   3: 'Master Cup',        4: 'Forged Resonator'  },
  percussion: { 1: 'Practice Sticks',  2: 'Rhythm Rods',     3: 'Resonance Rods',   4: 'Legendary Rods'    },
};

function mouthStatBonus(family: InstrumentFamily, tier: GearTier): Partial<StatBlock> {
  if (tier === 1) return family === 'percussion' ? { technique: 5 } : { accuracy: 5 };
  if (tier === 2) {
    if (family === 'woodwind')  return { accuracy: 12, technique: 5 };
    if (family === 'brass')     return { accuracy: 12, power: 5 };
    return { technique: 12, accuracy: 5 };
  }
  if (family === 'woodwind')  return { accuracy: 20, technique: 12 };
  if (family === 'brass')     return { accuracy: 20, power: 12 };
  return { technique: 20, accuracy: 12 };
}

function makeMouthItem(family: InstrumentFamily, tier: GearTier): GearItem {
  return {
    id: `mouth_${family}_t${tier}`,
    slot: 'mouthpiece',
    tier,
    name: `${MOUTH_TIER_NAMES[tier]} ${MOUTH_FAMILY_SUFFIX[family]}`,
    fantasyName: MOUTH_FANTASY[family][tier],
    statBonus: mouthStatBonus(family, tier),
  };
}

// ── Generic accessory, attire, and case items ─────────────────────────────────

const GENERIC_ITEMS: GearItem[] = [
  // Metronome
  { id: 'metro_t1', slot: 'accessory_metronome', tier: 1, name: 'Wind-Up Metronome',       fantasyName: 'Tick Keeper',        statBonus: {},                unlocks: ['rhythm_performance'] },
  { id: 'metro_t2', slot: 'accessory_metronome', tier: 2, name: 'Digital Metronome',        fantasyName: 'Pulse Engine',        statBonus: { technique: 8 },  unlocks: ['rhythm_performance'] },
  { id: 'metro_t3', slot: 'accessory_metronome', tier: 3, name: 'Clip-On Metronome',        fantasyName: 'Precision Pulse',     statBonus: { technique: 15 }, unlocks: ['rhythm_performance'], passive: 'Rhythm challenges display a ghost pulse.' },
  // Tuner
  { id: 'tuner_t1', slot: 'accessory_tuner',      tier: 1, name: 'Basic Tuner',              fantasyName: 'Pitch Stone',         statBonus: {},                unlocks: ['aural_pitch_spy', 'aural_interval_quest', 'aural_chord_oracle'] },
  { id: 'tuner_t2', slot: 'accessory_tuner',      tier: 2, name: 'Chromatic Tuner',          fantasyName: 'Resonance Stone',     statBonus: { accuracy: 8 },   unlocks: ['aural_pitch_spy', 'aural_interval_quest', 'aural_chord_oracle', 'aural_melody_mapper'] },
  { id: 'tuner_t3', slot: 'accessory_tuner',      tier: 3, name: 'Clip-On Chromatic Tuner', fantasyName: 'True Pitch Stone',    statBonus: { accuracy: 15 },  unlocks: ['aural_pitch_spy', 'aural_interval_quest', 'aural_chord_oracle', 'aural_melody_mapper', 'aural_progression_master'], passive: 'Shows a 3-second pitch reference before performance challenges.' },
  // Stand
  { id: 'stand_t1', slot: 'accessory_stand',      tier: 1, name: 'Folding Stand',            fantasyName: 'Iron Stand',          statBonus: {},                unlocks: ['sight_reading'] },
  { id: 'stand_t2', slot: 'accessory_stand',      tier: 2, name: 'Orchestra Stand',          fantasyName: 'Carved Stand',        statBonus: { power: 5 },      unlocks: ['sight_reading'] },
  { id: 'stand_t3', slot: 'accessory_stand',      tier: 3, name: 'Heavy Duty Stand',         fantasyName: "Maestro's Stand",     statBonus: { power: 10 },     unlocks: ['sight_reading'], passive: 'Shows sight-reading excerpt 5 extra seconds before the challenge.' },
  // Attire
  { id: 'attire_t1', slot: 'attire', tier: 1, name: 'Practice Clothes',  fantasyName: 'Academy Uniform',    statBonus: { endurance: 5 } },
  { id: 'attire_t2', slot: 'attire', tier: 2, name: 'Rehearsal Uniform', fantasyName: 'Ensemble Colors',    statBonus: { endurance: 15, power: 5 },  passive: 'Ensemble Tech cooldowns reduced by 1 turn.' },
  { id: 'attire_t3', slot: 'attire', tier: 3, name: 'Concert Black',     fantasyName: 'Performance Attire', statBonus: { endurance: 25, power: 10 } },
  // Case
  { id: 'case_t1', slot: 'case', tier: 1, name: 'Soft Gig Bag',    fantasyName: "Traveler's Sack",   statBonus: { endurance: 5 } },
  { id: 'case_t2', slot: 'case', tier: 2, name: 'Hard Shell Case', fantasyName: 'Ironbound Case',    statBonus: { endurance: 18 }, passive: 'Poor ratings deal 20% less HP damage.' },
  { id: 'case_t3', slot: 'case', tier: 3, name: 'Custom Fit Case', fantasyName: "Artisan's Vault",   statBonus: { endurance: 30 }, passive: 'Poor ratings deal 35% less HP damage.' },
];

// ── GEAR_ITEMS ─────────────────────────────────────────────────────────────────

function buildGearItems(): Record<string, GearItem> {
  const all: GearItem[] = [];

  for (const instrument of Object.keys(INSTRUMENTS) as InstrumentId[]) {
    for (const tier of [1, 2, 3] as GearTier[]) {
      all.push(makeInstItem(instrument, tier));
    }
  }

  for (const family of ['woodwind', 'brass', 'percussion'] as InstrumentFamily[]) {
    for (const tier of [1, 2, 3] as GearTier[]) {
      all.push(makeMouthItem(family, tier));
    }
  }

  all.push(...GENERIC_ITEMS);
  return Object.fromEntries(all.map((item) => [item.id, item]));
}

export const GEAR_ITEMS: Record<string, GearItem> = buildGearItems();

// ── Starting gear ──────────────────────────────────────────────────────────────

export function getStartingGear(instrument: InstrumentId): Partial<Record<GearSlot, GearItem>> {
  const family = INSTRUMENTS[instrument].family;
  return {
    instrument:          GEAR_ITEMS[`inst_${instrument}_t1`],
    mouthpiece:          GEAR_ITEMS[`mouth_${family}_t1`],
    accessory_metronome: GEAR_ITEMS['metro_t1'],
    accessory_tuner:     GEAR_ITEMS['tuner_t1'],
    accessory_stand:     GEAR_ITEMS['stand_t1'],
    attire:              GEAR_ITEMS['attire_t1'],
    case:                GEAR_ITEMS['case_t1'],
  };
}

// ── Effective stats ────────────────────────────────────────────────────────────

export function getEffectiveStats(character: Character): StatBlock {
  let { power, accuracy, technique, endurance } = character.stats;

  for (const item of Object.values(character.gear)) {
    if (!item) continue;
    power     += item.statBonus.power     ?? 0;
    accuracy  += item.statBonus.accuracy  ?? 0;
    technique += item.statBonus.technique ?? 0;
    endurance += item.statBonus.endurance ?? 0;
  }

  return { power, accuracy, technique, endurance };
}

// ── Boss gear drops ────────────────────────────────────────────────────────────

export function getBossGearDrop(bossId: string, instrument: InstrumentId): GearItem | null {
  const family = INSTRUMENTS[instrument].family;
  const drops: Record<string, string> = {
    z1_boss_defeated:     `inst_${instrument}_t2`,
    z2_mini_boss_defeated: `mouth_${family}_t2`,
    z3_mini_boss_defeated: 'attire_t2',
    z4_graduation:         'case_t2',
  };
  const itemId = drops[bossId];
  return itemId ? (GEAR_ITEMS[itemId] ?? null) : null;
}

// ── Shop prices ────────────────────────────────────────────────────────────────

export const SHOP_PRICES: Record<string, number> = (() => {
  const prices: Record<string, number> = {};
  for (const id of Object.keys(GEAR_ITEMS)) {
    const item = GEAR_ITEMS[id];
    if (item.tier === 1) continue; // T1 is starter gear, not sold
    if (item.slot === 'instrument') {
      prices[id] = item.tier === 2 ? 120 : 280;
    } else if (item.slot === 'mouthpiece') {
      prices[id] = item.tier === 2 ? 75 : 175;
    } else if (item.slot === 'attire' || item.slot === 'case') {
      prices[id] = item.tier === 2 ? 80 : 180;
    } else {
      // accessory_metronome / tuner / stand
      prices[id] = item.tier === 2 ? 60 : 140;
    }
  }
  return prices;
})();

export interface ShopListing {
  item: GearItem;
  price: number;
  canAfford: boolean;
  currentItem: GearItem | undefined;
}

export function getShopListings(character: Character): ShopListing[] {
  const listings: ShopListing[] = [];
  const slots: GearSlot[] = [
    'instrument', 'mouthpiece',
    'accessory_metronome', 'accessory_tuner', 'accessory_stand',
    'attire', 'case',
  ];

  for (const slot of slots) {
    const equipped = character.gear[slot];
    const currentTier: GearTier = (equipped?.tier ?? 0) as GearTier;
    const nextTier = (currentTier + 1) as GearTier;
    if (nextTier > 3) continue; // already at max purchasable tier

    // Find the next-tier item for this slot
    let candidateId: string | undefined;
    if (slot === 'instrument') {
      candidateId = `inst_${character.instrument}_t${nextTier}`;
    } else if (slot === 'mouthpiece') {
      const family = INSTRUMENTS[character.instrument].family;
      candidateId = `mouth_${family}_t${nextTier}`;
    } else {
      // accessories, attire, case — generic ids
      const prefix = slot === 'attire' ? 'attire'
        : slot === 'case' ? 'case'
        : slot === 'accessory_metronome' ? 'metro'
        : slot === 'accessory_tuner' ? 'tuner'
        : 'stand';
      candidateId = `${prefix}_t${nextTier}`;
    }

    const item = candidateId ? GEAR_ITEMS[candidateId] : undefined;
    if (!item) continue;

    const price = SHOP_PRICES[item.id] ?? 0;
    listings.push({
      item,
      price,
      canAfford: character.resonanceCoins >= price,
      currentItem: equipped,
    });
  }

  return listings;
}

// ── Slot display info ──────────────────────────────────────────────────────────

export const SLOT_INFO: Record<GearSlot, { label: string; icon: string }> = {
  instrument:          { label: 'Instrument',       icon: '🎵' },
  mouthpiece:          { label: 'Reed / Mouthpiece', icon: '🎙️' },
  accessory_metronome: { label: 'Metronome',         icon: '⏱️' },
  accessory_tuner:     { label: 'Tuner',             icon: '🎯' },
  accessory_stand:     { label: 'Music Stand',       icon: '🎼' },
  attire:              { label: 'Attire',            icon: '👔' },
  case:                { label: 'Case',              icon: '🧳' },
};

export const TIER_COLORS: Record<GearTier, string> = {
  1: 'text-academy-cream/50',
  2: 'text-rating-good',
  3: 'text-rating-excellent',
  4: 'text-rating-superior',
};

export const TIER_LABELS: Record<GearTier, string> = {
  1: 'Student',
  2: 'Journeyman',
  3: 'Artisan',
  4: 'Legendary',
};
