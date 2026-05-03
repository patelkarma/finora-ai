import { parseCsv, normalizeRows } from './csv';

describe('parseCsv', () => {
  test('handles a simple CSV with header + rows', () => {
    const text = 'date,amount,description\n2026-01-15,12.50,coffee\n2026-01-16,3000,salary';
    const { headers, rows } = parseCsv(text);
    expect(headers).toEqual(['date', 'amount', 'description']);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ date: '2026-01-15', amount: '12.50', description: 'coffee' });
  });

  test('strips a leading UTF-8 BOM', () => {
    const text = '﻿date,amount\n2026-01-15,10';
    const { headers } = parseCsv(text);
    expect(headers[0]).toBe('date');
  });

  test('handles quoted fields with embedded commas', () => {
    const text = 'date,description,amount\n2026-01-15,"Foo, Inc.",10';
    const { rows } = parseCsv(text);
    expect(rows[0].description).toBe('Foo, Inc.');
  });

  test('handles escaped quotes via doubled-up ""', () => {
    const text = 'date,description,amount\n2026-01-15,"He said ""hi""",10';
    const { rows } = parseCsv(text);
    expect(rows[0].description).toBe('He said "hi"');
  });

  test('treats CRLF as a single line break', () => {
    const text = 'date,amount\r\n2026-01-15,10\r\n2026-01-16,20';
    const { rows } = parseCsv(text);
    expect(rows).toHaveLength(2);
  });
});

describe('normalizeRows', () => {
  test('parses a typical income/expense CSV with a `type` column', () => {
    const parsed = parseCsv(
      'date,description,category,amount,type\n2026-01-15,coffee,Food,4.50,expense\n2026-01-16,salary,Income,3000,income'
    );
    const { rows, errors } = normalizeRows(parsed);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ amount: 4.50, type: 'expense', category: 'Food' });
    expect(rows[1]).toMatchObject({ amount: 3000, type: 'income' });
  });

  test('infers type from sign when no `type` column is present', () => {
    const parsed = parseCsv('date,amount,description\n2026-01-15,-25.00,uber\n2026-01-16,100,refund');
    const { rows } = normalizeRows(parsed);
    expect(rows[0]).toMatchObject({ amount: 25, type: 'expense' });
    expect(rows[1]).toMatchObject({ amount: 100, type: 'income' });
  });

  test('handles separate debit/credit columns (Indian bank style)', () => {
    const parsed = parseCsv('date,debit,credit,description\n2026-01-15,500,,grocery\n2026-01-16,,2500,salary');
    const { rows } = normalizeRows(parsed);
    expect(rows[0]).toMatchObject({ amount: 500, type: 'expense' });
    expect(rows[1]).toMatchObject({ amount: 2500, type: 'income' });
  });

  test('parses parens as negative (accounting style) and strips ₹ symbols', () => {
    const parsed = parseCsv('date,amount,description\n2026-01-15,"(₹150.00)",refund');
    const { rows } = normalizeRows(parsed);
    expect(rows[0].amount).toBe(150);
    expect(rows[0].type).toBe('expense');
  });

  test('parses DD/MM/YYYY where day > 12 (unambiguously Indian-style)', () => {
    const parsed = parseCsv('date,amount\n15/01/2026,10');
    const { rows } = normalizeRows(parsed);
    expect(rows[0].date).toBe('2026-01-15');
  });

  test('reports a top-level error when the date column is missing', () => {
    const parsed = parseCsv('amount,description\n10,coffee');
    const { rows, errors } = normalizeRows(parsed);
    expect(rows).toHaveLength(0);
    expect(errors[0].message).toMatch(/date/i);
  });

  test('reports per-row errors for unparseable dates and continues parsing', () => {
    const parsed = parseCsv(
      'date,amount,description\nnotadate,10,bad\n2026-01-16,20,good'
    );
    const { rows, errors } = normalizeRows(parsed);
    expect(rows).toHaveLength(1);
    expect(rows[0].description).toBe('good');
    expect(errors).toHaveLength(1);
    expect(errors[0].row).toBe(2);
  });
});
