import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { FormField } from './FormField';
import { SelectField } from './SelectField';
import { contactSummary, emptyContactDetails, resolveContact } from '../lib/contacts';
import type { ContactDetails, CrmContact, ProjectContact } from '../types';

/**
 * The people a project goes through.
 *
 * A row links to the CRM rather than copying it, so correcting a phone number
 * once fixes it on every job that firm is on. Editing a linked row here writes
 * straight back to the book — which is said on the row, because an edit made
 * inside one project changing every other one is not something to discover.
 *
 * A one-off — a contact deliberately not filed in the book — keeps its details
 * on the project instead, and edits only itself.
 */

export function ProjectContacts({
  contacts,
  onChange,
  disabled,
}: {
  contacts: ProjectContact[];
  onChange: (contacts: ProjectContact[]) => void;
  disabled?: boolean;
}) {
  const { state, dispatch } = useApp();
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  /** An edit goes to the book for a linked row, and to the project otherwise. */
  function edit(row: ProjectContact, patch: Partial<ContactDetails>) {
    if (row.crmId) {
      dispatch({
        type: 'UPDATE_CRM_CONTACTS',
        contacts: state.crmContacts.map((c) =>
          c.id === row.crmId ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c
        ),
      });
      return;
    }
    onChange(
      contacts.map((c) =>
        c.id === row.id
          ? { ...c, details: { ...(c.details ?? emptyContactDetails()), ...patch } }
          : c
      )
    );
  }

  return (
    <div className="space-y-3">
      {contacts.length === 0 && (
        <p className="text-sm text-ios-gray-500">
          Nobody added yet — communities, movers and disposal firms go here.
        </p>
      )}

      {contacts.map((row) => {
        const { details, missing, linked } = resolveContact(row, state.crmContacts);
        return (
          <div key={row.id} className="rounded-xl border border-ios-gray-200 overflow-hidden">
            <div className="flex items-center gap-2 bg-ios-gray-50 px-3 py-2">
              <button
                type="button"
                onClick={() => setOpenId((id) => (id === row.id ? null : row.id))}
                aria-expanded={openId === row.id}
                className="flex-1 min-w-0 text-left"
              >
                <p className="text-sm font-semibold text-teal-900 truncate">
                  {missing ? 'Contact removed from the CRM' : contactSummary(details)}
                </p>
                <p className="text-xs text-ios-gray-500 truncate">
                  {missing
                    ? 'Remove this row, or add the contact back to the CRM'
                    : `${details.contactType || 'No type'}${linked ? ' · linked to the CRM' : ' · one-off'}`}
                </p>
              </button>
              <button
                type="button"
                onClick={() => onChange(contacts.filter((c) => c.id !== row.id))}
                aria-label={`Remove ${contactSummary(details)}`}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-ios-gray-400 active:text-red-600 lg:hover:text-red-600 flex-shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>

            {openId === row.id && !missing && (
              <div className="px-3 py-3">
                {linked && (
                  <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2 mb-3">
                    This contact lives in the CRM. Changes here update it everywhere it is used.
                  </p>
                )}
                <ContactFields value={details} onChange={(patch) => edit(row, patch)} />
              </div>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => setAdding(true)}
        disabled={disabled}
        className="w-full min-h-[44px] rounded-xl border border-dashed border-teal-300 text-teal-600 text-sm font-semibold active:bg-teal-50 lg:hover:bg-teal-50 disabled:opacity-40"
      >
        + Add Contact
      </button>

      {adding && (
        <AddContactSheet
          onAdd={(contact) => onChange([...contacts, contact])}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  );
}

/** The editable body of one contact, shared by the row and the new-contact sheet. */
export function ContactFields({
  value,
  onChange,
}: {
  value: ContactDetails;
  onChange: (patch: Partial<ContactDetails>) => void;
}) {
  const { state } = useApp();
  const types = state.lists.find((l) => l.id === 'crm-contact-type')?.items ?? [];
  const field = 'w-full min-h-[44px] rounded-xl border border-ios-gray-300 bg-white px-3 text-base text-teal-900';

  return (
    <div className="space-y-3">
      <FormField label="Contact Type">
        <SelectField
          value={value.contactType}
          onChange={(v) => onChange({ contactType: v })}
          options={[
            { value: '', label: 'Choose a type' },
            // A type that has since been renamed or removed in Settings stays
            // selectable rather than silently becoming blank.
            ...(value.contactType && !types.includes(value.contactType)
              ? [{ value: value.contactType, label: value.contactType }]
              : []),
            ...types.map((t) => ({ value: t, label: t })),
          ]}
        />
      </FormField>
      <FormField label="Company">
        <input value={value.company} onChange={(e) => onChange({ company: e.target.value })} className={field} />
      </FormField>
      <FormField label="Contact Name">
        <input value={value.name} onChange={(e) => onChange({ name: e.target.value })} className={field} />
      </FormField>
      <FormField label="Work Phone">
        <input type="tel" value={value.workPhone} onChange={(e) => onChange({ workPhone: e.target.value })} className={field} />
      </FormField>
      <FormField label="Cell Phone">
        <input type="tel" value={value.cellPhone} onChange={(e) => onChange({ cellPhone: e.target.value })} className={field} />
      </FormField>
      <FormField label="E-mail">
        <input type="email" value={value.email} onChange={(e) => onChange({ email: e.target.value })} className={field} />
      </FormField>
      <FormField label="Address">
        <textarea
          value={value.address ?? ''}
          onChange={(e) => onChange({ address: e.target.value })}
          rows={2}
          placeholder="Street, city, state ZIP"
          className="w-full rounded-xl border border-ios-gray-300 bg-white px-3 py-2 text-base text-teal-900"
        />
      </FormField>
      <FormField label="Service Description">
        <input
          value={value.serviceDescription}
          onChange={(e) => onChange({ serviceDescription: e.target.value })}
          className={field}
        />
      </FormField>
      <FormField label="Notes">
        <textarea
          value={value.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          rows={2}
          className="w-full rounded-xl border border-ios-gray-300 bg-white px-3 py-2 text-base text-teal-900"
        />
      </FormField>
    </div>
  );
}

/**
 * Adding a contact: pick one out of the CRM, or type a new one.
 *
 * A new contact filed in the book comes back as a link, so the project and the
 * CRM stay one record from the moment it is created. Left unfiled it is a
 * one-off, kept on this project alone — which is what that choice means now.
 */
function AddContactSheet({
  onAdd,
  onClose,
}: {
  onAdd: (contact: ProjectContact) => void;
  onClose: () => void;
}) {
  const { state, dispatch } = useApp();
  const [mode, setMode] = useState<'crm' | 'new'>(state.crmContacts.length > 0 ? 'crm' : 'new');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<ContactDetails>(emptyContactDetails);
  const [alsoSave, setAlsoSave] = useState(true);

  const matches = state.crmContacts.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [c.company, c.name, c.contactType, c.serviceDescription].join(' ').toLowerCase().includes(q);
  });

  function addNew() {
    if (alsoSave) {
      const saved: CrmContact = {
        ...draft,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      dispatch({ type: 'UPDATE_CRM_CONTACTS', contacts: [...state.crmContacts, saved] });
      onAdd({ id: crypto.randomUUID(), crmId: saved.id });
    } else {
      onAdd({ id: crypto.randomUUID(), crmId: null, details: draft });
    }
    onClose();
  }

  const canAdd = !!(draft.company.trim() || draft.name.trim());

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-label="Add contact"
        className="fixed bottom-0 left-0 right-0 lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-full lg:max-w-md z-[61] bg-white rounded-t-2xl lg:rounded-2xl shadow-xl flex flex-col max-h-[85vh]"
      >
        <div className="px-4 pt-5 pb-3 flex-shrink-0">
          <h3 className="font-bold text-teal-900 mb-3">Add Contact</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('crm')}
              className={`flex-1 min-h-[44px] rounded-xl text-sm font-semibold ${
                mode === 'crm' ? 'bg-teal-600 text-white' : 'bg-ios-gray-100 text-ios-gray-600'
              }`}
            >
              From CRM
            </button>
            <button
              type="button"
              onClick={() => setMode('new')}
              className={`flex-1 min-h-[44px] rounded-xl text-sm font-semibold ${
                mode === 'new' ? 'bg-teal-600 text-white' : 'bg-ios-gray-100 text-ios-gray-600'
              }`}
            >
              New Contact
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-2 min-h-0">
          {mode === 'crm' ? (
            <>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the CRM…"
                aria-label="Search the CRM"
                className="w-full min-h-[44px] rounded-xl border border-ios-gray-300 bg-white px-3 text-base text-teal-900 mb-2"
              />
              {matches.length === 0 ? (
                <p className="text-sm text-ios-gray-500 py-6 text-center">
                  {state.crmContacts.length === 0
                    ? 'The CRM is empty. Add a new contact instead.'
                    : 'Nothing matches that search.'}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {matches.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onAdd({ id: crypto.randomUUID(), crmId: c.id });
                        onClose();
                      }}
                      className="w-full text-left rounded-xl border border-ios-gray-200 px-3 py-2.5 active:bg-ios-gray-50 lg:hover:bg-ios-gray-50"
                    >
                      <p className="text-sm font-semibold text-teal-900 truncate">{contactSummary(c)}</p>
                      <p className="text-xs text-ios-gray-500 truncate">
                        {c.contactType || 'No type'}
                        {c.serviceDescription ? ` · ${c.serviceDescription}` : ''}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <ContactFields value={draft} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} />
              <label className="flex items-center gap-3 mt-3 rounded-xl border border-ios-gray-200 px-3 py-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={alsoSave}
                  onChange={(e) => setAlsoSave(e.target.checked)}
                  className="w-5 h-5 flex-shrink-0 accent-teal-600"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-teal-900">Add to the CRM</span>
                  <span className="block text-xs text-ios-gray-500">
                    {alsoSave
                      ? 'Filed in the book and linked, so every project stays in step.'
                      : 'Kept on this project alone.'}
                  </span>
                </span>
              </label>
            </>
          )}
        </div>

        <div className="flex-shrink-0 border-t border-ios-gray-200 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+68px)] lg:pb-[calc(env(safe-area-inset-bottom)+12px)] flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-ios-gray-300 text-ios-gray-600 font-semibold"
          >
            Cancel
          </button>
          {mode === 'new' && (
            <button
              type="button"
              onClick={addNew}
              disabled={!canAdd}
              className="flex-1 py-3 rounded-xl bg-teal-600 text-white font-semibold disabled:opacity-40"
            >
              Add Contact
            </button>
          )}
        </div>
      </div>
    </>
  );
}
