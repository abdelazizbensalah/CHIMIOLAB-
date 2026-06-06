/* Convert rapport/partie_pratique.md into a formatted .docx (A4, academic style)
   with captioned placeholder boxes where screenshots should be inserted. */
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, Header, Footer
} = require('docx');

const SRC = path.join(__dirname, 'partie_pratique.md');
const OUT = path.join(__dirname, 'ChimioLab_Partie_Pratique.docx');
const md = fs.readFileSync(SRC, 'utf8');
const lines = md.split(/\r?\n/);

const CONTENT_WIDTH = 9026; // A4 (11906) - 2*1440 margins

// ---- inline parser: **bold**, `code` ----
function parseInline(text) {
  const runs = [];
  let i = 0, buf = '', bold = false, code = false;
  const flush = () => {
    if (buf) {
      runs.push(new TextRun({ text: buf, bold, font: code ? 'Courier New' : undefined }));
      buf = '';
    }
  };
  while (i < text.length) {
    if (text.startsWith('**', i)) { flush(); bold = !bold; i += 2; continue; }
    if (text[i] === '`') { flush(); code = !code; i += 1; continue; }
    buf += text[i++];
  }
  flush();
  if (runs.length === 0) runs.push(new TextRun(''));
  return runs;
}

function bodyPara(text) {
  return new Paragraph({
    children: parseInline(text),
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 340, after: 140 },
  });
}

function caption(text) {
  // strip surrounding ** **
  const t = text.replace(/^\*\*/, '').replace(/\*\*$/, '');
  return new Paragraph({
    children: [new TextRun({ text: t, italics: true, bold: true, size: 20, color: '444444' })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 220 },
  });
}

function placeholderBox() {
  const dashed = { style: BorderStyle.DASHED, size: 6, color: '9CA3AF' };
  const cell = new TableCell({
    borders: { top: dashed, bottom: dashed, left: dashed, right: dashed },
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    shading: { fill: 'F3F4F6', type: ShadingType.CLEAR, color: 'auto' },
    margins: { top: 240, bottom: 240, left: 120, right: 120 },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({ children: [new TextRun('')], spacing: { after: 0 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [new TextRun({ text: 'IMAGE À INSÉRER', bold: true, size: 22, color: '6B7280' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 0 },
        children: [new TextRun({ text: "Emplacement réservé — coller ici la capture d'écran correspondante", size: 18, color: '9CA3AF' })],
      }),
      new Paragraph({ children: [new TextRun('')], spacing: { after: 0 } }),
    ],
  });
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH],
    rows: [new TableRow({ children: [cell] })],
    alignment: AlignmentType.CENTER,
  });
}

function buildTable(rows) {
  // rows: array of arrays of cell strings; first row = header
  const nCols = rows[0].length;
  // weight widths by max content length per column
  const maxLen = new Array(nCols).fill(1);
  rows.forEach(r => r.forEach((c, j) => { maxLen[j] = Math.max(maxLen[j], c.length); }));
  const total = maxLen.reduce((a, b) => a + b, 0);
  let widths = maxLen.map(l => Math.max(900, Math.round(CONTENT_WIDTH * l / total)));
  // normalize to exactly CONTENT_WIDTH
  let diff = CONTENT_WIDTH - widths.reduce((a, b) => a + b, 0);
  widths[widths.length - 1] += diff;

  const border = { style: BorderStyle.SINGLE, size: 1, color: 'C9C9C9' };
  const borders = { top: border, bottom: border, left: border, right: border,
                    insideHorizontal: border, insideVertical: border };

  const trs = rows.map((r, ri) => new TableRow({
    tableHeader: ri === 0,
    children: r.map((cellText, j) => new TableCell({
      borders,
      width: { size: widths[j], type: WidthType.DXA },
      shading: ri === 0
        ? { fill: '1A3C5E', type: ShadingType.CLEAR, color: 'auto' }
        : (ri % 2 === 0 ? { fill: 'F4F7FA', type: ShadingType.CLEAR, color: 'auto' } : undefined),
      margins: { top: 70, bottom: 70, left: 120, right: 120 },
      verticalAlign: VerticalAlign.CENTER,
      children: [new Paragraph({
        spacing: { after: 0, line: 280 },
        children: ri === 0
          ? [new TextRun({ text: cellText.replace(/\*\*/g, ''), bold: true, color: 'FFFFFF', size: 20 })]
          : parseInline(cellText).map(run => run), // inline for body cells
      })],
    })),
  }));

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    rows: trs,
    alignment: AlignmentType.CENTER,
  });
}

