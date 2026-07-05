// ── NPCs & Side Quests ───────────────────────────────────────────────────────
// Optional, flavor-rich errands. Crucially, quests don't all appear at once —
// each has a SOURCE that controls how it surfaces:
//
//   'npc'    — offered when you meet the giver in their zone (an encounter
//              scene on zone entry adds it to your log). See useNpcQuestOffers.
//   'job'    — a "help wanted" posting that appears on town job boards only
//              AFTER graduation (Act 2+, i.e. you've reached Zone 5).
//   'unlock' — revealed by another accomplishment: freeing a maestro, clearing
//              a zone boss, finishing a prior quest, or hitting a level.
//
// Objectives reuse existing challenge types so they run through the normal
// ChallengeModal (and Demo Mode). Quests are tracked in character.completedQuests
// and awarded via gameStore.completeSideQuest.

import type { AllyId, Character } from '../types/game';

// Reward tiers map to BASE_XP in gameStore (side_quest_short: 500, _long: 1000).
export type QuestReward = 'side_quest_short' | 'side_quest_long';
export type QuestSource = 'npc' | 'job' | 'unlock';

// Town job boards open once the world has graduated / Act 2 begins.
export const GRADUATION_ZONE = 5;

export interface SideQuest {
  id: string;
  zone: number;             // the zone this quest belongs to
  source: QuestSource;
  giver: string;
  giverEmoji: string;
  giverRole: string;
  title: string;
  hook: string;             // the request, in the NPC's voice
  objective: {
    type: string;           // a ChallengeType routed by ChallengeModal
    title: string;
    description: string;
  };
  reward: QuestReward;
  turnIn: string;

  // 'unlock' gates (all that are set must hold):
  requiresKey?: string;     // a completedChallenges key (boss/story beat)
  requiresAlly?: AllyId;    // a specific freed maestro
  requiresAnyAlly?: boolean;// any freed maestro
  requiresQuest?: string;   // a prior completed side quest (chains)
  minLevel?: number;        // a level threshold
  unlockHint?: string;      // player-facing lead text while still locked
}

