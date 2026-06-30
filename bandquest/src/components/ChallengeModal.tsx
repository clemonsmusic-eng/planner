import { useState, useEffect, useRef, useCallback } from 'react';
import type { Character, Rating } from '../types/game';
import { pitchToleranceCents, rhythmToleranceMs } from '../lib/instruments';
import { useUiStore } from '../store/uiStore';
import MicrophoneListener from './MicrophoneListener';

interface Challenge {
  id: string;
  title: string;
  type: string;
  description: string;
  xpBase: number;
  beatCount?: number;  // battle performance: how many beats to perform
  bpm?: number;        // battle performance: tempo
}

interface ChallengeFlags {
  blind?: boolean;    // blurs the notation display
  manic?: boolean;    // scrolls the notation faster; pitch window already narrowed via pitchToleranceOverride
  confused?: boolean; // overlays wrong notes/rests in discordant colours
}

interface Props {
  challenge: Challenge;
  character: Character;
  onComplete: (rating: Rating, score: number) => void;
  onClose: () => void;
  pitchToleranceOverride?: number;  // override from battle debuffs
  challengeFlags?: ChallengeFlags;
}

export default function ChallengeModal({ challenge, character, onComplete, onClose, pitchToleranceOverride, challengeFlags }: Props) {
  const [phase, setPhase] = useState<'intro' | 'challenge' | 'result'>('intro');
  const [rating, setRating] = useState<Rating | null>(null);
  const [score, setScore] = useState(0);

  function handleRating(r: Rating, s: number) {
    setRating(r);
    setScore(s);
    setPhase('result');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={phase === 'intro' ? onClose : undefined} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg bg-academy-dark border border-academy-gold/30 rounded-t-2xl sm:rounded-2xl p-6 mx-0 sm:mx-4 max-h-[90vh] overflow-y-auto">
        {phase === 'intro' && (
          <IntroPhase challenge={challenge} onStart={() => setPhase('challenge')} onClose={onClose} />
        )}
        {phase === 'challenge' && (
          <ActiveChallenge
            challenge={challenge}
            character={character}
            onRating={handleRating}
            onClose={onClose}
            pitchToleranceOverride={pitchToleranceOverride}
            challengeFlags={challengeFlags}
          />
        )}
        {phase === 'result' && rating && (
          <ResultPhase
            challenge={challenge}
            rating={rating}
            score={score}
            character={character}
            onContinue={() => onComplete(rating, score)}
          />
        )}
      </div>
    </div>
  );
}

