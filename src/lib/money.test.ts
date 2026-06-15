import { describe, expect, it } from 'vitest';
import { parseAmount, parseDate, extractDate, formatMoney, cleanText } from './money';

describe('parseDate', () => {
  it('parses ISO dates', () => {
    expect(parseDate('2024-03-09')).toBe('2024-03-09');
    expect(parseDate('2024/3/9')).toBe('2024-03-09');
  });

  it('honours day-first vs month-first for ambiguous numeric dates', () => {
    expect(parseDate('03/04/2024', true)).toBe('2024-04-03');
    expect(parseDate('03/04/2024', false)).toBe('2024-03-04');
  });

  it('disambiguates when one part is > 12', () => {
    expect(parseDate('13/04/2024', false)).toBe('2024-04-13');
    expect(parseDate('04/13/2024', true)).toBe('2024-04-13');
  });

  it('parses month-name dates', () => {
    expect(parseDate('9 Mar 2024')).toBe('2024-03-09');
    expect(parseDate('Mar 9, 2024')).toBe('2024-03-09');
    expect(parseDate('9-Mar-24')).toBe('2024-03-09');
  });

  it('returns null for non-dates', () => {
    expect(parseDate('hello')).toBeNull();
    expect(parseDate('1234.56')).toBeNull();
  });

  it('handles year-less dates using the assumed statement year', () => {
    expect(parseDate('01/05', false, 2024)).toBe('2024-01-05'); // MM/DD
    expect(parseDate('Mar 9', true, 2023)).toBe('2023-03-09');
    expect(parseDate('9 Mar', true, 2023)).toBe('2023-03-09');
  });
});

describe('extractDate', () => {
  it('finds the first date inside a noisy cell (e.g. two date columns)', () => {
    expect(extractDate('03/15 03/16', false, 2024)).toBe('2024-03-15');
    expect(extractDate('Posted 01/20/2024 ref 99', false)).toBe('2024-01-20');
  });

  it('returns null when no date is present', () => {
    expect(extractDate('no date here')).toBeNull();
  });
});

describe('parseAmount', () => {
  it('parses plain numbers with thousands separators', () => {
    expect(parseAmount('1,234.56')).toBe(1234.56);
    expect(parseAmount('$1,234.56')).toBe(1234.56);
  });

  it('handles European formatting', () => {
    expect(parseAmount('1.234,56')).toBe(1234.56);
    expect(parseAmount('1234,56')).toBe(1234.56);
  });

  it('treats parentheses and DR as negative', () => {
    expect(parseAmount('(1,234.56)')).toBe(-1234.56);
    expect(parseAmount('1,234.56 DR')).toBe(-1234.56);
    expect(parseAmount('-50.00')).toBe(-50);
  });

  it('treats CR as positive', () => {
    expect(parseAmount('500.00 CR')).toBe(500);
  });

  it('returns null when there is no number', () => {
    expect(parseAmount('balance')).toBeNull();
  });
});

describe('formatMoney', () => {
  it('formats with currency and sign', () => {
    expect(formatMoney(1234.5, '$')).toBe('$1,234.50');
    expect(formatMoney(-99.9, '€')).toBe('-€99.90');
  });
});

describe('cleanText', () => {
  it('collapses whitespace', () => {
    expect(cleanText('  foo   bar\tbaz ')).toBe('foo bar baz');
  });
});
