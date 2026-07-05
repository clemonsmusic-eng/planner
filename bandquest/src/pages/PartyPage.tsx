import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { STUDENTS, recruitmentDue, hasMet } from '../lib/students';
import {
  MAX_PARTY_SIZE, getPartySelection, savePartySelection, sanitizeSelection,
} from '../lib/party';
import { INSTRUMENTS, getInstrumentColor, getInstrumentEmoji } from '../lib/instruments';
import { STUDENT_PORTRAITS } from '../lib/portraits';
import Avatar from '../components/Avatar';
import MaestroPortrait from '../components/MaestroPortrait';

// Party picker: the hero plus up to four classmates, one instrument per party.
// (In co-op, real players will occupy slots and exclude their instruments the
// same way — see buildParty's realPlayerInstruments hook.)
export default function PartyPage() {
  const { character } = useGameStore();
  const navigate = useNavigate();
  const [selection, setSelection] = useState<string[]>(() =>
    character ? getPartySelection(character) : []);

  if (!character) return null;

  const npcSlots = MAX_PARTY_SIZE - 1;
  const takenInstruments = new Set([
    character.instrument,
    ...selection.map((id) => STUDENTS.find((s) => s.id === id)!.instrument),
  ]);

  function update(ids: string[]) {
    if (!character) return;
    const clean = sanitizeSelection(ids, character);
    setSelection(clean);
    savePartySelection(character.id, clean);
  }

  const toggle = (id: string) =>
    update(selection.includes(id) ? selection.filter((x) => x !== id) : [...selection, id]);

  return (
    <div className="min-h-screen pb-24">
      <div className="relative bg-gradient-to-b from-amber-900/30 to-transparent px-4 pt-8 pb-6">
        <button
          onClick={() => navigate('/hub')}
          className="text-academy-cream/40 hover:text-academy-cream/80 text-sm mb-4 flex items-center gap-1 transition-colors"
        >
          ← Hub
        </button>
        <h1 className="fantasy-title text-2xl text-academy-cream mb-2">Your Band</h1>
        <p className="text-academy-cream/60 text-sm leading-relaxed">
          Choose up to {npcSlots} classmates to fight beside you — {MAX_PARTY_SIZE} on stage,
          counting you. One player per instrument: your own part is covered, and in co-op,
          real classmates take these slots (and their instruments) for themselves.
        </p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Current lineup */}
        <h2 className="fantasy-title text-sm text-academy-gold/70 uppercase tracking-widest mb-3">
          On Stage · {1 + selection.length}/{MAX_PARTY_SIZE}
        </h2>
        <div className="card-panel mb-8 py-3 px-4">
          <div className="flex items-center gap-3 py-1.5">
            <div className="rounded-lg overflow-hidden flex-shrink-0" style={{ border: `1px solid ${getInstrumentColor(character.instrument)}55` }}>
              <Avatar appearance={character.appearance} instrument={character.instrument} size={40} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-fantasy" style={{ color: getInstrumentColor(character.instrument) }}>
                {character.displayName}
              </span>
              <div className="text-academy-cream/40 text-xs">{INSTRUMENTS[character.instrument].name} · You</div>
            </div>
            <span className="text-[10px] text-academy-cream/30 font-fantasy uppercase tracking-widest flex-shrink-0">Leader</span>
          </div>
          {selection.map((id) => {
            const s = STUDENTS.find((st) => st.id === id)!;
            const color = getInstrumentColor(s.instrument);
            return (
              <div key={id} className="flex items-center gap-3 py-1.5 border-t border-white/5">
                <div
                  className="rounded-lg overflow-hidden flex-shrink-0"
                  style={{ background: `${color}18`, border: `1px solid ${color}40` }}
                >
                  <MaestroPortrait
                    src={STUDENT_PORTRAITS[s.id]}
                    emoji={getInstrumentEmoji(s.instrument)}
                    size={40}
                    color={color}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-fantasy" style={{ color }}>{s.name}</span>
                  <div className="text-academy-cream/40 text-xs">{INSTRUMENTS[s.instrument].name} · {INSTRUMENTS[s.instrument].className}</div>
                </div>
                <button onClick={() => toggle(id)} className="text-rating-poor/70 hover:text-rating-poor text-xs flex-shrink-0">
                  Remove ✕
                </button>
              </div>
            );
          })}
          {selection.length === 0 && (
            <div className="text-academy-cream/30 text-xs italic pt-2 border-t border-white/5">
              Flying solo — add classmates below.
            </div>
          )}
        </div>

        {/* Roster */}
        <h2 className="fantasy-title text-sm text-academy-gold/70 uppercase tracking-widest mb-3">
          The Classmates
        </h2>
        <div className="space-y-2">
          {STUDENTS.map((s) => {
            const color = getInstrumentColor(s.instrument);
            const recruited = hasMet(s, character);
            const due = recruitmentDue(s, character);
            const inParty = selection.includes(s.id);
            const dupInstrument = !inParty && takenInstruments.has(s.instrument);
            const full = !inParty && selection.length >= npcSlots;
            const disabled = !recruited || dupInstrument || full;
            return (
              <div
                key={s.id}
                className={`card-panel py-3 px-4 flex items-center gap-4 ${!recruited ? 'opacity-40' : ''}`}
                style={inParty ? { borderColor: `${color}66` } : undefined}
              >
                <div
                  className="rounded-lg overflow-hidden flex-shrink-0"
                  style={{ background: `${color}18`, border: `1px solid ${color}40`, filter: recruited ? 'none' : 'grayscale(1)' }}
                >
                  <MaestroPortrait
                    src={STUDENT_PORTRAITS[s.id]}
                    emoji={getInstrumentEmoji(s.instrument)}
                    size={48}
                    color={color}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-fantasy" style={{ color: recruited ? color : undefined }}>{s.name}</span>
                    <span className="text-academy-cream/40 text-xs">{INSTRUMENTS[s.instrument].name}</span>
                  </div>
                  <div className="text-academy-cream/45 text-xs mt-0.5">
                    {recruited ? s.blurb
                      : due ? `Waiting to meet you — revisit Zone ${s.recruitZone}.`
                      : `Joins the band during Zone ${s.recruitZone}.`}
                  </div>
                  {dupInstrument && recruited && (
                    <div className="text-academy-gold/50 text-[10px] mt-0.5">
                      {s.instrument === character.instrument
                        ? 'Went their own way — but wished you well.'
                        : 'That chair is already filled.'}
                    </div>
                  )}
                </div>
                {recruited && (inParty ? (
                  <button onClick={() => toggle(s.id)} className="btn-secondary text-xs py-1.5 px-3 flex-shrink-0">
                    Remove
                  </button>
                ) : (
                  <button
                    onClick={() => !disabled && toggle(s.id)}
                    disabled={disabled}
                    className={`btn-primary text-xs py-1.5 px-3 flex-shrink-0 ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    Add
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
