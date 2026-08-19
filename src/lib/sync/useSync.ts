import { useEffect, useState } from 'react';
import { getSyncState, subscribe, type SyncState } from './engine';

/** The engine's status, as React state. */
export function useSync(): SyncState {
  const [state, setState] = useState<SyncState>(getSyncState);
  useEffect(() => subscribe(setState), []);
  return state;
}

/** One short line for a status pill: what is happening, in the user's terms. */
export function syncSummary(state: SyncState): string {
  switch (state.phase) {
    case 'off': return 'Not syncing';
    case 'syncing': return 'Syncing…';
    case 'offline':
      return state.pending > 0
        ? `Offline · ${state.pending} change${state.pending === 1 ? '' : 's'} waiting`
        : 'Offline';
    case 'conflict': return 'Needs your decision';
    case 'error': return 'Sync problem';
    case 'unlinked': return 'This device is not joined yet';
    case 'idle':
      if (state.pending > 0) return `${state.pending} change${state.pending === 1 ? '' : 's'} to send`;
      return state.lastSyncedAt
        ? `Up to date · ${new Date(state.lastSyncedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
        : 'Up to date';
  }
}
