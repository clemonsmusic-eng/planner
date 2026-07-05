import type { Character, InstrumentId } from '../types/game';

// ── The Classmates ──────────────────────────────────────────────────────────────
// Student companions who join the hero's band as the class advances through the
// Academy. One per instrument (the hero covers their own). Names are quiet nods
// to real players for the Hall of Fame (Goodman, Davis, Dorsey, Krupa, Sims, …).
//
// Recruitment is STAGGERED within each zone: every student has a moment —
// zone entry, a mid-zone milestone (recruitProgress = N completed challenges in
// that zone), or a specific story beat (recruitKey). The recruitment scene plays
// when the moment arrives; only then does the student become pickable.
//
// Each student has two scene texts:
// - joinScene: why they join the hero's band
// - farewellScene: the variant when the HERO plays the same instrument — they
//   follow the same story, then choose their own path and wish you well. (This
//   is also why they never appear as a pickable party member for that hero.)

export interface StudentDef {
  id: string;
  name: string;
  instrument: InstrumentId;
  recruitZone: number;        // the zone their story happens in
  recruitKey?: string;        // requires this completedChallenges key
  recruitProgress?: number;   // requires ≥N completed `z<zone>_…` challenges
  blurb: string;
  joinScene: string;
  farewellScene: string;
}

// Non-recruiting story cameos: brief encounters that seed a character before
// their real recruitment beat (e.g. Gene, met twice before he buys in).
export interface CameoDef {
  id: string;                 // unique; persisted as cameo_<id>
  zone: number;
  key?: string;
  progress?: number;
  emoji: string;
  title: string;
  text: string;
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
    recruitKey: 'z2_mini_boss_defeated',
    blurb: 'Quiet and bookish; always carries three spare reeds.',
    joinScene: "After the Interval Imp scatters, Reed emerges from behind the theory shelves where he's been watching the whole fight, three spare reeds tucked behind one ear. \"A tritone sprite in the classroom, and a humming page in the stacks. Someone here should read the old clefs.\" He closes his book. \"You find things — I'll tell you what they mean.\" Reed joins the band!",
    farewellScene: "After the Interval Imp scatters, Reed emerges from behind the theory shelves where he's been watching the whole fight, three spare reeds tucked behind one ear. \"Another bassoon in the class,\" he says, almost smiling. \"Then the low reeds are in good hands — and the archive needs a keeper more than the stage needs two of us.\" Reed wishes you well and goes his own way.",
  },
  // ── Zone 3 — The City of Concerta ──
  {
    id: 'tommy', name: 'Tommy', instrument: 'trombone', recruitZone: 3,
    recruitProgress: 3,
    blurb: 'Big slide, bigger heart.',
    joinScene: "Three events into the Invitational, Tommy is still carrying the Academy banner everywhere — pole in one hand, trombone in the other. \"Somebody has to hold the section together AND the flag,\" he beams. \"You're clearly going for the trophy. Room for one more?\" Tommy joins the band!",
    farewellScene: "Three events into the Invitational, Tommy is still carrying the Academy banner everywhere — pole in one hand, trombone in the other. \"A slide like yours doesn't need a second one crowding it,\" he beams. \"I'll captain the pep band — and keep carrying the banner while I'm at it.\" Tommy wishes you well and goes his own way.",
  },
  {
    id: 'benny', name: 'Benny', instrument: 'clarinet', recruitZone: 3,
    recruitKey: 'z3_semifinal_won',
    blurb: 'Fast fingers, faster jokes.',
    joinScene: "Benny finds you the moment you step off the semifinal stage. \"Your sound! I nearly dropped my clarinet. Piano Preparatory never stood a chance. Take me to the final — I'm fast, you're solid, nobody will keep up with us.\" Benny joins the band!",
    farewellScene: "Benny finds you the moment you step off the semifinal stage. \"Your sound! I nearly dropped my— wait. You play MY part.\" He laughs. \"One clarinet section, one captain — it's yours. I'm taking first chair in the second band and building my own crew. See you at contest season.\" Benny wishes you well and goes his own way.",
  },
  {
    id: 'miles', name: 'Miles', instrument: 'trumpet', recruitZone: 3,
    recruitKey: 'z3_contest_won',
    blurb: 'Cool under pressure; plays louder than he talks.',
    joinScene: "Miles watched the final from the wings without a word, all the way to the trophy. Afterward he just nods. \"You don't rush. Not even with the whole crowd listening. Need a lead trumpet who shows up?\" It's the longest speech anyone at the Academy has heard from him. Miles joins the band!",
    farewellScene: "Miles watched the final from the wings without a word, all the way to the trophy. Afterward he just nods. \"You don't rush. I like that. But two leads fight over the melody — it's yours.\" He taps his bell against yours, the quietest handshake in Symphonica, and heads off to anchor the second band's section. Miles wishes you well and goes his own way.",
  },
  {
    id: 'gene', name: 'Gene', instrument: 'percussion', recruitZone: 3,
    recruitKey: 'z3_contest_won',
    blurb: 'Second-generation drummer, finally playing for himself.',
    joinScene: "When the trophy goes up and the whole crowd starts singing your final piece back at you, you spot Gene at the edge of the square — sticks still, for once, just listening. \"I always thought it was just hitting things,\" he says at last. \"Dad's thing. A grade. But that—\" he nods at the crowd, still humming, \"—that was a hundred people breathing together. I want in. For real this time.\" Gene joins the band!",
    farewellScene: "When the trophy goes up and the whole crowd starts singing your final piece back at you, you spot Gene at the edge of the square — sticks still, for once, just listening. \"I always thought it was just hitting things,\" he says at last. \"Dad's thing. A grade. But that was a hundred people breathing together — and you already speak drum better than I ever cared to.\" He pockets his sticks, thoughtful. \"I'm going home to ask my dad to actually teach me. From the top. Like I mean it.\" Gene wishes you well and goes his own way.",
  },
  // ── Zone 4 — The Grand Auditorium ──
  {
    id: 'otto', name: 'Otto', instrument: 'tuba', recruitZone: 4,
    blurb: 'Moves slowly, hits like a landslide.',
    joinScene: "Backstage at the Grand Auditorium, Otto is single-handedly moving the risers nobody else can lift, his tuba parked beside him like a monument. \"Foundations first,\" he says simply. \"Sections. Buildings. Bands. I'll hold yours up.\" Otto joins the band!",
    farewellScene: "Backstage at the Grand Auditorium, Otto is single-handedly moving the risers nobody else can lift, his tuba parked beside him like a monument. \"Your low end is already anchored,\" he says, unbothered. \"Maestro Barenboimi needs a stage captain for graduation, and I lift things. It's destiny.\" Otto wishes you well and goes his own way.",
  },
  {
    id: 'zoot', name: 'Zoot', instrument: 'alto_sax', recruitZone: 4,
    recruitProgress: 2,
    blurb: 'Improvises answers to questions nobody asked.',
    joinScene: "Two rehearsals into graduation prep, Zoot gets caught sneaking a blues lick into the warm-up chorale — again — and winks at you on his way out of detention. \"They can't ban swing forever. Want a sax that can improvise when it counts?\" Zoot joins the band!",
    farewellScene: "Two rehearsals into graduation prep, Zoot gets caught sneaking a blues lick into the warm-up chorale — again — and winks at you on his way out of detention. \"Ah — you've got the alto book,\" he says, mock-tragic. \"Then I'm starting a jazz combo in the practice rooms. First rehearsal is whenever the faculty stops noticing.\" Zoot wishes you well and goes his own way.",
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
    recruitKey: 'z5_flaura_freed',
    blurb: "Waldhorn's star pupil. Hears the echo before the call.",
    joinScene: "The night after Maestra Flaura is freed, a horn call drifts down from the hills — searching, hopeful. Cora walks into the firelight with her horn still raised. \"I was Maestro Waldhorn's student. Since the Shattering I've been calling into the valleys, waiting for his horn to answer — and every echo came back wrong. Tonight, when the Wraith fell silent, an echo came back TRUE. The first one. It led me here.\" She lowers the horn. \"Take me west. If my teacher is out there, I'll hear him long before anyone sees him.\" Cora joins the band!",
    farewellScene: "The night after Maestra Flaura is freed, a horn call drifts down from the hills — searching, hopeful. Cora walks into the firelight with her horn still raised. \"I was Maestro Waldhorn's student. Since the Shattering I've been calling into the valleys, waiting for his horn to answer — and tonight, when the Wraith fell silent, an echo finally came back TRUE.\" She studies you, and the horn on your back. \"You studied under him too. You carry the same call — he doesn't need two of us searching. Then I'll stand the ridge above Legato: the meadows can't hear the corruption coming, but I can. Bring our teacher home.\" Cora wishes you well and goes her own way.",
  },
];

