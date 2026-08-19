import { supabase } from './supabase';
import { allFileIds, normalizeDocuments } from './documents';
import type { Project } from '../types';

/**
 * Blob storage for project attachments.
 *
 * File metadata (name, size, which folder) rides along with the project, but
 * the bytes live here. A single job's photo set runs to tens of megabytes
 * across the eight folders, which blows the ~5MB localStorage quota
 * immediately — IndexedDB has room for it and stores Blobs directly rather
 * than base64, so nothing is inflated by a third on the way in.
 *
 * With a server configured there are two tiers. IndexedDB is the cache and the
 * offline copy; the bucket is where a file goes so other devices can have it.
 * Downloads are lazy on purpose: the metadata for a whole job syncs in
 * kilobytes, and a phone should fetch the photo somebody taps, not the three
 * hundred megabytes nobody asked for.
 */

const DB_NAME = 'st-planner-files';
const DB_VERSION = 1;
const STORE = 'files';
const BUCKET = 'project-files';

/** Which blobs are known to be in the bucket, so we do not re-upload them. */
const UPLOADED_KEY = 'st-planner-files-uploaded';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

// ─── What is already up there ────────────────────────────────────────────────

function readUploaded(): Set<string> {
  try {
    const raw = localStorage.getItem(UPLOADED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeUploaded(ids: Set<string>): void {
  try {
    localStorage.setItem(UPLOADED_KEY, JSON.stringify([...ids]));
  } catch {
    /* full; the worst case is a file uploaded twice */
  }
}

export const isUploaded = (id: string): boolean => readUploaded().has(id);

function markUploaded(id: string, yes: boolean): void {
  const all = readUploaded();
  if (yes) all.add(id); else all.delete(id);
  writeUploaded(all);
}

/** `<project>/<file>` — the path the storage rules read the project out of. */
const pathFor = (projectId: string, id: string) => `${projectId}/${id}`;

// ─── Local ───────────────────────────────────────────────────────────────────

export async function putFileLocal(id: string, blob: Blob): Promise<void> {
  await tx('readwrite', (s) => s.put(blob, id));
}

async function getFileLocal(id: string): Promise<Blob | null> {
  try {
    return (await tx<Blob | undefined>('readonly', (s) => s.get(id))) ?? null;
  } catch {
    return null;
  }
}

// ─── Local plus the bucket ───────────────────────────────────────────────────

/**
 * Store a file, and send it up where there is somewhere to send it.
 *
 * The local write happens first and is what the caller waits on, so adding a
 * photo in a basement with no signal works and looks instant. The upload is
 * attempted after; if it fails the file stays queued by omission — it is
 * simply not in the uploaded set, and the next sweep picks it up.
 */
export async function putFile(id: string, blob: Blob, projectId?: string): Promise<void> {
  await putFileLocal(id, blob);
  if (!supabase || !projectId) return;
  void uploadFile(id, blob, projectId);
}

async function uploadFile(id: string, blob: Blob, projectId: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(pathFor(projectId, id), blob, { upsert: true, contentType: blob.type || undefined });
  if (error) return false;
  markUploaded(id, true);
  return true;
}

/**
 * The file's bytes, from here if we have them and from the bucket if not.
 *
 * A download is cached on the way through, so the second look at a photo is
 * as quick as the first was on the device that took it, and so a job opened
 * once in the office is readable later with no signal.
 */
export async function getFile(id: string, projectId?: string): Promise<Blob | null> {
  const local = await getFileLocal(id);
  if (local) return local;
  if (!supabase || !projectId) return null;
  const { data, error } = await supabase.storage.from(BUCKET).download(pathFor(projectId, id));
  if (error || !data) return null;
  await putFileLocal(id, data).catch(() => {
    /* out of room to cache it; the blob still returns for this view */
  });
  markUploaded(id, true);
  return data;
}

export async function deleteFile(id: string, projectId?: string): Promise<void> {
  try {
    await tx('readwrite', (s) => s.delete(id));
  } catch {
    // A missing blob is not worth failing the delete of its metadata over.
  }
  markUploaded(id, false);
  if (!supabase || !projectId) return;
  await supabase.storage.from(BUCKET).remove([pathFor(projectId, id)]).catch(() => {});
}

/**
 * Object URL for a stored file. Callers own the URL and must revoke it when the
 * view goes away, or the blob stays pinned in memory.
 */
export async function getFileUrl(id: string, projectId?: string): Promise<string | null> {
  const blob = await getFile(id, projectId);
  return blob ? URL.createObjectURL(blob) : null;
}

/** True when the browser gave us IndexedDB at all (private modes sometimes don't). */
export function isFileStoreAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

// ─── Catching up ─────────────────────────────────────────────────────────────

export interface FileSweepResult {
  uploaded: number;
  failed: number;
  /** Held here but not up there yet — what a "3 files waiting" line counts. */
  outstanding: number;
}

/**
 * Send up anything this device holds that the bucket does not.
 *
 * Driven from the projects rather than from a queue of its own. The file
 * metadata already syncs, so the list of files that ought to exist is derivable
 * — which means a device that was uploading when the battery died, or that
 * predates any of this, is caught up by the same sweep as one that added a
 * photo a second ago. Nothing to keep in step, nothing to lose.
 */
export async function sweepFiles(
  projects: Project[],
  onProgress?: (done: number, total: number) => void
): Promise<FileSweepResult> {
  if (!supabase) return { uploaded: 0, failed: 0, outstanding: 0 };
  const wanted = filesOf(projects);

  const already = readUploaded();
  const todo = wanted.filter((f) => !already.has(f.id));
  let uploaded = 0;
  let failed = 0;

  for (const [i, file] of todo.entries()) {
    const blob = await getFileLocal(file.id);
    // Not on this device: it belongs to someone else's upload, and will be
    // fetched on demand if anyone here opens it.
    if (!blob) continue;
    if (await uploadFile(file.id, blob, file.projectId)) uploaded++;
    else failed++;
    onProgress?.(i + 1, todo.length);
  }

  return { uploaded, failed, outstanding: failed };
}

/**
 * Every file the projects say exists, paired with the job that owns it.
 *
 * Taken from the same helper the delete path uses, so a folder added later is
 * swept without anyone remembering to add it here too.
 */
function filesOf(projects: Project[]): { id: string; projectId: string }[] {
  return projects.flatMap((project) =>
    allFileIds(normalizeDocuments(project.documents)).map((id) => ({ id, projectId: project.id }))
  );
}

/** How many files this device holds that the bucket has not got. */
export async function countOutstanding(projects: Project[]): Promise<number> {
  if (!supabase) return 0;
  const already = readUploaded();
  let n = 0;
  for (const file of filesOf(projects)) {
    if (already.has(file.id)) continue;
    if (await getFileLocal(file.id)) n++;
  }
  return n;
}
