import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { getBossGearDrop } from '../../lib/gear';
import ChallengeModal from '../../components/ChallengeModal';
import { useClassmateRecruitment } from '../../components/ClassmateRecruitment';
import { useNpcQuestOffers } from '../../components/NpcQuestOffer';
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
      title: 'Dress Rehearsal: Sacred Score Fragment',
      type: 'prepared_performance',
      uilStandard: 'UIL Zone 4 · Ensemble',
      description: 'Rehearse your part in the Sacred Score fragment with your section — the piece you\'ll perform at graduation.',
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

const GRADUATION_CHALLENGE: Challenge = {
  id: 'z4_graduation',
  title: 'The Graduation Performance',
  type: 'prepared_performance',
  uilStandard: 'Zone 4 · Graduation',
  description:
    'Your final performance as a student: your part in a restored Sacred Score fragment, with the ' +
    'whole Academy listening. Good or better to graduate — and then, the Renewal.',
  required: true,
  completed: false,
  xpBase: 1500,
};

export default function Zone4Page() {
  const { character, awardChallenge, advanceZone, equipGear } = useGameStore();
  const navigate = useNavigate();

  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [lastRating, setLastRating] = useState<{ id: string; rating: Rating } | null>(null);
  const [graduationOpen, setGraduationOpen] = useState(false);
  const [graduationFailed, setGraduationFailed] = useState(false);
  const [showShattering, setShowShattering] = useState(false);
  const [shatterRating, setShatterRating] = useState<Rating>('good');
  const [pendingGear, setPendingGear] = useState<GearItem | null>(null);
  const [gearDrop, setGearDrop] = useState<GearItem | null>(null);
  const recruitment = useClassmateRecruitment(4);
  const npcOffers = useNpcQuestOffers(4);

  if (!character) return null;
  const char = character;
  if (recruitment) return recruitment;
  if (npcOffers) return npcOffers;

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

  async function handleGraduationComplete(rating: Rating, score: number) {
    const passed = rating === 'good' || rating === 'excellent' || rating === 'superior';
    if (passed) {
      await awardChallenge('z4_graduation', 'zone_boss', score, rating);
      const drop = getBossGearDrop('z4_graduation', char);
      if (drop) { await equipGear(drop); setPendingGear(drop); }
      await advanceZone(5);
      setShatterRating(rating);
      setShowShattering(true);
    } else {
      await awardChallenge('z4_graduation', 'zone_boss', score, rating, { trackCompletion: false });
      setGraduationFailed(true);
    }
    setGraduationOpen(false);
  }

  function finishShattering() {
    setShowShattering(false);
    if (pendingGear) setGearDrop(pendingGear);
    else navigate('/hub');
  }

  if (showShattering) {
    return <ShatteringCutscene rating={shatterRating} onFinish={finishShattering} />;
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
          The Academy's crown jewel, lit gold for graduation night. Tonight you give your final
          performance as a student — and then, as every year, the Maestros will play the Renewal:
          the great performance that keeps the world turning. The whole of Symphonica is listening.
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
          {allRequiredDone && !graduationComplete && (
            <div className="mt-3 text-center text-rating-superior text-sm font-fantasy animate-pulse">
              🎓 Graduation is ready
            </div>
          )}
        </div>

        <div className="card-panel mb-6 border-amber-700/30 bg-amber-900/10">
          <div className="text-xs text-academy-gold/60 uppercase tracking-widest font-fantasy mb-2">Story</div>
          <p className="text-academy-cream/70 text-sm leading-relaxed italic">
            Headmaster Fennelio finds you backstage, straightening his collar and grinning despite
            himself. "One performance stands between you and the rest of your life," he says. "Play
            it for yourselves. And then stay — watch the Maestros give the Renewal. You've earned
            your seat for it. It's the most beautiful thing you'll ever hear."
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

        {/* Graduation */}
        <div className={`card-panel mt-4 ${allRequiredDone ? 'border-academy-gold/60' : 'border-amber-700/20 opacity-60'}`}>
          <div className="text-xs text-academy-gold/80 uppercase tracking-widest font-fantasy mb-2">Zone Capstone · Graduation</div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="text-academy-cream/80 text-sm font-semibold mb-1">🎓 Your Final Performance</div>
              <div className="text-academy-cream/50 text-xs leading-relaxed">
                Perform your part in a Sacred Score fragment before the full Academy. Good or better
                to graduate. Then — the Renewal.
                {!allRequiredDone && <span className="text-academy-gold/50"> (Complete all required challenges first)</span>}
              </div>
              {graduationFailed && !graduationComplete && (
                <div className="text-rating-poor text-xs mt-1">
                  Not your night yet — take a breath and step back on stage when you're ready.
                </div>
              )}
            </div>
            {allRequiredDone && !graduationComplete && (
              <button
                onClick={() => { setGraduationFailed(false); setGraduationOpen(true); }}
                className="btn-primary text-xs py-2 px-3 flex-shrink-0"
              >
                Perform
              </button>
            )}
            {graduationComplete && <span className="text-rating-superior text-lg flex-shrink-0">✓</span>}
          </div>
        </div>
      </div>

      {gearDrop && (
        <GearDropBanner item={gearDrop} onDismiss={() => { setGearDrop(null); navigate('/hub'); }} />
      )}
      {activeChallenge && (
        <ChallengeModal
          challenge={activeChallenge}
          character={character}
          onComplete={handleChallengeComplete}
          onClose={() => setActiveChallenge(null)}
        />
      )}
      {graduationOpen && (
        <ChallengeModal
          challenge={GRADUATION_CHALLENGE}
          character={character}
          onComplete={handleGraduationComplete}
          onClose={() => setGraduationOpen(false)}
        />
      )}
    </div>
  );
}

