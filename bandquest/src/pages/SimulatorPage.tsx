import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import BattleScreen from '../components/BattleScreen';
import { ENEMIES } from '../lib/enemies';
import type { EnemyDef } from '../lib/enemies';
import type { Rating } from '../types/game';
import { getInstrumentColor } from '../lib/instruments';

const TIER_LABELS: Record<number, string> = {
  1: 'Tier I — The Accidentals',
  2: 'Tier II — The Chronotons',
  3: 'Tier III — The Resonants',
  4: 'Tier IV — The Intervalics',
  5: 'Tier V — The Discordian Guard',
  6: 'Tier VI — The Vexian Elite',
};

const RATING_COLORS: Record<Rating, string> = {
  superior:  'text-rating-superior',
  excellent: 'text-rating-excellent',
  good:      'text-rating-good',
  fair:      'text-rating-fair',
  poor:      'text-rating-poor',
};

interface SimHistory {
  victories: number;
  attempts: number;
  lastRatings: Rating[];   // last 5 battle outcomes
}

function loadHistory(characterId: string, enemyId: string): SimHistory {
  try {
    const raw = localStorage.getItem(`sim_${characterId}_${enemyId}`);
    return raw ? (JSON.parse(raw) as SimHistory) : { victories: 0, attempts: 0, lastRatings: [] };
  } catch {
    return { victories: 0, attempts: 0, lastRatings: [] };
  }
}

function saveHistory(characterId: string, enemyId: string, history: SimHistory) {
  localStorage.setItem(`sim_${characterId}_${enemyId}`, JSON.stringify(history));
}

function outcomeRating(rpEarned: number, maxRp: number): Rating {
  const ratio = maxRp > 0 ? rpEarned / maxRp : 0;
  if (ratio >= 0.85) return 'superior';
  if (ratio >= 0.65) return 'excellent';
  if (ratio >= 0.45) return 'good';
  if (ratio >= 0.25) return 'fair';
  return 'poor';
}

