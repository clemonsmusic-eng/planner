import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { getBossGearDrop } from '../../lib/gear';
import ChallengeModal from '../../components/ChallengeModal';
import BattleScreen from '../../components/BattleScreen';
import { useClassmateRecruitment } from '../../components/ClassmateRecruitment';
import { useNpcQuestOffers } from '../../components/NpcQuestOffer';
import { ENEMIES } from '../../lib/enemies';
import type { Rating, GearItem } from '../../types/game';

interface Challenge {
  id: string;
  title: string;
  type: string;
  uilStandard: string;
  description: string;
  required: boolean;
  completed: boolean;
  xpBase: number;
}

function buildChallenges(completed: string[]): Challenge[] {
  return [
    {
      id: 'z2_f_scale',
      title: 'Concert F Major Scale',
      type: 'technique_scale',
      uilStandard: 'UIL Zone 2 · Scales',
      description: 'Play the Concert F major scale, one octave, at a steady quarter-note tempo.',
      required: true,
      completed: completed.includes('z2_f_scale'),
      xpBase: 150,
    },
    {
      id: 'z2_eighth_notes',
      title: 'Rhythm: Eighth Notes in 4/4',
      type: 'rhythm_performance',
      uilStandard: 'UIL Zone 2 · Rhythm',
      description: 'Tap the given pattern using eighth notes and quarter notes in 4/4 time.',
      required: true,
      completed: completed.includes('z2_eighth_notes'),
      xpBase: 150,
    },
    {
      id: 'z2_three_four',
      title: 'Rhythm: 3/4 Time Signature',
      type: 'rhythm_performance',
      uilStandard: 'UIL Zone 2 · Rhythm',
      description: 'Tap a 3/4 rhythm. Three beats per measure — feel the waltz.',
      required: true,
      completed: completed.includes('z2_three_four'),
      xpBase: 150,
    },
    {
      id: 'z2_dynamics_pf',
      title: 'Dynamics: p and f',
      type: 'prepared_performance',
      uilStandard: 'UIL Zone 2 · Dynamics',
      description: 'Perform the phrase once at piano (p), then again at forte (f). A clear dynamic difference is required.',
      required: true,
      completed: completed.includes('z2_dynamics_pf'),
      xpBase: 150,
    },
    {
      id: 'z2_aural_stepwise',
      title: 'Melody Mapper: Stepwise Melodies',
      type: 'aural_melody_mapper',
      uilStandard: 'UIL Zone 2 · Aural',
      description: 'Listen to a short stepwise melody and identify the correct notation from four options.',
      required: true,
      completed: completed.includes('z2_aural_stepwise'),
      xpBase: 75,
    },
    {
      id: 'z2_aural_rhythm_eighth',
      title: 'Rhythm Echo: Eighth Note Patterns',
      type: 'aural_rhythm_echo',
      uilStandard: 'UIL Zone 2 · Aural',
      description: 'Listen to a rhythm using eighth notes and tap it back.',
      required: true,
      completed: completed.includes('z2_aural_rhythm_eighth'),
      xpBase: 75,
    },
    {
      id: 'z2_two_octave_intro',
      title: 'Two-Octave Scale Introduction',
      type: 'technique_scale',
      uilStandard: 'UIL Zone 2 · Scales',
      description: 'Extend the Concert Bb scale to two octaves for the first time. Take it slowly.',
      required: false,
      completed: completed.includes('z2_two_octave_intro'),
      xpBase: 150,
    },
    {
      id: 'z2_cresc_decresc',
      title: 'Crescendo and Decrescendo',
      type: 'prepared_performance',
      uilStandard: 'UIL Zone 2 · Dynamics',
      description: 'Perform a 4-bar phrase that gradually gets louder (crescendo) then softer (decrescendo).',
      required: false,
      completed: completed.includes('z2_cresc_decresc'),
      xpBase: 150,
    },
  ];
}

const WINTER_CONCERT_CHALLENGE: Challenge = {
  id: 'z2_winter_concert',
  title: 'The Winter Concert',
  type: 'prepared_performance',
  uilStandard: 'Zone 2 · Quarter End Performance',
  description:
    'Perform your best for the assembled audience. This is the Winter Concert — ' +
    'the first time your class sounds like an ensemble. Good or better required to advance to Quarter 3.',
  required: true,
  completed: false, // checked from character state
  xpBase: 1500,
};

