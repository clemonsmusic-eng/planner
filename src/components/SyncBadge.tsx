import { useSync, syncSummary } from '../lib/sync/useSync';

/**
 * A word about syncing, wherever the access level is shown.
 *
 * Only when there is something to say. A Team Member cannot open Settings, so
 * the sync panel is not somewhere they can go looking — and they are exactly
 * the person most likely to be standing in a basement working from a plan that
 * stopped updating an hour ago.
 */
export function SyncBadge() {
  const state = useSync();
  if (state.phase === 'off' || state.phase === 'idle' || state.phase === 'syncing') return null;

  const tone =
    state.phase === 'conflict' || state.phase === 'error'
      ? 'text-red-600'
      : 'text-amber-700';

  return (
    <span className={`flex items-center gap-1 text-[11px] font-semibold ${tone}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
      {syncSummary(state)}
    </span>
  );
}