export const STUDENT_BY_ID: Record<string, StudentDef> =
  Object.fromEntries(STUDENTS.map((s) => [s.id, s]));

export const CAMEOS: CameoDef[] = [
  {
    id: 'gene_hall', zone: 2, progress: 2,
    emoji: '🥁', title: 'In Passing',
    text: "Between classes you pass a kid drumming a lazy paradiddle on the radiator pipes — perfectly in time, completely bored. \"Gene,\" he offers, when you nod at the rhythm. \"Dad's a drummer, so I'm a drummer. His idea, not mine. I just like hitting things.\" He wanders off before the phrase resolves.",
  },
  {
    id: 'gene_contest', zone: 3, progress: 3,
    emoji: '🥁', title: 'In Passing',
    text: "Gene turns up at the Invitational behind the Academy drum kit — his father's name engraved on the rim. He plays every note right and never once looks up. \"Dad entered me,\" he shrugs between rounds. \"Hit thing, get grade, keep him happy.\" And yet, somewhere under all that boredom, his foot never stops keeping your warm-up in time.",
  },
];

export const metKey = (studentId: string) => `met_${studentId}`;
export const cameoKey = (cameoId: string) => `cameo_${cameoId}`;

// Shared moment predicate: has this zone-anchored beat's trigger arrived?
function momentDue(zone: number, key: string | undefined, progress: number | undefined, character: Character): boolean {
  if (character.currentZone < zone) return false;
  // Past the zone entirely → due regardless (catch-up for skipped beats).
  if (character.currentZone > zone) return true;
  if (key && !character.completedChallenges.includes(key)) return false;
  if (progress) {
    const prefix = `z${zone}_`;
    const done = character.completedChallenges.filter((k) => k.startsWith(prefix)).length;
    if (done < progress) return false;
  }
  return true;
}

// The student's recruitment moment has arrived (scene may not have played yet).
export function recruitmentDue(s: StudentDef, character: Character): boolean {
  return momentDue(s.recruitZone, s.recruitKey, s.recruitProgress, character);
}

export function cameoDue(c: CameoDef, character: Character): boolean {
  return momentDue(c.zone, c.key, c.progress, character);
}

export function hasSeenCameo(c: CameoDef, character: Character): boolean {
  return character.completedChallenges.includes(cameoKey(c.id));
}

// Met = the recruitment scene has played; only then are they pickable.
export function hasMet(s: StudentDef, character: Character): boolean {
  return character.completedChallenges.includes(metKey(s.id));
}
