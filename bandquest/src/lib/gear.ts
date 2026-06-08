import type { GearItem, GearSlot, GearTier, InstrumentId } from '../types/game';
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

// ── Instrument items (Slot 1) ──────────────────────────────────────────────────

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

// ── Material accessory (Slot 2) — instrument-specific, branching by material ────
//
// Each instrument has TWO material lines (a strategic tradeoff). Each line runs
// across all four tiers, culminating in an impractical "legendary" material.
// Materials grant scaling stats keyed to their archetype, plus a signature passive.

type MaterialArchetype = 'precision' | 'power' | 'warmth' | 'agility';

const ARCH_BASE: Record<MaterialArchetype, Partial<StatBlock>> = {
  precision: { accuracy: 4, technique: 2 },
  power:     { power: 4, accuracy: 1, endurance: 1 },
  warmth:    { endurance: 4, accuracy: 2 },
  agility:   { technique: 4, accuracy: 2 },
};

const MAT_TIER_MULT: Record<GearTier, number> = { 1: 1.5, 2: 3, 3: 5, 4: 8 };

const ARCH_TAGLINE: Record<MaterialArchetype, string> = {
  precision: 'Crystalline Precision',
  power:     'Dense Resonance',
  warmth:    'Warm Sustain',
  agility:   'Featherweight',
};

// Signature passive per archetype, escalating by tier (T1 = stats only).
const ARCH_PASSIVE: Record<MaterialArchetype, Partial<Record<GearTier, string>>> = {
  precision: {
    2: 'Pitch tolerance widened by 2 cents.',
    3: 'Pitch tolerance widened by 4 cents; the opening note is easier to land.',
    4: 'The first pitch challenge of each battle automatically scores Excellent.',
  },
  power: {
    2: 'Ability damage +5%.',
    3: 'Attacks ignore 12% of enemy defense.',
    4: 'Attacks ignore 25% of enemy defense; critical hits strike harder.',
  },
  warmth: {
    2: 'Restore a little HP on Good-or-better ratings.',
    3: 'Restore moderate HP on Good-or-better ratings.',
    4: 'Restore strong HP on Good-or-better; survive one fatal blow per battle.',
  },
  agility: {
    2: 'Rhythm timing window widened slightly.',
    3: 'Multi-hit abilities land one extra hit.',
    4: 'Multi-hit abilities land two extra hits; your first action each battle is free.',
  },
};

// The "playing surface" noun per instrument.
const SURFACE_NOUN: Record<InstrumentId, string> = {
  flute:       'Headjoint',
  clarinet:    'Mouthpiece',
  alto_sax:    'Mouthpiece',
  trumpet:     'Mouthpiece',
  trombone:    'Mouthpiece',
  euphonium:   'Mouthpiece',
  french_horn: 'Mouthpiece',
  tuba:        'Mouthpiece',
  oboe:        'Reed',
  bassoon:     'Reed',
  percussion:  'Sticks',
};

interface MatLine { arch: MaterialArchetype; mats: [string, string, string, string]; }

