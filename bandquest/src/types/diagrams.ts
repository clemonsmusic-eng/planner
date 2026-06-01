export type Duration = 'w' | 'h' | 'q' | 'e';

export interface StaffNoteSpec {
  pitch: string;        // "C4", "F#5", "Bb3" — letter, optional accidental, octave
  dur: Duration;
  forceAcc?: 'sharp' | 'flat' | 'natural'; // override displayed accidental
  label?: string;       // small label below note (scale degree, "W", "H", etc.)
  chord?: boolean;      // when true, render at same x as previous note (chord stacking)
}

export interface StaffDiagram {
  type: 'staff';
  clef?: 'treble' | 'bass';
  notes: StaffNoteSpec[];
  timeSig?: [number, number];
  label?: string;
}

export interface KeySigDiagram {
  type: 'keysig';
  clef?: 'treble' | 'bass';
  count: number;       // positive = sharps, negative = flats
  keyName?: string;
  label?: string;
}

export interface KeyboardDiagram {
  type: 'keyboard';
  highlights: { pitch: string; color?: string; label?: string }[];
  label?: string;
}

export interface DurationsDiagram {
  type: 'durations';
  label?: string;
}

export interface ScalePatternDiagram {
  type: 'scale_pattern';
  steps: ('W' | 'H' | 'A2')[];  // W=whole, H=half, A2=augmented 2nd (3 half steps)
  noteNames?: string[];           // optional note names above boxes
  label?: string;
}

export interface CircleDiagram {
  type: 'circle';
  highlight?: string;  // e.g., "G" to highlight that key
  label?: string;
}

export type DiagramSpec =
  | StaffDiagram
  | KeySigDiagram
  | KeyboardDiagram
  | DurationsDiagram
  | ScalePatternDiagram
  | CircleDiagram;
