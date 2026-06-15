import { useState } from 'react';
import { ArrowRight, ListChecks, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../state/store';
import { CATEGORIES } from '../lib/categorize';
import { categoryColor } from '../lib/categoryColors';

export default function RulesManager() {
  const rules = useStore((s) => s.rules);
  const addRule = useStore((s) => s.addRule);
  const removeRule = useStore((s) => s.removeRule);
  const [match, setMatch] = useState('');
  const [category, setCategory] = useState<string>('Other');

  return (
    <div className="card mx-auto max-w-2xl">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <ListChecks className="h-4 w-4 text-slate-400" />
        Categorization rules
      </div>
      <p className="mt-1 text-sm text-slate-500">
        When a description contains your text, it’s filed under the chosen category. Rules apply to
        every transaction and are remembered on this device.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-500">
            If description contains
          </label>
          <input
            className="input w-full"
            placeholder="e.g. spotify"
            value={match}
            onChange={(e) => setMatch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && match.trim()) {
                addRule({ match: match.trim().toLowerCase(), category });
                setMatch('');
              }
            }}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Category</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
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
          <Plus className="h-4 w-4" />
          Add rule
        </button>
      </div>

      {rules.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400">
          No custom rules yet. Add one above, or change a transaction’s category to teach the app.
        </p>
      ) : (
        <ul className="mt-5 space-y-2">
          {rules.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2">
                <span className="font-mono text-slate-600">“{r.match}”</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: categoryColor(r.category) }}
                  />
                  {r.category}
                </span>
              </span>
              <button
                className="text-slate-300 transition hover:text-rose-600"
                onClick={() => removeRule(r.id)}
                aria-label="Remove rule"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
