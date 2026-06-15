import { describe, expect, it } from 'vitest';
import { linesToTransactions } from './parseHeuristics';

describe('linesToTransactions', () => {
  it('extracts rows and infers direction from the running-balance column', () => {
    const lines = [
      'Date Description Amount Balance', // header: no money tokens, skipped
      '01/01/2024 OPENING BALANCE 1,000.00',
      '05/01/2024 NETFLIX.COM 15.99 984.01', // balance fell => expense
      '10/01/2024 ACME PAYROLL 3,000.00 3,984.01', // balance rose => income
    ];
    const txns = linesToTransactions(lines, {
      dayFirst: true,
      lastColumnIsBalance: true,
      source: 'stmt.pdf',
    });
    const netflix = txns.find((t) => t.description === 'NETFLIX.COM');
    const payroll = txns.find((t) => t.description === 'ACME PAYROLL');
    expect(netflix?.amount).toBe(-15.99);
    expect(netflix?.category).toBe('Subscriptions');
    expect(payroll?.amount).toBe(3000);
    expect(payroll?.category).toBe('Income');
  });

  it('uses the last token as the amount when there is no balance column', () => {
    const txns = linesToTransactions(['2024-01-05 COFFEE SHOP -4.50'], {
      dayFirst: true,
      lastColumnIsBalance: false,
      source: 's',
    });
    expect(txns[0].amount).toBe(-4.5);
  });

  it('skips lines without a leading date', () => {
    const txns = linesToTransactions(['Opening balance 1,000.00', 'Page 1 of 3'], {
      dayFirst: true,
      lastColumnIsBalance: true,
      source: 's',
    });
    expect(txns).toHaveLength(0);
  });
});
