import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Character, Classroom, AllyId, ZoneId, GearItem, Appearance } from '../types/game';
import type { Rating } from '../types/game';
import { RATING_XP_MULTIPLIERS, RATING_RP_AWARD } from '../types/game';
import { xpToNextLevel, INSTRUMENTS } from '../lib/instruments';
import { normalizeAppearance, randomAppearance } from '../lib/appearance';
import { getBossGearDrop, normalizeGear, getStartingGear } from '../lib/gear';
import { useUiStore } from './uiStore';

// ── Guest Mode persistence ──────────────────────────────────────────────────────
const GUEST_CHAR_KEY = 'bq_guest_character';
function isGuest(): boolean { return useUiStore.getState().guest; }
function saveGuest(c: Character | null) {
  try {
    if (c) localStorage.setItem(GUEST_CHAR_KEY, JSON.stringify(c));
    else localStorage.removeItem(GUEST_CHAR_KEY);
  } catch { /* ignore */ }
}
// Persist a character change: localStorage for guests, Supabase otherwise.
async function persistChar(updated: Character, columns: Record<string, unknown>) {
  if (isGuest()) { saveGuest(updated); return; }
  await supabase.from('characters').update(columns).eq('id', updated.id);
}

interface GameState {
  character: Character | null;
  classroom: Classroom | null;
  loading: boolean;

  loadCharacter: (userId: string) => Promise<void>;
  loadClassroom: (classroomId: string) => Promise<void>;
  awardChallenge: (challengeId: string, challengeType: string, score: number, rating: Rating, opts?: { xpMultiplier?: number; trackCompletion?: boolean }) => Promise<void>;
  advanceZone: (newZone: ZoneId) => Promise<void>;
  advanceClassroomZone: (newZone: ZoneId) => Promise<void>;
  equipGear: (item: GearItem) => Promise<void>;
  freeAlly: (allyId: AllyId) => Promise<void>;
  spendResonancePoints: (amount: number) => void;
  spendCoins: (amount: number) => Promise<boolean>;
  awardBossGear: (bossId: string) => Promise<GearItem | null>;
  completeBootCampStep: (stepId: string) => Promise<void>;
  saveAppearance: (appearance: Appearance) => Promise<void>;
  addSummonPoints: (delta: number) => Promise<void>;
  // Mark story moments seen (e.g. classmate recruitment) — no XP, just keys.
  recordStoryKeys: (keys: string[]) => Promise<void>;
  // Turn in a side quest: award its reward-tier XP/coins and record it in
  // completedQuests (distinct from challenge completion).
  completeSideQuest: (questId: string, rewardType: string, score: number, rating: Rating) => Promise<void>;
  setCharacter: (character: Character | null) => void;

  // Guest Mode (no account; character persists to localStorage)
  createGuestCharacter: (instrument: Character['instrument'], displayName: string) => void;
  loadGuestCharacter: () => boolean;
  exitGuest: () => void;
}

const BASE_XP: Record<string, number> = {
  performance: 150,
  aural: 75,
  mini_boss: 600,
  zone_boss: 1500,
  side_quest_short: 500,
  side_quest_long: 1000,
};

const COIN_PER_RATING: Record<Rating, number> = {
  superior: 5, excellent: 4, good: 3, fair: 2, poor: 1,
};
const COIN_BOSS_BONUS: Record<string, number> = {
  mini_boss: 15,
  zone_boss: 40,
};

// Compute stats for a given level using base stats + growth per level
function computeStatsAtLevel(
  instrument: Character['instrument'],
  level: number,
): Character['stats'] {
  const def = INSTRUMENTS[instrument];
  const levelsGained = level - 1;
  return {
    power:     Math.round(def.baseStats.power     + def.statGrowth.power     * levelsGained),
    accuracy:  Math.round(def.baseStats.accuracy  + def.statGrowth.accuracy  * levelsGained),
    technique: Math.round(def.baseStats.technique + def.statGrowth.technique * levelsGained),
    endurance: Math.round(def.baseStats.endurance + def.statGrowth.endurance * levelsGained),
  };
}

