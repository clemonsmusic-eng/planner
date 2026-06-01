// ── Types ─────────────────────────────────────────────────────────────────────

export interface TrumpetFingering { v1: boolean; v2: boolean; v3: boolean }
export interface HornFingering { thumb: boolean; v1: boolean; v2: boolean; v3: boolean }
export interface ValveFingering { v1: boolean; v2: boolean; v3: boolean; v4?: boolean }
export interface TromboneFingering { position: 1|2|3|4|5|6|7; trigger?: boolean }
export interface WoodwindFingering {
  octave: boolean;
  lh1: boolean; lh2: boolean; lh3: boolean;
  rh1: boolean; rh2: boolean; rh3: boolean; rh4?: boolean;
  sideOct?: boolean;
  sideC?: boolean;
  sideEb?: boolean;
  lhGis?: boolean;
  rhC?: boolean;
  rhEb?: boolean;
  rhFs?: boolean;
}

export type AnyFingering = TrumpetFingering | HornFingering | ValveFingering | TromboneFingering | WoodwindFingering;

export type InstrumentKey = 'flute' | 'clarinet' | 'alto_sax' | 'trumpet' | 'horn' | 'trombone' | 'euphonium' | 'tuba';

export interface FingeringEntry {
  concertPitch: string;
  writtenPitch: string;
  fingering: AnyFingering;
  altFingering?: AnyFingering;
  notes?: string;
}

export const INSTRUMENT_NAMES: Record<InstrumentKey, string> = {
  flute: 'Flute',
  clarinet: 'Bb Clarinet',
  alto_sax: 'Eb Alto Saxophone',
  trumpet: 'Bb Trumpet',
  horn: 'F French Horn',
  trombone: 'Trombone',
  euphonium: 'Bb Euphonium',
  tuba: 'Bb Tuba',
};

