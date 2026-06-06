import { useState, useReducer, useRef, useCallback } from 'react';
import type { Character, Rating } from '../types/game';
import type { EnemyDef } from '../lib/enemies';
import type { Ability } from '../lib/abilities';
import { getAbilitiesForInstrument } from '../lib/abilities';
import { getInstrumentColor, pitchToleranceCents } from '../lib/instruments';
import { getEffectiveStats } from '../lib/gear';
import ChallengeModal from './ChallengeModal';
import Avatar from './Avatar';

// ── State types ───────────────────────────────────────────────────────────────

interface EnemyState {
  def: EnemyDef;
  hp: number;
  maxHp: number;
  phase: 1 | 2;
  debuffs: ActiveDebuff[];
}

interface ActiveDebuff {
  type: string;
  turnsLeft: number;
}

interface BattleState {
  playerHp: number;
  playerMaxHp: number;
  playerRp: number;
  playerDebuffs: ActiveDebuff[];
  defending: boolean;
  enemy: EnemyState;
  log: string[];
  turn: 'player' | 'enemy' | 'victory' | 'defeat';
  weakpointExposed: boolean;
  simulatorMode: boolean;
}

type BattleAction =
  | { type: 'APPLY_DAMAGE_TO_ENEMY'; amount: number }
  | { type: 'APPLY_DAMAGE_TO_PLAYER'; amount: number }
  | { type: 'HEAL_PLAYER'; amount: number }
  | { type: 'ADD_LOG'; message: string }
  | { type: 'END_PLAYER_TURN' }
  | { type: 'END_ENEMY_TURN' }
  | { type: 'SET_DEFENDING'; value: boolean }
  | { type: 'APPLY_PLAYER_DEBUFF'; debuff: ActiveDebuff }
  | { type: 'CLEAR_PLAYER_DEBUFFS' }
  | { type: 'EARN_RP'; amount: number }
  | { type: 'EXPOSE_WEAKPOINT' };

function buildInitialState(character: Character, enemy: EnemyDef, simulatorMode = false): BattleState {
  return {
    playerHp: character.hp,
    playerMaxHp: character.maxHp,
    playerRp: character.resonancePoints,
    playerDebuffs: [],
    defending: false,
    enemy: {
      def: enemy,
      hp: enemy.maxHp,
      maxHp: enemy.maxHp,
      phase: 1,
      debuffs: [],
    },
    log: [`Battle starts! ${enemy.name} appears!`],
    turn: 'player',
    weakpointExposed: false,
    simulatorMode,
  };
}

function reducer(state: BattleState, action: BattleAction): BattleState {
  switch (action.type) {
    case 'APPLY_DAMAGE_TO_ENEMY': {
      const newHp = Math.max(0, state.enemy.hp - action.amount);
      const phase = state.enemy.def.phase2Threshold &&
        newHp / state.enemy.maxHp <= state.enemy.def.phase2Threshold &&
        state.enemy.phase === 1
        ? (2 as const)
        : state.enemy.phase;
      return {
        ...state,
        enemy: { ...state.enemy, hp: newHp, phase },
        turn: newHp === 0 ? 'victory' : state.turn,
        weakpointExposed: false,
      };
    }
    case 'APPLY_DAMAGE_TO_PLAYER': {
      const reduction = state.defending ? 0.5 : 1.0;
      const minHp = state.simulatorMode ? 1 : 0;
      const newHp = Math.max(minHp, state.playerHp - Math.floor(action.amount * reduction));
      return {
        ...state,
        playerHp: newHp,
        turn: newHp === 0 ? 'defeat' : state.turn,
      };
    }
    case 'HEAL_PLAYER':
      return { ...state, playerHp: Math.min(state.playerMaxHp, state.playerHp + action.amount) };
    case 'ADD_LOG':
      return { ...state, log: [...state.log.slice(-9), action.message] };
    case 'END_PLAYER_TURN':
      return { ...state, turn: 'enemy', defending: false };
    case 'END_ENEMY_TURN': {
      // Tick player debuffs
      const debuffs = state.playerDebuffs
        .map((d) => ({ ...d, turnsLeft: d.turnsLeft - 1 }))
        .filter((d) => d.turnsLeft > 0);
      return { ...state, turn: 'player', playerDebuffs: debuffs };
    }
    case 'SET_DEFENDING':
      return { ...state, defending: action.value };
    case 'APPLY_PLAYER_DEBUFF':
      return { ...state, playerDebuffs: [...state.playerDebuffs, action.debuff] };
    case 'CLEAR_PLAYER_DEBUFFS':
      return { ...state, playerDebuffs: [] };
    case 'EARN_RP':
      return { ...state, playerRp: state.playerRp + action.amount };
    case 'EXPOSE_WEAKPOINT':
      return { ...state, weakpointExposed: true };
    default:
      return state;
  }
}

