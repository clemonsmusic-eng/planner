import { supabase } from '../supabase';
import { observeSaves } from '../storage';
import { ENTITIES, entityByKey, type Entity } from './entities';
import {
  clearBaseline, clearOutbox, dequeue, enqueue, getBaseline,
  readOutbox, setBaseline, setBaselines, type Pending,
} from './outbox';
import { errorDetail, errorSummary } from './errors';
import { countOutstanding, sweepFiles } from '../fileStore';
import { loadProjects } from '../storage';

/**
 * Keeping this device and the server in step.
 *
 * The shape is local-first and stays that way. Every read the app makes still
 * comes out of local storage, so the app opens and works with no signal
 * exactly as it did before; the engine's whole job is to push what changed up
 * and bring what changed down. Nothing here is on the path between a tap and
 * the screen updating.
 *
 * Order matters: push before pull, always. Draining first means the pull can
 * replace local wholesale without merge logic, because by then anything local
 * worth keeping has already been sent — or has stopped the push and is waiting
 * on the person to say what to do about it.
 */

export type SyncPhase =
  | 'off'
  /** Signed in, but this device has not yet been joined to the server. */
  | 'unlinked'
  | 'idle' | 'syncing' | 'offline' | 'error' | 'conflict';

export interface Conflict {
  entity: string;
  id: string;
  label: string;
  /** What this device holds, and what the server holds, for the sheet to show. */
  mine: unknown;
  theirs: unknown;
  describe: { mine: string; theirs: string };
}

export interface SyncState {
  phase: SyncPhase;
  pending: number;
  lastSyncedAt: string | null;
  error: string | null;
  /** What the database actually said, kept for when the summary is not enough. */
  errorDetail: string | null;
  conflicts: Conflict[];
  /** Files held on this device that the bucket has not got yet. */
  filesWaiting: number;
}

type Listener = (state: SyncState) => void;

const LAST_SYNC_KEY = 'st-planner-sync-last';
const ADOPTED_KEY = 'st-planner-sync-adopted';

/**
 * Whether this device has been joined to the server yet.
 *
 * The guard that stops the worst thing this engine could do. A pull replaces
 * local storage wholesale, which is safe once the two are in step and
 * catastrophic before: a device holding a year of projects, syncing for the
 * first time against a server that is still empty, would pull nothing over all
 * of it and call that success. So the first move is never automatic — somebody
 * says whether this device seeds the server or takes its copy from it, and
 * only then does anything sync on its own.
 */
export const isAdopted = (): boolean => localStorage.getItem(ADOPTED_KEY) === 'yes';

function markAdopted(): void {
  localStorage.setItem(ADOPTED_KEY, 'yes');
}

let state: SyncState = {
  phase: 'off',
  pending: 0,
  lastSyncedAt: null,
  error: null,
  errorDetail: null,
  conflicts: [],
  filesWaiting: 0,
};

const listeners = new Set<Listener>();

function emit(next: Partial<SyncState>) {
  state = { ...state, ...next };
  for (const l of listeners) l(state);
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
}

export const getSyncState = (): SyncState => state;

/** Called after a pull so the app can re-read local storage into React state. */
let onPulled: (() => void) | null = null;
export function onRemoteChange(fn: (() => void) | null): void {
  onPulled = fn;
}

// ─── What changed here ───────────────────────────────────────────────────────

/**
 * The last collection we saw for each entity, so a save can be diffed without
 * re-parsing local storage on every keystroke-adjacent write.
 */
const snapshots = new Map<string, Map<string, string>>();

const fingerprint = (entity: Entity, items: unknown[]) =>
  new Map(items.map((item, i) => [entity.id(item), JSON.stringify(entity.toRow(item, i))]));

function seedSnapshots() {
  for (const entity of ENTITIES) snapshots.set(entity.key, fingerprint(entity, entity.load()));
}

