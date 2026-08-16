/**
 * A format-neutral description of a document.
 *
 * The Plan tab exports to both PDF and .docx. Building each straight from the
 * project would mean two copies of every decision about what the document says,
 * and they would drift the first time a card changed. Instead the project is
 * turned into these blocks once, and each renderer only decides how a heading
 * or a table looks in its own format.
 */

export interface DocTableColumn {
  header: string;
  /** Share of the printable width, relative to the other columns. */
  weight: number;
  align?: 'left' | 'center';
}

export type DocBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string; muted?: boolean }
  /** Label/value pairs, set as a two-column list rather than a ruled table. */
  | { kind: 'fields'; rows: [string, string][] }
  | { kind: 'table'; columns: DocTableColumn[]; rows: string[][] }
  | { kind: 'bullets'; groups: { label?: string; items: string[] }[] };

export interface DocumentModel {
  /** Used for the page title, the .docx title property and the filename. */
  title: string;
  subtitle: string;
  blocks: DocBlock[];
}
