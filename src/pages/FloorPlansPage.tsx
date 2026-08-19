import { useApp } from '../store/AppContext';
import { FileList } from '../components/FileList';
import { ProjectDocHeader, NoProjectState } from '../components/ProjectDocHeader';
import { normalizeDocuments } from '../lib/documents';

/** Floor plan PDFs for the destination — the Sweet Home 3D output. */
export function FloorPlansPage() {
  const { activeProject, updateDocuments } = useApp();

  if (!activeProject) {
    return <NoProjectState title="Floor Plans" message="Pick a project to see its floor plans." />;
  }

  const docs = normalizeDocuments(activeProject.documents);
  const files = docs.floorPlans;

  return (
    <div className="flex flex-col h-full">
      <ProjectDocHeader
        title="Floor Plans"
        subtitle={`${files.length} ${files.length === 1 ? 'file' : 'files'}`}
      />
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <FileList
          files={files}
          projectId={activeProject.id}
          accept="application/pdf,image/*"
          emptyLabel="No floor plans yet. Add the PDF or image once it's exported."
          addLabel="+ Add Floor Plan"
          onAdd={(added) =>
            updateDocuments(activeProject.id, (d) => ({ ...d, floorPlans: [...d.floorPlans, ...added] }))
          }
          onRemove={(id) =>
            updateDocuments(activeProject.id, (d) => ({
              ...d,
              floorPlans: d.floorPlans.filter((f) => f.id !== id),
            }))
          }
        />
      </div>
    </div>
  );
}
