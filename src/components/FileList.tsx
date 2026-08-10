import { useEffect, useRef, useState } from 'react';
import { Card } from './Card';
import { ConfirmSheet } from './ConfirmSheet';
import { deleteFile, getFileUrl, putFile } from '../lib/fileStore';
import { formatFileSize } from '../lib/documents';
import type { ProjectFile } from '../types';

/**
 * Upload / list / preview / delete for one folder of attachments.
 *
 * Files are held as Blobs in IndexedDB; only the metadata passed in and out of
 * here reaches localStorage with the project. Object URLs are created lazily
 * for whatever is on screen and revoked when this unmounts.
 */
export function FileList({
  files,
  accept,
  emptyLabel,
  addLabel,
  onAdd,
  onRemove,
}: {
  files: ProjectFile[];
  /** File input accept string, e.g. 'application/pdf' or 'image/*'. */
  accept: string;
  emptyLabel: string;
  addLabel: string;
  onAdd: (added: ProjectFile[]) => void;
  onRemove: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ProjectFile | null>(null);
  const [preview, setPreview] = useState<{ file: ProjectFile; url: string } | null>(null);

  const isImages = accept.startsWith('image');

  async function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    setBusy(true);
    setError(null);
    const added: ProjectFile[] = [];
    try {
      for (const file of Array.from(list)) {
        const id = `f-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        await putFile(id, file);
        added.push({
          id,
          name: file.name,
          type: file.type,
          size: file.size,
          addedAt: new Date().toISOString(),
        });
      }
      onAdd(added);
    } catch {
      // Quota or a private-mode browser with IndexedDB disabled. Roll back the
      // blobs that did land so we don't leave orphans behind the metadata.
      for (const a of added) await deleteFile(a.id);
      setError("Couldn't save — the browser is out of storage for this site.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function openPreview(file: ProjectFile) {
    const url = await getFileUrl(file.id);
    if (url) setPreview({ file, url });
    else setError("That file's contents are missing.");
  }

  function closePreview() {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  }

  return (
    <>
      <div className="space-y-2">
        {error && (
          <div className="px-3 py-2.5 rounded-xl bg-red-50 border border-red-200">
            <p className="text-xs text-red-800">{error}</p>
          </div>
        )}

        {files.length === 0 && !busy ? (
          <div className="text-center py-12 px-6">
            <p className="text-ios-gray-600 text-sm">{emptyLabel}</p>
          </div>
        ) : isImages ? (
          <div className="grid grid-cols-3 gap-2">
            {files.map((file) => (
              <Thumbnail key={file.id} file={file} onOpen={() => openPreview(file)} />
            ))}
          </div>
        ) : (
          files.map((file) => (
            <Card key={file.id} className="flex items-center gap-3 px-3 py-3">
              <span className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-3.622-3.622A1.5 1.5 0 0011.88 2H4.5zm3 8.75a.75.75 0 01.75-.75h3.5a.75.75 0 010 1.5h-3.5a.75.75 0 01-.75-.75zm.75 2.25a.75.75 0 000 1.5h3.5a.75.75 0 000-1.5h-3.5z" clipRule="evenodd" />
                </svg>
              </span>
              <button onClick={() => openPreview(file)} className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-teal-900 truncate">{file.name}</p>
                <p className="text-xs text-ios-gray-500">{formatFileSize(file.size)}</p>
              </button>
              <button
                onClick={() => setConfirmDelete(file)}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-ios-gray-400 active:bg-red-50 active:text-red-600 flex-shrink-0"
                aria-label={`Delete ${file.name}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4z" clipRule="evenodd" />
                </svg>
              </button>
            </Card>
          ))
        )}

        {busy && <p className="text-center text-sm text-ios-gray-500 py-3">Saving…</p>}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="w-full py-3 rounded-xl border border-dashed border-teal-300 text-teal-600 font-semibold text-sm min-h-[44px] active:bg-teal-50 disabled:opacity-40"
        >
          {addLabel}
        </button>
      </div>

      {preview && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black">
          <div
            className="flex items-center gap-2 px-4 flex-shrink-0"
            style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: '12px' }}
          >
            <p className="flex-1 min-w-0 text-sm text-white truncate">{preview.file.name}</p>
            {/* The grid tiles are the whole tap target, so deleting a photo
                happens here rather than on the tile itself. */}
            <button
              onClick={() => setConfirmDelete(preview.file)}
              className="w-9 h-9 flex items-center justify-center text-white active:opacity-60 flex-shrink-0"
              aria-label={`Delete ${preview.file.name}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4z" clipRule="evenodd" />
              </svg>
            </button>
            <button onClick={closePreview} className="text-white font-semibold text-sm px-2 py-1">
              Done
            </button>
          </div>
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-2 gap-3">
            {preview.file.type.startsWith('image/') ? (
              <img src={preview.url} alt={preview.file.name} className="max-w-full max-h-full object-contain" />
            ) : (
              <>
                <iframe title={preview.file.name} src={preview.url} className="w-full flex-1 min-h-0 bg-white rounded-lg" />
                {/*
                  iOS Safari renders a blank frame for a PDF in an iframe, so
                  there's always a way out to the system viewer.
                */}
                <a
                  href={preview.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-shrink-0 px-4 py-2.5 rounded-xl bg-white/15 text-white text-sm font-semibold active:opacity-70"
                >
                  Open in new tab
                </a>
              </>
            )}
          </div>
        </div>
      )}

      {/* Renders after the preview because both sit at z-[60] — the later one
          paints on top, and this can be opened from inside the preview. */}
      {confirmDelete && (
        <ConfirmSheet
          title="Delete file"
          message={`Delete ${confirmDelete.name}? This can't be undone.`}
          confirmLabel="Delete"
          onConfirm={() => {
            deleteFile(confirmDelete.id);
            onRemove(confirmDelete.id);
            if (preview?.file.id === confirmDelete.id) closePreview();
            setConfirmDelete(null);
          }}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </>
  );
}

/** Grid tile that loads its own object URL and revokes it on unmount. */
function Thumbnail({ file, onOpen }: { file: ProjectFile; onOpen: () => void }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    let made: string | null = null;
    getFileUrl(file.id).then((u) => {
      if (!live) {
        if (u) URL.revokeObjectURL(u);
        return;
      }
      made = u;
      setUrl(u);
    });
    return () => {
      live = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [file.id]);

  return (
    <button
      onClick={onOpen}
      className="aspect-square rounded-xl overflow-hidden bg-ios-gray-100 active:opacity-70"
      aria-label={`Open ${file.name}`}
    >
      {url ? (
        <img src={url} alt={file.name} className="w-full h-full object-cover" />
      ) : (
        <span className="w-full h-full flex items-center justify-center text-[10px] text-ios-gray-400">…</span>
      )}
    </button>
  );
}
