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
  ];
}

// ── The Concerta Invitational (bracket) ─────────────────────────────────────────
const SEMIFINAL_CHALLENGE: Challenge = {
  id: 'z3_semifinal',
  title: 'Semifinal — vs Piano Preparatory',
  type: 'prepared_performance',
  uilStandard: 'The Concerta Invitational · Semifinal',
  description:
    'Perform your prepared piece for the judges. Piano Preparatory just played a crisp, ' +
    'confident set — match or beat them (Good or better) to reach the final.',
  required: true,
  completed: false,
  xpBase: 600,
};

const FINAL_CHALLENGE: Challenge = {
  id: 'z3_final',
  title: 'Final — vs The String School',
  type: 'prepared_performance',
  uilStandard: 'The Concerta Invitational · Final',
  description:
    'The whole town has packed the square. The String School are the favorites — perform a ' +
    'Sacred Score fragment and take the trophy (Good or better).',
  required: true,
  completed: false,
  xpBase: 1500,
};

type MatchId = 'semifinal' | 'final';

export default function Zone3Page() {
  const { character, awardChallenge, advanceZone, equipGear } = useGameStore();
  const navigate = useNavigate();

  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [activeMatch, setActiveMatch] = useState<MatchId | null>(null);
  const [lastRating, setLastRating] = useState<{ id: string; rating: Rating } | null>(null);
  const [matchFailed, setMatchFailed] = useState<MatchId | null>(null);
  const [gearDrop, setGearDrop] = useState<GearItem | null>(null);
  const recruitment = useClassmateRecruitment(3);
  const npcOffers = useNpcQuestOffers(3);

  if (!character) return null;
  const char = character;
  if (recruitment) return recruitment;
  if (npcOffers) return npcOffers;

  const challenges = buildChallenges(character.completedChallenges);
  const required = challenges.filter((c) => c.required);
  const optional = challenges.filter((c) => !c.required);
  const completedRequired = required.filter((c) => c.completed).length;
  const allRequiredDone = completedRequired === required.length;
  const semifinalWon = character.completedChallenges.includes('z3_semifinal_won');
  const contestWon = character.completedChallenges.includes('z3_contest_won');

  async function handleChallengeComplete(rating: Rating, score: number) {
    if (!activeChallenge) return;
    await awardChallenge(activeChallenge.id, activeChallenge.type, score, rating);
    setLastRating({ id: activeChallenge.id, rating });
    setActiveChallenge(null);
  }

  async function handleMatchComplete(match: MatchId, rating: Rating, score: number) {
    const passed = rating === 'good' || rating === 'excellent' || rating === 'superior';
    const type = match === 'final' ? 'zone_boss' : 'mini_boss';
    setLastRating({ id: `z3_${match}`, rating });
    if (passed) {
      const winKey = match === 'final' ? 'z3_contest_won' : 'z3_semifinal_won';
      await awardChallenge(winKey, type, score, rating); // marks completion + XP/RP/coins
      if (match === 'final') {
        const drop = getBossGearDrop('z3_contest_won', char);
        if (drop) { await equipGear(drop); setGearDrop(drop); }
        await advanceZone(4);
      }
    } else {
      // Award attempt XP without marking the bracket gate complete.
      await awardChallenge(`z3_${match}`, type, score, rating, { trackCompletion: false });
      setMatchFailed(match);
    }
    setActiveMatch(null);
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
          Zone 3 · Act I · Quarter 3
        </div>
        <h1 className="fantasy-title text-2xl text-academy-cream mb-2">The City of Concerta</h1>
        <p className="text-academy-cream/60 text-sm leading-relaxed">
          Your first field trip beyond the Academy walls. Concerta — the great central metropolis —
          is bright and bustling — banners strung between the rooftops, every guild hall flying its
          colors. The regional inter-school contest has come to the city, and the Academy has entered you.
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
          {allRequiredDone && !contestWon && (
            <div className="mt-3 text-center text-rating-superior text-sm font-fantasy animate-pulse">
              🏆 The Concerta Invitational is open
            </div>
          )}
        </div>

        <div className="card-panel mb-6 border-amber-700/30 bg-amber-900/10">
          <div className="text-xs text-academy-gold/60 uppercase tracking-widest font-fantasy mb-2">Story</div>
          <p className="text-academy-cream/70 text-sm leading-relaxed italic">
            Four schools, one trophy: Choral College, Piano Preparatory, The String School — and you.
            Valeria Croft finds you at the staging tent and straightens your collar. "Nervous? Good,"
            she says. "Channel it. Now go show them what the Academy can do."
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

        {/* The bracket */}
        <div className="card-panel mt-4 border-academy-gold/30">
          <div className="text-xs text-academy-gold uppercase tracking-widest font-fantasy mb-1">
            🏆 The Concerta Invitational
          </div>
          <div className="text-academy-cream/40 text-xs mb-4">
            Single-elimination. Win your semifinal, then take the final to claim the trophy and advance to Quarter 4.
          </div>

          {!allRequiredDone && (
            <div className="text-academy-gold/50 text-xs mb-4">
              Complete all required challenges to enter the contest.
            </div>
          )}

          <div className="text-[10px] text-academy-cream/40 uppercase tracking-widest mb-2">Semifinals</div>

          <MatchCard
            opponent="Piano Preparatory" oppEmoji="🎹"
            state={semifinalWon ? 'won' : allRequiredDone ? 'play' : 'locked'}
            onPlay={() => { setMatchFailed(null); setActiveMatch('semifinal'); }}
            failed={matchFailed === 'semifinal'}
            lockedHint="Finish the required work"
          />

          {/* The other semifinal resolves on its own */}
          <div className="rounded-lg border border-white/10 px-3 py-2.5 mb-4 opacity-70">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm">
                <span className="text-academy-cream/80">🎶 Choral College</span>
                <span className="text-academy-cream/40 mx-2">vs</span>
                <span className="text-academy-cream/80">🎻 The String School</span>
              </div>
              <span className="text-academy-cream/50 text-[10px] italic">String School advances</span>
            </div>
          </div>

          <div className="text-[10px] text-academy-cream/40 uppercase tracking-widest mb-2">Final</div>

          <MatchCard
            opponent="The String School" oppEmoji="🎻"
            state={contestWon ? 'champion' : semifinalWon ? 'play' : 'locked'}
            onPlay={() => { setMatchFailed(null); setActiveMatch('final'); }}
            failed={matchFailed === 'final'}
            lockedHint="Win your semifinal first"
            winLabel="🏆 Champions"
          />

          {contestWon && (
            <div className="mt-3 text-academy-cream/60 text-xs italic leading-relaxed border-t border-white/5 pt-3">
              The square erupts. The String School's first chair shakes your hand, grinning. The
              Academy's banner rises over Concerta, and for one bright afternoon the whole city sings
              along. You've earned your colors.
            </div>
          )}
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
      {activeMatch && (
        <ChallengeModal
          challenge={activeMatch === 'final' ? FINAL_CHALLENGE : SEMIFINAL_CHALLENGE}
          character={character}
          onComplete={(r, s) => handleMatchComplete(activeMatch, r, s)}
          onClose={() => setActiveMatch(null)}
        />
      )}
    </div>
  );
}