export const SIDE_QUESTS: SideQuest[] = [
  // ── Zone 1 · The Rehearsal Halls (NPCs + a quest chain) ─────────────────────
  {
    id: 'sq_z1_squeaky_reed',
    zone: 1, source: 'npc',
    giver: 'Reeda', giverEmoji: '🧹', giverRole: 'Hall custodian',
    title: 'The Squeaky Door',
    hook: "\"Second practice room down — that door's squeaked since I was your age. I've oiled the hinge a hundred times. Maybe it just wants to hear a clean scale for once. Humor an old caretaker?\"",
    objective: {
      type: 'technique_scale',
      title: 'A Clean Scale',
      description: 'Play a steady one-octave scale for the squeaky door.',
    },
    reward: 'side_quest_short',
    turnIn: "The hinge sighs open — smooth, silent. Reeda beams. \"Would you look at that. Forty years and all it needed was somebody who could actually play. Take this for your trouble.\"",
  },
  {
    id: 'sq_z1_reeda_encore',
    zone: 1, source: 'unlock',
    requiresQuest: 'sq_z1_squeaky_reed',
    unlockHint: 'Reeda might have more for you once the squeaky door is handled.',
    giver: 'Reeda', giverEmoji: '🧹', giverRole: 'Hall custodian',
    title: "Reeda's Encore",
    hook: "\"Word's gotten round that you fixed my door with a scale. Now the whole east wing wants the treatment — but the recital bell's the worst of them, flat as a pancake. Ring it true for me?\"",
    objective: {
      type: 'aural_pitch_spy',
      title: 'True the Bell',
      description: 'Find the true pitch of the flat recital bell.',
    },
    reward: 'side_quest_short',
    turnIn: "The bell rings clear down the corridor and Reeda laughs. \"That's the sound I remember from when I started here. You've given an old wing its voice back.\"",
  },
  {
    id: 'sq_z1_metronome',
    zone: 1, source: 'npc',
    giver: 'Tick', giverEmoji: '⏱️', giverRole: 'Keeper of metronomes',
    title: 'Keeping Time',
    hook: "\"The old wind-up metronomes have all drifted out of true, and I can't set them without a steady hand to check against. Tap me a rock-solid pulse and I'll calibrate the whole cabinet.\"",
    objective: {
      type: 'rhythm_performance',
      title: 'A Steady Pulse',
      description: 'Tap the given rhythm cleanly so Tick can calibrate the metronomes.',
    },
    reward: 'side_quest_short',
    turnIn: "Tick sets the last pendulum ticking in lockstep with your pulse and grins. \"Dead on. The whole cabinet thanks you — and so do the first-years who'll never know how bad they had it.\"",
  },

  // ── Zone 2 · The Theory Wing (NPCs) ────────────────────────────────────────
  {
    id: 'sq_z2_misfiled_interval',
    zone: 2, source: 'npc',
    giver: 'Dr. Sol', giverEmoji: '📖', giverRole: 'Theory librarian',
    title: 'The Misfiled Interval',
    hook: "\"Someone reshelved the interval drills by ear instead of by label, and now half my cards are wrong. I need a good set of ears to sort the perfect fifths from the impostors. Care to prove yours?\"",
    objective: {
      type: 'aural_interval_quest',
      title: 'Name That Interval',
      description: 'Identify the intervals by ear to help Dr. Sol re-file the drills.',
    },
    reward: 'side_quest_short',
    turnIn: "Dr. Sol snaps the drawer shut, satisfied. \"Flawless. You hear the distance between notes the way I read it off the page. The archive's in your debt.\"",
  },
  {
    id: 'sq_z2_stage_fright',
    zone: 2, source: 'npc',
    giver: 'Piccola', giverEmoji: '😰', giverRole: 'Nervous first-year',
    title: 'Stage Fright',
    hook: "\"My first solo is next week and I— I freeze up. Could you just… play a phrase for me? Show me it's survivable? If I watch someone do it calmly, maybe I'll believe I can too.\"",
    objective: {
      type: 'prepared_performance',
      title: 'A Calm Phrase',
      description: 'Perform a short phrase steadily, the way Piccola needs to see it done.',
    },
    reward: 'side_quest_short',
    turnIn: "Piccola lets out a long breath. \"You didn't rush. You didn't even look scared.\" She squares her shoulders. \"Okay. Okay. I can do that. Thank you — really.\"",
  },

  // ── Zone 3 · The City of Concerta (NPCs) ───────────────────────────────────
  {
    id: 'sq_z3_busker',
    zone: 3, source: 'npc',
    giver: 'Bellamy', giverEmoji: '🎩', giverRole: 'Concerta street busker',
    title: 'Street Harmony',
    hook: "\"Contest crowds are the best tippers all year, but my ear's gone rusty and I keep losing the tune under the noise. Trade me — match the melody I busk and I'll teach you where the good corners are.\"",
    objective: {
      type: 'aural_melody_mapper',
      title: 'Catch the Tune',
      description: 'Follow and map the melody Bellamy plays over the crowd.',
    },
    reward: 'side_quest_short',
    turnIn: "Bellamy tips his hat, coins rattling. \"Sharp ears, kid. You caught it clean through all that racket. Here — a busker always pays a better busker.\"",
  },
  {
    id: 'sq_z3_vendor_fanfare',
    zone: 3, source: 'npc',
    giver: 'Coda', giverEmoji: '🥨', giverRole: 'Festival food vendor',
    title: 'Fanfare for the Pretzel Cart',
    hook: "\"Everybody flocks to the guild-hall stalls and forgets my cart in the side lane. You Academy types have lungs — give my corner a proper fanfare and turn some heads this way, would you?\"",
    objective: {
      type: 'prepared_performance',
      title: 'A Vendor’s Fanfare',
      description: 'Perform a bright, carrying fanfare to draw the festival crowd.',
    },
    reward: 'side_quest_short',
    turnIn: "Heads turn; a line forms in seconds. Coda shoves a warm pretzel and a fistful of coins at you. \"Best marketing I ever bought. Come back hungry.\"",
  },

  // ── Zone 4 · The Grand Auditorium (NPC) ────────────────────────────────────
  {
    id: 'sq_z4_tune_the_hall',
    zone: 4, source: 'npc',
    giver: 'Rustle', giverEmoji: '🎭', giverRole: 'Auditorium stagehand',
    title: 'Tuning the Hall',
    hook: "\"Before graduation I have to check the house for dead spots — corners where the sound goes flat. I can move the panels, but I need someone who can hear a pitch drift by a hair. That you?\"",
    objective: {
      type: 'aural_pitch_spy',
      title: 'Spot the Drift',
      description: 'Pick out the pitch that sits slightly off so Rustle can set the panels.',
    },
    reward: 'side_quest_short',
    turnIn: "Rustle marks the last panel and steps back. \"There. The whole hall rings true now. Your class is going to sound incredible up there — partly thanks to you.\"",
  },

  // ── Zone 5 · Melodious Meadows / Legato ────────────────────────────────────
  {
    id: 'sq_z5_grey_meadow',
    zone: 5, source: 'npc',
    giver: 'Bassetto', giverEmoji: '🎻', giverRole: 'Elder of Legato',
    title: 'The Grey Meadow',
    hook: "\"Since the Shattering our meadow's gone grey and tuneless — the very grass forgot its key. The old songs might wake it, but my hands shake too badly to lead. Play the village its scale, traveler. Loud and true.\"",
    objective: {
      type: 'technique_scale',
      title: 'Wake the Meadow',
      description: 'Play the village scale strong and steady to stir the colour back into Legato.',
    },
    reward: 'side_quest_long',
    turnIn: "Green ripples out from where you stand, the grass swaying into time. Bassetto weeps openly. \"It remembers. WE remember. Bless you, child — take an elder's thanks and a hero's share.\"",
  },
  {
    id: 'sq_z5_shepherd_lullaby',
    zone: 5, source: 'job',
    giver: 'Cadenza', giverEmoji: '🐑', giverRole: 'Meadow shepherd',
    title: "The Lambs' Lullaby",
    hook: "\"[Posted on the Legato notice-board] Flock scattered by the discord. They'll only come home to the old lullaby, and I never learned to carry a tune. Fair pay to any traveler who can sing them back. — Cadenza\"",
    objective: {
      type: 'prepared_performance',
      title: 'A Gentle Lullaby',
      description: 'Perform the lullaby softly and evenly to call the lambs home.',
    },
    reward: 'side_quest_short',
    turnIn: "One by one the lambs trot out of the grey and press against Cadenza's legs. \"There you are, there you are,\" she murmurs, then to you: \"You've a shepherd's touch. Take this with my thanks.\"",
  },
  {
    id: 'sq_z5_freed_gratitude',
    zone: 5, source: 'unlock',
    requiresAnyAlly: true,
    unlockHint: 'Free a captive maestro, and grateful townsfolk may seek you out.',
    giver: 'Legato Choir', giverEmoji: '🎶', giverRole: 'Villagers of Legato',
    title: 'A Song of Thanks',
    hook: "\"You freed one of the great voices — we felt the corruption loosen its grip the moment you did. The village wants to sing you a proper thank-you, but our harmony's rusty. Lead us, and we'll raise the roof in your name.\"",
    objective: {
      type: 'aural_chord_oracle',
      title: 'Lead the Harmony',
      description: 'Name the villagers’ chords so the choir can find its harmony again.',
    },
    reward: 'side_quest_long',
    turnIn: "The choir swells into full, ringing harmony — the first true chord Legato has managed since the Shattering. They lift you onto their shoulders. \"For the one who gave a maestro back to the world!\"",
  },

  // ── Zone 6 · Sands of Time (job + boss unlock) ─────────────────────────────
  {
    id: 'sq_z6_mirage_rhythm',
    zone: 6, source: 'job',
    giver: 'Ostia', giverEmoji: '🌵', giverRole: 'Octoasis water-keeper',
    title: 'Mirage Rhythm',
    hook: "\"[Nailed to the oasis post] Echoes in the dunes answer a beat late and lead caravans in circles. Echo the oasis bells back true and the road out will hold. Water and coin to whoever can. — Ostia\"",
    objective: {
      type: 'aural_rhythm_echo',
      title: 'Echo the Bells',
      description: 'Listen and echo the rhythm back exactly to settle the oasis bells.',
    },
    reward: 'side_quest_short',
    turnIn: "The bells fall into a single clean pulse and the shimmering road firms underfoot. Ostia fills your canteen to the brim. \"Now the caravans get home. Water's the least I owe you.\"",
  },
  {
    id: 'sq_z6_hourglass',
    zone: 6, source: 'unlock',
    requiresKey: 'z6_claribel_freed',
    unlockHint: 'The sand-clocks may run again once the desert’s maestro is freed.',
    giver: 'Chronomer', giverEmoji: '⌛', giverRole: 'Keeper of the sand-clocks',
    title: 'The Cracked Hourglass',
    hook: "\"With the maestro's grip broken, time runs forward here again — but my great hourglass is stuck mid-turn. A scale in strict tempo could coax the sand loose. Would you set the hours flowing?\"",
    objective: {
      type: 'technique_scale',
      title: 'Set Time Flowing',
      description: 'Play a metronome-strict scale to free the stalled sand-clock.',
    },
    reward: 'side_quest_long',
    turnIn: "Sand streams free; the great glass turns with a groan like a held breath released. \"The hours move,\" Chronomer whispers. \"You gave the desert back its tomorrow. Take this — it kept good time once.\"",
  },

  // ── Zone 7 · Clef Cliffs (job + NPC) ───────────────────────────────────────
  {
    id: 'sq_z7_cliff_echo',
    zone: 7, source: 'job',
    giver: 'Piton', giverEmoji: '🧗', giverRole: 'Cliff-outpost ranger',
    title: 'Echo Off the Cliffs',
    hook: "\"[Ranger-post bounty] Signal-song line is down — the cliffs throw our calls back wrong since the corruption crept in. Trade calls until the echo answers true and the line's restored. Standing reward. — Ranger Piton\"",
    objective: {
      type: 'aural_rhythm_echo',
      title: 'Trade the Signal',
      description: 'Echo the ranger calls back precisely to repair the signal line.',
    },
    reward: 'side_quest_long',
    turnIn: "Your call rings out and comes back clean, gorge to gorge. Piton claps you on the shoulder. \"That's it — the line's live again. Half the outpost would've fallen without it. You've earned this.\"",
  },
  {
    id: 'sq_z7_players_pass',
    zone: 7, source: 'npc',
    giver: 'Sforza', giverEmoji: '🪕', giverRole: "Player's Pass toll-minstrel",
    title: 'The Toll of the Pass',
    hook: "\"Player's Pass has an old law: none cross without leaving music behind. I'd waive it for you, but the mountain wouldn't — read the toll-song off the standing stone and the way opens.\"",
    objective: {
      type: 'sight_reading',
      title: 'Read the Toll-Song',
      description: 'Sight-read the toll-song carved into the standing stone.',
    },
    reward: 'side_quest_short',
    turnIn: "The stone hums; the pass exhales a cold, clean wind. Sforza bows. \"First-read, no less. The mountain's satisfied — and so am I. Safe roads.\"",
  },

  // ── Zone 8 · Forgotten Forest (NPC + job) ──────────────────────────────────
  {
    id: 'sq_z8_held_note',
    zone: 8, source: 'npc',
    giver: 'Fermata', giverEmoji: '🌲', giverRole: 'Hermit of the deep wood',
    title: 'The Held Note',
    hook: "\"I have waited in this wood so long I forgot what I was waiting for. They say a single note, held true and unwavering, can end a fermata. Play me my release, traveler — and let this old silence finally resolve.\"",
    objective: {
      type: 'prepared_performance',
      title: 'Resolve the Fermata',
      description: 'Hold one long, steady, unwavering phrase to release the hermit.',
    },
    reward: 'side_quest_long',
    turnIn: "The note lands and holds and finally falls — and the hermit smiles like a door unlocking. \"Resolved. At last.\" He presses something old and warm into your hand and fades gently into the green.",
  },
  {
    id: 'sq_z8_lost_chord',
    zone: 8, source: 'job',
    giver: 'Verdaine', giverEmoji: '🍄', giverRole: 'Forager of the forest',
    title: 'The Lost Chord',
    hook: "\"[Carved on a mushroom-ring marker] Three trees ring one chord when the wind's right — but a voice went sour and the grove sounds haunted. Name the bad note and I'll coax it back. Forager's bounty to a good ear. — Verdaine\"",
    objective: {
      type: 'aural_chord_oracle',
      title: 'Read the Grove-Chord',
      description: 'Hear the chord and identify it so Verdaine can coax the grove back in tune.',
    },
    reward: 'side_quest_short',
    turnIn: "Verdaine adjusts a bent branch and the grove rings pure again. \"That's the one. The forest's been off-key for a season and you fixed it in a breath. The wood remembers kindness — here.\"",
  },
];

