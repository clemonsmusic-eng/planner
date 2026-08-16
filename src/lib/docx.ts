import { createZip } from './zip';
import type { DocumentModel } from './docModel';

/**
 * Minimal .docx writer.
 *
 * A .docx is a ZIP of XML parts, and the app already has a ZIP writer for
 * .xlsx export — so this is markup, not a library. Deliberately narrow: styled
 * paragraphs and tables are all it emits, which is all the Plan document is.
 *
 * Measurements are in twips (1/20 pt) and DXA, which is what WordprocessingML
 * wants: a Letter page is 12240 x 15840, with 1080 (0.75") margins.
 */

const PAGE_W = 12240;
const MARGIN = 1080;
const CONTENT_W = PAGE_W - MARGIN * 2;

/** Brand colours, as the hex Word wants (no leading #). */
const INK = '124840';
const MUTED = '6B7280';
const BAND = 'DCF0EC';
const RULE = 'D8DCDA';

function esc(text: string): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface RunOptions {
  bold?: boolean;
  size?: number; // points
  color?: string;
  caps?: boolean;
}

function run(text: string, o: RunOptions = {}): string {
  const props = [
    o.bold ? '<w:b/>' : '',
    o.caps ? '<w:caps/>' : '',
    o.color ? `<w:color w:val="${o.color}"/>` : '',
    o.size ? `<w:sz w:val="${Math.round(o.size * 2)}"/>` : '',
  ].join('');
  // xml:space keeps the leading and trailing spaces Word would otherwise trim.
  return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
}

interface ParaOptions extends RunOptions {
  spaceBefore?: number; // points
  spaceAfter?: number;
  indent?: number; // twips
  ruleBelow?: boolean;
}

function para(content: string, o: ParaOptions = {}): string {
  const spacing =
    o.spaceBefore || o.spaceAfter
      ? `<w:spacing${o.spaceBefore ? ` w:before="${Math.round(o.spaceBefore * 20)}"` : ''}` +
        `${o.spaceAfter ? ` w:after="${Math.round(o.spaceAfter * 20)}"` : ''}/>`
      : '<w:spacing w:after="0"/>';
  const border = o.ruleBelow
    ? `<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="2" w:color="B7DCD4"/></w:pBdr>`
    : '';
  const indent = o.indent ? `<w:ind w:left="${o.indent}"/>` : '';
  // Order matters: CT_PPr is a sequence, and Word and LibreOffice both refuse
  // to open a document whose paragraph properties are out of schema order —
  // pBdr comes before spacing, which comes before ind.
  return `<w:p><w:pPr>${border}${spacing}${indent}</w:pPr>${content}</w:p>`;
}

/** A table cell. Word requires at least one paragraph inside every cell. */
function cell(content: string, widthDxa: number, shade?: string): string {
  const shading = shade ? `<w:shd w:val="clear" w:fill="${shade}"/>` : '';
  return (
    `<w:tc><w:tcPr><w:tcW w:w="${widthDxa}" w:type="dxa"/>${shading}` +
    `<w:tcMar><w:top w:w="60" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/>` +
    `<w:left w:w="90" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tcMar>` +
    `</w:tcPr>${content}</w:tc>`
  );
}

