import { parseCsv, toCsv } from './csv';
import { emptyContactDetails } from './contacts';
import type { ContactDetails, CrmContact } from '../types';

/**
 * Taking the contact book in and out.
 *
 * Three formats, each for a different destination: CSV for a spreadsheet or
 * another system, vCard for a phone's address book, and a PDF directory to
 * print or send. Import reads the first two — a PDF of a directory is a
 * picture of contacts, not contacts.
 */

/** The columns, in the order the CRM page shows the fields. */
export const CSV_COLUMNS: { key: keyof ContactDetails; header: string }[] = [
  { key: 'contactType', header: 'Contact Type' },
  { key: 'company', header: 'Company' },
  { key: 'name', header: 'Contact Name' },
  { key: 'workPhone', header: 'Work Phone' },
  { key: 'cellPhone', header: 'Cell Phone' },
  { key: 'email', header: 'E-mail' },
  { key: 'address', header: 'Address' },
  { key: 'serviceDescription', header: 'Service Description' },
  { key: 'notes', header: 'Notes' },
];

export function contactsToCsv(contacts: CrmContact[]): Blob {
  const rows = [
    CSV_COLUMNS.map((c) => c.header),
    ...contacts.map((c) => CSV_COLUMNS.map((col) => c[col.key] ?? '')),
  ];
  return new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
}

// ── vCard ────────────────────────────────────────────────────────────────────

/** vCard escapes commas, semicolons, backslashes and newlines, like iCalendar. */
const escapeVcf = (value: string) =>
  String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');

/** Split a name into family and given, which is what N wants. */
function nameParts(name: string): { family: string; given: string } {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return { family: '', given: '' };
  if (parts.length === 1) return { family: parts[0], given: '' };
  return { family: parts[parts.length - 1], given: parts.slice(0, -1).join(' ') };
}

