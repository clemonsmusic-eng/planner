/**
 * Blob storage for project attachments.
 *
 * File metadata (name, size, which folder) rides along with the project in
 * localStorage, but the bytes live here in IndexedDB. A single job's photo set
 * runs to tens of megabytes across the eight folders, which blows the ~5MB
 * localStorage quota immediately — IndexedDB has room for it and stores Blobs
 * directly rather than base64, so nothing is inflated by a third on the way in.
 */

const DB_NAME = 'st-planner-files';
const DB_VERSION = 1;
const STORE = 'files';

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

export async function putFile(id: string, blob: Blob): Promise<void> {
  await tx('readwrite', (s) => s.put(blob, id));
}

export async function getFile(id: string): Promise<Blob | null> {
  try {
    return (await tx<Blob | undefined>('readonly', (s) => s.get(id))) ?? null;
  } catch {
    return null;
  }
}

export async function deleteFile(id: string): Promise<void> {
  try {
    await tx('readwrite', (s) => s.delete(id));
  } catch {
    // A missing blob is not worth failing the delete of its metadata over.
  }
}

/**
 * Object URL for a stored file. Callers own the URL and must revoke it when the
 * view goes away, or the blob stays pinned in memory.
 */
export async function getFileUrl(id: string): Promise<string | null> {
  const blob = await getFile(id);
  return blob ? URL.createObjectURL(blob) : null;
}

/** True when the browser gave us IndexedDB at all (private modes sometimes don't). */
export function isFileStoreAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}