function documentXml(doc: DocumentModel): string {
  const body: string[] = [];

  body.push(para(run(doc.title, { bold: true, size: 20, color: INK }), { spaceAfter: 2 }));
  if (doc.subtitle) {
    body.push(para(run(doc.subtitle, { size: 9.5, color: MUTED }), { spaceAfter: 10 }));
  }

  for (const block of doc.blocks) {
    switch (block.kind) {
      case 'heading':
        body.push(
          para(run(block.text, { bold: true, size: 13, color: INK }), {
            spaceBefore: 14,
            spaceAfter: 6,
            ruleBelow: true,
          })
        );
        break;

      case 'paragraph':
        body.push(
          para(run(block.text, { size: 10, color: block.muted ? MUTED : '222222' }), { spaceAfter: 4 })
        );
        break;

      case 'fields': {
        // A borderless two-column table rather than tab stops, so a long value
        // wraps under itself instead of running back to the left margin.
        const labelW = 2600;
        const rows = block.rows.map(
          ([label, value]) =>
            `<w:tr>${cell(para(run(label, { bold: true, size: 10, color: INK })), labelW)}` +
            `${cell(para(run(value, { size: 10 })), CONTENT_W - labelW)}</w:tr>`
        );
        body.push(
          `<w:tbl><w:tblPr><w:tblW w:w="${CONTENT_W}" w:type="dxa"/>` +
            `<w:tblBorders><w:insideH w:val="none"/><w:insideV w:val="none"/></w:tblBorders>` +
            `<w:tblLayout w:type="fixed"/></w:tblPr>` +
            `<w:tblGrid><w:gridCol w:w="${labelW}"/><w:gridCol w:w="${CONTENT_W - labelW}"/></w:tblGrid>` +
            `${rows.join('')}</w:tbl>`
        );
        body.push(para('', { spaceAfter: 2 }));
        break;
      }

      case 'bullets':
        for (const group of block.groups) {
          if (group.label) {
            body.push(
              para(run(group.label, { bold: true, size: 8.5, color: MUTED, caps: true }), {
                spaceBefore: 6,
                spaceAfter: 2,
              })
            );
          }
          for (const item of group.items) {
            body.push(para(run(`•  ${item}`, { size: 10 }), { indent: 220, spaceAfter: 1 }));
          }
        }
        body.push(para('', { spaceAfter: 2 }));
        break;

      case 'table': {
        const total = block.columns.reduce((n, c) => n + c.weight, 0);
        const widths = block.columns.map((c) => Math.round((c.weight / total) * CONTENT_W));
        const align = (i: number) =>
          block.columns[i].align === 'center' ? '<w:jc w:val="center"/>' : '';
        const cellPara = (text: string, i: number, o: RunOptions) =>
          `<w:p><w:pPr><w:spacing w:after="0"/>${align(i)}</w:pPr>${run(text, o)}</w:p>`;

        const header =
          `<w:tr><w:trPr><w:tblHeader/></w:trPr>` +
          block.columns
            .map((c, i) => cell(cellPara(c.header, i, { bold: true, size: 9, color: INK }), widths[i], BAND))
            .join('') +
          `</w:tr>`;
        const rows = block.rows.map(
          (row) =>
            `<w:tr>${row
              .map((v, i) => cell(cellPara(String(v ?? ''), i, { size: 9 }), widths[i]))
              .join('')}</w:tr>`
        );

        body.push(
          `<w:tbl><w:tblPr><w:tblW w:w="${CONTENT_W}" w:type="dxa"/>` +
            `<w:tblBorders>` +
            `<w:top w:val="single" w:sz="4" w:color="${RULE}"/>` +
            `<w:bottom w:val="single" w:sz="4" w:color="${RULE}"/>` +
            `<w:insideH w:val="single" w:sz="4" w:color="${RULE}"/>` +
            `<w:insideV w:val="none"/>` +
            `</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr>` +
            `<w:tblGrid>${widths.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>` +
            `${header}${rows.join('')}</w:tbl>`
        );
        body.push(para('', { spaceAfter: 2 }));
        break;
      }
    }
  }

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
    `<w:body>${body.join('')}` +
    `<w:sectPr><w:pgSz w:w="${PAGE_W}" w:h="15840"/>` +
    `<w:pgMar w:top="${MARGIN}" w:right="${MARGIN}" w:bottom="${MARGIN}" w:left="${MARGIN}" ` +
    `w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>` +
    `</w:body></w:document>`
  );
}

export function buildDocx(doc: DocumentModel): Blob {
  const zip = createZip([
    {
      name: '[Content_Types].xml',
      data:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
        `<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>` +
        `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>` +
        `</Types>`,
    },
    {
      name: '_rels/.rels',
      data:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
        `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>` +
        `</Relationships>`,
    },
    {
      name: 'word/_rels/document.xml.rels',
      data:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
        `</Relationships>`,
    },
    {
      // Only the document defaults: every run above carries its own formatting,
      // so there are no named styles to define.
      name: 'word/styles.xml',
      data:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
        `<w:docDefaults><w:rPrDefault><w:rPr>` +
        `<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>` +
        `<w:sz w:val="20"/><w:color w:val="222222"/>` +
        `</w:rPr></w:rPrDefault>` +
        `<w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="252" w:lineRule="auto"/></w:pPr></w:pPrDefault>` +
        `</w:docDefaults></w:styles>`,
    },
    {
      name: 'docProps/core.xml',
      data:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ` +
        `xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" ` +
        `xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
        `<dc:title>${esc(doc.title)}</dc:title>` +
        `<dc:creator>Smooth Transitions Move Planner</dc:creator>` +
        `<cp:lastModifiedBy>Smooth Transitions Move Planner</cp:lastModifiedBy>` +
        `<dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>` +
        `</cp:coreProperties>`,
    },
    { name: 'word/document.xml', data: documentXml(doc) },
  ]);

  return new Blob([zip], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}
