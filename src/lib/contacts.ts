import type { ContactDetails, CrmContact, Project, ProjectContact } from '../types';

/**
 * Reading a project's contacts.
 *
 * A project stores a link, so what it shows has to be looked up rather than
 * read off the row. Keeping that in one place is what stops half the app
 * rendering live CRM data and the other half rendering a stale copy.
 */

export const emptyContactDetails = (): ContactDetails => ({
  contactType: '',
  company: '',
  name: '',
  workPhone: '',
  cellPhone: '',
  email: '',
  serviceDescription: '',
  notes: '',
});

/** Just the describing fields, dropping a CRM entry's identity and stamps. */
export const detailsOf = (c: ContactDetails): ContactDetails => ({
  contactType: c.contactType,
  company: c.company,
  name: c.name,
  workPhone: c.workPhone,
  cellPhone: c.cellPhone,
  email: c.email,
  serviceDescription: c.serviceDescription,
  notes: c.notes,
});

export interface ResolvedContact {
  details: ContactDetails;
  /** True when the row links to a CRM entry that is no longer there. */
  missing: boolean;
  linked: boolean;
}

/**
 * What a project row actually says.
 *
 * A link whose CRM entry has gone resolves to blank details and says so,
 * rather than throwing or rendering an empty row that looks like a mistake
 * someone made — the row is shown as broken so it can be repointed or removed.
 */
export function resolveContact(row: ProjectContact, crm: CrmContact[]): ResolvedContact {
  if (!row.crmId) {
    return { details: row.details ?? emptyContactDetails(), missing: false, linked: false };
  }
  const entry = crm.find((c) => c.id === row.crmId);
  return entry
    ? { details: detailsOf(entry), missing: false, linked: true }
    : { details: emptyContactDetails(), missing: true, linked: true };
}

/** A one-line summary for a collapsed row and for the CRM picker. */
export const contactSummary = (c: { company: string; name: string }) =>
  [c.company, c.name].filter(Boolean).join(' · ') || 'Untitled contact';

/**
 * Which projects point at a CRM entry.
 *
 * Deleting from the book breaks every link to it, so the CRM asks before doing
 * that and names what it would break.
 */
export function projectsUsingContact(projects: Project[], crmId: string): Project[] {
  return projects.filter((p) => (p.inputs.contacts ?? []).some((c) => c.crmId === crmId));
}

/**
 * Bring stored rows onto the linked model.
 *
 * The first version copied the CRM entry's fields onto the project. A row that
 * carries a `crmId` drops its copy and reads through from now on; one without
 * was a deliberate one-off, so its fields move into `details` and stay put.
 */
export function normalizeProjectContacts(rows: unknown): ProjectContact[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((raw): ProjectContact[] => {
    if (!raw || typeof raw !== 'object') return [];
    const row = raw as Record<string, unknown>;
    const id = typeof row.id === 'string' ? row.id : crypto.randomUUID();
    const crmId = typeof row.crmId === 'string' ? row.crmId : null;
    if (crmId) return [{ id, crmId }];
    const details = (row.details ?? row) as Record<string, unknown>;
    const text = (key: string) => (typeof details[key] === 'string' ? (details[key] as string) : '');
    return [
      {
        id,
        crmId: null,
        details: {
          contactType: text('contactType'),
          company: text('company'),
          name: text('name'),
          workPhone: text('workPhone'),
          cellPhone: text('cellPhone'),
          email: text('email'),
          serviceDescription: text('serviceDescription'),
          notes: text('notes'),
        },
      },
    ];
  });
}