// Two lines per instrument. mats[] are T1 → T4; T4 is the impractical legendary.
const MATERIAL_LINES: Record<InstrumentId, [MatLine, MatLine]> = {
  flute: [
    { arch: 'precision', mats: ['Nickel Silver', 'Sterling Silver', '14k Gold', 'Crystal'] },
    { arch: 'warmth',    mats: ['Nickel-Plated', 'Silver-Heavy', 'Rose Gold', 'Solid Platinum'] },
  ],
  clarinet: [
    { arch: 'precision', mats: ['Hard Rubber', 'Crystal', 'Optical Glass', 'Diamond'] },
    { arch: 'warmth',    mats: ['Ebonite', 'Cocobolo Wood', 'Grenadilla', 'Meteorite Iron'] },
  ],
  alto_sax: [
    { arch: 'precision', mats: ['Hard Rubber', 'Bronze', 'Silver', 'Diamond-Coated'] },
    { arch: 'power',     mats: ['Ebonite', 'Brass', 'Solid Bronze', 'Solid Gold'] },
  ],
  trumpet: [
    { arch: 'precision', mats: ['Student Plastic', 'Silver-Plated', 'Gold-Plated', 'Diamond-Rimmed'] },
    { arch: 'power',     mats: ['Steel', 'Heavy Brass', 'Solid Silver', 'Solid Gold'] },
  ],
  trombone: [
    { arch: 'precision', mats: ['Plastic', 'Silver-Plated', 'Gold-Plated', 'Crystal'] },
    { arch: 'power',     mats: ['Brass', 'Heavy Brass', 'Titanium', 'Tungsten'] },
  ],
  euphonium: [
    { arch: 'precision', mats: ['Plastic', 'Silver-Plated', 'Gold-Plated', 'Sapphire'] },
    { arch: 'warmth',    mats: ['Brass', 'Bronze', 'Rose Brass', 'Solid Gold'] },
  ],
  french_horn: [
    { arch: 'precision', mats: ['Plastic', 'Silver-Plated', 'Gold-Plated', 'Crystal'] },
    { arch: 'warmth',    mats: ['Brass', 'Nickel-Silver', 'Ambronze', 'Solid Silver'] },
  ],
  tuba: [
    { arch: 'power',     mats: ['Plastic', 'Heavy Brass', 'Stainless Steel', 'Tungsten'] },
    { arch: 'warmth',    mats: ['Brass', 'Bronze', 'Rose Brass', 'Solid Gold'] },
  ],
  oboe: [
    { arch: 'precision', mats: ['Natural Cane', 'Aged Cane', 'Synthetic Polymer', 'Crystal Reed'] },
    { arch: 'warmth',    mats: ['Soft Cane', 'Gonzalez Cane', 'Resin-Sealed Cane', 'Goldspun Cane'] },
  ],
  bassoon: [
    { arch: 'precision', mats: ['Natural Cane', 'Aged Cane', 'Synthetic Polymer', 'Crystal Reed'] },
    { arch: 'power',     mats: ['Heavy Cane', 'Wire-Bound Cane', 'Carbon Reed', 'Mithril-Wire Cane'] },
  ],
  percussion: [
    { arch: 'agility',   mats: ['Maple', 'Hickory', 'Carbon Fiber', 'Adamantium'] },
    { arch: 'power',     mats: ['Oak', 'Heavy Hickory', 'Aluminum-Core', 'Tungsten-Core'] },
  ],
};

function makeMaterialItem(instrument: InstrumentId, lineIndex: 0 | 1, tier: GearTier): GearItem {
  const line = MATERIAL_LINES[instrument][lineIndex];
  const material = line.mats[tier - 1];
  const surface = SURFACE_NOUN[instrument];
  return {
    id: `mat_${instrument}_${line.arch}_t${tier}`,
    slot: 'mouthpiece',
    tier,
    name: `${material} ${surface}`,
    fantasyName: ARCH_TAGLINE[line.arch],
    statBonus: scaleBonus(ARCH_BASE[line.arch], MAT_TIER_MULT[tier]),
    passive: ARCH_PASSIVE[line.arch][tier],
    instrumentSpecific: instrument,
    loreEntry: tier === 4
      ? `A ${material.toLowerCase()} ${surface.toLowerCase()} — gloriously impractical, undeniably legendary.`
      : undefined,
  };
}

/** Human label for the material slot, specific to the instrument. */
export function getSurfaceLabel(instrument: InstrumentId): string {
  return SURFACE_NOUN[instrument] === 'Sticks' ? 'Sticks & Mallets' : SURFACE_NOUN[instrument];
}

// ── General accessory (Slot 3) — metronome / tuner / stand consolidated ─────────

const ACCESSORY_ITEMS: GearItem[] = [
  {
    id: 'acc_t1', slot: 'accessory', tier: 1,
    name: 'Student Practice Set', fantasyName: "Apprentice's Kit",
    statBonus: {},
    unlocks: ['rhythm_performance', 'aural_pitch_spy', 'aural_interval_quest', 'aural_chord_oracle', 'sight_reading'],
    passive: 'Metronome, tuner & folding stand — unlocks rhythm, aural, and sight-reading challenges.',
  },
  {
    id: 'acc_t2', slot: 'accessory', tier: 2,
    name: 'Rehearsal Set', fantasyName: 'Ensemble Kit',
    statBonus: { technique: 10, accuracy: 10 },
    unlocks: ['rhythm_performance', 'aural_melody_mapper', 'sight_reading'],
    passive: 'Digital metronome & chromatic tuner — rhythm challenges show a ghost pulse.',
  },
  {
    id: 'acc_t3', slot: 'accessory', tier: 3,
    name: "Maestro's Set", fantasyName: 'Conductor Kit',
    statBonus: { technique: 18, accuracy: 18 },
    unlocks: ['aural_progression_master', 'sight_reading'],
    passive: 'Pro tuner, metronome & heavy stand — pitch reference before performances; +5s sight-reading study.',
  },
];

