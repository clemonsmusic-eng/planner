import { useState, useReducer, useRef, useCallback } from 'react';
import type { Character, Rating } from '../types/game';
import type { EnemyDef } from '../lib/enemies';
import type { Ability } from '../lib/abilities';
import { getAbilitiesForInstrument, battleBeatCount, battleBpm, battleBpmRange } from '../lib/abilities';
import type { AbilityTier } from '../lib/abilities';
import { getInstrumentColor, pitchToleranceCents } from '../lib/instruments';
import { getEffectiveStats } from '../lib/gear';
import {
  STATUS_DEFS, hasStatus, tickDurations, clearStatus, clearByKind, applyStatus,
  endOfTurnHpDelta, newStatus,
  BLIND_TOLERANCE_MULT, BLIND_MISS_CHANCE, FOCUS_TOLERANCE_MULT,
  MANIC_DEAL_MULT, MANIC_TAKEN_MULT, CALM_DEAL_MULT, CALM_TAKEN_MULT,
  VULNERABLE_TAKEN_MULT, DEFLECT_PCT, CONFUSION_FAIL_CHANCE,
} from '../lib/statusEffects';
import type { StatusType, StatusEffect } from '../lib/statusEffects';
import { BATTLE_ITEMS, STARTER_KIT } from '../lib/battleItems';
import type { BattleItem } from '../lib/battleItems';
import ChallengeModal from './ChallengeModal';
import Avatar from './Avatar';

// ── State types ───────────────────────────────────────────────────────────────

interface EnemyState {
  def: EnemyDef;
  hp: number;
  maxHp: number;
  phase: 1 | 2;
  statuses: StatusEffect[];
}

interface BattleState {
  playerHp: number;
  playerMaxHp: number;
  playerRp: number;
  playerStatuses: StatusEffect[];
  defending: boolean;
  enemy: EnemyState;
  log: string[];
  turn: 'player' | 'enemy' | 'victory' | 'defeat';
  weakpointExposed: boolean;
  simulatorMode: boolean;
}

type BattleAction =
  | { type: 'DAMAGE_ENEMY'; amount: number }
  | { type: 'DAMAGE_PLAYER'; amount: number }
  | { type: 'HEAL_PLAYER'; amount: number }
  | { type: 'ADD_LOG'; message: string }
  | { type: 'SET_TURN'; turn: BattleState['turn'] }
  | { type: 'SET_DEFENDING'; value: boolean }
  | { type: 'APPLY_PLAYER_STATUS'; effect: StatusEffect }
  | { type: 'APPLY_ENEMY_STATUS'; effect: StatusEffect }
  | { type: 'CLEAR_PLAYER_DEBUFFS' }
  | { type: 'CLEAR_ENEMY_BUFFS' }
  | { type: 'TICK_PLAYER_STATUSES' }
  | { type: 'TICK_ENEMY_STATUSES' }
  | { type: 'EARN_RP'; amount: number }
  | { type: 'EXPOSE_WEAKPOINT' };

function buildInitialState(character: Character, enemy: EnemyDef, simulatorMode = false): BattleState {
  return {
    playerHp: character.hp,
    playerMaxHp: character.maxHp,
    playerRp: character.resonancePoints,
    playerStatuses: [],
    defending: false,
    enemy: {
      def: enemy,
      hp: enemy.maxHp,
      maxHp: enemy.maxHp,
      phase: 1,
      statuses: [],
    },
    log: [`Battle starts! ${enemy.name} appears!`],
    turn: 'player',
    weakpointExposed: false,
    simulatorMode,
  };
}

