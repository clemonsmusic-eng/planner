import type { GearItem, GearSlot, GearTier, InstrumentId } from '../types/game';
import type { Character, StatBlock } from '../types/game';
import { INSTRUMENTS } from './instruments';

// ── Instrument stat emphasis (Slot 1) ──────────────────────────────────────────

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

// Instruments only go to tier 3 in the shop; 4/5 exist for type-completeness.
const TIER_MULT: Record<GearTier, number> = { 1: 1, 2: 3.5, 3: 6, 4: 10, 5: 14 };

function scaleBonus(base: Partial<StatBlock>, mult: number): Partial<StatBlock> {
  return Object.fromEntries(
    Object.entries(base).map(([k, v]) => [k, Math.round((v ?? 0) * mult)])
  ) as Partial<StatBlock>;
}

// ── Instrument items (Slot 1, winds & brass) ────────────────────────────────────

type InstNames = { display: string; t1Fantasy: string; t2Fantasy: string; t3Fantasy: string };

const INST_NAMES: Record<Exclude<InstrumentId, 'percussion'>, InstNames> = {
  flute:       { display: 'Flute',          t1Fantasy: 'Resonance Pipe',     t2Fantasy: 'Etched Wind Pipe', t3Fantasy: 'The Galway'    },
  clarinet:    { display: 'Clarinet',        t1Fantasy: 'Chromatic Reed',     t2Fantasy: 'Register Staff',   t3Fantasy: 'The Buffet'    },
  alto_sax:    { display: 'Alto Saxophone',  t1Fantasy: 'Hybrid Horn',        t2Fantasy: 'Shadow Cone',      t3Fantasy: 'The Selmer'    },
  trumpet:     { display: 'Trumpet',         t1Fantasy: 'Brass Clarion',      t2Fantasy: 'Champion Clarion', t3Fantasy: 'The Bach'      },
  trombone:    { display: 'Trombone',        t1Fantasy: 'Slide Lance',        t2Fantasy: 'Resonant Lance',   t3Fantasy: 'The Shires'    },
  euphonium:   { display: 'Euphonium',       t1Fantasy: 'Warm Cone',          t2Fantasy: 'Harmonic Cone',    t3Fantasy: 'The Besson'    },
  french_horn: { display: 'French Horn',     t1Fantasy: 'Forest Horn',        t2Fantasy: 'Echo Horn',        t3Fantasy: 'The Alexander' },
  tuba:        { display: 'Tuba',            t1Fantasy: 'Foundation Bell',    t2Fantasy: 'Iron Foundation',  t3Fantasy: 'The Miraphone' },
  oboe:        { display: 'Oboe',            t1Fantasy: 'Crystal Reed Staff', t2Fantasy: 'Precision Reed',   t3Fantasy: 'The Loree'     },
  bassoon:     { display: 'Bassoon',         t1Fantasy: 'Ancient Pipe',       t2Fantasy: 'Scholar Pipe',     t3Fantasy: 'The Heckel'    },
};

const INST_TIER_PREFIX: Record<number, string> = { 1: 'Academy Issued', 2: "Journeyman's", 3: 'Artisan' };
const INST_TIER_LABEL: Record<number, string> = { 1: 'Student', 2: 'Journeyman', 3: 'Artisan' };

const INST_LORE: Partial<Record<InstrumentId, string>> = {
  flute:       'A Powell Flute in the tradition of James Galway, the Man with the Golden Flute.',
  clarinet:    'Crafted by Buffet Crampon, makers of the finest clarinets since 1825.',
  alto_sax:    'Built by Henri Selmer Paris, whose saxophones define the sound of jazz and concert band alike.',
  trumpet:     'The Vincent Bach Stradivarius — the most celebrated trumpet in the world.',
  trombone:    'Handcrafted by S.E. Shires, the gold standard of professional trombone making.',
  euphonium:   'A Besson euphonium, trusted by professional players across the globe.',
  french_horn: 'An Alexander 103, the horn of choice for orchestras worldwide.',
  tuba:        'The Miraphone, a German-engineered tuba of exceptional resonance.',
  oboe:        "A François Loree oboe — the preferred instrument of the world's finest oboists.",
  bassoon:     'The Wilhelm Heckel bassoon, built in Biebrich since 1831.',
};

