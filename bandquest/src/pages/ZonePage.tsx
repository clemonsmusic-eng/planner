import { useParams, useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import Zone1Page from './zones/Zone1Page';

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
    case 1:
      return <Zone1Page />;
    default:
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="fantasy-title text-2xl mb-2">Zone {id}</h1>
          <p className="text-academy-cream/60 text-sm mb-6">
            This zone is under construction. Check back soon.
          </p>
          <button onClick={() => navigate('/hub')} className="btn-secondary">
            ← Return to Hub
          </button>
        </div>
      );
  }
}
