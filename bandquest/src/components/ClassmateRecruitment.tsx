import type { ReactElement } from 'react';
import { useGameStore } from '../store/gameStore';
import {
  STUDENTS, CAMEOS, metKey, cameoKey,
  recruitmentDue, hasMet, cameoDue, hasSeenCameo,
} from '../lib/students';
import { getInstrumentEmoji } from '../lib/instruments';
import { STUDENT_PORTRAITS } from '../lib/portraits';
import LiberationScene from './LiberationScene';

// Zone story beats for the classmates: brief cameos (non-recruiting encounters,
// e.g. Gene before he buys in) and recruitment scenes, each firing once when
// its in-zone moment arrives. A student who plays the HERO's instrument follows
// the same recruitment story but goes their own way with well-wishes.
//
// Usage in a zone page, right after the character null-check:
//   const recruitment = useClassmateRecruitment(2);
//   if (recruitment) return recruitment;
export function useClassmateRecruitment(zoneId: number): ReactElement | null {
  const { character, recordStoryKeys } = useGameStore();
  if (!character) return null;

  const dueCameos = CAMEOS.filter(
    (c) => c.zone === zoneId && cameoDue(c, character) && !hasSeenCameo(c, character),
  );
  const dueRecruits = STUDENTS.filter(
    (s) => s.recruitZone === zoneId && recruitmentDue(s, character) && !hasMet(s, character),
  );
  if (dueCameos.length === 0 && dueRecruits.length === 0) return null;

  const beats = [
    ...dueCameos.map((c) => ({ emoji: c.emoji, text: c.text })),
    ...dueRecruits.map((s) => ({
      emoji: getInstrumentEmoji(s.instrument),
      image: STUDENT_PORTRAITS[s.id],
      text: character.instrument === s.instrument ? s.farewellScene : s.joinScene,
    })),
  ];

  const title = dueRecruits.length > 0
    ? (dueRecruits.length > 1 ? 'New Classmates' : 'A New Classmate')
    : dueCameos[0].title;

  return (
    <LiberationScene
      title={title}
      beats={beats}
      doneLabel={dueRecruits.length > 0 ? 'Onward, together →' : 'Onward →'}
      onDone={() => recordStoryKeys([
        ...dueCameos.map((c) => cameoKey(c.id)),
        ...dueRecruits.map((s) => metKey(s.id)),
      ])}
    />
  );
}
