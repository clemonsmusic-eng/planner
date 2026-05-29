import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { INSTRUMENTS } from '../../lib/instruments';
import ChallengeModal from '../../components/ChallengeModal';
import type { Rating } from '../../types/game';

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

function buildChallenges(completedChallenges: string[]): Challenge[] {
  return [
    {
      id: 'z1_bb_scale_1oct',
      title: 'Concert Bb Major Scale',
      type: 'technique_scale',
      uilStandard: 'UIL Zone 1 · Scales',
      description: 'Play the Concert Bb major scale, one octave, using steady quarter notes.',
      required: true,
      completed: completedChallenges.includes('z1_bb_scale_1oct'),
      xpBase: 150,
    },
    {
      id: 'z1_long_tone',
      title: 'Long Tone Exercise',
      type: 'prepared_performance',
      uilStandard: 'UIL Zone 1 · Tone',
      description: 'Sustain a Concert Bb for a full 4 beats at mf. Tone quality and pitch stability are assessed.',
      required: true,
      completed: completedChallenges.includes('z1_long_tone'),
      xpBase: 150,
    },
    {
      id: 'z1_rhythm_44',
      title: 'Rhythm: 4/4 Quarter Notes',
      type: 'rhythm_performance',
      uilStandard: 'UIL Zone 1 · Rhythm',
      description: 'Clap or tap the given rhythm: whole, half, and quarter notes in 4/4 time.',
      required: true,
      completed: completedChallenges.includes('z1_rhythm_44'),
      xpBase: 150,
    },
    {
      id: 'z1_articulation_tongue',
      title: 'All-Tongue Articulation',
      type: 'prepared_performance',
      uilStandard: 'UIL Zone 1 · Articulation',
      description: 'Play the given 4-bar melody with all separate tongue articulation.',
      required: true,
      completed: completedChallenges.includes('z1_articulation_tongue'),
      xpBase: 150,
    },
    {
      id: 'z1_articulation_slur',
      title: 'Slurred Articulation',
      type: 'prepared_performance',
      uilStandard: 'UIL Zone 1 · Articulation',
      description: 'Play the same 4-bar melody with all notes slurred.',
      required: true,
      completed: completedChallenges.includes('z1_articulation_slur'),
      xpBase: 150,
    },
    {
      id: 'z1_aural_pitch',
      title: 'Pitch Spy: Recognize Pitches',
      type: 'aural_pitch_spy',
      uilStandard: 'UIL Zone 1 · Aural',
      description: 'Listen to a single note and identify it by name.',
      required: true,
      completed: completedChallenges.includes('z1_aural_pitch'),
      xpBase: 75,
    },
    {
      id: 'z1_aural_rhythm',
      title: 'Rhythm Echo: 4-Beat Patterns',
      type: 'aural_rhythm_echo',
      uilStandard: 'UIL Zone 1 · Aural',
      description: 'Listen to a 4-beat rhythm pattern and tap it back.',
      required: true,
      completed: completedChallenges.includes('z1_aural_rhythm'),
      xpBase: 75,
    },
    {
      id: 'z1_dynamics_mp_mf',
      title: 'Dynamics: mp and mf',
      type: 'prepared_performance',
      uilStandard: 'UIL Zone 1 · Dynamics',
      description: 'Play the given phrase first at mp, then at mf. Volume difference must be audible.',
      required: false,
      completed: completedChallenges.includes('z1_dynamics_mp_mf'),
      xpBase: 150,
    },
  ];
}