function makeInstItem(instrument: Exclude<InstrumentId, 'percussion'>, tier: GearTier): GearItem {
  const emphasis = INST_EMPHASIS[instrument];
  const names = INST_NAMES[instrument];
  const fantasyByTier = [names.t1Fantasy, names.t2Fantasy, names.t3Fantasy];
  return {
    id: `inst_${instrument}_t${tier}`,
    slot: 'instrument',
    tier,
    name: `${INST_TIER_PREFIX[tier]} ${names.display}`,
    fantasyName: fantasyByTier[tier - 1],
    tierLabel: INST_TIER_LABEL[tier],
    statBonus: scaleBonus(EMPH_BASE[emphasis], TIER_MULT[tier]),
    instrumentSpecific: instrument,
    loreEntry: tier >= 3 ? `${names.t3Fantasy} — ${INST_LORE[instrument] ?? 'A masterwork instrument.'}` : undefined,
  };
}

// ── Material accessory (Slot 2) — branching 1-2-3-2-1 lattice ───────────────────
//
// Every wind/brass instrument has a diamond-shaped material tree:
//
//        T1 (1 node: entry)
//       /                  \
//    T2-A                  T2-B          ← two archetype paths fork
//    /  \                 /  \
//  T3-A  T3-bridge ─── T3-bridge  T3-B   ← a hybrid bridge node joins them
//    \      |               /
//    T4-A                  T4-B
//       \                  /
//        T5 (1 node: legendary)
//
// Columns: 'a' (path A) · 'br' (bridge / hybrid) · 'b' (path B).
// Node counts per tier: 1 → 2 → 3 → 2 → 1.

type MatCol = 'a' | 'br' | 'b';
type MaterialArchetype = 'precision' | 'power' | 'warmth' | 'agility' | 'hybrid';

const ARCH_BASE: Record<MaterialArchetype, Partial<StatBlock>> = {
  precision: { accuracy: 4, technique: 2 },
  power:     { power: 4, accuracy: 1, endurance: 1 },
  warmth:    { endurance: 4, accuracy: 2 },
  agility:   { technique: 4, accuracy: 2 },
  hybrid:    { accuracy: 2, technique: 2, power: 1, endurance: 1 },
};

const MAT_TIER_MULT: Record<GearTier, number> = { 1: 1.5, 2: 3, 3: 5, 4: 7, 5: 10 };

const ARCH_TAGLINE: Record<MaterialArchetype, string> = {
  precision: 'Crystalline Precision',
  power:     'Dense Resonance',
  warmth:    'Warm Sustain',
  agility:   'Featherweight',
  hybrid:    'Balanced Temper',
};

// Signature passive per archetype, escalating by tier (T1 = stats only).
const ARCH_PASSIVE: Record<MaterialArchetype, Partial<Record<GearTier, string>>> = {
  precision: {
    2: 'Pitch tolerance widened by 2 cents.',
    3: 'Pitch tolerance widened by 4 cents; the opening note is easier to land.',
    4: 'Pitch tolerance widened by 6 cents.',
    5: 'The first pitch challenge of each battle automatically scores Excellent.',
  },
  power: {
    2: 'Ability damage +5%.',
    3: 'Attacks ignore 12% of enemy defense.',
    4: 'Attacks ignore 20% of enemy defense.',
    5: 'Attacks ignore 30% of enemy defense; critical hits strike harder.',
  },
  warmth: {
    2: 'Restore a little HP on Good-or-better ratings.',
    3: 'Restore moderate HP on Good-or-better ratings.',
    4: 'Restore solid HP on Good-or-better ratings.',
    5: 'Restore strong HP on Good-or-better; survive one fatal blow per battle.',
  },
  agility: {
    2: 'Rhythm timing window widened slightly.',
    3: 'Multi-hit abilities land one extra hit.',
    4: 'Rhythm timing window widened further.',
    5: 'Multi-hit abilities land two extra hits; your first action each battle is free.',
  },
  hybrid: {
    3: 'A balanced temper — modest bonuses across the board.',
    5: 'Mastery of both disciplines — all challenge tolerances widened.',
  },
};

interface MatTree {
  surface: string;            // 'Headjoint' | 'Mouthpiece' | 'Reed' | 'Sticks' | 'Mallets'
  archA: MaterialArchetype;   // path A (column 'a')
  archB: MaterialArchetype;   // path B (column 'b')
  entry: string;              // T1   (bridge column)
  t2: [string, string];       // T2   [A, B]
  t3: [string, string, string]; // T3 [A, bridge, B]
  t4: [string, string];       // T4   [A, B]
  legendary: string;          // T5   (bridge column)
}

