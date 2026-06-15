import type { Insight } from '../lib/insights';

const TONE: Record<Insight['tone'], string> = {
  good: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  warn: 'border-amber-200 bg-amber-50 text-amber-900',
  info: 'border-slate-200 bg-slate-50 text-slate-700',
};

const ICON: Record<Insight['tone'], string> = { good: '✅', warn: '⚠️', info: '💡' };

export default function Insights({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {insights.map((ins, i) => (
        <div key={i} className={`rounded-lg border p-3 text-sm ${TONE[ins.tone]}`}>
          <span className="mr-1">{ICON[ins.tone]}</span>
          {ins.text}
        </div>
      ))}
    </div>
  );
}
