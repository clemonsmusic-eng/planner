import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import ChallengeModal from '../../components/ChallengeModal';
import BattleScreen from '../../components/BattleScreen';
import { ENEMIES } from '../../lib/enemies';
import type { Rating, ZoneId } from '../../types/game';

// ── Config types ────────────────────────────────────────────────────────────────
export interface ZoneChallenge {
  id: string; title: string; type: string; uilStandard: string;
  description: string; required: boolean; xpBase: number;
}
export interface EncounterDef {
  enemyKeys: string[]; doneKey: string; icon: string; name: string; desc: string;
}
export interface AssaultConfig {
  zoneId: number; advanceTo: ZoneId; act: number; quarter: number;
  title: string; intro: string; story: string; headerClass: string;
  challenges: ZoneChallenge[];
  skirmish?: EncounterDef;
  bossHeading: string; bossSub: string;
  bosses: EncounterDef[];
  advanceTitle: string; advanceFlavor: string; advanceLabel: string;
}

type ActiveBattle = { kind: 'skirmish' } | { kind: 'boss'; idx: number } | null;

// Generic page for the Act 3 "assault" zones: challenges + an optional skirmish +
// a sequence of bosses (each gated on the previous), then an advance gate.
export default function AssaultZonePage({ cfg }: { cfg: AssaultConfig }) {
  const { character, awardChallenge, advanceZone, addSummonPoints } = useGameStore();
  const navigate = useNavigate();

  const [activeChallenge, setActiveChallenge] = useState<ZoneChallenge | null>(null);
  const [lastRating, setLastRating] = useState<{ id: string; rating: Rating } | null>(null);
  const [activeBattle, setActiveBattle] = useState<ActiveBattle>(null);

  if (!character) return null;
  const done = character.completedChallenges;

  const required = cfg.challenges.filter((c) => c.required);
  const optional = cfg.challenges.filter((c) => !c.required);
  const completedRequired = required.filter((c) => done.includes(c.id)).length;
  const allRequiredDone = completedRequired === required.length;

  const skirmishDone = cfg.skirmish ? done.includes(cfg.skirmish.doneKey) : true;
  const bossDone = (i: number) => done.includes(cfg.bosses[i].doneKey);
  const bossUnlocked = (i: number) => (i === 0 ? completedRequired >= 3 : bossDone(i - 1));
  const allBossesDone = cfg.bosses.every((_, i) => bossDone(i));
  const canAdvance = allBossesDone && allRequiredDone;

  async function handleChallengeComplete(rating: Rating, score: number) {
    if (!activeChallenge) return;
    await awardChallenge(activeChallenge.id, activeChallenge.type, score, rating);
    setLastRating({ id: activeChallenge.id, rating });
    setActiveChallenge(null);
  }

  async function handleVictory(_rp: number, spDelta: number) {
    if (spDelta !== 0) await addSummonPoints(spDelta);
    const b = activeBattle;
    setActiveBattle(null);
    if (!b) return;
    if (b.kind === 'skirmish' && cfg.skirmish) {
      await awardChallenge(cfg.skirmish.doneKey, 'mini_boss', 100, 'superior');
    } else if (b.kind === 'boss') {
      await awardChallenge(cfg.bosses[b.idx].doneKey, 'zone_boss', 100, 'superior');
    }
  }

  if (activeBattle) {
    const keys = activeBattle.kind === 'skirmish' ? cfg.skirmish!.enemyKeys : cfg.bosses[activeBattle.idx].enemyKeys;
    return (
      <BattleScreen
        character={character}
        enemies={keys.map((k) => ENEMIES[k])}
        onVictory={handleVictory}
        onDefeat={() => setActiveBattle(null)}
      />
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <div className={`relative bg-gradient-to-b ${cfg.headerClass} to-transparent px-4 pt-8 pb-6`}>
        <button onClick={() => navigate('/hub')} className="text-academy-cream/40 hover:text-academy-cream/80 text-sm mb-4 flex items-center gap-1 transition-colors">← Hub</button>
        <div className="text-academy-gold/60 text-xs tracking-[0.4em] uppercase font-fantasy mb-1">Zone {cfg.zoneId} · Act III · Quarter {cfg.quarter}</div>
        <h1 className="fantasy-title text-2xl text-academy-cream mb-2">{cfg.title}</h1>
        <p className="text-academy-cream/60 text-sm leading-relaxed">{cfg.intro}</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="card-panel mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-academy-cream/70 text-sm font-fantasy">Required Challenges</span>
            <span className="text-academy-gold font-fantasy">{completedRequired} / {required.length}</span>
          </div>
          <div className="stat-bar"><div className="stat-bar-fill bg-academy-gold" style={{ width: `${(completedRequired / required.length) * 100}%` }} /></div>
        </div>

        <div className="card-panel mb-6 border-slate-700/40 bg-slate-900/20">
          <div className="text-xs text-academy-gold/60 uppercase tracking-widest font-fantasy mb-2">Story</div>
          <p className="text-academy-cream/70 text-sm leading-relaxed italic">{cfg.story}</p>
        </div>

        {lastRating && (<div className="card-panel mb-4 text-center"><RatingBadge rating={lastRating.rating} /></div>)}

        <h2 className="fantasy-title text-sm text-academy-gold/70 uppercase tracking-widest mb-3">Required Challenges</h2>
        <div className="space-y-2 mb-8">
          {required.map((c) => (<ChallengeRow key={c.id} challenge={c} completed={done.includes(c.id)} onStart={() => setActiveChallenge(c)} />))}
        </div>

        {optional.length > 0 && (<>
          <h2 className="fantasy-title text-sm text-academy-gold/70 uppercase tracking-widest mb-3">Optional Challenges</h2>
          <div className="space-y-2 mb-8">
            {optional.map((c) => (<ChallengeRow key={c.id} challenge={c} completed={done.includes(c.id)} onStart={() => setActiveChallenge(c)} />))}
          </div>
        </>)}

        <h2 className="fantasy-title text-sm text-discord-crimson/70 uppercase tracking-widest mb-1">{cfg.bossHeading}</h2>
        <p className="text-academy-cream/40 text-xs mb-3">{cfg.bossSub}</p>

        {cfg.skirmish && (
          <div className="card-panel mb-2 border-discord-crimson/20">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-academy-cream/80 text-sm font-semibold mb-1">{cfg.skirmish.icon} {cfg.skirmish.name}</div>
                <div className="text-academy-cream/50 text-xs">{cfg.skirmish.desc}</div>
              </div>
              {!skirmishDone ? (<button onClick={() => setActiveBattle({ kind: 'skirmish' })} className="btn-secondary text-xs py-2 px-3 flex-shrink-0">Fight</button>) : (<span className="text-rating-superior text-lg flex-shrink-0">✓</span>)}
            </div>
          </div>
        )}

        {cfg.bosses.map((b, i) => {
          const unlocked = bossUnlocked(i);
          const cleared = bossDone(i);
          return (
            <div key={b.doneKey} className={`card-panel mb-2 ${unlocked ? 'border-discord-crimson/40' : 'border-discord-crimson/15 opacity-60'}`}>
              <div className="text-xs text-discord-crimson uppercase tracking-widest font-fantasy mb-2">{i === cfg.bosses.length - 1 ? 'Zone Boss' : 'Boss'}</div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="text-academy-cream/80 text-sm font-semibold mb-1">{b.icon} {b.name}</div>
                  <div className="text-academy-cream/50 text-xs">
                    {b.desc}
                    {!unlocked && <span className="text-academy-gold/50"> {i === 0 ? '(Complete 3 required challenges first)' : '(Clear the previous foe first)'}</span>}
                  </div>
                </div>
                {unlocked && !cleared && (<button onClick={() => setActiveBattle({ kind: 'boss', idx: i })} className="btn-danger text-xs py-2 px-3 flex-shrink-0">Battle</button>)}
                {cleared && <span className="text-rating-superior text-lg flex-shrink-0">✓</span>}
              </div>
            </div>
          );
        })}

        {allBossesDone && (
          <div className={`card-panel mt-4 ${canAdvance ? 'border-academy-gold/50' : 'border-academy-gold/20'}`}>
            <div className="text-xs text-academy-gold uppercase tracking-widest font-fantasy mb-2">Quarter's End</div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="text-academy-cream/80 text-sm font-semibold mb-1">{cfg.advanceTitle}</div>
                <div className="text-academy-cream/50 text-xs">
                  {cfg.advanceFlavor}
                  {!allRequiredDone && <span className="text-academy-gold/50"> (Finish your required challenges first)</span>}
                </div>
              </div>
              {canAdvance && (<button onClick={async () => { await advanceZone(cfg.advanceTo); navigate('/hub'); }} className="btn-primary text-xs py-2 px-3 flex-shrink-0">{cfg.advanceLabel}</button>)}
            </div>
          </div>
        )}
      </div>

      {activeChallenge && (
        <ChallengeModal
          challenge={activeChallenge}
          character={character}
          onComplete={handleChallengeComplete}
          onClose={() => setActiveChallenge(null)}
        />
      )}
    </div>
  );
}

function ChallengeRow({ challenge, completed, onStart }: { challenge: ZoneChallenge; completed: boolean; onStart: () => void }) {
  const typeIcon: Record<string, string> = {
    technique_scale: '🎼', prepared_performance: '🎵', rhythm_performance: '🥁',
    aural_pitch_spy: '👂', aural_rhythm_echo: '🔊', aural_interval_quest: '🎶',
    aural_melody_mapper: '🎶', aural_chord_oracle: '🎵',
  };
  return (
    <button onClick={onStart} className={`w-full card-panel py-3 px-4 flex items-center gap-4 text-left transition-all hover:border-academy-gold/40 ${completed ? 'opacity-60' : 'cursor-pointer'}`}>
      <div className="text-xl flex-shrink-0">{typeIcon[challenge.type] ?? '🎵'}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-academy-cream/90 text-sm font-semibold">{challenge.title}</span>
          {!challenge.required && (<span className="text-[10px] px-1.5 py-0.5 bg-academy-gold/10 text-academy-gold/60 rounded font-fantasy">Optional</span>)}
        </div>
        <div className="text-academy-cream/40 text-xs mt-0.5">{challenge.uilStandard}</div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-academy-cream/40 text-xs">{challenge.xpBase} XP</span>
        {completed ? <span className="text-rating-superior text-lg">✓</span> : <span className="text-academy-gold/60 text-sm">→</span>}
      </div>
    </button>
  );
}

function RatingBadge({ rating }: { rating: Rating }) {
  const config: Record<Rating, { label: string; color: string }> = {
    superior: { label: 'SUPERIOR', color: '#FFD700' }, excellent: { label: 'EXCELLENT', color: '#4ADE80' },
    good: { label: 'GOOD', color: '#60A5FA' }, fair: { label: 'FAIR', color: '#FB923C' }, poor: { label: 'POOR', color: '#F87171' },
  };
  const { label, color } = config[rating];
  return (<div className="inline-block font-fantasy text-3xl font-black tracking-widest py-2 px-6" style={{ color, textShadow: `0 0 20px ${color}60` }}>{label}</div>);
}