// Two archetype paths + a hybrid bridge. mats run T1 → T5; T5 is the impractical legendary.
const WIND_BRASS_TREES: Record<Exclude<InstrumentId, 'percussion'>, MatTree> = {
  flute: {
    surface: 'Headjoint', archA: 'precision', archB: 'warmth',
    entry: 'Nickel-Silver',
    t2: ['Silver-Plated', 'Bamboo'],
    t3: ['Sterling Silver', 'Rose Gold', 'Crystal Glass'],
    t4: ['Platinum', 'Yellow Gold'],
    legendary: 'Diamond',
  },
  clarinet: {
    surface: 'Mouthpiece', archA: 'precision', archB: 'warmth',
    entry: 'ABS Resin',
    t2: ['Hard Rubber', 'Rosewood'],
    t3: ['Cocobolo', 'Violet Wood', 'Grenadilla'],
    t4: ['Crystal Glass', 'Mopane'],
    legendary: 'Diamond',
  },
  alto_sax: {
    surface: 'Mouthpiece', archA: 'precision', archB: 'warmth',
    entry: 'Yellow Brass',
    t2: ['Gold Lacquer', 'Silver-Plated'],
    t3: ['Rose Brass', 'Black Nickel', 'Copper'],
    t4: ['24k Gold-Plated', 'Sterling Silver'],
    legendary: 'Platinum-Plated',
  },
  oboe: {
    surface: 'Reed', archA: 'precision', archB: 'warmth',
    entry: 'Composite Resin',
    t2: ['Ebonite', 'Rosewood'],
    t3: ['Cocobolo', 'Kingwood', 'African Blackwood'],
    t4: ['Crystal Glass', 'Boxwood'],
    legendary: 'Ivory',
  },
  bassoon: {
    surface: 'Reed', archA: 'warmth', archB: 'precision',
    entry: 'Hard Maple',
    t2: ['Cherry Wood', 'Carbon Fiber'],
    t3: ['Pearwood', 'Walnut', 'Crystal Glass'],
    t4: ['Rosewood', 'Ebony'],
    legendary: 'Platinum',
  },
  trumpet: {
    surface: 'Mouthpiece', archA: 'power', archB: 'warmth',
    entry: 'Yellow Brass',
    t2: ['Gold Brass', 'Silver-Plated'],
    t3: ['Phosphor Bronze', 'Copper Bell', 'Rose Brass'],
    t4: ['Gold-Plated', 'Sterling Silver'],
    legendary: 'Platinum',
  },
  trombone: {
    surface: 'Mouthpiece', archA: 'precision', archB: 'warmth',
    entry: 'Yellow Brass',
    t2: ['Nickel Silver', 'Rose Brass'],
    t3: ['Gold Brass', 'Red Brass', 'Copper'],
    t4: ['Gold-Plated', 'Sterling Silver'],
    legendary: 'Orichalcum',
  },
  euphonium: {
    surface: 'Mouthpiece', archA: 'power', archB: 'warmth',
    entry: 'Yellow Brass',
    t2: ['Gold Brass', 'Rose Brass'],
    t3: ['Phosphor Bronze', 'Nickel Silver', 'Copper'],
    t4: ['Gold-Plated', 'Sterling Silver'],
    legendary: 'Rhodium',
  },
  french_horn: {
    surface: 'Mouthpiece', archA: 'precision', archB: 'warmth',
    entry: 'Yellow Brass',
    t2: ['Nickel Silver', 'Rose Brass'],
    t3: ['Phosphor Bronze', 'Gold Brass', 'Copper Bell'],
    t4: ['Sterling Silver', 'Gold-Plated'],
    legendary: 'Electrum',
  },
  tuba: {
    surface: 'Mouthpiece', archA: 'power', archB: 'warmth',
    entry: 'Yellow Brass',
    t2: ['Nickel Silver', 'Red Brass'],
    t3: ['Phosphor Bronze', 'Bell Bronze', 'Copper'],
    t4: ['Sterling Silver', 'Gold-Plated'],
    legendary: 'Meteorite Iron',
  },
};

// ── Percussion (special two-slot model) ─────────────────────────────────────────
//
// Percussion has ONE primary instrument (snare / marimba / timpani) in the
// instrument slot, and the material lattice in the mouthpiece slot represents the
// STICKS or MALLETS it is struck with. Each primary has its own 1-2-3-2-1 tree.
// The accessory slot holds a single fixed-material accessory instrument.