/** Work out what a save actually changed, and queue only that. */
function recordSave(key: string, after: unknown) {
  const entity = entityByKey.get(key);
  if (!entity) return;
  // appSettings is written one setting at a time, so the save hands us a value
  // rather than the collection; re-read it whole instead of trusting the arg.
  const items = key === 'appSettings' ? entity.load() : (after as unknown[]);
  const next = fingerprint(entity, items);
  const prev = snapshots.get(key) ?? new Map();

  const changes: Omit<Pending, 'at'>[] = [];
  for (const [id, row] of next) {
    if (prev.get(id) !== row) changes.push({ entity: key, id, op: 'upsert' });
  }
  for (const id of prev.keys()) {
    if (!next.has(id)) changes.push({ entity: key, id, op: 'delete' });
  }

  snapshots.set(key, next);
  if (changes.length === 0) return;
  enqueue(changes);
  emit({ pending: readOutbox().length });
  void schedulePush();
}

// ─── Pushing ─────────────────────────────────────────────────────────────────

/** A short settle, so a burst of edits leaves as one round of writes. */
let pushTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePush() {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { void sync(); }, 1200);
}

async function pushOne(pending: Pending): Promise<Conflict | null> {
  const entity = entityByKey.get(pending.entity);
  if (!entity || !supabase) return null;

  if (pending.op === 'delete') {
    const { error } = await supabase.from(entity.table).delete().eq('id', pending.id);
    if (error) throw error;
    return null;
  }

  const items = entity.load();
  const index = items.findIndex((i) => entity.id(i) === pending.id);
  // Queued, then deleted before it was ever sent. Nothing to do.
  if (index < 0) return null;
  const item = items[index];
  const row = entity.toRow(item, index);

  const baseline = getBaseline(pending.entity, pending.id);

  /*
   * Where a row carries a version, the update is conditional on the server
   * still holding the one we started from. Zero rows back means somebody else
   * moved it, which is the conflict — reported rather than resolved, because
   * only the person who made both edits knows which one matters.
   */
  if (entity.version && baseline) {
    const { data, error } = await supabase
      .from(entity.table)
      .update(row)
      .eq('id', pending.id)
      .eq('updated_at', baseline)
      .select('*');
    if (error) throw error;
    if (data && data.length > 0) {
      setBaseline(pending.entity, pending.id, (data[0] as any).updated_at);
      return null;
    }
    const { data: theirs } = await supabase
      .from(entity.table)
      .select('*')
      .eq('id', pending.id)
      .maybeSingle();
    // Gone from the server entirely: somebody deleted it while this device was
    // away. Treated as a conflict too, since silently recreating it would undo
    // a deliberate delete.
    return {
      entity: pending.entity,
      id: pending.id,
      label: entity.label,
      mine: item,
      theirs: theirs ? entity.fromRow(theirs as any) : null,
      describe: describe(entity, item, theirs ? entity.fromRow(theirs as any) : null),
    };
  }

  const { data, error } = await supabase.from(entity.table).upsert(row).select('*');
  if (error) throw error;
  if (data && data[0]) {
    setBaseline(pending.entity, pending.id, (data[0] as any).updated_at);
  }
  return null;
}

/** A line each for the two sides of a conflict, so the sheet can label them. */
function describe(entity: Entity, mine: any, theirs: any): { mine: string; theirs: string } {
  const line = (v: any) => {
    if (!v) return 'Deleted';
    const name = v.inputs?.clientName ?? v.name ?? v.company ?? entity.label;
    const when = v.updatedAt ? new Date(v.updatedAt).toLocaleString() : '';
    return when ? `${name} · edited ${when}` : String(name);
  };
  return { mine: line(mine), theirs: line(theirs) };
}

// ─── Pulling ─────────────────────────────────────────────────────────────────

async function pullAll(): Promise<void> {
  if (!supabase) return;
  for (const entity of ENTITIES) {
    // Only the collections the user reorders carry a sort column; asking for
    // it on the others is a 400, not an ignored hint.
    const query = supabase.from(entity.table).select('*');
    const { data, error } = await (entity.ordered
      ? query.order('sort_order', { ascending: true })
      : query);
    if (error) throw error;
    const rows = (data ?? []) as Record<string, any>[];
    entity.applyLocal(rows.map((r) => entity.fromRow(r)));
    setBaselines(rows.map((r) => ({ entity: entity.key, id: String(r.id), version: r.updated_at })));
  }
  // Local storage is now the server's copy, so the diff baseline has to be too
  // — otherwise the next save would queue every row as changed.
  seedSnapshots();
  localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  onPulled?.();
}

