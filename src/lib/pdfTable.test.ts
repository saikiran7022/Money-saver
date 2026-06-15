import { describe, expect, it } from 'vitest';
import { extractTable, type PositionedItem } from './pdfTable';

// Helper: build positioned items for one row at a given y from [x, text] pairs.
// Width is approximated from text length so column-center math is realistic.
function row(y: number, cells: [number, string][]): PositionedItem[] {
  return cells.map(([x, str]) => ({ str, x, y, width: str.length * 5 }));
}

const YEAR = 2024;

describe('extractTable — major US bank layouts', () => {
  it('Chase checking: Date / Description / Amount / Balance, year-less dates', () => {
    const items = [
      ...row(100, [[50, 'Date'], [120, 'Description'], [400, 'Amount'], [500, 'Balance']]),
      ...row(90, [[50, '01/05'], [120, 'NETFLIX.COM'], [400, '-15.99'], [500, '1,984.01']]),
      ...row(80, [[50, '01/10'], [120, 'ACME PAYROLL'], [400, '3,000.00'], [500, '4,984.01']]),
    ];
    const { transactions, headerFound } = extractTable(items, 'chase.pdf', false, YEAR);
    expect(headerFound).toBe(true);
    expect(transactions).toHaveLength(2);
    expect(transactions[0]).toMatchObject({
      date: '2024-01-05',
      description: 'NETFLIX.COM',
      amount: -15.99,
      category: 'Subscriptions',
    });
    // No sign on the amount; direction recovered from the rising balance.
    expect(transactions[1]).toMatchObject({ date: '2024-01-10', amount: 3000, category: 'Income' });
  });

  it('Wells Fargo: separate Deposits/Credits and Withdrawals/Debits columns', () => {
    const items = [
      ...row(100, [
        [40, 'Date'],
        [110, 'Description'],
        [350, 'Deposits/ Credits'],
        [440, 'Withdrawals/ Debits'],
        [540, 'Ending daily balance'],
      ]),
      ...row(90, [[40, '03/01'], [110, 'PAYROLL'], [350, '3,000.00'], [540, '5,000.00']]),
      ...row(80, [[40, '03/02'], [110, 'RENT PAYMENT'], [440, '1,450.00'], [540, '3,550.00']]),
    ];
    const { transactions } = extractTable(items, 'wf.pdf', false, YEAR);
    expect(transactions).toHaveLength(2);
    // Column position determines direction: credit col => +, debit col => -.
    expect(transactions[0]).toMatchObject({ date: '2024-03-01', amount: 3000, category: 'Income' });
    expect(transactions[1]).toMatchObject({ date: '2024-03-02', amount: -1450, category: 'Housing' });
  });

  it('Capital One: two date columns (trans + post), uses the transaction date', () => {
    const items = [
      ...row(100, [[40, 'Trans Date'], [110, 'Post Date'], [180, 'Description'], [450, 'Amount']]),
      ...row(90, [[40, '03/15'], [110, '03/16'], [180, 'UBER TRIP'], [450, '27.50']]),
    ];
    const { transactions } = extractTable(items, 'capone.pdf', false, YEAR);
    expect(transactions).toHaveLength(1);
    expect(transactions[0].date).toBe('2024-03-15'); // trans date, not post date
    expect(transactions[0].description).toContain('UBER');
    expect(transactions[0].amount).toBe(-27.5);
    expect(transactions[0].category).toBe('Transport');
  });

  it('Bank of America: Date / Description / Amount, refund signed as income', () => {
    const items = [
      ...row(100, [[40, 'Date'], [110, 'Description'], [450, 'Amount']]),
      ...row(90, [[40, '01/15/2024'], [110, 'STARBUCKS STORE'], [450, '-6.45']]),
      ...row(80, [[40, '01/20/2024'], [110, 'AMAZON REFUND'], [450, '25.00']]),
    ];
    const { transactions } = extractTable(items, 'bofa.pdf', false);
    expect(transactions).toHaveLength(2);
    expect(transactions[0]).toMatchObject({ amount: -6.45, category: 'Dining' });
    // No balance/sign, but "refund" wording marks it as money in.
    expect(transactions[1]).toMatchObject({ amount: 25, category: 'Income' });
  });

  it('merges a wrapped (multi-line) description into the previous transaction', () => {
    const items = [
      ...row(100, [[40, 'Date'], [110, 'Description'], [450, 'Amount']]),
      ...row(90, [[40, '02/01/2024'], [110, 'SQ *BLUE BOTTLE'], [450, '-5.50']]),
      ...row(82, [[110, 'COFFEE SAN FRANCISCO CA']]), // continuation, no date/amount
    ];
    const { transactions } = extractTable(items, 'x.pdf', false);
    expect(transactions).toHaveLength(1);
    expect(transactions[0].description).toBe('SQ *BLUE BOTTLE COFFEE SAN FRANCISCO CA');
  });

  it('keeps numbers that live in the description out of the amount', () => {
    const items = [
      ...row(100, [[40, 'Date'], [110, 'Description'], [450, 'Amount']]),
      ...row(90, [[40, '02/03/2024'], [110, 'STORE #1234 PURCHASE'], [450, '-42.00']]),
    ];
    const { transactions } = extractTable(items, 'x.pdf', false);
    expect(transactions[0].amount).toBe(-42); // not 1234
  });

  it('returns headerFound=false when there is no recognizable header', () => {
    const items = [...row(90, [[40, 'just'], [110, 'some'], [450, 'text']])];
    expect(extractTable(items, 'x.pdf', false).headerFound).toBe(false);
  });
});
