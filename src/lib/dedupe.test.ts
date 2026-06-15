import { describe, expect, it } from 'vitest';
import { transactionId, mergeTransactions } from './dedupe';
import type { Transaction } from '../types';

function tx(date: string, amount: number, description: string): Transaction {
  return {
    id: transactionId(date, amount, description),
    date,
    amount,
    description,
    category: 'Other',
    source: 'test',
  };
}

describe('transactionId', () => {
  it('is stable for identical content ignoring case/whitespace', () => {
    expect(transactionId('2024-01-01', 10, 'Coffee Shop')).toBe(
      transactionId('2024-01-01', 10, '  coffee   shop '),
    );
  });

  it('differs when amount or date differ', () => {
    expect(transactionId('2024-01-01', 10, 'x')).not.toBe(transactionId('2024-01-02', 10, 'x'));
    expect(transactionId('2024-01-01', 10, 'x')).not.toBe(transactionId('2024-01-01', 11, 'x'));
  });
});

describe('mergeTransactions', () => {
  it('drops duplicates from overlapping statements and sorts newest-first', () => {
    const existing = [tx('2024-01-01', -5, 'A')];
    const incoming = [tx('2024-01-01', -5, 'A'), tx('2024-02-01', -7, 'B')];
    const { merged, added, duplicates } = mergeTransactions(existing, incoming);
    expect(added).toBe(1);
    expect(duplicates).toBe(1);
    expect(merged.map((t) => t.date)).toEqual(['2024-02-01', '2024-01-01']);
  });
});
