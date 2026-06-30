import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../store/gameStore';
import { INSTRUMENTS } from '../lib/instruments';
import MicrophoneListener from '../components/MicrophoneListener';

type StepId = 'posture' | 'assembly' | 'hold' | 'first_sound' | 'first_song';

interface Step {
  id: StepId;
  title: string;
  icon: string;
  description: string;
  instruction: string;
  challengeType: 'teacher_confirm' | 'microphone_any' | 'microphone_pitch';
  requiresTeacher: boolean;
}

const STEPS: Step[] = [
  {
    id: 'posture',
    title: 'Posture & Position',
    icon: '🪑',
    description: 'Before you play, you must be physically ready. Maestro Barenboimi teaches you proper stance and chair position.',
    instruction: 'Sit with your back straight, feet flat on the floor, shoulder-width apart. Hold your instrument at the ready position. Your teacher will confirm your posture.',
    challengeType: 'teacher_confirm',
    requiresTeacher: true,
  },
  {
    id: 'assembly',
    title: 'Instrument Assembly',
    icon: '🔧',
    description: 'Your instrument must be properly assembled before any sound can be made.',
    instruction: 'Assemble your instrument completely and correctly. Follow each step from class. Your teacher will confirm proper assembly.',
    challengeType: 'teacher_confirm',
    requiresTeacher: true,
  },
  {
    id: 'hold',
    title: 'How to Hold',
    icon: '🤲',
    description: 'Embouchure, grip, and playing position vary by instrument. Learn yours correctly from the start.',
    instruction: 'Form your embouchure (winds) or grip position (percussion). Hold the instrument in playing position. Your teacher will confirm correct hold.',
    challengeType: 'teacher_confirm',
    requiresTeacher: true,
  },
  {
    id: 'first_sound',
    title: 'First Sound',
    icon: '🔊',
    description: 'The moment every musician remembers — your first intentional tone.',
    instruction: 'Produce your first intentional sound. For winds: buzz on the mouthpiece or play your first open note. For percussion: a controlled stroke on the practice pad. The microphone is listening — just make a sustained sound.',
    challengeType: 'microphone_any',
    requiresTeacher: false,
  },
  {
    id: 'first_song',
    title: 'First 3-Note Song',
    icon: '🎵',
    description: 'Play your first 3-note melody. This is your Boot Camp graduation.',
    instruction: 'Play the three notes shown below. The microphone will listen for a sustained pitch. Take your time.',
    challengeType: 'microphone_pitch',
    requiresTeacher: false,
  },
];

