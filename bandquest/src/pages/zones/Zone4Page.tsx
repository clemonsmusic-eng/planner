import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { getBossGearDrop } from '../../lib/gear';
import ChallengeModal from '../../components/ChallengeModal';
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
      id: 'z4_ab_scale',
      title: 'Concert Ab Major Scale',
      type: 'technique_scale',
      uilStandard: 'UIL Zone 4 · Scales',
      description: 'Play the Concert Ab major scale. Four flats — check your key signature.',
      required: true,
      completed: completed.includes('z4_ab_scale'),
      xpBase: 150,
    },
    {
      id: 'z4_syncopation',
      title: 'Rhythm: Basic Syncopation',
      type: 'rhythm_performance',
      uilStandard: 'UIL Zone 4 · Rhythm',
      description: 'Tap a pattern with a tie across the barline — the off-beat held into the next measure.',
      required: true,
      completed: completed.includes('z4_syncopation'),
      xpBase: 150,
    },
    {
      id: 'z4_sight_reading_1',
      title: 'Sight-Reading: Grade 1–2 Excerpt',
      type: 'prepared_performance',
      uilStandard: 'UIL Zone 4 · Sight-Reading',
      description: 'A Grade 1–2 sight-reading excerpt. Study time: 60 seconds. Then perform.',
      required: true,
      completed: completed.includes('z4_sight_reading_1'),
      xpBase: 225,
    },
    {
      id: 'z4_aural_major_minor',
      title: 'Aural: Major vs. Minor',
      type: 'aural_chord_oracle',
      uilStandard: 'UIL Zone 4 · Aural',
      description: 'Listen to short passages and identify whether each is major or minor.',
      required: true,
      completed: completed.includes('z4_aural_major_minor'),
      xpBase: 75,
    },
    {
      id: 'z4_ensemble_fragment',
      title: 'Sacred Score Fragment (Ensemble)',
      type: 'prepared_performance',
      uilStandard: 'UIL Zone 4 · Ensemble',
      description: 'Perform your part of the first Sacred Score fragment. This is the capstone of Year 1.',
      required: true,
      completed: completed.includes('z4_ensemble_fragment'),
      xpBase: 500,
    },
    {
      id: 'z4_all_bb_eb_f',
      title: 'Scale Review: Bb, Eb, F',
      type: 'technique_scale',
      uilStandard: 'UIL Zone 4 · Scales',
      description: 'Play Concert Bb, Eb, and F major scales back-to-back without stopping.',
      required: false,
      completed: completed.includes('z4_all_bb_eb_f'),
      xpBase: 150,
    },
    {
      id: 'z4_staccato_tenuto',
      title: 'Articulation: Staccato and Tenuto',
      type: 'prepared_performance',
      uilStandard: 'UIL Zone 4 · Articulation',
      description: 'Perform a 4-bar phrase alternating between staccato (detached) and tenuto (full value) markings.',
      required: false,
      completed: completed.includes('z4_staccato_tenuto'),
      xpBase: 150,
    },
  ];
}

