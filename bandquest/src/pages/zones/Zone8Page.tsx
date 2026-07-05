import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import ChallengeModal from '../../components/ChallengeModal';
import BattleScreen from '../../components/BattleScreen';
import LiberationScene, { type LibBeat } from '../../components/LiberationScene';
import { useNpcQuestOffers } from '../../components/NpcQuestOffer';
import { MAESTRO_PORTRAITS } from '../../lib/portraits';
import { ENEMIES } from '../../lib/enemies';
import type { Rating, AllyId } from '../../types/game';

interface Scene {
  beats: LibBeat[];
  title?: string;
  doneLabel?: string;
  ally: AllyId;
  key: string;
}

const SCENES: Record<'waldhorn' | 'hautbois' | 'fagotto', Scene> = {
  waldhorn: {
    ally: 'waldhorn', key: 'z8_waldhorn_freed',
    beats: [
      { emoji: '📯', text: "The Forest Flogger's endless calls falter as your blows land — and the fog begins to thin. The shape sinks down, and Maestro Waldhorn, your french horn professor, lifts his head." },
      { emoji: '🎺', image: MAESTRO_PORTRAITS.waldhorn, text: "\"Waldhorn!\" Cornelius is past you before you can blink, hauling his brother up into a fierce embrace. \"I told you. I told you I'd find you.\" He holds him like he isn't sure he's real. The fog lifts from the forest. You can summon Waldhorn in battle." },
    ],
  },
  hautbois: {
    ally: 'hautbois', key: 'z8_hautbois_freed', doneLabel: 'Walk on →',
    beats: [
      { emoji: '🎵', text: "The Double-Reed Specter's saw goes still. Maestra Hautbois — your oboe professor — comes back to herself amid the felled trees… and goes very quiet at the sight of them." },
      { emoji: '🌲', image: MAESTRO_PORTRAITS.hautbois, text: "\"I did this. With my own hands.\" She will not pick the reed back up. \"I'll come with you. I'll help any way I can. But I won't fight again — not after this.\" Hautbois joins you as a guide." },
    ],
  },
  fagotto: {
    ally: 'bassanello', key: 'z8_fagotto_freed', title: 'The Symphony Reunited', doneLabel: 'To the coast →',
    beats: [
      { emoji: '🎵', text: "The Ancient Revenant stops its grinding drone. The last shard falls, and Maestro Fagotto — your bassoon professor, eldest of the Maestros — straightens with the slow dignity of someone very old and very tired." },
      { emoji: '📜', image: MAESTRO_PORTRAITS.bassanello, text: "\"The last of us, freed.\" He gathers the Composer's oldest pages from the ruined camp. \"This corruption flows from one place — west, across the sea, to Discordia. I'll take what I've learned to the Library. The rest of the road is yours.\"" },
      { emoji: '🎼', text: "And then — for the first time since the Renewal — all ten of your professors stand together and play. A fragment of the true Score rolls out across the Forgotten Forest, and far to the west a shaft of light splits the clouds above the Hall of Discord. Act II is over. The Fourth Wind waits at the coast." },
    ],
  },
};

interface Challenge {
  id: string; title: string; type: string; uilStandard: string;
  description: string; required: boolean; completed: boolean; xpBase: number;
}

function buildChallenges(completed: string[]): Challenge[] {
  return [
    { id: 'z8_natural_minor', title: 'Natural Minor Scales', type: 'technique_scale', uilStandard: 'UIL Zone 8 · Scales', description: 'Play natural minor scales — the relative minors of the keys you already know.', required: true, completed: completed.includes('z8_natural_minor'), xpBase: 200 },
    { id: 'z8_complex_16ths', title: 'Rhythm: Complex Sixteenth Patterns', type: 'rhythm_performance', uilStandard: 'UIL Zone 8 · Rhythm', description: 'Tap mixed sixteenth groupings — dotted-eighth/sixteenth and the reverse.', required: true, completed: completed.includes('z8_complex_16ths'), xpBase: 175 },
    { id: 'z8_syncopation_adv', title: 'Rhythm: Advanced Syncopation', type: 'rhythm_performance', uilStandard: 'UIL Zone 8 · Rhythm', description: 'Tap a syncopated line with ties and rests pulling against the beat.', required: true, completed: completed.includes('z8_syncopation_adv'), xpBase: 175 },
    { id: 'z8_sightreading_34', title: 'Sight-Reading: Grade 3–4 Excerpt', type: 'prepared_performance', uilStandard: 'UIL Zone 8 · Sight-Reading', description: 'A Grade 3–4 excerpt. Study time: 30 seconds, then perform it cold.', required: true, completed: completed.includes('z8_sightreading_34'), xpBase: 250 },
    { id: 'z8_melodic_dictation', title: 'Aural: Melodic Dictation (4-bar)', type: 'aural_melody_mapper', uilStandard: 'UIL Zone 8 · Aural', description: 'Hear a four-bar phrase and pick out the notation that matches it.', required: true, completed: completed.includes('z8_melodic_dictation'), xpBase: 75 },
    { id: 'z8_chord_progressions', title: 'Aural: I–IV–V–I Progressions', type: 'aural_chord_oracle', uilStandard: 'UIL Zone 8 · Aural', description: 'Hear a short progression and identify the I–IV–V–I functions.', required: true, completed: completed.includes('z8_chord_progressions'), xpBase: 75 },
    { id: 'z8_minor_arps', title: 'Minor Arpeggios', type: 'technique_scale', uilStandard: 'UIL Zone 8 · Scales', description: 'Outline minor triads as arpeggios, ascending and descending.', required: false, completed: completed.includes('z8_minor_arps'), xpBase: 150 },
    { id: 'z8_forest_lament', title: 'A Lament for the Forest', type: 'prepared_performance', uilStandard: 'UIL Zone 8 · Performance', description: 'Among the felled trees, play something for what was lost here.', required: false, completed: completed.includes('z8_forest_lament'), xpBase: 300 },
  ];
}

