import { useState } from 'react';
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
      { id: transactionId(today, 0, `manual-${rs.length}`), date: today, description: '', amount: 0, category: 'Other', source: 'manual' },
      ...rs,
    ]);
  }

  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <section className="card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Review {rows.length} transactions</h2>
          <p className="text-xs text-slate-500">
            Fix anything the parser got wrong before adding it. Net of these rows:{' '}
            {formatMoney(total, currency)}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={addBlank}>
            + Add row
          </button>
          <button className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-primary" disabled={rows.length === 0} onClick={() => onCommit(rows)}>
            Add to analysis
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-auto rounded-lg border border-slate-200">
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
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="p-1">
                  <input
                    type="date"
                    className="w-36 rounded border border-slate-200 px-1 py-1"
                    value={r.date}
                    onChange={(e) => update(r.id, { date: e.target.value })}
                  />
                </td>
                <td className="p-1">
                  <input
                    className="w-full rounded border border-slate-200 px-1 py-1"
                    value={r.description}
                    onChange={(e) => update(r.id, { description: e.target.value })}
                  />
                </td>
                <td className="p-1">
                  <select
                    className="rounded border border-slate-200 px-1 py-1"
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
                <td className="p-1 text-right">
                  <input
                    type="number"
                    step="0.01"
                    className={`w-28 rounded border border-slate-200 px-1 py-1 text-right ${
                      r.amount < 0 ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                    value={r.amount}
                    onChange={(e) => update(r.id, { amount: parseFloat(e.target.value) || 0 })}
                  />
                </td>
                <td className="p-1 text-center">
                  <button
                    className="text-slate-400 hover:text-rose-600"
                    onClick={() => remove(r.id)}
                    aria-label="Remove row"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
