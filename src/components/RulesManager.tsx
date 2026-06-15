import { useState } from 'react';
import { useStore } from '../state/store';
import { CATEGORIES } from '../lib/categorize';

export default function RulesManager() {
  const rules = useStore((s) => s.rules);
  const addRule = useStore((s) => s.addRule);
  const removeRule = useStore((s) => s.removeRule);
  const [match, setMatch] = useState('');
  const [category, setCategory] = useState<string>('Other');

  return (
    <section className="card">
      <h2 className="text-base font-semibold">Categorization rules</h2>
      <p className="mb-3 text-xs text-slate-500">
        When a description contains your text, it’s filed under the chosen category. Rules apply
        to all transactions and are remembered locally.
      </p>

      <div className="mb-3 flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[12rem]">
          <label className="block text-xs text-slate-500">If description contains</label>
          <input
            className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
            placeholder="e.g. spotify"
            value={match}
            onChange={(e) => setMatch(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500">Category</label>
          <select
            className="rounded border border-slate-200 px-2 py-1 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <button
          className="btn-primary"
          disabled={!match.trim()}
          onClick={() => {
            addRule({ match: match.trim().toLowerCase(), category });
            setMatch('');
          }}
        >
          Add rule
        </button>
      </div>

      {rules.length === 0 ? (
        <p className="text-sm text-slate-400">No custom rules yet.</p>
      ) : (
        <ul className="space-y-1">
          {rules.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded border border-slate-100 px-2 py-1 text-sm"
            >
              <span>
                “{r.match}” → <strong>{r.category}</strong>
              </span>
              <button
                className="text-slate-400 hover:text-rose-600"
                onClick={() => removeRule(r.id)}
                aria-label="Remove rule"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
