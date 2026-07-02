import { useState, useReducer, useRef, useCallback } from 'react';
import type { Character, Rating } from '../types/game';
import type { EnemyDef } from '../lib/enemies';
import { EFFECTIVENESS_MULT, isHighlyEffective } from '../lib/enemies';
import type { Ability } from '../lib/abilities';
import { getAbilitiesForInstrument, battleBeatCount, battleBpm, battleBpmRange } from '../lib/abilities';
import type { AbilityTier } from '../lib/abilities';
import { getInstrumentColor, pitchToleranceCents, INSTRUMENTS } from '../lib/instruments';
import { getEffectiveStats } from '../lib/gear';
import {
  STATUS_DEFS, hasStatus, tickDurations, clearStatus, clearByKind, applyStatus,
  endOfTurnHpDelta, newStatus,
  BLIND_TOLERANCE_MULT, BLIND_MISS_CHANCE, FOCUS_TOLERANCE_MULT, MANIC_TOLERANCE_MULT,
  MANIC_DEAL_MULT, MANIC_TAKEN_MULT, CALM_DEAL_MULT, CALM_TAKEN_MULT,
  VULNERABLE_TAKEN_MULT, DEFLECT_PCT, CONFUSION_FAIL_CHANCE, ENEMY_DAMAGE_FLOOR,
} from '../lib/statusEffects';
import type { StatusType, StatusEffect } from '../lib/statusEffects';
import { BATTLE_ITEMS, STARTER_KIT } from '../lib/battleItems';
import type { BattleItem } from '../lib/battleItems';
import { ALLY_BATTLE_DEFS, getAllyForInstrument, SUMMON_SCALE } from '../lib/allies';
import type { AllyId } from '../types/game';
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
  playerSp: number;
  playerStatuses: StatusEffect[];
  defending: boolean;
  enemy: EnemyState;
  enemyTaunted: boolean;
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
  | { type: 'SPEND_RP'; amount: number }
  | { type: 'EARN_SP'; amount: number }
  | { type: 'SPEND_SP'; amount: number }
  | { type: 'SET_ENEMY_TAUNTED'; value: boolean }
  | { type: 'EXPOSE_WEAKPOINT' };

