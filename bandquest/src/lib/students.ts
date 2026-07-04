import type { InstrumentId } from '../types/game';

// ── The Classmates ──────────────────────────────────────────────────────────────
// Student companions who join the hero's band as the class advances through the
// Academy. One per instrument (the hero covers their own), recruited on a fixed
// zone schedule. Names are quiet nods to real players for the Hall of Fame to
// pick up later (Goodman, Davis, Dorsey, Krupa, Sims, …).

export interface StudentDef {
  id: string;
  name: string;
  instrument: InstrumentId;
  recruitZone: number;   // available once character.currentZone >= recruitZone
  blurb: string;
}

export const STUDENTS: StudentDef[] = [
  // Zone 2 — The Theory Wing
  { id: 'piper', name: 'Piper', instrument: 'flute', recruitZone: 2,
    blurb: 'First-chair energy and zero fear of the high register.' },
  { id: 'reed', name: 'Reed', instrument: 'bassoon', recruitZone: 2,
    blurb: 'Quiet and bookish; always carries three spare reeds.' },
  // Zone 3 — The Town of Crotchet
  { id: 'benny', name: 'Benny', instrument: 'clarinet', recruitZone: 3,
    blurb: 'Fast fingers, faster jokes.' },
  { id: 'miles', name: 'Miles', instrument: 'trumpet', recruitZone: 3,
    blurb: 'Cool under pressure; plays louder than he talks.' },
  { id: 'tommy', name: 'Tommy', instrument: 'trombone', recruitZone: 3,
    blurb: 'Big slide, bigger heart.' },
  { id: 'gene', name: 'Gene', instrument: 'percussion', recruitZone: 3,
    blurb: 'Taps on everything. Everything.' },
  // Zone 4 — The Grand Auditorium
  { id: 'otto', name: 'Otto', instrument: 'tuba', recruitZone: 4,
    blurb: 'Moves slowly, hits like a landslide.' },
  { id: 'zoot', name: 'Zoot', instrument: 'alto_sax', recruitZone: 4,
    blurb: 'Improvises answers to questions nobody asked.' },
  // Zone 5 — Melodious Meadows
  { id: 'obie', name: 'Obie', instrument: 'oboe', recruitZone: 5,
    blurb: 'Gives the tuning A, and knows it.' },
  { id: 'cora', name: 'Cora', instrument: 'french_horn', recruitZone: 5,
    blurb: 'Hears the echo before the call.' },
];

export const STUDENT_BY_ID: Record<string, StudentDef> =
  Object.fromEntries(STUDENTS.map((s) => [s.id, s]));

export function recruitedStudents(currentZone: number): StudentDef[] {
  return STUDENTS.filter((s) => currentZone >= s.recruitZone);
}
