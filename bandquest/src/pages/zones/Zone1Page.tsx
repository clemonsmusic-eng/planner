import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { INSTRUMENTS } from '../../lib/instruments';
import { getBossGearDrop } from '../../lib/gear';
import ChallengeModal from '../../components/ChallengeModal';
import BattleScreen from '../../components/BattleScreen';
import { useNpcQuestOffers } from '../../components/NpcQuestOffer';
import { ENEMIES } from '../../lib/enemies';
import type { Rating, GearItem } from '../../types/game';

const BOOT_CAMP_GRADUATION_CHALLENGE: Challenge = {
  id: 'z1_graduation',
  title: 'Boot Camp Graduation — First 3-Note Song',
  type: 'prepared_performance',
  uilStandard: 'Zone 1 · Quarter End',
  description:
    'Play your first complete 3-note song for Director Fennelio. This is the moment you ' +
    'officially become a student of Harmonia Academy. Good or better required to advance to Quarter 2.',
  required: true,
  completed: false,
  xpBase: 1500,
};

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
  const { character, awardChallenge, advanceZone, equipGear, addSummonPoints } = useGameStore();
  const navigate = useNavigate();

  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [lastRating, setLastRating] = useState<{ id: string; rating: Rating } | null>(null);
  const [activeBattle, setActiveBattle] = useState<'mini_boss' | null>(null);
  const [graduationOpen, setGraduationOpen] = useState(false);
  const [graduationFailed, setGraduationFailed] = useState(false);
  const [gearDrop, setGearDrop] = useState<GearItem | null>(null);
  const npcOffers = useNpcQuestOffers(1);

  if (!character) return null;
  if (npcOffers) return npcOffers;
  const char = character; // stable ref for async callbacks

  const challenges = buildChallenges(character.completedChallenges);
  const required = challenges.filter((c) => c.required);
  const optional = challenges.filter((c) => !c.required);
  const completedRequired = required.filter((c) => c.completed).length;
  const allRequiredDone = completedRequired === required.length;
  const instrument = INSTRUMENTS[character.instrument];
  const miniBossUnlocked = completedRequired >= 4;
  const miniBossDefeated = character.completedChallenges.includes('z1_mini_boss_defeated');
  const graduationUnlocked = allRequiredDone && miniBossDefeated;
  const graduationDone = character.completedChallenges.includes('z1_graduation');

  async function handleChallengeComplete(rating: Rating, score: number) {
    if (!activeChallenge) return;
    await awardChallenge(activeChallenge.id, activeChallenge.type, score, rating);
    setLastRating({ id: activeChallenge.id, rating });
    setActiveChallenge(null);
  }

  async function handleBattleVictory(_rp: number, spDelta: number) {
    await awardChallenge('z1_mini_boss_defeated', 'mini_boss', 100, 'superior');
    const drop = getBossGearDrop('z1_mini_boss_defeated', char);
    if (drop) { await equipGear(drop); setGearDrop(drop); }
    if (spDelta !== 0) await addSummonPoints(spDelta);
    setActiveBattle(null);
  }

  async function handleGraduationComplete(rating: Rating, score: number) {
    await awardChallenge('z1_graduation', 'zone_boss', score, rating);
    const passed = rating === 'good' || rating === 'excellent' || rating === 'superior';
    if (passed) {
      const drop = getBossGearDrop('z1_graduation', char);
      if (drop) { await equipGear(drop); setGearDrop(drop); }
      await advanceZone(2);
    } else {
      setGraduationFailed(true);
    }
    setGraduationOpen(false);
  }

  if (activeBattle) {
    return (
      <BattleScreen
        character={character}
        enemies={[ENEMIES.enchanted_music_stand]}
        simulatorMode
        onVictory={handleBattleVictory}
        onDefeat={() => setActiveBattle(null)}
      />
    );
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
          {graduationUnlocked && !graduationDone && (
            <div className="mt-3 text-center text-rating-superior text-sm font-fantasy animate-pulse">
              ✓ Boot Camp Graduation Unlocked
            </div>
          )}
        </div>

        {/* Story beat */}
        <div className="card-panel mb-6 border-amber-700/30 bg-amber-900/10">
          <div className="text-xs text-academy-gold/60 uppercase tracking-widest font-fantasy mb-2">Story</div>
          <p className="text-academy-cream/70 text-sm leading-relaxed italic">
            From the Academy's high windows, the city of Concerta glows gold in the valley below,
            and somewhere a street band is playing. Maestro Barenboimi enters the practice room,
            baton in hand. "A whole world runs on music," he says, "and one day it will run on
            yours. So — again, from the top. Your scales matter more than you know."
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

        {/* Mini-boss */}
        <div className={`card-panel mt-8 ${miniBossUnlocked ? 'border-amber-600/50' : 'border-amber-700/20 opacity-60'}`}>
          <div className="text-xs text-academy-gold/60 uppercase tracking-widest font-fantasy mb-2">
            Mid-Quarter Boss
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-academy-cream/80 text-sm font-semibold mb-1">
                🎼 The Enchanted Music Stand
              </div>
              <div className="text-academy-cream/50 text-xs">
                A practice room stand possessed by a wandering Flatling. Drains your Accuracy.
                {!miniBossUnlocked && <span className="text-academy-gold/50"> (Complete 4 required challenges)</span>}
              </div>
            </div>
            {miniBossUnlocked && !miniBossDefeated && (
              <button onClick={() => setActiveBattle('mini_boss')} className="btn-secondary text-xs py-2 px-3 flex-shrink-0">
                Fight
              </button>
            )}
            {miniBossDefeated && <span className="text-rating-superior text-lg flex-shrink-0">✓</span>}
          </div>
        </div>

        {/* Boot Camp Graduation — quarter-end performance gate */}
        {(graduationUnlocked || graduationDone) && (
          <div className={`card-panel mt-4 ${graduationDone ? 'border-rating-superior/30' : 'border-academy-gold/40'}`}>
            <div className="text-xs text-academy-gold uppercase tracking-widest font-fantasy mb-2">
              Quarter End · Boot Camp Graduation
            </div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="text-academy-cream/80 text-sm font-semibold mb-1">
                  🎓 First 3-Note Song
                </div>
                <div className="text-academy-cream/50 text-xs mb-1">
                  Play your first complete song for Director Fennelio. A Good rating or better is required
                  to advance to Quarter 2.
                </div>
                {graduationFailed && !graduationDone && (
                  <div className="text-rating-poor text-xs mt-1">
                    Not quite ready — keep practicing and try again.
                  </div>
                )}
              </div>
              {!graduationDone ? (
                <button
                  onClick={() => { setGraduationFailed(false); setGraduationOpen(true); }}
                  className="btn-primary text-xs py-2 px-3 flex-shrink-0"
                >
                  Perform
                </button>
              ) : (
                <span className="text-rating-superior text-lg flex-shrink-0">✓</span>
              )}
            </div>
            {graduationDone && (
              <div className="mt-3 text-academy-cream/60 text-xs italic leading-relaxed border-t border-white/5 pt-3">
                Director Fennelio sets down his baton. A long pause. Then, for the first time all
                quarter, he smiles. "Welcome to Harmonia Academy," he says. "You are a student here."
              </div>
            )}
          </div>
        )}
      </div>

      {/* Gear drop notification */}
      {gearDrop && (
        <GearDropBanner item={gearDrop} onDismiss={() => setGearDrop(null)} />
      )}

      {/* Challenge Modal */}
      {activeChallenge && (
        <ChallengeModal
          challenge={activeChallenge}
          character={character}
          onComplete={handleChallengeComplete}
          onClose={() => setActiveChallenge(null)}
        />
      )}
      {/* Boot Camp Graduation Modal */}
      {graduationOpen && (
        <ChallengeModal
          challenge={BOOT_CAMP_GRADUATION_CHALLENGE}
          character={character}
          onComplete={handleGraduationComplete}
          onClose={() => setGraduationOpen(false)}
        />
      )}
    </div>
  );
}

function GearDropBanner({ item, onDismiss }: { item: import('../../types/game').GearItem; onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-6">
      <div className="card-panel w-full max-w-sm border-rating-excellent/60 animate-slide-up">
        <div className="text-[10px] text-rating-excellent uppercase tracking-widest font-fantasy mb-2">
          ⚔️ Gear Acquired
        </div>
        <div className="text-academy-cream/90 font-fantasy text-base mb-0.5">{item.name}</div>
        <div className="text-academy-cream/50 text-xs italic mb-2">{item.fantasyName}</div>
        <div className="text-rating-good text-xs mb-4">
          {Object.entries(item.statBonus)
            .filter(([, v]) => (v ?? 0) > 0)
            .map(([k, v]) => `+${v} ${k}`)
            .join('  ·  ') || 'Unlocks new challenge types'}
        </div>
        <button onClick={onDismiss} className="btn-primary w-full text-sm py-2">Equip →</button>
      </div>
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
