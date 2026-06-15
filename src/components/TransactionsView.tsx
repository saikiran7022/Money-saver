import { useMemo, useState } from 'react';
import { Search, Trash2 } from 'lucide-react';
import type { PeriodFilter } from '../types';
import { useStore } from '../state/store';
import { filterByPeriod } from '../lib/analytics';
import { formatMoney } from '../lib/money';
import { categoryColor } from '../lib/categoryColors';
import { CATEGORIES } from '../lib/categorize';

export default function TransactionsView({ filter }: { filter: PeriodFilter }) {
  const transactions = useStore((s) => s.transactions);
  const currency = useStore((s) => s.settings.currency);
  const setCategory = useStore((s) => s.setCategory);
  const removeTransaction = useStore((s) => s.removeTransaction);
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const byPeriod = filterByPeriod(transactions, filter);
    const q = query.trim().toLowerCase();
    return q
      ? byPeriod.filter(
          (t) => t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q),
        )
      : byPeriod;
  }, [transactions, filter, query]);

  return (
    <div className="card">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          <span className="font-semibold text-slate-700">{rows.length}</span> transactions
        </p>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input w-full pl-9"
            placeholder="Search description or category…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Mobile: compact stacked rows (no sideways scrolling). */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {rows.map((t) => (
          <li key={t.id} className="flex flex-col gap-1.5 py-2.5">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 truncate font-medium text-slate-700">{t.description}</p>
              <span
                className={`shrink-0 font-semibold tabular-nums ${
                  t.amount < 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {formatMoney(t.amount, currency)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-xs text-slate-400">{t.date}</span>
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: categoryColor(t.category) }}
              />
              <select
                className="input !min-h-0 flex-1 !py-1 !text-sm"
                value={t.category}
                onChange={(e) => setCategory(t.id, e.target.value, false)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                onClick={() => removeTransaction(t.id)}
                aria-label="Delete transaction"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="py-10 text-center text-sm text-slate-400">No transactions match.</li>
        )}
      </ul>

      {/* Desktop: full table. */}
      <div className="hidden overflow-auto rounded-xl border border-slate-200 md:block">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Description</th>
              <th className="p-3">Category</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                <td className="whitespace-nowrap p-3 text-slate-500">{t.date}</td>
                <td className="p-3 font-medium text-slate-700">{t.description}</td>
                <td className="p-3">
                  <div className="inline-flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: categoryColor(t.category) }}
                    />
                    <select
                      className="input !py-1 !text-xs"
                      value={t.category}
                      onChange={(e) => setCategory(t.id, e.target.value, false)}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                <td
                  className={`whitespace-nowrap p-3 text-right font-semibold tabular-nums ${
                    t.amount < 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {formatMoney(t.amount, currency)}
                </td>
                <td className="p-3 text-center">
                  <button
                    className="text-slate-300 transition hover:text-rose-600"
                    onClick={() => removeTransaction(t.id)}
                    aria-label="Delete transaction"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm text-slate-400">
                  No transactions match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
