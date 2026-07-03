import { useState, useReducer, useRef, useCallback } from 'react';
import type { Character, Rating } from '../types/game';
import type { EnemyDef } from '../lib/enemies';
import { EFFECTIVENESS_MULT } from '../lib/enemies';
import type { Ability } from '../lib/abilities';
import { getAbilitiesForInstrument, battleBeatCount, battleBpm, battleBpmRange } from '../lib/abilities';
import type { AbilityTier } from '../lib/abilities';
import { getInstrumentColor, pitchToleranceCents } from '../lib/instruments';
import { buildParty } from '../lib/party';
import type { PartyMemberDef } from '../lib/party';
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
import MaestroPortrait from './MaestroPortrait';
import Avatar from './Avatar';

// ── State types ───────────────────────────────────────────────────────────────

interface MemberState {
  def: PartyMemberDef;
  hp: number;
  maxHp: number;
  statuses: StatusEffect[];
  defending: boolean;
}

interface EnemyUnitState {
  def: EnemyDef;
  hp: number;
  maxHp: number;
  phase: 1 | 2;
  statuses: StatusEffect[];
  weakpointExposed: boolean;
}

interface BattleState {
  party: MemberState[];
  activeIdx: number;               // whose command it is during the player round
  enemies: EnemyUnitState[];
  playerRp: number;                // pooled band resources (held by the hero)
  playerSp: number;
  enemyTaunted: boolean;
  log: string[];
  turn: 'player' | 'enemy' | 'victory' | 'defeat';
  simulatorMode: boolean;
}

type BattleAction =
  | { type: 'DAMAGE_ENEMY'; idx: number; amount: number }
  | { type: 'DAMAGE_MEMBER'; idx: number; amount: number }
  | { type: 'HEAL_MEMBER'; idx: number; amount: number }
  | { type: 'ADD_LOG'; message: string }
  | { type: 'SET_TURN'; turn: BattleState['turn'] }
  | { type: 'SET_ACTIVE'; idx: number }
  | { type: 'SET_MEMBER_DEFENDING'; idx: number; value: boolean }
  | { type: 'CLEAR_ALL_DEFENDING' }
  | { type: 'APPLY_MEMBER_STATUS'; idx: number; effect: StatusEffect }
  | { type: 'APPLY_ENEMY_STATUS'; idx: number; effect: StatusEffect }
  | { type: 'CLEAR_MEMBER_DEBUFFS'; idx: number }
  | { type: 'CLEAR_ENEMY_BUFFS'; idx: number }
  | { type: 'TICK_PARTY_STATUSES' }
  | { type: 'TICK_ENEMY_STATUSES' }
  | { type: 'EARN_RP'; amount: number }
  | { type: 'SPEND_RP'; amount: number }
  | { type: 'EARN_SP'; amount: number }
  | { type: 'SPEND_SP'; amount: number }
  | { type: 'SET_ENEMY_TAUNTED'; value: boolean }
  | { type: 'EXPOSE_WEAKPOINT'; idx: number };

function buildInitialState(character: Character, enemies: EnemyDef[], simulatorMode = false): BattleState {
  const partyDefs = buildParty(character);
  const party: MemberState[] = partyDefs.map((def) => ({
    def,
    // The hero carries their current HP into battle; maestros arrive rested.
    hp: def.isHero ? character.hp : def.maxHp,
    maxHp: def.maxHp,
    statuses: [],
    defending: false,
  }));
  const units: EnemyUnitState[] = enemies.map((def) => ({
    def, hp: def.maxHp, maxHp: def.maxHp, phase: 1, statuses: [], weakpointExposed: false,
  }));
  const introName = enemies.length === 1 ? enemies[0].name : `${enemies[0].name} ×${enemies.length}`;
  return {
    party,
    activeIdx: 0,
    enemies: units,
    playerRp: character.resonancePoints,
    playerSp: character.summonPoints,
    enemyTaunted: false,
    log: [`Battle starts! ${introName} appears!`],
    turn: 'player',
    simulatorMode,
  };
}

const allEnemiesDown = (enemies: EnemyUnitState[]) => enemies.every((e) => e.hp <= 0);
const allPartyDown = (party: MemberState[]) => party.every((m) => m.hp <= 0);

