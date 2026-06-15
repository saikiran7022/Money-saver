import { CATEGORIES } from './categorize';

// A fixed, pleasant palette assigned to categories so the pie chart, legend
// and table pills all use the same colour for a given category.
const PALETTE = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#ec4899', '#f97316', '#14b8a6',
  '#3b82f6', '#eab308', '#f43f5e', '#22c55e', '#a855f7',
];

const MAP = new Map<string, string>(
  CATEGORIES.map((c, i) => [c, PALETTE[i % PALETTE.length]]),
);

export function categoryColor(category: string): string {
  return MAP.get(category) ?? '#94a3b8';
}
