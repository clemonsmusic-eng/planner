// ── Party building ──────────────────────────────────────────────────────────────
// Battles are FF6-style party battles: the hero plus up to four student
// classmates, every one of them user-controlled. Classmates are recruited on a
// fixed zone schedule (see lib/students.ts) and the player chooses their lineup
// on the Party page.
//
// Rules:
// - Up to MAX_PARTY_SIZE members including the hero.
// - One instrument per party: the hero's instrument excludes that classmate.
// - Co-op: real players occupy slots and exclude their instruments too — pass
//   their instruments via realPlayerInstruments and the NPC lineup shrinks and
//   dedupes around them. (Live co-op sessions plug in through this hook.)
//
// The freed maestros are NOT party members — they are summons (GF-style), as
// the design doc always intended.

import type { Character, InstrumentId, StatBlock } from '../types/game';
import { INSTRUMENTS, getInstrumentEmoji } from './instruments';
import { STUDENTS, STUDENT_BY_ID, hasMet } from './students';
import { STUDENT_PORTRAITS } from './portraits';
import { getEffectiveStats } from './gear';

export const MAX_PARTY_SIZE = 5;

export interface PartyMemberDef {
  key: string;                 // 'hero' or the student id
  name: string;
  instrument: InstrumentId;
  isHero: boolean;
  emoji: string;               // battlefield sprite fallback
  portrait?: string;           // retro portrait asset (public/portraits)
  stats: StatBlock;
  maxHp: number;
}

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

// ── Party selection persistence (per character, client-side) ────────────────────

const partyKey = (characterId: string) => `bq_party_${characterId}`;

export function loadPartySelection(characterId: string): string[] {
  try {
    const raw = localStorage.getItem(partyKey(characterId));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function hasSavedSelection(characterId: string): boolean {
  try { return localStorage.getItem(partyKey(characterId)) !== null; } catch { return false; }
}

export function savePartySelection(characterId: string, studentIds: string[]) {
  try { localStorage.setItem(partyKey(characterId), JSON.stringify(studentIds)); } catch { /* ignore */ }
}

// Drop unknown/unrecruited/duplicate-instrument picks; cap the roster size.
export function sanitizeSelection(
  ids: string[],
  character: Character,
  realPlayerInstruments: InstrumentId[] = [],
): string[] {
  const npcSlots = Math.max(0, MAX_PARTY_SIZE - 1 - realPlayerInstruments.length);
  const taken = new Set<InstrumentId>([character.instrument, ...realPlayerInstruments]);
  const out: string[] = [];
  for (const id of ids) {
    const s = STUDENT_BY_ID[id];
    if (!s) continue;
    if (!hasMet(s, character)) continue;
    if (taken.has(s.instrument)) continue;
    taken.add(s.instrument);
    out.push(id);
    if (out.length >= npcSlots) break;
  }
  return out;
}

// Default lineup when the player hasn't picked one: first recruits, in
// recruitment order, respecting the one-instrument rule.
function defaultSelection(character: Character, realPlayerInstruments: InstrumentId[]): string[] {
  return sanitizeSelection(STUDENTS.map((s) => s.id), character, realPlayerInstruments);
}

export function getPartySelection(
  character: Character,
  realPlayerInstruments: InstrumentId[] = [],
): string[] {
  // An explicitly saved lineup is respected (even an empty one = solo run);
  // players who never touched the Party page get a sensible default.
  if (hasSavedSelection(character.id)) {
    return sanitizeSelection(loadPartySelection(character.id), character, realPlayerInstruments);
  }
  return defaultSelection(character, realPlayerInstruments);
}

// ── Party assembly ────────────────────────────────────────────────────────────

export function buildParty(
  character: Character,
  realPlayerInstruments: InstrumentId[] = [],
): PartyMemberDef[] {
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

  for (const id of getPartySelection(character, realPlayerInstruments)) {
    const s = STUDENT_BY_ID[id];
    const stats = statsAtLevel(s.instrument, character.level);
    party.push({
      key: s.id,
      name: s.name,
      instrument: s.instrument,
      isHero: false,
      emoji: getInstrumentEmoji(s.instrument),
      portrait: STUDENT_PORTRAITS[s.id],
      stats,
      maxHp: stats.endurance * 5,
    });
  }
  return party;
}
