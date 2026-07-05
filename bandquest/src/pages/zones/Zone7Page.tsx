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
  ally?: AllyId;
  key: string;
}

const SCENES: Record<'adolpha' | 'contra' | 'sackbut' | 'euphonia', Scene> = {
  adolpha: {
    ally: 'vela', key: 'z7_adolpha_freed',
    beats: [
      { emoji: '🎷', text: "The Sound Shadow's borrowed shapes peel away one by one, and Maestra Adolpha — your saxophone professor — stands at the top of Player's Pass, breathing hard, herself again." },
      { emoji: '🎶', image: MAESTRO_PORTRAITS.vela, text: "\"Whoo. Strange dream to wake from.\" She rolls her shoulders, cool as ever. \"I saw a lot from up here while I was… not me. There's an outpost below, and the thing running it was never one of us. Watch yourself.\" You can summon Adolpha in battle." },
    ],
  },
  contra: {
    key: 'z7_contra_defeated', title: 'The Lieutenant Falls', doneLabel: 'Press on →',
    beats: [
      { emoji: '⚙️', text: "Lieutenant Contra's command cuts off mid-blast. Its great dark body splinters and falls still — the first of Vexus's made lieutenants, broken." },
      { emoji: '🔗', text: "Its grip on the outpost shatters with it. But the two professors it held are still wrapped in their shards — freed of Contra's command, not yet of the corruption. They turn toward you. You'll have to reach them yourself." },
    ],
  },
  sackbut: {
    ally: 'posaune', key: 'z7_sackbut_freed',
    beats: [
      { emoji: '📯', text: "The Sliding Chaos Knight's wild glissando finally lands true, and the shape resolves into Maestro Sackbut — your trombone professor — flat on his back, laughing in relief." },
      { emoji: '🎶', image: MAESTRO_PORTRAITS.posaune, text: "\"Ha! Knew one of mine would come.\" He clambers up, broad and beaming. \"Felt like swinging that slide at the whole world. Glad it's over.\" You can summon Sackbut in battle." },
    ],
  },
  euphonia: {
    ally: 'cantora', key: 'z7_euphonia_freed',
    beats: [
      { emoji: '🎵', text: "The Stone Colossus's endless low tone cracks and crumbles, and Maestro Torbult — your euphonium professor — steps out of the rubble, steady as ever." },
      { emoji: '🎶', image: MAESTRO_PORTRAITS.cantora, text: "\"There you are.\" He rests a warm hand on your shoulder. \"I had the strangest feeling I was holding the whole mountain up. Come — let's not keep the others waiting.\" You can summon Torbult in battle." },
    ],
  },
};

interface Challenge {
  id: string; title: string; type: string; uilStandard: string;
  description: string; required: boolean; completed: boolean; xpBase: number;
}

function buildChallenges(completed: string[]): Challenge[] {
  return [
    { id: 'z7_all_major_scales', title: 'All Major Scales', type: 'technique_scale', uilStandard: 'UIL Zone 7 · Scales', description: 'Perform the full concert-band set of major scales in sequence.', required: true, completed: completed.includes('z7_all_major_scales'), xpBase: 200 },
    { id: 'z7_triplets', title: 'Rhythm: Triplet Patterns', type: 'rhythm_performance', uilStandard: 'UIL Zone 7 · Rhythm', description: 'Tap eighth-note triplets cleanly — three even notes to the beat.', required: true, completed: completed.includes('z7_triplets'), xpBase: 150 },
    { id: 'z7_two_four', title: 'Rhythm: 2/4 Time', type: 'rhythm_performance', uilStandard: 'UIL Zone 7 · Rhythm', description: 'Tap a march-like pattern in 2/4 — two strong beats per measure.', required: true, completed: completed.includes('z7_two_four'), xpBase: 150 },
    { id: 'z7_articulation_adv', title: 'Advanced Articulation Patterns', type: 'prepared_performance', uilStandard: 'UIL Zone 7 · Articulation', description: 'Perform a phrase mixing slurs, accents, staccato and marcato in quick succession.', required: true, completed: completed.includes('z7_articulation_adv'), xpBase: 150 },
    { id: 'z7_sightreading_3', title: 'Sight-Reading: Grade 3 Excerpt', type: 'prepared_performance', uilStandard: 'UIL Zone 7 · Sight-Reading', description: 'A Grade 3 excerpt. Study time: 30 seconds, then perform it cold.', required: true, completed: completed.includes('z7_sightreading_3'), xpBase: 250 },
    { id: 'z7_aural_intervals_all', title: 'Aural: All Basic Intervals', type: 'aural_interval_quest', uilStandard: 'UIL Zone 7 · Aural', description: 'Identify every basic interval by ear, from the minor 2nd up to the octave.', required: true, completed: completed.includes('z7_aural_intervals_all'), xpBase: 75 },
    { id: 'z7_aural_dom7', title: 'Aural: Major / Minor / Dominant 7th', type: 'aural_chord_oracle', uilStandard: 'UIL Zone 7 · Aural', description: 'Hear a chord and name its quality — major, minor, or dominant 7th.', required: false, completed: completed.includes('z7_aural_dom7'), xpBase: 75 },
    { id: 'z7_andre_fanfare', title: "Captain André's Fanfare", type: 'prepared_performance', uilStandard: 'UIL Zone 7 · Performance', description: "The militia captain asks for a fanfare to rally his cliff garrison. Give them something to stand a little taller for.", required: false, completed: completed.includes('z7_andre_fanfare'), xpBase: 300 },
  ];
}