export default function Zone4Page() {
  const { character, awardChallenge, advanceZone, equipGear } = useGameStore();
  const navigate = useNavigate();

  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [lastRating, setLastRating] = useState<{ id: string; rating: Rating } | null>(null);
  const [showGraduation, setShowGraduation] = useState(false);
  const [gearDrop, setGearDrop] = useState<GearItem | null>(null);

  if (!character) return null;
  const char = character;

  const challenges = buildChallenges(character.completedChallenges);
  const required = challenges.filter((c) => c.required);
  const optional = challenges.filter((c) => !c.required);
  const completedRequired = required.filter((c) => c.completed).length;
  const allRequiredDone = completedRequired === required.length;
  const graduationComplete = character.completedChallenges.includes('z4_graduation');

  async function handleChallengeComplete(rating: Rating, score: number) {
    if (!activeChallenge) return;
    await awardChallenge(activeChallenge.id, activeChallenge.type, score, rating);
    setLastRating({ id: activeChallenge.id, rating });
    setActiveChallenge(null);
  }

  async function handleGraduation(rating: Rating) {
    await awardChallenge('z4_graduation', 'zone_boss', 100, rating);
    await advanceZone(5);
    const drop = getBossGearDrop('z4_graduation', char);
    if (drop) { await equipGear(drop); setGearDrop(drop); }
    setShowGraduation(false);
  }

  if (showGraduation) {
    return <GraduationTrial character={character} onComplete={handleGraduation} />;
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="relative bg-gradient-to-b from-amber-900/30 to-transparent px-4 pt-8 pb-6">
        <button
          onClick={() => navigate('/hub')}
          className="text-academy-cream/40 hover:text-academy-cream/80 text-sm mb-4 flex items-center gap-1 transition-colors"
        >
          ← Hub
        </button>
        <div className="text-academy-gold/60 text-xs tracking-[0.4em] uppercase font-fantasy mb-1">
          Zone 4 · Act I · Quarter 4 · End of Year
        </div>
        <h1 className="fantasy-title text-2xl text-academy-cream mb-2">The Grand Auditorium</h1>
        <p className="text-academy-cream/60 text-sm leading-relaxed">
          The Academy's crown jewel. Every inch of stonework carved by the Ancient Maestros. The
          air itself seems to vibrate with the memory of performances past. Maestro Barenboimi's
          baton is poised. This is what everything has been building toward.
        </p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="card-panel mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-academy-cream/70 text-sm font-fantasy">Required Challenges</span>
            <span className="text-academy-gold font-fantasy">{completedRequired} / {required.length}</span>
          </div>
          <div className="stat-bar">
            <div className="stat-bar-fill bg-academy-gold" style={{ width: `${(completedRequired / required.length) * 100}%` }} />
          </div>
        </div>

        <div className="card-panel mb-6 border-amber-700/30 bg-amber-900/10">
          <div className="text-xs text-academy-gold/60 uppercase tracking-widest font-fantasy mb-2">Story</div>
          <p className="text-academy-cream/70 text-sm leading-relaxed italic">
            Headmaster Fennelio calls the ensemble to attention. "You came here thinking you were
            learning to play an instrument," he says. "The Academy was not built for education.
            It was built as a counter-force. Every student here — every one of you — is the plan."
          </p>
        </div>

        {lastRating && (
          <div className="card-panel mb-4 text-center"><RatingBadge rating={lastRating.rating} /></div>
        )}

        <h2 className="fantasy-title text-sm text-academy-gold/70 uppercase tracking-widest mb-3">Required Challenges</h2>
        <div className="space-y-2 mb-8">
          {required.map((c) => (
            <ChallengeRow key={c.id} challenge={c} onStart={() => setActiveChallenge(c)} />
          ))}
        </div>

        <h2 className="fantasy-title text-sm text-academy-gold/70 uppercase tracking-widest mb-3">Optional Challenges</h2>
        <div className="space-y-2 mb-8">
          {optional.map((c) => (
            <ChallengeRow key={c.id} challenge={c} onStart={() => setActiveChallenge(c)} />
          ))}
        </div>

        {/* Graduation Trial */}
        <div className={`card-panel mt-4 ${allRequiredDone ? 'border-academy-gold/60' : 'border-amber-700/20 opacity-60'}`}>
          <div className="text-xs text-academy-gold/80 uppercase tracking-widest font-fantasy mb-2">Zone Boss · The Graduation Trial</div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-academy-cream/80 text-sm font-semibold mb-1">🎓 Graduation Concert</div>
              <div className="text-academy-cream/50 text-xs leading-relaxed">
                Perform a restored Sacred Score fragment before the full Academy. This is not a
                battle — it is a performance. Your rating determines the story outcome and your
                Journey Instrument reward.
                {!allRequiredDone && <span className="text-academy-gold/50"> (Complete all required challenges first)</span>}
              </div>
            </div>
            {allRequiredDone && !graduationComplete && (
              <button onClick={() => setShowGraduation(true)} className="btn-primary text-xs py-2 px-3 flex-shrink-0">Perform</button>
            )}
            {graduationComplete && <span className="text-rating-superior text-lg flex-shrink-0">✓</span>}
          </div>
        </div>
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
    </div>
  );
}

