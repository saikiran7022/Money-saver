import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { DraftTransaction } from '../types';
import { CATEGORIES } from '../lib/categorize';
import { transactionId } from '../lib/dedupe';
import { useStore } from '../state/store';
import { formatMoney } from '../lib/money';

interface Props {
  drafts: DraftTransaction[];
  onCommit: (reviewed: DraftTransaction[]) => void;
  onCancel: () => void;
}

export default function ReviewTable({ drafts, onCommit, onCancel }: Props) {
  const currency = useStore((s) => s.settings.currency);
  const [rows, setRows] = useState<DraftTransaction[]>(drafts);

  function update(id: string, patch: Partial<DraftTransaction>) {
    setRows((rs) =>
      rs.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...patch };
        // Keep the content id in sync so dedupe stays correct after edits.
        next.id = transactionId(next.date, next.amount, next.description);
        return next;
      }),
    );
  }

  function remove(id: string) {
    setRows((rs) => rs.filter((r) => r.id !== id));
  }

  function addBlank() {
    const today = new Date().toISOString().slice(0, 10);
    setRows((rs) => [
      {
        id: transactionId(today, 0, `manual-${rs.length}`),
        date: today,
        description: '',
        amount: 0,
        category: 'Other',
        source: 'manual',
      },
      ...rs,
    ]);
  }

  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">
          <span className="font-semibold text-slate-700">{rows.length}</span> transactions · net{' '}
          <span className={total < 0 ? 'text-rose-600' : 'text-emerald-600'}>
            {formatMoney(total, currency)}
          </span>
        </p>
        <button className="btn-ghost" onClick={addBlank}>
          <Plus className="h-4 w-4" />
          Add row
        </button>
      </div>

      {/* Mobile: one editable card per row (no sideways scrolling). */}
      <ul className="max-h-[60vh] space-y-3 overflow-auto md:hidden">
        {rows.map((r) => (
          <li key={r.id} className="rounded-xl border border-slate-200 p-3">
            <div className="flex items-start gap-2">
              <input
                className="input flex-1"
                placeholder="Description"
                value={r.description}
                onChange={(e) => update(r.id, { description: e.target.value })}
              />
              <button
                className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                onClick={() => remove(r.id)}
                aria-label="Remove row"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="text-xs text-slate-400">
                Date
                <input
                  type="date"
                  className="input mt-1 w-full"
                  value={r.date}
                  onChange={(e) => update(r.id, { date: e.target.value })}
                />
              </label>
              <label className="text-xs text-slate-400">
                Amount
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  className={`input mt-1 w-full text-right font-medium ${
                    r.amount < 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                  value={r.amount}
                  onChange={(e) => update(r.id, { amount: parseFloat(e.target.value) || 0 })}
                />
              </label>
            </div>
            <label className="mt-2 block text-xs text-slate-400">
              Category
              <select
                className="input mt-1 w-full"
                value={r.category}
                onChange={(e) => update(r.id, { category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </li>
        ))}
      </ul>

      {/* Desktop: editable table. */}
      <div className="hidden max-h-[22rem] overflow-auto rounded-xl border border-slate-200 md:block">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="p-2.5">Date</th>
              <th className="p-2.5">Description</th>
              <th className="p-2.5">Category</th>
              <th className="p-2.5 text-right">Amount</th>
              <th className="p-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                <td className="p-1.5">
                  <input
                    type="date"
                    className="input w-36"
                    value={r.date}
                    onChange={(e) => update(r.id, { date: e.target.value })}
                  />
                </td>
                <td className="p-1.5">
                  <input
                    className="input w-full"
                    value={r.description}
                    onChange={(e) => update(r.id, { description: e.target.value })}
                  />
                </td>
                <td className="p-1.5">
                  <select
                    className="input"
                    value={r.category}
                    onChange={(e) => update(r.id, { category: e.target.value })}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-1.5 text-right">
                  <input
                    type="number"
                    step="0.01"
                    className={`input w-28 text-right font-medium ${
                      r.amount < 0 ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                    value={r.amount}
                    onChange={(e) => update(r.id, { amount: parseFloat(e.target.value) || 0 })}
                  />
                </td>
                <td className="p-1.5 text-center">
                  <button
                    className="text-slate-300 transition hover:text-rose-600"
                    onClick={() => remove(r.id)}
                    aria-label="Remove row"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onCancel}>
          Back
        </button>
        <button className="btn-primary" disabled={rows.length === 0} onClick={() => onCommit(rows)}>
          Add {rows.length} to analysis
        </button>
      </div>
    </div>
  );
}
