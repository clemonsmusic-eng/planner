import { useApp } from '../store/AppContext';
import { buildPlanDocument, planFileStem } from '../lib/planDocument';
import { buildScheduleDocument } from '../lib/scheduleDocument';
import { downloadBlob } from '../lib/furnitureExport';
import { ExportButton, type ExportOption } from './ExportButton';
import type { DocumentModel } from '../lib/docModel';
import type { Project, ScheduleResult } from '../types';

/**
 * Export for the Plan and Schedule tabs.
 *
 * Both are the same two renderers over a different document, so they share one
 * component and differ only in what they build. The renderers are imported on
 * demand — most sessions never export, and neither writer is small.
 */

async function saveAs(format: 'pdf' | 'docx', doc: DocumentModel, stem: string) {
  if (format === 'pdf') {
    const { buildDocumentPdf } = await import('../lib/pdf');
    downloadBlob(buildDocumentPdf(doc), `${stem}.pdf`);
  } else {
    const { buildDocx } = await import('../lib/docx');
    downloadBlob(buildDocx(doc), `${stem}.docx`);
  }
}

const documentOptions = (build: () => DocumentModel, stem: string): ExportOption[] => [
  { label: 'PDF', hint: 'For sending or printing', run: () => saveAs('pdf', build(), stem) },
  { label: 'Word (.docx)', hint: 'For editing before it goes out', run: () => saveAs('docx', build(), stem) },
];

export function ExportPlanButton({ project, schedule }: { project: Project; schedule: ScheduleResult }) {
  const { state } = useApp();
  return (
    <ExportButton
      options={documentOptions(
        () => buildPlanDocument(project, schedule, state.teamMembers, state.services, state.shiftTimes),
        planFileStem(project)
      )}
    />
  );
}

export function ExportScheduleButton({ project, schedule }: { project: Project; schedule: ScheduleResult }) {
  const { state } = useApp();
  const stem = planFileStem(project).replace(/-Plan$/, '-Schedule');

  return (
    <ExportButton
      options={[
        ...documentOptions(() => buildScheduleDocument(project, schedule, state.shiftTimes), stem),
        {
          label: 'Calendar (.ics)',
          hint: 'One event per shift, for a phone calendar',
          run: async () => {
            const { buildScheduleIcs } = await import('../lib/icsExport');
            downloadBlob(buildScheduleIcs(project, schedule, state.shiftTimes), `${stem}.ics`);
          },
        },
      ]}
    />
  );
}