function GearDropBanner({ item, onDismiss }: { item: GearItem; onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-6">
      <div className="card-panel w-full max-w-sm border-rating-excellent/60">
        <div className="text-[10px] text-rating-excellent uppercase tracking-widest font-fantasy mb-2">⚔️ Gear Acquired</div>
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

function GraduationTrial({ character, onComplete }: {
  character: { displayName: string };
  onComplete: (rating: Rating) => void;
}) {
  const [phase, setPhase] = useState<'pre' | 'challenge' | 'result'>('pre');
  const [rating, setRating] = useState<Rating | null>(null);

  const ratingDialogue: Record<Rating, string> = {
    superior: '"That was the sound the Composer intended. You are ready." — Headmaster Fennelio',
    excellent: '"Outstanding. The Symphony will be restored with performers like you." — Headmaster Fennelio',
    good: '"Solid. There is work ahead — but you are ready for it." — Headmaster Fennelio',
    fair: '"The journey has just begun. Keep working." — Headmaster Fennelio',
    poor: '"Every performer has this moment. The only failure is not returning to practice." — Maestro Barenboimi',
  };

  function handlePerformanceComplete(r: Rating) {
    setRating(r);
    setPhase('result');
  }

  if (phase === 'pre') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <div className="text-6xl mb-6 animate-float">🎓</div>
        <h1 className="fantasy-title text-3xl mb-3">The Graduation Trial</h1>
        <p className="text-academy-cream/70 text-sm mb-2 max-w-sm">
          The Grand Auditorium is full. Every Maestro, every student, every spirit of the Academy
          watches.
        </p>
        <p className="text-academy-cream/60 text-sm mb-8 max-w-sm">
          Perform the Sacred Score fragment assigned to you. Your rating will determine the
          ceremony's outcome.
        </p>
        <button onClick={() => setPhase('challenge')} className="btn-primary">
          Take the Stage
        </button>
      </div>
    );
  }

  if (phase === 'challenge') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <h2 className="fantasy-title text-2xl mb-6">Your Performance</h2>
        <div className="card-panel max-w-sm w-full mb-6 text-left">
          <p className="text-academy-cream/70 text-sm leading-relaxed">
            Play the performance excerpt to the best of your ability. The microphone is
            listening. Pitch accuracy determines your rating and the ceremony's fanfare.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          {(['superior', 'excellent', 'good', 'fair', 'poor'] as Rating[]).map((r) => (
            <button
              key={r}
              onClick={() => handlePerformanceComplete(r)}
              className="card-panel py-3 text-center font-fantasy capitalize transition-all hover:border-academy-gold/60"
            >
              {r}
            </button>
          ))}
        </div>
        <p className="text-academy-cream/30 text-xs mt-4">
          (Live mic scoring will be connected in the next update)
        </p>
      </div>
    );
  }

  if (phase === 'result' && rating) {
    const ratingColors: Record<Rating, string> = {
      superior: '#FFD700', excellent: '#4ADE80',
      good: '#60A5FA', fair: '#FB923C', poor: '#F87171',
    };
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <div
          className="font-fantasy text-5xl font-black tracking-widest mb-4 py-4"
          style={{ color: ratingColors[rating], textShadow: `0 0 30px ${ratingColors[rating]}60` }}
        >
          {rating.toUpperCase()}
        </div>
        <div className="card-panel max-w-sm mb-8 text-left">
          <p className="text-academy-cream/80 text-sm italic leading-relaxed">
            {ratingDialogue[rating]}
          </p>
        </div>
        <p className="text-academy-cream/60 text-sm mb-6">
          {character.displayName}, you have graduated from Harmonia Academy.
          <br />
          Your Journey Instrument awaits.
        </p>
        <button onClick={() => onComplete(rating)} className="btn-primary">
          Receive Journey Instrument →
        </button>
      </div>
    );
  }

  return null;
}

function ChallengeRow({ challenge, onStart }: { challenge: Challenge; onStart: () => void }) {
  const typeIcon: Record<string, string> = {
    technique_scale: '🎼', prepared_performance: '🎵',
    rhythm_performance: '🥁', aural_chord_oracle: '🎵',
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
