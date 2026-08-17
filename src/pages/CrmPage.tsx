import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { Card } from '../components/Card';
import { FormField } from '../components/FormField';
import { SelectField } from '../components/SelectField';
import { contactSummary, emptyContactDetails, projectsUsingContact } from '../lib/contacts';
import { contactsToCsv, contactsToVcf } from '../lib/contactsIo';
import { downloadBlob } from '../lib/furnitureExport';
import { CrmImportSheet } from '../components/CrmImportSheet';
import type { DocumentModel } from '../lib/docModel';
import type { CrmContact } from '../types';

/**
 * The contact book.
 *
 * Everyone a job goes through who isn't on the team — a community's sales
 * office, a disposal firm, a specialist mover. Kept once and pulled into a
 * project rather than retyped per job, because the same handful of people
 * recur across every move at a community.
 */

const emptyCrmContact = (): CrmContact => ({
  ...emptyContactDetails(),
  id: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export function CrmPage() {
  const { state, dispatch } = useApp();
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const contactTypes = state.lists.find((l) => l.id === 'crm-contact-type')?.items ?? [];

  const contacts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? state.crmContacts.filter((c) =>
          [c.company, c.name, c.contactType, c.email, c.serviceDescription, c.notes]
            .join(' ')
            .toLowerCase()
            .includes(q)
        )
      : state.crmContacts;
    // Grouped by type when browsing, so the book reads as a directory; a
    // search is a flat list of hits, where grouping only adds noise.
    return [...matched].sort(
      (a, b) =>
        a.contactType.localeCompare(b.contactType) ||
        contactSummary(a).localeCompare(contactSummary(b))
    );
  }, [state.crmContacts, query]);

  /** The projects that would break if this entry went. */
  const usedBy = (id: string) => projectsUsingContact(state.projects, id);

  function write(contacts: CrmContact[]) {
    dispatch({ type: 'UPDATE_CRM_CONTACTS', contacts });
  }

  function update(id: string, patch: Partial<CrmContact>) {
    write(
      state.crmContacts.map((c) =>
        c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c
      )
    );
  }

  function add() {
    const contact = { ...emptyCrmContact(), contactType: contactTypes[0] ?? '' };
    write([...state.crmContacts, contact]);
    setOpenId(contact.id);
    setQuery('');
  }

  return (
    <div className="flex flex-col h-full">
      <div
        className="sticky top-0 z-10 bg-white border-b border-ios-gray-200 px-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: '12px' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-teal-900 leading-tight">CRM</h1>
            <p className="text-xs text-ios-gray-600">
              {state.crmContacts.length} contact{state.crmContacts.length === 1 ? '' : 's'}
            </p>
          </div>
          <button
            onClick={() => setImporting(true)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-600 text-sm font-semibold min-h-[36px] active:opacity-70 lg:hover:opacity-80"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z" />
              <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
            </svg>
            Import
          </button>
          <button
            onClick={() => setExportOpen(true)}
            disabled={state.crmContacts.length === 0}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-600 text-sm font-semibold min-h-[36px] active:opacity-70 lg:hover:opacity-80 disabled:opacity-40"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
              <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
            </svg>
            Export
          </button>
          <button
            onClick={add}
            aria-label="Add contact"
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 text-white text-sm font-semibold min-h-[36px] active:opacity-80"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Add
          </button>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search company, name, type…"
          aria-label="Search contacts"
          className="w-full min-h-[40px] rounded-xl border border-ios-gray-300 bg-white px-3 text-base text-teal-900"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-3 lg:items-start">
        {contacts.length === 0 ? (
          <div className="lg:col-span-full flex flex-col items-center justify-center py-16 gap-3 text-center">
            <p className="text-sm text-ios-gray-600">
              {state.crmContacts.length === 0
                ? 'No contacts yet.'
                : 'Nothing matches that search.'}
            </p>
            {state.crmContacts.length === 0 && (
              <button onClick={add} className="bg-teal-600 text-white px-5 py-3 rounded-xl font-semibold min-h-[44px]">
                Add the first contact
              </button>
            )}
          </div>
        ) : (
          contacts.map((contact) => (
            <Card key={contact.id} className="overflow-hidden">
              <button
                onClick={() => setOpenId((id) => (id === contact.id ? null : contact.id))}
                aria-expanded={openId === contact.id}
                className="w-full flex items-center gap-2 px-4 py-3 text-left min-h-[52px]"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-teal-900 truncate">{contactSummary(contact)}</p>
                  <p className="text-xs text-ios-gray-500 truncate">
                    {contact.contactType || 'No type'}
                    {contact.serviceDescription ? ` · ${contact.serviceDescription}` : ''}
                  </p>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={`w-4 h-4 text-ios-gray-400 flex-shrink-0 transition-transform ${openId === contact.id ? 'rotate-180' : ''}`}
                >
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </button>

              {openId === contact.id && (
                <div className="border-t border-ios-gray-200 px-4 py-3 space-y-3">
                  <FormField label="Contact Type">
                    <SelectField
                      value={contact.contactType}
                      onChange={(v) => update(contact.id, { contactType: v })}
                      options={[
                        ...(contact.contactType && !contactTypes.includes(contact.contactType)
                          ? [contact.contactType]
                          : []),
                        ...contactTypes,
                      ]}
                    />
                  </FormField>
                  <TextRow label="Company" value={contact.company} onChange={(v) => update(contact.id, { company: v })} />
                  <TextRow label="Contact Name" value={contact.name} onChange={(v) => update(contact.id, { name: v })} />
                  <TextRow label="Work Phone" type="tel" value={contact.workPhone} onChange={(v) => update(contact.id, { workPhone: v })} />
                  <TextRow label="Cell Phone" type="tel" value={contact.cellPhone} onChange={(v) => update(contact.id, { cellPhone: v })} />
                  <TextRow label="E-mail" type="email" value={contact.email} onChange={(v) => update(contact.id, { email: v })} />
                  <TextRow
                    label="Service Description"
                    value={contact.serviceDescription}
                    onChange={(v) => update(contact.id, { serviceDescription: v })}
                  />
                  <FormField label="Notes">
                    <textarea
                      value={contact.notes}
                      onChange={(e) => update(contact.id, { notes: e.target.value })}
                      rows={3}
                      className="w-full rounded-xl border border-ios-gray-300 bg-white px-3 py-2 text-base text-teal-900"
                    />
                  </FormField>

                  <div className="pt-1">
                    {confirmDelete === contact.id ? (
                      <div className="space-y-2">
                        {/*
                          Projects link to this entry rather than copying it, so
                          deleting it breaks those rows. Named before it happens.
                        */}
                        {usedBy(contact.id).length > 0 && (
                          <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
                            Used by {usedBy(contact.id).length} project
                            {usedBy(contact.id).length === 1 ? '' : 's'} (
                            {usedBy(contact.id)
                              .map((p) => p.inputs.clientName || 'Untitled')
                              .join(', ')}
                            ). Deleting leaves those rows pointing at nothing.
                          </p>
                        )}
                        <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="flex-1 py-2.5 rounded-xl border border-ios-gray-300 text-ios-gray-600 text-sm font-semibold"
                        >
                          Keep
                        </button>
                        <button
                          onClick={() => {
                            write(state.crmContacts.filter((c) => c.id !== contact.id));
                            setConfirmDelete(null);
                          }}
                          className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold"
                        >
                          Delete Contact
                        </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(contact.id)}
                        className="text-sm font-semibold text-red-600 px-1 py-1"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {importing && <CrmImportSheet onClose={() => setImporting(false)} />}
      {exportOpen && (
        <ExportContactsSheet
          all={state.crmContacts}
          filtered={contacts}
          searching={query.trim().length > 0}
          onClose={() => setExportOpen(false)}
        />
      )}
    </div>
  );
}

/**
 * Taking the book out.
 *
 * Three destinations rather than one format: a spreadsheet, a phone's address
 * book, or something to print. A search narrows what goes, because "export the
 * movers" is the same gesture as looking them up.
 */
function ExportContactsSheet({
  all,
  filtered,
  searching,
  onClose,
}: {
  all: CrmContact[];
  filtered: CrmContact[];
  searching: boolean;
  onClose: () => void;
}) {
  const [scope, setScope] = useState<'all' | 'filtered'>(searching ? 'filtered' : 'all');
  const [format, setFormat] = useState<'csv' | 'vcf' | 'pdf'>('csv');
  const [busy, setBusy] = useState(false);
  const chosen = scope === 'filtered' ? filtered : all;

  const FORMATS = [
    { key: 'csv' as const, label: 'CSV', hint: 'For a spreadsheet or another contacts system.' },
    { key: 'vcf' as const, label: 'vCard', hint: 'A .vcf that drops into a phone address book.' },
    { key: 'pdf' as const, label: 'PDF', hint: 'A printed directory, grouped by contact type.' },
  ];

  async function run() {
    setBusy(true);
    try {
      if (format === 'csv') downloadBlob(contactsToCsv(chosen), 'Contacts.csv');
      else if (format === 'vcf') downloadBlob(contactsToVcf(chosen), 'Contacts.vcf');
      else {
        const { buildDocumentPdf } = await import('../lib/pdf');
        downloadBlob(buildDocumentPdf(contactsDocument(chosen)), 'Contacts.pdf');
      }
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-label="Export contacts"
        className="fixed bottom-0 left-0 right-0 lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-full lg:max-w-md z-[61] bg-white rounded-t-2xl lg:rounded-2xl shadow-xl flex flex-col max-h-[85vh]"
      >
        <div className="px-4 pt-5 pb-3 flex-shrink-0 space-y-4">
          <h3 className="font-bold text-teal-900">Export Contacts</h3>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-ios-gray-500 mb-1.5">Format</p>
            <div className="flex gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFormat(f.key)}
                  className={`flex-1 min-h-[44px] px-2 rounded-xl text-sm font-semibold transition-colors ${
                    f.key === format ? 'bg-teal-600 text-white' : 'bg-ios-gray-100 text-ios-gray-600'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-ios-gray-500 mt-1.5">
              {FORMATS.find((f) => f.key === format)?.hint}
            </p>
          </div>

          {searching && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-ios-gray-500 mb-1.5">
                Which contacts
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setScope('filtered')}
                  className={`flex-1 min-h-[44px] px-2 rounded-xl text-sm font-semibold ${
                    scope === 'filtered' ? 'bg-teal-600 text-white' : 'bg-ios-gray-100 text-ios-gray-600'
                  }`}
                >
                  Search results ({filtered.length})
                </button>
                <button
                  onClick={() => setScope('all')}
                  className={`flex-1 min-h-[44px] px-2 rounded-xl text-sm font-semibold ${
                    scope === 'all' ? 'bg-teal-600 text-white' : 'bg-ios-gray-100 text-ios-gray-600'
                  }`}
                >
                  All ({all.length})
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 border-t border-ios-gray-200 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+68px)] lg:pb-[calc(env(safe-area-inset-bottom)+12px)] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-ios-gray-300 text-ios-gray-600 font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={run}
            disabled={busy || chosen.length === 0}
            className="flex-1 py-3 rounded-xl bg-teal-600 text-white font-semibold disabled:opacity-40"
          >
            {busy ? 'Exporting…' : `Export ${chosen.length}`}
          </button>
        </div>
      </div>
    </>
  );
}

/** The book as a printable directory, grouped the way the page groups it. */
function contactsDocument(contacts: CrmContact[]): DocumentModel {
  const byType = new Map<string, CrmContact[]>();
  for (const c of contacts) {
    const key = c.contactType || 'No type';
    byType.set(key, [...(byType.get(key) ?? []), c]);
  }

  return {
    title: 'Contacts',
    subtitle: `${contacts.length} contact${contacts.length === 1 ? '' : 's'}`,
    blocks: [...byType.entries()].flatMap(([type, group]) => [
      { kind: 'heading' as const, text: type },
      {
        kind: 'table' as const,
        columns: [
          { header: 'Company', weight: 24 },
          { header: 'Contact', weight: 18 },
          { header: 'Phone', weight: 20 },
          { header: 'E-mail', weight: 20 },
          { header: 'Service', weight: 18 },
        ],
        rows: group.map((c) => [
          c.company || '-',
          c.name || '-',
          [c.workPhone, c.cellPhone].filter(Boolean).join(' / ') || '-',
          c.email || '-',
          c.serviceDescription || '-',
        ]),
      },
    ]),
  };
}

function TextRow({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <FormField label={label}>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-[44px] rounded-xl border border-ios-gray-300 bg-white px-3 text-base text-teal-900"
      />
    </FormField>
  );
}