// ── Attire (Slot 4) & Case (Slot 5) ────────────────────────────────────────────

const GENERIC_ITEMS: GearItem[] = [
  ...ACCESSORY_ITEMS,
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
    // Instrument slot: tiers 1-3 (Legendary tier-4 instruments are boss-drop only)
    for (const tier of [1, 2, 3] as GearTier[]) {
      all.push(makeInstItem(instrument, tier));
    }
    // Material slot: both lines, tiers 1-4 (tier-4 = impractical legendary)
    for (const lineIndex of [0, 1] as const) {
      for (const tier of [1, 2, 3, 4] as GearTier[]) {
        all.push(makeMaterialItem(instrument, lineIndex, tier));
      }
    }
  }

  all.push(...GENERIC_ITEMS);
  return Object.fromEntries(all.map((item) => [item.id, item]));
}

export const GEAR_ITEMS: Record<string, GearItem> = buildGearItems();

// ── Starting gear ──────────────────────────────────────────────────────────────

export function getStartingGear(instrument: InstrumentId): Partial<Record<GearSlot, GearItem>> {
  const startArch = MATERIAL_LINES[instrument][0].arch;
  return {
    instrument: GEAR_ITEMS[`inst_${instrument}_t1`],
    mouthpiece: GEAR_ITEMS[`mat_${instrument}_${startArch}_t1`],
    accessory:  GEAR_ITEMS['acc_t1'],
    attire:     GEAR_ITEMS['attire_t1'],
    case:       GEAR_ITEMS['case_t1'],
  };
}

// ── Gear migration (legacy → current slot structure) ───────────────────────────

/**
 * Bring a stored gear object up to the current slot structure:
 *  - collapses the old metronome/tuner/stand slots into one `accessory`
 *  - converts old family-based mouthpieces into the instrument's starting material
 * Safe to run on already-current gear (idempotent).
 */
export function normalizeGear(
  raw: Partial<Record<string, GearItem>>,
  instrument: InstrumentId,
): Partial<Record<GearSlot, GearItem>> {
  const g: Partial<Record<string, GearItem>> = { ...(raw ?? {}) };

  // Consolidate legacy accessory slots → single `accessory`
  const legacyAccessories = ['accessory_metronome', 'accessory_tuner', 'accessory_stand'];
  const legacyTiers = legacyAccessories
    .map((k) => g[k]?.tier)
    .filter((t): t is GearTier => typeof t === 'number');
  if (legacyTiers.length > 0) {
    const tier = Math.min(3, Math.max(...legacyTiers));
    g.accessory = GEAR_ITEMS[`acc_t${tier}`];
  }
  legacyAccessories.forEach((k) => delete g[k]);
  if (!g.accessory) g.accessory = GEAR_ITEMS['acc_t1'];

  // Migrate legacy mouthpiece (mouth_*) → instrument material
  const mp = g.mouthpiece;
  if (mp && !mp.id.startsWith('mat_')) {
    const tier = Math.min(3, mp.tier ?? 1) as GearTier;
    const arch = MATERIAL_LINES[instrument][0].arch;
    g.mouthpiece = GEAR_ITEMS[`mat_${instrument}_${arch}_t${tier}`];
  }
  if (!g.mouthpiece) {
    const arch = MATERIAL_LINES[instrument][0].arch;
    g.mouthpiece = GEAR_ITEMS[`mat_${instrument}_${arch}_t1`];
  }

  return g as Partial<Record<GearSlot, GearItem>>;
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
  const matArch = MATERIAL_LINES[instrument][0].arch;
  const drops: Record<string, string> = {
    z1_boss_defeated:      `inst_${instrument}_t2`,
    z2_mini_boss_defeated: `mat_${instrument}_${matArch}_t2`,
    z3_mini_boss_defeated: 'attire_t2',
    z4_graduation:         'case_t2',
  };
  const itemId = drops[bossId];
  return itemId ? (GEAR_ITEMS[itemId] ?? null) : null;
}

