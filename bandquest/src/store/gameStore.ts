import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Character, Classroom, AllyId } from '../types/game';
import type { Rating } from '../types/game';
import { RATING_XP_MULTIPLIERS, RATING_RP_AWARD } from '../types/game';
import { xpToNextLevel } from '../lib/instruments';

interface GameState {
  character: Character | null;
  classroom: Classroom | null;
  loading: boolean;

  loadCharacter: (userId: string) => Promise<void>;
  loadClassroom: (classroomId: string) => Promise<void>;
  awardChallenge: (challengeId: string, challengeType: string, score: number, rating: Rating) => Promise<void>;
  freeAlly: (allyId: AllyId) => Promise<void>;
  spendResonancePoints: (amount: number) => void;
  completeBootCampStep: (stepId: string) => Promise<void>;
  setCharacter: (character: Character | null) => void;
}

const BASE_XP: Record<string, number> = {
  performance: 150,
  aural: 75,
  mini_boss: 600,
  zone_boss: 1500,
  side_quest_short: 500,
  side_quest_long: 1000,
};

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
      set({ character: dbRowToCharacter(data) });
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
          currentZone: data.current_zone,
          baseInstrumentsOnly: data.base_instruments_only,
          createdAt: data.created_at,
        },
      });
    }
  },

  awardChallenge: async (challengeId, challengeType, score, rating) => {
    const { character } = get();
    if (!character) return;

    const baseXp = BASE_XP[challengeType] ?? 150;
    const xpAwarded = Math.round(baseXp * RATING_XP_MULTIPLIERS[rating]);
    const rpAwarded = RATING_RP_AWARD[rating];

    // Insert challenge result
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

    // Update character locally first (optimistic)
    const newXp = character.xp + xpAwarded;
    const newRp = character.resonancePoints + rpAwarded;
    let newLevel = character.level;
    let remainingXp = newXp;

    while (remainingXp >= xpToNextLevel(newLevel)) {
      remainingXp -= xpToNextLevel(newLevel);
      newLevel += 1;
    }

    const completedChallenges = character.completedChallenges.includes(challengeId)
      ? character.completedChallenges
      : [...character.completedChallenges, challengeId];

    const updatedCharacter = {
      ...character,
      xp: remainingXp,
      level: newLevel,
      resonancePoints: newRp,
      completedChallenges,
    };

    set({ character: updatedCharacter });

    // Persist to Supabase
    await supabase
      .from('characters')
      .update({
        xp: remainingXp,
        level: newLevel,
        resonance_points: newRp,
        completed_challenges: completedChallenges,
        total_attempts: character.completedChallenges.length + 1,
        weekly_xp: (character as any).weeklyXp + xpAwarded,
      })
      .eq('id', character.id);
  },

  freeAlly: async (allyId: AllyId) => {
    const { character } = get();
    if (!character || character.freedAllies.includes(allyId)) return;

    const freedAllies = [...character.freedAllies, allyId];
    set({ character: { ...character, freedAllies } });

    await supabase
      .from('characters')
      .update({ freed_allies: freedAllies })
      .eq('id', character.id);
  },

  spendResonancePoints: (amount) => {
    const { character } = get();
    if (!character || character.resonancePoints < amount) return;
    const newRp = character.resonancePoints - amount;
    set({ character: { ...character, resonancePoints: newRp } });
    supabase
      .from('characters')
      .update({ resonance_points: newRp })
      .eq('id', character.id);
  },

  completeBootCampStep: async (stepId) => {
    const { character } = get();
    if (!character) return;

    await supabase.from('boot_camp_progress').upsert({
      character_id: character.id,
      step_id: stepId,
      completed: true,
      completed_at: new Date().toISOString(),
    });
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
    gear: (row.gear as Character['gear']) ?? {},
    freedAllies: ((row.freed_allies as string[]) ?? []) as AllyId[],
    completedChallenges: (row.completed_challenges as string[]) ?? [],
    completedQuests: (row.completed_quests as string[]) ?? [],
    bootCampComplete: row.boot_camp_complete as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