type PercPrimary = 'snare' | 'marimba' | 'timpani';

const PERC_PRIMARIES: Record<PercPrimary, { name: string; fantasy: string; stat: Partial<StatBlock> }> = {
  snare:   { name: 'Snare Drum', fantasy: 'Field Drum',      stat: { technique: 6, accuracy: 2 } },
  marimba: { name: 'Marimba',    fantasy: 'Resonant Bars',   stat: { accuracy: 6, technique: 2 } },
  timpani: { name: 'Timpani',    fantasy: 'Thunder Kettles', stat: { power: 5, endurance: 3 } },
};

const PERC_STICK_TREES: Record<PercPrimary, MatTree> = {
  // Snare — struck with sticks. Agility (technique) vs Power.
  snare: {
    surface: 'Sticks', archA: 'agility', archB: 'power',
    entry: 'Oak',
    t2: ['Maple', 'Hickory'],
    t3: ['Bamboo', 'Graphite Composite', 'Rosewood'],
    t4: ['Carbon Fiber', 'Aluminum'],
    legendary: 'Crystal Sticks',
  },
  // Marimba — struck with yarn/cord mallets. Warmth vs Precision.
  marimba: {
    surface: 'Mallets', archA: 'warmth', archB: 'precision',
    entry: 'Synthetic Yarn',
    t2: ['Natural Yarn', 'Cord-Wound'],
    t3: ['Wool Blend', 'Flannel', 'Hard Cord'],
    t4: ['Cashmere', 'Carbon Fiber Tip'],
    legendary: 'Crystal Head',
  },
  // Timpani — struck with felt mallets. Warmth vs Precision.
  timpani: {
    surface: 'Mallets', archA: 'warmth', archB: 'precision',
    entry: 'General Felt',
    t2: ['Soft Felt', 'Medium-Hard Felt'],
    t3: ['Flannel-Covered', 'Heavy Felt', 'Hard Felt'],
    t4: ['Padded Leather', 'Wood-Core Covered'],
    legendary: 'Obsidian Core',
  },
};

// Percussion accessory instruments — single fixed material each, no upgrade path.
type PHand = '1-Handed' | '2-Handed';
type PFam = 'Wood' | 'Metal' | 'Membrane';

const PFAM_STAT: Record<PFam, Partial<StatBlock>> = {
  Wood:     { technique: 6 },
  Metal:    { power: 6 },
  Membrane: { endurance: 6 },
};
const PFAM_PASSIVE: Record<PFam, string> = {
  Wood:     'Dry, precise timbre — sharpens rhythm challenges.',
  Metal:    'Bright, cutting attack — adds bite to your strikes.',
  Membrane: 'Warm, resonant body — bolsters your stamina.',
};

const PERC_ACCESSORIES: { id: string; name: string; material: string; hand: PHand; fam: PFam }[] = [
  // 1-Handed
  { id: 'pacc_maracas',        name: 'Maracas',        material: 'Dried Gourd', hand: '1-Handed', fam: 'Wood' },
  { id: 'pacc_castanets',      name: 'Castanets',      material: 'Hardwood',    hand: '1-Handed', fam: 'Wood' },
  { id: 'pacc_slapstick',      name: 'Slapstick',      material: 'Hardwood',    hand: '1-Handed', fam: 'Wood' },
  { id: 'pacc_sleigh_bells',   name: 'Sleigh Bells',   material: 'Brass',       hand: '1-Handed', fam: 'Metal' },
  { id: 'pacc_finger_cymbals', name: 'Finger Cymbals', material: 'Bronze',      hand: '1-Handed', fam: 'Metal' },
  { id: 'pacc_vibraslap',      name: 'Vibraslap',      material: 'Steel',       hand: '1-Handed', fam: 'Metal' },
  { id: 'pacc_tambourine',     name: 'Tambourine',     material: 'Animal Skin', hand: '1-Handed', fam: 'Membrane' },
  { id: 'pacc_cuica',          name: 'Cuica',          material: 'Bamboo',      hand: '1-Handed', fam: 'Membrane' },
  { id: 'pacc_hand_drum',      name: 'Hand Drum',      material: 'Maple',       hand: '1-Handed', fam: 'Membrane' },
  // 2-Handed
  { id: 'pacc_guiro',          name: 'Güiro',          material: 'Dried Gourd', hand: '2-Handed', fam: 'Wood' },
  { id: 'pacc_woodblock',      name: 'Woodblock',      material: 'Maple',       hand: '2-Handed', fam: 'Wood' },
  { id: 'pacc_triangle',       name: 'Triangle',       material: 'Steel',       hand: '2-Handed', fam: 'Metal' },
  { id: 'pacc_vibraphone',     name: 'Vibraphone',     material: 'Aluminum',    hand: '2-Handed', fam: 'Metal' },
  { id: 'pacc_crash_cymbals',  name: 'Crash Cymbals',  material: 'B20 Bronze',  hand: '2-Handed', fam: 'Metal' },
  { id: 'pacc_bass_drum',      name: 'Bass Drum',      material: 'Maple',       hand: '2-Handed', fam: 'Membrane' },
];
const PERC_ACCESSORY_IDS = PERC_ACCESSORIES.map((a) => a.id);

