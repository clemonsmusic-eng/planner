import { buildTablePdf } from './pdf';
import { buildXlsx, type CellValue } from './xlsx';
import type { FurnitureItem, Project } from '../types';

/**
 * A row paired with the number the app shows for it. Exports must carry that
 * number rather than counting from 1, because filtering to the wishlist would
 * otherwise renumber the rows — and the numbers are what the tape labels and
 * the movers' copy refer to.
 */
export interface NumberedFurnitureItem {
  number: number;
  row: FurnitureItem;
}

/**
 * Furniture Inventory export, in the column order of the printed sheet:
 * # · Item · W · D · H · 🖤 · Origination Location · Destination Location · Comments.
 *
 * The heart column is a symbol on the sheet but plain text in both exports —
 * the standard PDF fonts have no glyph for it, and "Wishlist" is what a
 * spreadsheet filter needs to match on anyway.
 */

function baseName(project: Project): string {
  const label = project.inputs.clientName || project.inputs.projectName || 'Project';
  const safe = label.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
  return `${safe || 'Project'}-Furniture-Inventory`;
}

function subtitle(project: Project): string {
  const parts = [
    project.inputs.clientName || project.inputs.projectName,
    project.inputs.community,
    `Exported ${new Date().toLocaleDateString()}`,
  ];
  // Plain separator: the PDF's base font has no middle dot.
  return parts.filter(Boolean).join('  —  ');
}

export function furnitureToPdf(
  project: Project,
  items: NumberedFurnitureItem[]
): { blob: Blob; filename: string } {
  const rows = items.map(({ number, row }) => [
    String(number),
    row.item,
    row.width,
    row.depth,
    row.height,
    row.wishlist ? 'Yes' : '',
    row.originLocation,
    row.destinationLocation,
    row.comments,
  ]);

  const blob = buildTablePdf({
    title: 'Furniture Inventory',
    subtitle: subtitle(project),
    landscape: true,
    columns: [
      { header: '#', weight: 3, align: 'center' },
      { header: 'Item', weight: 20 },
      { header: 'W', weight: 4, align: 'center' },
      { header: 'D', weight: 4, align: 'center' },
      { header: 'H', weight: 4, align: 'center' },
      { header: 'Wishlist', weight: 6, align: 'center' },
      { header: 'Origination Location', weight: 15 },
      { header: 'Destination Location', weight: 15 },
      { header: 'Comments', weight: 22 },
    ],
    rows,
  });

  return { blob, filename: `${baseName(project)}.pdf` };
}

export function furnitureToXlsx(
  project: Project,
  items: NumberedFurnitureItem[]
): { blob: Blob; filename: string } {
  const rows: CellValue[][] = items.map(({ number, row }) => [
    number,
    row.item,
    // Dimensions go out as numbers when they were typed as numbers, so a
    // spreadsheet can total or sort them; anything else stays as typed.
    numberOrText(row.width),
    numberOrText(row.depth),
    numberOrText(row.height),
    row.wishlist ? 'Yes' : '',
    row.originLocation,
    row.destinationLocation,
    row.comments,
  ]);

  const blob = buildXlsx(
    'Furniture Inventory',
    [
      { header: '#', width: 5 },
      { header: 'Item', width: 30 },
      { header: 'W', width: 7 },
      { header: 'D', width: 7 },
      { header: 'H', width: 7 },
      { header: '🖤', width: 8 },
      { header: 'Origination Location', width: 22 },
      { header: 'Destination Location', width: 22 },
      { header: 'Comments', width: 34 },
    ],
    rows
  );

  return { blob, filename: `${baseName(project)}.xlsx` };
}

function numberOrText(value: string): CellValue {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : trimmed;
}

/** Hand a generated file to the browser's download / share flow. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoked on the next tick — Safari needs the URL to still be live when the
  // click is handled.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