function MatchCard({ opponent, oppEmoji, state, onPlay, failed, lockedHint, winLabel }: {
  opponent: string;
  oppEmoji: string;
  state: 'locked' | 'play' | 'won' | 'champion';
  onPlay: () => void;
  failed?: boolean;
  lockedHint?: string;
  winLabel?: string;
}) {
  const won = state === 'won' || state === 'champion';
  return (
    <div className={`rounded-lg border px-3 py-2.5 mb-2 ${
      state === 'locked' ? 'opacity-50 border-white/10' :
      won ? 'border-rating-superior/40' : 'border-academy-gold/30'}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm">
          <span className="text-academy-cream/90 font-semibold">🎺 You</span>
          <span className="text-academy-cream/40 mx-2">vs</span>
          <span className="text-academy-cream/80">{oppEmoji} {opponent}</span>
        </div>
        {state === 'play' && (
          <button onClick={onPlay} className="btn-primary text-xs py-1.5 px-3 flex-shrink-0">Perform</button>
        )}
        {won && (
          <span className="text-rating-superior text-sm font-fantasy flex-shrink-0">{winLabel ?? '✓ Won'}</span>
        )}
        {state === 'locked' && (
          <span className="text-academy-cream/30 text-[10px] flex-shrink-0">{lockedHint ?? 'Locked'}</span>
        )}
      </div>
      {failed && state === 'play' && (
        <div className="text-rating-poor text-xs mt-1.5">
          The judges weren't convinced — regroup and perform again.
        </div>
      )}
    </div>
  );
}

function GearDropBanner({ item, onDismiss }: { item: GearItem; onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-6">
      <div className="card-panel w-full max-w-sm border-rating-excellent/60">
        <div className="text-[10px] text-rating-excellent uppercase tracking-widest font-fantasy mb-2">🏆 Prize Awarded</div>
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
