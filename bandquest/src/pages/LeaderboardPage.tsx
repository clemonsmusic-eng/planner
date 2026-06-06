import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { INSTRUMENTS, getInstrumentColor } from '../lib/instruments';
import Avatar from '../components/Avatar';
import { normalizeAppearance } from '../lib/appearance';
import type { InstrumentId } from '../types/game';

type TabId = 'overall' | 'this_week' | 'boss_victories' | 'streak' | 'ensemble';

interface LeaderEntry {
  id: string;
  displayName: string;
  instrument: InstrumentId;
  level: number;
  weeklyXp: number;
  bossVictories: number;
  practiceStreak: number;
  ensembleTechs: number;
  appearance: unknown;
  isMe: boolean;
}

export default function LeaderboardPage() {
  const { user } = useAuthStore();
  const { character } = useGameStore();
  const navigate = useNavigate();

  const [tab, setTab] = useState<TabId>('overall');
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!character) return;
    loadLeaderboard(character.classroomId);
  }, [character]);

  // Real-time subscription
  useEffect(() => {
    if (!character) return;
    const channel = supabase
      .channel(`leaderboard:${character.classroomId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'characters', filter: `classroom_id=eq.${character.classroomId}` },
        () => loadLeaderboard(character.classroomId),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [character]);

  async function loadLeaderboard(classroomId: string) {
    const { data } = await supabase
      .from('characters')
      .select('id, display_name, instrument, level, weekly_xp, boss_victories, practice_streak, ensemble_techs, appearance, user_id')
      .eq('classroom_id', classroomId);

    if (data) {
      setEntries(data.map((d) => ({
        id: d.id,
        displayName: d.display_name,
        instrument: d.instrument as InstrumentId,
        level: d.level,
        weeklyXp: d.weekly_xp ?? 0,
        bossVictories: d.boss_victories ?? 0,
        practiceStreak: d.practice_streak ?? 0,
        ensembleTechs: d.ensemble_techs ?? 0,
        appearance: d.appearance,
        isMe: d.user_id === user?.id,
      })));
    }
    setLoading(false);
  }

  function getSortedEntries(): LeaderEntry[] {
    const sorted = [...entries];
    switch (tab) {
      case 'overall':
        return sorted.sort((a, b) => b.level - a.level || b.weeklyXp - a.weeklyXp);
      case 'this_week':
        return sorted.sort((a, b) => b.weeklyXp - a.weeklyXp);
      case 'boss_victories':
        return sorted.sort((a, b) => b.bossVictories - a.bossVictories);
      case 'streak':
        return sorted.sort((a, b) => b.practiceStreak - a.practiceStreak);
      case 'ensemble':
        return sorted.sort((a, b) => b.ensembleTechs - a.ensembleTechs);
    }
  }

  function getMetric(entry: LeaderEntry): string {
    switch (tab) {
      case 'overall': return `Lv.${entry.level}`;
      case 'this_week': return `${entry.weeklyXp} XP`;
      case 'boss_victories': return `${entry.bossVictories} wins`;
      case 'streak': return `${entry.practiceStreak}d`;
      case 'ensemble': return `${entry.ensembleTechs}`;
    }
  }

  const tabLabels: Record<TabId, string> = {
    overall: 'Overall',
    this_week: 'This Week',
    boss_victories: 'Boss Wins',
    streak: 'Streak',
    ensemble: 'Ensemble',
  };

  const sorted = getSortedEntries();

  return (
    <div className="min-h-screen pb-10">
      <div className="sticky top-0 z-20 bg-academy-dark/95 backdrop-blur-sm border-b border-academy-gold/10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/hub')} className="text-academy-cream/40 hover:text-academy-cream/80 text-sm">
          ← Hub
        </button>
        <div className="fantasy-title text-lg text-academy-gold flex-1 text-center">Class Leaderboard</div>
        <div className="w-12" />
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4">
        {/* Tab pills */}
        <div className="flex gap-1 bg-black/30 rounded-lg p-1 mb-6 overflow-x-auto scrollbar-hide">
          {(Object.keys(tabLabels) as TabId[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 min-w-max py-2 px-2 rounded-md text-xs font-fantasy whitespace-nowrap transition-all
                ${tab === t ? 'bg-academy-gold/20 text-academy-gold' : 'text-academy-cream/50 hover:text-academy-cream/80'}`}
            >
              {tabLabels[t]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-academy-cream/40 py-16">Loading…</div>
        ) : sorted.length === 0 ? (
          <div className="text-center text-academy-cream/40 py-16">No classmates yet.</div>
        ) : (
          <div className="space-y-2">
            {sorted.map((entry, i) => {
              const color = getInstrumentColor(entry.instrument);
              const rankStyle = i === 0
                ? 'text-rating-superior'
                : i === 1
                ? 'text-slate-400'
                : i === 2
                ? 'text-amber-600'
                : 'text-academy-cream/30';

              return (
                <div
                  key={entry.id}
                  className={`card-panel flex items-center gap-3 py-3 transition-all
                    ${entry.isMe ? 'border-academy-gold/60 bg-academy-gold/5' : ''}`}
                >
                  <div className={`w-7 text-center font-fantasy text-base flex-shrink-0 ${rankStyle}`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </div>
                  <div
                    className="rounded-lg overflow-hidden flex-shrink-0"
                    style={{ border: `1px solid ${color}40` }}
                  >
                    <Avatar appearance={normalizeAppearance(entry.appearance)} instrument={entry.instrument} size={36} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-academy-cream/90 text-sm truncate">{entry.displayName}</span>
                      {entry.isMe && (
                        <span className="text-[10px] bg-academy-gold/20 text-academy-gold px-1.5 py-0.5 rounded font-fantasy flex-shrink-0">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-academy-cream/40 text-xs">
                      {INSTRUMENTS[entry.instrument]?.className ?? entry.instrument}
                    </div>
                  </div>
                  <div className="font-fantasy text-sm flex-shrink-0" style={{ color }}>
                    {getMetric(entry)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
