import { Upload } from 'lucide-react';
import type { PeriodFilter } from '../../types';
import type { Section } from './Sidebar';
import { availableMonths, availableYears } from '../../lib/analytics';
import { useStore } from '../../state/store';

const TITLES: Record<Section, { title: string; subtitle: string }> = {
  overview: { title: 'Overview', subtitle: 'Your spending and earnings at a glance' },
  transactions: { title: 'Transactions', subtitle: 'Every line, categorized and editable' },
  rules: { title: 'Categorization rules', subtitle: 'Teach the app how to file your spending' },
};

interface Props {
  section: Section;
  filter: PeriodFilter;
  onFilter: (f: PeriodFilter) => void;
  onImport: () => void;
}

export default function Topbar({ section, filter, onFilter, onImport }: Props) {
  const transactions = useStore((s) => s.transactions);
  const years = availableYears(transactions);
  const months = availableMonths(transactions);
  const { title, subtitle } = TITLES[section];
  const showFilter = section !== 'rules' && transactions.length > 0;

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 bg-white/80 px-6 py-4 backdrop-blur">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {showFilter && (
          <select
            className="input"
            value={`${filter.kind}:${filter.value ?? ''}`}
            onChange={(e) => {
              const [kind, value] = e.target.value.split(':');
              if (kind === 'all') onFilter({ kind: 'all' });
              else onFilter({ kind: kind as PeriodFilter['kind'], value });
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
        )}

        <button className="btn-primary" onClick={onImport}>
          <Upload className="h-4 w-4" />
          Import statements
        </button>
      </div>
    </div>
  );
}