export function contactsToVcf(contacts: CrmContact[]): Blob {
  const cards = contacts.map((c) => {
    const { family, given } = nameParts(c.name);
    // FN is the only required property, so it falls back to the company when
    // an entry is a firm rather than a person.
    const fullName = c.name.trim() || c.company.trim() || 'Contact';
    const notes = [c.serviceDescription, c.notes].filter(Boolean).join('\n\n');
    return [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${escapeVcf(family)};${escapeVcf(given)};;;`,
      `FN:${escapeVcf(fullName)}`,
      ...(c.company ? [`ORG:${escapeVcf(c.company)}`] : []),
      ...(c.contactType ? [`TITLE:${escapeVcf(c.contactType)}`] : []),
      ...(c.workPhone ? [`TEL;TYPE=WORK,VOICE:${escapeVcf(c.workPhone)}`] : []),
      ...(c.cellPhone ? [`TEL;TYPE=CELL,VOICE:${escapeVcf(c.cellPhone)}`] : []),
      ...(c.email ? [`EMAIL;TYPE=WORK:${escapeVcf(c.email)}`] : []),
      // ADR is seven semicolon-separated components; a free-text address goes
      // in the street one, which is what a phone shows when the rest are empty.
      ...(c.address ? [`ADR;TYPE=WORK:;;${escapeVcf(c.address)};;;;`] : []),
      ...(notes ? [`NOTE:${escapeVcf(notes)}`] : []),
      'END:VCARD',
    ].join('\r\n');
  });
  return new Blob([`${cards.join('\r\n')}\r\n`], { type: 'text/vcard;charset=utf-8' });
}

// ── Import ───────────────────────────────────────────────────────────────────

export interface ImportedContact extends ContactDetails {
  id: string;
  /** An existing entry this looks like, so the review can offer to skip it. */
  duplicateOf: string | null;
}

export interface ContactImportResult {
  contacts: ImportedContact[];
  warnings: string[];
}

let seq = 0;
const rowId = () => `imp-contact-${Date.now().toString(36)}-${seq++}`;

/**
 * Header names this reads, beyond the ones it writes.
 *
 * A file dragged out of Google Contacts or Outlook uses its own words for the
 * same columns, and asking someone to rename headers before importing is
 * asking them not to bother.
 */
const HEADER_ALIASES: Record<keyof ContactDetails, string[]> = {
  contactType: ['contact type', 'type', 'category', 'title', 'job title', 'role', 'organization 1 title'],
  company: [
    'company',
    'organization',
    'organisation',
    'org',
    'business',
    'account',
    'organization 1 name',
    'organization name',
  ],
  name: ['contact name', 'name', 'full name', 'display name', 'contact'],
  workPhone: ['work phone', 'business phone', 'office phone', 'phone', 'telephone', 'phone 1 value'],
  cellPhone: ['cell phone', 'mobile phone', 'mobile', 'cell', 'phone 2 value'],
  email: ['e-mail', 'email', 'email address', 'e-mail address', 'e-mail 1 value', 'email 1 value'],
  address: [
    'address',
    'street',
    'street address',
    'mailing address',
    'address 1 formatted',
    'address 1 street',
  ],
  serviceDescription: ['service description', 'service', 'services', 'description'],
  notes: ['notes', 'note', 'comments', 'remarks'],
};

/**
 * A header, reduced to something matchable.
 *
 * Google Contacts writes its columns as "Organization 1 - Name", so a spaced
 * hyphen is dropped while the index is kept — "Phone 1" and "Phone 2" are the
 * work and cell numbers and must not collapse into each other. Hyphens inside
 * a word are left alone, or "E-mail" would stop matching itself.
 */
const normalizeHeader = (h: string) =>
  h.trim().toLowerCase().replace(/\s+-\s+/g, ' ').replace(/\s+/g, ' ');

/** Map each column index to a field, where a header names one. */
function mapColumns(headers: string[]): (keyof ContactDetails | null)[] {
  const taken = new Set<keyof ContactDetails>();
  return headers.map((raw) => {
    const header = normalizeHeader(raw);
    for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [keyof ContactDetails, string[]][]) {
      // First column to claim a field keeps it, so a file with both "Phone"
      // and "Work Phone" doesn't overwrite one with the other.
      if (!taken.has(field) && aliases.includes(header)) {
        taken.add(field);
        return field;
      }
    }
    return null;
  });
}

/** Where a first name and a last name arrive in separate columns. */
function splitNameColumns(headers: string[]): { first: number; last: number } {
  const find = (names: string[]) => headers.findIndex((h) => names.includes(normalizeHeader(h)));
  return {
    first: find(['first name', 'given name', 'first']),
    last: find(['last name', 'family name', 'surname', 'last']),
  };
}

export function parseContactsCsv(text: string): ContactImportResult {
  const rows = parseCsv(text);
  if (rows.length === 0) return { contacts: [], warnings: ['That file is empty.'] };

  const headers = rows[0];
  const columns = mapColumns(headers);
  const nameCols = splitNameColumns(headers);
  const warnings: string[] = [];

  if (columns.every((c) => c === null) && nameCols.first < 0) {
    return {
      contacts: [],
      warnings: [
        `No recognisable columns. The first row should name them — ${CSV_COLUMNS.map((c) => c.header).join(', ')}.`,
      ],
    };
  }

  const unread = headers.filter((h, i) => columns[i] === null && i !== nameCols.first && i !== nameCols.last && h.trim());
  if (unread.length > 0) warnings.push(`Ignored ${unread.length} column(s): ${unread.join(', ')}.`);

  const contacts: ImportedContact[] = [];
  for (const row of rows.slice(1)) {
    const details = emptyContactDetails();
    columns.forEach((field, i) => {
      if (field) details[field] = (row[i] ?? '').trim();
    });
    if (!details.name && nameCols.first >= 0) {
      details.name = [row[nameCols.first], row[nameCols.last]].filter(Boolean).join(' ').trim();
    }
    // A row with neither a company nor a name is not a contact.
    if (!details.company && !details.name) continue;
    contacts.push({ ...details, id: rowId(), duplicateOf: null });
  }

  if (contacts.length === 0 && warnings.length === 0) {
    warnings.push('No contacts were found in that file.');
  }
  return { contacts, warnings };
}

/** Undo vCard line folding: a leading space or tab continues the line before. */
function unfoldVcf(text: string): string[] {
  const raw = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const lines: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

const unescapeVcf = (value: string) =>
  value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();

/**
 * ADR's seven components, flattened back to one line.
 *
 * Split before unescaping, not after: a semicolon inside a component arrives
 * escaped, and unescaping first would turn it into a component boundary and
 * cut the address in half.
 */
function addressFromAdr(value: string): string {
  const parts: string[] = [];
  let current = '';
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === '\\' && i + 1 < value.length) {
      current += ch + value[i + 1];
      i++;
    } else if (ch === ';') {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts.map(unescapeVcf).filter(Boolean).join(', ');
}

export function parseVcf(text: string): ContactImportResult {
  const contacts: ImportedContact[] = [];
  const warnings: string[] = [];
  let current: ContactDetails | null = null;
  let sawFullName = false;

  for (const line of unfoldVcf(text)) {
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const head = line.slice(0, colon).toUpperCase();
    const raw = line.slice(colon + 1);
    const value = unescapeVcf(raw);
    const name = head.split(';')[0];

    if (name === 'BEGIN' && value.toUpperCase() === 'VCARD') {
      current = emptyContactDetails();
      sawFullName = false;
      continue;
    }
    if (name === 'END' && value.toUpperCase() === 'VCARD') {
      if (current && (current.company || current.name)) {
        // A card whose full name is just the organisation is the organisation,
        // not someone working there — which is what FN falling back to the
        // company on the way out produces, so it is undone on the way in.
        if (current.name.trim().toLowerCase() === current.company.trim().toLowerCase()) current.name = '';
        contacts.push({ ...current, id: rowId(), duplicateOf: null });
      }
      current = null;
      continue;
    }
    if (!current) continue;

    switch (name) {
      case 'FN':
        current.name = value;
        sawFullName = true;
        break;
      case 'N':
        // Structured name: family;given;… — only used when FN is absent.
        if (!sawFullName) {
          const [family = '', given = ''] = value.split(';');
          current.name = [given, family].filter(Boolean).join(' ').trim();
        }
        break;
      case 'ORG':
        current.company = value.split(';')[0];
        break;
      case 'TITLE':
        current.contactType = value;
        break;
      case 'TEL':
        // The type parameter decides which of the two phone fields it lands in.
        if (/CELL|MOBILE/.test(head)) current.cellPhone ||= value;
        else current.workPhone ||= value;
        break;
      case 'EMAIL':
        current.email ||= value;
        break;
      case 'ADR':
        // Read from the raw value: the components are semicolon-separated, and
        // `value` has already had escaped semicolons turned back into real ones.
        current.address ||= addressFromAdr(raw);
        break;
      case 'NOTE':
        current.notes = value;
        break;
    }
  }

  if (contacts.length === 0) warnings.push('No contact cards were found in that file.');
  return { contacts, warnings };
}

/**
 * Which imported rows look like entries already in the book.
 *
 * Matched on e-mail where there is one, since that is the field people get
 * right, and otherwise on company and name together. Flagged rather than
 * dropped: only the person importing knows whether two firms with the same
 * name are the same firm.
 */
export function markDuplicates(rows: ImportedContact[], existing: CrmContact[]): ImportedContact[] {
  const key = (c: ContactDetails) =>
    c.email.trim().toLowerCase() ||
    `${c.company.trim().toLowerCase()}|${c.name.trim().toLowerCase()}`;
  const index = new Map(existing.map((c) => [key(c), c.id]));
  return rows.map((row) => ({ ...row, duplicateOf: index.get(key(row)) ?? null }));
}

export function parseContactFile(name: string, text: string): ContactImportResult {
  return /\.vcf$/i.test(name) || /^BEGIN:VCARD/im.test(text) ? parseVcf(text) : parseContactsCsv(text);
}