function derivePrimary(instrumentItemId: string | undefined): PercPrimary {
  if (instrumentItemId === 'perc_marimba') return 'marimba';
  if (instrumentItemId === 'perc_timpani') return 'timpani';
  return 'snare';
}

// ── Material-lattice helpers ────────────────────────────────────────────────────

// Which columns exist at each tier (the 1-2-3-2-1 shape).
const TIER_COLUMNS: Record<number, MatCol[]> = {
  1: ['br'],
  2: ['a', 'b'],
  3: ['a', 'br', 'b'],
  4: ['a', 'b'],
  5: ['br'],
};

// From a node (col, tier), which tier+1 columns can be purchased next.
function upgradeTargets(col: MatCol, tier: number): MatCol[] {
  if (tier === 1) return ['a', 'b'];                                  // → T2
  if (tier === 2) return col === 'a' ? ['a', 'br'] : ['br', 'b'];     // → T3
  if (tier === 3) return col === 'a' ? ['a'] : col === 'b' ? ['b'] : ['a', 'b']; // → T4
  if (tier === 4) return ['br'];                                      // → T5
  return [];
}

// id → column, populated while building items so the shop can locate the current node.
const MAT_COL: Record<string, MatCol> = {};

interface MatNode { col: MatCol; tier: GearTier; material: string; arch: MaterialArchetype; }

function treeNodes(tree: MatTree): MatNode[] {
  return [
    { col: 'br', tier: 1, material: tree.entry,     arch: 'hybrid' },
    { col: 'a',  tier: 2, material: tree.t2[0],     arch: tree.archA },
    { col: 'b',  tier: 2, material: tree.t2[1],     arch: tree.archB },
    { col: 'a',  tier: 3, material: tree.t3[0],     arch: tree.archA },
    { col: 'br', tier: 3, material: tree.t3[1],     arch: 'hybrid' },
    { col: 'b',  tier: 3, material: tree.t3[2],     arch: tree.archB },
    { col: 'a',  tier: 4, material: tree.t4[0],     arch: tree.archA },
    { col: 'b',  tier: 4, material: tree.t4[1],     arch: tree.archB },
    { col: 'br', tier: 5, material: tree.legendary, arch: 'hybrid' },
  ];
}

function makeMaterialItem(
  key: string,
  instrument: InstrumentId,
  tree: MatTree,
  node: MatNode,
): GearItem {
  const id = `mat_${key}_${node.col}_t${node.tier}`;
  MAT_COL[id] = node.col;
  return {
    id,
    slot: 'mouthpiece',
    tier: node.tier,
    name: `${node.material} ${tree.surface}`,
    fantasyName: ARCH_TAGLINE[node.arch],
    statBonus: scaleBonus(ARCH_BASE[node.arch], MAT_TIER_MULT[node.tier]),
    passive: ARCH_PASSIVE[node.arch][node.tier],
    instrumentSpecific: instrument,
    loreEntry: node.tier === 5
      ? `A ${node.material.toLowerCase()} ${tree.surface.toLowerCase()} — gloriously impractical, undeniably legendary.`
      : undefined,
  };
}

function treeFor(character: Character): MatTree {
  if (character.instrument === 'percussion') {
    return PERC_STICK_TREES[derivePrimary(character.gear.instrument?.id)];
  }
  return WIND_BRASS_TREES[character.instrument];
}

function matKey(character: Character): string {
  if (character.instrument === 'percussion') {
    return `percussion_${derivePrimary(character.gear.instrument?.id)}`;
  }
  return character.instrument;
}

/** Human label for the material slot, specific to the equipped instrument/primary. */
export function getSurfaceLabel(character: Character): string {
  return treeFor(character).surface;
}

