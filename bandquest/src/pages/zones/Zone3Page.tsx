import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { getBossGearDrop } from '../../lib/gear';
import ChallengeModal from '../../components/ChallengeModal';
import BattleScreen from '../../components/BattleScreen';
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
      id: 'z3_eb_scale',
      title: 'Concert Eb Major Scale',
      type: 'technique_scale',
      uilStandard: 'UIL Zone 3 · Scales',
      description: 'Play the Concert Eb major scale, one octave, then attempt two octaves.',
      required: true,
      completed: completed.includes('z3_eb_scale'),
      xpBase: 150,
    },
    {
      id: 'z3_dotted_quarter',
      title: 'Rhythm: Dotted Quarter + Eighth',
      type: 'rhythm_performance',
      uilStandard: 'UIL Zone 3 · Rhythm',
      description: 'Tap a pattern using the dotted quarter–eighth note rhythm combination.',
      required: true,
      completed: completed.includes('z3_dotted_quarter'),
      xpBase: 150,
    },
    {
      id: 'z3_two_octave_scale',
      title: 'Two-Octave Scale: Concert Bb',
      type: 'technique_scale',
      uilStandard: 'UIL Zone 3 · Scales',
      description: 'Perform the Concert Bb major scale across two full octaves.',
      required: true,
      completed: completed.includes('z3_two_octave_scale'),
      xpBase: 150,
    },
    {
      id: 'z3_aural_intervals',
      title: 'Aural: Simple Intervals',
      type: 'aural_interval_quest',
      uilStandard: 'UIL Zone 3 · Aural',
      description: 'Identify three simple intervals by ear: unison, perfect octave, and perfect fifth.',
      required: true,
      completed: completed.includes('z3_aural_intervals'),
      xpBase: 75,
    },
    {
      id: 'z3_aural_two_bar',
      title: 'Rhythm Echo: Two-Bar Patterns',
      type: 'aural_rhythm_echo',
      uilStandard: 'UIL Zone 3 · Aural',
      description: 'Listen to a two-bar rhythm pattern and tap it back.',
      required: true,
      completed: completed.includes('z3_aural_two_bar'),
      xpBase: 75,
    },
    {
      id: 'z3_accent',
      title: 'Articulation: Accent',
      type: 'prepared_performance',
      uilStandard: 'UIL Zone 3 · Articulation',
      description: 'Perform a phrase with accented notes. The accent (>) mark means a sudden, heavier attack.',
      required: true,
      completed: completed.includes('z3_accent'),
      xpBase: 150,
    },
    {
      id: 'z3_cresc_decresc_long',
      title: 'Crescendo and Decrescendo',
      type: 'prepared_performance',
      uilStandard: 'UIL Zone 3 · Dynamics',
      description: 'Perform an 8-bar phrase with a full dynamic arc: p → mf → f → mf → p.',
      required: false,
      completed: completed.includes('z3_cresc_decresc_long'),
      xpBase: 150,
    },
    {
      id: 'z3_town_concert',
      title: 'The Town Concert (Ensemble)',
      type: 'prepared_performance',
      uilStandard: 'UIL Zone 3 · Ensemble',
      description: "Perform your part of a Sacred Score fragment. The town of Crotchet is listening.",
      required: false,
      completed: completed.includes('z3_town_concert'),
      xpBase: 500,
    },
  ];
}

