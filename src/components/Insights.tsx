import { CheckCircle2, Info, Lightbulb, AlertTriangle } from 'lucide-react';
import type { Insight } from '../lib/insights';

const STYLE: Record<Insight['tone'], { wrap: string; icon: typeof Info; iconColor: string }> = {
  good: { wrap: 'border-emerald-200 bg-emerald-50', icon: CheckCircle2, iconColor: 'text-emerald-600' },
  warn: { wrap: 'border-amber-200 bg-amber-50', icon: AlertTriangle, iconColor: 'text-amber-600' },
  info: { wrap: 'border-slate-200 bg-white', icon: Lightbulb, iconColor: 'text-brand-500' },
};

export default function Insights({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {insights.map((ins, i) => {
        const { wrap, icon: Icon, iconColor } = STYLE[ins.tone];
        return (
          <div
            key={i}
            className={`flex items-start gap-3 rounded-xl border p-3.5 text-sm text-slate-700 shadow-card ${wrap}`}
          >
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} />
            <span>{ins.text}</span>
          </div>
        );
      })}
    </div>
  );
}