// ---- main parse loop ----
const children = [];
let i = 0;
while (i < lines.length) {
  let line = lines[i];
  const trimmed = line.trim();

  if (trimmed === '' ) { i++; continue; }
  if (trimmed === '\\newpage' || trimmed === '---') { i++; continue; }

  // Headings
  if (trimmed.startsWith('# ')) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      pageBreakBefore: true,
      spacing: { before: 240, after: 200 },
      children: parseInline(trimmed.slice(2)),
    }));
    i++; continue;
  }
  if (trimmed.startsWith('## ')) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 220, after: 120 },
      children: parseInline(trimmed.slice(3)),
    }));
    i++; continue;
  }
  if (trimmed.startsWith('### ')) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 160, after: 100 },
      children: parseInline(trimmed.slice(4)),
    }));
    i++; continue;
  }

  // Image placeholder
  if (trimmed.includes('INSÉRER IMAGE ICI')) {
    children.push(placeholderBox());
    i++; continue;
  }

  // Caption (Figure / Table) — a bold-only line
  if (/^\*\*(Figure|Table) III/.test(trimmed)) {
    children.push(caption(trimmed));
    i++; continue;
  }

  // Markdown table
  if (trimmed.startsWith('|')) {
    const tblLines = [];
    while (i < lines.length && lines[i].trim().startsWith('|')) { tblLines.push(lines[i].trim()); i++; }
    const rows = tblLines
      .filter(l => !/^\|[\s:|-]+\|$/.test(l)) // drop separator row
      .map(l => l.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim()));
    if (rows.length) children.push(buildTable(rows));
    children.push(new Paragraph({ children: [new TextRun('')], spacing: { after: 120 } }));
    continue;
  }

  // Bullet list (* or -)
  if (/^[*-]\s+/.test(trimmed)) {
    while (i < lines.length && /^[*-]\s+/.test(lines[i].trim())) {
      const item = lines[i].trim().replace(/^[*-]\s+/, '');
      children.push(new Paragraph({
        numbering: { reference: 'bullets', level: 0 },
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 80, line: 320 },
        children: parseInline(item),
      }));
      i++;
    }
    continue;
  }

  // Numbered list
  if (/^\d+\.\s+/.test(trimmed)) {
    while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
      const item = lines[i].trim().replace(/^\d+\.\s+/, '');
      children.push(new Paragraph({
        numbering: { reference: 'numbers', level: 0 },
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 80, line: 320 },
        children: parseInline(item),
      }));
      i++;
    }
    continue;
  }

  // Normal paragraph
  children.push(bodyPara(trimmed));
  i++;
}

const doc = new Document({
  creator: 'ChimioLab',
  title: 'ChimioLab — Partie Pratique',
  styles: {
    default: { document: { run: { font: 'Times New Roman', size: 24 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, font: 'Times New Roman', color: '1A3C5E' },
        paragraph: { spacing: { before: 240, after: 200 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: 'Times New Roman', color: '1A3C5E' },
        paragraph: { spacing: { before: 220, after: 120 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, font: 'Times New Roman', color: '245281' },
        paragraph: { spacing: { before: 160, after: 100 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•',
        alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 600, hanging: 280 } } } }] },
      { reference: 'numbers', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.',
        alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 600, hanging: 320 } } } }] },
    ],
  },
  sections: [{
    properties: { page: {
      size: { width: 11906, height: 16838 },
      margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
    } },
    footers: { default: new Footer({ children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: 'ChimioLab — Projet de Fin d’Études — CRMEF 2026     |     ', size: 16, color: '888888' }),
        new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '888888' }),
      ],
    })] }) },
    children,
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(OUT, buf);
  console.log('WROTE', OUT, buf.length, 'bytes');
});
