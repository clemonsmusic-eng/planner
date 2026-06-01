import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { HALL_OF_FAME, THEORY_REFERENCE } from '../lib/library';
import type { HallOfFameEntry, TheoryEntry } from '../lib/library';
import MusicDiagram from '../components/MusicDiagram';

type MainTab = 'hall_of_fame' | 'theory';
type HofCategory = 'faculty' | 'sacred_score' | 'instrument';
type TheorySection = TheoryEntry['section'];

const HOF_CATEGORY_LABELS: Record<HofCategory, string> = {
  faculty: 'Faculty',
  sacred_score: 'Sacred Scores',
  instrument: 'Instruments',
};

const THEORY_SECTION_LABELS: Record<TheorySection, string> = {
  key_signatures: 'Key Signatures',
  intervals: 'Intervals',
  chords: 'Chords',
  rhythm: 'Rhythm',
  scales: 'Scales',
  notation: 'Notation',
};

export default function LibraryPage() {
  const navigate = useNavigate();
  const { character } = useGameStore();
  const [mainTab, setMainTab] = useState<MainTab>('hall_of_fame');
  const [hofCategory, setHofCategory] = useState<HofCategory>('faculty');
  const [theorySection, setTheorySection] = useState<TheorySection>('key_signatures');

  if (!character) return null;

  const currentZone = character.currentZone;

  const hofEntries = HALL_OF_FAME.filter((e) => e.category === hofCategory);
  const theoryEntries = THEORY_REFERENCE.filter((e) => e.section === theorySection);

  return (
    <div className="min-h-screen pb-16">
      {/* Top nav */}
      <div className="sticky top-0 z-20 bg-academy-dark/95 backdrop-blur-sm border-b border-academy-gold/10 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/hub')}
          className="text-academy-cream/40 hover:text-academy-cream/80 text-sm transition-colors"
        >
          ← Hub
        </button>
        <div className="fantasy-title text-lg text-academy-gold flex-1 text-center">
          The Library
        </div>
        <div className="w-12" />
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4">
        {/* Main tabs */}
        <div className="flex gap-1 bg-black/30 rounded-lg p-1 mb-6">
          <MainTabButton
            label="Hall of Fame"
            active={mainTab === 'hall_of_fame'}
            onClick={() => setMainTab('hall_of_fame')}
          />
          <MainTabButton
            label="Theory Reference"
            active={mainTab === 'theory'}
            onClick={() => setMainTab('theory')}
          />
        </div>

        {/* Hall of Fame */}
        {mainTab === 'hall_of_fame' && (
          <div>
            {/* Sub-tabs */}
            <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-hide pb-1">
              {(Object.keys(HOF_CATEGORY_LABELS) as HofCategory[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setHofCategory(cat)}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-fantasy transition-all
                    ${hofCategory === cat
                      ? 'bg-academy-gold/20 text-academy-gold border border-academy-gold/40'
                      : 'text-academy-cream/50 hover:text-academy-cream/80 border border-transparent'}`}
                >
                  {HOF_CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>

            {/* Entries */}
            <div className="space-y-4">
              {hofEntries.map((entry) => (
                <HofCard key={entry.id} entry={entry} currentZone={currentZone} />
              ))}
              {hofEntries.length === 0 && (
                <div className="text-center text-academy-cream/30 py-12 font-fantasy">
                  No entries yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Theory Reference */}
        {mainTab === 'theory' && (
          <div>
            {/* Fingering Charts shortcut */}
            <button
              onClick={() => navigate('/fingering')}
              className="w-full mb-5 card-panel flex items-center gap-3 hover:border-academy-gold/40 transition-all"
            >
              <span className="text-2xl">🎵</span>
              <div className="text-left">
                <div className="text-academy-cream/90 text-sm font-fantasy">Fingering Charts</div>
                <div className="text-academy-cream/40 text-xs">All instruments · chromatic · All-State scales</div>
              </div>
              <span className="ml-auto text-academy-gold/60 text-xs">→</span>
            </button>

            {/* Section filter buttons */}
            <div className="flex flex-wrap gap-2 mb-5">
              {(Object.keys(THEORY_SECTION_LABELS) as TheorySection[]).map((sec) => (
                <button
                  key={sec}
                  onClick={() => setTheorySection(sec)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-fantasy transition-all
                    ${theorySection === sec
                      ? 'bg-academy-gold/20 text-academy-gold border border-academy-gold/40'
                      : 'text-academy-cream/50 hover:text-academy-cream/80 border border-academy-gold/10'}`}
                >
                  {THEORY_SECTION_LABELS[sec]}
                </button>
              ))}
            </div>

            {/* Theory entries */}
            <div className="space-y-4">
              {theoryEntries.map((entry) => (
                <TheoryCard key={entry.id} entry={entry} currentZone={currentZone} />
              ))}
              {theoryEntries.length === 0 && (
                <div className="text-center text-academy-cream/30 py-12 font-fantasy">
                  No entries in this section yet.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MainTabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 px-3 rounded-md text-sm font-fantasy transition-all
        ${active ? 'bg-academy-gold/20 text-academy-gold' : 'text-academy-cream/50 hover:text-academy-cream/80'}`}
    >
      {label}
    </button>
  );
}

function HofCard({
  entry,
  currentZone,
}: {
  entry: HallOfFameEntry;
  currentZone: number;
}) {
  const locked = entry.unlockedByZone > currentZone;

  if (locked) {
    return (
      <div className="card-panel opacity-40 select-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-academy-gold/10 border border-academy-gold/20 flex items-center justify-center text-xl flex-shrink-0">
            🔒
          </div>
          <div>
            <div className="text-academy-cream/50 text-sm font-fantasy blur-sm select-none">
              {'█'.repeat(Math.min(entry.title.length, 20))}
            </div>
            <div className="text-academy-cream/30 text-xs mt-1">
              Unlock by reaching Zone {entry.unlockedByZone}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card-panel">
      <div className="mb-1">
        <h3 className="fantasy-title text-base text-academy-gold">{entry.title}</h3>
        <p className="text-academy-cream/50 text-xs mt-0.5 italic">{entry.subtitle}</p>
      </div>
      <p className="text-academy-cream/80 text-sm leading-relaxed mt-3">{entry.body}</p>
      {entry.sessionBuff && (
        <div className="mt-4 inline-flex items-center gap-2 bg-academy-gold/10 border border-academy-gold/30 rounded-lg px-3 py-1.5">
          <span className="text-academy-gold text-xs">✦</span>
          <span className="text-academy-gold text-xs font-fantasy">
            Session Buff: {entry.sessionBuff.description}
          </span>
        </div>
      )}
    </div>
  );
}

function TheoryCard({
  entry,
  currentZone,
}: {
  entry: TheoryEntry;
  currentZone: number;
}) {
  const locked = entry.unlockedByZone > currentZone;

  if (locked) {
    return (
      <div className="card-panel opacity-40 select-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-academy-gold/10 border border-academy-gold/20 flex items-center justify-center text-xl flex-shrink-0">
            🔒
          </div>
          <div>
            <div className="text-academy-cream/50 text-sm font-fantasy blur-sm select-none">
              {'█'.repeat(Math.min(entry.title.length, 20))}
            </div>
            <div className="text-academy-cream/30 text-xs mt-1">
              Unlock by reaching Zone {entry.unlockedByZone}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card-panel">
      <h3 className="fantasy-title text-base text-academy-gold mb-3">{entry.title}</h3>
      {entry.diagrams && entry.diagrams.length > 0 && (
        <div className="flex flex-wrap gap-4 mb-4">
          {entry.diagrams.map((d, i) => (
            <MusicDiagram key={i} spec={d} />
          ))}
        </div>
      )}
      <pre className="text-academy-cream/80 text-xs leading-relaxed whitespace-pre-wrap font-mono bg-black/20 rounded-lg p-4 overflow-x-auto">
        {entry.content}
      </pre>
    </div>
  );
}
