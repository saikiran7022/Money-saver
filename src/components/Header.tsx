import { useStore } from '../state/store';

export default function Header() {
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const clearAll = useStore((s) => s.clearAll);
  const hasData = useStore((s) => s.transactions.length > 0);

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">💰</span>
          <div>
            <h1 className="text-lg font-semibold leading-tight">Money Saver</h1>
            <p className="text-xs text-slate-500">Private spending &amp; earnings analysis</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600" title="Stored only in this browser via IndexedDB. Never uploaded.">
            <input
              type="checkbox"
              checked={settings.persist}
              onChange={(e) => setSettings({ persist: e.target.checked })}
            />
            Save on this device
          </label>

          <select
            className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
            value={settings.currency}
            onChange={(e) => setSettings({ currency: e.target.value })}
            aria-label="Display currency"
          >
            {['$', '€', '£', '₹', '¥'].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {hasData && (
            <button
              className="btn-ghost"
              onClick={() => {
                if (confirm('Clear all transactions, rules and saved data from this browser?')) {
                  void clearAll();
                }
              }}
            >
              Clear all data
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