export default function Zone1Page() {
  const { character, awardChallenge } = useGameStore();
  const navigate = useNavigate();

  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [lastRating, setLastRating] = useState<{ id: string; rating: Rating } | null>(null);

  if (!character) return null;

  const challenges = buildChallenges(character.completedChallenges);
  const required = challenges.filter((c) => c.required);
  const optional = challenges.filter((c) => !c.required);
  const completedRequired = required.filter((c) => c.completed).length;
  const allRequiredDone = completedRequired === required.length;
  const instrument = INSTRUMENTS[character.instrument];

  async function handleChallengeComplete(rating: Rating, score: number) {
    if (!activeChallenge) return;
    await awardChallenge(activeChallenge.id, activeChallenge.type, score, rating);
    setLastRating({ id: activeChallenge.id, rating });
    setActiveChallenge(null);
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Zone header */}
      <div className="relative bg-gradient-to-b from-amber-900/40 to-transparent px-4 pt-8 pb-6">
        <button
          onClick={() => navigate('/hub')}
          className="text-academy-cream/40 hover:text-academy-cream/80 text-sm mb-4 flex items-center gap-1 transition-colors"
        >
          ← Hub
        </button>
        <div className="text-academy-gold/60 text-xs tracking-[0.4em] uppercase font-fantasy mb-1">
          Zone 1 · Act I · Quarter 1
        </div>
        <h1 className="fantasy-title text-2xl text-academy-cream mb-2">The Rehearsal Halls</h1>
        <p className="text-academy-cream/60 text-sm leading-relaxed">
          The heart of Harmonia Academy. Stone arches and worn practice rooms echo with the sound of
          a hundred instruments. Maestro Barenboimi's baton hand is never still.
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
            <div
              className="stat-bar-fill bg-academy-gold"
              style={{ width: `${(completedRequired / required.length) * 100}%` }}
            />
          </div>
          {allRequiredDone && (
            <div className="mt-3 text-center text-rating-superior text-sm font-fantasy animate-pulse">
              ✓ Zone Boss Unlocked — The Enchanted Music Stand
            </div>
          )}
        </div>

        {/* Story beat */}
        <div className="card-panel mb-6 border-amber-700/30 bg-amber-900/10">
          <div className="text-xs text-academy-gold/60 uppercase tracking-widest font-fantasy mb-2">Story</div>
          <p className="text-academy-cream/70 text-sm leading-relaxed italic">
            From the Academy's high windows, students glimpse a dark shimmer over the town of
            Crotchet in the valley below. Colors seem to drain from the rooftops. Maestro Barenboimi
            enters the practice room, his expression grim. "Focus," he says. "The Twisted Melodies
            grow closer. Your scales matter more than you know."
          </p>
        </div>

        {/* Last rating feedback */}
        {lastRating && (
          <div className={`card-panel mb-4 text-center border-opacity-40
            ${lastRating.rating === 'superior' ? 'border-rating-superior' :
              lastRating.rating === 'excellent' ? 'border-rating-excellent' :
              lastRating.rating === 'good' ? 'border-rating-good' : 'border-rating-fair'}`}
          >
            <RatingBadge rating={lastRating.rating} />
          </div>
        )}

        {/* Required challenges */}
        <h2 className="fantasy-title text-sm text-academy-gold/70 uppercase tracking-widest mb-3">
          Required Challenges
        </h2>
        <div className="space-y-2 mb-8">
          {required.map((challenge) => (
            <ChallengeRow
              key={challenge.id}
              challenge={challenge}
              instrument={instrument}
              onStart={() => setActiveChallenge(challenge)}
            />
          ))}
        </div>

        {/* Optional challenges */}
        <h2 className="fantasy-title text-sm text-academy-gold/70 uppercase tracking-widest mb-3">
          Optional Challenges
        </h2>
        <div className="space-y-2">
          {optional.map((challenge) => (
            <ChallengeRow
              key={challenge.id}
              challenge={challenge}
              instrument={instrument}
              onStart={() => setActiveChallenge(challenge)}
            />
          ))}
        </div>

        {/* Mini-boss hint */}
        <div className="card-panel mt-8 border-amber-700/30">
          <div className="text-xs text-academy-gold/60 uppercase tracking-widest font-fantasy mb-2">
            Mini-Boss (unlocks at 4/7 required)
          </div>
          <div className="text-academy-cream/70 text-sm">
            🎼 <strong>The Enchanted Music Stand</strong> — A practice room stand possessed by a
            wandering Flatling. It rattles the music and drains your Accuracy. Defeat it to earn
            the <em>Iron Stand</em>.
          </div>
        </div>
      </div>

      {/* Challenge Modal */}
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

function ChallengeRow({ challenge, instrument: _instrument, onStart }: {
  challenge: Challenge;
  instrument: { name: string };
  onStart: () => void;
}) {
  const typeIcon: Record<string, string> = {
    technique_scale: '🎼',
    prepared_performance: '🎵',
    rhythm_performance: '🥁',
    aural_pitch_spy: '👂',
    aural_rhythm_echo: '🔊',
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
            <span className="text-[10px] px-1.5 py-0.5 bg-academy-gold/10 text-academy-gold/60 rounded font-fantasy">
              Optional
            </span>
          )}
        </div>
        <div className="text-academy-cream/40 text-xs mt-0.5">{challenge.uilStandard}</div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-academy-cream/40 text-xs">{challenge.xpBase} XP</span>
        {challenge.completed ? (
          <span className="text-rating-superior text-lg">✓</span>
        ) : (
          <span className="text-academy-gold/60 text-sm">→</span>
        )}
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
    <div
      className="inline-block font-fantasy text-3xl font-black tracking-widest py-2 px-6"
      style={{ color, textShadow: `0 0 20px ${color}60` }}
    >
      {label}
    </div>
  );
}
