import { useApp } from '../store/AppContext';
import { PLAN_SECTIONS, buildPlanDocument, planFileStem } from '../lib/planDocument';
import { ICS_SECTIONS, SCHEDULE_SECTIONS, buildScheduleDocument } from '../lib/scheduleDocument';
import { downloadBlob } from '../lib/furnitureExport';
import { ExportButton, type ExportFormat } from './ExportButton';
import type { DocumentModel } from '../lib/docModel';
import type { Project, ScheduleResult } from '../types';

/**
 * Export for the Plan and Schedule tabs.
 *
 * Both are the same two renderers over a different document, so they share one
 * component and differ only in what they build and which sections they offer.
 * The renderers are imported on demand — most sessions never export, and
 * neither writer is small.
 */

async function saveAs(kind: 'pdf' | 'docx', doc: DocumentModel, stem: string) {
  if (kind === 'pdf') {
    const { buildDocumentPdf } = await import('../lib/pdf');
    downloadBlob(buildDocumentPdf(doc), `${stem}.pdf`);
  } else {
    const { buildDocx } = await import('../lib/docx');
    downloadBlob(buildDocx(doc), `${stem}.docx`);
  }
}

/** The two document formats, over whatever document the tab builds. */
const documentFormats = (
  sections: typeof PLAN_SECTIONS,
  build: (included: Set<string>) => DocumentModel,
  stem: string
): ExportFormat[] => [
  {
    key: 'pdf',
    label: 'PDF',
    hint: 'For sending or printing.',
    sections,
    run: (included) => saveAs('pdf', build(included), stem),
  },
  {
    key: 'docx',
    label: 'Word',
    hint: 'A .docx, for editing before it goes out.',
    sections,
    run: (included) => saveAs('docx', build(included), stem),
  },
];

export function ExportPlanButton({ project, schedule }: { project: Project; schedule: ScheduleResult }) {
  const { state } = useApp();
  return (
    <ExportButton
      formats={documentFormats(
        PLAN_SECTIONS,
        (included) =>
          buildPlanDocument(project, schedule, state.teamMembers, state.services, state.shiftTimes, included),
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
      formats={[
        ...documentFormats(
          SCHEDULE_SECTIONS,
          (included) => buildScheduleDocument(project, schedule, state.shiftTimes, included),
          stem
        ),
        {
          key: 'ics',
          label: 'Calendar',
          hint: 'An .ics with one event per shift, for a phone calendar.',
          // A calendar event's date, time and name are the event; these are the
          // details that ride along in it, and not all of them suit every crew.
          sections: ICS_SECTIONS,
          run: async (included) => {
            const { buildScheduleIcs } = await import('../lib/icsExport');
            downloadBlob(buildScheduleIcs(project, schedule, state.shiftTimes, included), `${stem}.ics`);
          },
        },
      ]}
    />
  );
}
