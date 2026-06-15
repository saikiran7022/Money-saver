import { useMemo, useState } from 'react';
import type { PeriodFilter } from '../types';
import { useStore } from '../state/store';
import {
  availableMonths,
  availableYears,
  computeTotals,
  detectRecurring,
  filterByPeriod,
  monthlyBreakdown,
  spendingByCategory,
  topMerchants,
} from '../lib/analytics';
import { generateInsights } from '../lib/insights';
import { formatMoney } from '../lib/money';
import { CATEGORIES } from '../lib/categorize';
import Insights from './Insights';
import RulesManager from './RulesManager';
import IncomeVsExpense from './charts/IncomeVsExpense';
import SpendingByCategory from './charts/SpendingByCategory';
import MonthlyTrend from './charts/MonthlyTrend';

export default function Dashboard() {
  const transactions = useStore((s) => s.transactions);
  const currency = useStore((s) => s.settings.currency);
  const setCategory = useStore((s) => s.setCategory);
  const removeTransaction = useStore((s) => s.removeTransaction);

  const [filter, setFilter] = useState<PeriodFilter>({ kind: 'all' });

  const years = useMemo(() => availableYears(transactions), [transactions]);
  const months = useMemo(() => availableMonths(transactions), [transactions]);
  const filtered = useMemo(() => filterByPeriod(transactions, filter), [transactions, filter]);

  const totals = useMemo(() => computeTotals(filtered), [filtered]);
  const byCategory = useMemo(() => spendingByCategory(filtered), [filtered]);
  const monthly = useMemo(() => monthlyBreakdown(filtered), [filtered]);
  const merchants = useMemo(() => topMerchants(filtered), [filtered]);
  const recurring = useMemo(() => detectRecurring(filtered), [filtered]);
  const insights = useMemo(() => generateInsights(filtered, currency), [filtered, currency]);

  return (
    <div className="space-y-6">
      {/* Period filter */}
      <div className="card flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-slate-600">Period</span>
        <select
          className="rounded border border-slate-200 px-2 py-1 text-sm"
          value={`${filter.kind}:${filter.value ?? ''}`}
          onChange={(e) => {
            const [kind, value] = e.target.value.split(':');
            if (kind === 'all') setFilter({ kind: 'all' });
            else setFilter({ kind: kind as PeriodFilter['kind'], value });
          }}
        >
          <option value="all:">All time</option>
          {years.length > 0 && (
            <optgroup label="Year">
              {years.map((y) => (
                <option key={y} value={`year:${y}`}>
                  {y}
                </option>
              ))}
            </optgroup>
          )}
          {months.length > 0 && (
            <optgroup label="Month">
              {months.map((m) => (
                <option key={m} value={`month:${m}`}>
                  {m}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <span className="text-xs text-slate-400">{filtered.length} transactions</span>
      </div>

      {/* Totals */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Income" value={formatMoney(totals.income, currency)} tone="emerald" />
        <StatCard label="Spending" value={formatMoney(totals.expense, currency)} tone="rose" />
        <StatCard
          label="Net savings"
          value={formatMoney(totals.net, currency)}
          tone={totals.net >= 0 ? 'emerald' : 'rose'}
        />
        <StatCard label="Savings rate" value={`${Math.round(totals.savingsRate * 100)}%`} tone="brand" />
      </div>

      <Insights insights={insights} />

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-2 text-sm font-semibold text-slate-600">Income vs spending by month</h3>
          <IncomeVsExpense data={monthly} />
        </div>
        <div className="card">
          <h3 className="mb-2 text-sm font-semibold text-slate-600">Spending by category</h3>
          {byCategory.length > 0 ? (
            <SpendingByCategory data={byCategory} />
          ) : (
            <p className="py-12 text-center text-sm text-slate-400">No spending in this period.</p>
          )}
        </div>
        <div className="card lg:col-span-2">
          <h3 className="mb-2 text-sm font-semibold text-slate-600">Net savings trend</h3>
          <MonthlyTrend data={monthly} />
        </div>
      </div>

      {/* Category breakdown + top merchants + recurring */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card">
          <h3 className="mb-2 text-sm font-semibold text-slate-600">Categories</h3>
          <ul className="space-y-1 text-sm">
            {byCategory.map((c) => (
              <li key={c.category} className="flex justify-between">
                <span>{c.category}</span>
                <span className="tabular-nums text-slate-600">
                  {formatMoney(c.amount, currency)} · {Math.round(c.share * 100)}%
                </span>
              </li>
            ))}
            {byCategory.length === 0 && <li className="text-slate-400">No spending.</li>}
          </ul>
        </div>
        <div className="card">
          <h3 className="mb-2 text-sm font-semibold text-slate-600">Top merchants</h3>
          <ul className="space-y-1 text-sm">
            {merchants.map((m) => (
              <li key={m.description} className="flex justify-between gap-2">
                <span className="truncate" title={m.description}>
                  {m.description}
                </span>
                <span className="tabular-nums text-slate-600">{formatMoney(m.amount, currency)}</span>
              </li>
            ))}
            {merchants.length === 0 && <li className="text-slate-400">No spending.</li>}
          </ul>
        </div>
        <div className="card">
          <h3 className="mb-2 text-sm font-semibold text-slate-600">Recurring charges</h3>
          <ul className="space-y-1 text-sm">
            {recurring.map((r) => (
              <li key={r.description} className="flex justify-between gap-2">
                <span className="truncate" title={r.description}>
                  {r.description}
                </span>
                <span className="tabular-nums text-slate-600">
                  {formatMoney(r.amount, currency)}/mo
                </span>
              </li>
            ))}
            {recurring.length === 0 && (
              <li className="text-slate-400">None detected (needs 3+ months).</li>
            )}
          </ul>
        </div>
      </div>

      {/* Transactions */}
      <div className="card">
        <h3 className="mb-2 text-sm font-semibold text-slate-600">
          Transactions ({filtered.length})
        </h3>
        <div className="max-h-[28rem] overflow-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="p-2">Date</th>
                <th className="p-2">Description</th>
                <th className="p-2">Category</th>
                <th className="p-2 text-right">Amount</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-t border-slate-100">
                  <td className="whitespace-nowrap p-2 text-slate-500">{t.date}</td>
                  <td className="p-2">{t.description}</td>
                  <td className="p-2">
                    <select
                      className="rounded border border-slate-200 px-1 py-0.5 text-xs"
                      value={t.category}
                      onChange={(e) => setCategory(t.id, e.target.value, false)}
                      title="Hold to set just this row; use Rules to apply everywhere"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td
                    className={`whitespace-nowrap p-2 text-right tabular-nums ${
                      t.amount < 0 ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {formatMoney(t.amount, currency)}
                  </td>
                  <td className="p-2 text-center">
                    <button
                      className="text-slate-300 hover:text-rose-600"
                      onClick={() => removeTransaction(t.id)}
                      aria-label="Delete transaction"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <RulesManager />
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'emerald' | 'rose' | 'brand';
}) {
  const color =
    tone === 'emerald'
      ? 'text-emerald-600'
      : tone === 'rose'
        ? 'text-rose-600'
        : 'text-brand-600';
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
