import { useMemo } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  PiggyBank,
  Repeat,
  Store,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import type { PeriodFilter } from '../types';
import { useStore } from '../state/store';
import {
  computeTotals,
  detectRecurring,
  filterByPeriod,
  monthlyBreakdown,
  spendingByCategory,
  topMerchants,
} from '../lib/analytics';
import { generateInsights } from '../lib/insights';
import { formatMoney } from '../lib/money';
import { categoryColor } from '../lib/categoryColors';
import Insights from './Insights';
import IncomeVsExpense from './charts/IncomeVsExpense';
import SpendingByCategory from './charts/SpendingByCategory';
import MonthlyTrend from './charts/MonthlyTrend';

export default function Overview({ filter }: { filter: PeriodFilter }) {
  const transactions = useStore((s) => s.transactions);
  const currency = useStore((s) => s.settings.currency);

  const filtered = useMemo(() => filterByPeriod(transactions, filter), [transactions, filter]);
  const totals = useMemo(() => computeTotals(filtered), [filtered]);
  const byCategory = useMemo(() => spendingByCategory(filtered), [filtered]);
  const monthly = useMemo(() => monthlyBreakdown(filtered), [filtered]);
  const merchants = useMemo(() => topMerchants(filtered), [filtered]);
  const recurring = useMemo(() => detectRecurring(filtered), [filtered]);
  const insights = useMemo(() => generateInsights(filtered, currency), [filtered, currency]);

  // Month-over-month deltas for the KPI cards.
  const delta = useMemo(() => {
    if (monthly.length < 2) return null;
    const prev = monthly[monthly.length - 2];
    const curr = monthly[monthly.length - 1];
    const pct = (a: number, b: number) => (b > 0 ? (a - b) / b : 0);
    return { income: pct(curr.income, prev.income), expense: pct(curr.expense, prev.expense) };
  }, [monthly]);

  const fmt = (n: number) => formatMoney(n, currency);

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={TrendingUp}
          tone="emerald"
          label="Income"
          value={fmt(totals.income)}
          delta={delta?.income}
          deltaGoodWhenUp
        />
        <StatCard
          icon={TrendingDown}
          tone="rose"
          label="Spending"
          value={fmt(totals.expense)}
          delta={delta?.expense}
          deltaGoodWhenUp={false}
        />
        <StatCard
          icon={Wallet}
          tone={totals.net >= 0 ? 'emerald' : 'rose'}
          label="Net savings"
          value={fmt(totals.net)}
        />
        <StatCard
          icon={PiggyBank}
          tone="brand"
          label="Savings rate"
          value={`${Math.round(totals.savingsRate * 100)}%`}
        />
      </div>

      {insights.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">Insights</h2>
          <Insights insights={insights} />
        </section>
      )}

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Income vs spending" subtitle="By month">
          <IncomeVsExpense data={monthly} />
        </ChartCard>
        <ChartCard title="Spending by category" subtitle={`${byCategory.length} categories`}>
          {byCategory.length > 0 ? (
            <SpendingByCategory data={byCategory} />
          ) : (
            <Empty>No spending in this period.</Empty>
          )}
        </ChartCard>
        <div className="lg:col-span-2">
          <ChartCard title="Net savings trend" subtitle="Money kept each month">
            <MonthlyTrend data={monthly} />
          </ChartCard>
        </div>
      </div>

      {/* Breakdowns */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card">
          <ListHeader icon={Store} title="Categories" />
          <ul className="mt-3 space-y-2.5 text-sm">
            {byCategory.map((c) => (
              <li key={c.category}>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: categoryColor(c.category) }}
                    />
                    {c.category}
                  </span>
                  <span className="tabular-nums text-slate-500">{fmt(c.amount)}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.round(c.share * 100)}%`, background: categoryColor(c.category) }}
                  />
                </div>
              </li>
            ))}
            {byCategory.length === 0 && <Empty>No spending.</Empty>}
          </ul>
        </div>

        <div className="card">
          <ListHeader icon={Store} title="Top merchants" />
          <ul className="mt-3 space-y-2 text-sm">
            {merchants.map((m) => (
              <li key={m.description} className="flex items-center justify-between gap-2">
                <span className="truncate" title={m.description}>
                  {m.description}
                  <span className="ml-1 text-xs text-slate-400">×{m.count}</span>
                </span>
                <span className="tabular-nums text-slate-500">{fmt(m.amount)}</span>
              </li>
            ))}
            {merchants.length === 0 && <Empty>No spending.</Empty>}
          </ul>
        </div>

        <div className="card">
          <ListHeader icon={Repeat} title="Recurring charges" />
          <ul className="mt-3 space-y-2 text-sm">
            {recurring.map((r) => (
              <li key={r.description} className="flex items-center justify-between gap-2">
                <span className="truncate" title={r.description}>
                  {r.description}
                </span>
                <span className="tabular-nums text-slate-500">{fmt(r.amount)}/mo</span>
              </li>
            ))}
            {recurring.length === 0 && <Empty>None detected (needs 3+ months).</Empty>}
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
  delta,
  deltaGoodWhenUp,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  tone: 'emerald' | 'rose' | 'brand';
  delta?: number;
  deltaGoodWhenUp?: boolean;
}) {
  const toneClasses = {
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    brand: 'bg-brand-50 text-brand-600',
  }[tone];

  const showDelta = delta !== undefined && Math.abs(delta) >= 0.01;
  const up = (delta ?? 0) > 0;
  const good = up === deltaGoodWhenUp;

  return (
    <div className="card card-hover">
      <div className="flex items-center justify-between">
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${toneClasses}`}>
          <Icon className="h-5 w-5" />
        </span>
        {showDelta && (
          <span
            className={`chip ${good ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}
          >
            {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {Math.round(Math.abs(delta!) * 100)}%
          </span>
        )}
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

function ListHeader({ icon: Icon, title }: { icon: typeof Wallet; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
      <Icon className="h-4 w-4 text-slate-400" />
      {title}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <li className="py-6 text-center text-sm text-slate-400">{children}</li>;
}