type BattleKind = 'skirmish' | 'waldhorn' | 'hautbois' | 'fagotto';
type SceneKey = 'waldhorn' | 'hautbois' | 'fagotto';

export default function Zone8Page() {
  const { character, awardChallenge, advanceZone, freeAlly, addSummonPoints } = useGameStore();
  const navigate = useNavigate();

  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [lastRating, setLastRating] = useState<{ id: string; rating: Rating } | null>(null);
  const [activeBattle, setActiveBattle] = useState<BattleKind | null>(null);
  const [scene, setScene] = useState<SceneKey | null>(null);
  const npcOffers = useNpcQuestOffers(8);

  if (!character) return null;
  if (npcOffers) return npcOffers;

  const challenges = buildChallenges(character.completedChallenges);
  const required = challenges.filter((c) => c.required);
  const optional = challenges.filter((c) => !c.required);
  const completedRequired = required.filter((c) => c.completed).length;
  const allRequiredDone = completedRequired === required.length;

  const skirmishDone = character.completedChallenges.includes('z8_fog_skirmish');
  const waldhornFreed = character.freedAllies.includes('waldhorn');
  const hautboisFreed = character.freedAllies.includes('hautbois');
  const fagottoFreed = character.freedAllies.includes('bassanello');
  const waldhornUnlocked = completedRequired >= 3;
  const canAdvance = waldhornFreed && hautboisFreed && fagottoFreed && allRequiredDone;

  async function handleChallengeComplete(rating: Rating, score: number) {
    if (!activeChallenge) return;
    await awardChallenge(activeChallenge.id, activeChallenge.type, score, rating);
    setLastRating({ id: activeChallenge.id, rating });
    setActiveChallenge(null);
  }

  async function handleVictory(kind: BattleKind, _rp: number, spDelta: number) {
    if (spDelta !== 0) await addSummonPoints(spDelta);
    setActiveBattle(null);
    if (kind === 'skirmish') await awardChallenge('z8_fog_skirmish', 'mini_boss', 100, 'superior');
    else setScene(kind);
  }

  async function finishScene() {
    if (!scene) return;
    const sc = SCENES[scene];
    await freeAlly(sc.ally);
    await awardChallenge(sc.key, 'zone_boss', 100, 'superior');
    setScene(null);
  }

  if (activeBattle) {
    const battleEnemies =
      activeBattle === 'skirmish' ? [ENEMIES.echoing_wisp, ENEMIES.echoing_wisp] :
      activeBattle === 'waldhorn' ? [ENEMIES.forest_flogger] :
      activeBattle === 'hautbois' ? [ENEMIES.double_reed_specter] :
                                    [ENEMIES.ancient_revenant];
    return (
      <BattleScreen
        character={character}
        enemies={battleEnemies}
        onVictory={(rp, sp) => handleVictory(activeBattle, rp, sp)}
        onDefeat={() => setActiveBattle(null)}
      />
    );
  }

  if (scene) {
    const sc = SCENES[scene];
    return <LiberationScene beats={sc.beats} title={sc.title} doneLabel={sc.doneLabel} onDone={finishScene} />;
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="relative bg-gradient-to-b from-emerald-950/50 to-transparent px-4 pt-8 pb-6">
        <button onClick={() => navigate('/hub')} className="text-academy-cream/40 hover:text-academy-cream/80 text-sm mb-4 flex items-center gap-1 transition-colors">← Hub</button>
        <div className="text-academy-gold/60 text-xs tracking-[0.4em] uppercase font-fantasy mb-1">Zone 8 · Act II · Quarter 8 · Finale</div>
        <h1 className="fantasy-title text-2xl text-academy-cream mb-2">Forgotten Forest</h1>
        <p className="text-academy-cream/60 text-sm leading-relaxed">
          A fog-drowned wood at the foot of the cliffs, so thick you can barely see the next tree.
          The only way through is to follow the tritones — toward the horn-calls that thicken the
          mist, and the saws felling the oldest trees in the world. The last three professors are here.
        </p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="card-panel mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-academy-cream/70 text-sm font-fantasy">Required Challenges</span>
            <span className="text-academy-gold font-fantasy">{completedRequired} / {required.length}</span>
          </div>
          <div className="stat-bar"><div className="stat-bar-fill bg-academy-gold" style={{ width: `${(completedRequired / required.length) * 100}%` }} /></div>
        </div>

        <div className="card-panel mb-6 border-emerald-900/40 bg-emerald-950/20">
          <div className="text-xs text-academy-gold/60 uppercase tracking-widest font-fantasy mb-2">Story</div>
          <p className="text-academy-cream/70 text-sm leading-relaxed italic">
            Cornelius walks at the front now, jaw set, listening hard through the fog. Somewhere ahead a
            french horn is calling — the same call, over and over, turned wrong. "That's him," he says,
            not slowing. "That's my brother. Whatever's left of him." He doesn't wait for you. "Come on."
          </p>
        </div>

        {lastRating && (<div className="card-panel mb-4 text-center"><RatingBadge rating={lastRating.rating} /></div>)}

        <h2 className="fantasy-title text-sm text-academy-gold/70 uppercase tracking-widest mb-3">Required Challenges</h2>
        <div className="space-y-2 mb-8">{required.map((c) => (<ChallengeRow key={c.id} challenge={c} onStart={() => setActiveChallenge(c)} />))}</div>

        <h2 className="fantasy-title text-sm text-academy-gold/70 uppercase tracking-widest mb-3">Optional Challenges</h2>
        <div className="space-y-2 mb-8">{optional.map((c) => (<ChallengeRow key={c.id} challenge={c} onStart={() => setActiveChallenge(c)} />))}</div>

        <h2 className="fantasy-title text-sm text-discord-crimson/70 uppercase tracking-widest mb-1">Into the Fog</h2>
        <p className="text-academy-cream/40 text-xs mb-3">Follow the tritones. Real combat — your HP is on the line.</p>

        <div className="card-panel mb-2 border-discord-crimson/20">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-academy-cream/80 text-sm font-semibold mb-1">🌫️ Echoing Wisp</div>
              <div className="text-academy-cream/50 text-xs">Fog and feedback, repeating a call that isn't its own.</div>
            </div>
            {!skirmishDone ? (<button onClick={() => setActiveBattle('skirmish')} className="btn-secondary text-xs py-2 px-3 flex-shrink-0">Fight</button>) : (<span className="text-rating-superior text-lg flex-shrink-0">✓</span>)}
          </div>
        </div>

        {/* Waldhorn — Cornelius's brother */}
        <div className={`card-panel mb-2 ${waldhornUnlocked ? 'border-discord-crimson/40' : 'border-discord-crimson/15 opacity-60'}`}>
          <div className="text-xs text-discord-crimson uppercase tracking-widest font-fantasy mb-2">Corrupted Maestro</div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="text-academy-cream/80 text-sm font-semibold mb-1">📯 The Forest Flogger</div>
              <div className="text-academy-cream/50 text-xs">
                Your french horn professor — and Cornelius's lost brother, Maestro Waldhorn. His endless calls are the fog itself.
                {!waldhornUnlocked && <span className="text-academy-gold/50"> (Complete 3 required challenges to track him)</span>}
              </div>
              {waldhornFreed && (<div className="text-rating-good text-xs mt-1.5 italic">Freed. The fog has lifted — Cornelius has his brother back. Waldhorn answers your summons.</div>)}
            </div>
            {waldhornUnlocked && !waldhornFreed && (<button onClick={() => setActiveBattle('waldhorn')} className="btn-danger text-xs py-2 px-3 flex-shrink-0">Battle</button>)}
            {waldhornFreed && <span className="text-rating-superior text-lg flex-shrink-0">✓</span>}
          </div>
        </div>

        {/* The double-reed loggers */}
        <h2 className="fantasy-title text-sm text-discord-crimson/70 uppercase tracking-widest mb-1 mt-6">The Logging Camp</h2>
        <p className="text-academy-cream/40 text-xs mb-3">Where the oldest trees are falling — and the last two shards wait.</p>

        <div className={`card-panel mb-2 ${waldhornFreed ? 'border-discord-crimson/40' : 'border-discord-crimson/15 opacity-60'}`}>
          <div className="text-xs text-discord-crimson uppercase tracking-widest font-fantasy mb-2">Corrupted Maestro</div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="text-academy-cream/80 text-sm font-semibold mb-1">🎵 The Double-Reed Specter</div>
              <div className="text-academy-cream/50 text-xs">
                Your oboe professor, Maestra Hautbois — felling the ancient forest for cane, over and over.
                {!waldhornFreed && <span className="text-academy-gold/50"> (Quiet the horn-calls and lift the fog first)</span>}
              </div>
              {hautboisFreed && (<div className="text-rating-good text-xs mt-1.5 italic">Freed. Hautbois travels with you as a guide — she will not fight again.</div>)}
            </div>
            {waldhornFreed && !hautboisFreed && (<button onClick={() => setActiveBattle('hautbois')} className="btn-danger text-xs py-2 px-3 flex-shrink-0">Battle</button>)}
            {hautboisFreed && <span className="text-rating-superior text-lg flex-shrink-0">✓</span>}
          </div>
        </div>

        <div className={`card-panel mb-2 ${hautboisFreed ? 'border-discord-crimson/40' : 'border-discord-crimson/15 opacity-60'}`}>
          <div className="text-xs text-discord-crimson uppercase tracking-widest font-fantasy mb-2">Corrupted Maestro · Act II Finale</div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="text-academy-cream/80 text-sm font-semibold mb-1">🎵 The Ancient Revenant</div>
              <div className="text-academy-cream/50 text-xs">
                Your bassoon professor, Maestro Fagotto, eldest of the Maestros — the last shard to reclaim.
                {!hautboisFreed && <span className="text-academy-gold/50"> (Free Hautbois first)</span>}
              </div>
              {fagottoFreed && (<div className="text-rating-good text-xs mt-1.5 italic">Freed. The Symphony is whole again. Fagotto retires to the Library — and answers your summons.</div>)}
            </div>
            {hautboisFreed && !fagottoFreed && (<button onClick={() => setActiveBattle('fagotto')} className="btn-danger text-xs py-2 px-3 flex-shrink-0">Battle</button>)}
            {fagottoFreed && <span className="text-rating-superior text-lg flex-shrink-0">✓</span>}
          </div>
        </div>

        {/* Advance — sail to Act 3 */}
        {(waldhornFreed && hautboisFreed && fagottoFreed) && (
          <div className={`card-panel mt-4 ${canAdvance ? 'border-academy-gold/50' : 'border-academy-gold/20'}`}>
            <div className="text-xs text-academy-gold uppercase tracking-widest font-fantasy mb-2">End of Act II</div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="text-academy-cream/80 text-sm font-semibold mb-1">Board the Fourth Wind</div>
                <div className="text-academy-cream/50 text-xs">
                  All ten professors freed, the Symphony whole. The trail of corruption runs west, across
                  the sea, to Discordia. It's time to follow it.
                  {!allRequiredDone && <span className="text-academy-gold/50"> (Finish your required challenges first)</span>}
                </div>
              </div>
              {canAdvance && (<button onClick={async () => { await advanceZone(9); navigate('/hub'); }} className="btn-primary text-xs py-2 px-3 flex-shrink-0">Set sail →</button>)}
            </div>
          </div>
        )}
      </div>

      {activeChallenge && (
        <ChallengeModal challenge={activeChallenge} character={character} onComplete={handleChallengeComplete} onClose={() => setActiveChallenge(null)} />
      )}
    </div>
  );
}

function ChallengeRow({ challenge, onStart }: { challenge: Challenge; onStart: () => void }) {
  const typeIcon: Record<string, string> = {
    technique_scale: '🎼', prepared_performance: '🎵', rhythm_performance: '🥁',
    aural_pitch_spy: '👂', aural_rhythm_echo: '🔊', aural_interval_quest: '🎶',
    aural_melody_mapper: '🎶', aural_chord_oracle: '🎵',
  };
  return (
    <button onClick={onStart} className={`w-full card-panel py-3 px-4 flex items-center gap-4 text-left transition-all hover:border-academy-gold/40 ${challenge.completed ? 'opacity-60' : 'cursor-pointer'}`}>
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
        {challenge.completed ? <span className="text-rating-superior text-lg">✓</span> : <span className="text-academy-gold/60 text-sm">→</span>}
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