export default function SimulatorPage() {
  const { character, awardChallenge } = useGameStore();
  const navigate = useNavigate();
  const [selectedEnemy, setSelectedEnemy] = useState<EnemyDef | null>(null);
  const [battleResult, setBattleResult] = useState<{ won: boolean; rpEarned: number; rating: Rating } | null>(null);

  if (!character) return null;
  const char = character; // stable ref for async callbacks

  const color = getInstrumentColor(char.instrument);
  const maxZone = char.currentZone;

  // All enemies available up to the player's current zone
  const available = Object.values(ENEMIES).filter((e) => e.zone <= maxZone);

  // Group by tier, preserving order
  const byTier = available.reduce<Record<number, EnemyDef[]>>((acc, e) => {
    (acc[e.tier] ??= []).push(e);
    return acc;
  }, {});
  const tiers = Object.keys(byTier).map(Number).sort();

  async function handleVictory(rpEarned: number, _spDelta: number) {
    if (!selectedEnemy) return;
    const maxPossibleRp = 20 * 10; // ~10 turns at Superior
    const rating = outcomeRating(rpEarned, maxPossibleRp);
    const result = { won: true, rpEarned, rating };
    setBattleResult(result);

    // Update history
    const history = loadHistory(char.id, selectedEnemy.id);
    const updated: SimHistory = {
      victories: history.victories + 1,
      attempts: history.attempts + 1,
      lastRatings: [...history.lastRatings.slice(-4), rating],
    };
    saveHistory(char.id, selectedEnemy.id, updated);

    // Award XP at 50% rate, no completion tracking
    await awardChallenge(
      `sim_${selectedEnemy.id}`,
      selectedEnemy.isBoss ? 'zone_boss' : 'mini_boss',
      100,
      rating,
      { xpMultiplier: 0.5, trackCompletion: false },
    );
  }

  function handleDefeat() {
    if (!selectedEnemy) { navigate('/hub'); return; }
    const result = { won: false, rpEarned: 0, rating: 'poor' as Rating };
    setBattleResult(result);

    const history = loadHistory(char.id, selectedEnemy.id);
    saveHistory(char.id, selectedEnemy.id, {
      victories: history.victories,
      attempts: history.attempts + 1,
      lastRatings: [...history.lastRatings.slice(-4), 'poor'],
    });
  }

  // ── Active battle ─────────────────────────────────────────────────────────────

  if (selectedEnemy && !battleResult) {
    return (
      <BattleScreen
        character={character}
        enemies={[selectedEnemy]}
        simulatorMode
        onVictory={handleVictory}
        onDefeat={handleDefeat}
      />
    );
  }

  // ── Post-battle summary ────────────────────────────────────────────────────────

  if (selectedEnemy && battleResult) {
    const history = loadHistory(char.id, selectedEnemy.id);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center pb-12">
        <div className="text-4xl mb-3">{battleResult.won ? '⚔️' : '💨'}</div>
        <div className={`font-fantasy text-2xl mb-1 ${battleResult.won ? 'text-rating-superior' : 'text-rating-poor'}`}>
          {battleResult.won ? 'VICTORY' : 'RETREAT'}
        </div>
        <div className="text-academy-cream/50 text-sm mb-6">
          {battleResult.won
            ? `${selectedEnemy.name} defeated in the simulator.`
            : 'No HP loss in the simulator — only pride.'}
        </div>

        {/* Outcome rating */}
        <div className="card-panel mb-4 w-full max-w-xs">
          <div className="text-academy-cream/40 text-[10px] uppercase tracking-widest mb-2">Outcome Rating</div>
          <div className={`font-fantasy text-xl uppercase ${RATING_COLORS[battleResult.rating]}`}>
            {battleResult.rating}
          </div>
          <div className="text-academy-cream/40 text-xs mt-1">
            {battleResult.rpEarned} RP earned this battle
          </div>
        </div>

        {/* History */}
        <div className="card-panel mb-6 w-full max-w-xs">
          <div className="text-academy-cream/40 text-[10px] uppercase tracking-widest mb-2">
            vs {selectedEnemy.name} — All Time
          </div>
          <div className="flex items-center justify-between text-sm mb-3">
            <span className="text-academy-cream/60">{history.victories} victories</span>
            <span className="text-academy-cream/40">{history.attempts} attempts</span>
          </div>
          {history.lastRatings.length > 0 && (
            <div>
              <div className="text-academy-cream/30 text-[10px] mb-1">Last {history.lastRatings.length} outcomes</div>
              <div className="flex gap-1.5 justify-center">
                {history.lastRatings.map((r, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded flex items-center justify-center text-[9px] font-fantasy uppercase ${RATING_COLORS[r]}`}
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    {r.slice(0, 3)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setBattleResult(null)}
            className="btn-primary"
          >
            Try Again
          </button>
          <button
            onClick={() => { setSelectedEnemy(null); setBattleResult(null); }}
            className="btn-secondary"
          >
            New Enemy
          </button>
        </div>
      </div>
    );
  }

  // ── Enemy browser ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 z-20 bg-academy-dark/95 backdrop-blur-sm border-b border-academy-gold/10 px-4 py-3 flex items-center justify-between">
        <div className="fantasy-title text-lg text-academy-gold">Battle Simulator</div>
        <button
          onClick={() => navigate('/hub')}
          className="text-academy-cream/40 hover:text-academy-cream/80 text-xs transition-colors"
        >
          ← Hub
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6">
        <p className="text-academy-cream/50 text-sm mb-6">
          Practice against any unlocked enemy with no HP depletion. XP earned at 50% rate.
        </p>

        {tiers.length === 0 && (
          <div className="text-academy-cream/40 text-center py-12">
            Complete Zone 1 challenges to unlock enemies.
          </div>
        )}

        {tiers.map((tier) => (
          <div key={tier} className="mb-8">
            <h2 className="fantasy-title text-xs text-academy-gold/60 uppercase tracking-widest mb-3">
              {TIER_LABELS[tier] ?? `Tier ${tier}`}
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {byTier[tier].map((e) => {
                const history = loadHistory(char.id, e.id);
                return (
                  <button
                    key={e.id}
                    onClick={() => { setSelectedEnemy(e); setBattleResult(null); }}
                    className="card-panel text-left hover:border-academy-gold/40 transition-all"
                    style={{ borderColor: `${color}10` }}
                  >
                    <div className="text-2xl mb-2">{getEnemyEmoji(e.id)}</div>
                    <div className="text-academy-cream/80 text-xs font-fantasy leading-tight mb-1">{e.name}</div>
                    {e.isBoss && (
                      <div className="text-[9px] text-rating-poor uppercase tracking-widest mb-1">Boss</div>
                    )}
                    <div className="text-academy-cream/30 text-[9px]">HP {e.maxHp} · PWR {e.power}</div>
                    {history.attempts > 0 && (
                      <div className="mt-2 flex items-center gap-1">
                        {history.lastRatings.slice(-3).map((r, i) => (
                          <span key={i} className={`text-[8px] font-fantasy ${RATING_COLORS[r]}`}>
                            {r.slice(0, 3).toUpperCase()}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getEnemyEmoji(id: string): string {
  const map: Record<string, string> = {
    flatling: '😞',
    sharp_creature: '🔺',
    natural_creature: '⬜',
    double_flat_wretch: '😔',
    double_sharp_bristle: '🔸',
    chronoton_scout: '🤖',
    chronoton_shifter: '⏱️',
    enchanted_music_stand: '🎼',
    flat_dragon: '🐉',
    interval_imp: '😈',
  };
  return map[id] ?? '👾';
}