// ── Shop ───────────────────────────────────────────────────────────────────────

export const SHOP_PRICES: Record<string, number> = (() => {
  const prices: Record<string, number> = {};
  for (const id of Object.keys(GEAR_ITEMS)) {
    const item = GEAR_ITEMS[id];
    if (item.tier === 1) continue; // T1 is starter gear, not sold
    if (item.slot === 'instrument') {
      prices[id] = item.tier === 2 ? 120 : 280;
    } else if (item.slot === 'mouthpiece') {
      prices[id] = item.tier === 2 ? 90 : item.tier === 3 ? 200 : 450; // T4 = luxury legendary
    } else if (item.slot === 'attire' || item.slot === 'case') {
      prices[id] = item.tier === 2 ? 80 : 180;
    } else {
      // accessory
      prices[id] = item.tier === 2 ? 60 : 140;
    }
  }
  return prices;
})();

export interface ShopOption {
  item: GearItem;
  price: number;
  canAfford: boolean;
  isSidegrade: boolean; // same tier as current (a lateral material swap)
}

export interface ShopSlotGroup {
  slot: GearSlot;
  label: string;
  current: GearItem | undefined;
  options: ShopOption[];
}

const SIMPLE_SLOT_ORDER: GearSlot[] = ['instrument', 'accessory', 'attire', 'case'];

export function getShopGroups(character: Character): ShopSlotGroup[] {
  const groups: ShopSlotGroup[] = [];
  const coins = character.resonanceCoins;

  // ── Material slot (branching) — show current-tier sidegrades + next-tier upgrades
  {
    const current = character.gear.mouthpiece;
    const curTier = (current?.tier ?? 0) as number;
    const options: ShopOption[] = [];
    for (const lineIndex of [0, 1] as const) {
      for (const tier of [curTier, curTier + 1] as GearTier[]) {
        if (tier < 2 || tier > 4) continue;
        const id = `mat_${character.instrument}_${MATERIAL_LINES[character.instrument][lineIndex].arch}_t${tier}`;
        const item = GEAR_ITEMS[id];
        if (!item || item.id === current?.id) continue;
        const price = SHOP_PRICES[id] ?? 0;
        options.push({ item, price, canAfford: coins >= price, isSidegrade: tier === curTier });
      }
    }
    if (options.length > 0) {
      groups.push({
        slot: 'mouthpiece',
        label: getSurfaceLabel(character.instrument),
        current,
        options: options.sort((a, b) => a.item.tier - b.item.tier),
      });
    }
  }

  // ── Simple linear slots (one next-tier option each, capped at T3)
  for (const slot of SIMPLE_SLOT_ORDER) {
    const equipped = character.gear[slot];
    const currentTier = (equipped?.tier ?? 0) as number;
    const nextTier = (currentTier + 1) as GearTier;
    if (nextTier > 3) continue;

    let candidateId: string | undefined;
    if (slot === 'instrument') {
      candidateId = `inst_${character.instrument}_t${nextTier}`;
    } else if (slot === 'accessory') {
      candidateId = `acc_t${nextTier}`;
    } else {
      candidateId = `${slot}_t${nextTier}`; // attire_t2, case_t2, ...
    }

    const item = candidateId ? GEAR_ITEMS[candidateId] : undefined;
    if (!item) continue;
    const price = SHOP_PRICES[item.id] ?? 0;
    groups.push({
      slot,
      label: SLOT_INFO[slot].label,
      current: equipped,
      options: [{ item, price, canAfford: coins >= price, isSidegrade: false }],
    });
  }

  // Order: instrument, material, accessory, attire, case
  const order: GearSlot[] = ['instrument', 'mouthpiece', 'accessory', 'attire', 'case'];
  return groups.sort((a, b) => order.indexOf(a.slot) - order.indexOf(b.slot));
}

// ── Slot display info ──────────────────────────────────────────────────────────

export const SLOT_INFO: Record<GearSlot, { label: string; icon: string }> = {
  instrument: { label: 'Instrument',        icon: '🎵' },
  mouthpiece: { label: 'Mouthpiece / Reed', icon: '🎙️' },
  accessory:  { label: 'Accessory',         icon: '🎼' },
  attire:     { label: 'Attire',            icon: '👔' },
  case:       { label: 'Case',              icon: '🧳' },
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
