import type { Appearance } from '../types/game';

// ── Option palettes ──────────────────────────────────────────────────────────
// Every option is index-addressable so an Appearance is a tiny, serializable
// set of integers + the customizer just walks these arrays.

export const SKIN_TONES = [
  '#F4D2B0', '#E8B98F', '#C68A63', '#9C6644', '#6F4A30', '#52341F',
];

export const HAIR_COLORS = [
  '#2B221C', '#5A3A22', '#8B5A2B', '#C9A227', '#D9D2C5',
  '#7B3F3F', '#3B5B7A', '#5E4B8B', '#2E6E54', '#B0B0B8',
];

export const OUTFIT_COLORS = [
  '#C9A227', '#B5544A', '#3B6FB5', '#3E8E6E', '#6E4FA3',
  '#C97A2B', '#4A4E69', '#A23B6E', '#2E7D7D', '#8A8D93',
];

export const ACCENT_COLORS = [
  '#F4E4B0', '#E8C8C0', '#C8D8F0', '#C8E8D8', '#D8C8F0',
  '#F0D8B0', '#C8CAD8', '#F0C8DC', '#C8E8E8', '#E0E0E4',
];

export const BACKDROPS: { id: number; name: string; from: string; to: string }[] = [
  { id: 0, name: 'Academy Gold', from: '#3a2c10', to: '#1a1308' },
  { id: 1, name: 'Twilight', from: '#1e2748', to: '#0d1020' },
  { id: 2, name: 'Forest', from: '#16301f', to: '#0a160e' },
  { id: 3, name: 'Crimson Hall', from: '#3a1418', to: '#18080a' },
  { id: 4, name: 'Frost', from: '#1c3340', to: '#0c1820' },
  { id: 5, name: 'Amethyst', from: '#2a1a40', to: '#120a20' },
];

// Number of distinct styles available for each indexed slot.
export const HAIR_STYLE_COUNT = 6;   // 0 buzz · 1 short · 2 swept · 3 long · 4 ponytail · 5 curly
export const EYE_STYLE_COUNT = 4;    // 0 round · 1 calm · 2 sharp · 3 wink
export const ACCESSORY_COUNT = 6;    // 0 none · 1 glasses · 2 headband · 3 circlet · 4 eyepatch · 5 earrings

export const HAIR_STYLE_NAMES = ['Buzz', 'Short', 'Swept', 'Long', 'Ponytail', 'Curly'];
export const EYE_STYLE_NAMES = ['Round', 'Calm', 'Sharp', 'Wink'];
export const ACCESSORY_NAMES = ['None', 'Glasses', 'Headband', 'Circlet', 'Eyepatch', 'Earrings'];

// ── Defaults & helpers ───────────────────────────────────────────────────────

export const DEFAULT_APPEARANCE: Appearance = {
  skinTone: 0,
  hairStyle: 1,
  hairColor: 0,
  outfitColor: 0,
  accentColor: 0,
  eyes: 1,
  accessory: 0,
  backdrop: 0,
};

/** Merge a (possibly empty / partial / legacy) value into a full Appearance. */
export function normalizeAppearance(raw: unknown): Appearance {
  const a = (raw && typeof raw === 'object') ? raw as Partial<Appearance> : {};
  const clamp = (v: unknown, max: number, fallback: number) => {
    const n = typeof v === 'number' ? Math.floor(v) : NaN;
    return Number.isFinite(n) && n >= 0 && n < max ? n : fallback;
  };
  return {
    skinTone:    clamp(a.skinTone,    SKIN_TONES.length,    DEFAULT_APPEARANCE.skinTone),
    hairStyle:   clamp(a.hairStyle,   HAIR_STYLE_COUNT,     DEFAULT_APPEARANCE.hairStyle),
    hairColor:   clamp(a.hairColor,   HAIR_COLORS.length,   DEFAULT_APPEARANCE.hairColor),
    outfitColor: clamp(a.outfitColor, OUTFIT_COLORS.length, DEFAULT_APPEARANCE.outfitColor),
    accentColor: clamp(a.accentColor, ACCENT_COLORS.length, DEFAULT_APPEARANCE.accentColor),
    eyes:        clamp(a.eyes,        EYE_STYLE_COUNT,      DEFAULT_APPEARANCE.eyes),
    accessory:   clamp(a.accessory,   ACCESSORY_COUNT,      DEFAULT_APPEARANCE.accessory),
    backdrop:    clamp(a.backdrop,    BACKDROPS.length,     DEFAULT_APPEARANCE.backdrop),
  };
}

/** A deterministic, varied appearance seeded from a string (e.g. user id). */
export function randomAppearance(seed?: string): Appearance {
  let h = 2166136261;
  const s = seed ?? Math.random().toString();
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const pick = (n: number) => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    return Math.abs(h) % n;
  };
  return {
    skinTone: pick(SKIN_TONES.length),
    hairStyle: pick(HAIR_STYLE_COUNT),
    hairColor: pick(HAIR_COLORS.length),
    outfitColor: pick(OUTFIT_COLORS.length),
    accentColor: pick(ACCENT_COLORS.length),
    eyes: pick(EYE_STYLE_COUNT),
    accessory: pick(ACCESSORY_COUNT),
    backdrop: pick(BACKDROPS.length),
  };
}