// ── General accessory (Slot 3, winds & brass) — metronome / tuner / stand ────────

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

// Percussion accessory instruments (Slot 3 for percussion).
const PERC_ACCESSORY_ITEMS: GearItem[] = PERC_ACCESSORIES.map((a) => ({
  id: a.id,
  slot: 'accessory',
  tier: 1,
  tierLabel: a.fam,
  name: a.name,
  fantasyName: `${a.material} · ${a.hand}`,
  statBonus: PFAM_STAT[a.fam],
  passive: PFAM_PASSIVE[a.fam],
  instrumentSpecific: 'percussion',
}));

// ── Attire (Slot 4) & Case (Slot 5) ────────────────────────────────────────────

const GENERIC_ITEMS: GearItem[] = [
  ...ACCESSORY_ITEMS,
  ...PERC_ACCESSORY_ITEMS,
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
    if (instrument === 'percussion') {
      // Primary instruments (snare / marimba / timpani) — instrument slot.
      for (const primary of Object.keys(PERC_PRIMARIES) as PercPrimary[]) {
        const def = PERC_PRIMARIES[primary];
        all.push({
          id: `perc_${primary}`,
          slot: 'instrument',
          tier: 1,
          tierLabel: 'Primary',
          name: def.name,
          fantasyName: def.fantasy,
          statBonus: def.stat,
          instrumentSpecific: 'percussion',
        });
        // Stick / mallet material lattice for this primary.
        const tree = PERC_STICK_TREES[primary];
        for (const node of treeNodes(tree)) {
          all.push(makeMaterialItem(`percussion_${primary}`, 'percussion', tree, node));
        }
      }
    } else {
      for (const tier of [1, 2, 3] as GearTier[]) {
        all.push(makeInstItem(instrument, tier));
      }
      const tree = WIND_BRASS_TREES[instrument];
      for (const node of treeNodes(tree)) {
        all.push(makeMaterialItem(instrument, instrument, tree, node));
      }
    }
  }

  all.push(...GENERIC_ITEMS);
  return Object.fromEntries(all.map((item) => [item.id, item]));
}

export const GEAR_ITEMS: Record<string, GearItem> = buildGearItems();

// ── Starting gear ──────────────────────────────────────────────────────────────

export function getStartingGear(instrument: InstrumentId): Partial<Record<GearSlot, GearItem>> {
  if (instrument === 'percussion') {
    return {
      instrument: GEAR_ITEMS['perc_snare'],
      mouthpiece: GEAR_ITEMS['mat_percussion_snare_br_t1'],
      accessory:  GEAR_ITEMS['pacc_maracas'],
      attire:     GEAR_ITEMS['attire_t1'],
      case:       GEAR_ITEMS['case_t1'],
    };
  }
  return {
    instrument: GEAR_ITEMS[`inst_${instrument}_t1`],
    mouthpiece: GEAR_ITEMS[`mat_${instrument}_br_t1`],
    accessory:  GEAR_ITEMS['acc_t1'],
    attire:     GEAR_ITEMS['attire_t1'],
    case:       GEAR_ITEMS['case_t1'],
  };
}

// ── Gear migration (legacy → current slot structure) ───────────────────────────

function migrateMaterial(
  mp: GearItem | undefined,
  instrument: InstrumentId,
  primary: PercPrimary,
): GearItem {
  const key = instrument === 'percussion' ? `percussion_${primary}` : instrument;
  // Already a current-format material for this key.
  if (mp && GEAR_ITEMS[mp.id] && mp.id.startsWith(`mat_${key}_`)) return GEAR_ITEMS[mp.id];

  // Migrate from the old archetype-based id: mat_{instrument}_{arch}_t{tier}
  if (mp && mp.id.startsWith('mat_')) {
    const tier = Math.min(4, Math.max(1, mp.tier ?? 1)) as GearTier;
    const tree = instrument === 'percussion' ? PERC_STICK_TREES[primary] : WIND_BRASS_TREES[instrument];
    const arch = mp.id.replace(/^mat_/, '').replace(/_t\d+$/, '').split('_').pop();
    let col: MatCol = 'br';
    if (arch === tree.archA) col = 'a';
    else if (arch === tree.archB) col = 'b';
    const useCol: MatCol = tier === 1 ? 'br' : col === 'br' ? 'a' : col;
    const id = `mat_${key}_${useCol}_t${tier}`;
    if (GEAR_ITEMS[id]) return GEAR_ITEMS[id];
  }

  return GEAR_ITEMS[`mat_${key}_br_t1`];
}

