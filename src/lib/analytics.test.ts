import { describe, expect, it } from 'vitest';
import {
  computeTotals,
  spendingByCategory,
  monthlyBreakdown,
  detectRecurring,
  filterByPeriod,
} from './analytics';
import { transactionId } from './dedupe';
import type { Transaction } from '../types';

function tx(date: string, amount: number, description: string, category: string): Transaction {
  return { id: transactionId(date, amount, description), date, amount, description, category, source: 't' };
}

const data: Transaction[] = [
  tx('2024-01-05', 3000, 'Payroll', 'Income'),
  tx('2024-01-10', -1000, 'Rent', 'Housing'),
  tx('2024-01-15', -200, 'Groceries', 'Groceries'),
  tx('2024-01-20', -500, 'Move to savings', 'Transfers'),
  tx('2024-02-05', 3000, 'Payroll', 'Income'),
  tx('2024-02-10', -1000, 'Rent', 'Housing'),
  tx('2024-03-10', -1000, 'Rent', 'Housing'),
  tx('2024-03-12', -1000, 'Rent', 'Housing'), // dup-ish but different (won't be deduped here)
];

describe('computeTotals', () => {
  it('ignores transfers and computes net + savings rate', () => {
    const t = computeTotals(data);
    expect(t.income).toBe(6000);
    expect(t.expense).toBe(4200);
    expect(t.net).toBe(1800);
    expect(Math.round(t.savingsRate * 100)).toBe(30);
  });
});

describe('spendingByCategory', () => {
  it('groups money-out and computes shares', () => {
    const cats = spendingByCategory(data);
    const housing = cats.find((c) => c.category === 'Housing');
    expect(housing?.amount).toBe(4000);
    expect(cats[0].category).toBe('Housing');
    // Transfers excluded from spending.
    expect(cats.find((c) => c.category === 'Transfers')).toBeUndefined();
  });
});

describe('monthlyBreakdown', () => {
  it('aggregates per month in chronological order', () => {
    const m = monthlyBreakdown(data);
    expect(m.map((x) => x.month)).toEqual(['2024-01', '2024-02', '2024-03']);
    expect(m[0].income).toBe(3000);
    expect(m[0].expense).toBe(1200); // rent + groceries, transfer excluded
  });
});

describe('detectRecurring', () => {
  it('flags charges repeating across 3+ months with consistent amount', () => {
    const rec = detectRecurring(data);
    const rent = rec.find((r) => r.description === 'Rent');
    expect(rent).toBeDefined();
    expect(rent?.amount).toBe(1000);
  });
});

describe('filterByPeriod', () => {
  it('filters by month and year', () => {
    expect(filterByPeriod(data, { kind: 'month', value: '2024-02' })).toHaveLength(2);
    expect(filterByPeriod(data, { kind: 'year', value: '2024' })).toHaveLength(8);
  });
});
