import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import Avatar from '../components/Avatar';
import type { Appearance } from '../types/game';
import {
  SKIN_TONES, HAIR_COLORS, OUTFIT_COLORS, ACCENT_COLORS, BACKDROPS,
  HAIR_STYLE_COUNT, EYE_STYLE_COUNT, ACCESSORY_COUNT,
  HAIR_STYLE_NAMES, EYE_STYLE_NAMES, ACCESSORY_NAMES,
  normalizeAppearance, randomAppearance,
} from '../lib/appearance';

export default function CustomizePage() {
  const navigate = useNavigate();
  const { user, saveAppearance: saveUserAppearance } = useAuthStore();
  const { character, saveAppearance: saveCharAppearance } = useGameStore();

  // Students edit their character's appearance; teachers edit their profile's.
  const isStudent = user?.role === 'student' && !!character;
  const source: Appearance = isStudent ? character!.appearance : (user?.appearance ?? normalizeAppearance(null));

  const [draft, setDraft] = useState<Appearance>(normalizeAppearance(source));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!user) return null;

  const set = <K extends keyof Appearance>(key: K, value: Appearance[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setSaved(false);
  };
  const cycle = (key: keyof Appearance, count: number, dir: 1 | -1) => {
    setDraft((d) => ({ ...d, [key]: (d[key] + dir + count) % count }));
    setSaved(false);
  };

  async function handleSave() {
    setSaving(true);
    if (isStudent) {
      await saveCharAppearance(draft);
    } else {
      await saveUserAppearance(draft);
    }
    setSaving(false);
    setSaved(true);
  }

  const backTo = isStudent ? '/hub' : '/dashboard';

  return (
    <div className="min-h-screen pb-28">
      {/* Top nav */}
      <div className="sticky top-0 z-30 bg-academy-dark/95 backdrop-blur-sm border-b border-academy-gold/10 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate(backTo)}
          className="text-academy-cream/50 hover:text-academy-cream/90 text-sm flex items-center gap-1.5 transition-colors"
        >
          ← {isStudent ? 'Hub' : 'Dashboard'}
        </button>
        <div className="fantasy-title text-base text-academy-gold">Customize Avatar</div>
        <button
          onClick={() => { setDraft(randomAppearance()); setSaved(false); }}
          className="text-academy-cream/40 hover:text-academy-cream/80 text-xs transition-colors"
        >
          🎲 Random
        </button>
      </div>

      <div className="max-w-md mx-auto px-4 pt-6">
        {/* Live preview */}
        <div className="flex flex-col items-center mb-6">
          <div className="rounded-2xl p-1" style={{ boxShadow: '0 0 40px rgba(212,160,23,0.15)' }}>
            <Avatar appearance={draft} size={160} />
          </div>
          <div className="mt-3 text-academy-cream/80 fantasy-title text-lg">
            {isStudent ? character!.displayName : user.displayName}
          </div>
          <div className="text-academy-cream/40 text-xs">
            {isStudent ? 'Student Musician' : 'Band Director'}
          </div>
        </div>

        {/* Color palettes */}
        <Section title="Skin Tone">
          <Swatches
            colors={SKIN_TONES}
            selected={draft.skinTone}
            onSelect={(i) => set('skinTone', i)}
          />
        </Section>

        <Section title="Hair Style">
          <Stepper
            label={HAIR_STYLE_NAMES[draft.hairStyle]}
            onPrev={() => cycle('hairStyle', HAIR_STYLE_COUNT, -1)}
            onNext={() => cycle('hairStyle', HAIR_STYLE_COUNT, 1)}
          />
          <div className="mt-3">
            <Swatches
              colors={HAIR_COLORS}
              selected={draft.hairColor}
              onSelect={(i) => set('hairColor', i)}
            />
          </div>
        </Section>

        <Section title="Eyes">
          <Stepper
            label={EYE_STYLE_NAMES[draft.eyes]}
            onPrev={() => cycle('eyes', EYE_STYLE_COUNT, -1)}
            onNext={() => cycle('eyes', EYE_STYLE_COUNT, 1)}
          />
        </Section>

        <Section title="Outfit">
          <div className="text-academy-cream/40 text-[10px] uppercase tracking-widest mb-1.5">Primary</div>
          <Swatches
            colors={OUTFIT_COLORS}
            selected={draft.outfitColor}
            onSelect={(i) => set('outfitColor', i)}
          />
          <div className="text-academy-cream/40 text-[10px] uppercase tracking-widest mt-3 mb-1.5">Trim</div>
          <Swatches
            colors={ACCENT_COLORS}
            selected={draft.accentColor}
            onSelect={(i) => set('accentColor', i)}
          />
        </Section>

        <Section title="Accessory">
          <Stepper
            label={ACCESSORY_NAMES[draft.accessory]}
            onPrev={() => cycle('accessory', ACCESSORY_COUNT, -1)}
            onNext={() => cycle('accessory', ACCESSORY_COUNT, 1)}
          />
        </Section>

        <Section title="Backdrop">
          <Stepper
            label={BACKDROPS[draft.backdrop].name}
            onPrev={() => cycle('backdrop', BACKDROPS.length, -1)}
            onNext={() => cycle('backdrop', BACKDROPS.length, 1)}
          />
        </Section>
      </div>

      {/* Save bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-academy-dark/95 backdrop-blur-sm border-t border-academy-gold/10 px-4 py-3">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Appearance'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-panel mb-4">
      <div className="text-academy-gold/80 text-xs uppercase tracking-widest mb-3 font-fantasy">{title}</div>
      {children}
    </div>
  );
}

function Swatches({ colors, selected, onSelect }: {
  colors: string[];
  selected: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((c, i) => {
        const isSel = i === selected;
        return (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className="w-9 h-9 rounded-full transition-all duration-150"
            style={{
              backgroundColor: c,
              transform: isSel ? 'scale(1.12)' : 'scale(1)',
              boxShadow: isSel ? '0 0 0 2px #1a1308, 0 0 0 4px #C9A227' : 'inset 0 0 0 1px rgba(255,255,255,0.15)',
            }}
            aria-label={`Color ${i + 1}`}
          />
        );
      })}
    </div>
  );
}

function Stepper({ label, onPrev, onNext }: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onPrev}
        className="w-9 h-9 rounded-lg bg-black/30 border border-academy-gold/20 text-academy-cream/70
                   hover:border-academy-gold/60 hover:text-academy-cream transition-colors flex-shrink-0"
      >
        ‹
      </button>
      <div className="flex-1 text-center text-academy-cream/90 text-sm font-fantasy py-2 rounded-lg bg-black/20 border border-academy-gold/10">
        {label}
      </div>
      <button
        onClick={onNext}
        className="w-9 h-9 rounded-lg bg-black/30 border border-academy-gold/20 text-academy-cream/70
                   hover:border-academy-gold/60 hover:text-academy-cream transition-colors flex-shrink-0"
      >
        ›
      </button>
    </div>
  );
}