export const useGameStore = create<GameState>((set, get) => ({
  character: null,
  classroom: null,
  loading: false,

  setCharacter: (character) => set({ character }),

  loadCharacter: async (userId: string) => {
    set({ loading: true });
    const { data } = await supabase
      .from('characters')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (data) {
      const char = dbRowToCharacter(data);
      set({ character: char });
      // Load classroom alongside character
      if (char.classroomId) {
        get().loadClassroom(char.classroomId);
      }
    }
    set({ loading: false });
  },

  loadClassroom: async (classroomId: string) => {
    const { data } = await supabase
      .from('classrooms')
      .select('*')
      .eq('id', classroomId)
      .single();

    if (data) {
      set({
        classroom: {
          id: data.id,
          teacherId: data.teacher_id,
          name: data.name,
          period: data.period ?? '',
          joinCode: data.join_code,
          currentZone: data.current_zone as ZoneId,
          baseInstrumentsOnly: data.base_instruments_only,
          createdAt: data.created_at,
        },
      });
    }
  },

  awardChallenge: async (challengeId, challengeType, score, rating, opts) => {
    const { character } = get();
    if (!character) return;

    const xpMult = opts?.xpMultiplier ?? 1.0;
    const trackCompletion = opts?.trackCompletion ?? true;
    const baseXp = BASE_XP[challengeType] ?? 150;
    const xpAwarded = Math.round(baseXp * RATING_XP_MULTIPLIERS[rating] * xpMult);
    const rpAwarded = RATING_RP_AWARD[rating];
    const coinsAwarded = COIN_PER_RATING[rating] + (COIN_BOSS_BONUS[challengeType] ?? 0);

    // Insert challenge result (skipped for guests — no DB)
    if (!isGuest()) {
      await supabase.from('challenge_results').insert({
        character_id: character.id,
        classroom_id: character.classroomId,
        challenge_id: challengeId,
        challenge_type: challengeType,
        rating,
        score,
        xp_awarded: xpAwarded,
        rp_awarded: rpAwarded,
      });
    }

    // Compute new level from total XP
    const newXp = character.xp + xpAwarded;
    const newRp = character.resonancePoints + rpAwarded;
    const newCoins = character.resonanceCoins + coinsAwarded;
    let newLevel = character.level;
    let remainingXp = newXp;

    while (remainingXp >= xpToNextLevel(newLevel)) {
      remainingXp -= xpToNextLevel(newLevel);
      newLevel = Math.min(100, newLevel + 1);
    }

    const didLevelUp = newLevel > character.level;

    // Recompute stats if level changed
    const newStats = didLevelUp
      ? computeStatsAtLevel(character.instrument, newLevel)
      : character.stats;

    // HP scales with endurance: maxHp = endurance * 5
    const newMaxHp = newStats.endurance * 5;
    // Keep HP ratio when leveling up, capped at new max
    const newHp = didLevelUp
      ? Math.min(newMaxHp, Math.round((character.hp / character.maxHp) * newMaxHp))
      : character.hp;

    const completedChallenges = (trackCompletion && !character.completedChallenges.includes(challengeId))
      ? [...character.completedChallenges, challengeId]
      : character.completedChallenges;

    const updatedCharacter: Character = {
      ...character,
      xp: remainingXp,
      xpToNextLevel: xpToNextLevel(newLevel),
      level: newLevel,
      resonancePoints: newRp,
      resonanceCoins: newCoins,
      stats: newStats,
      hp: newHp,
      maxHp: newMaxHp,
      completedChallenges,
      totalAttempts: character.totalAttempts + 1,
      weeklyXp: character.weeklyXp + xpAwarded,
    };

    set({ character: updatedCharacter });

    // Persist everything (Supabase, or localStorage for guests)
    await persistChar(updatedCharacter, {
      xp: remainingXp,
      level: newLevel,
      resonance_points: newRp,
      resonance_coins: newCoins,
      completed_challenges: completedChallenges,
      total_attempts: character.totalAttempts + 1,
      weekly_xp: character.weeklyXp + xpAwarded,
      // Stats (updated on level-up)
      ...(didLevelUp ? {
        power: newStats.power,
        accuracy: newStats.accuracy,
        technique: newStats.technique,
        endurance: newStats.endurance,
        max_hp: newMaxHp,
        hp: newHp,
      } : {}),
    });
  },

  advanceZone: async (newZone: ZoneId) => {
    const { character } = get();
    if (!character || newZone <= character.currentZone) return;

    const updated = { ...character, currentZone: newZone };
    set({ character: updated });
    await persistChar(updated, { current_zone: newZone });
  },

  advanceClassroomZone: async (newZone: ZoneId) => {
    const { classroom } = get();
    if (!classroom || newZone <= classroom.currentZone) return;

    const updated = { ...classroom, currentZone: newZone };
    set({ classroom: updated });

    await supabase
      .from('classrooms')
      .update({ current_zone: newZone })
      .eq('id', classroom.id);
  },

  equipGear: async (item: GearItem) => {
    const { character } = get();
    if (!character) return;
    const newGear = { ...character.gear, [item.slot]: item };
    const updated = { ...character, gear: newGear };
    set({ character: updated });
    await persistChar(updated, { gear: newGear });
  },

  freeAlly: async (allyId: AllyId) => {
    const { character } = get();
    if (!character || character.freedAllies.includes(allyId)) return;

    const freedAllies = [...character.freedAllies, allyId];
    const updated = { ...character, freedAllies };
    set({ character: updated });
    await persistChar(updated, { freed_allies: freedAllies });
  },

  spendResonancePoints: (amount) => {
    const { character } = get();
    if (!character || character.resonancePoints < amount) return;
    const newRp = character.resonancePoints - amount;
    const updated = { ...character, resonancePoints: newRp };
    set({ character: updated });
    if (isGuest()) saveGuest(updated);
    else supabase.from('characters').update({ resonance_points: newRp }).eq('id', character.id);
  },

  spendCoins: async (amount) => {
    const { character } = get();
    if (!character || character.resonanceCoins < amount) return false;
    const newCoins = character.resonanceCoins - amount;
    const updated = { ...character, resonanceCoins: newCoins };
    set({ character: updated });
    await persistChar(updated, { resonance_coins: newCoins });
    return true;
  },

  awardBossGear: async (bossId) => {
    const { character, equipGear } = get();
    if (!character) return null;
    const item = getBossGearDrop(bossId, character);
    if (!item) return null;
    await equipGear(item);
    return item;
  },

  completeBootCampStep: async (stepId) => {
    const { character } = get();
    if (!character || isGuest()) return; // guests skip boot camp / DB

    await supabase.from('boot_camp_progress').upsert({
      character_id: character.id,
      step_id: stepId,
      completed: true,
      completed_at: new Date().toISOString(),
    });
  },

  saveAppearance: async (appearance: Appearance) => {
    const { character } = get();
    if (!character) return;
    const updated = { ...character, appearance };
    set({ character: updated });
    await persistChar(updated, { appearance });
  },

  addSummonPoints: async (delta) => {
    const { character } = get();
    if (!character) return;
    const newSp = Math.max(0, character.summonPoints + delta);
    const updated = { ...character, summonPoints: newSp };
    set({ character: updated });
    await persistChar(updated, { summon_points: newSp });
  },

  recordStoryKeys: async (keys) => {
    const { character } = get();
    if (!character) return;
    const add = keys.filter((k) => !character.completedChallenges.includes(k));
    if (add.length === 0) return;
    const completedChallenges = [...character.completedChallenges, ...add];
    const updated = { ...character, completedChallenges };
    set({ character: updated });
    await persistChar(updated, { completed_challenges: completedChallenges });
  },

  completeSideQuest: async (questId, rewardType, _score, rating) => {
    const { character } = get();
    if (!character) return;
    if (character.completedQuests.includes(questId)) return;

    // XP/coins mirror awardChallenge, keyed off the quest's reward tier.
    const baseXp = BASE_XP[rewardType] ?? BASE_XP.side_quest_short;
    const xpAwarded = Math.round(baseXp * RATING_XP_MULTIPLIERS[rating]);
    const rpAwarded = RATING_RP_AWARD[rating];
    const coinsAwarded = COIN_PER_RATING[rating];

    const newXp = character.xp + xpAwarded;
    let newLevel = character.level;
    let remainingXp = newXp;
    while (remainingXp >= xpToNextLevel(newLevel)) {
      remainingXp -= xpToNextLevel(newLevel);
      newLevel = Math.min(100, newLevel + 1);
    }
    const didLevelUp = newLevel > character.level;
    const newStats = didLevelUp
      ? computeStatsAtLevel(character.instrument, newLevel)
      : character.stats;
    const newMaxHp = newStats.endurance * 5;
    const newHp = didLevelUp
      ? Math.min(newMaxHp, Math.round((character.hp / character.maxHp) * newMaxHp))
      : character.hp;

    const completedQuests = [...character.completedQuests, questId];
    const updated: Character = {
      ...character,
      xp: remainingXp,
      xpToNextLevel: xpToNextLevel(newLevel),
      level: newLevel,
      resonancePoints: character.resonancePoints + rpAwarded,
      resonanceCoins: character.resonanceCoins + coinsAwarded,
      stats: newStats,
      hp: newHp,
      maxHp: newMaxHp,
      completedQuests,
      totalAttempts: character.totalAttempts + 1,
      weeklyXp: character.weeklyXp + xpAwarded,
    };
    set({ character: updated });
    await persistChar(updated, {
      xp: remainingXp,
      level: newLevel,
      resonance_points: updated.resonancePoints,
      resonance_coins: updated.resonanceCoins,
      completed_quests: completedQuests,
      total_attempts: updated.totalAttempts,
      weekly_xp: updated.weeklyXp,
      ...(didLevelUp ? {
        power: newStats.power,
        accuracy: newStats.accuracy,
        technique: newStats.technique,
        endurance: newStats.endurance,
        max_hp: newMaxHp,
        hp: newHp,
      } : {}),
    });
  },

  // ── Guest Mode ────────────────────────────────────────────────────────────────
  createGuestCharacter: (instrument, displayName) => {
    const stats = computeStatsAtLevel(instrument, 1);
    const maxHp = stats.endurance * 5;
    const now = new Date().toISOString();
    const char: Character = {
      id: 'guest', userId: 'guest', classroomId: '',
      displayName: displayName.trim() || 'Guest',
      instrument, level: 1, xp: 0, xpToNextLevel: xpToNextLevel(1), currentZone: 1,
      stats, hp: maxHp, maxHp,
      resonancePoints: 0, resonanceCoins: 0, summonPoints: 0,
      gear: normalizeGear(getStartingGear(instrument), instrument),
      freedAllies: [], completedChallenges: [], completedQuests: [],
      bootCampComplete: true, // guests skip boot camp and start in the world
      totalAttempts: 0, weeklyXp: 0, suspended: false,
      appearance: randomAppearance('guest'),
      createdAt: now, updatedAt: now,
    };
    useUiStore.getState().setGuest(true);
    set({ character: char, classroom: null, loading: false });
    saveGuest(char);
  },

  loadGuestCharacter: () => {
    try {
      const s = localStorage.getItem(GUEST_CHAR_KEY);
      if (!s) return false;
      set({ character: JSON.parse(s) as Character, classroom: null, loading: false });
      return true;
    } catch {
      return false;
    }
  },

  exitGuest: () => {
    saveGuest(null);
    useUiStore.getState().setGuest(false);
    set({ character: null, classroom: null });
  },
}));

