import { PHOTO_FOLDERS, type FurnitureItem, type PhotoFolder, type ProjectDocuments, type ProjectFile } from '../types';

/** A project that has never had documents opened still needs a shape to render. */
export function emptyDocuments(): ProjectDocuments {
  return { furniture: [], floorPlans: [], photos: {}, supplyUsage: [] };
}

/** Tolerate documents persisted before a field existed. */
export function normalizeDocuments(docs: ProjectDocuments | null | undefined): ProjectDocuments {
  if (!docs) return emptyDocuments();
  return {
    furniture: docs.furniture ?? [],
    floorPlans: docs.floorPlans ?? [],
    photos: docs.photos ?? {},
    // Every read and write of a project's documents passes through here, so a
    // field missing from this list is silently dropped on save.
    supplyUsage: docs.supplyUsage ?? [],
  };
}

export function emptyFurnitureItem(): FurnitureItem {
  return {
    id: `fi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    item: '',
    width: '',
    depth: '',
    height: '',
    wishlist: false,
    originLocation: '',
    destinationLocation: '',
    comments: '',
  };
}

export function photosIn(docs: ProjectDocuments, folder: PhotoFolder): ProjectFile[] {
  return docs.photos[folder] ?? [];
}

export function totalPhotoCount(docs: ProjectDocuments): number {
  return PHOTO_FOLDERS.reduce((sum, f) => sum + photosIn(docs, f).length, 0);
}

/** Every blob id a project owns, for cleaning up IndexedDB when it's deleted. */
export function allFileIds(docs: ProjectDocuments): string[] {
  return [
    ...docs.floorPlans.map((f) => f.id),
    ...PHOTO_FOLDERS.flatMap((f) => photosIn(docs, f).map((p) => p.id)),
  ];
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