function IntroPhase({ challenge, onStart, onClose }: {
  challenge: Challenge;
  onStart: () => void;
  onClose: () => void;
}) {
  const typeLabel: Record<string, string> = {
    technique_scale: 'Scale / Technique Challenge',
    prepared_performance: 'Prepared Performance',
    rhythm_performance: 'Rhythm Challenge',
    aural_pitch_spy: 'Aural: Pitch Spy',
    aural_rhythm_echo: 'Aural: Rhythm Echo',
    aural_melody_mapper: 'Aural: Melody Mapper',
    aural_interval_quest: 'Aural: Interval Quest',
    aural_chord_oracle: 'Aural: Chord Oracle',
  };

  return (
    <>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-academy-gold/60 text-xs uppercase tracking-widest font-fantasy mb-1">
            {typeLabel[challenge.type] ?? 'Challenge'}
          </div>
          <h2 className="fantasy-title text-xl">{challenge.title}</h2>
        </div>
        <button onClick={onClose} className="text-academy-cream/40 hover:text-academy-cream/80 text-xl ml-4 flex-shrink-0">
          ✕
        </button>
      </div>

      <p className="text-academy-cream/70 text-sm leading-relaxed mb-6">
        {challenge.description}
      </p>

      {challenge.beatCount ? (
        <div className="bg-black/30 border border-academy-gold/20 rounded-lg p-4 mb-6">
          <div className="text-academy-gold/60 text-xs uppercase tracking-widest font-fantasy mb-2">Performance</div>
          <div className="flex items-baseline gap-2">
            <span className="font-fantasy text-academy-gold text-xl">{challenge.beatCount}</span>
            <span className="text-academy-cream/60 text-sm">beats</span>
            <span className="text-academy-cream/30 text-xs ml-1">♩= {challenge.bpm ?? 72}</span>
            <span className="text-academy-cream/30 text-xs ml-auto">
              ~{Math.round(((challenge.beatCount ?? 8) / (challenge.bpm ?? 72)) * 60)}s
            </span>
          </div>
          <p className="text-academy-cream/40 text-xs mt-2">
            Play your best for the full phrase. Rating is based on pitch accuracy.
          </p>
        </div>
      ) : (
        <div className="bg-black/30 border border-academy-gold/20 rounded-lg p-4 mb-6">
          <div className="text-academy-gold/60 text-xs uppercase tracking-widest font-fantasy mb-2">Rating Scale</div>
          <div className="space-y-1 text-xs text-academy-cream/60">
            <div><span className="text-rating-superior font-fantasy">SUPERIOR</span> — 100% XP</div>
            <div><span className="text-rating-excellent font-fantasy">EXCELLENT</span> — 80% XP</div>
            <div><span className="text-rating-good font-fantasy">GOOD</span> — 60% XP</div>
            <div><span className="text-rating-fair font-fantasy">FAIR</span> — 30% XP</div>
            <div><span className="text-rating-poor font-fantasy">POOR</span> — 10% XP</div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onClose} className="btn-secondary flex-1">
          Cancel
        </button>
        <button onClick={onStart} className="btn-primary flex-1">
          Begin
        </button>
      </div>
    </>
  );
}

function ActiveChallenge({ challenge, character, onRating, onClose, pitchToleranceOverride, challengeFlags }: {
  challenge: Challenge;
  character: Character;
  onRating: (rating: Rating, score: number) => void;
  onClose: () => void;
  pitchToleranceOverride?: number;
  challengeFlags?: ChallengeFlags;
}) {
  const demoMode = useUiStore((s) => s.demoMode);
  const pitchTolerance = pitchToleranceOverride ?? pitchToleranceCents(character.stats.accuracy);
  const rhythmTolerance = rhythmToleranceMs(character.stats.technique);

  // Route to appropriate challenge UI
  if (challenge.type === 'aural_pitch_spy') {
    return <PitchSpyChallenge onRating={onRating} />;
  }
  if (challenge.type === 'aural_rhythm_echo') {
    return <RhythmEchoChallenge onRating={onRating} />;
  }
  if (challenge.type === 'aural_melody_mapper') {
    return <MelodyMapperChallenge onRating={onRating} />;
  }
  if (challenge.type === 'aural_interval_quest') {
    return <IntervalQuestChallenge onRating={onRating} />;
  }
  if (challenge.type === 'aural_chord_oracle') {
    return <ChordOracleChallenge onRating={onRating} />;
  }
  if (challenge.type === 'rhythm_performance') {
    return <RhythmTapChallenge onRating={onRating} tolerance={rhythmTolerance} />;
  }
  // Demo Mode: replace the microphone performance with a silent tap-timing
  // mini-game, so the game is fully playable without any audible input.
  if (demoMode) {
    return <DemoPerformanceChallenge onRating={onRating} />;
  }
  // Default: microphone-based performance challenge
  return (
    <PerformanceChallenge
      challenge={challenge}
      onRating={onRating}
      onClose={onClose}
      pitchTolerance={pitchTolerance}
      beatCount={challenge.beatCount}
      bpm={challenge.bpm}
      challengeFlags={challengeFlags}
    />
  );
}

// ── Performance Challenge (microphone) ──────────────────────────────────────

function PerformanceChallenge({
  challenge, onRating, onClose, pitchTolerance,
  beatCount = 8, bpm = 72, challengeFlags,
}: {
  challenge: Challenge;
  onRating: (r: Rating, s: number) => void;
  onClose: () => void;
  pitchTolerance: number;
  beatCount?: number;
  bpm?: number;
  challengeFlags?: ChallengeFlags;
}) {
  const isBlind    = challengeFlags?.blind    ?? false;
  const isManic    = challengeFlags?.manic    ?? false;
  const isConfused = challengeFlags?.confused ?? false;
  const beatMs = (60 / bpm) * 1000;
  const bars = Math.ceil(beatCount / 4);
  const durationSecs = Math.round((beatMs * beatCount) / 1000);
  const showDots = beatCount <= 16;

  const [firedBeats, setFiredBeats] = useState(0);
  const [beatPulse, setBeatPulse] = useState(false);
  const [pitchScores, setPitchScores] = useState<number[]>([]);
  const [listening, setListening] = useState(false);
  const [done, setDone] = useState(false);
  const pitchScoresRef = useRef<number[]>([]);
  const beatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!listening || done) return;

    let beat = 0;
    beatIntervalRef.current = setInterval(() => {
      beat++;
      setFiredBeats(beat);
      setBeatPulse(true);
      setTimeout(() => setBeatPulse(false), Math.min(120, beatMs * 0.25));
      if (beat >= beatCount) {
        clearInterval(beatIntervalRef.current!);
        finalize(pitchScoresRef.current);
      }
    }, beatMs);

    return () => { if (beatIntervalRef.current) clearInterval(beatIntervalRef.current); };
  }, [listening]);

  function handlePitch(_freq: number, cents: number, _note: string) {
    if (done) return;
    const accuracy = Math.max(0, 100 - (Math.abs(cents) / pitchTolerance) * 100);
    pitchScoresRef.current = [...pitchScoresRef.current, accuracy];
    setPitchScores((prev) => [...prev, accuracy]);
  }

  function finalize(scores: number[] = pitchScoresRef.current) {
    if (done) return;
    setDone(true);
    if (beatIntervalRef.current) clearInterval(beatIntervalRef.current);
    if (scores.length === 0) { onRating('poor', 0); return; }
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    // Floor at 25 when sound was detected — reserve 0 for a true miss (no sound).
    const score = Math.max(25, Math.round(avg));
    onRating(scoreToRating(score), score);
  }

  const avgScore = pitchScores.length > 0
    ? pitchScores.reduce((a, b) => a + b, 0) / pitchScores.length
    : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="fantasy-title text-lg">{challenge.title}</h3>
        <button onClick={onClose} className="text-academy-cream/40 hover:text-academy-cream/80">✕</button>
      </div>

      {/* Notation display — visual difficulty effects from battle statuses */}
      <div className="notation-display min-h-20 flex items-center justify-center mb-3 relative overflow-hidden">
        {/* Real notation content — blurred when blind, scrolling when manic */}
        <div
          className="text-center text-academy-cream/40"
          style={{
            filter: isBlind ? 'blur(2.5px)' : undefined,
            animation: isManic ? 'notation-scroll 1.4s linear infinite alternate' : undefined,
          }}
        >
          <div className="text-4xl mb-1">𝄞</div>
          <p className="text-xs">{bars} {bars === 1 ? 'bar' : 'bars'} · ♩= {bpm} · ~{durationSecs}s</p>
        </div>
        {/* Confusion — wrong notes / rests overlaid in discordant colours */}
        {isConfused && (
          <div className="absolute inset-0 pointer-events-none select-none" aria-hidden>
            <span className="absolute text-fuchsia-400/70 text-2xl" style={{ top: '18%', left: '10%' }}>♩</span>
            <span className="absolute text-red-400/60 text-xl"     style={{ top: '55%', right: '14%' }}>𝄽</span>
            <span className="absolute text-fuchsia-300/55 text-3xl" style={{ top: '28%', right: '22%' }}>♪</span>
            <span className="absolute text-orange-400/50 text-lg"   style={{ bottom: '18%', left: '28%' }}>♫</span>
            <span className="absolute text-red-500/45 text-2xl"    style={{ top: '12%', right: '8%' }}>𝄾</span>
          </div>
        )}
      </div>
      {/* Status effect notices below the notation */}
      {(isBlind || isManic || isConfused) && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {isBlind    && <span className="text-[9px] font-fantasy px-1.5 py-0.5 rounded text-rating-fair bg-rating-fair/10">🌫️ BLIND — notation blurred</span>}
          {isManic    && <span className="text-[9px] font-fantasy px-1.5 py-0.5 rounded text-orange-400 bg-orange-400/10">🔥 MANIC — notation scrolling · pitch window narrowed</span>}
          {isConfused && <span className="text-[9px] font-fantasy px-1.5 py-0.5 rounded text-fuchsia-300 bg-fuchsia-300/10">💫 CONFUSED — wrong notes overlaid</span>}
        </div>
      )}

      {!listening ? (
        <button onClick={() => setListening(true)} className="btn-primary w-full">
          Start Performance
        </button>
      ) : (
        <div>
          {/* Beat display */}
          {showDots ? (
            <div className="flex flex-wrap gap-2 justify-center mb-4 px-2">
              {Array.from({ length: beatCount }, (_, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-full transition-all duration-75"
                  style={{
                    background: i + 1 === firedBeats && beatPulse
                      ? '#FFD700'
                      : i < firedBeats
                      ? 'rgba(255,215,0,0.55)'
                      : 'rgba(255,255,255,0.12)',
                    transform: i + 1 === firedBeats && beatPulse ? 'scale(1.35)' : 'scale(1)',
                    boxShadow: i + 1 === firedBeats && beatPulse ? '0 0 8px #FFD700' : 'none',
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-academy-cream/50 font-fantasy">
                  Beat {Math.min(firedBeats + 1, beatCount)} / {beatCount}
                </span>
                <div
                  className="w-3 h-3 rounded-full transition-all duration-75"
                  style={{
                    background: beatPulse ? '#FFD700' : 'rgba(255,255,255,0.15)',
                    transform: beatPulse ? 'scale(1.4)' : 'scale(1)',
                    boxShadow: beatPulse ? '0 0 6px #FFD700' : 'none',
                  }}
                />
              </div>
              <div className="stat-bar">
                <div
                  className="stat-bar-fill transition-all duration-100"
                  style={{ width: `${(firedBeats / beatCount) * 100}%`, backgroundColor: '#FFD700' }}
                />
              </div>
            </div>
          )}

          {/* Score + mic */}
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-academy-cream/50">
              Score: <span className="text-academy-gold font-fantasy">{Math.round(avgScore)}%</span>
            </span>
            <span className="text-academy-cream/30 text-xs">{pitchScores.length} samples</span>
          </div>

          <MicrophoneListener
            mode="pitch"
            onPitchDetected={handlePitch}
            active={listening && !done}
          />

          <button onClick={() => finalize()} className="btn-secondary w-full mt-3">
            Submit Early
          </button>
        </div>
      )}
    </div>
  );
}

// ── Pitch Spy Challenge ───────────────────────────────────────────────────────

const PITCH_SPY_NOTES = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'Bb4', 'B4', 'C5'];

function PitchSpyChallenge({ onRating }: { onRating: (r: Rating, s: number) => void }) {
  const targetIndex = useRef(Math.floor(Math.random() * PITCH_SPY_NOTES.length));
  const target = PITCH_SPY_NOTES[targetIndex.current];
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  // Build 4 options including the target
  const options = buildOptions(target, PITCH_SPY_NOTES, 4);

  function pick(note: string) {
    if (answered) return;
    setSelected(note);
    setAnswered(true);
    const correct = note === target;
    setTimeout(() => onRating(correct ? 'superior' : 'poor', correct ? 100 : 0), 1200);
  }

  return (
    <div className="text-center">
      <h3 className="fantasy-title text-lg mb-2">Pitch Spy</h3>
      <p className="text-academy-cream/60 text-sm mb-4">
        Listen to the note, then identify it.
      </p>
      <div className="bg-black/30 rounded-lg p-6 mb-6 flex items-center justify-center gap-3">
        <button
          className="text-4xl hover:scale-110 transition-transform"
          onClick={() => playTone(noteToFreq(target))}
        >
          🔊
        </button>
        <span className="text-academy-cream/40 text-sm">Click to play</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {options.map((note) => (
          <button
            key={note}
            onClick={() => pick(note)}
            disabled={answered}
            className={`py-3 px-4 rounded-lg border font-fantasy transition-all
              ${!answered ? 'border-academy-gold/30 hover:border-academy-gold text-academy-cream/80 hover:text-academy-gold' :
                note === target ? 'border-rating-superior bg-rating-superior/20 text-rating-superior' :
                note === selected ? 'border-rating-poor bg-rating-poor/20 text-rating-poor' :
                'border-academy-gold/20 text-academy-cream/30 opacity-50'
              }`}
          >
            {note}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Rhythm Echo Challenge ──────────────────────────────────────────────────────

const RHYTHM_PATTERNS = [
  { label: '♩ ♩ ♩ ♩', beats: [0, 1, 2, 3] },
  { label: '♩ ♩ ♩♩ ♩', beats: [0, 1, 2, 2.5, 3] },
  { label: '𝅗𝅥 ♩ ♩', beats: [0, 2, 3] },
];

function RhythmEchoChallenge({ onRating }: { onRating: (r: Rating, s: number) => void }) {
  const patternIndex = useRef(Math.floor(Math.random() * RHYTHM_PATTERNS.length));
  const pattern = RHYTHM_PATTERNS[patternIndex.current];
  const [phase, setPhase] = useState<'listen' | 'tap' | 'done'>('listen');
  const [taps, setTaps] = useState<number[]>([]);
  const tapsRef = useRef<number[]>([]); // ref so setTimeout closure reads current taps
  const startTime = useRef<number>(0);
  const BPM = 80;
  const beatMs = (60 / BPM) * 1000;

  function startTapping() {
    tapsRef.current = [];
    setTaps([]);
    setPhase('tap');
    startTime.current = Date.now();
    setTimeout(() => {
      setPhase('done');
      scoreTaps(tapsRef.current, pattern.beats, beatMs, onRating);
    }, beatMs * 5);
  }

  function tap() {
    if (phase !== 'tap') return;
    const t = (Date.now() - startTime.current) / beatMs;
    tapsRef.current = [...tapsRef.current, t];
    setTaps((prev) => [...prev, t]);
  }

  return (
    <div className="text-center">
      <h3 className="fantasy-title text-lg mb-2">Rhythm Echo</h3>
      <p className="text-academy-cream/60 text-sm mb-4">
        Listen to the rhythm, then tap it back.
      </p>
      <div className="bg-black/30 rounded-lg p-6 mb-6">
        <div className="text-2xl mb-3 tracking-widest">{pattern.label}</div>
        <button
          className="text-3xl hover:scale-110 transition-transform"
          onClick={() => playRhythm(pattern.beats, beatMs)}
        >
          🔊
        </button>
      </div>
      {phase === 'listen' && (
        <button onClick={startTapping} className="btn-primary w-full">
          Tap It Back
        </button>
      )}
      {phase === 'tap' && (
        <button
          onPointerDown={tap}
          className="btn-primary w-full h-20 text-xl active:scale-95 transition-transform"
        >
          TAP
          <div className="text-sm mt-1 opacity-60">{taps.length} taps</div>
        </button>
      )}
      {phase === 'done' && (
        <div className="text-rating-good font-fantasy animate-pulse">Analyzing…</div>
      )}
    </div>
  );
}

// ── Rhythm Tap Challenge ───────────────────────────────────────────────────────

function RhythmTapChallenge({ onRating, tolerance: _tolerance }: {
  onRating: (r: Rating, s: number) => void;
  tolerance: number;
}) {
  const [phase, setPhase] = useState<'intro' | 'tapping' | 'done'>('intro');
  const [taps, setTaps] = useState<number[]>([]);
  const startTime = useRef<number>(0);
  const BPM = 80;
  const beatMs = (60 / BPM) * 1000;
  const targetBeats = [0, 1, 2, 3, 4, 5, 6, 7]; // 2 bars of quarter notes

  useEffect(() => {
    if (phase === 'tapping') {
      const timeout = setTimeout(() => {
        setPhase('done');
        scoreTaps(taps, targetBeats, beatMs, onRating);
      }, beatMs * (targetBeats[targetBeats.length - 1] + 1.5));
      return () => clearTimeout(timeout);
    }
  }, [phase]);

  function tap() {
    if (phase !== 'tapping') return;
    setTaps((prev) => [...prev, (Date.now() - startTime.current) / beatMs]);
  }

  return (
    <div className="text-center">
      <h3 className="fantasy-title text-lg mb-2">Rhythm Performance</h3>
      <p className="text-academy-cream/60 text-sm mb-4">
        Tap 8 steady quarter notes in 4/4 time. BPM: {BPM}
      </p>
      {phase === 'intro' && (
        <button
          onClick={() => { setPhase('tapping'); startTime.current = Date.now(); }}
          className="btn-primary w-full"
        >
          Start
        </button>
      )}
      {phase === 'tapping' && (
        <button
          onPointerDown={tap}
          className="btn-primary w-full h-24 text-2xl active:scale-95 transition-transform"
        >
          TAP
          <div className="text-sm mt-1 opacity-60">{taps.length} / {targetBeats.length}</div>
        </button>
      )}
      {phase === 'done' && (
        <div className="text-rating-good font-fantasy animate-pulse">Scoring…</div>
      )}
    </div>
  );
}

// ── Melody Mapper Challenge ───────────────────────────────────────────────────

const MELODIES = [
  { label: 'C  D  E  C',  notes: ['C4','D4','E4','C4']  },
  { label: 'C  E  G  E',  notes: ['C4','E4','G4','E4']  },
  { label: 'G  F  E  D',  notes: ['G4','F4','E4','D4']  },
  { label: 'C  D  E  F',  notes: ['C4','D4','E4','F4']  },
  { label: 'E  D  C  G',  notes: ['E4','D4','C4','G4']  },
  { label: 'G  E  D  C',  notes: ['G4','E4','D4','C4']  },
];

function MelodyMapperChallenge({ onRating }: { onRating: (r: Rating, s: number) => void }) {
  const idx = useRef(Math.floor(Math.random() * MELODIES.length));
  const target = MELODIES[idx.current];
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  const options = buildChoices(target.label, MELODIES.map((m) => m.label), 4);

  function playMelody() {
    const ctx = new AudioContext();
    target.notes.forEach((note, i) => {
      playToneAt(ctx, noteToFreq(note), ctx.currentTime + i * 0.42, 0.38);
    });
  }

  function pick(label: string) {
    if (answered) return;
    setSelected(label);
    setAnswered(true);
    const correct = label === target.label;
    setTimeout(() => onRating(correct ? 'superior' : 'poor', correct ? 100 : 0), 1200);
  }

  return (
    <div className="text-center">
      <h3 className="fantasy-title text-lg mb-2">Melody Mapper</h3>
      <p className="text-academy-cream/60 text-sm mb-4">
        Listen to the melody and identify the correct note sequence.
      </p>
      <div className="bg-black/30 rounded-lg p-6 mb-6 flex items-center justify-center gap-3">
        <button className="text-4xl hover:scale-110 transition-transform" onClick={playMelody}>🔊</button>
        <span className="text-academy-cream/40 text-sm">Click to play</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {options.map((label) => (
          <button
            key={label}
            onClick={() => pick(label)}
            disabled={answered}
            className={`py-3 px-3 rounded-lg border font-fantasy text-sm transition-all
              ${!answered ? 'border-academy-gold/30 hover:border-academy-gold text-academy-cream/80' :
                label === target.label ? 'border-rating-superior bg-rating-superior/20 text-rating-superior' :
                label === selected ? 'border-rating-poor bg-rating-poor/20 text-rating-poor' :
                'border-academy-gold/20 text-academy-cream/30 opacity-50'}`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Interval Quest Challenge ───────────────────────────────────────────────────

const INTERVALS = [
  { name: 'Unison',      semitones: 0  },
  { name: 'Minor 2nd',   semitones: 1  },
  { name: 'Major 2nd',   semitones: 2  },
  { name: 'Minor 3rd',   semitones: 3  },
  { name: 'Major 3rd',   semitones: 4  },
  { name: 'Perfect 4th', semitones: 5  },
  { name: 'Tritone',     semitones: 6  },
  { name: 'Perfect 5th', semitones: 7  },
  { name: 'Minor 6th',   semitones: 8  },
  { name: 'Major 6th',   semitones: 9  },
  { name: 'Minor 7th',   semitones: 10 },
  { name: 'Major 7th',   semitones: 11 },
  { name: 'Octave',      semitones: 12 },
];

const INTERVAL_ROOTS = [261.63, 293.66, 329.63, 349.23, 392.0]; // C4 D4 E4 F4 G4

function IntervalQuestChallenge({ onRating }: { onRating: (r: Rating, s: number) => void }) {
  const targetInterval = useRef(INTERVALS[Math.floor(Math.random() * INTERVALS.length)]);
  const rootFreq = useRef(INTERVAL_ROOTS[Math.floor(Math.random() * INTERVAL_ROOTS.length)]);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  const options = buildChoices(targetInterval.current.name, INTERVALS.map((i) => i.name), 4);

  function playInterval() {
    const ctx = new AudioContext();
    const upper = transposeFreq(rootFreq.current, targetInterval.current.semitones);
    playToneAt(ctx, rootFreq.current, ctx.currentTime, 0.55);
    playToneAt(ctx, upper, ctx.currentTime + 0.65, 0.55);
  }

  function pick(name: string) {
    if (answered) return;
    setSelected(name);
    setAnswered(true);
    const correct = name === targetInterval.current.name;
    setTimeout(() => onRating(correct ? 'superior' : 'poor', correct ? 100 : 0), 1200);
  }

  return (
    <div className="text-center">
      <h3 className="fantasy-title text-lg mb-2">Interval Quest</h3>
      <p className="text-academy-cream/60 text-sm mb-4">
        Listen to two notes played in sequence. Name the interval.
      </p>
      <div className="bg-black/30 rounded-lg p-6 mb-6 flex items-center justify-center gap-3">
        <button className="text-4xl hover:scale-110 transition-transform" onClick={playInterval}>🔊</button>
        <span className="text-academy-cream/40 text-sm">Click to play</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {options.map((name) => (
          <button
            key={name}
            onClick={() => pick(name)}
            disabled={answered}
            className={`py-3 px-3 rounded-lg border font-fantasy text-sm transition-all
              ${!answered ? 'border-academy-gold/30 hover:border-academy-gold text-academy-cream/80' :
                name === targetInterval.current.name ? 'border-rating-superior bg-rating-superior/20 text-rating-superior' :
                name === selected ? 'border-rating-poor bg-rating-poor/20 text-rating-poor' :
                'border-academy-gold/20 text-academy-cream/30 opacity-50'}`}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Chord Oracle Challenge ─────────────────────────────────────────────────────

const CHORD_QUALITIES = [
  { name: 'Major',          semitones: [0, 4, 7]     },
  { name: 'Minor',          semitones: [0, 3, 7]     },
  { name: 'Dominant 7th',   semitones: [0, 4, 7, 10] },
  { name: 'Diminished',     semitones: [0, 3, 6]     },
];

function ChordOracleChallenge({ onRating }: { onRating: (r: Rating, s: number) => void }) {
  const targetQuality = useRef(CHORD_QUALITIES[Math.floor(Math.random() * CHORD_QUALITIES.length)]);
  const rootFreq = useRef(INTERVAL_ROOTS[Math.floor(Math.random() * INTERVAL_ROOTS.length)]);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  const options = buildChoices(targetQuality.current.name, CHORD_QUALITIES.map((q) => q.name), 4);

  function playChord() {
    const ctx = new AudioContext();
    targetQuality.current.semitones.forEach((st) => {
      playToneAt(ctx, transposeFreq(rootFreq.current, st), ctx.currentTime, 1.2);
    });
  }

  function pick(name: string) {
    if (answered) return;
    setSelected(name);
    setAnswered(true);
    const correct = name === targetQuality.current.name;
    setTimeout(() => onRating(correct ? 'superior' : 'poor', correct ? 100 : 0), 1200);
  }

  return (
    <div className="text-center">
      <h3 className="fantasy-title text-lg mb-2">Chord Oracle</h3>
      <p className="text-academy-cream/60 text-sm mb-4">
        Listen to the chord and identify its quality.
      </p>
      <div className="bg-black/30 rounded-lg p-6 mb-6 flex items-center justify-center gap-3">
        <button className="text-4xl hover:scale-110 transition-transform" onClick={playChord}>🔊</button>
        <span className="text-academy-cream/40 text-sm">Click to play</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {options.map((name) => (
          <button
            key={name}
            onClick={() => pick(name)}
            disabled={answered}
            className={`py-3 px-3 rounded-lg border font-fantasy text-sm transition-all
              ${!answered ? 'border-academy-gold/30 hover:border-academy-gold text-academy-cream/80' :
                name === targetQuality.current.name ? 'border-rating-superior bg-rating-superior/20 text-rating-superior' :
                name === selected ? 'border-rating-poor bg-rating-poor/20 text-rating-poor' :
                'border-academy-gold/20 text-academy-cream/30 opacity-50'}`}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Result Phase ─────────────────────────────────────────────────────────────

function ResultPhase({ challenge, rating, score, character, onContinue }: {
  challenge: Challenge;
  rating: Rating;
  score: number;
  character: Character;
  onContinue: () => void;
}) {
  const config: Record<Rating, { label: string; color: string; message: string }> = {
    superior: { label: 'SUPERIOR', color: '#FFD700', message: 'Flawless. The Composer himself would approve.' },
    excellent: { label: 'EXCELLENT', color: '#4ADE80', message: 'Outstanding performance. Keep pushing.' },
    good: { label: 'GOOD', color: '#60A5FA', message: 'Solid work. The Academy is proud.' },
    fair: { label: 'FAIR', color: '#FB923C', message: 'Acceptable. More practice will sharpen this.' },
    poor: { label: 'POOR', color: '#F87171', message: 'Keep trying. Every attempt builds strength.' },
  };

  const { label, color, message } = config[rating];
  const xpMultipliers = { superior: 1.0, excellent: 0.8, good: 0.6, fair: 0.3, poor: 0.1 };
  const xpAwarded = Math.round(challenge.xpBase * xpMultipliers[rating]);

  return (
    <div className="text-center">
      <div
        className="font-fantasy text-5xl font-black tracking-widest mb-2 py-4"
        style={{ color, textShadow: `0 0 30px ${color}60` }}
      >
        {label}
      </div>
      <p className="text-academy-cream/60 text-sm italic mb-6">{message}</p>
      <div className="flex items-center justify-center gap-6 mb-6">
        <div className="text-center">
          <div className="text-academy-cream/40 text-xs mb-1">Score</div>
          <div className="font-fantasy text-xl" style={{ color }}>{score}%</div>
        </div>
        <div className="text-center">
          <div className="text-academy-cream/40 text-xs mb-1">XP</div>
          <div className="font-fantasy text-xl text-academy-gold">+{xpAwarded}</div>
        </div>
        <div className="text-center">
          <div className="text-academy-cream/40 text-xs mb-1">Level</div>
          <div className="font-fantasy text-xl text-academy-gold">{character.level}</div>
        </div>
      </div>
      <button onClick={onContinue} className="btn-primary w-full">
        Continue
      </button>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function transposeFreq(freq: number, semitones: number): number {
  return freq * Math.pow(2, semitones / 12);
}

function playToneAt(ctx: AudioContext, freq: number, startTime: number, duration: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = freq;
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.28, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

function buildChoices(target: string, pool: string[], count: number): string[] {
  const choices = [target];
  const others = pool.filter((p) => p !== target).sort(() => Math.random() - 0.5);
  while (choices.length < count && others.length > 0) {
    choices.push(others.pop()!);
  }
  return choices.sort(() => Math.random() - 0.5);
}

// Silent tap-timing mini-game used in Demo Mode in place of the microphone
// performance. A marker sweeps a track; tap (Space / click) when it crosses the
// target zone. Five taps; average timing accuracy → rating. No audio in or out.
function DemoPerformanceChallenge({ onRating }: { onRating: (rating: Rating, score: number) => void }) {
  const NEEDED = 5;
  const TARGET = 50;
  const markerRef = useRef<HTMLDivElement | null>(null);
  const posRef = useRef(0);
  const dirRef = useRef(1);
  const doneRef = useRef(false);
  const tapsRef = useRef<number[]>([]);
  const [count, setCount] = useState(0);
  const [flash, setFlash] = useState<{ label: string; color: string } | null>(null);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const SPEED = 95; // % of track per second (one sweep ≈ 1.05s)
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      let p = posRef.current + dirRef.current * SPEED * dt;
      if (p >= 100) { p = 100; dirRef.current = -1; }
      else if (p <= 0) { p = 0; dirRef.current = 1; }
      posRef.current = p;
      if (markerRef.current) markerRef.current.style.left = `${p}%`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const tap = useCallback(() => {
    if (doneRef.current) return;
    const err = Math.abs(posRef.current - TARGET);
    const acc = Math.max(0, Math.round(100 - err * 2.2));
    tapsRef.current.push(acc);
    const n = tapsRef.current.length;
    setCount(n);
    setFlash(
      acc >= 85 ? { label: 'PERFECT', color: '#FFD700' }
      : acc >= 60 ? { label: 'GREAT', color: '#4ADE80' }
      : acc >= 35 ? { label: 'OK', color: '#60A5FA' }
      : { label: 'MISS', color: '#F87171' },
    );
    if (n >= NEEDED) {
      doneRef.current = true;
      const avg = Math.round(tapsRef.current.reduce((a, b) => a + b, 0) / n);
      setTimeout(() => onRating(scoreToRating(avg), avg), 500);
    }
  }, [onRating]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); tap(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tap]);

  return (
    <div className="text-center">
      <div className="text-academy-gold/60 text-xs uppercase tracking-widest font-fantasy mb-1">Demo Mode · No Microphone</div>
      <h3 className="fantasy-title text-lg mb-1">Tap in Time</h3>
      <p className="text-academy-cream/50 text-xs mb-6">
        Press <span className="text-academy-cream/80 font-fantasy">Space</span> or tap the button when the
        marker crosses the gold zone. Five times.
      </p>

      {/* Track */}
      <div className="relative h-12 mx-2 mb-6 rounded-lg bg-black/40 border border-academy-gold/20 overflow-hidden">
        {/* target zone */}
        <div className="absolute top-0 bottom-0" style={{ left: 'calc(50% - 9%)', width: '18%', background: 'rgba(212,160,23,0.18)', borderLeft: '1px solid rgba(212,160,23,0.5)', borderRight: '1px solid rgba(212,160,23,0.5)' }} />
        {/* center line */}
        <div className="absolute top-0 bottom-0" style={{ left: '50%', width: 2, background: 'rgba(212,160,23,0.7)' }} />
        {/* marker */}
        <div ref={markerRef} className="absolute top-1 bottom-1" style={{ left: '0%', width: 4, marginLeft: -2, background: '#FCA5A5', borderRadius: 2, boxShadow: '0 0 8px #FCA5A5' }} />
      </div>

      {/* flash + progress */}
      <div className="h-6 mb-3 font-fantasy tracking-widest text-sm" style={{ color: flash?.color ?? 'transparent' }}>
        {flash?.label ?? '·'}
      </div>
      <div className="flex items-center justify-center gap-2 mb-6">
        {Array.from({ length: NEEDED }).map((_, i) => (
          <span key={i} className={`h-2 w-2 rounded-full ${i < count ? 'bg-academy-gold' : 'bg-academy-cream/20'}`} />
        ))}
      </div>

      <button onClick={tap} className="btn-primary w-full text-lg py-4">TAP</button>
    </div>
  );
}

function scoreToRating(score: number): Rating {
  if (score >= 90) return 'superior';
  if (score >= 75) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}

function buildOptions(target: string, pool: string[], count: number): string[] {
  const opts = [target];
  const others = pool.filter((n) => n !== target);
  while (opts.length < count && others.length > 0) {
    const i = Math.floor(Math.random() * others.length);
    opts.push(others.splice(i, 1)[0]);
  }
  return opts.sort(() => Math.random() - 0.5);
}

const NOTE_FREQ: Record<string, number> = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0,
  A4: 440.0, Bb4: 466.16, B4: 493.88, C5: 523.25,
};

function noteToFreq(note: string): number {
  return NOTE_FREQ[note] ?? 440;
}

function playTone(freq: number) {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = freq;
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
  osc.start();
  osc.stop(ctx.currentTime + 1);
}

function playRhythm(beats: number[], beatMs: number) {
  const ctx = new AudioContext();
  beats.forEach((beat) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'square';
    const t = ctx.currentTime + (beat * beatMs) / 1000;
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.start(t);
    osc.stop(t + 0.1);
  });
}

function scoreTaps(
  taps: number[],
  targets: number[],
  _beatMs: number,
  onRating: (r: Rating, s: number) => void,
) {
  if (taps.length === 0) { onRating('poor', 0); return; }

  let totalScore = 0;
  const matched = new Set<number>();

  for (const target of targets) {
    let best = Infinity;
    let bestTap = -1;
    for (let i = 0; i < taps.length; i++) {
      if (matched.has(i)) continue;
      const diff = Math.abs(taps[i] - target);
      if (diff < best) { best = diff; bestTap = i; }
    }
    if (bestTap >= 0) {
      matched.add(bestTap);
      // best is in beat units; convert to score (0.5 beat tolerance = 0% score)
      totalScore += Math.max(0, 100 - best * 200);
    }
  }

  const avg = totalScore / targets.length;
  onRating(scoreToRating(avg), Math.round(avg));
}