// ─── The round trip ──────────────────────────────────────────────────────────

let running: Promise<void> | null = null;

export function sync(): Promise<void> {
  if (!supabase || state.phase === 'off' || !isAdopted()) return Promise.resolve();
  if (running) return running;
  running = (async () => {
    emit({ phase: 'syncing', error: null, errorDetail: null });
    try {
      const conflicts: Conflict[] = [];
      const sent: Pending[] = [];
      for (const pending of readOutbox()) {
        const clash = await pushOne(pending);
        if (clash) conflicts.push(clash);
        else sent.push(pending);
      }
      dequeue(sent);

      if (conflicts.length > 0) {
        // The pull is held back on purpose: replacing local now would wipe the
        // very edit the person is being asked about.
        emit({ phase: 'conflict', conflicts, pending: readOutbox().length });
        return;
      }

      await pullAll();
      emit({
        phase: 'idle',
        conflicts: [],
        error: null,
        errorDetail: null,
        pending: readOutbox().length,
        lastSyncedAt: localStorage.getItem(LAST_SYNC_KEY),
      });

      /*
       * Files come last and do not fail the sync.
       *
       * They are big and slow next to a project document, and a photo that has
       * not gone up yet is a smaller problem than a schedule that has not — so
       * the schedule is never held up behind a hundred megabytes of pictures,
       * and a bucket that is briefly unreachable does not turn the whole round
       * trip red. What is outstanding is counted and said instead.
       */
      const swept = await sweepFiles(loadProjects()).catch(() => null);
      emit({ filesWaiting: swept ? swept.outstanding : await countOutstanding(loadProjects()) });
    } catch (e) {
      const detail = errorDetail(e);
      const offline = /fetch|network|load failed/i.test(detail) || !navigator.onLine;
      emit({
        phase: offline ? 'offline' : 'error',
        error: offline ? null : errorSummary(e),
        errorDetail: offline ? null : detail,
        pending: readOutbox().length,
      });
    } finally {
      running = null;
    }
  })();
  return running;
}

// ─── Resolving a conflict ────────────────────────────────────────────────────

/** Keep this device's copy: re-baseline to the server's version and push over it. */
export async function resolveKeepMine(conflict: Conflict): Promise<void> {
  if (!supabase) return;
  const entity = entityByKey.get(conflict.entity);
  if (!entity) return;
  const { data } = await supabase.from(entity.table).select('updated_at').eq('id', conflict.id).maybeSingle();
  setBaseline(conflict.entity, conflict.id, (data as any)?.updated_at);
  emit({ conflicts: state.conflicts.filter((c) => c !== conflict), phase: 'idle' });
  await sync();
}

/** Take the server's copy: drop the local change and let the pull bring it down. */
export async function resolveTakeTheirs(conflict: Conflict): Promise<void> {
  dequeue([{ entity: conflict.entity, id: conflict.id, op: 'upsert', at: '' }]);
  emit({
    conflicts: state.conflicts.filter((c) => c !== conflict),
    phase: 'idle',
    pending: readOutbox().length,
  });
  await sync();
}

// ─── First run ───────────────────────────────────────────────────────────────

/** Whether the server has anything in it yet. Decides which way the first sync runs. */
export async function serverIsEmpty(): Promise<boolean> {
  if (!supabase) return false;
  const { count } = await supabase.from('projects').select('id', { count: 'exact', head: true });
  const { count: team } = await supabase.from('team_members').select('id', { count: 'exact', head: true });
  return (count ?? 0) === 0 && (team ?? 0) === 0;
}

