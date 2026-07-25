import { Injectable } from '@nestjs/common';

const ascii = (value: string) =>
  value.replace(/[^\x20-\x7E]/g, '?').replace(/([\\()])/g, '\\$1');

const contentText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(contentText).join('\n');
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.text === 'string') return record.text;
    if ('content' in record) return contentText(record.content);
    return Object.values(record).map(contentText).filter(Boolean).join('\n');
  }
  return value === null || value === undefined ? '' : String(value);
};

const wrap = (text: string, width = 88) => {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = '';
    for (const word of words) {
      if (!line) line = word;
      else if (`${line} ${word}`.length <= width) line += ` ${word}`;
      else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
};

@Injectable()
export class InternalPdfService {
  render(title: string, content: Record<string, unknown>): Buffer {
    const lines = [title, '', ...wrap(contentText(content))];
    const pages: string[][] = [];
    for (let index = 0; index < lines.length; index += 48) {
      pages.push(lines.slice(index, index + 48));
    }
    if (!pages.length) pages.push([title]);

    const pageCount = pages.length;
    const fontId = 3 + pageCount * 2;
    const objects: string[] = [];
    objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    const pageIds = pages.map((_, index) => 3 + index * 2);
    objects[2] = `<< /Type /Pages /Kids [${pageIds
      .map((id) => `${id} 0 R`)
      .join(' ')}] /Count ${pageCount} >>`;
    pages.forEach((page, index) => {
      const pageId = 3 + index * 2;
      const streamId = pageId + 1;
      const commands = [
        'BT',
        `/F1 ${index === 0 ? 12 : 10} Tf`,
        '50 750 Td',
        '14 TL',
        ...page.map((line) => `(${ascii(line)}) Tj T*`),
        'ET',
      ].join('\n');
      objects[pageId] =
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ` +
        `/Resources << /Font << /F1 ${fontId} 0 R >> >> ` +
        `/Contents ${streamId} 0 R >>`;
      objects[streamId] =
        `<< /Length ${Buffer.byteLength(commands, 'ascii')} >>\n` +
        `stream\n${commands}\nendstream`;
    });
    objects[fontId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    for (let id = 1; id <= fontId; id += 1) {
      offsets[id] = Buffer.byteLength(pdf, 'ascii');
      pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
    }
    const xref = Buffer.byteLength(pdf, 'ascii');
    pdf += `xref\n0 ${fontId + 1}\n0000000000 65535 f \n`;
    for (let id = 1; id <= fontId; id += 1) {
      pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
    }
    pdf +=
      `trailer\n<< /Size ${fontId + 1} /Root 1 0 R >>\n` +
      `startxref\n${xref}\n%%EOF`;
    return Buffer.from(pdf, 'ascii');
  }
}
