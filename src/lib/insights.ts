import type { Transaction } from '../types';
import { formatMoney } from './money';
import {
  computeTotals,
  detectRecurring,
  monthlyBreakdown,
  spendingByCategory,
} from './analytics';

export interface Insight {
  /** Visual tone for the UI. */
  tone: 'good' | 'warn' | 'info';
  text: string;
}

/**
 * Produce a short list of plain-language observations and suggestions from the
 * (already period-filtered) transactions. Everything here is derived from the
 * analytics helpers so the numbers always match the charts.
 */
export function generateInsights(txns: Transaction[], currency = '$'): Insight[] {
  const insights: Insight[] = [];
  if (txns.length === 0) return insights;

  const totals = computeTotals(txns);
  const fmt = (n: number) => formatMoney(n, currency);

  // Savings rate.
  if (totals.income > 0) {
    const pct = Math.round(totals.savingsRate * 100);
    if (totals.net >= 0) {
      insights.push({
        tone: pct >= 20 ? 'good' : 'info',
        text: `You saved ${fmt(totals.net)} — that's ${pct}% of your income.`,
      });
    } else {
      insights.push({
        tone: 'warn',
        text: `You spent ${fmt(-totals.net)} more than you earned this period.`,
      });
    }
  }

  // Largest spending category.
  const byCat = spendingByCategory(txns);
  if (byCat.length > 0) {
    const top = byCat[0];
    insights.push({
      tone: 'info',
      text: `Your biggest spending category is ${top.category}: ${fmt(top.amount)} (${Math.round(
        top.share * 100,
      )}% of spending).`,
    });
  }

  // Month-over-month change in total spending.
  const months = monthlyBreakdown(txns);
  if (months.length >= 2) {
    const prev = months[months.length - 2];
    const curr = months[months.length - 1];
    if (prev.expense > 0) {
      const change = (curr.expense - prev.expense) / prev.expense;
      const pct = Math.round(Math.abs(change) * 100);
      if (pct >= 10) {
        insights.push({
          tone: change > 0 ? 'warn' : 'good',
          text: `Spending ${change > 0 ? 'rose' : 'fell'} ${pct}% in ${curr.month} vs ${prev.month}.`,
        });
      }
    }
  }

  // Recurring / subscription load.
  const recurring = detectRecurring(txns);
  if (recurring.length > 0) {
    const monthlyTotal = recurring.reduce((s, r) => s + r.amount, 0);
    insights.push({
      tone: 'info',
      text: `Found ${recurring.length} recurring charge${
        recurring.length > 1 ? 's' : ''
      } (e.g. ${recurring[0].description}) totaling about ${fmt(monthlyTotal)} per month.`,
    });
  }

  // Average monthly spend.
  if (months.length >= 1) {
    const avg = months.reduce((s, m) => s + m.expense, 0) / months.length;
    insights.push({
      tone: 'info',
      text: `On average you spend ${fmt(avg)} per month across ${months.length} month${
        months.length > 1 ? 's' : ''
      } of data.`,
    });
  }

  return insights;
}
