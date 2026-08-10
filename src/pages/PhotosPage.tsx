import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { Card } from '../components/Card';
import { FileList } from '../components/FileList';
import { ProjectDocHeader, NoProjectState } from '../components/ProjectDocHeader';
import { normalizeDocuments, photosIn, totalPhotoCount } from '../lib/documents';
import { PHOTO_FOLDERS, type PhotoFolder } from '../types';

/**
 * Project photos, split into the eight folders a job moves through. The list of
 * folders is the top level; opening one shows its grid.
 */
export function PhotosPage() {
  const { activeProject, updateDocuments } = useApp();
  const [openFolder, setOpenFolder] = useState<PhotoFolder | null>(null);

  if (!activeProject) {
    return <NoProjectState title="Photos" message="Pick a project to see its photos." />;
  }

  const docs = normalizeDocuments(activeProject.documents);

  if (openFolder) {
    const files = photosIn(docs, openFolder);
    return (
      <div className="flex flex-col h-full">
        <ProjectDocHeader
          title={openFolder}
          subtitle={`${files.length} ${files.length === 1 ? 'photo' : 'photos'}`}
          onBack={() => setOpenFolder(null)}
          backLabel="Photos"
        />
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <FileList
            files={files}
            accept="image/*"
            emptyLabel={`No photos in ${openFolder} yet.`}
            addLabel="+ Add Photos"
            onAdd={(added) =>
              updateDocuments(activeProject.id, (d) => ({
                ...d,
                photos: { ...d.photos, [openFolder]: [...(d.photos[openFolder] ?? []), ...added] },
              }))
            }
            onRemove={(id) =>
              updateDocuments(activeProject.id, (d) => ({
                ...d,
                photos: {
                  ...d.photos,
                  [openFolder]: (d.photos[openFolder] ?? []).filter((f) => f.id !== id),
                },
              }))
            }
          />
        </div>
      </div>
    );
  }

  const total = totalPhotoCount(docs);

  return (
    <div className="flex flex-col h-full">
      <ProjectDocHeader
        title="Photos"
        subtitle={`${total} ${total === 1 ? 'photo' : 'photos'} across ${PHOTO_FOLDERS.length} folders`}
      />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {PHOTO_FOLDERS.map((folder) => {
          const count = photosIn(docs, folder).length;
          return (
            <Card key={folder} className="overflow-hidden">
              <button
                onClick={() => setOpenFolder(folder)}
                className="w-full flex items-center gap-3 px-4 py-3.5 min-h-[56px] text-left active:bg-ios-gray-50"
              >
                <span
                  className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    count > 0 ? 'bg-teal-50 text-teal-600' : 'bg-ios-gray-100 text-ios-gray-400'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path d="M3.25 4A2.25 2.25 0 001 6.25v7.5A2.25 2.25 0 003.25 16h13.5A2.25 2.25 0 0019 13.75v-7.5A2.25 2.25 0 0016.75 4H3.25zm10 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM3 13.5l3.75-3.75 2.5 2.5 3-3L17 13.5v.25a.75.75 0 01-.75.75H3.75A.75.75 0 013 13.75v-.25z" />
                  </svg>
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-teal-900 truncate">{folder}</span>
                  <span className="block text-xs text-ios-gray-500">
                    {count === 0 ? 'Empty' : `${count} ${count === 1 ? 'photo' : 'photos'}`}
                  </span>
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-ios-gray-400 flex-shrink-0">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
