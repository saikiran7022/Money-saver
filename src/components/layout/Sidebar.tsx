import { LayoutDashboard, ListChecks, Receipt, ShieldCheck, Trash2, Wallet } from 'lucide-react';
import { useStore } from '../../state/store';

export type Section = 'overview' | 'transactions' | 'rules';

const NAV: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: Receipt },
  { id: 'rules', label: 'Rules', icon: ListChecks },
];

interface Props {
  section: Section;
  onSection: (s: Section) => void;
}

export default function Sidebar({ section, onSection }: Props) {
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const clearAll = useStore((s) => s.clearAll);
  const count = useStore((s) => s.transactions.length);

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-gradient-to-b from-ink-900 to-ink-800 text-white">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow">
          <Wallet className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">Money Saver</p>
          <p className="text-xs text-slate-400">Private finance analytics</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="mt-2 flex-1 space-y-1 px-3">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onSection(id)}
            className={`nav-item w-full ${section === id ? 'nav-item-active' : ''}`}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
            {id === 'transactions' && count > 0 && (
              <span className="ml-auto rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold">
                {count}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Settings */}
      <div className="space-y-3 border-t border-white/10 px-4 py-4 text-sm">
        <label className="flex items-center justify-between gap-2 text-slate-300">
          <span title="Stored only in this browser (IndexedDB). Never uploaded.">
            Save on this device
          </span>
          <input
            type="checkbox"
            className="h-4 w-4 accent-brand-400"
            checked={settings.persist}
            onChange={(e) => setSettings({ persist: e.target.checked })}
          />
        </label>

        <label className="flex items-center justify-between gap-2 text-slate-300">
          <span>Currency</span>
          <select
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white"
            value={settings.currency}
            onChange={(e) => setSettings({ currency: e.target.value })}
          >
            {['$', '€', '£', '₹', '¥'].map((c) => (
              <option key={c} value={c} className="text-slate-900">
                {c}
              </option>
            ))}
          </select>
        </label>

        {count > 0 && (
          <button
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-slate-400 transition hover:bg-white/10 hover:text-rose-300"
            onClick={() => {
              if (confirm('Clear all transactions, rules and saved data from this browser?')) {
                void clearAll();
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
            Clear all data
          </button>
        )}

        <div className="flex items-start gap-2 rounded-xl bg-emerald-500/10 p-3 text-xs text-emerald-200">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>100% local. No server, no tracking, no bank connection.</span>
        </div>
      </div>
    </aside>
  );
}