function reducer(state: BattleState, action: BattleAction): BattleState {
  switch (action.type) {
    case 'DAMAGE_ENEMY': {
      const newHp = Math.max(0, state.enemy.hp - action.amount);
      const phase = state.enemy.def.phase2Threshold &&
        newHp / state.enemy.maxHp <= state.enemy.def.phase2Threshold &&
        state.enemy.phase === 1
        ? (2 as const)
        : state.enemy.phase;
      return {
        ...state,
        // Taking damage wakes a sleeping enemy.
        enemy: { ...state.enemy, hp: newHp, phase, statuses: clearStatus(state.enemy.statuses, 'sleep') },
        turn: newHp === 0 ? 'victory' : state.turn,
        weakpointExposed: false,
      };
    }
    case 'DAMAGE_PLAYER': {
      const reduction = state.defending ? 0.5 : 1.0;
      const minHp = state.simulatorMode ? 1 : 0;
      const newHp = Math.max(minHp, state.playerHp - Math.floor(action.amount * reduction));
      return {
        ...state,
        playerHp: newHp,
        // Taking damage wakes the player.
        playerStatuses: clearStatus(state.playerStatuses, 'sleep'),
        turn: newHp === 0 ? 'defeat' : state.turn,
      };
    }
    case 'HEAL_PLAYER':
      return { ...state, playerHp: Math.min(state.playerMaxHp, state.playerHp + action.amount) };
    case 'ADD_LOG':
      return { ...state, log: [...state.log.slice(-9), action.message] };
    case 'SET_TURN':
      // Never override a finished battle.
      if (state.turn === 'victory' || state.turn === 'defeat') return state;
      return { ...state, turn: action.turn, ...(action.turn === 'enemy' ? { defending: false } : {}) };
    case 'SET_DEFENDING':
      return { ...state, defending: action.value };
    case 'APPLY_PLAYER_STATUS':
      return { ...state, playerStatuses: applyStatus(state.playerStatuses, action.effect).list };
    case 'APPLY_ENEMY_STATUS':
      return { ...state, enemy: { ...state.enemy, statuses: applyStatus(state.enemy.statuses, action.effect).list } };
    case 'CLEAR_PLAYER_DEBUFFS':
      return { ...state, playerStatuses: clearByKind(state.playerStatuses, 'debuff') };
    case 'CLEAR_ENEMY_BUFFS':
      return { ...state, enemy: { ...state.enemy, statuses: clearByKind(state.enemy.statuses, 'buff') } };
    case 'TICK_PLAYER_STATUSES': {
      const delta = endOfTurnHpDelta(state.playerStatuses, state.playerMaxHp);
      const minHp = state.simulatorMode ? 1 : 0;
      const newHp = Math.max(minHp, Math.min(state.playerMaxHp, state.playerHp + delta));
      return {
        ...state,
        playerHp: newHp,
        playerStatuses: tickDurations(state.playerStatuses),
        turn: newHp === 0 ? 'defeat' : state.turn,
      };
    }
    case 'TICK_ENEMY_STATUSES': {
      const delta = endOfTurnHpDelta(state.enemy.statuses, state.enemy.maxHp);
      const newHp = Math.max(0, Math.min(state.enemy.maxHp, state.enemy.hp + delta));
      return {
        ...state,
        enemy: { ...state.enemy, hp: newHp, statuses: tickDurations(state.enemy.statuses) },
        turn: newHp === 0 ? 'victory' : state.turn,
      };
    }
    case 'EARN_RP':
      return { ...state, playerRp: state.playerRp + action.amount };
    case 'EXPOSE_WEAKPOINT':
      return { ...state, weakpointExposed: true };
    default:
      return state;
  }
}

// ── Rating helpers ────────────────────────────────────────────────────────────

const RP_AWARDS: Record<Rating, number> = {
  superior: 20,
  excellent: 15,
  good: 10,
  fair: 5,
  poor: 0,
};

