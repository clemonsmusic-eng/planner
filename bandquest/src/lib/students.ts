import type { InstrumentId } from '../types/game';

// ── The Classmates ──────────────────────────────────────────────────────────────
// Student companions who join the hero's band as the class advances through the
// Academy. One per instrument (the hero covers their own), recruited on a fixed
// zone schedule. Names are quiet nods to real players for the Hall of Fame to
// pick up later (Goodman, Davis, Dorsey, Krupa, Sims, …).
//
// Each student has two recruitment beats:
// - joinScene: why they join the hero's band (played on first visit to their zone)
// - farewellScene: the variant when the HERO plays the same instrument — they
//   follow the same story, then choose their own path and wish you well. (This
//   is also why they never appear as a pickable party member for that hero.)

export interface StudentDef {
  id: string;
  name: string;
  instrument: InstrumentId;
  recruitZone: number;   // available once character.currentZone >= recruitZone
  blurb: string;
  joinScene: string;
  farewellScene: string;
}

export const STUDENTS: StudentDef[] = [
  // ── Zone 2 — The Theory Wing ──
  {
    id: 'piper', name: 'Piper', instrument: 'flute', recruitZone: 2,
    blurb: 'First-chair energy and zero fear of the high register.',
    joinScene: "You find Piper in the recital hall long after hours, chasing a high run she refuses to lose. She lowers her flute when she sees you. \"Duets beat solos,\" she says. \"Practice with me and I'll watch your back — deal?\" Piper joins the band!",
    farewellScene: "You find Piper in the recital hall long after hours, chasing a high run she refuses to lose. She lowers her flute when she sees you — and laughs. \"Two flutes, one chair. You've clearly got ours covered.\" She shoulders her case. \"The Chamber Winds asked me to lead their section. Go be great — I'll be listening.\" Piper wishes you well and goes her own way.",
  },
  {
    id: 'reed', name: 'Reed', instrument: 'bassoon', recruitZone: 2,
    blurb: 'Quiet and bookish; always carries three spare reeds.',
    joinScene: "Reed is buried in the library stacks, three spare reeds tucked behind one ear, cross-referencing the humming page you found. \"Nobody else in this class reads the old clefs,\" he says without looking up. \"Stick with me. You find things — I'll tell you what they mean.\" Reed joins the band!",
    farewellScene: "Reed is buried in the library stacks, three spare reeds tucked behind one ear, cross-referencing the humming page you found. \"Another bassoon in the class,\" he says, almost smiling. \"Then the low reeds are in good hands — and the archive needs a keeper more than the stage needs two of us.\" Reed wishes you well and goes his own way.",
  },
  // ── Zone 3 — The Town of Crotchet ──
  {
    id: 'benny', name: 'Benny', instrument: 'clarinet', recruitZone: 3,
    blurb: 'Fast fingers, faster jokes.',
    joinScene: "Benny finds you at the staging tent, still buzzing from the Invitational brackets. \"Your sound! I nearly dropped my clarinet. Play with me — I'm fast, you're solid, nobody will keep up with us.\" Benny joins the band!",
    farewellScene: "Benny finds you at the staging tent, still buzzing from the Invitational brackets. \"Your sound! I nearly dropped my— wait. You play MY part.\" He laughs. \"One clarinet section, one captain — it's yours. I'm taking first chair in the second band and building my own crew. See you at contest season.\" Benny wishes you well and goes his own way.",
  },
  {
    id: 'miles', name: 'Miles', instrument: 'trumpet', recruitZone: 3,
    blurb: 'Cool under pressure; plays louder than he talks.',
    joinScene: "Miles watched your whole set from the wings without a word. Afterward he just nods. \"You don't rush. I like that. Need a lead trumpet who shows up?\" It's the longest speech anyone at the Academy has heard from him. Miles joins the band!",
    farewellScene: "Miles watched your whole set from the wings without a word. Afterward he just nods. \"You don't rush. I like that. But two leads fight over the melody — it's yours.\" He taps his bell against yours, the quietest handshake in Symphonica, and heads off to anchor the second band's section. Miles wishes you well and goes his own way.",
  },
  {
    id: 'tommy', name: 'Tommy', instrument: 'trombone', recruitZone: 3,
    blurb: 'Big slide, bigger heart.',
    joinScene: "Tommy carried the Academy banner through the entire Invitational — pole in one hand, trombone in the other. \"Somebody has to hold the section together AND the flag,\" he beams. \"I can do both. Room for one more?\" Tommy joins the band!",
    farewellScene: "Tommy carried the Academy banner through the entire Invitational — pole in one hand, trombone in the other. \"A slide like yours doesn't need a second one crowding it,\" he beams. \"I'll captain the pep band — and keep carrying the banner while I'm at it.\" Tommy wishes you well and goes his own way.",
  },
  {
    id: 'gene', name: 'Gene', instrument: 'percussion', recruitZone: 3,
    blurb: 'Taps on everything. Everything.',
    joinScene: "You find Gene drumming a groove on the staging-tent poles, a food cart, and one extremely patient judge's table. \"Everything's a drum if you're brave enough,\" he says. \"Does your band have a pulse yet? It does now.\" Gene joins the band!",
    farewellScene: "You find Gene drumming a groove on the staging-tent poles, a food cart, and one extremely patient judge's table. \"You've already got the pulse covered,\" he admits, handing you one of his sticks like a medal. \"Drumline elected me captain anyway. Keep the tempo honest.\" Gene wishes you well and goes his own way.",
  },
  // ── Zone 4 — The Grand Auditorium ──
  {
    id: 'otto', name: 'Otto', instrument: 'tuba', recruitZone: 4,
    blurb: 'Moves slowly, hits like a landslide.',
    joinScene: "Backstage, Otto is single-handedly moving the risers nobody else can lift, his tuba parked beside him like a monument. \"Foundations first,\" he says simply. \"Sections. Buildings. Bands. I'll hold yours up.\" Otto joins the band!",
    farewellScene: "Backstage, Otto is single-handedly moving the risers nobody else can lift, his tuba parked beside him like a monument. \"Your low end is already anchored,\" he says, unbothered. \"Maestro Barenboimi needs a stage captain for graduation, and I lift things. It's destiny.\" Otto wishes you well and goes his own way.",
  },
  {
    id: 'zoot', name: 'Zoot', instrument: 'alto_sax', recruitZone: 4,
    blurb: 'Improvises answers to questions nobody asked.',
    joinScene: "Zoot gets caught sneaking a blues lick into the warm-up chorale for the third time this week, and winks at you on his way out of detention. \"They can't ban swing forever. Want a sax that can improvise when it counts?\" Zoot joins the band!",
    farewellScene: "Zoot gets caught sneaking a blues lick into the warm-up chorale for the third time this week, and winks at you on his way out of detention. \"Ah — you've got the alto book,\" he says, mock-tragic. \"Then I'm starting a jazz combo in the practice rooms. First rehearsal is whenever the faculty stops noticing.\" Zoot wishes you well and goes his own way.",
  },
  // ── Zone 5 — Melodious Meadows ──
  {
    id: 'obie', name: 'Obie', instrument: 'oboe', recruitZone: 5,
    blurb: 'Gives the tuning A, and knows it.',
    joinScene: "Obie catches up to the caravan outside Legato, out of breath, oboe case strapped to a bag of reeds and rations. \"The whole world has gone out of tune and you left without an oboe? Absolutely not. Somebody has to give this expedition its A.\" Obie joins the band!",
    farewellScene: "Obie catches up to the caravan outside Legato, out of breath, oboe case strapped to a bag of reeds and rations. \"You carry the double reed — good. Then Legato needs me more. Their whole town band has gone grey, and someone has to reteach them to tune.\" Obie wishes you well and goes their own way.",
  },
  {
    id: 'cora', name: 'Cora', instrument: 'french_horn', recruitZone: 5,
    blurb: 'Hears the echo before the call.',
    joinScene: "Cora found you by ear. \"I heard the Shattering echo off the hills,\" she says quietly, horn slung across her back. \"Then I heard your band — still in tune, still moving west. I can hear where the corruption runs thin. Take me with you.\" Cora joins the band!",
    farewellScene: "Cora found you by ear. \"I heard the Shattering echo off the hills,\" she says quietly, horn slung across her back. \"You already carry a horn — and mine is needed here. The valley folk can't hear the corruption coming. I can be their early warning.\" She clasps your hand. Cora wishes you well and goes her own way.",
  },
];

export const STUDENT_BY_ID: Record<string, StudentDef> =
  Object.fromEntries(STUDENTS.map((s) => [s.id, s]));

export const metKey = (studentId: string) => `met_${studentId}`;

export function recruitedStudents(currentZone: number): StudentDef[] {
  return STUDENTS.filter((s) => currentZone >= s.recruitZone);
}
