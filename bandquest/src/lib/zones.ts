// Single source of truth for zone metadata.
// Consumed by HubPage, WorldMapPage, and ZonePage so the lists can't drift.

export interface ZoneMeta {
  id: number;
  name: string;
  act: 1 | 2 | 3;
  quarter: number;   // 1–12
  season?: string;   // Act 1 zones carry a season label
  emoji: string;
  flavor: string;
  boss: string;      // headline encounter / capstone for the zone
}

export const ZONES: ZoneMeta[] = [
  // ── Act I — The Academy Years (the world is whole) ──
  {
    id: 1, name: 'The Rehearsal Halls', act: 1, quarter: 1, season: 'Fall',
    emoji: '🏛️',
    flavor: "Stone arches and worn practice rooms echo with a hundred instruments. Boot camp, fundamentals, and your first real steps as a musician.",
    boss: 'Boot Camp Graduation',
  },
  {
    id: 2, name: 'The Theory Wing', act: 1, quarter: 2, season: 'Winter',
    emoji: '📜',
    flavor: "The Academy's ancient inner wing, lined with old scores and chalk-dusted theory puzzles. The quarter ends with the Winter Concert.",
    boss: 'The Winter Concert',
  },
  {
    id: 3, name: 'The City of Concerta', act: 1, quarter: 3, season: 'Spring',
    emoji: '🏙️',
    flavor: 'The great central metropolis, hosting the regional inter-school contest — banners, crowds, and four schools chasing one trophy.',
    boss: 'The Concerta Invitational',
  },
  {
    id: 4, name: 'The Grand Auditorium', act: 1, quarter: 4, season: 'End of Year',
    emoji: '🎭',
    flavor: "The Academy's crown jewel. Graduation night: your final performance, and then the Maestros' Renewal — the night everything changes.",
    boss: 'Graduation & the Renewal',
  },

  // ── Act II — Into the World (the aftermath quest) ──
  {
    id: 5, name: 'Melodious Meadows', act: 2, quarter: 5,
    emoji: '🌾',
    flavor: 'Warm, golden farmland where music rides the wind. Your first corrupted professors are scattered here — and Cornelius is hunting for his lost brother.',
    boss: 'The Aria Wraith (Flaura)',
  },
  {
    id: 6, name: 'Sands of Time', act: 2, quarter: 6,
    emoji: '🏜️',
    flavor: 'A desert of shifting dunes and slippery time — the Octoasis, the echoing Chaconne Caves, and a trading post peddling discord.',
    boss: 'Caucophonus (Paige)',
  },
  {
    id: 7, name: 'Clef Cliffs', act: 2, quarter: 7,
    emoji: '⛰️',
    flavor: 'Cold mountain passes and the first Discordian foothold — an outpost where your low-brass professors are held in thrall.',
    boss: 'Lieutenant Contra',
  },
  {
    id: 8, name: 'Forgotten Forest', act: 2, quarter: 8,
    emoji: '🌲',
    flavor: "A fog-drowned wood at the mountains' feet. Follow the tritones to the last of your corrupted professors.",
    boss: 'Fagotto, the Ancient Revenant',
  },

  // ── Act III — The Assault (the march on Discordia) ──
  {
    id: 9, name: 'Chromatic Coasts', act: 3, quarter: 9,
    emoji: '🌊',
    flavor: 'The trail of corruption reaches the western shore; color drains in chromatic bands as Elder Rampal steels you for the crossing.',
    boss: 'Coastal Dissonance',
  },
  {
    id: 10, name: 'Syncopated Seas', act: 3, quarter: 10,
    emoji: '🌀',
    flavor: 'The violent crossing aboard The Fourth Wind — naturally uneven seas turned deadly with tempests and rogue waves.',
    boss: 'The Maelstrom',
  },
  {
    id: 11, name: 'Dissonant Dunes', act: 3, quarter: 11,
    emoji: '🌑',
    flavor: "Landfall in Discordia — grey dunes between the shore and the Hall, patrolled by Vexus's elite guard.",
    boss: 'Piano & Forte',
  },
  {
    id: 12, name: 'The Hall of Discord', act: 3, quarter: 12,
    emoji: '🎭',
    flavor: 'Dark and operatic: Ostinato the Usher, the basement practice rooms, the Tritone Trio — and Vexus himself.',
    boss: 'Vexus, the Conductor',
  },
];

export function getZone(id: number): ZoneMeta | undefined {
  return ZONES.find((z) => z.id === id);
}

/** "Quarter 5 · Fall" / "Quarter 5" */
export function quarterLabelLong(z: ZoneMeta): string {
  return `Quarter ${z.quarter}${z.season ? ` · ${z.season}` : ''}`;
}

/** "Q5 · Fall" / "Q5" */
export function quarterLabelShort(z: ZoneMeta): string {
  return `Q${z.quarter}${z.season ? ` · ${z.season}` : ''}`;
}
