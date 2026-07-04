import type { ReactElement } from 'react';
import { useGameStore } from '../store/gameStore';
import { STUDENTS, metKey, recruitmentDue, hasMet } from '../lib/students';
import { getInstrumentEmoji } from '../lib/instruments';
import LiberationScene from './LiberationScene';

// First visit to a zone with new classmates plays their recruitment beats.
// A student who plays the HERO's instrument follows the same story but goes
// their own way with well-wishes (they can never join that hero's party).
//
// Usage in a zone page, right after the character null-check:
//   const recruitment = useClassmateRecruitment(2);
//   if (recruitment) return recruitment;
export function useClassmateRecruitment(zoneId: number): ReactElement | null {
  const { character, recordStoryKeys } = useGameStore();
  if (!character) return null;

  const unmet = STUDENTS.filter(
    (s) => s.recruitZone === zoneId && recruitmentDue(s, character) && !hasMet(s, character),
  );
  if (unmet.length === 0) return null;

  const beats = unmet.map((s) => ({
    emoji: getInstrumentEmoji(s.instrument),
    text: character.instrument === s.instrument ? s.farewellScene : s.joinScene,
  }));

  return (
    <LiberationScene
      title={unmet.length > 1 ? 'New Classmates' : 'A New Classmate'}
      beats={beats}
      doneLabel="Onward, together →"
      onDone={() => recordStoryKeys(unmet.map((s) => metKey(s.id)))}
    />
  );
}
