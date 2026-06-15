import { describe, expect, it } from 'vitest';
import { parseAmount, parseDate, formatMoney, cleanText } from './money';

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