type BattleKind = 'skirmish' | 'adolpha' | 'contra' | 'sackbut' | 'euphonia';
type SceneKey = 'adolpha' | 'contra' | 'sackbut' | 'euphonia';

export default function Zone7Page() {
  const { character, awardChallenge, advanceZone, freeAlly, addSummonPoints } = useGameStore();
  const navigate = useNavigate();

  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [lastRating, setLastRating] = useState<{ id: string; rating: Rating } | null>(null);
  const [activeBattle, setActiveBattle] = useState<BattleKind | null>(null);
  const [scene, setScene] = useState<SceneKey | null>(null);
  const npcOffers = useNpcQuestOffers(7);

  if (!character) return null;
  if (npcOffers) return npcOffers;

  const challenges = buildChallenges(character.completedChallenges);
  const required = challenges.filter((c) => c.required);
  const optional = challenges.filter((c) => !c.required);
  const completedRequired = required.filter((c) => c.completed).length;
  const allRequiredDone = completedRequired === required.length;

  const skirmishDone = character.completedChallenges.includes('z7_outpost_skirmish');
  const contraDefeated = character.completedChallenges.includes('z7_contra_defeated');
  const adolphaFreed = character.freedAllies.includes('vela');
  const sackbutFreed = character.freedAllies.includes('posaune');
  const torbultFreed = character.freedAllies.includes('cantora');
  const adolphaUnlocked = completedRequired >= 3;
  const canAdvance = adolphaFreed && sackbutFreed && torbultFreed && allRequiredDone;

  async function handleChallengeComplete(rating: Rating, score: number) {
    if (!activeChallenge) return;
    await awardChallenge(activeChallenge.id, activeChallenge.type, score, rating);
    setLastRating({ id: activeChallenge.id, rating });
    setActiveChallenge(null);
  }

  async function handleVictory(kind: BattleKind, _rp: number, spDelta: number) {
    if (spDelta !== 0) await addSummonPoints(spDelta);
    setActiveBattle(null);
    if (kind === 'skirmish') await awardChallenge('z7_outpost_skirmish', 'mini_boss', 100, 'superior');
    else setScene(kind);
  }

  async function finishScene() {
    if (!scene) return;
    const sc = SCENES[scene];
    if (sc.ally) await freeAlly(sc.ally);
    await awardChallenge(sc.key, 'zone_boss', 100, 'superior');
    setScene(null);
  }

  if (activeBattle) {
    const battleEnemies =
      activeBattle === 'skirmish' ? [ENEMIES.discordian_sentry, ENEMIES.discordian_sentry] :
      activeBattle === 'adolpha'  ? [ENEMIES.sound_shadow] :
      activeBattle === 'contra'   ? [ENEMIES.lieutenant_contra] :
      activeBattle === 'sackbut'  ? [ENEMIES.sliding_chaos_knight] :
                                    [ENEMIES.stone_colossus];
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
      <div className="relative bg-gradient-to-b from-slate-800/50 to-transparent px-4 pt-8 pb-6">
        <button onClick={() => navigate('/hub')} className="text-academy-cream/40 hover:text-academy-cream/80 text-sm mb-4 flex items-center gap-1 transition-colors">← Hub</button>
        <div className="text-academy-gold/60 text-xs tracking-[0.4em] uppercase font-fantasy mb-1">Zone 7 · Act II · Quarter 7</div>
        <h1 className="fantasy-title text-2xl text-academy-cream mb-2">Clef Cliffs</h1>
        <p className="text-academy-cream/60 text-sm leading-relaxed">
          Cold passes and sheer drops. Captain André's cliff militia holds the road — and points you
          up toward Player's Pass, and down toward a Discordian outpost that should not exist on this
          side of the world. Three of your professors are tangled up in it.
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

        <div className="card-panel mb-6 border-slate-700/40 bg-slate-900/20">
          <div className="text-xs text-academy-gold/60 uppercase tracking-widest font-fantasy mb-2">Story</div>
          <p className="text-academy-cream/70 text-sm leading-relaxed italic">
            Captain André meets the caravan at the tree line, trumpet slung across his back. "Four
            shards, four professors back on their feet — word travels." His face hardens. "But there's
            a thing dug in below that isn't one of ours and never was. It's holding two of your low
            brass like puppets. Free your sax up the pass first — then we deal with the outpost."
          </p>
        </div>

        {lastRating && (<div className="card-panel mb-4 text-center"><RatingBadge rating={lastRating.rating} /></div>)}

        <h2 className="fantasy-title text-sm text-academy-gold/70 uppercase tracking-widest mb-3">Required Challenges</h2>
        <div className="space-y-2 mb-8">{required.map((c) => (<ChallengeRow key={c.id} challenge={c} onStart={() => setActiveChallenge(c)} />))}</div>

        <h2 className="fantasy-title text-sm text-academy-gold/70 uppercase tracking-widest mb-3">Optional Challenges</h2>
        <div className="space-y-2 mb-8">{optional.map((c) => (<ChallengeRow key={c.id} challenge={c} onStart={() => setActiveChallenge(c)} />))}</div>

        {/* Player's Pass */}
        <h2 className="fantasy-title text-sm text-discord-crimson/70 uppercase tracking-widest mb-1">Player's Pass</h2>
        <p className="text-academy-cream/40 text-xs mb-3">The high road. Real combat — your HP is on the line.</p>

        <div className="card-panel mb-2 border-discord-crimson/20">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-academy-cream/80 text-sm font-semibold mb-1">⚙️ Discordian Sentry</div>
              <div className="text-academy-cream/50 text-xs">A made soldier posted on the cliff road — no player, only orders.</div>
            </div>
            {!skirmishDone ? (<button onClick={() => setActiveBattle('skirmish')} className="btn-secondary text-xs py-2 px-3 flex-shrink-0">Fight</button>) : (<span className="text-rating-superior text-lg flex-shrink-0">✓</span>)}
          </div>
        </div>

        <div className={`card-panel mb-2 ${adolphaUnlocked ? 'border-discord-crimson/40' : 'border-discord-crimson/15 opacity-60'}`}>
          <div className="text-xs text-discord-crimson uppercase tracking-widest font-fantasy mb-2">Corrupted Maestro</div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="text-academy-cream/80 text-sm font-semibold mb-1">🎷 The Sound Shadow</div>
              <div className="text-academy-cream/50 text-xs">
                At the summit — your saxophone professor, Maestra Adolpha, lost in a hall of borrowed faces.
                {!adolphaUnlocked && <span className="text-academy-gold/50"> (Complete 3 required challenges to track her)</span>}
              </div>
              {adolphaFreed && (<div className="text-rating-good text-xs mt-1.5 italic">Freed. Adolpha travels with you — and answers your summons.</div>)}
            </div>
            {adolphaUnlocked && !adolphaFreed && (<button onClick={() => setActiveBattle('adolpha')} className="btn-danger text-xs py-2 px-3 flex-shrink-0">Battle</button>)}
            {adolphaFreed && <span className="text-rating-superior text-lg flex-shrink-0">✓</span>}
          </div>
        </div>

        {/* The Discordian Outpost */}
        <h2 className="fantasy-title text-sm text-discord-crimson/70 uppercase tracking-widest mb-1 mt-6">The Discordian Outpost</h2>
        <p className="text-academy-cream/40 text-xs mb-3">Down the far side of the pass. The first of Vexus's lieutenants holds it.</p>

        <div className={`card-panel mb-2 ${adolphaFreed ? 'border-discord-crimson/40' : 'border-discord-crimson/15 opacity-60'}`}>
          <div className="text-xs text-discord-crimson uppercase tracking-widest font-fantasy mb-2">Lieutenant</div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="text-academy-cream/80 text-sm font-semibold mb-1">🪄 Lieutenant Contra</div>
              <div className="text-academy-cream/50 text-xs">
                A contrabass clarinet given command by Vexus's magic. It holds your two low-brass professors in its grip.
                {!adolphaFreed && <span className="text-academy-gold/50"> (Free Adolpha and descend the pass first)</span>}
              </div>
              {contraDefeated && (<div className="text-rating-good text-xs mt-1.5 italic">Broken. The outpost's hold is shattered.</div>)}
            </div>
            {adolphaFreed && !contraDefeated && (<button onClick={() => setActiveBattle('contra')} className="btn-danger text-xs py-2 px-3 flex-shrink-0">Battle</button>)}
            {contraDefeated && <span className="text-rating-superior text-lg flex-shrink-0">✓</span>}
          </div>
        </div>

        {/* Low brass — freed once Contra falls */}
        <div className={`card-panel mb-2 ${contraDefeated ? 'border-discord-crimson/40' : 'border-discord-crimson/15 opacity-60'}`}>
          <div className="text-xs text-discord-crimson uppercase tracking-widest font-fantasy mb-2">Corrupted Maestro</div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="text-academy-cream/80 text-sm font-semibold mb-1">📯 The Sliding Chaos Knight</div>
              <div className="text-academy-cream/50 text-xs">
                Your trombone professor, Maestro Sackbut — one wild glissando swung at the world.
                {!contraDefeated && <span className="text-academy-gold/50"> (Break Contra's hold first)</span>}
              </div>
              {sackbutFreed && (<div className="text-rating-good text-xs mt-1.5 italic">Freed. Sackbut answers your summons.</div>)}
            </div>
            {contraDefeated && !sackbutFreed && (<button onClick={() => setActiveBattle('sackbut')} className="btn-danger text-xs py-2 px-3 flex-shrink-0">Battle</button>)}
            {sackbutFreed && <span className="text-rating-superior text-lg flex-shrink-0">✓</span>}
          </div>
        </div>

        <div className={`card-panel mb-2 ${contraDefeated ? 'border-discord-crimson/40' : 'border-discord-crimson/15 opacity-60'}`}>
          <div className="text-xs text-discord-crimson uppercase tracking-widest font-fantasy mb-2">Corrupted Maestro</div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="text-academy-cream/80 text-sm font-semibold mb-1">🎵 The Stone Colossus</div>
              <div className="text-academy-cream/50 text-xs">
                Your euphonium professor, Maestro Torbult — an immovable low tone holding up nothing.
                {!contraDefeated && <span className="text-academy-gold/50"> (Break Contra's hold first)</span>}
              </div>
              {torbultFreed && (<div className="text-rating-good text-xs mt-1.5 italic">Freed. Torbult answers your summons.</div>)}
            </div>
            {contraDefeated && !torbultFreed && (<button onClick={() => setActiveBattle('euphonia')} className="btn-danger text-xs py-2 px-3 flex-shrink-0">Battle</button>)}
            {torbultFreed && <span className="text-rating-superior text-lg flex-shrink-0">✓</span>}
          </div>
        </div>

        {/* Advance */}
        {(adolphaFreed && sackbutFreed && torbultFreed) && (
          <div className={`card-panel mt-4 ${canAdvance ? 'border-academy-gold/50' : 'border-academy-gold/20'}`}>
            <div className="text-xs text-academy-gold uppercase tracking-widest font-fantasy mb-2">Quarter's End</div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="text-academy-cream/80 text-sm font-semibold mb-1">Down from the cliffs</div>
                <div className="text-academy-cream/50 text-xs">
                  Seven shards reclaimed — only the double reeds and the horn remain. The pull leads
                  down into the fog of the Forgotten Forest.
                  {!allRequiredDone && <span className="text-academy-gold/50"> (Finish your required challenges first)</span>}
                </div>
              </div>
              {canAdvance && (<button onClick={async () => { await advanceZone(8); navigate('/hub'); }} className="btn-primary text-xs py-2 px-3 flex-shrink-0">Set out →</button>)}
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