/**
 * Seed the server from this device.
 *
 * The one direction that is never automatic. Every device holds its own world
 * right now, and picking which one becomes everybody's is a decision with a
 * loser — so it is made once, by a person, on the machine they name.
 */
export async function uploadEverything(): Promise<void> {
  if (!supabase) return;
  emit({ phase: 'syncing', error: null });
  try {
    clearBaseline();
    for (const entity of ENTITIES) {
      const items = entity.load();
      if (items.length === 0) continue;
      const rows = items.map((item, i) => entity.toRow(item, i));
      const { data, error } = await supabase.from(entity.table).upsert(rows).select('*');
      if (error) throw error;
      setBaselines(((data ?? []) as any[]).map((r) => ({
        entity: entity.key, id: String(r.id), version: r.updated_at,
      })));
    }
    clearOutbox();
    seedSnapshots();
    markAdopted();
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    emit({ phase: 'idle', pending: 0, lastSyncedAt: localStorage.getItem(LAST_SYNC_KEY) });
    beginLive();
  } catch (e) {
    emit({ phase: 'error', error: errorSummary(e), errorDetail: errorDetail(e) });
  }
}

/**
 * Take the server's copy, replacing what is on this device.
 *
 * The other half of the first decision. Everything local for the shared
 * collections goes; photos, floor plans and the furniture inventory are on the
 * device rather than in these tables, so they are untouched either way.
 */
export async function adoptServer(): Promise<void> {
  if (!supabase) return;
  emit({ phase: 'syncing', error: null });
  try {
    clearOutbox();
    clearBaseline();
    await pullAll();
    markAdopted();
    emit({
      phase: 'idle',
      pending: 0,
      conflicts: [],
      lastSyncedAt: localStorage.getItem(LAST_SYNC_KEY),
    });
    beginLive();
  } catch (e) {
    emit({ phase: 'error', error: errorSummary(e), errorDetail: errorDetail(e) });
  }
}

// ─── Starting and stopping ───────────────────────────────────────────────────

let channel: { unsubscribe: () => void } | null = null;
let poll: ReturnType<typeof setInterval> | null = null;

/**
 * Begin syncing. Safe to call more than once.
 *
 * Live updates come over a websocket, with a slow poll behind them: a socket
 * that drops on a lift or a tunnel does not always say so, and a minute's
 * staleness is a better failure than an afternoon's.
 */
export async function start(): Promise<void> {
  if (!supabase) return;
  seedSnapshots();

  /*
   * An unadopted device watches and waits. Saves are not even observed yet:
   * queueing edits that an adopt-from-server is about to discard would be
   * misleading, and an upload sends everything regardless.
   */
  if (!isAdopted()) {
    emit({ phase: 'unlinked', pending: 0, conflicts: [], error: null, errorDetail: null });
    return;
  }

  emit({
    phase: 'idle',
    pending: readOutbox().length,
    lastSyncedAt: localStorage.getItem(LAST_SYNC_KEY),
  });
  beginLive();
  await sync();
}

/** Start listening and polling. Only ever called on an adopted device. */
function beginLive(): void {
  if (!supabase || channel) return;
  observeSaves(recordSave);

  const ch = supabase.channel('planner-sync');
  for (const entity of ENTITIES) {
    ch.on('postgres_changes', { event: '*', schema: 'public', table: entity.table }, () => {
      schedulePull();
    });
  }
  ch.subscribe();
  channel = ch;

  poll = setInterval(() => { void sync(); }, 60_000);
  window.addEventListener('online', onBackOnline);
}

export function stop(): void {
  observeSaves(null);
  channel?.unsubscribe();
  channel = null;
  if (poll) clearInterval(poll);
  poll = null;
  window.removeEventListener('online', onBackOnline);
  emit({ phase: 'off', conflicts: [] });
}

const onBackOnline = () => { void sync(); };

/*
 * A change of our own comes back down the socket as an event, so a pull is
 * debounced rather than immediate — otherwise every push would trigger one.
 */
let pullTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePull() {
  if (pullTimer) clearTimeout(pullTimer);
  pullTimer = setTimeout(() => { void sync(); }, 800);
}
