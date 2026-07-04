import { useState } from 'react';
import MaestroPortrait from './MaestroPortrait';

export interface LibBeat {
  emoji: string;
  text: string;
  image?: string;   // retro portrait shown instead of the emoji when available
}

// Stepped "a maestro is freed" cutscene, shared by the Act 2 liberation zones.
export default function LiberationScene({ beats, onDone, title = 'A Maestro Freed', doneLabel = 'Welcome them back →' }: {
  beats: LibBeat[];
  onDone: () => void;
  title?: string;
  doneLabel?: string;
}) {
  const [step, setStep] = useState(0);
  const last = step === beats.length - 1;
  const b = beats[step];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="text-academy-gold/60 text-[10px] uppercase tracking-[0.4em] font-fantasy mb-4">
        {title}
      </div>
      {b.image ? (
        <div className="mb-6 rounded-lg overflow-hidden border-2 border-academy-gold/50" style={{ boxShadow: '0 0 24px #FFD70044' }}>
          <MaestroPortrait src={b.image} emoji={b.emoji} size={216} full />
        </div>
      ) : (
        <div className="text-6xl mb-6" style={{ filter: 'drop-shadow(0 0 24px #FFD70066)' }}>{b.emoji}</div>
      )}
      <div className="card-panel max-w-md w-full mb-8 border-rating-superior/40">
        <p className="text-academy-cream/85 text-sm leading-relaxed">{b.text}</p>
      </div>
      <div className="flex items-center gap-3 mb-8">
        {beats.map((_, i) => (
          <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-academy-gold' : 'w-1.5 bg-academy-cream/20'}`} />
        ))}
      </div>
      <button onClick={() => (last ? onDone() : setStep(step + 1))} className="btn-primary">
        {last ? doneLabel : 'Continue'}
      </button>
    </div>
  );
}
