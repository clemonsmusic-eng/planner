import { useEffect, useState } from 'react';
import { useSync, syncSummary } from '../lib/sync/useSync';
import { adoptServer, serverIsEmpty, sync, uploadEverything, type Conflict } from '../lib/sync/engine';
import { resolveKeepMine, resolveTakeTheirs } from '../lib/sync/engine';
import { ConfirmSheet } from './ConfirmSheet';

/**
 * Where syncing is explained and, once, started.
 *
 * The first move is the only one that is not automatic. Every device holds its
 * own world until now, and deciding which one becomes everybody's has a loser
 * — so it is made deliberately, by a person, on the machine they name, and
 * after that nobody thinks about it again.
 */
export function SyncPanel() {
  const state = useSync();
  const [empty, setEmpty] = useState<boolean | null>(null);
  const [confirm, setConfirm] = useState<'upload' | 'adopt' | null>(null);
  const unlinked = state.phase === 'unlinked';

  useEffect(() => {
    let live = true;
    void serverIsEmpty().then((v) => { if (live) setEmpty(v); });
    return () => { live = false; };
  }, [state.lastSyncedAt]);

  const tone =
    state.phase === 'conflict' || state.phase === 'error'
      ? 'bg-red-50 text-red-700 border-red-200'
      : state.phase === 'offline'
      ? 'bg-amber-50 text-amber-800 border-amber-200'
      : 'bg-teal-50 text-teal-800 border-teal-200';

  return (
    <div className="px-4 py-3 space-y-4">
      <div className={`rounded-xl border px-3 py-2.5 ${tone}`}>
        <p className="text-sm font-semibold">{syncSummary(state)}</p>
        {state.error && <p className="text-xs mt-0.5 break-words">{state.error}</p>}
        {state.phase === 'offline' && (
          <p className="text-xs mt-0.5">
            Everything still works. What you change here goes up when the signal comes back.
          </p>
        )}
      </div>

      {state.conflicts.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-ios-gray-500">
            Changed in two places
          </h4>
          {state.conflicts.map((c) => (
            <ConflictRow key={`${c.entity} ${c.id}`} conflict={c} />
          ))}
        </div>
      )}

      {/*
        The one decision nobody can be spared. Until it is made this device
        syncs nothing at all, because the alternative — guessing — is a pull
        that quietly replaces a year of projects with an empty server, or an
        upload that does the same in the other direction.
      */}
      {unlinked && (
        <div className="rounded-xl border border-dashed border-ios-gray-300 px-3 py-3 space-y-3">
          <div>
            <p className="text-sm font-semibold text-teal-900">Join this device</p>
            <p className="text-xs text-ios-gray-600 leading-snug mt-0.5">
              {empty === true
                ? 'Nothing has been uploaded yet. Start from the device holding the projects everyone should have — usually the office computer — and the rest take their copy from it.'
                : 'The server already has data. Take its copy unless this is the device whose projects everyone should be working from.'}
            </p>
          </div>
          <button
            onClick={() => setConfirm('upload')}
            disabled={state.phase === 'syncing'}
            className="w-full min-h-[44px] rounded-xl bg-teal-600 text-white font-semibold disabled:opacity-50"
          >
            Upload this device to the server
          </button>
          <button
            onClick={() => setConfirm('adopt')}
            disabled={state.phase === 'syncing'}
            className="w-full min-h-[44px] rounded-xl border border-ios-gray-300 text-teal-700 font-semibold disabled:opacity-50"
          >
            Use the server's copy instead
          </button>
        </div>
      )}

      {!unlinked && state.phase !== 'off' && (
        <button
          onClick={() => void sync()}
          disabled={state.phase === 'syncing'}
          className="w-full min-h-[44px] rounded-xl border border-ios-gray-300 text-teal-700 font-semibold disabled:opacity-50"
        >
          {state.phase === 'syncing' ? 'Syncing…' : 'Sync now'}
        </button>
      )}

      <p className="text-[11px] text-ios-gray-500 leading-snug">
        Projects, the team, the contact book and everything in Settings are shared. Photos, floor
        plans and the furniture inventory are still only on the device they were added to.
      </p>

      {confirm === 'upload' && (
        <ConfirmSheet
          title="Upload this device"
          message="Everything on this device becomes the shared copy. Other devices replace what they hold with it when they join. Do this from the machine with the projects you want to keep."
          confirmLabel="Upload"
          onConfirm={() => { setConfirm(null); void uploadEverything(); }}
          onClose={() => setConfirm(null)}
        />
      )}

      {confirm === 'adopt' && (
        <ConfirmSheet
          title="Use the server's copy"
          message="Projects, the team, the contact book and Settings on this device are replaced by what is on the server. Anything here that was never uploaded is lost. Photos, floor plans and the furniture inventory stay where they are."
          confirmLabel="Replace this device"
          onConfirm={() => { setConfirm(null); void adoptServer(); }}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

/**
 * One thing changed in two places at once.
 *
 * Both sides are named and dated rather than diffed. A schedule is rebuilt
 * whole on every replan, so a field-by-field comparison would list every shift
 * as different and tell nobody anything; what actually decides it is which
 * edit the person remembers making.
 */
function ConflictRow({ conflict }: { conflict: Conflict }) {
  const [busy, setBusy] = useState(false);
  const gone = conflict.theirs === null;

  async function choose(keepMine: boolean) {
    setBusy(true);
    await (keepMine ? resolveKeepMine(conflict) : resolveTakeTheirs(conflict));
    setBusy(false);
  }

  return (
    <div className="rounded-xl border border-red-200 bg-white px-3 py-2.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-ios-gray-500">{conflict.label}</p>
      <div className="mt-1.5 space-y-1 text-sm">
        <p className="text-teal-900">
          <span className="font-semibold">This device:</span> {conflict.describe.mine}
        </p>
        <p className="text-teal-900">
          <span className="font-semibold">Server:</span>{' '}
          {gone ? 'Deleted by someone else' : conflict.describe.theirs}
        </p>
      </div>
      <div className="flex gap-2 mt-2.5">
        <button
          onClick={() => void choose(true)}
          disabled={busy}
          className="flex-1 min-h-[40px] rounded-lg bg-teal-600 text-white text-sm font-semibold disabled:opacity-50"
        >
          Keep mine
        </button>
        <button
          onClick={() => void choose(false)}
          disabled={busy}
          className="flex-1 min-h-[40px] rounded-lg border border-ios-gray-300 text-ios-gray-700 text-sm font-semibold disabled:opacity-50"
        >
          {gone ? 'Accept the delete' : 'Take theirs'}
        </button>
      </div>
    </div>
  );
}