// ── The Renewal → the Shattering (Act 1 climax) ─────────────────────────────────
function ShatteringCutscene({ rating, onFinish }: { rating: Rating; onFinish: () => void }) {
  const ratingLine: Record<Rating, string> = {
    superior: 'It is flawless — the kind of playing the Maestros themselves pause to hear.',
    excellent: 'It is beautiful, and the whole hall knows it.',
    good: 'It is honest and true, and that is more than enough.',
    fair: 'It wavers, but it holds — and it is yours.',
    poor: 'It is rough, but you finish it, and that is what counts tonight.',
  };

  const beats: { emoji: string; tone: string; text: string }[] = [
    {
      emoji: '🎓', tone: '#FFD700',
      text: `The last note of your performance fades. ${ratingLine[rating]} The Grand Auditorium rises to its feet, and for one shining moment the whole world is exactly as it should be.`,
    },
    {
      emoji: '🎼', tone: '#FFD700',
      text: 'Then the hall falls silent — reverent — for the Renewal. Every Maestro who ever taught you takes the stage: your professors, the ten section leaders of the Grand Symphony. Vexus, the Conductor, lifts his baton.',
    },
    {
      emoji: '⚠️', tone: '#FB923C',
      text: "But the notes are wrong. Tritones bloom where nothing should grow. Your teachers' hands falter; their faces tighten. They try to play what Vexus conducts — and the harmony curdles in the air.",
    },
    {
      emoji: '💥', tone: '#F87171',
      text: 'The sound climbs, and climbs, with nowhere to resolve — until the Grand Symphony Score shatters. Light bursts from the stage. Ten shards streak out and strike your ten professors, and they change before your eyes.',
    },
    {
      emoji: '🌫️', tone: '#94A3B8',
      text: 'The world goes grey in a heartbeat — the audience, the faculty, the gold draining out of everything at once. Everyone touched by the world\'s music dulls where they stand. Everyone but you, and the graduates beside you.',
    },
    {
      emoji: '🎓', tone: '#FCD34D',
      text: '"The Renewal is broken." Headmaster Fennelio reaches you through the chaos, his voice thin. "The Maestros are lost, and the world will follow unless the Score is made whole." He presses a travel case into your hands — your Journey gear. "You are the only ones left who can still play. Go. Bring them back."',
    },
  ];

  const [step, setStep] = useState(0);
  const last = step === beats.length - 1;
  const b = beats[step];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-black/40">
      <div className="text-6xl mb-6" style={{ filter: `drop-shadow(0 0 24px ${b.tone}80)` }}>{b.emoji}</div>
      <div className="card-panel max-w-md w-full mb-8" style={{ borderColor: `${b.tone}55` }}>
        <p className="text-academy-cream/85 text-sm leading-relaxed">{b.text}</p>
      </div>
      <div className="flex items-center gap-3">
        {beats.map((_, i) => (
          <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-academy-gold' : 'w-1.5 bg-academy-cream/20'}`} />
        ))}
      </div>
      <button
        onClick={() => (last ? onFinish() : setStep(step + 1))}
        className="btn-primary mt-8"
      >
        {last ? 'Set out — to the Melodious Meadows →' : 'Continue'}
      </button>
    </div>
  );
}

function GearDropBanner({ item, onDismiss }: { item: GearItem; onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-6">
      <div className="card-panel w-full max-w-sm border-rating-excellent/60">
        <div className="text-[10px] text-rating-excellent uppercase tracking-widest font-fantasy mb-2">🎒 Journey Gear Received</div>
        <div className="text-academy-cream/90 font-fantasy text-base mb-0.5">{item.name}</div>
        <div className="text-academy-cream/50 text-xs italic mb-2">{item.fantasyName}</div>
        <div className="text-rating-good text-xs mb-4">
          {Object.entries(item.statBonus).filter(([, v]) => (v ?? 0) > 0).map(([k, v]) => `+${v} ${k}`).join('  ·  ') || 'Unlocks challenge types'}
        </div>
        <button onClick={onDismiss} className="btn-primary w-full text-sm py-2">Begin the Journey →</button>
      </div>
    </div>
  );
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
