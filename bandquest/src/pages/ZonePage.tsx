import { useParams, useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { getZone, quarterLabelShort } from '../lib/zones';
import Zone1Page from './zones/Zone1Page';
import Zone2Page from './zones/Zone2Page';
import Zone3Page from './zones/Zone3Page';
import Zone4Page from './zones/Zone4Page';
import Zone5Page from './zones/Zone5Page';
import Zone6Page from './zones/Zone6Page';
import Zone7Page from './zones/Zone7Page';
import Zone8Page from './zones/Zone8Page';
import AssaultZonePage from './zones/AssaultZonePage';
import { ZONE9_CONFIG, ZONE10_CONFIG, ZONE11_CONFIG } from './zones/act3Configs';
import Zone12Page from './zones/Zone12Page';

export default function ZonePage() {
  const { zoneId } = useParams<{ zoneId: string }>();
  const { character } = useGameStore();
  const navigate = useNavigate();

  if (!character) return null;

  const id = parseInt(zoneId ?? '1', 10);

  if (id > character.currentZone) {
    navigate('/hub');
    return null;
  }

  switch (id) {
    case 1: return <Zone1Page />;
    case 2: return <Zone2Page />;
    case 3: return <Zone3Page />;
    case 4: return <Zone4Page />;
    case 5: return <Zone5Page />;
    case 6: return <Zone6Page />;
    case 7: return <Zone7Page />;
    case 8: return <Zone8Page />;
    case 9: return <AssaultZonePage cfg={ZONE9_CONFIG} />;
    case 10: return <AssaultZonePage cfg={ZONE10_CONFIG} />;
    case 11: return <AssaultZonePage cfg={ZONE11_CONFIG} />;
    case 12: return <Zone12Page />;
    default: {
      const zone = getZone(id);
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
          <div className="text-5xl mb-4">{zone?.emoji ?? '🔒'}</div>
          <div className="text-academy-gold/50 text-[10px] uppercase tracking-[0.3em] font-fantasy mb-1">
            {zone ? `Zone ${zone.id} · Act ${zone.act} · ${quarterLabelShort(zone)}` : `Zone ${id}`}
          </div>
          <h1 className="fantasy-title text-2xl mb-3">{zone?.name ?? `Zone ${id}`}</h1>
          {zone && (
            <p className="text-academy-cream/55 text-sm mb-2 max-w-sm leading-relaxed italic">
              {zone.flavor}
            </p>
          )}
          <p className="text-academy-cream/40 text-xs mb-6">
            This zone is still being composed. Check back soon.
          </p>
          <button onClick={() => navigate('/hub')} className="btn-secondary">
            ← Return to Hub
          </button>
        </div>
      );
    }
  }
}
