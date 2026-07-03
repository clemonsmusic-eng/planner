// ── Party building ──────────────────────────────────────────────────────────────
// Battles are FF6-style party battles: the hero plus up to four freed combat
// maestros, every one of them user-controlled. The party is derived from
// character.freedAllies (in the order they were freed), so it grows naturally
// through Act 2 with zero extra persistence.

import type { AllyId, Character, InstrumentId, StatBlock } from '../types/game';
import { INSTRUMENTS, getInstrumentEmoji } from './instruments';
import { MAESTRO_PORTRAITS } from './portraits';
import { ALLY_BATTLE_DEFS } from './allies';
import { getEffectiveStats } from './gear';

export const MAX_PARTY_SIZE = 5;

export interface PartyMemberDef {
  key: string;                 // 'hero' or the AllyId
  name: string;
  instrument: InstrumentId;
  isHero: boolean;
  emoji: string;               // battlefield sprite fallback
  portrait?: string;           // retro portrait asset (public/portraits)
  stats: StatBlock;
  maxHp: number;
}

// The freed maestros who fight. Hautbois (guide), Fagotto (library) and
// Paige (artificer) follow the story instead of the party.
const COMBAT_ALLY_INSTRUMENT: Partial<Record<AllyId, InstrumentId>> = {
  syrinx: 'flute',
  salpinx: 'trumpet',
  chalumeau: 'clarinet',
  vela: 'alto_sax',
  posaune: 'trombone',
  cantora: 'euphonium',
  waldhorn: 'french_horn',
};

function statsAtLevel(instrument: InstrumentId, level: number): StatBlock {
  const def = INSTRUMENTS[instrument];
  const n = level - 1;
  return {
    power:     Math.round(def.baseStats.power     + def.statGrowth.power     * n),
    accuracy:  Math.round(def.baseStats.accuracy  + def.statGrowth.accuracy  * n),
    technique: Math.round(def.baseStats.technique + def.statGrowth.technique * n),
    endurance: Math.round(def.baseStats.endurance + def.statGrowth.endurance * n),
  };
}

export function buildParty(character: Character): PartyMemberDef[] {
  const heroStats = getEffectiveStats(character);
  const party: PartyMemberDef[] = [{
    key: 'hero',
    name: character.displayName,
    instrument: character.instrument,
    isHero: true,
    emoji: getInstrumentEmoji(character.instrument),
    stats: heroStats,
    maxHp: character.maxHp,
  }];

  for (const allyId of character.freedAllies) {
    if (party.length >= MAX_PARTY_SIZE) break;
    const instrument = COMBAT_ALLY_INSTRUMENT[allyId as AllyId];
    if (!instrument) continue; // non-combat maestro (or grand_symphony)
    const stats = statsAtLevel(instrument, character.level);
    party.push({
      key: allyId,
      name: ALLY_BATTLE_DEFS[allyId as AllyId].name,
      instrument,
      isHero: false,
      emoji: getInstrumentEmoji(instrument),
      portrait: MAESTRO_PORTRAITS[allyId as AllyId],
      stats,
      maxHp: stats.endurance * 5,
    });
  }
  return party;
}
