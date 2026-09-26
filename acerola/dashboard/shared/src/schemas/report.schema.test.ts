import { describe, expect, it } from 'vitest';

import { reportFormatLabel, reportFormatOptions, reportFormatSchema } from './report.schema';

describe('reportFormatSchema', () => {
  // feliz
  it('accepts the three known formats', () => {
    expect(reportFormatSchema.parse('xlsx')).toBe('xlsx');
    expect(reportFormatSchema.parse('docx')).toBe('docx');
    expect(reportFormatSchema.parse('pdf')).toBe('pdf');
  });

  // triste
  it('recusa um formato fora da lista com uma frase em português', () => {
    const result = reportFormatSchema.safeParse('csv');

    expect(result.success).toBe(false);
    expect(result.success ? null : result.error.issues[0]?.message).toBe(
      'Escolha um formato de arquivo',
    );
  });
});

describe('reportFormatOptions', () => {
  // feliz
  it('lista os três formatos com o rótulo em português', () => {
    expect(reportFormatOptions()).toEqual([
      { value: 'xlsx', label: 'Excel' },
      { value: 'docx', label: 'Word' },
      { value: 'pdf', label: 'PDF' },
    ]);
  });
});

describe('reportFormatLabel', () => {
  // feliz
  it('traduz cada formato para o nome que a pessoa reconhece', () => {
    expect(reportFormatLabel('xlsx')).toBe('Excel');
    expect(reportFormatLabel('docx')).toBe('Word');
    expect(reportFormatLabel('pdf')).toBe('PDF');
  });
});