/**
 * Bring a stored gear object up to the current slot structure. Safe to run on
 * already-current gear (idempotent). Handles:
 *  - ancient metronome/tuner/stand slots → single accessory
 *  - old archetype-based materials → new lattice nodes
 *  - percussion's primary + accessory-instrument model
 *  - refreshing every item to its current definition; filling missing slots
 */
export function normalizeGear(
  raw: Partial<Record<string, GearItem>>,
  instrument: InstrumentId,
): Partial<Record<GearSlot, GearItem>> {
  const g: Partial<Record<string, GearItem>> = { ...(raw ?? {}) };
  const isPerc = instrument === 'percussion';

  // Consolidate ancient metronome/tuner/stand slots into one accessory.
  const legacyAccessories = ['accessory_metronome', 'accessory_tuner', 'accessory_stand'];
  const legacyTiers = legacyAccessories
    .map((k) => g[k]?.tier)
    .filter((t): t is GearTier => typeof t === 'number');
  if (legacyTiers.length > 0) {
    g.accessory = GEAR_ITEMS[`acc_t${Math.min(3, Math.max(...legacyTiers))}`];
  }
  legacyAccessories.forEach((k) => delete g[k]);

  // Instrument slot.
  const primary = derivePrimary(g.instrument?.id);
  if (isPerc) {
    g.instrument = GEAR_ITEMS[`perc_${primary}`];
  } else if (!g.instrument || !GEAR_ITEMS[g.instrument.id] || !g.instrument.id.startsWith(`inst_${instrument}`)) {
    g.instrument = GEAR_ITEMS[`inst_${instrument}_t1`];
  } else {
    g.instrument = GEAR_ITEMS[g.instrument.id];
  }

  // Material slot.
  g.mouthpiece = migrateMaterial(g.mouthpiece, instrument, primary);

  // Accessory slot.
  if (isPerc) {
    g.accessory = (g.accessory && g.accessory.id.startsWith('pacc_') && GEAR_ITEMS[g.accessory.id])
      ? GEAR_ITEMS[g.accessory.id]
      : GEAR_ITEMS['pacc_maracas'];
  } else {
    g.accessory = (g.accessory && g.accessory.id.startsWith('acc_') && GEAR_ITEMS[g.accessory.id])
      ? GEAR_ITEMS[g.accessory.id]
      : GEAR_ITEMS['acc_t1'];
  }

  // Attire & case — refresh to current definitions, fill if missing.
  g.attire = (g.attire && GEAR_ITEMS[g.attire.id]) ? GEAR_ITEMS[g.attire.id] : GEAR_ITEMS['attire_t1'];
  g.case   = (g.case && GEAR_ITEMS[g.case.id])     ? GEAR_ITEMS[g.case.id]   : GEAR_ITEMS['case_t1'];

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

export function getBossGearDrop(bossId: string, character: Character): GearItem | null {
  const instrument = character.instrument;
  const isPerc = instrument === 'percussion';
  const primary = derivePrimary(character.gear.instrument?.id);
  const key = isPerc ? `percussion_${primary}` : instrument;

  const drops: Record<string, string> = {
    // Percussion has no instrument-tier upgrade, so it gets a stick/mallet upgrade instead.
    z1_mini_boss_defeated: 'acc_t2',                                    // Rehearsal Set / Iron Stand equivalent
    z1_graduation:         isPerc ? `mat_${key}_b_t2` : `inst_${instrument}_t2`,
    z2_mini_boss_defeated: `mat_${key}_a_t2`,
    z2_winter_concert:     `mat_${key}_b_t2`,
    z3_contest_won:        isPerc ? 'pacc_crash_cymbals' : 'attire_t2',
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
    if (id.startsWith('pacc_')) { prices[id] = 70; continue; }   // accessory instrument
    if (id.startsWith('perc_')) { prices[id] = 150; continue; }  // switch primary
    if (item.tier === 1) continue;                               // T1 is starter gear, not sold
    if (item.slot === 'instrument') {
      prices[id] = item.tier === 2 ? 120 : 280;
    } else if (item.slot === 'mouthpiece') {
      prices[id] = item.tier === 2 ? 90 : item.tier === 3 ? 200 : item.tier === 4 ? 320 : 600;
    } else if (item.slot === 'attire' || item.slot === 'case') {
      prices[id] = item.tier === 2 ? 80 : 180;
    } else {
      prices[id] = item.tier === 2 ? 60 : 140; // general accessory
    }
  }
  return prices;
})();