function dbRowToCharacter(row: Record<string, unknown>): Character {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    classroomId: row.classroom_id as string,
    displayName: row.display_name as string,
    instrument: row.instrument as Character['instrument'],
    level: row.level as number,
    xp: row.xp as number,
    xpToNextLevel: xpToNextLevel(row.level as number),
    currentZone: row.current_zone as Character['currentZone'],
    stats: {
      power: row.power as number,
      accuracy: row.accuracy as number,
      technique: row.technique as number,
      endurance: row.endurance as number,
    },
    hp: row.hp as number,
    maxHp: row.max_hp as number,
    resonancePoints: row.resonance_points as number,
    resonanceCoins: (row.resonance_coins as number) ?? 0,
    summonPoints: (row.summon_points as number) ?? 0,
    gear: normalizeGear((row.gear as Partial<Record<string, GearItem>>) ?? {}, row.instrument as Character['instrument']),
    freedAllies: ((row.freed_allies as string[]) ?? []) as AllyId[],
    completedChallenges: (row.completed_challenges as string[]) ?? [],
    completedQuests: (row.completed_quests as string[]) ?? [],
    bootCampComplete: row.boot_camp_complete as boolean,
    // Extra fields stored in DB but not in core Character type — keep for gameStore logic
    totalAttempts: (row.total_attempts as number) ?? 0,
    weeklyXp: (row.weekly_xp as number) ?? 0,
    suspended: (row.suspended as boolean) ?? false,
    appearance: normalizeAppearance(row.appearance),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
