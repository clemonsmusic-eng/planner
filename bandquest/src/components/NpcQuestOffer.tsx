import type { ReactElement } from 'react';
import { useGameStore } from '../store/gameStore';
import { pendingNpcOffers, npcOfferKey } from '../lib/sidequests';
import LiberationScene from './LiberationScene';

// NPC quest offers: when the player enters a zone, any NPC whose quest hasn't
// been offered yet steps up, introduces themselves, and hands over the errand —
// which then appears in the Quest Board log. Fires once per quest (guarded by
// the npc_offer_<id> story key), and catches up on a later revisit if skipped.
//
// Usage in a zone page, alongside/after the classmate-recruitment early return:
//   const npcOffers = useNpcQuestOffers(2);
//   ...
//   if (npcOffers) return npcOffers;
export function useNpcQuestOffers(zoneId: number): ReactElement | null {
  const { character, recordStoryKeys } = useGameStore();
  if (!character) return null;

  const offers = pendingNpcOffers(zoneId, character);
  if (offers.length === 0) return null;

  const beats = offers.map((q) => ({
    emoji: q.giverEmoji,
    text: `${q.giver} — ${q.giverRole} — waves you over.\n\n${q.hook}\n\n“${q.title}” has been added to your Quest Board.`,
  }));

  const title = offers.length > 1 ? 'The Locals Have Errands' : 'A Local Asks a Favor';

  return (
    <LiberationScene
      title={title}
      beats={beats}
      doneLabel="To the Quest Board →"
      onDone={() => recordStoryKeys(offers.map((q) => npcOfferKey(q.id)))}
    />
  );
}
