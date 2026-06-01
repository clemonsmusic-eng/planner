import type { DiagramSpec } from '../types/diagrams';

// ── Hall of Fame ──────────────────────────────────────────────────────────────

export interface HallOfFameEntry {
  id: string;
  category: 'faculty' | 'sacred_score' | 'instrument';
  title: string;
  subtitle: string;
  body: string;
  sessionBuff?: {
    description: string;
    type: 'accuracy' | 'technique' | 'power' | 'xp_multiplier' | 'rp_multiplier' | 'vs_enemy_type';
    value: number;
    enemyType?: string;
  };
  unlockedByZone: number;
}

export const HALL_OF_FAME: HallOfFameEntry[] = [
  // ── Faculty ────────────────────────────────────────────────────────────────
  {
    id: 'fennell',
    category: 'faculty',
    title: 'The Architect of Sound',
    subtitle: 'Real name: Frederick Fennell (1914–2004)',
    body: 'Frederick Fennell founded the Eastman Wind Ensemble in 1952, revolutionizing concert band performance by replacing the large military band model with a precise ensemble of one player per part. He championed the idea that wind music deserved the same serious artistic treatment as orchestral music. Fennell recorded extensively for Mercury Records, producing landmark albums that brought wind band literature to mainstream audiences. His philosophy that "the wind band is an orchestra without strings" shaped how educators and conductors approach ensemble playing to this day.',
    sessionBuff: {
      description: '+5 Technique for ensemble challenges',
      type: 'technique',
      value: 5,
    },
    unlockedByZone: 1,
  },
  {
    id: 'frost',
    category: 'faculty',
    title: 'The Voice of the Clarinet',
    subtitle: 'Real name: Martin Fröst (born 1970)',
    body: 'Martin Fröst is a Swedish clarinetist widely regarded as one of the most expressive and versatile performers of his generation. He studied at the Royal College of Music in Stockholm and won the Swedish Music Critics\' Prize multiple times for his recordings. Fröst is known for integrating theatrical movement and dance into his performances, arguing that music must engage the whole body. He has premiered dozens of new works written specifically for him and serves as artistic director of the Vinterfest chamber music festival.',
    unlockedByZone: 2,
  },
  {
    id: 'marsalis',
    category: 'faculty',
    title: 'The Ambassador of Brass',
    subtitle: 'Real name: Wynton Marsalis (born 1961)',
    body: 'Wynton Marsalis is an American trumpeter from New Orleans who became the first jazz musician to win the Pulitzer Prize for Music, awarded in 1997 for his oratorio Blood on the Fields. He holds the rare distinction of winning Grammy Awards in both classical and jazz categories in the same year (1983 and 1984). Marsalis co-founded Jazz at Lincoln Center and has spent decades educating young musicians through lectures, masterclasses, and the Essentially Ellington High School Jazz Band Competition. His technical command of the trumpet — ranging from Baroque literature to bebop — remains a benchmark for aspiring brass players.',
    sessionBuff: {
      description: '+8 Accuracy for one session',
      type: 'accuracy',
      value: 8,
    },
    unlockedByZone: 2,
  },
  {
    id: 'galway',
    category: 'faculty',
    title: 'The Silver Flute',
    subtitle: 'Real name: Sir James Galway (born 1939)',
    body: 'Sir James Galway, born in Belfast, Northern Ireland, is known as "The Man with the Golden Flute" — though he famously plays on a solid gold instrument made by Albert Cooper. He served as principal flutist of the Berlin Philharmonic under Herbert von Karajan before launching a solo career that brought the flute to pop-chart status. Galway has recorded over 30 million albums spanning classical, folk, and crossover repertoire. His precise intonation and singing tone are the result of rigorous ear training and pitch awareness developed from early childhood, making him a model for students studying tone production and tuning.',
    sessionBuff: {
      description: '+10 vs Accidentals (pitch focus)',
      type: 'vs_enemy_type',
      value: 10,
      enemyType: 'Accidental',
    },
    unlockedByZone: 3,
  },
  {
    id: 'adolphe_sax',
    category: 'faculty',
    title: 'The Inventor',
    subtitle: 'Real name: Adolphe Sax (1814–1894)',
    body: 'Adolphe Sax was a Belgian instrument maker who invented the saxophone around 1840 and received a patent for it in Paris in 1846. He designed the instrument to bridge the tonal gap between woodwinds and brass in military bands, producing a sound powerful enough for outdoors yet agile enough for expressive melody. Sax also improved the bass clarinet and developed the saxhorn family of brass instruments. Despite fierce opposition from rival instrument makers — including multiple lawsuits — his saxophone eventually became one of the most versatile instruments in Western music, spanning jazz, classical, and popular genres.',
    unlockedByZone: 3,
  },
  {
    id: 'lindberg',
    category: 'faculty',
    title: 'The Master of Slide',
    subtitle: 'Real name: Christian Lindberg (born 1958)',
    body: 'Christian Lindberg of Sweden is widely considered one of the greatest trombonists of the modern era, having expanded the technical and expressive vocabulary of the instrument far beyond what was previously thought possible. He has premiered more than 200 new works written for him, commissioned from composers including Jan Sandström and Anders Hillborg. Lindberg performs without vibrato on the trombone, using air support and slide technique to achieve remarkable legato phrasing. He later transitioned to conducting and became chief conductor of the Arctic Philharmonic, demonstrating that mastery of one instrument can provide deep insight into orchestral leadership.',
    unlockedByZone: 4,
  },
  {
    id: 'glennie',
    category: 'faculty',
    title: 'The Resonant Soul',
    subtitle: 'Real name: Dame Evelyn Glennie (born 1965)',
    body: 'Dame Evelyn Glennie is a Scottish solo percussionist who has been profoundly deaf since the age of twelve, and yet became one of the world\'s foremost percussion soloists. She taught herself to "hear" music through vibrations felt in her body and feet, developing an approach to rhythm and tone that she describes in her influential essay "Hearing Essay." Glennie has over 100 percussion concertos written for her and has performed at major venues worldwide, including the opening ceremony of the 2012 London Olympics. Her career challenges assumptions about the relationship between hearing and musicianship, and she is a passionate advocate for music education in schools.',
    sessionBuff: {
      description: '+6 Power for rhythm challenges',
      type: 'power',
      value: 6,
    },
    unlockedByZone: 5,
  },
  {
    id: 'persichetti',
    category: 'faculty',
    title: 'The Theorist of the Wind',
    subtitle: 'Real name: Vincent Persichetti (1915–1987)',
    body: 'Vincent Persichetti was an American composer and music theorist on the faculty of the Juilliard School for over 40 years, where he taught theory to generations of influential musicians. His book Twentieth Century Harmony (1961) remains a standard text in graduate music theory programs. Persichetti wrote extensively for wind band, producing works such as the Divertimento for Band and Psalm for Band that are staples of the concert band repertoire. He believed that every performer should understand music theory deeply, arguing that technical skill without theoretical understanding is like speaking a language without knowing its grammar.',
    unlockedByZone: 5,
  },
  {
    id: 'barenboim',
    category: 'faculty',
    title: 'The Bridge Builder',
    subtitle: 'Real name: Daniel Barenboim (born 1942)',
    body: 'Daniel Barenboim is an Argentine-born Israeli-Palestinian conductor and pianist who co-founded the West-Eastern Divan Orchestra with scholar Edward Said in 1999, bringing together young musicians from Israel, Palestine, and Arab countries to perform together. He has served as Music Director of the Orchestre de Paris, the Chicago Symphony Orchestra, and the Berlin State Opera. Barenboim is famous for his interpretations of Beethoven, Bruckner, and Wagner, and for his public advocacy that music can serve as a tool for peace and dialogue. His lecture series at Harvard and Reith Lectures explore the connections between music, politics, and identity.',
    unlockedByZone: 6,
  },

  // ── Sacred Scores ──────────────────────────────────────────────────────────
  {
    id: 'stars_and_stripes',
    category: 'sacred_score',
    title: 'The March of Champions',
    subtitle: 'Real score: "Stars and Stripes Forever" — John Philip Sousa (1896)',
    body: 'Stars and Stripes Forever is the official National March of the United States, designated by an Act of Congress in 1987. John Philip Sousa composed it on Christmas Day 1896 while crossing the Atlantic Ocean, claiming the melody came to him complete in a dream. The march features one of the most recognizable piccolo countermelodies in all of wind band literature, entering in the third strain and soaring above the full ensemble. Sousa led his own touring band for 40 years and composed 136 marches in total, earning him the title "The March King."',
    sessionBuff: {
      description: '+5 Technique for march-style challenges',
      type: 'technique',
      value: 5,
    },
    unlockedByZone: 1,
  },
  {
    id: 'first_suite',
    category: 'sacred_score',
    title: 'The Suite of Earth and Sky',
    subtitle: 'Real score: "First Suite in E-flat for Military Band" — Gustav Holst (1909)',
    body: 'Gustav Holst\'s First Suite in E-flat for Military Band, composed in 1909, is one of the first major original works written for concert band by a serious classical composer — not an arrangement, but conceived entirely for winds. Its three movements (Chaconne, Intermezzo, and March) all share thematic material derived from the opening chaconne bass line, creating a rare structural unity for the medium. The suite was not published until 1921 and was first performed by the British military band system it was written for. It remains one of the most frequently programmed works in the concert band repertoire and appears on UIL and WSMA prescribed music lists at Grade IV difficulty.',
    sessionBuff: {
      description: '+8 Accuracy on Sacred Score performances',
      type: 'accuracy',
      value: 8,
    },
    unlockedByZone: 4,
  },
  {
    id: 'lincolnshire_posy',
    category: 'sacred_score',
    title: 'The Songs of the People',
    subtitle: 'Real score: "Lincolnshire Posy" — Percy Grainger (1937)',
    body: 'Percy Grainger\'s Lincolnshire Posy is a suite of six movements based on folk songs collected from Lincolnshire, England, transcribed by Grainger himself during fieldwork trips in 1905–1906. Grainger was meticulous in preserving the irregular rhythms and ornaments of the original folk singers, which makes the piece technically challenging with its frequent meter changes (including 5/4, 7/4, and other asymmetric patterns). He rejected the standard musical vocabulary of his time, inventing his own terminology — "louden lots" for crescendo, "fade away" for decrescendo — to capture the spirit of folk expression. Lincolnshire Posy is consistently ranked among the greatest original compositions for wind band.',
    unlockedByZone: 7,
  },
  {
    id: '. . . and the mountains',
    category: 'sacred_score',
    title: 'The Cry of the Mountains',
    subtitle: 'Real score: ". . . and the mountains rising nowhere" — Joseph Schwantner (1977)',
    body: 'Joseph Schwantner\'s ". . . and the mountains rising nowhere" was commissioned by the Eastman Wind Ensemble and premiered in 1977, winning the Kennedy Center Friedheim Award. The work opens with a pianist playing harmonics on the open strings, creating an ethereal soundscape unlike anything previously heard in wind band music. Schwantner draws on poetry by Carol Adler and creates a sense of vast, elemental landscape through extended instrumental techniques and unusual textures. The piece is significant because it demonstrated that wind band music could achieve the same avant-garde sophistication as orchestral new music, opening the door for future serious contemporary composition for the medium.',
    unlockedByZone: 9,
  },

  // ── Instruments ──────────────────────────────────────────────────────────
  {
    id: 'history_saxophone',
    category: 'instrument',
    title: 'The Saxophone: A New Voice',
    subtitle: 'Invented: Paris, 1840s — Adolphe Sax',
    body: 'The saxophone was patented by Adolphe Sax in Paris on June 28, 1846, making it one of the newest instruments in the standard band and orchestra. Sax designed fourteen different saxophones across two families — one tuned in B-flat and E-flat, intended for military bands, and one in C and F, intended for orchestras. Only the military-band family survived into common use. The instrument\'s conical bore (like an oboe) combined with a single reed mouthpiece (like a clarinet) gives it its distinctive timbre — warm in the lower register, bright and piercing in the upper. The saxophone became central to jazz after the 1920s and has since entered classical, pop, rock, and experimental music.',
    unlockedByZone: 3,
  },
  {
    id: 'history_trombone_sackbut',
    category: 'instrument',
    title: 'The Sackbut: Ancestor of the Trombone',
    subtitle: 'Origins: Europe, mid-15th century',
    body: 'The sackbut is the direct ancestor of the modern trombone, first documented in the mid-1400s in the courts of Burgundy and England. The name comes from the Old French "sacqueboute" meaning "pull-push," a reference to the slide mechanism. Unlike modern trombones, sackbuts had a more cylindrical bore and a narrower bell flare, producing a softer, more blending tone suited to Renaissance vocal music. By the 17th century, sackbuts were standard in church ensembles and appeared in works by Claudio Monteverdi. The modern trombone evolved through the 18th and 19th centuries with a wider bore and larger bell to project in increasingly large concert halls and outdoor performances.',
    unlockedByZone: 4,
  },
  {
    id: 'history_french_horn',
    category: 'instrument',
    title: 'The Forest Horn',
    subtitle: 'Origins: Hunting horns — Europe, 17th century',
    body: 'The French horn descends from the cor de chasse, or hunting horn, used in French aristocratic hunts of the 17th century. Early horns were crook-based — players changed pitch by inserting curved tubes of different lengths — and hand-stopping technique (placing the hand in the bell) was developed in the 18th century by performers including Anton Hampl. The addition of valves in the 1820s allowed for full chromatic playing, but many orchestral players still use hand technique to modify tone color. The modern double horn, combining the F horn and B-flat horn in one instrument with a thumb trigger, was developed by Fritz Kruspe in Erfurt around 1900 and remains the standard professional instrument today.',
    unlockedByZone: 5,
  },
];

