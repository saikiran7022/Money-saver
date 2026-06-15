import { describe, expect, it } from 'vitest';
import { categorize } from './categorize';
import type { Rule } from '../types';

describe('categorize', () => {
  it('matches built-in keywords for expenses', () => {
    expect(categorize('NETFLIX.COM', -15.99, [])).toBe('Subscriptions');
    expect(categorize('UBER TRIP', -12.5, [])).toBe('Transport');
    expect(categorize('WHOLE FOODS MARKET', -82.1, [])).toBe('Groceries');
  });

  it('classifies salary as income', () => {
    expect(categorize('ACME CORP PAYROLL', 3000, [])).toBe('Income');
  });

  it('does not assign an expense category to money-in', () => {
    // "amazon" keyword maps to Shopping, but a positive amount is a refund/income.
    expect(categorize('AMAZON REFUND', 25, [])).toBe('Income');
  });

  it('lets user rules override the defaults', () => {
    const rules: Rule[] = [{ id: '1', match: 'netflix', category: 'Entertainment' }];
    expect(categorize('NETFLIX.COM', -15.99, rules)).toBe('Entertainment');
  });

  it('falls back to Other for unknown expenses', () => {
    expect(categorize('ZZZ UNKNOWN MERCHANT', -10, [])).toBe('Other');
  });
});