export default function Zone3Page() {
  const { character, awardChallenge, advanceZone, equipGear } = useGameStore();
  const navigate = useNavigate();

  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [lastRating, setLastRating] = useState<{ id: string; rating: Rating } | null>(null);
  const [activeBattle, setActiveBattle] = useState(false);
  const [gearDrop, setGearDrop] = useState<GearItem | null>(null);

  if (!character) return null;
  const char = character;

  const challenges = buildChallenges(character.completedChallenges);
  const required = challenges.filter((c) => c.required);
  const optional = challenges.filter((c) => !c.required);
  const completedRequired = required.filter((c) => c.completed).length;
  const miniBossUnlocked = completedRequired >= 3;
  const miniBossDefeated = character.completedChallenges.includes('z3_mini_boss_defeated');

  async function handleChallengeComplete(rating: Rating, score: number) {
    if (!activeChallenge) return;
    await awardChallenge(activeChallenge.id, activeChallenge.type, score, rating);
    setLastRating({ id: activeChallenge.id, rating });
    setActiveChallenge(null);
  }

  async function handleBattleVictory() {
    await awardChallenge('z3_mini_boss_defeated', 'mini_boss', 100, 'superior');
    if (completedRequired === required.length) await advanceZone(4);
    const drop = getBossGearDrop('z3_mini_boss_defeated', char.instrument);
    if (drop) { await equipGear(drop); setGearDrop(drop); }
    setActiveBattle(false);
  }

  if (activeBattle) {
    return (
      <BattleScreen
        character={character}
        enemy={ENEMIES.double_flat_wretch}
        onVictory={handleBattleVictory}
        onDefeat={() => setActiveBattle(false)}
      />
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="relative bg-gradient-to-b from-gray-800/50 to-transparent px-4 pt-8 pb-6">
        <button
          onClick={() => navigate('/hub')}
          className="text-academy-cream/40 hover:text-academy-cream/80 text-sm mb-4 flex items-center gap-1 transition-colors"
        >
          ← Hub
        </button>
        <div className="text-academy-gold/60 text-xs tracking-[0.4em] uppercase font-fantasy mb-1">
          Zone 3 · Act I · Quarter 3
        </div>
        <h1 className="fantasy-title text-2xl text-academy-cream mb-2">The Town of Crotchet</h1>
        <p className="text-academy-cream/60 text-sm leading-relaxed">
          First supervised field trips beyond the Academy walls. Crotchet is half-ruined, its
          citizens dull and grey from the Twisted Melodies that drift through. Colors seem to have
          faded from the cobblestones. But the people still gather when music plays.
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

        <div className="card-panel mb-6 border-gray-700/40 bg-gray-900/20">
          <div className="text-xs text-academy-gold/60 uppercase tracking-widest font-fantasy mb-2">Story</div>
          <p className="text-academy-cream/70 text-sm leading-relaxed italic">
            In the market square, a Twisted Melody begins to coalesce from the fog. Before you can
            react, a hand grabs your shoulder — Valeria Croft, a recent Academy graduate, steps
            forward. "Watch how I handle this," she says. "Then you'll understand what mastery
            looks like."
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

        <div className={`card-panel mt-4 ${miniBossUnlocked ? 'border-amber-600/50' : 'border-amber-700/20 opacity-60'}`}>
          <div className="text-xs text-academy-gold/60 uppercase tracking-widest font-fantasy mb-2">Mini-Boss</div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-academy-cream/80 text-sm font-semibold mb-1">😔 The Flatling Mob</div>
              <div className="text-academy-cream/50 text-xs">
                A swarm draining color from the town square.
                {!miniBossUnlocked && <span className="text-academy-gold/50"> (Complete 3 required challenges)</span>}
              </div>
            </div>
            {miniBossUnlocked && !miniBossDefeated && (
              <button onClick={() => setActiveBattle(true)} className="btn-secondary text-xs py-2 px-3 flex-shrink-0">Fight</button>
            )}
            {miniBossDefeated && <span className="text-rating-superior text-lg flex-shrink-0">✓</span>}
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

function ChallengeRow({ challenge, onStart }: { challenge: Challenge; onStart: () => void }) {
  const typeIcon: Record<string, string> = {
    technique_scale: '🎼', prepared_performance: '🎵',
    rhythm_performance: '🥁', aural_pitch_spy: '👂',
    aural_rhythm_echo: '🔊', aural_interval_quest: '🎶',
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