function reducer(state: BattleState, action: BattleAction): BattleState {
  switch (action.type) {
    case 'DAMAGE_ENEMY': {
      const enemies = state.enemies.map((u, i) => {
        if (i !== action.idx) return u;
        const newHp = Math.max(0, u.hp - action.amount);
        const phase = u.def.phase2Threshold && u.phase === 1 &&
          newHp > 0 && newHp / u.maxHp <= u.def.phase2Threshold ? (2 as const) : u.phase;
        // Taking damage wakes a sleeping enemy; a landed hit consumes the weakpoint.
        return { ...u, hp: newHp, phase, statuses: clearStatus(u.statuses, 'sleep'), weakpointExposed: false };
      });
      return { ...state, enemies, turn: allEnemiesDown(enemies) ? 'victory' : state.turn };
    }
    case 'DAMAGE_MEMBER': {
      const minHp = state.simulatorMode ? 1 : 0;
      const party = state.party.map((m, i) => {
        if (i !== action.idx) return m;
        const reduction = m.defending ? 0.5 : 1.0;
        const newHp = Math.max(minHp, m.hp - Math.floor(action.amount * reduction));
        return { ...m, hp: newHp, statuses: clearStatus(m.statuses, 'sleep') };
      });
      return { ...state, party, turn: allPartyDown(party) ? 'defeat' : state.turn };
    }
    case 'HEAL_MEMBER': {
      const party = state.party.map((m, i) =>
        i === action.idx ? { ...m, hp: Math.min(m.maxHp, m.hp + action.amount) } : m);
      return { ...state, party };
    }
    case 'ADD_LOG':
      return { ...state, log: [...state.log.slice(-9), action.message] };
    case 'SET_TURN':
      if (state.turn === 'victory' || state.turn === 'defeat') return state;
      return { ...state, turn: action.turn };
    case 'SET_ACTIVE':
      return { ...state, activeIdx: action.idx };
    case 'SET_MEMBER_DEFENDING': {
      const party = state.party.map((m, i) => (i === action.idx ? { ...m, defending: action.value } : m));
      return { ...state, party };
    }
    case 'CLEAR_ALL_DEFENDING':
      return { ...state, party: state.party.map((m) => ({ ...m, defending: false })) };
    case 'APPLY_MEMBER_STATUS': {
      const party = state.party.map((m, i) =>
        i === action.idx ? { ...m, statuses: applyStatus(m.statuses, action.effect).list } : m);
      return { ...state, party };
    }
    case 'APPLY_ENEMY_STATUS': {
      const enemies = state.enemies.map((u, i) =>
        i === action.idx ? { ...u, statuses: applyStatus(u.statuses, action.effect).list } : u);
      return { ...state, enemies };
    }
    case 'CLEAR_MEMBER_DEBUFFS': {
      const party = state.party.map((m, i) =>
        i === action.idx ? { ...m, statuses: clearByKind(m.statuses, 'debuff') } : m);
      return { ...state, party };
    }
    case 'CLEAR_ENEMY_BUFFS': {
      const enemies = state.enemies.map((u, i) =>
        i === action.idx ? { ...u, statuses: clearByKind(u.statuses, 'buff') } : u);
      return { ...state, enemies };
    }
    case 'TICK_PARTY_STATUSES': {
      const minHp = state.simulatorMode ? 1 : 0;
      const party = state.party.map((m) => {
        if (m.hp <= 0) return m;
        const delta = endOfTurnHpDelta(m.statuses, m.maxHp);
        return {
          ...m,
          hp: Math.max(minHp, Math.min(m.maxHp, m.hp + delta)),
          statuses: tickDurations(m.statuses),
        };
      });
      return { ...state, party, turn: allPartyDown(party) ? 'defeat' : state.turn };
    }
    case 'TICK_ENEMY_STATUSES': {
      const enemies = state.enemies.map((u) => {
        if (u.hp <= 0) return u;
        const delta = endOfTurnHpDelta(u.statuses, u.maxHp);
        return {
          ...u,
          hp: Math.max(0, Math.min(u.maxHp, u.hp + delta)),
          statuses: tickDurations(u.statuses),
        };
      });
      return { ...state, enemies, turn: allEnemiesDown(enemies) ? 'victory' : state.turn };
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
    case 'EXPOSE_WEAKPOINT': {
      const enemies = state.enemies.map((u, i) => (i === action.idx ? { ...u, weakpointExposed: true } : u));
      return { ...state, enemies };
    }
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
  superior:  'bg-rating-superior/15 text-rating-superior',
  excellent: 'bg-rating-excellent/15 text-rating-excellent',
  good:      'bg-rating-good/15 text-rating-good',
  fair:      'bg-rating-fair/15 text-rating-fair',
  poor:      'bg-rating-poor/15 text-rating-poor',
};

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  character: Character;
  enemies: EnemyDef[];
  onVictory: (rpEarned: number, spDelta: number) => void;
  onDefeat: () => void;
  simulatorMode?: boolean;
}

type MenuState = 'actions' | 'items' | 'summons' | 'target-enemy' | 'target-ally';

export default function BattleScreen({ character, enemies, onVictory, onDefeat, simulatorMode = false }: Props) {
  const [state, dispatch] = useReducer(reducer, buildInitialState(character, enemies, simulatorMode));
  const [activeAbility, setActiveAbility] = useState<Ability | null>(null);
  const [activeBpm, setActiveBpm] = useState(60); // tempo rolled when an action is chosen
  const [enemyActingIdx, setEnemyActingIdx] = useState<number | null>(null);
  const [actingMemberIdx, setActingMemberIdx] = useState<number | null>(null); // lunge animation
  const [lastRating, setLastRating] = useState<Rating | null>(null);
  const [perfectFlash, setPerfectFlash] = useState(false);
  const [menu, setMenu] = useState<MenuState>('actions');
  const [items, setItems] = useState<Record<string, number>>(() => ({ ...STARTER_KIT }));
  const [pendingSummonAllyId, setPendingSummonAllyId] = useState<AllyId | null>(null);
  const [pendingSpecialAtk, setPendingSpecialAtk] = useState<{
    name: string; baseDmg: number; challengeType: string; enemyIdx: number; targetIdx: number;
  } | null>(null);
  // Target selection: what we're picking a target for, and the picks themselves.
  const [pendingTargeted, setPendingTargeted] = useState<{ kind: 'ability'; ability: Ability } | { kind: 'item'; item: BattleItem } | null>(null);
  const targetEnemyRef = useRef(0);
  const targetAllyRef = useRef(0);
  const actorRef = useRef(0);

  // FF-style transient battle FX: floating damage/heal numbers + hit flashes.
  const [floaters, setFloaters] = useState<{ id: number; anchor: string; text: string; color: string }[]>([]);
  const [flashes, setFlashes] = useState<Record<string, number>>({});
  const [showFullLog, setShowFullLog] = useState(false);
  const floaterIdRef = useRef(0);
  const logEndRef = useRef<HTMLDivElement>(null);
  const rpEarnedRef = useRef(0);
  const spEarnedRef = useRef(0);
  const spSpentRef = useRef(0);
  const roundNoRef = useRef(1);            // player rounds (slow parity)
  const enemyRoundNoRef = useRef(0);       // enemy rounds (slow parity)
  const hasteUsedRef = useRef<Set<number>>(new Set()); // members who spent their haste action this round
  // Always-fresh snapshot of state for use inside async (setTimeout) callbacks.
  const stateRef = useRef(state);
  stateRef.current = state;

  const active = state.party[state.activeIdx];
  const activeColor = getInstrumentColor(active.def.instrument);
  const abilities = getAbilitiesForInstrument(active.def.instrument, character.level);
  const bpmRange = battleBpmRange(character.currentZone);

  const addLog = useCallback((msg: string) => dispatch({ type: 'ADD_LOG', message: msg }), []);

  const spawnFloater = useCallback((anchor: string, text: string, color = '#FFFFFF') => {
    const id = ++floaterIdRef.current;
    setFloaters((f) => [...f, { id, anchor, text, color }]);
    setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 950);
  }, []);

  const bumpFlash = useCallback((anchor: string) => {
    setFlashes((f) => ({ ...f, [anchor]: (f[anchor] ?? 0) + 1 }));
  }, []);

  const lungeMember = (idx: number) => {
    setActingMemberIdx(idx);
    setTimeout(() => setActingMemberIdx(null), 450);
  };

  // ── Living-entity helpers (always via stateRef inside async paths) ───────────
  const livingEnemyIdxs = (s: BattleState) => s.enemies.map((u, i) => (u.hp > 0 ? i : -1)).filter((i) => i >= 0);
  const livingMemberIdxs = (s: BattleState) => s.party.map((m, i) => (m.hp > 0 ? i : -1)).filter((i) => i >= 0);
  const firstLivingEnemy = (s: BattleState) => livingEnemyIdxs(s)[0] ?? -1;
  const randomLivingMember = (s: BattleState) => {
    const idxs = livingMemberIdxs(s);
    return idxs[Math.floor(Math.random() * idxs.length)] ?? -1;
  };
  const lowestHpLivingMember = (s: BattleState) => {
    const idxs = livingMemberIdxs(s);
    return idxs.reduce((best, i) =>
      best < 0 || s.party[i].hp / s.party[i].maxHp < s.party[best].hp / s.party[best].maxHp ? i : best, -1);
  };

  // ── Damage / heal / status plumbing ──────────────────────────────────────────

  function takenMultiplier(statuses: StatusEffect[]): number {
    let m = 1;
    if (hasStatus(statuses, 'manic')) m *= MANIC_TAKEN_MULT;
    if (hasStatus(statuses, 'calm')) m *= CALM_TAKEN_MULT;
    if (hasStatus(statuses, 'vulnerable')) m *= VULNERABLE_TAKEN_MULT;
    return m;
  }

  // Player-side damage to a specific enemy unit. attackerIdx receives deflect.
  function dealDamageToEnemy(enemyIdx: number, raw: number, attackerIdx: number): number {
    const s = stateRef.current;
    const unit = s.enemies[enemyIdx];
    if (!unit || unit.hp <= 0) return 0;
    let dmg = Math.max(1, Math.round(raw * takenMultiplier(unit.statuses)));
    if (hasStatus(unit.statuses, 'deflect')) {
      const reflected = Math.round(dmg * DEFLECT_PCT);
      dmg -= reflected;
      if (reflected > 0) {
        dispatch({ type: 'DAMAGE_MEMBER', idx: attackerIdx, amount: reflected });
        spawnFloater(`m${attackerIdx}`, `${reflected}`, '#F87171');
        bumpFlash(`m${attackerIdx}`);
        addLog(`🛡️ ${unit.def.name} deflects ${reflected} damage back!`);
      }
    }
    const newHp = Math.max(0, unit.hp - dmg);
    if (unit.phase === 1 && unit.def.phase2Threshold &&
        newHp > 0 && newHp / unit.maxHp <= unit.def.phase2Threshold) {
      addLog(`⚡ ${unit.def.name} enters PHASE 2!`);
    }
    dispatch({ type: 'DAMAGE_ENEMY', idx: enemyIdx, amount: dmg });
    const attacker = s.party[attackerIdx];
    const effective = attacker ? unit.def.vulnerableTo.includes(attacker.def.instrument) : false;
    spawnFloater(`e${enemyIdx}`, `${dmg}`, effective ? '#FFD700' : '#FFFFFF');
    bumpFlash(`e${enemyIdx}`);
    return dmg;
  }

  // Summon damage auto-targets the first living enemy (per hit, so multi-hit
  // strings roll over to the next foe when one falls).
  function dealSummonDamage(raw: number): number {
    const idx = firstLivingEnemy(stateRef.current);
    if (idx < 0) return 0;
    return dealDamageToEnemy(idx, raw, actorRef.current);
  }

  // Enemy-side damage to a specific member. attackerEnemyIdx receives deflect.
  function dealDamageToMember(memberIdx: number, raw: number, attackerEnemyIdx: number): number {
    const s = stateRef.current;
    const member = s.party[memberIdx];
    if (!member || member.hp <= 0) return 0;
    let dmg = Math.max(1, Math.round(raw * takenMultiplier(member.statuses)));
    if (hasStatus(member.statuses, 'deflect')) {
      const reflected = Math.round(dmg * DEFLECT_PCT);
      dmg -= reflected;
      if (reflected > 0) {
        dispatch({ type: 'DAMAGE_ENEMY', idx: attackerEnemyIdx, amount: reflected });
        spawnFloater(`e${attackerEnemyIdx}`, `${reflected}`, '#FFFFFF');
        bumpFlash(`e${attackerEnemyIdx}`);
        addLog(`🛡️ ${member.def.name} deflects ${reflected} damage back!`);
      }
    }
    dispatch({ type: 'DAMAGE_MEMBER', idx: memberIdx, amount: dmg });
    spawnFloater(`m${memberIdx}`, `${dmg}`, '#F87171');
    bumpFlash(`m${memberIdx}`);
    return dmg;
  }

  function healMember(idx: number, amount: number) {
    if (amount <= 0) return;
    dispatch({ type: 'HEAL_MEMBER', idx, amount });
    spawnFloater(`m${idx}`, `+${amount}`, '#4ADE80');
  }

  function applyStatusToMember(idx: number, type: StatusType, duration?: number) {
    const s = stateRef.current;
    const member = s.party[idx];
    if (!member || member.hp <= 0) return;
    const opp = STATUS_DEFS[type].opposite;
    if (hasStatus(member.statuses, opp)) {
      addLog(`${STATUS_DEFS[type].icon} ${STATUS_DEFS[type].name} cancels ${STATUS_DEFS[opp].name}.`);
    } else {
      addLog(`${STATUS_DEFS[type].icon} ${member.def.name}: ${STATUS_DEFS[type].name}!`);
    }
    dispatch({ type: 'APPLY_MEMBER_STATUS', idx, effect: newStatus(type, duration) });
  }

  function applyStatusToEnemyUnit(idx: number, type: StatusType, duration?: number) {
    const s = stateRef.current;
    const unit = s.enemies[idx];
    if (!unit || unit.hp <= 0) return;
    const opp = STATUS_DEFS[type].opposite;
    if (hasStatus(unit.statuses, opp)) {
      addLog(`${STATUS_DEFS[type].icon} ${STATUS_DEFS[type].name} cancels ${unit.def.name}'s ${STATUS_DEFS[opp].name}.`);
    } else {
      addLog(`${STATUS_DEFS[type].icon} ${unit.def.name}: ${STATUS_DEFS[type].name}!`);
    }
    dispatch({ type: 'APPLY_ENEMY_STATUS', idx, effect: newStatus(type, duration) });
  }

  // ── Player round flow ─────────────────────────────────────────────────────────
  // Every living member acts once per round, each fully user-controlled.

  function advanceToNextMember(fromIdx: number) {
    const s = stateRef.current;
    if (s.turn === 'victory' || s.turn === 'defeat') return;
    const living = livingMemberIdxs(s);
    const next = living.find((i) => i > fromIdx);
    setMenu('actions');
    if (next !== undefined) {
      dispatch({ type: 'SET_ACTIVE', idx: next });
    } else {
      endPlayerRound();
    }
  }

  // After a resolved action: an extra action if hasted (once per round), else pass on.
  function afterMemberAction(memberIdx: number) {
    const s = stateRef.current;
    const member = s.party[memberIdx];
    if (member && member.hp > 0 && hasStatus(member.statuses, 'haste') && !hasteUsedRef.current.has(memberIdx)) {
      hasteUsedRef.current.add(memberIdx);
      addLog(`⚡ Haste — ${member.def.name} acts again!`);
      setMenu('actions');
      return;
    }
    advanceToNextMember(memberIdx);
  }

  function endPlayerRound() {
    const s = stateRef.current;
    for (const i of livingMemberIdxs(s)) {
      const d = endOfTurnHpDelta(s.party[i].statuses, s.party[i].maxHp);
      if (d < 0) addLog(`☠️ Poison saps ${-d} HP from ${s.party[i].def.name}.`);
      else if (d > 0) addLog(`🌿 Regen restores ${d} HP to ${s.party[i].def.name}.`);
    }
    dispatch({ type: 'TICK_PARTY_STATUSES' });
    dispatch({ type: 'SET_TURN', turn: 'enemy' });
    enemyRoundNoRef.current += 1;
    runEnemyAt(0);
  }

  // ── Enemy round: each living enemy acts in sequence ───────────────────────────

  function runEnemyAt(startIdx: number) {
    const s = stateRef.current;
    if (s.turn === 'victory' || s.turn === 'defeat') return;
    const idx = s.enemies.findIndex((u, i) => i >= startIdx && u.hp > 0);
    if (idx === -1) { finishEnemyRound(); return; }
    setEnemyActingIdx(idx);

    setTimeout(() => {
      const s2 = stateRef.current;
      if (s2.turn === 'victory' || s2.turn === 'defeat') return;
      const unit = s2.enemies[idx];
      if (!unit || unit.hp <= 0) { runEnemyAt(idx + 1); return; }
      const eStatuses = unit.statuses;
      const name = unit.def.name;

      // Sleep — skips its turn (woken only by damage).
      if (hasStatus(eStatuses, 'sleep')) {
        addLog(`💤 ${name} is asleep.`);
        runEnemyAt(idx + 1);
        return;
      }
      // Cramped — hard 1-turn stun, NOT cleared by damage.
      if (hasStatus(eStatuses, 'cramped')) {
        addLog(`🤝 ${name}'s hand seizes up — it cannot act!`);
        runEnemyAt(idx + 1);
        return;
      }
      // Slow — acts only every other round.
      if (hasStatus(eStatuses, 'slow') && enemyRoundNoRef.current % 2 === 0) {
        addLog(`🐌 ${name} is too slow to act.`);
        runEnemyAt(idx + 1);
        return;
      }

      const targetIdx = randomLivingMember(s2);
      if (targetIdx < 0) return; // defeat already resolved
      const target = s2.party[targetIdx];
      const attacks = hasStatus(eStatuses, 'haste') ? 2 : 1;
      const enemyPower = unit.def.power + (unit.phase === 2 ? 5 : 0);
      const manicMult = hasStatus(eStatuses, 'manic') ? MANIC_DEAL_MULT : 1;

      for (let i = 0; i < attacks; i++) {
        if (hasStatus(eStatuses, 'confusion') && !hasStatus(eStatuses, 'clarity')
            && Math.random() < CONFUSION_FAIL_CHANCE) {
          addLog(`💫 ${name} flails in confusion.`);
          continue;
        }
        if (hasStatus(eStatuses, 'blind') && !hasStatus(eStatuses, 'focus')
            && Math.random() < BLIND_MISS_CHANCE) {
          addLog(`🌫️ ${name}'s attack misses!`);
          continue;
        }
        // Endurance mitigates damage, but never below ENEMY_DAMAGE_FLOOR of the
        // enemy's (manic-scaled) power — so no class becomes invincible.
        const scaledPower = enemyPower * manicMult;
        const raw = Math.max(
          1,
          Math.round(Math.max(scaledPower * ENEMY_DAMAGE_FLOOR, scaledPower - target.def.stats.endurance * 0.5)),
        );
        const applied = dealDamageToMember(targetIdx, raw, idx);
        addLog(`${name} attacks ${target.def.name}! ${applied} damage.${attacks > 1 ? ` (${i + 1}/${attacks})` : ''}`);
      }

      // Inflict its signature status on the same target.
      if (unit.def.debuff && Math.random() < (unit.def.debuffChance ?? 0.4)) {
        applyStatusToMember(targetIdx, unit.def.debuff, unit.def.debuffDuration);
      }

      // Special attack — the targeted member performs the defense challenge.
      const specialChance = unit.phase === 2 ? 0.45 : 0.25;
      if (!s2.enemyTaunted && unit.def.specialAttackChallengeType && Math.random() < specialChance
          && stateRef.current.party[targetIdx].hp > 0) {
        const atkName = unit.def.specialAttackName ?? 'Special Attack';
        const baseDmg = Math.round(enemyPower * manicMult * 1.5);
        addLog(`⚠️ ${name} uses ${atkName} on ${target.def.name}! DEFEND!`);
        setPendingSpecialAtk({
          name: atkName, baseDmg,
          challengeType: unit.def.specialAttackChallengeType,
          enemyIdx: idx, targetIdx,
        });
        // The chain resumes in handleSpecialDefenseComplete.
        return;
      }

      runEnemyAt(idx + 1);
    }, 900);
  }

  function finishEnemyRound() {
    const s = stateRef.current;
    for (const i of livingEnemyIdxs(s)) {
      const d = endOfTurnHpDelta(s.enemies[i].statuses, s.enemies[i].maxHp);
      if (d < 0) addLog(`☠️ Poison saps ${-d} HP from ${s.enemies[i].def.name}.`);
      else if (d > 0) addLog(`🌿 ${s.enemies[i].def.name} regenerates ${d} HP.`);
    }
    dispatch({ type: 'TICK_ENEMY_STATUSES' });
    if (s.enemyTaunted) dispatch({ type: 'SET_ENEMY_TAUNTED', value: false });
    setEnemyActingIdx(null);

    // New player round: defending wears off now (after it actually protected).
    roundNoRef.current += 1;
    hasteUsedRef.current.clear();
    dispatch({ type: 'CLEAR_ALL_DEFENDING' });
    dispatch({ type: 'SET_TURN', turn: 'player' });
    const first = livingMemberIdxs(stateRef.current)[0];
    if (first !== undefined) dispatch({ type: 'SET_ACTIVE', idx: first });
  }

  // ── Commands ──────────────────────────────────────────────────────────────────

  function abilityNeedsEnemyTarget(ab: Ability): boolean {
    return ab.damageMultiplier > 0 || !!ab.inflicts || !!ab.inflictsMany?.length || ab.id === 'resonant_frequency';
  }

  // Pick targets (auto when there's only one option), then start the challenge.
  function requestAbility(ab: Ability) {
    actorRef.current = state.activeIdx;
    if (ab.isHealing || ab.isRevive) {
      const s = stateRef.current;
      const pool = ab.isRevive
        ? s.party.map((m, i) => (m.hp <= 0 ? i : -1)).filter((i) => i >= 0)
        : livingMemberIdxs(s);
      if (ab.isRevive && pool.length === 0) {
        addLog('No fallen ally to revive.');
        return;
      }
      if (pool.length > 1) {
        setPendingTargeted({ kind: 'ability', ability: ab });
        setMenu('target-ally');
        return;
      }
      targetAllyRef.current = pool[0] ?? state.activeIdx;
      startAbility(ab);
      return;
    }
    if (abilityNeedsEnemyTarget(ab)) {
      const living = livingEnemyIdxs(stateRef.current);
      if (living.length > 1) {
        setPendingTargeted({ kind: 'ability', ability: ab });
        setMenu('target-enemy');
        return;
      }
      targetEnemyRef.current = living[0] ?? 0;
    }
    startAbility(ab);
  }

  function startAbility(ab: Ability) {
    setActiveBpm(battleBpm(character.currentZone)); // roll tempo once per action
    setMenu('actions');
    setPendingTargeted(null);
    setActiveAbility(ab);
  }

  function chooseEnemyTarget(idx: number) {
    targetEnemyRef.current = idx;
    if (pendingTargeted?.kind === 'ability') startAbility(pendingTargeted.ability);
    else if (pendingTargeted?.kind === 'item') resolveItem(pendingTargeted.item, idx);
  }

  function chooseAllyTarget(idx: number) {
    targetAllyRef.current = idx;
    if (pendingTargeted?.kind === 'ability') startAbility(pendingTargeted.ability);
  }

  // score is 0–100 continuous pitch accuracy; 100 triggers the perfect bonus (2×).
  function computeDamage(ability: Ability, score: number): number {
    const s = stateRef.current;
    const actor = s.party[actorRef.current];
    const targetUnit = s.enemies[targetEnemyRef.current];
    const perfectMult = score === 100 ? 2 : 1;
    const weakpointMult = targetUnit?.weakpointExposed ? 2 : 1;
    const offenseMult = hasStatus(actor.statuses, 'manic') ? MANIC_DEAL_MULT
      : hasStatus(actor.statuses, 'calm') ? CALM_DEAL_MULT : 1;
    // GDD matchup layer: the actor's class counters this enemy's musical nature.
    const matchupMult = targetUnit && targetUnit.def.vulnerableTo.includes(actor.def.instrument)
      ? EFFECTIVENESS_MULT : 1;
    const base = actor.def.stats.power * ability.damageMultiplier * (score / 100);
    return Math.max(1, Math.round(base * perfectMult * weakpointMult * offenseMult * matchupMult));
  }

  async function handleAbilityComplete(rating: Rating, score: number) {
    if (!activeAbility) return;
    const ability = activeAbility;
    const actorIdx = actorRef.current;
    const actor = stateRef.current.party[actorIdx];
    setActiveAbility(null);
    setLastRating(rating);
    lungeMember(actorIdx);

    const rp = RP_AWARDS[rating];
    rpEarnedRef.current += rp;
    dispatch({ type: 'EARN_RP', amount: rp });
    const sp = Math.floor(rp / 2);
    if (sp > 0) {
      spEarnedRef.current += sp;
      dispatch({ type: 'EARN_SP', amount: sp });
    }

    if (ability.id === 'resonant_frequency') {
      const tIdx = targetEnemyRef.current;
      dispatch({ type: 'EXPOSE_WEAKPOINT', idx: tIdx });
      addLog(`Resonant Frequency — ${stateRef.current.enemies[tIdx]?.def.name}'s weak point is exposed!`);
      afterMemberAction(actorIdx);
      return;
    }

    // Miss — no pitch detected during the performance window.
    if (score === 0) {
      addLog(`${ability.name} — MISSED! No sound detected.`);
      afterMemberAction(actorIdx);
      return;
    }

    // Confusion — half the time the phrase scatters and the action fails.
    if (hasStatus(actor.statuses, 'confusion') && !hasStatus(actor.statuses, 'clarity')
        && Math.random() < CONFUSION_FAIL_CHANCE) {
      addLog(`💫 Confused! ${ability.name} scatters and fails.`);
      afterMemberAction(actorIdx);
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
      dispatch({ type: 'CLEAR_MEMBER_DEBUFFS', idx: actorIdx });
      addLog(`✨ ${ability.name} — debuffs shaken loose!`);
    }
    if (ability.clearsEnemyBuffs) {
      for (const i of livingEnemyIdxs(stateRef.current)) dispatch({ type: 'CLEAR_ENEMY_BUFFS', idx: i });
      addLog(`✨ ${ability.name} — enemy buffs stripped!`);
    }

    // Self-buffs (regen / haste / deflect / focus / calm …) on a solid performance.
    if (goodOrBetter) {
      if (ability.selfStatus) applyStatusToMember(actorIdx, ability.selfStatus);
      ability.selfStatusMany?.forEach((t) => applyStatusToMember(actorIdx, t));
    }

    if (ability.isRevive) {
      const tIdx = targetAllyRef.current;
      const target = stateRef.current.party[tIdx];
      if (target && target.hp <= 0) {
        const revived = Math.max(1, Math.round(target.maxHp * (score / 100)));
        healMember(tIdx, revived);
        addLog(`${isPerfect ? '✨ PERFECT! ' : ''}${ability.name} — ${target.def.name} returns with ${revived} HP!`);
      } else {
        addLog(`${ability.name} — but there is no one to revive.`);
      }
      afterMemberAction(actorIdx);
      return;
    }

    if (ability.isHealing) {
      const tIdx = targetAllyRef.current;
      const target = stateRef.current.party[tIdx];
      const healAmount = Math.round(actor.def.stats.endurance * 3 * (score / 100) * (isPerfect ? 2 : 1));
      healMember(tIdx, healAmount);
      addLog(`${isPerfect ? '✨ PERFECT! ' : ''}${ability.name} — restored ${healAmount} HP to ${target?.def.name} (${score}%${isPerfect ? ' ×2' : ''})`);
      afterMemberAction(actorIdx);
      return;
    }

    // Inflict statuses on the target, gated on a Good-or-better hit.
    const tIdx = targetEnemyRef.current;
    const inflictEnemyStatuses = () => {
      if (!goodOrBetter) return;
      if (ability.inflicts) applyStatusToEnemyUnit(tIdx, ability.inflicts);
      ability.inflictsMany?.forEach((t) => applyStatusToEnemyUnit(tIdx, t));
    };

    if (ability.damageMultiplier > 0) {
      const targetUnit = stateRef.current.enemies[tIdx];
      const effective = targetUnit?.def.vulnerableTo.includes(actor.def.instrument);
      const dmg = computeDamage(ability, score);
      const applied = dealDamageToEnemy(tIdx, dmg, actorIdx);
      addLog(`${isPerfect ? '✨ PERFECT! ' : ''}${ability.name} — ${applied} dmg to ${targetUnit?.def.name} (${score}%${isPerfect ? ' ×2' : ''}${effective ? ' ▲' : ''})`);
      inflictEnemyStatuses();
    } else {
      // Pure-utility ability (no direct damage): apply its statuses and resolve.
      inflictEnemyStatuses();
      if (!ability.clearsSelfDebuffs && !ability.clearsEnemyBuffs
          && !ability.selfStatus && !ability.selfStatusMany) {
        addLog(`${ability.name} resolves.`);
      }
    }

    afterMemberAction(actorIdx);
  }

  function handleDefend() {
    const idx = state.activeIdx;
    if (hasStatus(active.statuses, 'manic')) return; // manic cannot defend
    dispatch({ type: 'SET_MEMBER_DEFENDING', idx, value: true });
    addLog(`${active.def.name} braces for impact.`);
    advanceToNextMember(idx);
  }

  function skipMemberTurn(message: string) {
    addLog(message);
    advanceToNextMember(state.activeIdx);
  }

  // Use a consumable: applies its status (self/enemy), spends it, costs the action.
  function requestItem(item: BattleItem) {
    if ((items[item.id] ?? 0) <= 0) return;
    actorRef.current = state.activeIdx;
    if (item.target === 'enemy') {
      const living = livingEnemyIdxs(stateRef.current);
      if (living.length > 1) {
        setPendingTargeted({ kind: 'item', item });
        setMenu('target-enemy');
        return;
      }
      resolveItem(item, living[0] ?? 0);
      return;
    }
    resolveItem(item, state.activeIdx);
  }

  function resolveItem(item: BattleItem, targetIdx: number) {
    const actorIdx = actorRef.current;
    setItems((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 0) - 1 }));
    setMenu('actions');
    setPendingTargeted(null);
    addLog(`🎒 ${stateRef.current.party[actorIdx].def.name} uses ${item.name}.`);
    if (item.target === 'self') applyStatusToMember(actorIdx, item.applies);
    else applyStatusToEnemyUnit(targetIdx, item.applies);
    lungeMember(actorIdx);
    afterMemberAction(actorIdx);
  }

  // ── Symphony Ally Summons (hero only) ────────────────────────────────────────

  const characterAllyId = getAllyForInstrument(character.instrument);
  const canSummon = characterAllyId !== null
    && character.freedAllies.includes(characterAllyId)
    && active.def.isHero;

  function handleSummon(allyId: AllyId) {
    const def = ALLY_BATTLE_DEFS[allyId];
    if (stateRef.current.playerSp < def.spCost) {
      addLog(`Not enough SP to summon ${def.name}. (Need ${def.spCost}, have ${stateRef.current.playerSp})`);
      return;
    }
    actorRef.current = state.activeIdx;
    dispatch({ type: 'SPEND_SP', amount: def.spCost });
    spSpentRef.current += def.spCost;
    setPendingSummonAllyId(allyId);
  }

  function handleSummonComplete(rating: Rating, _score: number) {
    const allyId = pendingSummonAllyId;
    setPendingSummonAllyId(null);
    if (!allyId) return;

    const actorIdx = actorRef.current;
    const s0 = stateRef.current;
    const heroStats = s0.party[actorIdx].def.stats;
    const def = ALLY_BATTLE_DEFS[allyId];
    const scale = SUMMON_SCALE[rating] ?? 0.2;
    addLog(`${def.abilityName} — ${def.name} answers the call! (${rating})`);

    const healTarget = () => lowestHpLivingMember(stateRef.current);
    const debuffTarget = () => firstLivingEnemy(stateRef.current);

    switch (allyId) {
      // ── percival: timpani solo ── 4 small hits + big finale + vulnerable
      case 'percival': {
        const smallHit = Math.round(heroStats.power * 2 * scale);
        let total = 0;
        for (let i = 0; i < 4; i++) total += dealSummonDamage(smallHit);
        const bigHit = Math.round(heroStats.power * 8 * scale);
        total += dealSummonDamage(bigHit);
        addLog(`🥁 Grand Drum Roll — 4+1 strikes, ${total} total dmg!`);
        const t = debuffTarget(); if (t >= 0) applyStatusToEnemyUnit(t, 'vulnerable');
        break;
      }
      // ── syrinx: full heal (to whoever needs it most)
      case 'syrinx': {
        const t = healTarget();
        const heal = Math.round(stateRef.current.party[t].maxHp * scale);
        healMember(t, heal);
        addLog(`🌬️ Ethereal Aria — ${heal} HP restored!`);
        break;
      }
      // ── salpinx: fanfare chorus — 7 escalating hits + haste + focus
      case 'salpinx': {
        const hitMults = [1, 1, 1, 1, 1.5, 1.5, 2];
        const base = Math.round(heroStats.power * 2 * scale);
        let total = 0;
        for (const m of hitMults) total += dealSummonDamage(Math.round(base * m));
        addLog(`🎺 Fanfare of Light — 7-hit chorus, ${total} total dmg!`);
        applyStatusToMember(actorIdx, 'haste');
        applyStatusToMember(actorIdx, 'focus');
        break;
      }
      // ── chalumeau: 12-hit cascade + focus
      case 'chalumeau': {
        const hitDmg = Math.round(heroStats.power * 1.5 * scale);
        let total = 0;
        for (let i = 0; i < 12; i++) total += dealSummonDamage(hitDmg);
        addLog(`🎶 Crystalline Cascade — 12 hits, ${total} total dmg!`);
        applyStatusToMember(actorIdx, 'focus');
        break;
      }
      // ── hautbois: 50% heal + clear party debuffs + deflect
      case 'hautbois': {
        const t = healTarget();
        const heal = Math.round(stateRef.current.party[t].maxHp * 0.5 * scale);
        healMember(t, heal);
        addLog(`🎼 The Tuning A — ${heal} HP restored!`);
        for (const i of livingMemberIdxs(stateRef.current)) dispatch({ type: 'CLEAR_MEMBER_DEBUFFS', idx: i });
        addLog('🎼 The whole band retunes — all debuffs cleared!');
        applyStatusToMember(actorIdx, 'deflect');
        break;
      }
      // ── waldhorn: 3 escalating echo hits + confusion or cramped
      case 'waldhorn': {
        const mults = [3, 5, 7];
        let total = 0;
        for (const m of mults) total += dealSummonDamage(Math.round(heroStats.power * m * scale));
        addLog(`📯 Mountain Echo — 3 escalating strikes, ${total} total dmg!`);
        const status = Math.random() < 0.5 ? 'confusion' : 'cramped';
        const t = debuffTarget(); if (t >= 0) applyStatusToEnemyUnit(t, status as 'confusion' | 'cramped');
        break;
      }
      // ── posaune: massive single hit + slow + cramped
      case 'posaune': {
        const dmg = dealSummonDamage(Math.round(heroStats.power * 12 * scale));
        addLog(`〰️ Slide into Shadow — ${dmg} dmg!`);
        const t = debuffTarget();
        if (t >= 0) { applyStatusToEnemyUnit(t, 'slow'); applyStatusToEnemyUnit(t, 'cramped'); }
        break;
      }
      // ── cantora: euphonium = heavy damage; tuba = medium damage + deflect + taunt
      case 'cantora': {
        if (character.instrument === 'tuba') {
          const dmg = dealSummonDamage(Math.round(heroStats.power * 5 * scale));
          addLog(`🔊 Pedal Tone Quake — ${dmg} dmg!`);
          applyStatusToMember(actorIdx, 'deflect');
          dispatch({ type: 'SET_ENEMY_TAUNTED', value: true });
          addLog('🔊 The enemies are taunted — only basic attacks next round.');
        } else {
          const dmg = dealSummonDamage(Math.round(heroStats.power * 8 * scale));
          addLog(`🔊 Pedal Tone Quake — ${dmg} dmg!`);
        }
        break;
      }
      // ── bassanello: 30% heal + clear party debuffs + regen ×5
      case 'bassanello': {
        const t = healTarget();
        const heal = Math.round(stateRef.current.party[t].maxHp * 0.3 * scale);
        healMember(t, heal);
        addLog(`🍃 Cantus Antiquus — ${heal} HP restored!`);
        for (const i of livingMemberIdxs(stateRef.current)) dispatch({ type: 'CLEAR_MEMBER_DEBUFFS', idx: i });
        addLog('🍃 All debuffs cleared!');
        applyStatusToMember(actorIdx, 'regen', 5);
        break;
      }
      // ── vela: random damage + random enemy debuff
      case 'vela': {
        const dmg = dealSummonDamage(Math.round(heroStats.power * (5 + Math.random() * 5) * scale));
        addLog(`🎷 Cool Jazz Improv — improvised for ${dmg} dmg!`);
        const debuffs: Array<'slow' | 'blind' | 'confusion' | 'poison' | 'vulnerable' | 'cramped'> =
          ['slow', 'blind', 'confusion', 'poison', 'vulnerable', 'cramped'];
        const picked = debuffs[Math.floor(Math.random() * debuffs.length)];
        const t = debuffTarget(); if (t >= 0) applyStatusToEnemyUnit(t, picked);
        break;
      }
      // ── grand_symphony: everything, everywhere
      case 'grand_symphony': {
        let total = 0;
        for (const i of livingEnemyIdxs(stateRef.current)) {
          total += dealDamageToEnemy(i, Math.round(heroStats.power * 15), actorIdx);
          dispatch({ type: 'CLEAR_ENEMY_BUFFS', idx: i });
        }
        for (const i of livingMemberIdxs(stateRef.current)) {
          const m = stateRef.current.party[i];
          healMember(i, m.maxHp - m.hp);
          applyStatusToMember(i, 'haste');
          applyStatusToMember(i, 'focus');
          applyStatusToMember(i, 'regen');
          applyStatusToMember(i, 'deflect');
        }
        addLog(`✨ SACRED SCORE — ${total} dmg, the whole band restored!`);
        break;
      }
    }

    afterMemberAction(actorIdx);
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
    const applied = dealDamageToMember(atk.targetIdx, rawDmg, atk.enemyIdx);
    const targetName = stateRef.current.party[atk.targetIdx]?.def.name ?? 'The band';

    if (goodOrBetter) {
      addLog(`✓ Defended! ${atk.name} partially blocked — ${targetName} takes ${applied} dmg.`);
    } else {
      addLog(`✗ Defense failed! ${atk.name} hits hard — ${targetName} takes ${applied} dmg.`);
    }

    runEnemyAt(atk.enemyIdx + 1);
  }

  // ── Victory / Defeat ─────────────────────────────────────────────────────────

  if (state.turn === 'victory') {
    const netSpDelta = spEarnedRef.current - spSpentRef.current;
    return (
      <VictoryScreen
        enemies={enemies}
        rpEarned={rpEarnedRef.current}
        spEarned={spEarnedRef.current}
        onContinue={() => onVictory(rpEarnedRef.current, netSpDelta)}
      />
    );
  }

  if (state.turn === 'defeat') {
    return <DefeatScreen enemies={enemies} onRetreat={onDefeat} />;
  }

  // ── Derived UI state (active member) ─────────────────────────────────────────

  const activeStats = active.def.stats;
  const pitchTolerance = pitchToleranceCents(activeStats.accuracy);
  const isBlinded = hasStatus(active.statuses, 'blind');
  const isFocused = hasStatus(active.statuses, 'focus');
  const isManic = hasStatus(active.statuses, 'manic');
  const effectivePitchTolerance = isBlinded
    ? pitchTolerance * BLIND_TOLERANCE_MULT
    : isFocused
      ? pitchTolerance * FOCUS_TOLERANCE_MULT
      : isManic
        ? pitchTolerance * MANIC_TOLERANCE_MULT
        : pitchTolerance;

  const memberAsleep   = hasStatus(active.statuses, 'sleep');
  const memberCramped  = hasStatus(active.statuses, 'cramped');
  const memberSlowSkip = hasStatus(active.statuses, 'slow') && roundNoRef.current % 2 === 0;
  const memberMustSkip = memberAsleep || memberCramped || memberSlowSkip;

  const specialTarget = pendingSpecialAtk ? state.party[pendingSpecialAtk.targetIdx] : null;
  const multiEnemy = enemies.length > 1;

  const renderFloaters = (anchor: string) =>
    floaters.filter((f) => f.anchor === anchor).map((f, i) => (
      <div
        key={f.id}
        className="ff-floater absolute -top-4 z-10 font-fantasy text-xl font-bold pointer-events-none"
        style={{ color: f.color, left: `calc(50% - 12px + ${(i % 3) * 12}px)` }}
      >
        {f.text}
      </div>
    ));

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

      {/* ── FF-style message window (top) ─────────────────────────────────────── */}
      <div className="px-3 pt-3">
        <button
          onClick={() => setShowFullLog((v) => !v)}
          className="ff-window w-full text-left px-3 py-2 block"
          title="Tap to toggle the full battle log"
        >
          {showFullLog ? (
            <div className="max-h-28 overflow-y-auto">
              {state.log.slice(-8).map((msg, i) => (
                <p key={i} className="text-[#e8e8ff]/80 text-xs leading-relaxed">{msg}</p>
              ))}
              <div ref={logEndRef} />
            </div>
          ) : (
            <p className="text-[#f0f0ff] text-xs leading-relaxed truncate">
              {state.log[state.log.length - 1]}
            </p>
          )}
        </button>
      </div>

      {/* ── Battlefield (FF6 orientation: enemies left · party right) ─────────── */}
      <div className="flex-1 relative px-4 flex flex-col justify-center min-h-[240px]">
        {perfectFlash && (
          <div className="absolute inset-x-0 top-1/4 flex items-center justify-center pointer-events-none z-10">
            <div className="font-fantasy text-2xl text-academy-gold animate-pulse tracking-widest"
              style={{ textShadow: '0 0 20px #FFD70099, 0 0 40px #FFD70055' }}>
              ✨ PERFECT! ✨
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 py-4">
          {/* Enemy column (left) */}
          <div className="flex flex-col gap-4 flex-1 min-w-0">
            {state.enemies.map((unit, i) => {
              const dead = unit.hp <= 0;
              const effective = unit.def.vulnerableTo.includes(active.def.instrument);
              return (
                <div
                  key={i}
                  className={`relative flex flex-col items-start transition-all duration-500 ${dead ? 'opacity-0 scale-75 pointer-events-none' : ''}`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5 max-w-full">
                    <span className="text-[10px] font-fantasy text-rating-poor truncate">{unit.def.name}</span>
                    {unit.phase === 2 && <span className="text-[9px] text-discord-crimson font-fantasy flex-shrink-0">⚡P2</span>}
                    {effective && !dead && (
                      <span className="text-[9px] text-academy-gold font-fantasy flex-shrink-0" title={`${active.def.name}'s class counters this enemy — ability damage ×${EFFECTIVENESS_MULT}`}>▲</span>
                    )}
                    {unit.weakpointExposed && <span className="text-[9px] text-rating-excellent font-fantasy flex-shrink-0">⚡×2</span>}
                  </div>
                  <div className="stat-bar w-24 mb-1" style={{ height: 4 }}>
                    <div className="stat-bar-fill transition-all duration-500" style={{ width: `${(unit.hp / unit.maxHp) * 100}%`, backgroundColor: '#F87171' }} />
                  </div>
                  <div className="relative">
                    {renderFloaters(`e${i}`)}
                    <div key={`ef${flashes[`e${i}`] ?? 0}`} className={flashes[`e${i}`] ? 'ff-hit' : ''}>
                      <div
                        className={`${multiEnemy ? 'text-5xl' : 'text-7xl'} transition-transform duration-200`}
                        style={{ transform: enemyActingIdx === i ? 'translateX(14px) scale(1.08)' : 'translateX(0) scale(1)' }}
                      >
                        {getEnemyEmoji(unit.def.id)}
                      </div>
                    </div>
                    <div className={`mt-1 ${multiEnemy ? 'w-12' : 'w-16'} h-1.5 rounded-full bg-black/50 blur-[1px]`} />
                  </div>
                  <StatusBadges statuses={unit.statuses} />
                </div>
              );
            })}
          </div>

          {/* Party column (right) */}
          <div className="flex flex-col gap-2.5 items-end flex-shrink-0">
            {state.party.map((m, i) => {
              const dead = m.hp <= 0;
              const isActive = state.turn === 'player' && state.activeIdx === i && !dead;
              return (
                <div key={m.def.key} className="relative flex flex-col items-center">
                  {renderFloaters(`m${i}`)}
                  <div key={`mf${flashes[`m${i}`] ?? 0}`} className={flashes[`m${i}`] ? 'ff-hit' : ''}>
                    <div
                      className={`rounded-lg overflow-hidden transition-all duration-200 ${dead ? 'grayscale opacity-40' : ''}`}
                      style={{
                        boxShadow: isActive ? `0 0 16px ${getInstrumentColor(m.def.instrument)}88` : dead ? 'none' : `0 0 10px ${getInstrumentColor(m.def.instrument)}22`,
                        border: isActive ? `2px solid ${getInstrumentColor(m.def.instrument)}` : '2px solid transparent',
                        transform: actingMemberIdx === i ? 'translateX(-22px) scale(1.06)' : 'translateX(0) scale(1)',
                        transition: 'transform 220ms ease-out, box-shadow 200ms',
                      }}
                    >
                      {m.def.isHero ? (
                        <Avatar appearance={character.appearance} instrument={character.instrument} size={44} />
                      ) : (
                        <MaestroPortrait
                          src={m.def.portrait}
                          emoji={dead ? '💫' : m.def.emoji}
                          size={44}
                          color={getInstrumentColor(m.def.instrument)}
                        />
                      )}
                    </div>
                  </div>
                  <div className="stat-bar w-11 mt-1" style={{ height: 3 }}>
                    <div className="stat-bar-fill" style={{ width: `${(m.hp / m.maxHp) * 100}%`, backgroundColor: m.hp / m.maxHp < 0.25 ? '#F87171' : getInstrumentColor(m.def.instrument) }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Bottom window cluster (FF6/FF7-style) ─────────────────────────────── */}
      <div className="px-3 pb-4 space-y-1.5">
        {/* Party status window: one row per member */}
        <div className="ff-window px-3 py-2">
          {state.party.map((m, i) => {
            const isActive = state.turn === 'player' && state.activeIdx === i && m.hp > 0;
            const memberColor = getInstrumentColor(m.def.instrument);
            return (
              <div key={m.def.key} className="flex items-center gap-2 py-0.5">
                <span className="w-3 text-[10px] flex-shrink-0" style={{ color: isActive ? '#f0f0ff' : 'transparent', textShadow: isActive ? '0 0 6px #ffffffaa' : 'none' }}>▶</span>
                <span className={`flex-1 min-w-0 truncate text-xs font-fantasy ${m.hp <= 0 ? 'opacity-40' : ''}`} style={{ color: memberColor }}>
                  {m.def.name}
                </span>
                <span className="flex items-center gap-1 flex-shrink-0">
                  {m.defending && <span className="text-[9px]" title="Defending">🛡️</span>}
                  <StatusBadges statuses={m.statuses} />
                </span>
                <span className="w-20 text-right text-[11px] font-fantasy flex-shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  <span style={{ color: m.hp <= 0 ? '#F87171' : m.hp / m.maxHp < 0.25 ? '#F87171' : m.hp / m.maxHp < 0.6 ? '#FB923C' : '#f0f0ff' }}>{m.hp}</span>
                  <span className="text-[#9a9ac0]">/{m.maxHp}</span>
                </span>
              </div>
            );
          })}
        </div>

        {/* Command window */}
        <div className="ff-window px-2.5 py-2.5">
        {state.turn === 'enemy' ? (
          <div className="text-center text-academy-cream/50 font-fantasy text-sm animate-pulse py-4">
            {enemyActingIdx !== null && state.enemies[enemyActingIdx]
              ? `${state.enemies[enemyActingIdx].def.name} acts…`
              : 'The enemy acts…'}
          </div>
        ) : memberMustSkip ? (
          <div className="text-center py-3">
            <div className="font-fantasy text-academy-cream/70 text-sm mb-2">
              {memberAsleep   ? `💤 ${active.def.name} is asleep…`
               : memberCramped ? `🤝 ${active.def.name}'s hand is cramped — they cannot act.`
               : `🐌 ${active.def.name} is too slow to act this round.`}
            </div>
            <button
              onClick={() => skipMemberTurn(memberAsleep
                ? `💤 ${active.def.name} is asleep and cannot act.`
                : memberCramped
                  ? `🤝 ${active.def.name}'s hand seizes up — the turn is lost.`
                  : `🐌 ${active.def.name} is too slow and loses the turn.`)}
              className="btn-secondary"
            >
              {memberAsleep ? 'Snooze…' : memberCramped ? 'Seize Up…' : 'Pass Turn'} →
            </button>
          </div>
        ) : menu === 'target-enemy' ? (
          <>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-academy-cream/40 text-[10px] uppercase tracking-widest font-fantasy">Choose Target</span>
              <button onClick={() => { setMenu('actions'); setPendingTargeted(null); }} className="text-academy-cream/40 hover:text-academy-cream/80 text-[10px] font-fantasy">← Back</button>
            </div>
            <div className="flex flex-col mb-1">
              {state.enemies.map((u, i) => u.hp > 0 && (
                <button key={i} onClick={() => chooseEnemyTarget(i)}
                  className="ff-cursor w-full text-left px-2 py-1.5 rounded hover:bg-white/10 transition-colors flex items-center gap-2">
                  <span className="flex-1 min-w-0 text-left text-xs font-fantasy text-rating-poor truncate">{getEnemyEmoji(u.def.id)} {u.def.name}</span>
                  <span className="text-[9px] text-[#9a9ac0]" style={{ fontVariantNumeric: 'tabular-nums' }}>{u.hp}/{u.maxHp}</span>
                  {u.def.vulnerableTo.includes(active.def.instrument) && <span className="text-[9px] text-academy-gold">▲</span>}
                </button>
              ))}
            </div>
          </>
        ) : menu === 'target-ally' ? (
          <>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-academy-cream/40 text-[10px] uppercase tracking-widest font-fantasy">
                {pendingTargeted?.kind === 'ability' && pendingTargeted.ability.isRevive ? 'Revive Whom?' : 'Heal Whom?'}
              </span>
              <button onClick={() => { setMenu('actions'); setPendingTargeted(null); }} className="text-academy-cream/40 hover:text-academy-cream/80 text-[10px] font-fantasy">← Back</button>
            </div>
            <div className="flex flex-col mb-1">
              {state.party.map((m, i) => {
                const isRevive = pendingTargeted?.kind === 'ability' && pendingTargeted.ability.isRevive;
                const valid = isRevive ? m.hp <= 0 : m.hp > 0;
                if (!valid) return null;
                return (
                  <button key={m.def.key} onClick={() => chooseAllyTarget(i)}
                    className="ff-cursor w-full text-left px-2 py-1.5 rounded hover:bg-white/10 transition-colors flex items-center gap-2">
                    <span className="flex-1 min-w-0 text-left text-xs font-fantasy truncate" style={{ color: getInstrumentColor(m.def.instrument) }}>{m.def.emoji} {m.def.name}</span>
                    <span className="text-[9px] text-[#9a9ac0]" style={{ fontVariantNumeric: 'tabular-nums' }}>{m.hp}/{m.maxHp}</span>
                  </button>
                );
              })}
            </div>
          </>
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
            <div className="flex flex-col mb-1 max-h-56 overflow-y-auto">
              {Object.keys(items).map((id) => {
                const item = BATTLE_ITEMS[id];
                const count = items[id] ?? 0;
                const def = STATUS_DEFS[item.applies];
                return (
                  <button
                    key={id}
                    onClick={() => requestItem(item)}
                    disabled={count <= 0}
                    title={item.description}
                    className={`ff-cursor w-full text-left px-2 py-1.5 rounded transition-colors flex items-center gap-2 ${count <= 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/10'}`}
                  >
                    <span className="flex-1 min-w-0 text-left text-xs font-fantasy text-[#f0f0ff] truncate">{item.icon} {item.name}</span>
                    <span className="flex items-center gap-1.5 flex-shrink-0 text-[9px]">
                      <span className={`px-1 rounded ${def.colorClass}`}>{def.badge}</span>
                      <span className="text-[#9a9ac0]">→ {item.target === 'self' ? active.def.name : 'enemy'}</span>
                      <span className="text-[#9a9ac0]">×{count}</span>
                    </span>
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
                      className={`ff-cursor w-full text-left px-2 py-2 rounded transition-colors ${(!freed || !canAfford) ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/10'}`}
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
              <span className="text-[10px] uppercase tracking-widest font-fantasy" style={{ color: activeColor }}>
                {active.def.name} — Choose Action
              </span>
              <span className="text-academy-cream/30 text-[9px] font-fantasy">
                ⟡{state.playerRp} {canSummon ? `· ◈${state.playerSp} ` : ''}· ♩{bpmRange[0]}–{bpmRange[1]}
              </span>
            </div>
            {/* FF-style vertical command list */}
            <div className="flex flex-col mb-1 max-h-56 overflow-y-auto">
              {abilities.map((ab) => {
                const beats = battleBeatCount(ab.tier, character.currentZone);
                return (
                  <button
                    key={ab.id}
                    onClick={() => requestAbility(ab)}
                    className="ff-cursor w-full text-left px-2 py-1.5 rounded hover:bg-white/10 transition-colors flex items-center gap-2"
                  >
                    <span className="flex-1 min-w-0 text-left text-xs font-fantasy truncate" style={{ color: activeColor }}>{ab.name}</span>
                    <span className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`text-[9px] font-fantasy uppercase tracking-wide ${TIER_TEXT[ab.tier]}`}>{ab.tier}</span>
                      <span className="text-[9px] text-[#9a9ac0]">{beats}♩</span>
                      {ab.inflicts && (
                        <span className="text-[9px]" title={STATUS_DEFS[ab.inflicts].name}>{STATUS_DEFS[ab.inflicts].icon}</span>
                      )}
                      {ab.selfStatus && (
                        <span className="text-[9px]" title={STATUS_DEFS[ab.selfStatus].name}>{STATUS_DEFS[ab.selfStatus].icon}</span>
                      )}
                    </span>
                  </button>
                );
              })}
              <button
                onClick={handleDefend}
                disabled={isManic}
                className={`ff-cursor w-full text-left px-2 py-1.5 rounded transition-colors flex items-center gap-2 ${isManic ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/10'}`}
              >
                <span className="flex-1 text-left text-xs font-fantasy text-academy-gold">Defend</span>
                <span className="text-[9px] text-[#9a9ac0]">{isManic ? 'manic — cannot defend' : 'instant'}</span>
              </button>
              <button
                onClick={() => setMenu('items')}
                className="ff-cursor w-full text-left px-2 py-1.5 rounded hover:bg-white/10 transition-colors flex items-center gap-2"
              >
                <span className="flex-1 text-left text-xs font-fantasy text-academy-gold">Item</span>
                <span className="text-[9px] text-[#9a9ac0]">×{Object.values(items).reduce((a, b) => a + b, 0)}</span>
              </button>
              {canSummon && (
                <button
                  onClick={() => setMenu('summons')}
                  className="ff-cursor w-full text-left px-2 py-1.5 rounded hover:bg-white/10 transition-colors flex items-center gap-2"
                >
                  <span className="flex-1 text-left text-xs font-fantasy text-academy-gold">Summon</span>
                  <span className="text-[9px] text-[#9a9ac0]">{ALLY_BATTLE_DEFS[characterAllyId!].name} · {state.playerSp} SP</span>
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
      </div>

      {/* Ability challenge modal — performed by the acting member */}
      {activeAbility && (
        <ChallengeModal
          challenge={{
            id: `battle_${activeAbility.id}`,
            title: `${active.def.name}: ${activeAbility.name}`,
            type: 'prepared_performance',
            description: activeAbility.description,
            xpBase: 0,
            beatCount: battleBeatCount(activeAbility.tier, character.currentZone),
            bpm: activeBpm,
          }}
          character={character}
          pitchToleranceOverride={effectivePitchTolerance}
          challengeFlags={{
            blind:    hasStatus(active.statuses, 'blind'),
            manic:    hasStatus(active.statuses, 'manic'),
            confused: hasStatus(active.statuses, 'confusion'),
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

      {/* Enemy special attack — the targeted member defends */}
      {pendingSpecialAtk && specialTarget && (
        <ChallengeModal
          challenge={{
            id: `defense_${state.enemies[pendingSpecialAtk.enemyIdx]?.def.id}`,
            title: `${specialTarget.def.name} — DEFEND: ${pendingSpecialAtk.name}!`,
            type: pendingSpecialAtk.challengeType,
            description: `${state.enemies[pendingSpecialAtk.enemyIdx]?.def.name} launches a special attack at ${specialTarget.def.name}! Good or better → 60% damage reduction. Fair or Poor → only 20% reduction.`,
            xpBase: 0,
          }}
          character={character}
          pitchToleranceOverride={pitchToleranceCents(specialTarget.def.stats.accuracy)}
          challengeFlags={{
            blind:    hasStatus(specialTarget.statuses, 'blind'),
            manic:    hasStatus(specialTarget.statuses, 'manic'),
            confused: hasStatus(specialTarget.statuses, 'confusion'),
          }}
          onComplete={handleSpecialDefenseComplete}
          onClose={() => handleSpecialDefenseComplete('poor', 0)}
        />
      )}
    </div>
  );
}

// ── Victory / Defeat screens ──────────────────────────────────────────────────

function VictoryScreen({ enemies, rpEarned, spEarned, onContinue }: {
  enemies: EnemyDef[];
  rpEarned: number;
  spEarned: number;
  onContinue: () => void;
}) {
  const anyBoss = enemies.some((e) => e.isBoss);
  const lore = enemies.find((e) => e.lore)?.lore;
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <div className="text-5xl mb-4 animate-float">⚔️</div>
      <div className="text-rating-superior font-fantasy text-3xl mb-2 text-shadow-glow">VICTORY</div>
      <p className="text-academy-cream/70 text-sm mb-4">{anyBoss
        ? 'The Composer\'s light shines a little brighter.'
        : enemies.length > 1 ? 'The Twisted Melodies dissolve.' : 'The Twisted Melody dissolves.'
      }</p>
      {lore && (
        <div className="card-panel mb-6 max-w-sm text-left">
          <div className="text-academy-gold/60 text-xs uppercase tracking-widest mb-2">Lore Unlocked</div>
          <p className="text-academy-cream/70 text-sm italic">{lore}</p>
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

function DefeatScreen({ enemies, onRetreat }: { enemies: EnemyDef[]; onRetreat: () => void }) {
  const name = enemies.length > 1 ? 'The enemy' : enemies[0]?.name ?? 'The enemy';
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <div className="text-5xl mb-4">💨</div>
      <div className="text-rating-poor font-fantasy text-3xl mb-2">RETREAT</div>
      <p className="text-academy-cream/60 text-sm mb-8">{name} overpowers the band. You fall back to regroup.</p>
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
    // Act 1
    flatling: '😞',
    sharp_creature: '🔺',
    natural_creature: '⬜',
    double_flat_wretch: '😔',
    chronoton_scout: '🤖',
    chronoton_shifter: '⏱️',
    enchanted_music_stand: '🎼',
    flat_dragon: '🐉',
    interval_imp: '😈',
    shard_phantom: '👻',
    // Act 2
    stray_melody: '🎶',
    aria_wraith: '🌬️',
    war_horn_berserker: '🎺',
    chalumeau_phantom: '🕳️',
    clarion_phantom: '📢',
    bassetta: '🎭',
    caucophonus: '🥁',
    discordian_sentry: '🛡️',
    sound_shadow: '🎷',
    lieutenant_contra: '🗡️',
    sliding_chaos_knight: '📯',
    stone_colossus: '🗿',
    echoing_wisp: '🌫️',
    forest_flogger: '🍃',
    double_reed_specter: '🥀',
    ancient_revenant: '📜',
    // Act 3
    wave_walker: '💧',
    coastal_dissonance: '🌊',
    rogue_wave: '🌊',
    the_maelstrom: '🌀',
    cacophony_soldier: '⚔️',
    piano_commander: '🤫',
    forte_commander: '💥',
    vexian_knight: '⚜️',
    ostinato_usher: '⚙️',
    lieutenant_kije: '🐦',
    commander_mesto: '🦢',
    general_grave: '🐘',
    vexus: '🪄',
  };
  return map[id] ?? '👾';
}
