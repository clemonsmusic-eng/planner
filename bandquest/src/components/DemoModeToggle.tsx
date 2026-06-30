import { useUiStore } from '../store/uiStore';

// Toggles Demo Mode: microphone performances become a silent tap-timing
// mini-game, so the whole game is playable with no audible input.
export default function DemoModeToggle({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  const demoMode = useUiStore((s) => s.demoMode);
  const toggle = useUiStore((s) => s.toggleDemoMode);
  return (
    <button
      onClick={toggle}
      title="Play without a microphone — performance challenges become a tap-timing mini-game"
      className={`inline-flex items-center gap-2 transition-colors ${className}`}
    >
      <span className={`relative inline-block w-9 h-5 rounded-full transition-colors flex-shrink-0 ${demoMode ? 'bg-academy-gold/70' : 'bg-academy-cream/20'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-academy-dark transition-all ${demoMode ? 'left-4' : 'left-0.5'}`} />
      </span>
      <span className={`text-xs font-fantasy ${demoMode ? 'text-academy-gold' : 'text-academy-cream/50'}`}>
        {compact ? '🎮 No-mic' : <>🎮 Demo Mode {demoMode ? 'ON' : 'OFF'} <span className="text-academy-cream/30">· no microphone</span></>}
      </span>
    </button>
  );
}