export const SIDE_QUEST_BY_ID: Record<string, SideQuest> =
  Object.fromEntries(SIDE_QUESTS.map((q) => [q.id, q]));

// ── Triggering & availability ────────────────────────────────────────────────

// The story key an NPC encounter records when it offers a quest.
export const npcOfferKey = (questId: string) => `npc_offer_${questId}`;

export function isQuestDone(quest: SideQuest, character: Character): boolean {
  return character.completedQuests.includes(quest.id);
}

function unlockSatisfied(quest: SideQuest, character: Character): boolean {
  if (quest.requiresKey && !character.completedChallenges.includes(quest.requiresKey)) return false;
  if (quest.requiresAlly && !character.freedAllies.includes(quest.requiresAlly)) return false;
  if (quest.requiresAnyAlly && character.freedAllies.length === 0) return false;
  if (quest.requiresQuest && !character.completedQuests.includes(quest.requiresQuest)) return false;
  if (quest.minLevel && character.level < quest.minLevel) return false;
  return true;
}

// Has this quest's SOURCE fired — i.e. is it in the player's active log?
export function questActive(quest: SideQuest, character: Character): boolean {
  if (isQuestDone(quest, character)) return false;
  switch (quest.source) {
    case 'job':
      // Town job boards open post-graduation, at or past the quest's zone.
      return character.currentZone >= GRADUATION_ZONE && character.currentZone >= quest.zone;
    case 'npc':
      // Only after meeting the NPC (encounter scene recorded the offer key).
      return character.completedChallenges.includes(npcOfferKey(quest.id));
    case 'unlock':
      return character.currentZone >= quest.zone && unlockSatisfied(quest, character);
  }
}

export function activeQuests(character: Character): SideQuest[] {
  return SIDE_QUESTS.filter((q) => questActive(q, character));
}

export function activeQuestCount(character: Character): number {
  return activeQuests(character).length;
}

// Quests the player knows exist but hasn't triggered yet (shown as vague leads).
export function questIsLead(quest: SideQuest, character: Character): boolean {
  return !isQuestDone(quest, character) && !questActive(quest, character);
}

// NPC quests to OFFER on entering a zone: this zone's npc quests, reached,
// not yet offered, not done. Recorded via npcOfferKey so they don't re-fire.
export function pendingNpcOffers(zoneId: number, character: Character): SideQuest[] {
  return SIDE_QUESTS.filter(
    (q) =>
      q.source === 'npc' &&
      q.zone === zoneId &&
      character.currentZone >= q.zone &&
      !character.completedChallenges.includes(npcOfferKey(q.id)) &&
      !isQuestDone(q, character),
  );
}

// Human label for a quest's source, for the log UI.
export const SOURCE_LABEL: Record<QuestSource, string> = {
  npc: '🗣️ Favor',
  job: '📋 Town Job',
  unlock: '✨ Unlocked',
};