// ── Rating helpers ────────────────────────────────────────────────────────────

const RATING_DAMAGE_MULTIPLIERS: Record<Rating, number> = {
  superior: 1.0,
  excellent: 0.85,
  good: 0.7,
  fair: 0.4,
  poor: 0.15,
};

const RP_AWARDS: Record<Rating, number> = {
  superior: 20,
  excellent: 15,
  good: 10,
  fair: 5,
  poor: 0,
};

const RATING_COLORS: Record<Rating, string> = {
  superior:  'text-rating-superior bg-rating-superior/10',
  excellent: 'text-rating-excellent bg-rating-excellent/10',
  good:      'text-rating-good bg-rating-good/10',
  fair:      'text-rating-fair bg-rating-fair/10',
  poor:      'text-rating-poor bg-rating-poor/10',
};

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  character: Character;
  enemy: EnemyDef;
  onVictory: (rpEarned: number) => void;
  onDefeat: () => void;
  simulatorMode?: boolean;
}

export default function BattleScreen({ character, enemy, onVictory, onDefeat, simulatorMode = false }: Props) {
  const [state, dispatch] = useReducer(reducer, buildInitialState(character, enemy, simulatorMode));
  const [activeAbility, setActiveAbility] = useState<Ability | null>(null);
  const [isEnemyTurnAnimating, setIsEnemyTurnAnimating] = useState(false);
  const [playerActing, setPlayerActing] = useState(false);
  const [lastRating, setLastRating] = useState<Rating | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const rpEarnedRef = useRef(0);

  const color = getInstrumentColor(character.instrument);
  const abilities = getAbilitiesForInstrument(character.instrument, character.level);
  const effectiveStats = getEffectiveStats(character);
  const pitchTolerance = pitchToleranceCents(effectiveStats.accuracy);

  const addLog = useCallback((msg: string) => dispatch({ type: 'ADD_LOG', message: msg }), []);

  function computeDamage(ability: Ability, rating: Rating): number {
    const base = effectiveStats.power * ability.damageMultiplier * RATING_DAMAGE_MULTIPLIERS[rating];
    const multiplier = state.weakpointExposed ? 2 : 1;
    return Math.max(1, Math.round(base * multiplier));
  }

  async function handleAbilityComplete(rating: Rating, _score: number) {
    if (!activeAbility) return;
    setActiveAbility(null);
    setLastRating(rating);

    // Brief lunge — the player steps in to perform their action.
    setPlayerActing(true);
    setTimeout(() => setPlayerActing(false), 450);

    const rp = RP_AWARDS[rating];
    rpEarnedRef.current += rp;
    dispatch({ type: 'EARN_RP', amount: rp });

    if (activeAbility.id === 'defend') {
      dispatch({ type: 'SET_DEFENDING', value: true });
      addLog(`${character.displayName} braces for impact.`);
      dispatch({ type: 'END_PLAYER_TURN' });
      runEnemyTurn();
      return;
    }

    if (activeAbility.id === 'resonant_frequency') {
      dispatch({ type: 'EXPOSE_WEAKPOINT' });
      addLog(`Resonant Frequency — ${enemy.name}'s weak point is exposed!`);
      dispatch({ type: 'END_PLAYER_TURN' });
      runEnemyTurn();
      return;
    }

    if (activeAbility.isHealing && !activeAbility.isRevive) {
      const healAmount = Math.round(effectiveStats.endurance * 3 * RATING_DAMAGE_MULTIPLIERS[rating]);
      dispatch({ type: 'HEAL_PLAYER', amount: healAmount });
      addLog(`${activeAbility.name} — restored ${healAmount} HP (${rating.toUpperCase()})`);
      dispatch({ type: 'END_PLAYER_TURN' });
      runEnemyTurn();
      return;
    }

    const dmg = computeDamage(activeAbility, rating);
    dispatch({ type: 'APPLY_DAMAGE_TO_ENEMY', amount: dmg });
    addLog(`${activeAbility.name} — ${dmg} dmg to ${enemy.name} (${rating.toUpperCase()})`);

    if (state.enemy.hp - dmg <= 0) return; // victory handled by reducer

    dispatch({ type: 'END_PLAYER_TURN' });
    runEnemyTurn();
  }

  function runEnemyTurn() {
    setIsEnemyTurnAnimating(true);
    setTimeout(() => {
      const enemyPower = state.enemy.def.power + (state.enemy.phase === 2 ? 5 : 0);
      const dmg = Math.max(1, enemyPower - Math.floor(effectiveStats.endurance * 0.5));
      dispatch({ type: 'APPLY_DAMAGE_TO_PLAYER', amount: dmg });
      addLog(`${enemy.name} attacks! ${dmg} damage.`);

      if (state.enemy.def.debuff && Math.random() < 0.4) {
        dispatch({
          type: 'APPLY_PLAYER_DEBUFF',
          debuff: { type: state.enemy.def.debuff, turnsLeft: state.enemy.def.debuffDuration ?? 2 },
        });
        addLog(`${enemy.name} inflicts ${state.enemy.def.debuff}!`);
      }

      dispatch({ type: 'END_ENEMY_TURN' });
      setIsEnemyTurnAnimating(false);
    }, 1200);
  }

  // ── Victory / Defeat ─────────────────────────────────────────────────────────

  if (state.turn === 'victory') {
    return (
      <VictoryScreen
        enemy={enemy}
        rpEarned={rpEarnedRef.current}
        onContinue={() => onVictory(rpEarnedRef.current)}
      />
    );
  }

  if (state.turn === 'defeat') {
    return <DefeatScreen enemy={enemy} onRetreat={onDefeat} />;
  }

  const hpPercent = (state.playerHp / state.playerMaxHp) * 100;
  const enemyHpPercent = (state.enemy.hp / state.enemy.maxHp) * 100;
  const hasAccuracyDebuff = state.playerDebuffs.some((d) => d.type === 'accuracy_drain');
  const effectivePitchTolerance = hasAccuracyDebuff ? pitchTolerance * 0.5 : pitchTolerance;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Simulator top bar */}
      {simulatorMode && (
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 bg-academy-dark/95 backdrop-blur-sm border-b border-academy-gold/10">
          <span className="text-[10px] font-fantasy uppercase tracking-widest text-academy-gold/60 bg-academy-gold/10 px-2 py-0.5 rounded">
            ⚙ Simulator
          </span>
          {lastRating && (
            <span className={`text-[10px] font-fantasy uppercase tracking-widest px-2 py-0.5 rounded ${RATING_COLORS[lastRating]}`}>
              Last: {lastRating}
            </span>
          )}
          <button onClick={onDefeat} className="text-academy-cream/40 hover:text-academy-cream/80 text-xs transition-colors">
            Exit ✕
          </button>
        </div>
      )}

      {/* Battle arena */}
      <div className="flex-1 relative px-4 pt-4 pb-2">
        {/* Enemy section */}
        <div className="mb-4">
          <div className="flex items-start justify-between mb-1">
            <div>
              <div className="fantasy-title text-sm text-rating-poor">{enemy.name}</div>
              {state.enemy.phase === 2 && (
                <div className="text-[10px] text-discord-crimson font-fantasy">⚡ Phase 2</div>
              )}
            </div>
            <div className="text-right text-xs text-academy-cream/50">
              HP: <span className="text-rating-poor font-fantasy">{state.enemy.hp}</span>/{state.enemy.maxHp}
            </div>
          </div>
          <div className="stat-bar mb-2">
            <div
              className="stat-bar-fill transition-all duration-500"
              style={{ width: `${enemyHpPercent}%`, backgroundColor: '#F87171' }}
            />
          </div>

          {/* Battle stage — player faces off against the enemy (FFVI side-view) */}
          <div className="flex items-end justify-between gap-2 py-5 px-1">
            {/* Player combatant */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className="rounded-xl overflow-hidden"
                style={{
                  boxShadow: `0 0 24px ${color}33`,
                  transform: playerActing ? 'translateX(26px) scale(1.06)' : 'translateX(0) scale(1)',
                  transition: 'transform 220ms ease-out',
                }}
              >
                <Avatar appearance={character.appearance} instrument={character.instrument} size={76} />
              </div>
              <div className="mt-1.5 w-14 h-1.5 rounded-full bg-black/50 blur-[1px]" />
            </div>

            {/* Enemy combatant */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className={`text-7xl transition-transform duration-200
                  ${isEnemyTurnAnimating ? 'animate-pulse scale-110' : ''}
                  ${playerActing ? '-translate-x-1.5' : ''}`}
              >
                {getEnemyEmoji(enemy.id)}
              </div>
              <div className="mt-1.5 w-16 h-1.5 rounded-full bg-black/50 blur-[1px]" />
            </div>
          </div>

          {state.weakpointExposed && (
            <div className="text-center text-xs text-rating-excellent animate-pulse mb-1">
              ⚡ Weak point exposed — next hit ×2
            </div>
          )}
        </div>

        {/* Player status */}
        <div className="card-panel py-3 mb-4">
          <div className="flex items-center gap-3">
            <div
              className="rounded-lg overflow-hidden flex-shrink-0"
              style={{ border: `1px solid ${color}40` }}
            >
              <Avatar appearance={character.appearance} instrument={character.instrument} size={40} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-fantasy" style={{ color }}>{character.displayName}</span>
                {state.defending && (
                  <span className="text-[10px] text-academy-gold bg-academy-gold/10 px-1.5 rounded">GUARDING</span>
                )}
                {hasAccuracyDebuff && (
                  <span className="text-[10px] text-rating-fair bg-rating-fair/10 px-1.5 rounded">PITCH↓</span>
                )}
              </div>
              <div className="stat-bar">
                <div
                  className="stat-bar-fill"
                  style={{
                    width: `${hpPercent}%`,
                    backgroundColor: hpPercent < 25 ? '#F87171' : hpPercent < 60 ? '#FB923C' : color,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-academy-cream/40 mt-0.5">
                <span>HP {state.playerHp}/{state.playerMaxHp}</span>
                <span>⟡ {state.playerRp} RP</span>
              </div>
            </div>
          </div>
        </div>

        {/* Battle log */}
        <div className="bg-black/30 border border-academy-gold/10 rounded-lg p-2 mb-4 h-16 overflow-y-auto">
          {state.log.slice(-3).map((msg, i) => (
            <p key={i} className="text-academy-cream/60 text-xs leading-relaxed">{msg}</p>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>

      {/* Action panel */}
      <div className="px-4 pb-6">
        {isEnemyTurnAnimating ? (
          <div className="text-center text-academy-cream/50 font-fantasy text-sm animate-pulse py-4">
            {enemy.name} acts…
          </div>
        ) : (
          <>
            <div className="text-academy-cream/40 text-[10px] uppercase tracking-widest mb-2 font-fantasy">
              Choose Action
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {abilities.map((ab) => (
                <button
                  key={ab.id}
                  onClick={() => setActiveAbility(ab)}
                  className="card-panel py-2 px-3 text-left hover:border-academy-gold/50 transition-all"
                  style={{ borderColor: `${color}20` }}
                >
                  <div className="text-xs font-fantasy" style={{ color }}>{ab.name}</div>
                  <div className="text-[10px] text-academy-cream/40 mt-0.5 capitalize">
                    {ab.challengeType.replace('aural_', '').replace('_', ' ')}
                  </div>
                </button>
              ))}
              <button
                onClick={() => {
                  dispatch({ type: 'SET_DEFENDING', value: true });
                  addLog(`${character.displayName} braces for impact.`);
                  dispatch({ type: 'END_PLAYER_TURN' });
                  runEnemyTurn();
                }}
                className="card-panel py-2 px-3 text-left hover:border-academy-gold/50 transition-all"
              >
                <div className="text-xs font-fantasy text-academy-gold">Defend</div>
                <div className="text-[10px] text-academy-cream/40 mt-0.5">Halve next hit</div>
              </button>
            </div>
            {hasAccuracyDebuff && (
              <p className="text-rating-fair text-[10px] text-center mt-1">
                ⚠ Pitch tolerance narrowed by Flatling debuff (±{Math.round(effectivePitchTolerance)}¢)
              </p>
            )}
          </>
        )}
      </div>

      {/* Ability challenge modal */}
      {activeAbility && (
        <ChallengeModal
          challenge={{
            id: `battle_${activeAbility.id}`,
            title: activeAbility.name,
            type: activeAbility.challengeType,
            description: activeAbility.description,
            xpBase: 0,
          }}
          character={character}
          pitchToleranceOverride={effectivePitchTolerance}
          onComplete={handleAbilityComplete}
          onClose={() => setActiveAbility(null)}
        />
      )}
    </div>
  );
}

// ── Victory / Defeat screens ──────────────────────────────────────────────────

function VictoryScreen({ enemy, rpEarned, onContinue }: {
  enemy: EnemyDef;
  rpEarned: number;
  onContinue: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <div className="text-5xl mb-4 animate-float">⚔️</div>
      <div className="text-rating-superior font-fantasy text-3xl mb-2 text-shadow-glow">VICTORY</div>
      <p className="text-academy-cream/70 text-sm mb-4">{enemy.isBoss
        ? 'The Composer\'s light shines a little brighter.'
        : 'The Twisted Melody dissolves.'
      }</p>
      {enemy.lore && (
        <div className="card-panel mb-6 max-w-sm text-left">
          <div className="text-academy-gold/60 text-xs uppercase tracking-widest mb-2">Lore Unlocked</div>
          <p className="text-academy-cream/70 text-sm italic">{enemy.lore}</p>
        </div>
      )}
      <div className="flex gap-6 mb-8">
        <div className="text-center">
          <div className="text-academy-cream/40 text-xs mb-1">RP Earned</div>
          <div className="fantasy-title text-xl text-academy-gold">+{rpEarned}</div>
        </div>
      </div>
      <button onClick={onContinue} className="btn-primary">
        Continue →
      </button>
    </div>
  );
}

function DefeatScreen({ enemy, onRetreat }: { enemy: EnemyDef; onRetreat: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <div className="text-5xl mb-4">💨</div>
      <div className="text-rating-poor font-fantasy text-3xl mb-2">RETREAT</div>
      <p className="text-academy-cream/60 text-sm mb-8">{enemy.name} overpowers you. You fall back to the Academy.</p>
      <button onClick={onRetreat} className="btn-secondary">← Return to Zone</button>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getEnemyEmoji(id: string): string {
  const map: Record<string, string> = {
    flatling: '😞',
    sharp_creature: '🔺',
    natural_creature: '⬜',
    double_flat_wretch: '😔',
    chronoton_scout: '🤖',
    chronoton_shifter: '⏱️',
    enchanted_music_stand: '🎼',
    flat_dragon: '🐉',
    interval_imp: '😈',
  };
  return map[id] ?? '👾';
}
