import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseAnnotationItems } from '@shared/repertuvar/annotation-types';

interface FixtureRow {
  page_number: number;
  annotations_json: unknown;
}

describe('accepted RN PDF spike fixtures', () => {
  it('retains the exact synthetic 40-page score and all page-boundary annotations', () => {
    const pdf = readFileSync(join(__dirname, '../__fixtures__/score_40p.pdf'));
    expect(createHash('sha256').update(pdf).digest('hex'))
      .toBe('39fcafaec0263d8c2429a66d4ea941180692a99749be398a1d48c8fd5397d6a3');
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');

    const annotationBytes = readFileSync(join(__dirname, '../__fixtures__/annotations.sample.json'));
    expect(createHash('sha256').update(annotationBytes).digest('hex'))
      .toBe('329fb458f559ba7ea61db378ba4acdada3feb4b2756bef31833fc344044fea35');
    const rows = JSON.parse(annotationBytes.toString('utf8')) as FixtureRow[];
    expect(rows.map((row) => row.page_number)).toEqual([1, 2, 40]);
    const parsed = rows.map((row) => parseAnnotationItems(row.annotations_json));
    expect(parsed.reduce((total, result) => total + result.items.length, 0)).toBe(9);
    expect(parsed.reduce((total, result) => total + result.skippedCount, 0)).toBe(1);
  });
});