// ── Theory Reference ──────────────────────────────────────────────────────────

export interface TheoryEntry {
  id: string;
  section: 'key_signatures' | 'intervals' | 'chords' | 'rhythm' | 'scales' | 'notation';
  title: string;
  content: string;
  diagrams?: DiagramSpec[];
  unlockedByZone: number;
}

export const THEORY_REFERENCE: TheoryEntry[] = [
  // ── Key Signatures ─────────────────────────────────────────────────────────
  {
    id: 'key_sigs_sharps',
    section: 'key_signatures',
    title: 'Sharp Key Signatures',
    content: `**Sharp Keys — Major**

| Sharps | Key  | Sharps Used               |
|--------|------|---------------------------|
| 0      | C    | (none)                    |
| 1      | G    | F#                        |
| 2      | D    | F#, C#                    |
| 3      | A    | F#, C#, G#                |
| 4      | E    | F#, C#, G#, D#            |
| 5      | B    | F#, C#, G#, D#, A#        |
| 6      | F#   | F#, C#, G#, D#, A#, E#    |
| 7      | C#   | F#, C#, G#, D#, A#, E#, B#|

**Tip:** The last sharp is always one half-step below the key name.
**Order of sharps:** F C G D A E B  (Father Charles Goes Down And Ends Battle)`,
    diagrams: [
      { type: 'keysig', count: 1, keyName: 'G major', label: '1 sharp — G major' },
      { type: 'keysig', count: 2, keyName: 'D major', label: '2 sharps — D major' },
      { type: 'keysig', count: 4, keyName: 'E major', label: '4 sharps — E major' },
    ],
    unlockedByZone: 1,
  },
  {
    id: 'key_sigs_flats',
    section: 'key_signatures',
    title: 'Flat Key Signatures',
    content: `**Flat Keys — Major**

| Flats | Key | Flats Used                |
|-------|-----|---------------------------|
| 0     | C   | (none)                    |
| 1     | F   | Bb                        |
| 2     | Bb  | Bb, Eb                    |
| 3     | Eb  | Bb, Eb, Ab                |
| 4     | Ab  | Bb, Eb, Ab, Db            |
| 5     | Db  | Bb, Eb, Ab, Db, Gb        |
| 6     | Gb  | Bb, Eb, Ab, Db, Gb, Cb    |
| 7     | Cb  | Bb, Eb, Ab, Db, Gb, Cb, Fb|

**Tip:** The second-to-last flat names the key (for keys with 2+ flats).
**Order of flats:** B E A D G C F  (Battle Ends And Down Goes Charles's Father)`,
    diagrams: [
      { type: 'keysig', count: -1, keyName: 'F major', label: '1 flat — F major' },
      { type: 'keysig', count: -2, keyName: 'Bb major', label: '2 flats — B♭ major' },
      { type: 'keysig', count: -4, keyName: 'Ab major', label: '4 flats — A♭ major' },
    ],
    unlockedByZone: 1,
  },
  {
    id: 'key_sigs_relative',
    section: 'key_signatures',
    title: 'Relative Minor Keys',
    content: `**Relative Minors**

Every major key shares its key signature with a natural minor key. The relative minor starts on scale degree 6 (a minor third below the major tonic).

| Major Key | Relative Minor |
|-----------|---------------|
| C major   | A minor        |
| G major   | E minor        |
| D major   | B minor        |
| A major   | F# minor       |
| E major   | C# minor       |
| F major   | D minor        |
| Bb major  | G minor        |
| Eb major  | C minor        |
| Ab major  | F minor        |

**Rule:** Count down 3 half-steps from the major tonic to find the relative minor tonic.`,
    diagrams: [
      { type: 'circle', label: 'Circle of Fifths — outer: major keys, inner: relative minors' },
      {
        type: 'staff',
        notes: [
          { pitch: 'A4', dur: 'q', label: '1' },
          { pitch: 'B4', dur: 'q', label: '2' },
          { pitch: 'C5', dur: 'q', label: '3' },
          { pitch: 'D5', dur: 'q', label: '4' },
          { pitch: 'E5', dur: 'q', label: '5' },
          { pitch: 'F5', dur: 'q', label: '6' },
          { pitch: 'G5', dur: 'q', label: '7' },
          { pitch: 'A5', dur: 'h', label: '8' },
        ],
        label: 'A natural minor — same key signature as C major (no sharps/flats)',
      },
    ],
    unlockedByZone: 1,
  },

  // ── Intervals ──────────────────────────────────────────────────────────────
  {
    id: 'intervals_basic',
    section: 'intervals',
    title: 'Basic Intervals (m2 through P8)',
    content: `**Intervals — Half-Steps and Names**

| Interval | Abbrev. | Half-Steps | Example (from C) | Character       |
|----------|---------|-----------|-----------------|-----------------|
| Minor 2nd | m2    | 1         | C – Db          | Dissonant, tense|
| Major 2nd | M2    | 2         | C – D           | Stepwise, mild  |
| Minor 3rd | m3    | 3         | C – Eb          | Sad, dark       |
| Major 3rd | M3    | 4         | C – E           | Bright, happy   |
| Perfect 4th | P4  | 5         | C – F           | Open, stable    |
| Tritone (Aug 4th/Dim 5th) | TT | 6 | C – F#/Gb  | Most dissonant  |
| Perfect 5th | P5  | 7         | C – G           | Open, strong    |
| Minor 6th | m6    | 8         | C – Ab          | Longing         |
| Major 6th | M6    | 9         | C – A           | Warm, open      |
| Minor 7th | m7    | 10        | C – Bb          | Jazzy, bluesy   |
| Major 7th | M7    | 11        | C – B           | Bright tension  |
| Octave    | P8    | 12        | C – C (up)      | Perfect unison  |

**Memory Aid for Perfect intervals:** Perfect 4th = "Here Comes the Bride," Perfect 5th = "Star Wars theme."`,
    diagrams: [
      {
        type: 'staff',
        notes: [
          { pitch: 'C4', dur: 'h', label: 'C' },
          { pitch: 'Db4', dur: 'h', forceAcc: 'flat', label: 'm2' },
          { pitch: 'C4', dur: 'h' },
          { pitch: 'D4', dur: 'h', label: 'M2' },
          { pitch: 'C4', dur: 'h' },
          { pitch: 'Eb4', dur: 'h', forceAcc: 'flat', label: 'm3' },
          { pitch: 'C4', dur: 'h' },
          { pitch: 'E4', dur: 'h', label: 'M3' },
          { pitch: 'C4', dur: 'h' },
          { pitch: 'F4', dur: 'h', label: 'P4' },
          { pitch: 'C4', dur: 'h' },
          { pitch: 'Gb4', dur: 'h', forceAcc: 'flat', label: 'TT' },
          { pitch: 'C4', dur: 'h' },
          { pitch: 'G4', dur: 'h', label: 'P5' },
        ],
        label: 'Intervals from C — each pair shows the interval above C',
      },
    ],
    unlockedByZone: 2,
  },
  {
    id: 'intervals_compound',
    section: 'intervals',
    title: 'Compound Intervals & Inversion',
    content: `**Compound Intervals (larger than an octave)**

A compound interval spans more than one octave. It is named by adding 7 to the simple interval number.

| Simple  | Compound | Half-Steps |
|---------|----------|-----------|
| 2nd     | 9th      | 14        |
| 3rd     | 10th     | 15 or 16  |
| 4th     | 11th     | 17        |
| 5th     | 12th     | 19        |

**Interval Inversion Rules**

To invert an interval, subtract the interval number from 9:
- 2nd inverts to 7th, 3rd to 6th, 4th to 5th
- Major inverts to minor; Perfect stays perfect; Augmented inverts to diminished

**Examples:**
- M3 (C – E) inverted = m6 (E – C)
- P5 (C – G) inverted = P4 (G – C)`,
    diagrams: [
      {
        type: 'staff',
        notes: [
          { pitch: 'C4', dur: 'h', label: 'C4' },
          { pitch: 'D5', dur: 'h', label: '9th' },
          { pitch: 'C4', dur: 'h', label: 'C4' },
          { pitch: 'E5', dur: 'h', label: '10th' },
          { pitch: 'C4', dur: 'h', label: 'C4' },
          { pitch: 'G5', dur: 'h', label: '12th' },
        ],
        label: 'Compound intervals — note how they span more than an octave',
      },
    ],
    unlockedByZone: 4,
  },

  // ── Chords ─────────────────────────────────────────────────────────────────
  {
    id: 'chords_basic',
    section: 'chords',
    title: 'Basic Chord Types',
    content: `**Four Essential Chord Types**

| Chord Type    | Formula (from root) | Intervals        | Sound         |
|---------------|---------------------|------------------|---------------|
| Major triad   | 1 – 3 – 5           | M3 + m3          | Bright, happy |
| Minor triad   | 1 – b3 – 5          | m3 + M3          | Dark, sad     |
| Dominant 7th  | 1 – 3 – 5 – b7      | M3 + m3 + m3     | Tense, jazzy  |
| Diminished    | 1 – b3 – b5         | m3 + m3          | Very tense    |

**Building a C Major triad:** C (root) + E (M3 up) + G (P5 up)
**Building a C Minor triad:** C (root) + Eb (m3 up) + G (P5 up)
**Building a G Dominant 7th:** G + B + D + F

**Tip:** The dominant 7th chord (built on scale degree 5) creates the strongest pull back to the tonic — this tension-and-resolution is the engine of tonal music.`,
    diagrams: [
      {
        type: 'staff',
        notes: [
          { pitch: 'C4', dur: 'h', label: 'Cmaj' },
          { pitch: 'E4', dur: 'h', chord: true },
          { pitch: 'G4', dur: 'h', chord: true },
          { pitch: 'C4', dur: 'h', label: 'Cmin' },
          { pitch: 'Eb4', dur: 'h', chord: true, forceAcc: 'flat' },
          { pitch: 'G4', dur: 'h', chord: true },
          { pitch: 'G3', dur: 'h', label: 'Gdim' },
          { pitch: 'Bb3', dur: 'h', chord: true, forceAcc: 'flat' },
          { pitch: 'Db4', dur: 'h', chord: true, forceAcc: 'flat' },
        ],
        label: 'Major, minor, and diminished triads on treble clef',
      },
    ],
    unlockedByZone: 3,
  },
  {
    id: 'chords_inversions',
    section: 'chords',
    title: 'Chord Inversions',
    content: `**Chord Inversions — Which Note Is on the Bottom?**

| Inversion     | Lowest Note     | Symbol (C major) |
|---------------|-----------------|------------------|
| Root position | Root (C)        | C                |
| First inversion | 3rd (E)       | C/E              |
| Second inversion | 5th (G)     | C/G              |
| Third inversion (7th chords) | 7th | G7/F     |

**Why it matters:** Inversions affect the stability of a chord. Root position is most stable; second inversion (six-four chord) is unstable and typically resolves. In band music, the bass voice (tuba/bassoon) determines the inversion.

**Roman numeral analysis:**
- I = Tonic (home)
- IV = Subdominant (stable departure)
- V or V7 = Dominant (tension, wants to resolve to I)
- vi = Relative minor (substitutes for I)`,
    diagrams: [
      {
        type: 'staff',
        notes: [
          // Root position: C-E-G
          { pitch: 'C4', dur: 'h', label: 'Root' },
          { pitch: 'E4', dur: 'h', chord: true },
          { pitch: 'G4', dur: 'h', chord: true },
          // 1st inversion: E-G-C
          { pitch: 'E4', dur: 'h', label: '1st inv' },
          { pitch: 'G4', dur: 'h', chord: true },
          { pitch: 'C5', dur: 'h', chord: true },
          // 2nd inversion: G-C-E
          { pitch: 'G4', dur: 'h', label: '2nd inv' },
          { pitch: 'C5', dur: 'h', chord: true },
          { pitch: 'E5', dur: 'h', chord: true },
        ],
        label: 'C major — root position, 1st inversion, 2nd inversion',
      },
    ],
    unlockedByZone: 5,
  },

  // ── Rhythm ─────────────────────────────────────────────────────────────────
  {
    id: 'rhythm_note_values',
    section: 'rhythm',
    title: 'Note Values & Rest Values',
    content: `**Note Values (in 4/4 time)**

| Note Name    | Symbol | Beats | Rest Symbol | Syllable  |
|--------------|--------|-------|-------------|-----------|
| Whole note   | 𝅝      | 4     | —           | "one-two-three-four" |
| Half note    | 𝅗𝅥      | 2     | 𝄼           | "one-two"  |
| Quarter note | ♩      | 1     | 𝄽           | "one"      |
| Eighth note  | ♪      | 1/2   | 𝄾           | "and"      |
| Sixteenth    | ♬      | 1/4   | 𝄿           | "e" or "a" |

**Dotted notes:** A dot adds half of the note's value.
- Dotted half note = 3 beats
- Dotted quarter note = 1.5 beats
- Dotted eighth note = 0.75 beats

**Subdivision counting (4/4):**
Beat 1: "1  e  and  a" = four sixteenth notes per beat`,
    diagrams: [
      { type: 'durations', label: 'Note values and their equivalent rests' },
    ],
    unlockedByZone: 1,
  },
  {
    id: 'rhythm_time_signatures',
    section: 'rhythm',
    title: 'Time Signatures',
    content: `**Common Time Signatures**

| Signature | Beats per Measure | Beat Unit   | Feel              |
|-----------|------------------|-------------|-------------------|
| 4/4       | 4                | Quarter note | March, common    |
| 3/4       | 3                | Quarter note | Waltz            |
| 2/4       | 2                | Quarter note | March, cut       |
| 6/8       | 6 (or 2 in fast) | Eighth note | Compound duple   |
| 9/8       | 9 (or 3 in fast) | Eighth note | Compound triple  |
| 12/8      | 12 (or 4 in fast)| Eighth note | Compound quadruple|
| 2/2 (Cut) | 2                | Half note   | Fast march, allegro|

**Simple vs. Compound:**
- Simple time: each beat divides into 2 equal parts (2/4, 3/4, 4/4)
- Compound time: each beat divides into 3 equal parts (6/8, 9/8, 12/8)

**Common symbol:** C = 4/4 time; ₵ (cut time) = 2/2 time`,
    diagrams: [
      {
        type: 'staff',
        timeSig: [4, 4],
        notes: [
          { pitch: 'C5', dur: 'q', label: '1' },
          { pitch: 'C5', dur: 'q', label: '2' },
          { pitch: 'C5', dur: 'q', label: '3' },
          { pitch: 'C5', dur: 'q', label: '4' },
        ],
        label: '4/4 — four quarter-note beats per measure',
      },
      {
        type: 'staff',
        timeSig: [3, 4],
        notes: [
          { pitch: 'C5', dur: 'q', label: '1' },
          { pitch: 'C5', dur: 'q', label: '2' },
          { pitch: 'C5', dur: 'q', label: '3' },
        ],
        label: '3/4 — three quarter-note beats (waltz feel)',
      },
      {
        type: 'staff',
        timeSig: [6, 8],
        notes: [
          { pitch: 'C5', dur: 'e', label: '1' },
          { pitch: 'C5', dur: 'e', label: '2' },
          { pitch: 'C5', dur: 'e', label: '3' },
          { pitch: 'C5', dur: 'e', label: '4' },
          { pitch: 'C5', dur: 'e', label: '5' },
          { pitch: 'C5', dur: 'e', label: '6' },
        ],
        label: '6/8 — six eighth-note beats (compound duple)',
      },
    ],
    unlockedByZone: 1,
  },

  // ── Scales ─────────────────────────────────────────────────────────────────
  {
    id: 'scales_major',
    section: 'scales',
    title: 'Major Scale Construction',
    content: `**The Major Scale**

A major scale is built using a specific pattern of whole steps (W) and half steps (H):

**Pattern:** W – W – H – W – W – W – H

**Example — C Major:** C – D – E – F – G – A – B – C
Half steps occur between scale degrees 3–4 and 7–8 (E–F and B–C in C major).

**Scale Degrees:**
| Degree | Name         | Role                    |
|--------|--------------|-------------------------|
| 1      | Tonic        | Home base               |
| 2      | Supertonic   | Stepwise departure      |
| 3      | Mediant      | Colors major/minor      |
| 4      | Subdominant  | Stable departure        |
| 5      | Dominant     | Tension, wants to resolve|
| 6      | Submediant   | Relative minor center   |
| 7      | Leading tone | Strong pull to tonic    |
| 8      | Octave       | Return to tonic         |

**Tip:** The pattern W-W-H-W-W-W-H works from ANY starting note to build a major scale.`,
    diagrams: [
      {
        type: 'scale_pattern',
        steps: ['W', 'W', 'H', 'W', 'W', 'W', 'H'],
        noteNames: ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'],
        label: 'Major scale pattern: W W H W W W H',
      },
      {
        type: 'staff',
        notes: [
          { pitch: 'C4', dur: 'q', label: '1' },
          { pitch: 'D4', dur: 'q', label: '2' },
          { pitch: 'E4', dur: 'q', label: '3' },
          { pitch: 'F4', dur: 'q', label: '4' },
          { pitch: 'G4', dur: 'q', label: '5' },
          { pitch: 'A4', dur: 'q', label: '6' },
          { pitch: 'B4', dur: 'q', label: '7' },
          { pitch: 'C5', dur: 'h', label: '8' },
        ],
        label: 'C major scale on treble clef',
      },
      {
        type: 'keyboard',
        highlights: [
          { pitch: 'C4', color: '#D4A017', label: '1' },
          { pitch: 'D4', color: '#D4A017', label: '2' },
          { pitch: 'E4', color: '#D4A017', label: '3' },
          { pitch: 'F4', color: '#D4A017', label: '4' },
          { pitch: 'G4', color: '#D4A017', label: '5' },
          { pitch: 'A4', color: '#D4A017', label: '6' },
          { pitch: 'B4', color: '#D4A017', label: '7' },
          { pitch: 'C5', color: '#D4A017', label: '8' },
        ],
        label: 'C major — all white keys',
      },
    ],
    unlockedByZone: 1,
  },
  {
    id: 'scales_minor',
    section: 'scales',
    title: 'Natural, Harmonic & Melodic Minor',
    content: `**The Three Forms of Minor Scale**

Starting from A (relative minor of C major):

**Natural Minor:** A – B – C – D – E – F – G – A
Pattern: W – H – W – W – H – W – W
(Same notes as the relative major, different starting point.)

**Harmonic Minor:** A – B – C – D – E – F – G# – A
The 7th degree is raised by one half step, creating a leading tone.
This produces the characteristic "augmented 2nd" interval between scale degrees 6 and 7 (F to G#), giving harmonic minor its exotic flavor.

**Melodic Minor (ascending):** A – B – C – D – E – F# – G# – A
Both the 6th and 7th degrees are raised going up.
**Descending:** reverts to natural minor (A – G – F – E – D – C – B – A).
The ascending alterations smooth out the awkward augmented 2nd from harmonic minor for vocal/melodic lines.

**When to use each:**
- Natural minor: folk music, modal passages
- Harmonic minor: chords, especially the dominant V chord in minor keys
- Melodic minor: lyrical, stepwise melodies`,
    diagrams: [
      {
        type: 'scale_pattern',
        steps: ['W', 'H', 'W', 'W', 'H', 'W', 'W'],
        noteNames: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'A'],
        label: 'Natural minor pattern: W H W W H W W',
      },
      {
        type: 'staff',
        notes: [
          { pitch: 'A4', dur: 'q', label: '1' },
          { pitch: 'B4', dur: 'q', label: '2' },
          { pitch: 'C5', dur: 'q', label: '3' },
          { pitch: 'D5', dur: 'q', label: '4' },
          { pitch: 'E5', dur: 'q', label: '5' },
          { pitch: 'F5', dur: 'q', label: '6' },
          { pitch: 'G5', dur: 'q', label: '7' },
          { pitch: 'A5', dur: 'h', label: '8' },
        ],
        label: 'A natural minor',
      },
      {
        type: 'scale_pattern',
        steps: ['W', 'H', 'W', 'W', 'H', 'A2', 'H'],
        noteNames: ['A', 'B', 'C', 'D', 'E', 'F', 'G#', 'A'],
        label: 'Harmonic minor — raised 7th creates A2 gap',
      },
      {
        type: 'staff',
        notes: [
          { pitch: 'A4', dur: 'q', label: '1' },
          { pitch: 'B4', dur: 'q', label: '2' },
          { pitch: 'C5', dur: 'q', label: '3' },
          { pitch: 'D5', dur: 'q', label: '4' },
          { pitch: 'E5', dur: 'q', label: '5' },
          { pitch: 'F5', dur: 'q', label: '6' },
          { pitch: 'G5', dur: 'q', forceAcc: 'sharp', label: '7' },
          { pitch: 'A5', dur: 'h', label: '8' },
        ],
        label: 'A harmonic minor — G# raised leading tone',
      },
    ],
    unlockedByZone: 5,
  },
  {
    id: 'scales_chromatic_pentatonic',
    section: 'scales',
    title: 'Chromatic & Pentatonic Scales',
    content: `**Chromatic Scale**
Contains all 12 half steps within an octave.
C – C# – D – D# – E – F – F# – G – G# – A – A# – B – C
Every adjacent pair of notes is exactly one half step apart.
Used for: chromatic passing tones, special effects, full-range technical exercises.

**Major Pentatonic Scale**
Five-note scale using scale degrees 1, 2, 3, 5, 6 of the major scale.
C pentatonic: C – D – E – G – A
Contains no half steps — every interval is a whole step or minor 3rd.
Found in folk music worldwide and easy to improvise with because no "wrong" notes clash.

**Minor Pentatonic Scale**
Scale degrees 1, b3, 4, 5, b7 of the natural minor scale.
A minor pentatonic: A – C – D – E – G
The foundation of blues and rock improvisation.`,
    diagrams: [
      {
        type: 'staff',
        notes: [
          { pitch: 'C4', dur: 'q', label: 'C' },
          { pitch: 'Db4', dur: 'q', forceAcc: 'sharp', label: 'C#' },
          { pitch: 'D4', dur: 'q', label: 'D' },
          { pitch: 'Eb4', dur: 'q', forceAcc: 'sharp', label: 'D#' },
          { pitch: 'E4', dur: 'q', label: 'E' },
          { pitch: 'F4', dur: 'q', label: 'F' },
          { pitch: 'Gb4', dur: 'q', forceAcc: 'sharp', label: 'F#' },
          { pitch: 'G4', dur: 'q', label: 'G' },
          { pitch: 'Ab4', dur: 'q', forceAcc: 'sharp', label: 'G#' },
          { pitch: 'A4', dur: 'q', label: 'A' },
          { pitch: 'Bb4', dur: 'q', forceAcc: 'sharp', label: 'A#' },
          { pitch: 'B4', dur: 'q', label: 'B' },
        ],
        label: 'Chromatic scale — all 12 pitches, each a half step apart',
      },
      {
        type: 'keyboard',
        highlights: [
          { pitch: 'C4', color: '#D4A017', label: '1' },
          { pitch: 'D4', color: '#D4A017', label: '2' },
          { pitch: 'E4', color: '#D4A017', label: '3' },
          { pitch: 'G4', color: '#D4A017', label: '5' },
          { pitch: 'A4', color: '#D4A017', label: '6' },
        ],
        label: 'C major pentatonic — 5 notes, no half steps',
      },
    ],
    unlockedByZone: 6,
  },

  // ── Notation ───────────────────────────────────────────────────────────────
  {
    id: 'notation_basics',
    section: 'notation',
    title: 'Reading Music Notation',
    content: `**The Staff & Clefs**

The staff has 5 lines and 4 spaces. Notes sit on lines or in spaces.

**Treble Clef (G clef)** — used by flute, clarinet, oboe, saxophone, trumpet, french horn:
Lines (bottom to top): E – G – B – D – F  ("Every Good Boy Does Fine")
Spaces: F – A – C – E  ("FACE")

**Bass Clef (F clef)** — used by trombone, tuba, bassoon, euphonium:
Lines: G – B – D – F – A  ("Good Boys Do Fine Always")
Spaces: A – C – E – G  ("All Cows Eat Grass")

**Ledger Lines:** Short lines above or below the staff extend its range.
Middle C sits on a ledger line below the treble staff and above the bass staff.

**Accidentals:**
- # (sharp): raise pitch one half step
- b (flat): lower pitch one half step
- ♮ (natural): cancel a previous sharp or flat
An accidental applies for the rest of the measure unless cancelled.`,
    diagrams: [
      {
        type: 'staff',
        clef: 'treble',
        notes: [
          { pitch: 'C4', dur: 'h', label: 'C4' },
          { pitch: 'E4', dur: 'h', label: 'E4' },
          { pitch: 'G4', dur: 'h', label: 'G4' },
          { pitch: 'B4', dur: 'h', label: 'B4' },
          { pitch: 'D5', dur: 'h', label: 'D5' },
          { pitch: 'F5', dur: 'h', label: 'F5' },
        ],
        label: 'Treble clef — C4 (ledger below) through F5 (top line)',
      },
      {
        type: 'staff',
        clef: 'bass',
        notes: [
          { pitch: 'G2', dur: 'h', label: 'G2' },
          { pitch: 'B2', dur: 'h', label: 'B2' },
          { pitch: 'D3', dur: 'h', label: 'D3' },
          { pitch: 'F3', dur: 'h', label: 'F3' },
          { pitch: 'A3', dur: 'h', label: 'A3' },
          { pitch: 'C4', dur: 'h', label: 'C4' },
        ],
        label: 'Bass clef — G2 (bottom line) through C4 (ledger above)',
      },
      {
        type: 'staff',
        clef: 'treble',
        notes: [
          { pitch: 'B4', dur: 'h', label: 'B' },
          { pitch: 'Bb4', dur: 'h', forceAcc: 'flat', label: 'B♭' },
          { pitch: 'B4', dur: 'h', forceAcc: 'natural', label: 'B♮' },
          { pitch: 'Db4', dur: 'h', forceAcc: 'flat', label: 'D♭' },
          { pitch: 'D4', dur: 'h', forceAcc: 'natural', label: 'D♮' },
          { pitch: 'D4', dur: 'h', forceAcc: 'sharp', label: 'D#' },
        ],
        label: 'Accidentals — flat, natural, and sharp in context',
      },
    ],
    unlockedByZone: 1,
  },
  {
    id: 'notation_dynamics_tempo',
    section: 'notation',
    title: 'Dynamics & Tempo Markings',
    content: `**Dynamic Markings (softest to loudest)**

| Symbol | Italian Term   | Meaning              |
|--------|----------------|----------------------|
| ppp    | pianississimo  | As soft as possible  |
| pp     | pianissimo     | Very soft            |
| p      | piano          | Soft                 |
| mp     | mezzo-piano    | Moderately soft      |
| mf     | mezzo-forte    | Moderately loud      |
| f      | forte          | Loud                 |
| ff     | fortissimo     | Very loud            |
| fff    | fortississimo  | As loud as possible  |
| cresc. / < | crescendo | Gradually louder    |
| decresc. / > | decrescendo | Gradually softer |

**Common Tempo Markings (slowest to fastest)**

| Term       | BPM (approx.) | Meaning           |
|------------|---------------|-------------------|
| Largo      | 40–60         | Very slow, broad  |
| Adagio     | 66–76         | Slow, expressive  |
| Andante    | 76–108        | Walking pace      |
| Moderato   | 108–120       | Moderate          |
| Allegro    | 120–168       | Fast, lively      |
| Vivace     | 168–176       | Lively, brisk     |
| Presto     | 168–200       | Very fast         |`,
    diagrams: [
      {
        type: 'staff',
        notes: [
          { pitch: 'G4', dur: 'w', label: 'ppp' },
          { pitch: 'G4', dur: 'w', label: 'p' },
          { pitch: 'G4', dur: 'w', label: 'mf' },
          { pitch: 'G4', dur: 'w', label: 'f' },
          { pitch: 'G4', dur: 'w', label: 'fff' },
        ],
        label: 'Same note — five dynamic levels from softest to loudest',
      },
    ],
    unlockedByZone: 1,
  },
  {
    id: 'notation_articulation_expression',
    section: 'notation',
    title: 'Articulation & Expression Marks',
    content: `**Articulation Markings**

| Symbol       | Name        | Effect                                      |
|--------------|-------------|---------------------------------------------|
| • (dot)      | Staccato    | Short, detached — play about half the value |
| — (line)     | Tenuto      | Full value, slight emphasis, connected      |
| ^ (hat)      | Marcato     | Strongly accented, forceful attack          |
| > (arrow)    | Accent      | Emphasized attack, normal duration          |
| ‿ (slur)     | Slur        | Play connected (legato) without re-tonguing |
| — (long line)| Legato      | Smooth, connected playing                   |
| ⊕            | Fermata     | Hold the note longer than written           |

**Expression Marks**

| Term         | Meaning                          |
|--------------|----------------------------------|
| cantabile    | In a singing style               |
| espressivo   | Expressively, with feeling       |
| dolce        | Sweetly, gently                  |
| grazioso     | Gracefully                       |
| maestoso     | Majestically, with grandeur      |
| leggiero     | Lightly                          |
| pesante      | Heavily                          |

**Repeat Signs:** :| means repeat from the nearest |: (or from the beginning if none is present). First and second endings (1. and 2.) indicate different endings on each repeat.`,
    diagrams: [
      {
        type: 'staff',
        notes: [
          { pitch: 'C5', dur: 'q', label: 'stacc.' },
          { pitch: 'D5', dur: 'q', label: 'tenuto' },
          { pitch: 'E5', dur: 'q', label: 'accent' },
          { pitch: 'F5', dur: 'h', label: 'legato' },
          { pitch: 'E5', dur: 'q', label: 'marcato' },
        ],
        label: 'Articulation marks — each note shows a different touch',
      },
    ],
    unlockedByZone: 2,
  },
];