export default function Zone2Page() {
  const { character, awardChallenge, advanceZone, equipGear, addSummonPoints } = useGameStore();
  const navigate = useNavigate();

  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [lastRating, setLastRating] = useState<{ id: string; rating: Rating } | null>(null);
  const [activeBattle, setActiveBattle] = useState<false | 'mini_boss' | 'concert_crash'>(false);
  const [concertOpen, setConcertOpen] = useState(false);
  const [concertFailed, setConcertFailed] = useState(false);
  const [gearDrop, setGearDrop] = useState<GearItem | null>(null);
  const recruitment = useClassmateRecruitment(2);
  const npcOffers = useNpcQuestOffers(2);

  if (!character) return null;
  const char = character;
  if (recruitment) return recruitment;
  if (npcOffers) return npcOffers;

  const challenges = buildChallenges(character.completedChallenges);
  const required = challenges.filter((c) => c.required);
  const optional = challenges.filter((c) => !c.required);
  const completedRequired = required.filter((c) => c.completed).length;
  const allRequiredDone = completedRequired === required.length;
  const miniBossUnlocked = completedRequired >= 3;
  const miniBossDefeated = character.completedChallenges.includes('z2_mini_boss_defeated');
  const concertUnlocked = allRequiredDone && miniBossDefeated;
  const phantomDefeated = character.completedChallenges.includes('z2_shard_phantom_defeated');
  const concertDone = character.completedChallenges.includes('z2_winter_concert');

  async function handleChallengeComplete(rating: Rating, score: number) {
    if (!activeChallenge) return;
    await awardChallenge(activeChallenge.id, activeChallenge.type, score, rating);
    setLastRating({ id: activeChallenge.id, rating });
    setActiveChallenge(null);
  }

  async function handleBattleVictory(battleType: 'mini_boss' | 'concert_crash', _rp: number, spDelta: number) {
    if (battleType === 'mini_boss') {
      await awardChallenge('z2_mini_boss_defeated', 'mini_boss', 100, 'superior');
      const drop = getBossGearDrop('z2_mini_boss_defeated', char);
      if (drop) { await equipGear(drop); setGearDrop(drop); }
    } else {
      await awardChallenge('z2_shard_phantom_defeated', 'mini_boss', 100, 'superior');
    }
    if (spDelta !== 0) await addSummonPoints(spDelta);
    setActiveBattle(false);
  }

  async function handleConcertComplete(rating: Rating, score: number) {
    await awardChallenge('z2_winter_concert', 'zone_boss', score, rating);
    const passed = rating === 'good' || rating === 'excellent' || rating === 'superior';
    if (passed) {
      const drop = getBossGearDrop('z2_winter_concert', char);
      if (drop) { await equipGear(drop); setGearDrop(drop); }
      await advanceZone(3);
    } else {
      setConcertFailed(true);
    }
    setConcertOpen(false);
  }

  if (activeBattle) {
    const battleEnemies = activeBattle === 'mini_boss' ? [ENEMIES.interval_imp] : [ENEMIES.shard_phantom];
    return (
      <BattleScreen
        character={character}
        enemies={battleEnemies}
        simulatorMode
        onVictory={(rp, spDelta) => handleBattleVictory(activeBattle, rp, spDelta)}
        onDefeat={() => setActiveBattle(false)}
      />
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Zone header */}
      <div className="relative bg-gradient-to-b from-slate-900/60 to-transparent px-4 pt-8 pb-6">
        <button
          onClick={() => navigate('/hub')}
          className="text-academy-cream/40 hover:text-academy-cream/80 text-sm mb-4 flex items-center gap-1 transition-colors"
        >
          ← Hub
        </button>
        <div className="text-academy-gold/60 text-xs tracking-[0.4em] uppercase font-fantasy mb-1">
          Zone 2 · Act I · Quarter 2
        </div>
        <h1 className="fantasy-title text-2xl text-academy-cream mb-2">The Theory Wing</h1>
        <p className="text-academy-cream/60 text-sm leading-relaxed">
          The Academy's ancient inner wing. Walls lined with faded pre-Shattering scores. The air
          smells of old parchment and chalk. Somewhere in these shelves, references to a "forbidden
          interval" have been crossed out by a careful hand.
        </p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Progress */}
        <div className="card-panel mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-academy-cream/70 text-sm font-fantasy">Required Challenges</span>
            <span className="text-academy-gold font-fantasy">{completedRequired} / {required.length}</span>
          </div>
          <div className="stat-bar">
            <div className="stat-bar-fill bg-academy-gold" style={{ width: `${(completedRequired / required.length) * 100}%` }} />
          </div>
          {concertUnlocked && !phantomDefeated && !concertDone && (
            <div className="mt-3 text-center text-rating-superior text-sm font-fantasy animate-pulse">
              ✓ Winter Concert Unlocked
            </div>
          )}
          {phantomDefeated && !concertDone && (
            <div className="mt-3 text-center text-rating-excellent text-sm font-fantasy animate-pulse">
              Phantom defeated — perform the concert to advance
            </div>
          )}
        </div>

        {/* Story beat */}
        <div className="card-panel mb-6 border-slate-700/40 bg-slate-900/20">
          <div className="text-xs text-academy-gold/60 uppercase tracking-widest font-fantasy mb-2">Story</div>
          <p className="text-academy-cream/70 text-sm leading-relaxed italic">
            Deep in the library stacks, you find a faded page from an old score that still hums
            faintly when you hold it — a scrap of real music, older than the Academy. Maestro
            Persichetti turns it over with care. "Good ears," he says. "The Theory Wing keeps a
            few secrets worth finding. Mind you put it back."
          </p>
        </div>

        {lastRating && (
          <div className="card-panel mb-4 text-center">
            <RatingBadge rating={lastRating.rating} />
          </div>
        )}

        <h2 className="fantasy-title text-sm text-academy-gold/70 uppercase tracking-widest mb-3">
          Required Challenges
        </h2>
        <div className="space-y-2 mb-8">
          {required.map((challenge) => (
            <ChallengeRow
              key={challenge.id}
              challenge={challenge}
              onStart={() => setActiveChallenge(challenge)}
            />
          ))}
        </div>

        <h2 className="fantasy-title text-sm text-academy-gold/70 uppercase tracking-widest mb-3">
          Optional Challenges
        </h2>
        <div className="space-y-2 mb-8">
          {optional.map((challenge) => (
            <ChallengeRow
              key={challenge.id}
              challenge={challenge}
              onStart={() => setActiveChallenge(challenge)}
            />
          ))}
        </div>

        {/* Mini-boss — simulator mode: no HP loss in Academy zones */}
        <div className={`card-panel mt-4 ${miniBossUnlocked ? 'border-amber-600/50' : 'border-amber-700/20 opacity-60'}`}>
          <div className="text-xs text-academy-gold/60 uppercase tracking-widest font-fantasy mb-2">Mini-Boss</div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-academy-cream/80 text-sm font-semibold mb-1">😈 The Interval Imp</div>
              <div className="text-academy-cream/50 text-xs">
                Born from a mis-played tritone in the theory classroom. Scrambles your timing.
                {!miniBossUnlocked && <span className="text-academy-gold/50"> (Complete 3 required challenges)</span>}
              </div>
            </div>
            {miniBossUnlocked && !miniBossDefeated && (
              <button onClick={() => setActiveBattle('mini_boss')} className="btn-secondary text-xs py-2 px-3 flex-shrink-0">Fight</button>
            )}
            {miniBossDefeated && <span className="text-rating-superior text-lg flex-shrink-0">✓</span>}
          </div>
        </div>

        {/* Winter Concert — two-phase: boss crash → performance gate */}
        {(concertUnlocked || phantomDefeated || concertDone) && (
          <div className={`card-panel mt-4 ${concertDone ? 'border-rating-superior/30' : 'border-academy-gold/40'}`}>
            <div className="text-xs text-academy-gold uppercase tracking-widest font-fantasy mb-2">
              Quarter End · The Winter Concert
            </div>

            {/* Phase 1: Shard Phantom crash */}
            <div className={`mb-3 ${phantomDefeated || concertDone ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-academy-cream/80 text-sm font-semibold mb-1">
                    👻 The Footlight Phantom crashes the concert
                  </div>
                  <div className="text-academy-cream/50 text-xs">
                    A mischievous theater-sprite, drawn out of the old hall by the swell of live
                    music, scatters the sheet music. Shoo it off before the concert can continue.
                  </div>
                </div>
                {!phantomDefeated && !concertDone ? (
                  <button
                    onClick={() => setActiveBattle('concert_crash')}
                    className="btn-danger text-xs py-2 px-3 flex-shrink-0"
                  >
                    Fight
                  </button>
                ) : (
                  <span className="text-rating-superior text-lg flex-shrink-0">✓</span>
                )}
              </div>
            </div>

            {/* Phase 2: Perform the concert */}
            {(phantomDefeated || concertDone) && (
              <div className="border-t border-white/5 pt-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="text-academy-cream/80 text-sm font-semibold mb-1">
                      🎶 The Concert Resumes
                    </div>
                    <div className="text-academy-cream/50 text-xs mb-1">
                      The hall is silent. The Phantom is gone. Play. A Good rating or better
                      is required to advance to Quarter 3.
                    </div>
                    {concertFailed && !concertDone && (
                      <div className="text-rating-poor text-xs mt-1">
                        Not quite ready — practice more and try again.
                      </div>
                    )}
                  </div>
                  {!concertDone ? (
                    <button
                      onClick={() => { setConcertFailed(false); setConcertOpen(true); }}
                      className="btn-primary text-xs py-2 px-3 flex-shrink-0"
                    >
                      Perform
                    </button>
                  ) : (
                    <span className="text-rating-superior text-lg flex-shrink-0">✓</span>
                  )}
                </div>
                {concertDone && (
                  <div className="mt-3 text-academy-cream/60 text-xs italic leading-relaxed border-t border-white/5 pt-3">
                    Clumsy in places, chaotic in others — and beautiful. For a moment, the Theory
                    Wing sounds like what the Grand Symphony must have sounded like before the
                    Shattering. Maestro Persichetti closes his eyes and listens.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {gearDrop && (
        <GearDropBanner item={gearDrop} onDismiss={() => setGearDrop(null)} />
      )}
      {activeChallenge && (
        <ChallengeModal
          challenge={activeChallenge}
          character={character}
          onComplete={handleChallengeComplete}
          onClose={() => setActiveChallenge(null)}
        />
      )}
      {concertOpen && (
        <ChallengeModal
          challenge={WINTER_CONCERT_CHALLENGE}
          character={character}
          onComplete={handleConcertComplete}
          onClose={() => setConcertOpen(false)}
        />
      )}
    </div>
  );
}

function GearDropBanner({ item, onDismiss }: { item: GearItem; onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-6">
      <div className="card-panel w-full max-w-sm border-rating-excellent/60">
        <div className="text-[10px] text-rating-excellent uppercase tracking-widest font-fantasy mb-2">
          ⚔️ Gear Acquired
        </div>
        <div className="text-academy-cream/90 font-fantasy text-base mb-0.5">{item.name}</div>
        <div className="text-academy-cream/50 text-xs italic mb-2">{item.fantasyName}</div>
        <div className="text-rating-good text-xs mb-4">
          {Object.entries(item.statBonus).filter(([, v]) => (v ?? 0) > 0).map(([k, v]) => `+${v} ${k}`).join('  ·  ') || 'Unlocks challenge types'}
        </div>
        <button onClick={onDismiss} className="btn-primary w-full text-sm py-2">Equip →</button>
      </div>
    </div>
  );
}

function ChallengeRow({ challenge, onStart }: { challenge: Challenge; onStart: () => void }) {
  const typeIcon: Record<string, string> = {
    technique_scale: '🎼', prepared_performance: '🎵',
    rhythm_performance: '🥁', aural_pitch_spy: '👂',
    aural_rhythm_echo: '🔊', aural_melody_mapper: '🎶',
  };
  return (
    <button
      onClick={onStart}
      className={`w-full card-panel py-3 px-4 flex items-center gap-4 text-left transition-all hover:border-academy-gold/40
        ${challenge.completed ? 'opacity-60' : 'cursor-pointer'}`}
    >
      <div className="text-xl flex-shrink-0">{typeIcon[challenge.type] ?? '🎵'}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-academy-cream/90 text-sm font-semibold">{challenge.title}</span>
          {!challenge.required && (
            <span className="text-[10px] px-1.5 py-0.5 bg-academy-gold/10 text-academy-gold/60 rounded font-fantasy">Optional</span>
          )}
        </div>
        <div className="text-academy-cream/40 text-xs mt-0.5">{challenge.uilStandard}</div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-academy-cream/40 text-xs">{challenge.xpBase} XP</span>
        {challenge.completed ? <span className="text-rating-superior text-lg">✓</span> : <span className="text-academy-gold/60 text-sm">→</span>}
      </div>
    </button>
  );
}

function RatingBadge({ rating }: { rating: Rating }) {
  const config: Record<Rating, { label: string; color: string }> = {
    superior: { label: 'SUPERIOR', color: '#FFD700' },
    excellent: { label: 'EXCELLENT', color: '#4ADE80' },
    good: { label: 'GOOD', color: '#60A5FA' },
    fair: { label: 'FAIR', color: '#FB923C' },
    poor: { label: 'POOR', color: '#F87171' },
  };
  const { label, color } = config[rating];
  return (
    <div className="inline-block font-fantasy text-3xl font-black tracking-widest py-2 px-6" style={{ color, textShadow: `0 0 20px ${color}60` }}>
      {label}
    </div>
  );
}
