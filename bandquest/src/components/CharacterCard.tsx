import type { Character, InstrumentDef } from '../types/game';

interface Props {
  character: Character;
  instrument: InstrumentDef;
  color: string;
}

export default function CharacterCard({ character, instrument, color }: Props) {
  return (
    <div
      className="card-panel relative overflow-hidden"
      style={{ borderColor: `${color}40` }}
    >
      {/* Color accent strip */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: color }} />

      <div className="flex items-start gap-4 pt-2">
        {/* Avatar placeholder */}
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl flex-shrink-0 border"
          style={{ backgroundColor: `${color}15`, borderColor: `${color}40` }}
        >
          {getInstrumentEmoji(character.instrument)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="fantasy-title text-lg truncate">{character.displayName}</span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-fantasy flex-shrink-0"
              style={{ backgroundColor: `${color}20`, color }}
            >
              Lv.{character.level}
            </span>
          </div>
          <div className="text-academy-cream/60 text-xs mb-1">
            {instrument.className} · {instrument.name}
          </div>
          <div className="text-academy-cream/40 text-xs">
            Zone {character.currentZone} · {character.resonancePoints} RP
          </div>
        </div>

        {/* HP indicator */}
        <div className="text-right flex-shrink-0">
          <div className="text-xs text-academy-cream/40 mb-1">HP</div>
          <div className="font-fantasy text-sm" style={{ color }}>
            {character.hp}/{character.maxHp}
          </div>
        </div>
      </div>
    </div>
  );
}

function getInstrumentEmoji(id: string): string {
  const map: Record<string, string> = {
    flute: '🪈', clarinet: '🎵', alto_sax: '🎷',
    trumpet: '🎺', trombone: '📯', euphonium: '🎶',
    percussion: '🥁', french_horn: '📯', tuba: '🎺',
    oboe: '🪘', bassoon: '🎵',
  };
  return map[id] ?? '🎵';
}