function buildInitialState(character: Character, enemy: EnemyDef, simulatorMode = false): BattleState {
  return {
    playerHp: character.hp,
    playerMaxHp: character.maxHp,
    playerRp: character.resonancePoints,
    playerSp: character.summonPoints,
    playerStatuses: [],
    defending: false,
    enemy: {
      def: enemy,
      hp: enemy.maxHp,
      maxHp: enemy.maxHp,
      phase: 1,
      statuses: [],
    },
    enemyTaunted: false,
    log: [
      `Battle starts! ${enemy.name} appears!`,
      ...(isHighlyEffective(enemy, character.instrument)
        ? [`▲ Your ${INSTRUMENTS[character.instrument].name} resonates against ${enemy.name} — your attacks are highly effective!`]
        : []),
    ],
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
    case 'SPEND_RP':
      return { ...state, playerRp: Math.max(0, state.playerRp - action.amount) };
    case 'EARN_SP':
      return { ...state, playerSp: state.playerSp + action.amount };
    case 'SPEND_SP':
      return { ...state, playerSp: Math.max(0, state.playerSp - action.amount) };
    case 'SET_ENEMY_TAUNTED':
      return { ...state, enemyTaunted: action.value };
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
  onVictory: (rpEarned: number, spDelta: number) => void;
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
  const [menu, setMenu] = useState<'actions' | 'items' | 'summons'>('actions');
  const [items, setItems] = useState<Record<string, number>>(() => ({ ...STARTER_KIT }));
  const [pendingSummonAllyId, setPendingSummonAllyId] = useState<AllyId | null>(null);
  const [pendingSpecialAtk, setPendingSpecialAtk] = useState<{
    name: string; baseDmg: number; challengeType: string;
  } | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const rpEarnedRef = useRef(0);
  const spEarnedRef = useRef(0);
  const spSpentRef = useRef(0);
  const playerTurnNoRef = useRef(1);        // counts player turns (slow parity)
  const enemyTurnNoRef = useRef(0);         // counts enemy turns (slow parity)
  const bonusActionUsedRef = useRef(false); // haste extra-action consumed this turn
  // Always-fresh snapshot of state for use inside async (setTimeout) callbacks,
  // where the captured `state` closure would otherwise be stale.
  const stateRef = useRef(state);
  stateRef.current = state;

  const color = getInstrumentColor(character.instrument);
  // GDD matchup layer: the player's class counters this enemy's musical nature.
  // Applies to the player's own abilities only — summons are other instruments.
  const highlyEffective = isHighlyEffective(enemy, character.instrument);
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
    const matchupMult = highlyEffective ? EFFECTIVENESS_MULT : 1;
    const base = effectiveStats.power * ability.damageMultiplier * (score / 100);
    return Math.max(1, Math.round(base * perfectMult * weakpointMult * offenseMult * matchupMult));
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
    // Detect phase 2 transition before dispatching so we can log it immediately.
    const newHp = Math.max(0, s.enemy.hp - dmg);
    if (s.enemy.phase === 1 && s.enemy.def.phase2Threshold &&
        newHp > 0 && newHp / s.enemy.maxHp <= s.enemy.def.phase2Threshold) {
      addLog(`⚡ ${enemy.name} enters PHASE 2!`);
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
    const sp = Math.floor(rp / 2);
    if (sp > 0) {
      spEarnedRef.current += sp;
      dispatch({ type: 'EARN_SP', amount: sp });
    }

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
      addLog(`${isPerfect ? '✨ PERFECT! ' : ''}${ability.name} — ${applied} dmg to ${enemy.name} (${score}%${isPerfect ? ' ×2' : ''}${highlyEffective ? ' ▲' : ''})`);
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

  // ── Symphony Ally Summons ─────────────────────────────────────────────────────

  // Find the one ally this character's instrument can summon.
  const characterAllyId = getAllyForInstrument(character.instrument);
  const canSummon = characterAllyId !== null
    && character.freedAllies.includes(characterAllyId);

  function handleSummon(allyId: AllyId) {
    const def = ALLY_BATTLE_DEFS[allyId];
    if (stateRef.current.playerSp < def.spCost) {
      addLog(`Not enough SP to summon ${def.name}. (Need ${def.spCost}, have ${stateRef.current.playerSp})`);
      return;
    }
    dispatch({ type: 'SPEND_SP', amount: def.spCost });
    spSpentRef.current += def.spCost;
    setPendingSummonAllyId(allyId);
  }

  function handleSummonComplete(rating: Rating, _score: number) {
    const allyId = pendingSummonAllyId;
    setPendingSummonAllyId(null);
    if (!allyId) return;

    const def = ALLY_BATTLE_DEFS[allyId];
    const scale = SUMMON_SCALE[rating] ?? 0.2;
    addLog(`${def.abilityName} — ${def.name} answers the call! (${rating})`);

    switch (allyId) {
      // ── percival: timpani solo ── 4 small hits + big finale + vulnerable
      case 'percival': {
        const smallHit = Math.round(effectiveStats.power * 2 * scale);
        let total = 0;
        for (let i = 0; i < 4; i++) total += dealDamageToEnemy(smallHit);
        const bigHit = Math.round(effectiveStats.power * 8 * scale);
        total += dealDamageToEnemy(bigHit);
        addLog(`🥁 Grand Drum Roll — 4+1 strikes, ${total} total dmg!`);
        applyStatusToEnemy('vulnerable');
        break;
      }
      // ── syrinx: full heal
      case 'syrinx': {
        const heal = Math.round(stateRef.current.playerMaxHp * scale);
        dispatch({ type: 'HEAL_PLAYER', amount: heal });
        addLog(`🌬️ Ethereal Aria — ${heal} HP restored!`);
        break;
      }
      // ── salpinx: fanfare chorus — 7 escalating hits + haste + focus
      case 'salpinx': {
        const hitMults = [1, 1, 1, 1, 1.5, 1.5, 2];
        const base = Math.round(effectiveStats.power * 2 * scale);
        let total = 0;
        for (const m of hitMults) total += dealDamageToEnemy(Math.round(base * m));
        addLog(`🎺 Fanfare of Light — 7-hit chorus, ${total} total dmg!`);
        applyStatusToPlayer('haste');
        applyStatusToPlayer('focus');
        break;
      }
      // ── chalumeau: 12-hit cascade + focus
      case 'chalumeau': {
        const hitDmg = Math.round(effectiveStats.power * 1.5 * scale);
        let total = 0;
        for (let i = 0; i < 12; i++) total += dealDamageToEnemy(hitDmg);
        addLog(`🎶 Crystalline Cascade — 12 hits, ${total} total dmg!`);
        applyStatusToPlayer('focus');
        break;
      }
      // ── hautbois: 50% heal + clear debuffs + deflect
      case 'hautbois': {
        const heal = Math.round(stateRef.current.playerMaxHp * 0.5 * scale);
        dispatch({ type: 'HEAL_PLAYER', amount: heal });
        addLog(`🎼 The Tuning A — ${heal} HP restored!`);
        dispatch({ type: 'CLEAR_PLAYER_DEBUFFS' });
        addLog('🎼 All debuffs cleared!');
        applyStatusToPlayer('deflect');
        break;
      }
      // ── waldhorn: 3 escalating echo hits + confusion or cramped
      case 'waldhorn': {
        const mults = [3, 5, 7];
        let total = 0;
        for (const m of mults) total += dealDamageToEnemy(Math.round(effectiveStats.power * m * scale));
        addLog(`📯 Mountain Echo — 3 escalating strikes, ${total} total dmg!`);
        const status = Math.random() < 0.5 ? 'confusion' : 'cramped';
        applyStatusToEnemy(status as 'confusion' | 'cramped');
        break;
      }
      // ── posaune: massive single hit + slow + cramped
      case 'posaune': {
        const dmg = dealDamageToEnemy(Math.round(effectiveStats.power * 12 * scale));
        addLog(`〰️ Slide into Shadow — ${dmg} dmg!`);
        applyStatusToEnemy('slow');
        applyStatusToEnemy('cramped');
        break;
      }
      // ── cantora: euphonium = heavy damage; tuba = medium damage + deflect + taunt
      case 'cantora': {
        if (character.instrument === 'tuba') {
          const dmg = dealDamageToEnemy(Math.round(effectiveStats.power * 5 * scale));
          addLog(`🔊 Pedal Tone Quake — ${dmg} dmg!`);
          applyStatusToPlayer('deflect');
          dispatch({ type: 'SET_ENEMY_TAUNTED', value: true });
          addLog(`🔊 ${enemy.name} is taunted — it can only basic-attack next turn.`);
        } else {
          const dmg = dealDamageToEnemy(Math.round(effectiveStats.power * 8 * scale));
          addLog(`🔊 Pedal Tone Quake — ${dmg} dmg!`);
        }
        break;
      }
      // ── bassanello: 30% heal + clear debuffs + regen ×5
      case 'bassanello': {
        const heal = Math.round(stateRef.current.playerMaxHp * 0.3 * scale);
        dispatch({ type: 'HEAL_PLAYER', amount: heal });
        addLog(`🍃 Cantus Antiquus — ${heal} HP restored!`);
        dispatch({ type: 'CLEAR_PLAYER_DEBUFFS' });
        addLog('🍃 All debuffs cleared!');
        // Apply regen with 5-turn duration (overrides the 3-turn default).
        applyStatusToPlayer('regen', 5);
        break;
      }
      // ── vela: random damage + random enemy debuff
      case 'vela': {
        const dmg = dealDamageToEnemy(Math.round(effectiveStats.power * (5 + Math.random() * 5) * scale));
        addLog(`🎷 Cool Jazz Improv — improvised for ${dmg} dmg!`);
        const debuffs: Array<'slow' | 'blind' | 'confusion' | 'poison' | 'vulnerable' | 'cramped'> =
          ['slow', 'blind', 'confusion', 'poison', 'vulnerable', 'cramped'];
        const picked = debuffs[Math.floor(Math.random() * debuffs.length)];
        applyStatusToEnemy(picked);
        break;
      }
      // ── grand_symphony: everything
      case 'grand_symphony': {
        const dmg = dealDamageToEnemy(Math.round(effectiveStats.power * 15));
        dispatch({ type: 'HEAL_PLAYER', amount: stateRef.current.playerMaxHp });
        dispatch({ type: 'CLEAR_ENEMY_BUFFS' });
        applyStatusToPlayer('haste');
        applyStatusToPlayer('focus');
        applyStatusToPlayer('regen');
        applyStatusToPlayer('deflect');
        addLog(`✨ SACRED SCORE — ${dmg} dmg, full heal, all buffs!`);
        break;
      }
    }

    afterPlayerAction();
  }

  // ── Special Attack Defense ────────────────────────────────────────────────────

  function handleSpecialDefenseComplete(rating: Rating, _score: number) {
    const atk = pendingSpecialAtk;
    setPendingSpecialAtk(null);
    if (!atk) return;

    const goodOrBetter = rating === 'good' || rating === 'excellent' || rating === 'superior';
    // Good+ = 60% damage reduction (take 40%), Fair/Poor = 20% reduction (take 80%)
    const takenPct = goodOrBetter ? 0.40 : 0.80;
    const rawDmg = Math.round(atk.baseDmg * takenPct);
    const applied = dealDamageToPlayer(rawDmg);

    if (goodOrBetter) {
      addLog(`✓ Defended! ${atk.name} partially blocked — ${applied} dmg taken.`);
    } else {
      addLog(`✗ Defense failed! ${atk.name} hits hard — ${applied} dmg taken.`);
    }

    finishEnemyTurn();
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
      // Cramped — hard 1-turn stun, NOT cleared by damage.
      if (hasStatus(eStatuses, 'cramped')) {
        addLog(`🤝 ${enemy.name}'s hand seizes up — it cannot act!`);
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
        // Endurance mitigates damage, but never below ENEMY_DAMAGE_FLOOR of the
        // enemy's (manic-scaled) power — so no class becomes invincible.
        const scaledPower = enemyPower * manicMult;
        const raw = Math.max(
          1,
          Math.round(Math.max(scaledPower * ENEMY_DAMAGE_FLOOR, scaledPower - effectiveStats.endurance * 0.5)),
        );
        const applied = dealDamageToPlayer(raw);
        addLog(`${enemy.name} attacks! ${applied} damage.${attacks > 1 ? ` (${i + 1}/${attacks})` : ''}`);
      }

      // Inflict its signature status.
      if (s.enemy.def.debuff && Math.random() < (s.enemy.def.debuffChance ?? 0.4)) {
        const eff = newStatus(s.enemy.def.debuff, s.enemy.def.debuffDuration);
        dispatch({ type: 'APPLY_PLAYER_STATUS', effect: eff });
        addLog(`${STATUS_DEFS[s.enemy.def.debuff].icon} ${enemy.name} inflicts ${STATUS_DEFS[s.enemy.def.debuff].name}!`);
      }

      // Special attack — skipped when enemy is taunted (Tuba summon).
      const specialChance = s.enemy.phase === 2 ? 0.45 : 0.25;
      if (!s.enemyTaunted && s.enemy.def.specialAttackChallengeType && Math.random() < specialChance) {
        const atkName = s.enemy.def.specialAttackName ?? 'Special Attack';
        const baseDmg = Math.round(enemyPower * manicMult * 1.5);
        addLog(`⚠️ ${enemy.name} uses ${atkName}! DEFEND!`);
        setPendingSpecialAtk({
          name: atkName,
          baseDmg,
          challengeType: s.enemy.def.specialAttackChallengeType,
        });
        // finishEnemyTurn is called by handleSpecialDefenseComplete after the modal.
        return;
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
    // Clear any taunt applied by the Tuba summon.
    if (s.enemyTaunted) dispatch({ type: 'SET_ENEMY_TAUNTED', value: false });

    playerTurnNoRef.current += 1;
    bonusActionUsedRef.current = false;
    dispatch({ type: 'SET_TURN', turn: 'player' });
    setIsEnemyTurnAnimating(false);
  }

  // ── Victory / Defeat ─────────────────────────────────────────────────────────

  if (state.turn === 'victory') {
    const netSpDelta = spEarnedRef.current - spSpentRef.current;
    return (
      <VictoryScreen
        enemy={enemy}
        rpEarned={rpEarnedRef.current}
        spEarned={spEarnedRef.current}
        onContinue={() => onVictory(rpEarnedRef.current, netSpDelta)}
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
      : isManic
        ? pitchTolerance * MANIC_TOLERANCE_MULT
        : pitchTolerance;

  // The player passes automatically when asleep, cramped, or slowed on a skip turn.
  const playerAsleep   = hasStatus(state.playerStatuses, 'sleep');
  const playerCramped  = hasStatus(state.playerStatuses, 'cramped');
  const playerSlowSkip = hasStatus(state.playerStatuses, 'slow') && playerTurnNoRef.current % 2 === 0;
  const playerMustSkip = playerAsleep || playerCramped || playerSlowSkip;

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
              {highlyEffective && (
                <div className="text-[10px] text-academy-gold font-fantasy" title={`Your class counters this enemy — ability damage ×${EFFECTIVENESS_MULT}`}>
                  ▲ Weak to {INSTRUMENTS[character.instrument].name}
                </div>
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
                <span className="flex gap-2">
                  <span>⟡ {state.playerRp} RP</span>
                  {canSummon && <span className="text-academy-gold/60">◈ {state.playerSp} SP</span>}
                </span>
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
              {playerAsleep   ? '💤 You are asleep…'
               : playerCramped ? '🤝 Your hand is cramped — you cannot act.'
               : '🐌 You are too slow to act this turn.'}
            </div>
            <button
              onClick={() => skipPlayerTurn(playerAsleep
                ? `💤 ${character.displayName} is asleep and cannot act.`
                : playerCramped
                  ? `🤝 ${character.displayName}'s hand seizes up — the turn is lost.`
                  : `🐌 ${character.displayName} is too slow and loses the turn.`)}
              className="btn-secondary"
            >
              {playerAsleep ? 'Snooze…' : playerCramped ? 'Seize Up…' : 'Pass Turn'} →
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
        ) : menu === 'summons' ? (
          <>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-academy-cream/40 text-[10px] uppercase tracking-widest font-fantasy">
                Summon Maestro
              </span>
              <button onClick={() => setMenu('actions')} className="text-academy-cream/40 hover:text-academy-cream/80 text-[10px] font-fantasy">
                ← Back
              </button>
            </div>
            {characterAllyId ? (
              (() => {
                const def = ALLY_BATTLE_DEFS[characterAllyId];
                const canAfford = state.playerSp >= def.spCost;
                const freed = character.freedAllies.includes(characterAllyId);
                return (
                  <div className="space-y-1.5 mb-2">
                    <button
                      onClick={() => freed && handleSummon(characterAllyId)}
                      disabled={!freed || !canAfford}
                      className={`w-full card-panel py-3 px-3 text-left transition-all ${(!freed || !canAfford) ? 'opacity-40 cursor-not-allowed' : 'hover:border-academy-gold/50'}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-fantasy text-academy-cream/90">{def.name}</span>
                        <span className={`text-[10px] font-fantasy ${canAfford ? 'text-academy-gold' : 'text-academy-cream/30'}`}>
                          ◈ {def.spCost} SP
                        </span>
                      </div>
                      <div className="text-[10px] text-academy-gold/80 font-fantasy mb-0.5">{def.abilityName}</div>
                      <div className="text-[9px] text-academy-cream/50">{def.abilityDescription}</div>
                      {!freed && (
                        <div className="text-[9px] text-rating-poor mt-1">Not yet freed — advance the story to unlock.</div>
                      )}
                    </button>
                  </div>
                );
              })()
            ) : (
              <p className="text-academy-cream/40 text-xs text-center py-4">No maestro ally for {character.instrument}.</p>
            )}
            <p className="text-academy-cream/30 text-[9px] text-center mt-1">
              ◈ {state.playerSp} SP · Rating on the aural confirmation scales the effect.
            </p>
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
              {canSummon && (
                <button
                  onClick={() => setMenu('summons')}
                  className="card-panel py-2 px-3 text-left hover:border-academy-gold/50 transition-all"
                >
                  <div className="text-xs font-fantasy text-academy-gold">◈ Summon</div>
                  <div className="text-[9px] text-academy-cream/40 mt-0.5">
                    {ALLY_BATTLE_DEFS[characterAllyId!].name} · {state.playerSp} SP
                  </div>
                </button>
              )}
            </div>
            {isBlinded && (
              <p className="text-rating-fair text-[10px] text-center mt-1">
                🌫️ Blinded — pitch tolerance narrowed (±{Math.round(effectivePitchTolerance)}¢)
              </p>
            )}
            {isManic && (
              <p className="text-orange-400 text-[10px] text-center mt-1">
                🔥 Manic — pitch window narrowed (±{Math.round(effectivePitchTolerance)}¢) · deals 1.5× / takes 1.25×
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
          challengeFlags={{
            blind:    hasStatus(state.playerStatuses, 'blind'),
            manic:    hasStatus(state.playerStatuses, 'manic'),
            confused: hasStatus(state.playerStatuses, 'confusion'),
          }}
          onComplete={handleAbilityComplete}
          onClose={() => setActiveAbility(null)}
        />
      )}

      {/* Summon confirmation challenge */}
      {pendingSummonAllyId && (
        <ChallengeModal
          challenge={{
            id: `summon_${pendingSummonAllyId}`,
            title: `Summon: ${ALLY_BATTLE_DEFS[pendingSummonAllyId].abilityName}`,
            type: 'aural_pitch_spy',
            description: `${ALLY_BATTLE_DEFS[pendingSummonAllyId].abilityDescription} Rating scales the effect — Superior is full power.`,
            xpBase: 0,
          }}
          character={character}
          onComplete={handleSummonComplete}
          onClose={() => handleSummonComplete('poor', 0)}
        />
      )}

      {/* Enemy special attack defense challenge */}
      {pendingSpecialAtk && (
        <ChallengeModal
          challenge={{
            id: `defense_${enemy.id}`,
            title: `DEFEND: ${pendingSpecialAtk.name}!`,
            type: pendingSpecialAtk.challengeType,
            description: `${enemy.name} launches a special attack! Good or better → 60% damage reduction. Fair or Poor → only 20% reduction.`,
            xpBase: 0,
          }}
          character={character}
          onComplete={handleSpecialDefenseComplete}
          onClose={() => handleSpecialDefenseComplete('poor', 0)}
        />
      )}
    </div>
  );
}

// ── Victory / Defeat screens ──────────────────────────────────────────────────

function VictoryScreen({ enemy, rpEarned, spEarned, onContinue }: {
  enemy: EnemyDef;
  rpEarned: number;
  spEarned: number;
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
        {spEarned > 0 && (
          <div className="text-center">
            <div className="text-academy-cream/40 text-xs mb-1">SP Earned</div>
            <div className="fantasy-title text-xl text-academy-gold">+{spEarned}</div>
          </div>
        )}
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
