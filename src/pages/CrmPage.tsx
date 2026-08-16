import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { Card } from '../components/Card';
import { FormField } from '../components/FormField';
import { SelectField } from '../components/SelectField';
import type { CrmContact } from '../types';

/**
 * The contact book.
 *
 * Everyone a job goes through who isn't on the team — a community's sales
 * office, a disposal firm, a specialist mover. Kept once and pulled into a
 * project rather than retyped per job, because the same handful of people
 * recur across every move at a community.
 */

export const emptyCrmContact = (): CrmContact => ({
  id: crypto.randomUUID(),
  contactType: '',
  company: '',
  name: '',
  workPhone: '',
  cellPhone: '',
  email: '',
  serviceDescription: '',
  notes: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

/** A one-line summary for a collapsed row and for the picker on the Input tab. */
export const contactSummary = (c: { company: string; name: string }) =>
  [c.company, c.name].filter(Boolean).join(' · ') || 'Untitled contact';

export function CrmPage() {
  const { state, dispatch } = useApp();
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

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
            onClick={add}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 text-white text-sm font-semibold min-h-[36px] active:opacity-80"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Add Contact
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
    </div>
  );
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
