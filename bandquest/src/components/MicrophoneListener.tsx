import { useEffect, useRef, useState } from 'react';

interface Props {
  mode: 'any_sound' | 'pitch';
  onSoundDetected?: () => void;
  onPitchDetected?: (frequency: number, cents: number, note: string) => void;
  threshold?: number;   // dBFS, default -50
  active?: boolean;
}

export default function MicrophoneListener({
  mode,
  onSoundDetected,
  onPitchDetected,
  threshold = -50,
  active = true,
}: Props) {
  const [status, setStatus] = useState<'idle' | 'requesting' | 'listening' | 'denied'>('idle');
  const [level, setLevel] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;

    async function startListening() {
      setStatus('requesting');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        streamRef.current = stream;

        const ctx = new AudioContext();
        audioCtxRef.current = ctx;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyserRef.current = analyser;

        const source = ctx.createMediaStreamSource(stream);
        sourceRef.current = source;
        source.connect(analyser);

        setStatus('listening');
        loop(analyser, ctx.sampleRate);
      } catch {
        setStatus('denied');
      }
    }

    function loop(analyser: AnalyserNode, sampleRate: number) {
      const bufferLength = analyser.fftSize;
      const dataArray = new Float32Array(bufferLength);

      function tick() {
        analyser.getFloatTimeDomainData(dataArray);

        // RMS volume
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i] * dataArray[i];
        const rms = Math.sqrt(sum / bufferLength);
        const db = 20 * Math.log10(Math.max(rms, 1e-10));

        setLevel(Math.max(0, Math.min(1, (db - threshold) / 40)));

        if (db > threshold) {
          if (mode === 'any_sound' && onSoundDetected) {
            onSoundDetected();
          }
          if (mode === 'pitch' && onPitchDetected) {
            const freq = detectPitch(dataArray, sampleRate);
            if (freq > 0) {
              const { note, cents } = frequencyToNote(freq);
              onPitchDetected(freq, cents, note);
            }
          }
        }

        rafRef.current = requestAnimationFrame(tick);
      }
      tick();
    }

    startListening();

    return () => {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close();
    };
  }, [active, mode, onSoundDetected, onPitchDetected, threshold]);

  return (
    <div className="flex flex-col items-center gap-3">
      {status === 'requesting' && (
        <p className="text-academy-cream/60 text-sm animate-pulse">Requesting microphone access…</p>
      )}
      {status === 'denied' && (
        <div className="text-rating-poor text-sm text-center">
          <p>Microphone access denied.</p>
          <p className="text-xs mt-1 text-academy-cream/40">Please allow microphone access in your browser settings.</p>
        </div>
      )}
      {status === 'listening' && (
        <div className="flex flex-col items-center gap-2 w-full max-w-xs">
          <div className="flex items-end justify-center gap-1 h-12">
            {Array.from({ length: 16 }, (_, i) => (
              <div
                key={i}
                className="w-2 rounded-full bg-academy-gold transition-all duration-75"
                style={{
                  height: `${Math.max(4, level * 100 * (0.5 + Math.random() * 0.5) * Math.sin(i / 15 * Math.PI))}%`,
                  opacity: level > 0.05 ? 0.8 : 0.2,
                }}
              />
            ))}
          </div>
          <p className="text-academy-cream/40 text-xs">
            {level > 0.1 ? '🎵 Sound detected' : '🎤 Listening…'}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Pitch detection (Yin algorithm simplified) ────────────────────────────────

function detectPitch(buffer: Float32Array, sampleRate: number): number {
  const SIZE = buffer.length;
  const MAX_SAMPLES = Math.floor(SIZE / 2);
  const threshold = 0.1;

  const yinBuffer = new Float32Array(MAX_SAMPLES);
  let probability = 0;
  let tau = 0;

  // Difference function
  for (let t = 1; t < MAX_SAMPLES; t++) {
    let sum = 0;
    for (let i = 0; i < MAX_SAMPLES; i++) {
      const delta = buffer[i] - buffer[i + t];
      sum += delta * delta;
    }
    yinBuffer[t] = sum;
  }

  // Cumulative mean normalized difference
  yinBuffer[0] = 1;
  let runningSum = 0;
  for (let t = 1; t < MAX_SAMPLES; t++) {
    runningSum += yinBuffer[t];
    yinBuffer[t] *= t / runningSum;
  }

  // Absolute threshold
  for (let t = 2; t < MAX_SAMPLES; t++) {
    if (yinBuffer[t] < threshold) {
      while (t + 1 < MAX_SAMPLES && yinBuffer[t + 1] < yinBuffer[t]) {
        t++;
      }
      probability = 1 - yinBuffer[t];
      tau = t;
      break;
    }
  }

  if (tau === 0 || probability < 0.8) return -1;

  // Parabolic interpolation for sub-sample accuracy
  const x0 = tau < 1 ? tau : tau - 1;
  const x2 = tau + 1 < MAX_SAMPLES ? tau + 1 : tau;
  if (x0 === tau) {
    return yinBuffer[tau] <= yinBuffer[x2] ? sampleRate / tau : sampleRate / x2;
  }
  if (x2 === tau) {
    return yinBuffer[tau] <= yinBuffer[x0] ? sampleRate / tau : sampleRate / x0;
  }
  const s0 = yinBuffer[x0];
  const s1 = yinBuffer[tau];
  const s2 = yinBuffer[x2];
  const betterTau = tau + (s2 - s0) / (2 * (2 * s1 - s2 - s0));
  return sampleRate / betterTau;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function frequencyToNote(freq: number): { note: string; cents: number } {
  const A4 = 440;
  const semitones = 12 * Math.log2(freq / A4);
  const rounded = Math.round(semitones);
  const cents = Math.round((semitones - rounded) * 100);
  const noteIndex = ((rounded + 9) % 12 + 12) % 12;
  const octave = Math.floor((rounded + 9) / 12) + 4;
  return { note: `${NOTE_NAMES[noteIndex]}${octave}`, cents };
}
