import type { PeriodFilter, Transaction } from '../types';

export interface Totals {
  income: number;
  expense: number; // positive number representing money out
  net: number;
  savingsRate: number; // net / income, 0..1 (0 if no income)
  count: number;
}

export interface CategoryTotal {
  category: string;
  amount: number; // money out (positive)
  share: number; // 0..1 of total expense
}

export interface MonthlyPoint {
  month: string; // YYYY-MM
  income: number;
  expense: number;
  net: number;
}

export interface MerchantTotal {
  description: string;
  amount: number; // money out (positive)
  count: number;
}

export interface Recurring {
  description: string;
  amount: number; // typical money out (positive)
  occurrences: number;
}

/** Apply a period filter to the transaction list. */
export function filterByPeriod(txns: Transaction[], filter: PeriodFilter): Transaction[] {
  switch (filter.kind) {
    case 'all':
      return txns;
    case 'year':
      return txns.filter((t) => t.date.startsWith(`${filter.value}-`));
    case 'month':
      return txns.filter((t) => t.date.startsWith(`${filter.value}`));
    case 'custom':
      return txns.filter(
        (t) => (!filter.from || t.date >= filter.from) && (!filter.to || t.date <= filter.to),
      );
  }
}

export function computeTotals(txns: Transaction[]): Totals {
  let income = 0;
  let expense = 0;
  for (const t of txns) {
    if (t.category === 'Transfers') continue; // transfers aren't income/spend
    if (t.amount > 0) income += t.amount;
    else expense += -t.amount;
  }
  const net = income - expense;
  return {
    income,
    expense,
    net,
    savingsRate: income > 0 ? net / income : 0,
    count: txns.length,
  };
}

/** Spending grouped by category (money out only), sorted high → low. */
export function spendingByCategory(txns: Transaction[]): CategoryTotal[] {
  const map = new Map<string, number>();
  let total = 0;
  for (const t of txns) {
    if (t.amount >= 0 || t.category === 'Transfers') continue;
    const v = -t.amount;
    map.set(t.category, (map.get(t.category) ?? 0) + v);
    total += v;
  }
  return [...map.entries()]
    .map(([category, amount]) => ({ category, amount, share: total > 0 ? amount / total : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

/** Income vs expense per calendar month, oldest → newest. */
export function monthlyBreakdown(txns: Transaction[]): MonthlyPoint[] {
  const map = new Map<string, MonthlyPoint>();
  for (const t of txns) {
    if (t.category === 'Transfers') continue;
    const month = t.date.slice(0, 7);
    const point = map.get(month) ?? { month, income: 0, expense: 0, net: 0 };
    if (t.amount > 0) point.income += t.amount;
    else point.expense += -t.amount;
    point.net = point.income - point.expense;
    map.set(month, point);
  }
  return [...map.values()].sort((a, b) => (a.month < b.month ? -1 : 1));
}

/** Top merchants/descriptions by money spent. */
export function topMerchants(txns: Transaction[], limit = 8): MerchantTotal[] {
  const map = new Map<string, MerchantTotal>();
  for (const t of txns) {
    if (t.amount >= 0 || t.category === 'Transfers') continue;
    const key = t.description.toLowerCase();
    const m = map.get(key) ?? { description: t.description, amount: 0, count: 0 };
    m.amount += -t.amount;
    m.count += 1;
    map.set(key, m);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount).slice(0, limit);
}

/**
 * Detect likely recurring charges (subscriptions, rent, etc.): the same
 * description appearing in 3+ distinct months with a similar amount.
 */
export function detectRecurring(txns: Transaction[]): Recurring[] {
  const groups = new Map<string, { amounts: number[]; months: Set<string>; label: string }>();
  for (const t of txns) {
    if (t.amount >= 0 || t.category === 'Transfers') continue;
    const key = t.description.toLowerCase();
    const g = groups.get(key) ?? { amounts: [], months: new Set(), label: t.description };
    g.amounts.push(-t.amount);
    g.months.add(t.date.slice(0, 7));
    groups.set(key, g);
  }

  const out: Recurring[] = [];
  for (const g of groups.values()) {
    if (g.months.size < 3) continue;
    const avg = g.amounts.reduce((a, b) => a + b, 0) / g.amounts.length;
    // Require amounts to be reasonably consistent (within ~20% of the average).
    const consistent = g.amounts.every((a) => Math.abs(a - avg) <= Math.max(1, avg * 0.2));
    if (!consistent) continue;
    out.push({ description: g.label, amount: avg, occurrences: g.months.size });
  }
  return out.sort((a, b) => b.amount - a.amount);
}

/** Distinct YYYY values present in the data, newest first. */
export function availableYears(txns: Transaction[]): string[] {
  const set = new Set(txns.map((t) => t.date.slice(0, 4)));
  return [...set].sort().reverse();
}

/** Distinct YYYY-MM values present, newest first. */
export function availableMonths(txns: Transaction[]): string[] {
  const set = new Set(txns.map((t) => t.date.slice(0, 7)));
  return [...set].sort().reverse();
}