const TIER_TEXT: Record<AbilityTier, string> = {
  basic:  'text-academy-cream/50',
  medium: 'text-rating-good',
  strong: 'text-academy-gold',
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
  const [activeBpm, setActiveBpm] = useState(60); // tempo rolled when an action is chosen
  const [isEnemyTurnAnimating, setIsEnemyTurnAnimating] = useState(false);
  const [playerActing, setPlayerActing] = useState(false);
  const [lastRating, setLastRating] = useState<Rating | null>(null);
  const [perfectFlash, setPerfectFlash] = useState(false);
  const [menu, setMenu] = useState<'actions' | 'items'>('actions');
  const [items, setItems] = useState<Record<string, number>>(() => ({ ...STARTER_KIT }));
  const logEndRef = useRef<HTMLDivElement>(null);
  const rpEarnedRef = useRef(0);
  const playerTurnNoRef = useRef(1);        // counts player turns (slow parity)
  const enemyTurnNoRef = useRef(0);         // counts enemy turns (slow parity)
  const bonusActionUsedRef = useRef(false); // haste extra-action consumed this turn
  // Always-fresh snapshot of state for use inside async (setTimeout) callbacks,
  // where the captured `state` closure would otherwise be stale.
  const stateRef = useRef(state);
  stateRef.current = state;

  const color = getInstrumentColor(character.instrument);
  const abilities = getAbilitiesForInstrument(character.instrument, character.level);
  const bpmRange = battleBpmRange(character.currentZone);
  const effectiveStats = getEffectiveStats(character);
  const pitchTolerance = pitchToleranceCents(effectiveStats.accuracy);

  const addLog = useCallback((msg: string) => dispatch({ type: 'ADD_LOG', message: msg }), []);

  function selectAbility(ab: Ability) {
    setActiveBpm(battleBpm(character.currentZone)); // roll tempo once per action
    setActiveAbility(ab);
  }

  // score is 0–100 continuous pitch accuracy. score=0 is a miss (handled before
  // this is called). score=100 triggers the perfect bonus (2×).
  function computeDamage(ability: Ability, score: number): number {
    const perfectMult = score === 100 ? 2 : 1;
    const weakpointMult = state.weakpointExposed ? 2 : 1;
    const offenseMult = hasStatus(state.playerStatuses, 'manic') ? MANIC_DEAL_MULT
      : hasStatus(state.playerStatuses, 'calm') ? CALM_DEAL_MULT : 1;
    const base = effectiveStats.power * ability.damageMultiplier * (score / 100);
    return Math.max(1, Math.round(base * perfectMult * weakpointMult * offenseMult));
  }

  // Target-side damage modifiers from statuses (manic/calm/vulnerable scale the
  // hit; deflect reflects half back). Reflected damage is dispatched directly to
  // avoid an infinite ping-pong between two deflecting combatants.
  function takenMultiplier(statuses: StatusEffect[]): number {
    let m = 1;
    if (hasStatus(statuses, 'manic')) m *= MANIC_TAKEN_MULT;
    if (hasStatus(statuses, 'calm')) m *= CALM_TAKEN_MULT;
    if (hasStatus(statuses, 'vulnerable')) m *= VULNERABLE_TAKEN_MULT;
    return m;
  }

  function dealDamageToEnemy(raw: number): number {
    const s = stateRef.current;
    let dmg = Math.max(1, Math.round(raw * takenMultiplier(s.enemy.statuses)));
    if (hasStatus(s.enemy.statuses, 'deflect')) {
      const reflected = Math.round(dmg * DEFLECT_PCT);
      dmg -= reflected;
      if (reflected > 0) {
        dispatch({ type: 'DAMAGE_PLAYER', amount: reflected });
        addLog(`🛡️ ${enemy.name} deflects ${reflected} damage back!`);
      }
    }
    dispatch({ type: 'DAMAGE_ENEMY', amount: dmg });
    return dmg;
  }

  function dealDamageToPlayer(raw: number): number {
    const s = stateRef.current;
    let dmg = Math.max(1, Math.round(raw * takenMultiplier(s.playerStatuses)));
    if (hasStatus(s.playerStatuses, 'deflect')) {
      const reflected = Math.round(dmg * DEFLECT_PCT);
      dmg -= reflected;
      if (reflected > 0) {
        dispatch({ type: 'DAMAGE_ENEMY', amount: reflected });
        addLog(`🛡️ ${character.displayName} deflects ${reflected} damage back!`);
      }
    }
    dispatch({ type: 'DAMAGE_PLAYER', amount: dmg });
    return dmg;
  }

  // Apply a status with opposite-cancel feedback, then dispatch to the reducer.
  function applyStatusToPlayer(type: StatusType, duration?: number) {
    const opp = STATUS_DEFS[type].opposite;
    if (hasStatus(stateRef.current.playerStatuses, opp)) {
      addLog(`${STATUS_DEFS[type].icon} ${STATUS_DEFS[type].name} cancels ${STATUS_DEFS[opp].name}.`);
    } else {
      addLog(`${STATUS_DEFS[type].icon} ${character.displayName}: ${STATUS_DEFS[type].name}!`);
    }
    dispatch({ type: 'APPLY_PLAYER_STATUS', effect: newStatus(type, duration) });
  }

  function applyStatusToEnemy(type: StatusType, duration?: number) {
    const opp = STATUS_DEFS[type].opposite;
    if (hasStatus(stateRef.current.enemy.statuses, opp)) {
      addLog(`${STATUS_DEFS[type].icon} ${STATUS_DEFS[type].name} cancels ${enemy.name}'s ${STATUS_DEFS[opp].name}.`);
    } else {
      addLog(`${STATUS_DEFS[type].icon} ${enemy.name}: ${STATUS_DEFS[type].name}!`);
    }
    dispatch({ type: 'APPLY_ENEMY_STATUS', effect: newStatus(type, duration) });
  }

  // End of the player's turn: poison/regen tick, then hand control to the enemy.
  function endPlayerTurn() {
    bonusActionUsedRef.current = false;
    const d = endOfTurnHpDelta(stateRef.current.playerStatuses, state.playerMaxHp);
    if (d < 0) addLog(`☠️ Poison saps ${-d} HP.`);
    else if (d > 0) addLog(`🌿 Regen restores ${d} HP.`);
    dispatch({ type: 'TICK_PLAYER_STATUSES' });
    dispatch({ type: 'SET_TURN', turn: 'enemy' });
    runEnemyTurn();
  }

  // After a resolved player action: take an extra action if hasted, else end turn.
  function afterPlayerAction() {
    if (hasStatus(state.playerStatuses, 'haste') && !bonusActionUsedRef.current) {
      bonusActionUsedRef.current = true;
      addLog('⚡ Haste — act again!');
      return; // stay on the player's turn; the action menu re-appears
    }
    endPlayerTurn();
  }

  function handleDefend() {
    if (hasStatus(state.playerStatuses, 'manic')) return; // manic cannot defend
    dispatch({ type: 'SET_DEFENDING', value: true });
    addLog(`${character.displayName} braces for impact.`);
    endPlayerTurn();
  }

  // Player chose to pass (asleep or slowed). Still ticks statuses so they wear off.
  function skipPlayerTurn(message: string) {
    addLog(message);
    endPlayerTurn();
  }

  // Use a consumable: applies its status (self/enemy), spends it, costs the turn.
  function useItem(item: BattleItem) {
    if ((items[item.id] ?? 0) <= 0) return;
    setItems((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 0) - 1 }));
    setMenu('actions');
    addLog(`🎒 ${character.displayName} uses ${item.name}.`);
    if (item.target === 'self') applyStatusToPlayer(item.applies);
    else applyStatusToEnemy(item.applies);
    setPlayerActing(true);
    setTimeout(() => setPlayerActing(false), 450);
    afterPlayerAction();
  }

  async function handleAbilityComplete(rating: Rating, score: number) {
    if (!activeAbility) return;
    const ability = activeAbility;
    setActiveAbility(null);
    setLastRating(rating);

    setPlayerActing(true);
    setTimeout(() => setPlayerActing(false), 450);

    const rp = RP_AWARDS[rating];
    rpEarnedRef.current += rp;
    dispatch({ type: 'EARN_RP', amount: rp });

    if (ability.id === 'resonant_frequency') {
      dispatch({ type: 'EXPOSE_WEAKPOINT' });
      addLog(`Resonant Frequency — ${enemy.name}'s weak point is exposed!`);
      afterPlayerAction();
      return;
    }

    // Miss — no pitch detected during the performance window
    if (score === 0) {
      addLog(`${ability.name} — MISSED! No sound detected.`);
      afterPlayerAction();
      return;
    }

    // Confusion — half the time the phrase scatters and the action fails
    // (Clarity grants immunity).
    if (hasStatus(state.playerStatuses, 'confusion') && !hasStatus(state.playerStatuses, 'clarity')
        && Math.random() < CONFUSION_FAIL_CHANCE) {
      addLog(`💫 Confused! ${ability.name} scatters and fails.`);
      afterPlayerAction();
      return;
    }

    const isPerfect = score === 100;
    if (isPerfect) {
      setPerfectFlash(true);
      setTimeout(() => setPerfectFlash(false), 2000);
    }

    const goodOrBetter = score >= 60; // status application gated on accuracy

    // Cleanses fire regardless of score so defensive utility is reliable.
    if (ability.clearsSelfDebuffs) {
      dispatch({ type: 'CLEAR_PLAYER_DEBUFFS' });
      addLog(`✨ ${ability.name} — debuffs shaken loose!`);
    }
    if (ability.clearsEnemyBuffs) {
      dispatch({ type: 'CLEAR_ENEMY_BUFFS' });
      addLog(`✨ ${ability.name} — ${enemy.name}'s buffs stripped!`);
    }

    // Self-buffs (regen / haste / deflect / focus / calm …) on a solid performance.
    if (goodOrBetter) {
      if (ability.selfStatus) applyStatusToPlayer(ability.selfStatus);
      ability.selfStatusMany?.forEach((t) => applyStatusToPlayer(t));
    }

    if (ability.isHealing && !ability.isRevive) {
      const healAmount = Math.round(effectiveStats.endurance * 3 * (score / 100) * (isPerfect ? 2 : 1));
      dispatch({ type: 'HEAL_PLAYER', amount: healAmount });
      addLog(`${isPerfect ? '✨ PERFECT! ' : ''}${ability.name} — restored ${healAmount} HP (${score}%${isPerfect ? ' ×2' : ''})`);
      afterPlayerAction();
      return;
    }

    // Inflict statuses on the enemy, gated on a Good-or-better hit.
    const inflictEnemyStatuses = () => {
      if (!goodOrBetter) return;
      if (ability.inflicts) applyStatusToEnemy(ability.inflicts);
      ability.inflictsMany?.forEach((t) => applyStatusToEnemy(t));
    };

    if (ability.damageMultiplier > 0) {
      const dmg = computeDamage(ability, score);
      const applied = dealDamageToEnemy(dmg);
      addLog(`${isPerfect ? '✨ PERFECT! ' : ''}${ability.name} — ${applied} dmg to ${enemy.name} (${score}%${isPerfect ? ' ×2' : ''})`);
      inflictEnemyStatuses();
      if (state.enemy.hp - applied <= 0) return; // victory handled by reducer
    } else {
      // Pure-utility ability (no direct damage): apply its statuses and resolve.
      inflictEnemyStatuses();
      if (!ability.clearsSelfDebuffs && !ability.clearsEnemyBuffs
          && !ability.selfStatus && !ability.selfStatusMany) {
        addLog(`${ability.name} resolves.`);
      }
    }

    afterPlayerAction();
  }

  function runEnemyTurn() {
    setIsEnemyTurnAnimating(true);
    setTimeout(() => {
      enemyTurnNoRef.current += 1;
      const s = stateRef.current;
      const eStatuses = s.enemy.statuses;

      // Sleep — the enemy skips its whole turn (woken only by damage).
      if (hasStatus(eStatuses, 'sleep')) {
        addLog(`💤 ${enemy.name} is asleep.`);
        finishEnemyTurn();
        return;
      }
      // Slow — acts only every other turn.
      if (hasStatus(eStatuses, 'slow') && enemyTurnNoRef.current % 2 === 0) {
        addLog(`🐌 ${enemy.name} is too slow to act.`);
        finishEnemyTurn();
        return;
      }

      const attacks = hasStatus(eStatuses, 'haste') ? 2 : 1;
      const enemyPower = s.enemy.def.power + (s.enemy.phase === 2 ? 5 : 0);
      const manicMult = hasStatus(eStatuses, 'manic') ? MANIC_DEAL_MULT : 1;

      for (let i = 0; i < attacks; i++) {
        if (hasStatus(eStatuses, 'confusion') && !hasStatus(eStatuses, 'clarity')
            && Math.random() < CONFUSION_FAIL_CHANCE) {
          addLog(`💫 ${enemy.name} flails in confusion.`);
          continue;
        }
        if (hasStatus(eStatuses, 'blind') && !hasStatus(eStatuses, 'focus')
            && Math.random() < BLIND_MISS_CHANCE) {
          addLog(`🌫️ ${enemy.name}'s attack misses!`);
          continue;
        }
        const raw = Math.max(1, Math.round(enemyPower * manicMult - effectiveStats.endurance * 0.5));
        const applied = dealDamageToPlayer(raw);
        addLog(`${enemy.name} attacks! ${applied} damage.${attacks > 1 ? ` (${i + 1}/${attacks})` : ''}`);
      }

      // Inflict its signature status.
      if (s.enemy.def.debuff && Math.random() < (s.enemy.def.debuffChance ?? 0.4)) {
        const eff = newStatus(s.enemy.def.debuff, s.enemy.def.debuffDuration);
        dispatch({ type: 'APPLY_PLAYER_STATUS', effect: eff });
        addLog(`${STATUS_DEFS[s.enemy.def.debuff].icon} ${enemy.name} inflicts ${STATUS_DEFS[s.enemy.def.debuff].name}!`);
      }

      finishEnemyTurn();
    }, 1200);
  }

  function finishEnemyTurn() {
    const s = stateRef.current;
    const d = endOfTurnHpDelta(s.enemy.statuses, s.enemy.maxHp);
    if (d < 0) addLog(`☠️ Poison saps ${-d} HP from ${enemy.name}.`);
    else if (d > 0) addLog(`🌿 ${enemy.name} regenerates ${d} HP.`);
    dispatch({ type: 'TICK_ENEMY_STATUSES' });

    playerTurnNoRef.current += 1;
    bonusActionUsedRef.current = false;
    dispatch({ type: 'SET_TURN', turn: 'player' });
    setIsEnemyTurnAnimating(false);
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
  const isBlinded = hasStatus(state.playerStatuses, 'blind');
  const isFocused = hasStatus(state.playerStatuses, 'focus');
  const isManic = hasStatus(state.playerStatuses, 'manic');
  const effectivePitchTolerance = isBlinded
    ? pitchTolerance * BLIND_TOLERANCE_MULT
    : isFocused
      ? pitchTolerance * FOCUS_TOLERANCE_MULT
      : pitchTolerance;

  // The player passes automatically when asleep or slowed on a skip turn.
  const playerAsleep = hasStatus(state.playerStatuses, 'sleep');
  const playerSlowSkip = hasStatus(state.playerStatuses, 'slow') && playerTurnNoRef.current % 2 === 0;
  const playerMustSkip = playerAsleep || playerSlowSkip;

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
        {perfectFlash && (
          <div className="absolute inset-x-0 top-1/3 flex items-center justify-center pointer-events-none z-10">
            <div className="font-fantasy text-2xl text-academy-gold animate-pulse tracking-widest"
              style={{ textShadow: '0 0 20px #FFD70099, 0 0 40px #FFD70055' }}>
              ✨ PERFECT! ✨
            </div>
          </div>
        )}
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
          <StatusBadges statuses={state.enemy.statuses} />

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
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span className="text-xs font-fantasy" style={{ color }}>{character.displayName}</span>
                {state.defending && (
                  <span className="text-[10px] text-academy-gold bg-academy-gold/10 px-1.5 rounded">GUARDING</span>
                )}
                <StatusBadges statuses={state.playerStatuses} />
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
        ) : playerMustSkip ? (
          <div className="text-center py-3">
            <div className="font-fantasy text-academy-cream/70 text-sm mb-2">
              {playerAsleep ? '💤 You are asleep…' : '🐌 You are too slow to act this turn.'}
            </div>
            <button
              onClick={() => skipPlayerTurn(playerAsleep
                ? `💤 ${character.displayName} is asleep and cannot act.`
                : `🐌 ${character.displayName} is too slow and loses the turn.`)}
              className="btn-secondary"
            >
              {playerAsleep ? 'Snooze…' : 'Pass Turn'} →
            </button>
          </div>
        ) : menu === 'items' ? (
          <>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-academy-cream/40 text-[10px] uppercase tracking-widest font-fantasy">
                Items
              </span>
              <button onClick={() => setMenu('actions')} className="text-academy-cream/40 hover:text-academy-cream/80 text-[10px] font-fantasy">
                ← Back
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {Object.keys(items).map((id) => {
                const item = BATTLE_ITEMS[id];
                const count = items[id] ?? 0;
                const def = STATUS_DEFS[item.applies];
                return (
                  <button
                    key={id}
                    onClick={() => useItem(item)}
                    disabled={count <= 0}
                    title={item.description}
                    className={`card-panel py-2 px-3 text-left transition-all ${count <= 0 ? 'opacity-30 cursor-not-allowed' : 'hover:border-academy-gold/50'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-fantasy text-academy-cream/90">{item.icon} {item.name}</div>
                      <span className="text-[9px] text-academy-cream/40">×{count}</span>
                    </div>
                    <div className="text-[9px] mt-0.5">
                      <span className={`px-1 rounded ${def.colorClass}`}>{def.badge}</span>
                      <span className="text-academy-cream/35 ml-1">→ {item.target === 'self' ? 'you' : enemy.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-academy-cream/40 text-[10px] uppercase tracking-widest font-fantasy">
                Choose Action
              </span>
              <span className="text-academy-cream/30 text-[9px] font-fantasy">
                ♩= {bpmRange[0]}–{bpmRange[1]}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {abilities.map((ab) => {
                const beats = battleBeatCount(ab.tier, character.currentZone);
                return (
                  <button
                    key={ab.id}
                    onClick={() => selectAbility(ab)}
                    className="card-panel py-2 px-3 text-left hover:border-academy-gold/50 transition-all"
                    style={{ borderColor: `${color}20` }}
                  >
                    <div className="text-xs font-fantasy" style={{ color }}>{ab.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[9px] font-fantasy uppercase tracking-wide ${TIER_TEXT[ab.tier]}`}>
                        {ab.tier}
                      </span>
                      <span className="text-[9px] text-academy-cream/25">·</span>
                      <span className="text-[9px] text-academy-cream/35">{beats}♩</span>
                      {ab.inflicts && (
                        <>
                          <span className="text-[9px] text-academy-cream/25">·</span>
                          <span className="text-[9px]" title={STATUS_DEFS[ab.inflicts].name}>{STATUS_DEFS[ab.inflicts].icon}</span>
                        </>
                      )}
                      {ab.selfStatus && (
                        <>
                          <span className="text-[9px] text-academy-cream/25">·</span>
                          <span className="text-[9px]" title={STATUS_DEFS[ab.selfStatus].name}>{STATUS_DEFS[ab.selfStatus].icon}</span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
              <button
                onClick={handleDefend}
                disabled={isManic}
                className={`card-panel py-2 px-3 text-left transition-all ${isManic ? 'opacity-40 cursor-not-allowed' : 'hover:border-academy-gold/50'}`}
              >
                <div className="text-xs font-fantasy text-academy-gold">Defend</div>
                <div className="text-[9px] text-academy-cream/40 mt-0.5">
                  {isManic ? 'manic — cannot defend' : 'instant · no challenge'}
                </div>
              </button>
              <button
                onClick={() => setMenu('items')}
                className="card-panel py-2 px-3 text-left hover:border-academy-gold/50 transition-all"
              >
                <div className="text-xs font-fantasy text-academy-gold">🎒 Items</div>
                <div className="text-[9px] text-academy-cream/40 mt-0.5">
                  {Object.values(items).reduce((a, b) => a + b, 0)} available
                </div>
              </button>
            </div>
            {isBlinded && (
              <p className="text-rating-fair text-[10px] text-center mt-1">
                🌫️ Blinded — pitch tolerance narrowed (±{Math.round(effectivePitchTolerance)}¢)
              </p>
            )}
            {isManic && (
              <p className="text-orange-400 text-[10px] text-center mt-1">
                🔥 Manic — you deal 1.5× but take 1.25× damage
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
            type: 'prepared_performance',
            description: activeAbility.description,
            xpBase: 0,
            beatCount: battleBeatCount(activeAbility.tier, character.currentZone),
            bpm: activeBpm,
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

function StatusBadges({ statuses }: { statuses: StatusEffect[] }) {
  if (statuses.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {statuses.map((s) => {
        const def = STATUS_DEFS[s.type];
        return (
          <span
            key={s.type}
            title={`${def.name}: ${def.description}`}
            className={`text-[9px] font-fantasy px-1.5 py-0.5 rounded ${def.colorClass}`}
          >
            {def.icon} {def.badge}
            {s.turnsLeft < 99 ? ` ${s.turnsLeft}` : ''}
          </span>
        );
      })}
    </div>
  );
}

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