export default function BootCampPage() {
  const { character, setCharacter, completeBootCampStep } = useGameStore();
  const navigate = useNavigate();

  const [completedSteps, setCompletedSteps] = useState<Set<StepId>>(new Set());
  const [currentStep, setCurrentStep] = useState<StepId>('posture');
  const [showChallenge, setShowChallenge] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showGraduation, setShowGraduation] = useState(false);

  useEffect(() => {
    if (!character) return;

    supabase
      .from('boot_camp_progress')
      .select('step_id, completed')
      .eq('character_id', character.id)
      .then(({ data }) => {
        if (data) {
          const done = new Set(
            data.filter((r) => r.completed).map((r) => r.step_id as StepId)
          );
          setCompletedSteps(done);

          // Advance to the first incomplete step
          const nextStep = STEPS.find((s) => !done.has(s.id));
          if (nextStep) setCurrentStep(nextStep.id);
          else if (character.bootCampComplete) navigate('/hub');
        }
        setLoading(false);
      });
  }, [character, navigate]);

  async function markComplete(stepId: StepId) {
    if (!character) return;

    await completeBootCampStep(stepId);
    const newCompleted = new Set(completedSteps);
    newCompleted.add(stepId);
    setCompletedSteps(newCompleted);
    setShowChallenge(false);

    const nextStep = STEPS.find((s) => !newCompleted.has(s.id));
    if (nextStep) {
      setCurrentStep(nextStep.id);
    } else {
      // All steps done — graduation!
      await graduate();
    }
  }

  async function graduate() {
    if (!character) return;

    await supabase
      .from('characters')
      .update({ boot_camp_complete: true })
      .eq('id', character.id);

    setCharacter({ ...character, bootCampComplete: true });
    setShowGraduation(true);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-academy-cream/60">Loading…</div>;
  if (!character) return null;

  const instrument = INSTRUMENTS[character.instrument];
  const currentStepDef = STEPS.find((s) => s.id === currentStep)!;

  if (showGraduation) {
    return <GraduationScreen character={character} instrument={instrument} onContinue={() => navigate('/hub')} />;
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-academy-gold/60 text-xs tracking-[0.4em] uppercase font-fantasy mb-2">
            Harmonia Academy
          </div>
          <h1 className="fantasy-title text-3xl mb-1">Boot Camp</h1>
          <p className="text-academy-cream/60 text-sm">
            {instrument.name} — {instrument.className}
          </p>
        </div>

        {/* Progress track */}
        <div className="flex items-center gap-1 mb-8">
          {STEPS.map((step, i) => (
            <div key={step.id} className="flex items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 transition-all
                  ${completedSteps.has(step.id)
                    ? 'bg-rating-superior text-academy-dark font-bold'
                    : step.id === currentStep
                    ? 'bg-academy-gold text-academy-dark font-bold ring-2 ring-academy-gold ring-offset-2 ring-offset-academy-dark'
                    : 'bg-black/40 border border-academy-gold/20 text-academy-cream/40'
                  }`}
              >
                {completedSteps.has(step.id) ? '✓' : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-1 ${completedSteps.has(step.id) ? 'bg-rating-superior' : 'bg-academy-gold/20'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Current step card */}
        {!showChallenge ? (
          <StepCard
            step={currentStepDef}
            completed={completedSteps.has(currentStepDef.id)}
            onBegin={() => setShowChallenge(true)}
          />
        ) : (
          <ChallengeCard
            step={currentStepDef}
            instrument={instrument}
            onComplete={() => markComplete(currentStepDef.id)}
            onCancel={() => setShowChallenge(false)}
          />
        )}

        {/* Completed steps list */}
        {completedSteps.size > 0 && (
          <div className="mt-6">
            <div className="text-academy-cream/40 text-xs uppercase tracking-widest mb-3 font-fantasy">
              Completed
            </div>
            <div className="space-y-2">
              {STEPS.filter((s) => completedSteps.has(s.id)).map((step) => (
                <div key={step.id} className="flex items-center gap-3 text-sm">
                  <span className="text-rating-superior">✓</span>
                  <span className="text-academy-cream/50">{step.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepCard({ step, completed, onBegin }: {
  step: Step;
  completed: boolean;
  onBegin: () => void;
}) {
  return (
    <div className="card-panel">
      <div className="text-4xl mb-4 text-center">{step.icon}</div>
      <h2 className="fantasy-title text-xl text-center mb-3">{step.title}</h2>
      <p className="text-academy-cream/70 text-sm text-center mb-4 leading-relaxed">
        {step.description}
      </p>
      <div className="bg-black/30 border border-academy-gold/20 rounded-lg p-4 mb-5">
        <p className="text-academy-cream/80 text-sm leading-relaxed">
          {step.instruction}
        </p>
      </div>
      {step.requiresTeacher && (
        <div className="bg-academy-gold/10 border border-academy-gold/20 rounded-lg p-3 mb-5 text-center">
          <span className="text-academy-gold text-xs">⚑ Requires teacher confirmation</span>
        </div>
      )}
      {!completed && (
        <button onClick={onBegin} className="btn-primary w-full">
          Begin Challenge
        </button>
      )}
    </div>
  );
}

function ChallengeCard({ step, instrument, onComplete, onCancel }: {
  step: Step;
  instrument: { id: string; name: string };
  onComplete: () => void;
  onCancel: () => void;
}) {
  const [soundDetected, setSoundDetected] = useState(false);
  const soundTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSoundDetected() {
    setSoundDetected(true);
    // Auto-complete after 2 seconds of sustained sound
    if (soundTimer.current) clearTimeout(soundTimer.current);
    soundTimer.current = setTimeout(onComplete, 2000);
  }

  if (step.challengeType === 'teacher_confirm') {
    return (
      <div className="card-panel text-center">
        <div className="text-4xl mb-4">{step.icon}</div>
        <h3 className="fantasy-title text-lg mb-3">Awaiting Teacher Confirmation</h3>
        <p className="text-academy-cream/70 text-sm mb-6 leading-relaxed">
          Raise your hand to let your teacher know you're ready. They will confirm your progress from the teacher dashboard.
        </p>
        <div className="bg-academy-gold/10 border border-academy-gold/30 rounded-lg p-4 mb-6">
          <div className="text-academy-gold text-2xl mb-2">🎼</div>
          <p className="text-academy-cream/80 text-sm">
            {step.instruction}
          </p>
        </div>
        {/* For demo / testing — teacher button */}
        <button onClick={onComplete} className="btn-secondary text-sm mb-3">
          ✓ Teacher Confirmed (Demo)
        </button>
        <button onClick={onCancel} className="text-academy-cream/40 text-xs hover:text-academy-cream/60 transition-colors">
          Cancel
        </button>
      </div>
    );
  }

  if (step.challengeType === 'microphone_any') {
    return (
      <div className="card-panel text-center">
        <div className="text-4xl mb-4">🔊</div>
        <h3 className="fantasy-title text-lg mb-3">Make Your First Sound</h3>
        <p className="text-academy-cream/70 text-sm mb-6">
          The microphone is listening. Produce any sustained sound on your instrument.
        </p>
        <MicrophoneListener
          mode="any_sound"
          onSoundDetected={handleSoundDetected}
          threshold={-50}
        />
        {soundDetected ? (
          <div className="mt-4 text-rating-superior font-fantasy text-lg animate-pulse">
            Sound detected! Hold it…
          </div>
        ) : (
          <div className="mt-4 text-academy-cream/40 text-sm">Waiting for sound…</div>
        )}
        <button onClick={onCancel} className="mt-4 text-academy-cream/40 text-xs hover:text-academy-cream/60 transition-colors">
          Cancel
        </button>
      </div>
    );
  }

  // first_song — 3-note challenge
  return <FirstSongChallenge instrument={instrument} onComplete={onComplete} onCancel={onCancel} />;
}

const FIRST_NOTES: Record<string, { notes: string[]; description: string }> = {
  flute: { notes: ['B4', 'A4', 'G4'], description: 'Concert B, A, G' },
  clarinet: { notes: ['E4', 'D4', 'C4'], description: 'Open E, D, C' },
  alto_sax: { notes: ['B4', 'A4', 'G4'], description: 'Concert B, A, G (finger E, D, C)' },
  trumpet: { notes: ['C4', 'Bb3', 'F3'], description: 'Open C, Bb, F' },
  trombone: { notes: ['Bb3', 'F3', 'Eb3'], description: 'Positions 1, 4, 3' },
  euphonium: { notes: ['Bb3', 'Ab3', 'G3'], description: 'Open Bb, Ab, G' },
  percussion: { notes: ['beat', 'beat', 'beat'], description: 'Three steady quarter-note strokes' },
  french_horn: { notes: ['G4', 'F4', 'Eb4'], description: 'Open G, F, Eb' },
  tuba: { notes: ['Bb2', 'Ab2', 'G2'], description: 'Low Bb, Ab, G' },
  oboe: { notes: ['B4', 'A4', 'G4'], description: 'Concert B, A, G' },
  bassoon: { notes: ['Bb3', 'Ab3', 'G3'], description: 'Concert Bb, Ab, G' },
};

function FirstSongChallenge({ instrument, onComplete, onCancel }: {
  instrument: { id: string; name: string };
  onComplete: () => void;
  onCancel: () => void;
}) {
  const notes = FIRST_NOTES[instrument.id] ?? FIRST_NOTES.flute;
  const [noteIndex, setNoteIndex] = useState(0);
  const [pitchDetected, setPitchDetected] = useState(false);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handlePitch() {
    if (pitchDetected) return;
    setPitchDetected(true);
    noteTimer.current = setTimeout(() => {
      setPitchDetected(false);
      if (noteIndex >= notes.notes.length - 1) {
        onComplete();
      } else {
        setNoteIndex((i) => i + 1);
      }
    }, 1500);
  }

  return (
    <div className="card-panel text-center">
      <div className="text-4xl mb-4">🎵</div>
      <h3 className="fantasy-title text-lg mb-2">First 3-Note Song</h3>
      <p className="text-academy-cream/60 text-sm mb-6">{notes.description}</p>

      {/* Note display */}
      <div className="flex items-center justify-center gap-4 mb-6">
        {notes.notes.map((note, i) => (
          <div
            key={i}
            className={`w-16 h-16 rounded-full border-2 flex items-center justify-center font-fantasy text-sm transition-all
              ${i < noteIndex
                ? 'bg-rating-superior/20 border-rating-superior text-rating-superior'
                : i === noteIndex
                ? 'bg-academy-gold/20 border-academy-gold text-academy-gold ring-4 ring-academy-gold/30 scale-110'
                : 'bg-black/30 border-academy-gold/20 text-academy-cream/30'
              }`}
          >
            {i < noteIndex ? '✓' : note}
          </div>
        ))}
      </div>

      <div className="mb-4">
        <p className="text-academy-cream/60 text-sm">
          Now play: <span className="text-academy-gold font-fantasy">{notes.notes[noteIndex]}</span>
        </p>
      </div>

      <MicrophoneListener
        mode="any_sound"
        onSoundDetected={handlePitch}
        threshold={-45}
      />

      {pitchDetected && (
        <div className="mt-3 text-rating-superior font-fantasy animate-pulse">Good! Next note…</div>
      )}

      <button onClick={onCancel} className="mt-4 text-academy-cream/40 text-xs hover:text-academy-cream/60 transition-colors">
        Cancel
      </button>
    </div>
  );
}

function GraduationScreen({ character, instrument, onContinue }: {
  character: { displayName: string };
  instrument: { name: string; className: string };
  onContinue: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md">
        <div className="text-6xl mb-6 animate-float">🎓</div>
        <div className="text-academy-gold/60 text-xs tracking-[0.4em] uppercase font-fantasy mb-4">
          Boot Camp Complete
        </div>
        <h1 className="fantasy-title text-4xl mb-3 text-shadow-glow">
          Welcome, Recruit!
        </h1>
        <p className="text-academy-cream/80 text-base mb-2">
          Headmaster Fennelio steps forward, a rare smile on his face.
        </p>
        <div className="card-panel my-8 text-left">
          <p className="text-academy-cream/80 text-sm italic leading-relaxed">
            "You have shown the first and most important quality of a musician:
            the willingness to begin. The {instrument.name} in your hands is not merely
            an instrument — it is a voice in the music that keeps our whole world turning.
            You are now a {instrument.className} of Harmonia Academy."
          </p>
          <div className="mt-3 text-right text-academy-gold/60 text-xs">
            — Headmaster Fennelio
          </div>
        </div>
        <p className="text-academy-cream/60 text-sm mb-8">
          {character.displayName}, your journey begins now.
        </p>
        <button onClick={onContinue} className="btn-primary">
          Enter the Academy →
        </button>
      </div>
    </div>
  );
}
