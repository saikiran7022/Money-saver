import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { CategoryTotal } from '../../lib/analytics';

const COLORS = [
  '#2f6fed', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6',
  '#06b6d4', '#84cc16', '#ec4899', '#f97316', '#14b8a6',
  '#6366f1', '#eab308', '#ef4444', '#22c55e', '#a855f7',
];

export default function SpendingByCategory({ data }: { data: CategoryTotal[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="amount"
          nameKey="category"
          innerRadius={55}
          outerRadius={95}
          paddingAngle={2}
        >
          {data.map((entry, i) => (
            <Cell key={entry.category} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => v.toFixed(2)} />
      </PieChart>
    </ResponsiveContainer>
  );
}
