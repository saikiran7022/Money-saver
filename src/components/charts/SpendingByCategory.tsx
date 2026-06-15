import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { CategoryTotal } from '../../lib/analytics';
import { categoryColor } from '../../lib/categoryColors';

export default function SpendingByCategory({ data }: { data: CategoryTotal[] }) {
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row">
      <ResponsiveContainer width="100%" height={220} className="!w-full sm:!w-1/2">
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="category"
            innerRadius={52}
            outerRadius={90}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((entry) => (
              <Cell key={entry.category} fill={categoryColor(entry.category)} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number) => v.toFixed(2)} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:w-1/2 sm:grid-cols-1">
        {data.slice(0, 6).map((c) => (
          <li key={c.category} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: categoryColor(c.category) }}
              />
              {c.category}
            </span>
            <span className="tabular-nums text-slate-400">{Math.round(c.share * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
