import { useApp } from '../store/AppContext';
import { PLAN_SECTIONS, buildClientDocument, buildPlanDocument, planFileStem } from '../lib/planDocument';
import { ICS_SECTIONS, SCHEDULE_SECTIONS, buildScheduleDocument } from '../lib/scheduleDocument';
import { downloadBlob } from '../lib/furnitureExport';
import { ExportButton, type Audience, type ExportFormat } from './ExportButton';
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

const CLIENT_HINT =
  'Project name, community and move date, then the dates, shift types and start times. Nothing else.';

/**
 * The two document formats, over whatever document the tab builds.
 *
 * A client export is its own document rather than the internal one with boxes
 * unticked, and it gets its own filename so the two are never confused sitting
 * in a downloads folder.
 */
const documentFormats = (
  sections: typeof PLAN_SECTIONS,
  buildInternal: (included: Set<string>) => DocumentModel,
  buildClient: () => DocumentModel,
  stem: string
): ExportFormat[] =>
  (['pdf', 'docx'] as const).map((kind) => ({
    key: kind,
    label: kind === 'pdf' ? 'PDF' : 'Word',
    hint: kind === 'pdf' ? 'For sending or printing.' : 'A .docx, for editing before it goes out.',
    sections,
    clientHint: CLIENT_HINT,
    run: (audience: Audience, included: Set<string>) =>
      audience === 'client'
        ? saveAs(kind, buildClient(), `${stem}-Client`)
        : saveAs(kind, buildInternal(included), stem),
  }));

export function ExportPlanButton({ project, schedule }: { project: Project; schedule: ScheduleResult }) {
  const { state } = useApp();
  return (
    <ExportButton
      formats={documentFormats(
        PLAN_SECTIONS,
        (included) =>
          buildPlanDocument(project, schedule, state.teamMembers, state.services, state.shiftTimes, included),
        () => buildClientDocument(project, schedule, state.shiftTimes),
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
          () => buildClientDocument(project, schedule, state.shiftTimes),
          stem
        ),
        {
          key: 'ics',
          label: 'Calendar',
          hint: 'An .ics with one event per shift, for a phone calendar.',
          // A calendar event's date, time and name are the event; these are the
          // details that ride along in it, and not all of them suit every crew.
          sections: ICS_SECTIONS,
          clientHint: 'Dates, shift types and start times only — no crew, notes or addresses.',
          run: async (audience, included) => {
            const { buildScheduleIcs } = await import('../lib/icsExport');
            // A client calendar carries the appointments and none of the
            // working detail that rides inside an internal one.
            const fields = audience === 'client' ? new Set<string>() : included;
            downloadBlob(
              buildScheduleIcs(project, schedule, state.shiftTimes, fields),
              `${stem}${audience === 'client' ? '-Client' : ''}.ics`
            );
          },
        },
      ]}
    />
  );
}