export interface ShopOption {
  item: GearItem;
  price: number;
  canAfford: boolean;
  isSidegrade: boolean; // a lateral swap (same tier / alternate primary / alternate accessory)
}

export interface ShopSlotGroup {
  slot: GearSlot;
  label: string;
  current: GearItem | undefined;
  options: ShopOption[];
}

export function getShopGroups(character: Character): ShopSlotGroup[] {
  const coins = character.resonanceCoins;
  const groups: ShopSlotGroup[] = [];
  const isPerc = character.instrument === 'percussion';

  const mk = (id: string, isSidegrade: boolean): ShopOption | null => {
    const item = GEAR_ITEMS[id];
    if (!item) return null;
    const price = SHOP_PRICES[id] ?? 0;
    return { item, price, canAfford: coins >= price, isSidegrade };
  };
  const clean = (arr: (ShopOption | null)[]): ShopOption[] =>
    arr.filter((o): o is ShopOption => o !== null);

  // ── Instrument slot ───────────────────────────────────────────────────────────
  {
    const cur = character.gear.instrument;
    let options: ShopOption[] = [];
    if (isPerc) {
      options = clean(
        (Object.keys(PERC_PRIMARIES) as PercPrimary[])
          .filter((p) => `perc_${p}` !== cur?.id)
          .map((p) => mk(`perc_${p}`, true)),
      );
    } else {
      const next = ((cur?.tier ?? 0) + 1) as GearTier;
      if (next <= 3) options = clean([mk(`inst_${character.instrument}_t${next}`, false)]);
    }
    if (options.length) {
      groups.push({ slot: 'instrument', label: SLOT_INFO.instrument.label, current: cur, options });
    }
  }

  // ── Material slot (branching lattice) ─────────────────────────────────────────
  {
    const key = matKey(character);
    const cur = character.gear.mouthpiece;
    const curTier = (cur?.tier ?? 0) as number;
    const curCol = cur ? MAT_COL[cur.id] : undefined;
    const options: ShopOption[] = [];
    if (curCol && curTier >= 1 && curTier < 5) {
      // Sidegrades: alternate materials at the same tier.
      for (const c of TIER_COLUMNS[curTier]) {
        if (c === curCol) continue;
        const o = mk(`mat_${key}_${c}_t${curTier}`, true);
        if (o) options.push(o);
      }
      // Upgrades: reachable nodes one tier up.
      for (const c of upgradeTargets(curCol, curTier)) {
        const o = mk(`mat_${key}_${c}_t${curTier + 1}`, false);
        if (o) options.push(o);
      }
    }
    if (options.length) {
      groups.push({
        slot: 'mouthpiece',
        label: getSurfaceLabel(character),
        current: cur,
        options: options.sort((a, b) => a.item.tier - b.item.tier || Number(a.isSidegrade) - Number(b.isSidegrade)),
      });
    }
  }

  // ── Accessory slot ────────────────────────────────────────────────────────────
  {
    const cur = character.gear.accessory;
    let options: ShopOption[] = [];
    if (isPerc) {
      options = clean(PERC_ACCESSORY_IDS.filter((id) => id !== cur?.id).map((id) => mk(id, true)));
    } else {
      const next = ((cur?.tier ?? 0) + 1) as GearTier;
      if (next <= 3) options = clean([mk(`acc_t${next}`, false)]);
    }
    if (options.length) {
      groups.push({
        slot: 'accessory',
        label: isPerc ? 'Accessory Instrument' : SLOT_INFO.accessory.label,
        current: cur,
        options,
      });
    }
  }

  // ── Case & Attire (simple linear upgrades) ────────────────────────────────────
  for (const slot of ['case', 'attire'] as GearSlot[]) {
    const cur = character.gear[slot];
    const next = ((cur?.tier ?? 0) + 1) as GearTier;
    if (next > 3) continue;
    const o = mk(`${slot}_t${next}`, false);
    if (o) groups.push({ slot, label: SLOT_INFO[slot].label, current: cur, options: [o] });
  }

  const order: GearSlot[] = ['instrument', 'mouthpiece', 'accessory', 'case', 'attire'];
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
  5: 'text-academy-gold',
};

export const TIER_LABELS: Record<GearTier, string> = {
  1: 'Student',
  2: 'Apprentice',
  3: 'Journeyman',
  4: 'Artisan',
  5: 'Legendary',
};
