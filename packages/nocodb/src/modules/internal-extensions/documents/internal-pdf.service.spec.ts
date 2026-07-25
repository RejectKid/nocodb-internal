import { InternalPdfService } from './internal-pdf.service';

describe('InternalPdfService', () => {
  it('renders a complete PDF without fetching external resources', () => {
    const pdf = new InternalPdfService().render('Safe title', {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ text: 'Hello (world)' }] }],
    });
    expect(pdf.subarray(0, 8).toString('ascii')).toBe('%PDF-1.4');
    expect(pdf.toString('ascii')).toContain('Hello \\(world\\)');
    expect(pdf.toString('ascii')).toMatch(/%%EOF$/);
  });
});