export const TRANSPOSITION: Record<InstrumentKey, number> = {
  flute: 0,
  clarinet: 2,
  alto_sax: 9,
  trumpet: 2,
  horn: 7,
  trombone: 0,
  euphonium: 2,
  tuba: 2,
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function tv(v1: boolean, v2: boolean, v3: boolean): TrumpetFingering {
  return { v1, v2, v3 };
}
function ww(
  octave: boolean,
  lh1: boolean, lh2: boolean, lh3: boolean,
  rh1: boolean, rh2: boolean, rh3: boolean, rh4?: boolean,
  extras?: Partial<WoodwindFingering>
): WoodwindFingering {
  return { octave, lh1, lh2, lh3, rh1, rh2, rh3, rh4, ...extras };
}
function pos(position: 1|2|3|4|5|6|7, trigger?: boolean): TromboneFingering {
  return trigger ? { position, trigger: true } : { position };
}
function horn(thumb: boolean, v1: boolean, v2: boolean, v3: boolean): HornFingering {
  return { thumb, v1, v2, v3 };
}
function euph(v1: boolean, v2: boolean, v3: boolean, v4?: boolean): ValveFingering {
  return v4 !== undefined ? { v1, v2, v3, v4 } : { v1, v2, v3 };
}

// ── Trumpet fingerings ─────────────────────────────────────────────────────────
// Written pitch = concert + 2 semitones

const TRUMPET_FINGERINGS: FingeringEntry[] = [
  { concertPitch: 'Eb3', writtenPitch: 'F3',  fingering: tv(true,  false, true)  },
  { concertPitch: 'E3',  writtenPitch: 'F#3', fingering: tv(false, true,  true)  },
  { concertPitch: 'F3',  writtenPitch: 'G3',  fingering: tv(false, false, false) },
  { concertPitch: 'Gb3', writtenPitch: 'Ab3', fingering: tv(false, true,  true)  },
  { concertPitch: 'G3',  writtenPitch: 'A3',  fingering: tv(true,  true,  false) },
  { concertPitch: 'Ab3', writtenPitch: 'Bb3', fingering: tv(true,  false, false) },
  { concertPitch: 'A3',  writtenPitch: 'B3',  fingering: tv(false, true,  false) },
  { concertPitch: 'Bb3', writtenPitch: 'C4',  fingering: tv(false, false, false) },
  { concertPitch: 'B3',  writtenPitch: 'Db4', fingering: tv(true,  true,  true)  },
  { concertPitch: 'C4',  writtenPitch: 'D4',  fingering: tv(true,  false, true)  },
  { concertPitch: 'Db4', writtenPitch: 'Eb4', fingering: tv(false, true,  true)  },
  { concertPitch: 'D4',  writtenPitch: 'E4',  fingering: tv(true,  true,  false) },
  { concertPitch: 'Eb4', writtenPitch: 'F4',  fingering: tv(true,  false, false) },
  { concertPitch: 'E4',  writtenPitch: 'F#4', fingering: tv(false, true,  true)  },
  { concertPitch: 'F4',  writtenPitch: 'G4',  fingering: tv(false, false, false) },
  { concertPitch: 'Gb4', writtenPitch: 'Ab4', fingering: tv(false, true,  true)  },
  { concertPitch: 'G4',  writtenPitch: 'A4',  fingering: tv(true,  true,  false) },
  { concertPitch: 'Ab4', writtenPitch: 'Bb4', fingering: tv(true,  false, false) },
  { concertPitch: 'A4',  writtenPitch: 'B4',  fingering: tv(false, true,  false) },
  { concertPitch: 'Bb4', writtenPitch: 'C5',  fingering: tv(false, false, false) },
  { concertPitch: 'B4',  writtenPitch: 'Db5', fingering: tv(true,  true,  true)  },
  { concertPitch: 'C5',  writtenPitch: 'D5',  fingering: tv(true,  false, true),  altFingering: tv(true, true, false), notes: 'or 1+2 in upper register' },
  { concertPitch: 'Db5', writtenPitch: 'Eb5', fingering: tv(false, true,  true)  },
  { concertPitch: 'D5',  writtenPitch: 'E5',  fingering: tv(true,  true,  false) },
  { concertPitch: 'Eb5', writtenPitch: 'F5',  fingering: tv(true,  false, false) },
  { concertPitch: 'E5',  writtenPitch: 'F#5', fingering: tv(false, true,  true)  },
  { concertPitch: 'F5',  writtenPitch: 'G5',  fingering: tv(false, false, false) },
  { concertPitch: 'Gb5', writtenPitch: 'Ab5', fingering: tv(false, true,  true)  },
  { concertPitch: 'G5',  writtenPitch: 'A5',  fingering: tv(true,  true,  false) },
  { concertPitch: 'Ab5', writtenPitch: 'Bb5', fingering: tv(true,  false, false) },
  { concertPitch: 'A5',  writtenPitch: 'B5',  fingering: tv(false, true,  false) },
  { concertPitch: 'Bb5', writtenPitch: 'C6',  fingering: tv(false, false, false) },
];

// ── Clarinet fingerings ────────────────────────────────────────────────────────
// Written pitch = concert + 2 semitones
// Boehm system: octave = register key
// Chalumeau register (lower): E3-Bb4
// Clarion register (upper register key): B4-C6

const CLARINET_FINGERINGS: FingeringEntry[] = [
  // Chalumeau register
  { concertPitch: 'D3',  writtenPitch: 'E3',  fingering: ww(false, true,  true,  true,  true,  true,  true,  true)  },
  { concertPitch: 'Eb3', writtenPitch: 'F3',  fingering: ww(false, true,  true,  true,  true,  true,  true,  false) },
  { concertPitch: 'E3',  writtenPitch: 'F#3', fingering: ww(false, true,  true,  true,  true,  true,  false, false, { rhEb: true }) },
  { concertPitch: 'F3',  writtenPitch: 'G3',  fingering: ww(false, true,  true,  true,  true,  true,  false) },
  { concertPitch: 'Gb3', writtenPitch: 'Ab3', fingering: ww(false, true,  true,  true,  true,  false, true)  },
  { concertPitch: 'G3',  writtenPitch: 'A3',  fingering: ww(false, true,  true,  true,  true,  false, false) },
  { concertPitch: 'Ab3', writtenPitch: 'Bb3', fingering: ww(false, true,  true,  true,  false, false, false), notes: 'Throat Bb' },
  { concertPitch: 'A3',  writtenPitch: 'B3',  fingering: ww(false, true,  true,  false, false, false, false) },
  { concertPitch: 'Bb3', writtenPitch: 'C4',  fingering: ww(false, true,  false, false, false, false, false) },
  { concertPitch: 'B3',  writtenPitch: 'Db4', fingering: ww(false, true,  false, false, false, false, false, false, { sideEb: true }) },
  { concertPitch: 'C4',  writtenPitch: 'D4',  fingering: ww(false, false, false, false, false, false, false) },
  { concertPitch: 'Db4', writtenPitch: 'Eb4', fingering: ww(false, false, false, false, false, false, false, false, { sideEb: true }) },
  { concertPitch: 'D4',  writtenPitch: 'E4',  fingering: ww(false, true,  true,  true,  true,  true,  true,  true,  { octave: false }) },
  { concertPitch: 'Eb4', writtenPitch: 'F4',  fingering: ww(false, true,  true,  true,  true,  true,  true,  false) },
  { concertPitch: 'E4',  writtenPitch: 'F#4', fingering: ww(false, true,  true,  true,  true,  true,  false, false, { rhEb: true }) },
  { concertPitch: 'F4',  writtenPitch: 'G4',  fingering: ww(false, true,  true,  true,  true,  true,  false) },
  { concertPitch: 'Gb4', writtenPitch: 'Ab4', fingering: ww(false, true,  true,  true,  true,  false, true)  },
  { concertPitch: 'G4',  writtenPitch: 'A4',  fingering: ww(false, true,  true,  true,  true,  false, false) },
  { concertPitch: 'Ab4', writtenPitch: 'Bb4', fingering: ww(false, true,  true,  true,  false, false, false), notes: 'Throat Bb' },
  // Clarion register (register key pressed)
  { concertPitch: 'A4',  writtenPitch: 'B4',  fingering: ww(true,  true,  true,  true,  true,  true,  true,  true)  },
  { concertPitch: 'Bb4', writtenPitch: 'C5',  fingering: ww(true,  true,  true,  true,  true,  true,  true,  false) },
  { concertPitch: 'B4',  writtenPitch: 'Db5', fingering: ww(true,  true,  true,  true,  true,  true,  false, false, { rhEb: true }) },
  { concertPitch: 'C5',  writtenPitch: 'D5',  fingering: ww(true,  true,  true,  true,  true,  true,  false) },
  { concertPitch: 'Db5', writtenPitch: 'Eb5', fingering: ww(true,  true,  true,  true,  true,  false, true)  },
  { concertPitch: 'D5',  writtenPitch: 'E5',  fingering: ww(true,  true,  true,  true,  true,  false, false) },
  { concertPitch: 'Eb5', writtenPitch: 'F5',  fingering: ww(true,  true,  true,  true,  false, false, false) },
  { concertPitch: 'E5',  writtenPitch: 'F#5', fingering: ww(true,  true,  true,  false, false, false, false) },
  { concertPitch: 'F5',  writtenPitch: 'G5',  fingering: ww(true,  true,  false, false, false, false, false) },
  { concertPitch: 'Gb5', writtenPitch: 'Ab5', fingering: ww(true,  false, false, false, false, false, false, false, { sideEb: true }) },
  { concertPitch: 'G5',  writtenPitch: 'A5',  fingering: ww(true,  false, false, false, false, false, false) },
  { concertPitch: 'Ab5', writtenPitch: 'Bb5', fingering: ww(true,  true,  true,  true,  false, false, false) },
  { concertPitch: 'A5',  writtenPitch: 'B5',  fingering: ww(true,  true,  true,  true,  true,  true,  true,  true)  },
  { concertPitch: 'Bb5', writtenPitch: 'C6',  fingering: ww(true,  true,  true,  true,  true,  true,  true,  false) },
];

// ── Alto Saxophone fingerings ──────────────────────────────────────────────────
// Written pitch = concert + 9 semitones (Eb instrument)
// Octave key for upper register

const ALTO_SAX_FINGERINGS: FingeringEntry[] = [
  // Low register (no octave key) - concert Db3 to concert Ab4
  { concertPitch: 'Db3', writtenPitch: 'Bb3', fingering: ww(false, true,  true,  true,  true,  true,  true,  true)  },
  { concertPitch: 'D3',  writtenPitch: 'B3',  fingering: ww(false, true,  true,  true,  true,  true,  true,  false) },
  { concertPitch: 'Eb3', writtenPitch: 'C4',  fingering: ww(false, true,  true,  true,  true,  true,  false) },
  { concertPitch: 'E3',  writtenPitch: 'Db4', fingering: ww(false, true,  true,  true,  true,  false, true)  },
  { concertPitch: 'F3',  writtenPitch: 'D4',  fingering: ww(false, true,  true,  true,  true,  false, false) },
  { concertPitch: 'Gb3', writtenPitch: 'Eb4', fingering: ww(false, true,  true,  true,  false, false, false) },
  { concertPitch: 'G3',  writtenPitch: 'E4',  fingering: ww(false, true,  true,  true,  false, false, false, false, { lhGis: true }) },
  { concertPitch: 'Ab3', writtenPitch: 'F4',  fingering: ww(false, true,  true,  false, false, false, false) },
  { concertPitch: 'A3',  writtenPitch: 'F#4', fingering: ww(false, true,  false, false, false, false, false, false, { sideC: true }) },
  { concertPitch: 'Bb3', writtenPitch: 'G4',  fingering: ww(false, true,  false, false, false, false, false) },
  { concertPitch: 'B3',  writtenPitch: 'Ab4', fingering: ww(false, false, false, false, false, false, false, false, { sideEb: true }) },
  { concertPitch: 'C4',  writtenPitch: 'A4',  fingering: ww(false, false, false, false, false, false, false) },
  { concertPitch: 'Db4', writtenPitch: 'Bb4', fingering: ww(false, false, false, false, false, false, false, false, { sideEb: true }) },
  // Upper register (octave key)
  { concertPitch: 'D4',  writtenPitch: 'B4',  fingering: ww(true,  true,  true,  true,  true,  true,  true,  false) },
  { concertPitch: 'Eb4', writtenPitch: 'C5',  fingering: ww(true,  true,  true,  true,  true,  true,  false) },
  { concertPitch: 'E4',  writtenPitch: 'Db5', fingering: ww(true,  true,  true,  true,  true,  false, true)  },
  { concertPitch: 'F4',  writtenPitch: 'D5',  fingering: ww(true,  true,  true,  true,  true,  false, false) },
  { concertPitch: 'Gb4', writtenPitch: 'Eb5', fingering: ww(true,  true,  true,  true,  false, false, false) },
  { concertPitch: 'G4',  writtenPitch: 'E5',  fingering: ww(true,  true,  true,  true,  false, false, false, false, { lhGis: true }) },
  { concertPitch: 'Ab4', writtenPitch: 'F5',  fingering: ww(true,  true,  true,  false, false, false, false) },
  { concertPitch: 'A4',  writtenPitch: 'F#5', fingering: ww(true,  true,  false, false, false, false, false, false, { sideC: true }) },
  { concertPitch: 'Bb4', writtenPitch: 'G5',  fingering: ww(true,  true,  false, false, false, false, false) },
  { concertPitch: 'B4',  writtenPitch: 'Ab5', fingering: ww(true,  false, false, false, false, false, false, false, { sideEb: true }) },
  { concertPitch: 'C5',  writtenPitch: 'A5',  fingering: ww(true,  false, false, false, false, false, false) },
  { concertPitch: 'Db5', writtenPitch: 'Bb5', fingering: ww(true,  false, false, false, false, false, false, false, { sideEb: true }) },
  { concertPitch: 'D5',  writtenPitch: 'B5',  fingering: ww(true,  true,  true,  true,  true,  true,  true,  false) },
  { concertPitch: 'Eb5', writtenPitch: 'C6',  fingering: ww(true,  true,  true,  true,  true,  true,  false) },
];

// ── Flute fingerings ───────────────────────────────────────────────────────────
// Concert pitch instrument (no transposition)
// Octave is controlled by embouchure, but we use the octave field for 2nd octave

const FLUTE_FINGERINGS: FingeringEntry[] = [
  // Low register: B3-B4 (no octave key)
  { concertPitch: 'B3',  writtenPitch: 'B3',  fingering: ww(false, true,  true,  true,  true,  true,  true,  true)  },
  { concertPitch: 'C4',  writtenPitch: 'C4',  fingering: ww(false, true,  true,  true,  true,  true,  true,  false) },
  { concertPitch: 'Db4', writtenPitch: 'Db4', fingering: ww(false, true,  true,  true,  true,  true,  false, true,  { rhEb: true }) },
  { concertPitch: 'D4',  writtenPitch: 'D4',  fingering: ww(false, true,  true,  true,  true,  true,  false) },
  { concertPitch: 'Eb4', writtenPitch: 'Eb4', fingering: ww(false, true,  true,  true,  true,  false, true)  },
  { concertPitch: 'E4',  writtenPitch: 'E4',  fingering: ww(false, true,  true,  true,  true,  false, false) },
  { concertPitch: 'F4',  writtenPitch: 'F4',  fingering: ww(false, true,  true,  true,  false, false, false, false, { rhFs: true }) },
  { concertPitch: 'F#4', writtenPitch: 'F#4', fingering: ww(false, true,  true,  true,  false, false, false) },
  { concertPitch: 'G4',  writtenPitch: 'G4',  fingering: ww(false, true,  true,  false, false, false, false) },
  { concertPitch: 'Ab4', writtenPitch: 'Ab4', fingering: ww(false, true,  false, true,  false, false, false) },
  { concertPitch: 'A4',  writtenPitch: 'A4',  fingering: ww(false, true,  false, false, false, false, false) },
  { concertPitch: 'Bb4', writtenPitch: 'Bb4', fingering: ww(true,  true,  false, false, false, false, false) },
  { concertPitch: 'B4',  writtenPitch: 'B4',  fingering: ww(false, false, false, false, false, false, false) },
  // Second octave: C5-C6 (octave flag for visual clarity)
  { concertPitch: 'C5',  writtenPitch: 'C5',  fingering: ww(true,  true,  true,  true,  true,  true,  true,  false) },
  { concertPitch: 'Db5', writtenPitch: 'Db5', fingering: ww(true,  true,  true,  true,  true,  true,  false, true,  { rhEb: true }) },
  { concertPitch: 'D5',  writtenPitch: 'D5',  fingering: ww(true,  true,  true,  true,  true,  true,  false) },
  { concertPitch: 'Eb5', writtenPitch: 'Eb5', fingering: ww(true,  true,  true,  true,  true,  false, true)  },
  { concertPitch: 'E5',  writtenPitch: 'E5',  fingering: ww(true,  true,  true,  true,  true,  false, false) },
  { concertPitch: 'F5',  writtenPitch: 'F5',  fingering: ww(true,  true,  true,  true,  false, false, false, false, { rhFs: true }) },
  { concertPitch: 'F#5', writtenPitch: 'F#5', fingering: ww(true,  true,  true,  true,  false, false, false) },
  { concertPitch: 'G5',  writtenPitch: 'G5',  fingering: ww(true,  true,  true,  false, false, false, false) },
  { concertPitch: 'Ab5', writtenPitch: 'Ab5', fingering: ww(true,  true,  false, true,  false, false, false) },
  { concertPitch: 'A5',  writtenPitch: 'A5',  fingering: ww(true,  true,  false, false, false, false, false) },
  { concertPitch: 'Bb5', writtenPitch: 'Bb5', fingering: ww(true,  true,  true,  false, true,  false, false) },
  { concertPitch: 'B5',  writtenPitch: 'B5',  fingering: ww(true,  false, false, false, true,  false, false) },
  { concertPitch: 'C6',  writtenPitch: 'C6',  fingering: ww(true,  true,  false, false, false, false, false) },
];

// ── French Horn fingerings ─────────────────────────────────────────────────────
// Written pitch = concert + 7 semitones (F horn)
// thumb = Bb thumb valve

const HORN_FINGERINGS: FingeringEntry[] = [
  { concertPitch: 'F2',  writtenPitch: 'C3',  fingering: horn(false, true,  true,  true)  },
  { concertPitch: 'Gb2', writtenPitch: 'Db3', fingering: horn(false, true,  false, true)  },
  { concertPitch: 'G2',  writtenPitch: 'D3',  fingering: horn(false, false, true,  true)  },
  { concertPitch: 'Ab2', writtenPitch: 'Eb3', fingering: horn(false, true,  true,  false) },
  { concertPitch: 'A2',  writtenPitch: 'E3',  fingering: horn(false, true,  false, false) },
  { concertPitch: 'Bb2', writtenPitch: 'F3',  fingering: horn(false, true,  false, false), altFingering: horn(false, false, false, false) },
  { concertPitch: 'B2',  writtenPitch: 'F#3', fingering: horn(false, false, true,  false) },
  { concertPitch: 'C3',  writtenPitch: 'G3',  fingering: horn(false, false, false, false) },
  { concertPitch: 'Db3', writtenPitch: 'Ab3', fingering: horn(false, false, true,  true)  },
  { concertPitch: 'D3',  writtenPitch: 'A3',  fingering: horn(false, true,  true,  false) },
  { concertPitch: 'Eb3', writtenPitch: 'Bb3', fingering: horn(false, true,  false, false) },
  { concertPitch: 'E3',  writtenPitch: 'B3',  fingering: horn(false, true,  true,  true)  },
  { concertPitch: 'F3',  writtenPitch: 'C4',  fingering: horn(false, false, false, false) },
  { concertPitch: 'Gb3', writtenPitch: 'Db4', fingering: horn(false, false, true,  true)  },
  { concertPitch: 'G3',  writtenPitch: 'D4',  fingering: horn(false, true,  true,  false) },
  { concertPitch: 'Ab3', writtenPitch: 'Eb4', fingering: horn(false, false, true,  true)  },
  { concertPitch: 'A3',  writtenPitch: 'E4',  fingering: horn(false, true,  true,  false) },
  { concertPitch: 'Bb3', writtenPitch: 'F4',  fingering: horn(true,  false, false, false) },
  { concertPitch: 'B3',  writtenPitch: 'F#4', fingering: horn(false, true,  false, false) },
  { concertPitch: 'C4',  writtenPitch: 'G4',  fingering: horn(false, false, false, false) },
  { concertPitch: 'Db4', writtenPitch: 'Ab4', fingering: horn(false, true,  true,  true)  },
  { concertPitch: 'D4',  writtenPitch: 'A4',  fingering: horn(false, true,  true,  false) },
  { concertPitch: 'Eb4', writtenPitch: 'Bb4', fingering: horn(false, false, true,  true),  altFingering: horn(true, false, true, false) },
  { concertPitch: 'E4',  writtenPitch: 'B4',  fingering: horn(false, true,  true,  true),  altFingering: horn(true, false, false, true) },
  { concertPitch: 'F4',  writtenPitch: 'C5',  fingering: horn(false, false, false, false) },
  { concertPitch: 'Gb4', writtenPitch: 'Db5', fingering: horn(false, false, true,  true)  },
  { concertPitch: 'G4',  writtenPitch: 'D5',  fingering: horn(false, true,  true,  false) },
  { concertPitch: 'Ab4', writtenPitch: 'Eb5', fingering: horn(false, false, true,  true)  },
  { concertPitch: 'A4',  writtenPitch: 'E5',  fingering: horn(false, true,  false, false) },
  { concertPitch: 'Bb4', writtenPitch: 'F5',  fingering: horn(true,  false, false, false) },
  { concertPitch: 'B4',  writtenPitch: 'F#5', fingering: horn(false, false, true,  false) },
  { concertPitch: 'C5',  writtenPitch: 'G5',  fingering: horn(false, false, false, false) },
  { concertPitch: 'Db5', writtenPitch: 'Ab5', fingering: horn(false, true,  true,  true)  },
  { concertPitch: 'D5',  writtenPitch: 'A5',  fingering: horn(false, true,  true,  false) },
  { concertPitch: 'Eb5', writtenPitch: 'Bb5', fingering: horn(true,  false, true,  false) },
  { concertPitch: 'E5',  writtenPitch: 'B5',  fingering: horn(true,  false, false, true)  },
  { concertPitch: 'F5',  writtenPitch: 'C6',  fingering: horn(true,  false, false, false) },
];

// ── Trombone fingerings ────────────────────────────────────────────────────────
// Concert pitch (no transposition), bass clef

const TROMBONE_FINGERINGS: FingeringEntry[] = [
  { concertPitch: 'Bb2', writtenPitch: 'Bb2', fingering: pos(1) },
  { concertPitch: 'B2',  writtenPitch: 'B2',  fingering: pos(7) },
  { concertPitch: 'C3',  writtenPitch: 'C3',  fingering: pos(6) },
  { concertPitch: 'Db3', writtenPitch: 'Db3', fingering: pos(5) },
  { concertPitch: 'D3',  writtenPitch: 'D3',  fingering: pos(4) },
  { concertPitch: 'Eb3', writtenPitch: 'Eb3', fingering: pos(3) },
  { concertPitch: 'E3',  writtenPitch: 'E3',  fingering: pos(2) },
  { concertPitch: 'F3',  writtenPitch: 'F3',  fingering: pos(1) },
  { concertPitch: 'Gb3', writtenPitch: 'Gb3', fingering: pos(6, true), altFingering: pos(7) },
  { concertPitch: 'G3',  writtenPitch: 'G3',  fingering: pos(5), altFingering: pos(4, true) },
  { concertPitch: 'Ab3', writtenPitch: 'Ab3', fingering: pos(4), altFingering: pos(3, true) },
  { concertPitch: 'A3',  writtenPitch: 'A3',  fingering: pos(3), altFingering: pos(2, true) },
  { concertPitch: 'Bb3', writtenPitch: 'Bb3', fingering: pos(2), altFingering: pos(1, true) },
  { concertPitch: 'B3',  writtenPitch: 'B3',  fingering: pos(1) },
  { concertPitch: 'C4',  writtenPitch: 'C4',  fingering: pos(6) },
  { concertPitch: 'Db4', writtenPitch: 'Db4', fingering: pos(5) },
  { concertPitch: 'D4',  writtenPitch: 'D4',  fingering: pos(4) },
  { concertPitch: 'Eb4', writtenPitch: 'Eb4', fingering: pos(3) },
  { concertPitch: 'E4',  writtenPitch: 'E4',  fingering: pos(2) },
  { concertPitch: 'F4',  writtenPitch: 'F4',  fingering: pos(1) },
  { concertPitch: 'Gb4', writtenPitch: 'Gb4', fingering: pos(6, true), altFingering: pos(7) },
  { concertPitch: 'G4',  writtenPitch: 'G4',  fingering: pos(5), altFingering: pos(4, true) },
  { concertPitch: 'Ab4', writtenPitch: 'Ab4', fingering: pos(4), altFingering: pos(3, true) },
  { concertPitch: 'A4',  writtenPitch: 'A4',  fingering: pos(3), altFingering: pos(2, true) },
  { concertPitch: 'Bb4', writtenPitch: 'Bb4', fingering: pos(2), altFingering: pos(1, true) },
  { concertPitch: 'B4',  writtenPitch: 'B4',  fingering: pos(1) },
  { concertPitch: 'C5',  writtenPitch: 'C5',  fingering: pos(6) },
  { concertPitch: 'Db5', writtenPitch: 'Db5', fingering: pos(5) },
  { concertPitch: 'D5',  writtenPitch: 'D5',  fingering: pos(4) },
  { concertPitch: 'Eb5', writtenPitch: 'Eb5', fingering: pos(3) },
  { concertPitch: 'E5',  writtenPitch: 'E5',  fingering: pos(2) },
  { concertPitch: 'F5',  writtenPitch: 'F5',  fingering: pos(1) },
];

// ── Euphonium fingerings ───────────────────────────────────────────────────────
// Bb instrument, treble clef (school band convention); written = concert + 2

const EUPHONIUM_FINGERINGS: FingeringEntry[] = [
  { concertPitch: 'Bb1', writtenPitch: 'C3',  fingering: euph(true,  true,  true)  },
  { concertPitch: 'B1',  writtenPitch: 'Db3', fingering: euph(true,  false, true)  },
  { concertPitch: 'C2',  writtenPitch: 'D3',  fingering: euph(true,  true,  false) },
  { concertPitch: 'Db2', writtenPitch: 'Eb3', fingering: euph(false, true,  true)  },
  { concertPitch: 'D2',  writtenPitch: 'E3',  fingering: euph(true,  false, false) },
  { concertPitch: 'Eb2', writtenPitch: 'F3',  fingering: euph(false, true,  false) },
  { concertPitch: 'E2',  writtenPitch: 'F#3', fingering: euph(false, false, true)  },
  { concertPitch: 'F2',  writtenPitch: 'G3',  fingering: euph(false, false, false) },
  { concertPitch: 'Gb2', writtenPitch: 'Ab3', fingering: euph(false, true,  true)  },
  { concertPitch: 'G2',  writtenPitch: 'A3',  fingering: euph(true,  false, false) },
  { concertPitch: 'Ab2', writtenPitch: 'Bb3', fingering: euph(false, true,  false) },
  { concertPitch: 'A2',  writtenPitch: 'B3',  fingering: euph(false, false, true)  },
  { concertPitch: 'Bb2', writtenPitch: 'C4',  fingering: euph(false, false, false) },
  { concertPitch: 'B2',  writtenPitch: 'Db4', fingering: euph(true,  true,  true)  },
  { concertPitch: 'C3',  writtenPitch: 'D4',  fingering: euph(true,  false, true)  },
  { concertPitch: 'Db3', writtenPitch: 'Eb4', fingering: euph(false, true,  true)  },
  { concertPitch: 'D3',  writtenPitch: 'E4',  fingering: euph(true,  false, false) },
  { concertPitch: 'Eb3', writtenPitch: 'F4',  fingering: euph(false, true,  false) },
  { concertPitch: 'E3',  writtenPitch: 'F#4', fingering: euph(false, false, true)  },
  { concertPitch: 'F3',  writtenPitch: 'G4',  fingering: euph(false, false, false) },
  { concertPitch: 'Gb3', writtenPitch: 'Ab4', fingering: euph(false, true,  true)  },
  { concertPitch: 'G3',  writtenPitch: 'A4',  fingering: euph(true,  false, false) },
  { concertPitch: 'Ab3', writtenPitch: 'Bb4', fingering: euph(false, true,  false) },
  { concertPitch: 'A3',  writtenPitch: 'B4',  fingering: euph(false, false, true)  },
  { concertPitch: 'Bb3', writtenPitch: 'C5',  fingering: euph(false, false, false) },
  { concertPitch: 'B3',  writtenPitch: 'Db5', fingering: euph(true,  true,  true)  },
  { concertPitch: 'C4',  writtenPitch: 'D5',  fingering: euph(true,  false, true)  },
  { concertPitch: 'Db4', writtenPitch: 'Eb5', fingering: euph(false, true,  true)  },
  { concertPitch: 'D4',  writtenPitch: 'E5',  fingering: euph(true,  false, false) },
  { concertPitch: 'Eb4', writtenPitch: 'F5',  fingering: euph(false, true,  false) },
  { concertPitch: 'E4',  writtenPitch: 'F#5', fingering: euph(false, false, true)  },
  { concertPitch: 'F4',  writtenPitch: 'G5',  fingering: euph(false, false, false) },
  { concertPitch: 'Gb4', writtenPitch: 'Ab5', fingering: euph(false, true,  true)  },
  { concertPitch: 'G4',  writtenPitch: 'A5',  fingering: euph(true,  false, false) },
  { concertPitch: 'Ab4', writtenPitch: 'Bb5', fingering: euph(false, true,  false) },
];

// ── Tuba fingerings ────────────────────────────────────────────────────────────
// Bb tuba (school treble clef convention): written = concert + 2 semitones
// Tuba typically has 3 (or 4) piston or rotary valves; we use ValveFingering

const TUBA_FINGERINGS: FingeringEntry[] = [
  { concertPitch: 'Bb1', writtenPitch: 'C3',  fingering: euph(false, false, false) },
  { concertPitch: 'B1',  writtenPitch: 'Db3', fingering: euph(false, false, true)  },
  { concertPitch: 'C2',  writtenPitch: 'D3',  fingering: euph(false, true,  false) },
  { concertPitch: 'Db2', writtenPitch: 'Eb3', fingering: euph(true,  false, false) },
  { concertPitch: 'D2',  writtenPitch: 'E3',  fingering: euph(false, true,  true)  },
  { concertPitch: 'Eb2', writtenPitch: 'F3',  fingering: euph(true,  false, true)  },
  { concertPitch: 'E2',  writtenPitch: 'F#3', fingering: euph(true,  true,  false) },
  { concertPitch: 'F2',  writtenPitch: 'G3',  fingering: euph(true,  true,  true)  },
  { concertPitch: 'Gb2', writtenPitch: 'Ab3', fingering: euph(false, false, false) },
  { concertPitch: 'G2',  writtenPitch: 'A3',  fingering: euph(false, false, true)  },
  { concertPitch: 'Ab2', writtenPitch: 'Bb3', fingering: euph(false, true,  false) },
  { concertPitch: 'A2',  writtenPitch: 'B3',  fingering: euph(true,  false, false) },
  { concertPitch: 'Bb2', writtenPitch: 'C4',  fingering: euph(false, false, false) },
  { concertPitch: 'B2',  writtenPitch: 'Db4', fingering: euph(false, false, true)  },
  { concertPitch: 'C3',  writtenPitch: 'D4',  fingering: euph(false, true,  false) },
  { concertPitch: 'Db3', writtenPitch: 'Eb4', fingering: euph(true,  false, false) },
  { concertPitch: 'D3',  writtenPitch: 'E4',  fingering: euph(false, true,  true)  },
  { concertPitch: 'Eb3', writtenPitch: 'F4',  fingering: euph(true,  false, true)  },
  { concertPitch: 'E3',  writtenPitch: 'F#4', fingering: euph(true,  true,  false) },
  { concertPitch: 'F3',  writtenPitch: 'G4',  fingering: euph(true,  true,  true)  },
  { concertPitch: 'Gb3', writtenPitch: 'Ab4', fingering: euph(false, false, false) },
  { concertPitch: 'G3',  writtenPitch: 'A4',  fingering: euph(false, false, true)  },
  { concertPitch: 'Ab3', writtenPitch: 'Bb4', fingering: euph(false, true,  false) },
  { concertPitch: 'A3',  writtenPitch: 'B4',  fingering: euph(true,  false, false) },
  { concertPitch: 'Bb3', writtenPitch: 'C5',  fingering: euph(false, false, false) },
  { concertPitch: 'B3',  writtenPitch: 'Db5', fingering: euph(false, false, true)  },
  { concertPitch: 'C4',  writtenPitch: 'D5',  fingering: euph(false, true,  false) },
  { concertPitch: 'Db4', writtenPitch: 'Eb5', fingering: euph(true,  false, false) },
  { concertPitch: 'D4',  writtenPitch: 'E5',  fingering: euph(false, true,  true)  },
  { concertPitch: 'Eb4', writtenPitch: 'F5',  fingering: euph(true,  false, true)  },
  { concertPitch: 'E4',  writtenPitch: 'F#5', fingering: euph(true,  true,  false) },
  { concertPitch: 'F4',  writtenPitch: 'G5',  fingering: euph(true,  true,  true)  },
  { concertPitch: 'Gb4', writtenPitch: 'Ab5', fingering: euph(false, false, false) },
  { concertPitch: 'G4',  writtenPitch: 'A5',  fingering: euph(false, false, true)  },
  { concertPitch: 'Ab4', writtenPitch: 'Bb5', fingering: euph(false, true,  false) },
];

// ── Main export ────────────────────────────────────────────────────────────────

export const FINGERINGS: Record<InstrumentKey, FingeringEntry[]> = {
  flute:     FLUTE_FINGERINGS,
  clarinet:  CLARINET_FINGERINGS,
  alto_sax:  ALTO_SAX_FINGERINGS,
  trumpet:   TRUMPET_FINGERINGS,
  horn:      HORN_FINGERINGS,
  trombone:  TROMBONE_FINGERINGS,
  euphonium: EUPHONIUM_FINGERINGS,
  tuba:      TUBA_FINGERINGS,
};
