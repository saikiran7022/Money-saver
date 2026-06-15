import { describe, expect, it } from 'vitest';
import { autoDetectMapping, rowsToTransactions } from './tabularParser';

describe('autoDetectMapping', () => {
  it('finds columns from common header names', () => {
    const m = autoDetectMapping(['Transaction Date', 'Description', 'Debit', 'Credit', 'Balance']);
    expect(m.date).toBe(0);
    expect(m.description).toBe(1);
    expect(m.debit).toBe(2);
    expect(m.credit).toBe(3);
  });
});

describe('rowsToTransactions', () => {
  it('parses a signed-amount CSV', () => {
    const rows = [
      ['Date', 'Description', 'Amount'],
      ['2024-01-05', 'NETFLIX.COM', '-15.99'],
      ['2024-01-10', 'PAYROLL', '3000.00'],
    ];
    const { transactions } = rowsToTransactions(rows, 'a.csv', { dayFirst: false });
    expect(transactions).toHaveLength(2);
    expect(transactions[0]).toMatchObject({ amount: -15.99, category: 'Subscriptions' });
    expect(transactions[1].amount).toBe(3000);
  });

  it('combines debit and credit columns into a signed amount', () => {
    const rows = [
      ['Date', 'Details', 'Debit', 'Credit'],
      ['05/01/2024', 'Coffee', '4.50', ''],
      ['10/01/2024', 'Salary', '', '3000.00'],
    ];
    const { transactions } = rowsToTransactions(rows, 'b.csv', { dayFirst: true });
    expect(transactions[0].amount).toBe(-4.5);
    expect(transactions[1].amount).toBe(3000);
  });

  it('handles files with no header row', () => {
    const rows = [['2024-01-05', 'Shop', '-10.00']];
    const { transactions } = rowsToTransactions(rows, 'c.csv', { dayFirst: false });
    expect(transactions).toHaveLength(1);
    expect(transactions[0].amount).toBe(-10);
  });
});
