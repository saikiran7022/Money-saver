// Column-aware bank-statement table extraction.
//
// Unlike the line-regex fallback, this uses the x/y positions that pdf.js
// gives every text fragment. It finds the header row (Date / Description /
// Debit / Credit / Amount / Balance ...), learns each column's horizontal
// band, then assigns every fragment on the page to a column by position. That
// makes it robust to: numbers inside descriptions, separate debit/credit
// columns, wrapped (multi-line) descriptions, and varied date formats.

import type { DraftTransaction } from '../types';
import { cleanText, extractDate, parseAmount } from './money';
import { transactionId } from './dedupe';
import { categorize } from './categorize';

export interface PositionedItem {
  str: string;
  /** Left edge in PDF user-space (origin bottom-left, y grows upward). */
  x: number;
  y: number;
  width: number;
}

type Role = 'date' | 'description' | 'debit' | 'credit' | 'amount' | 'balance' | 'other';

interface Column {
  role: Role;
  left: number;
  right: number;
}

interface Line {
  y: number;
  items: PositionedItem[];
}

export interface TableResult {
  transactions: DraftTransaction[];
  headerFound: boolean;
  dayFirst: boolean;
}

// Header keywords mapped to a column role. Longer/more specific phrases first.
// Header keywords mapped to a column role, covering the major US banks
// (Chase, Bank of America, Wells Fargo, Capital One, Citi, Amex, Discover, …).
// The first 'date' column wins, so transaction date is preferred over post date.
const HEADER_KEYWORDS: { role: Role; words: string[] }[] = [
  {
    role: 'date',
    words: ['transaction date', 'trans date', 'trans. date', 'posting date', 'post date', 'posted', 'value date', 'effective date', 'sale date', 'date'],
  },
  {
    role: 'description',
    words: ['description', 'details', 'particulars', 'narration', 'narrative', 'memo', 'payee', 'merchant', 'reference', 'remarks', 'activity', 'transaction'],
  },
  {
    role: 'debit',
    words: ['withdrawal', 'withdrawals', 'paid out', 'money out', 'payments', 'subtractions', 'charges', 'debit', 'spent'],
  },
  {
    role: 'credit',
    words: ['deposit', 'deposits', 'paid in', 'money in', 'additions', 'received', 'credit'],
  },
  { role: 'amount', words: ['amount', 'value'] },
  { role: 'balance', words: ['balance'] },
];

// Lines that look like transactions but are statement summaries.
const SUMMARY_RE =
  /\b(opening|closing|brought forward|carried forward|b\/f|c\/f|statement balance|available balance|total|subtotal)\b/i;

// Wording that implies money coming in, used to sign amount-only rows.
const INCOME_HINT_RE =
  /\b(salary|payroll|paycheck|deposit|refund|credit|interest|dividend|reimburse|received|cashback|rebate)\b/i;

/** Cluster items into horizontal lines by y-coordinate. */
function groupLines(items: PositionedItem[], yTol: number): Line[] {
  const sorted = [...items].filter((i) => i.str.trim()).sort((a, b) => b.y - a.y);
  const lines: Line[] = [];
  for (const it of sorted) {
    const line = lines.find((l) => Math.abs(l.y - it.y) <= yTol);
    if (line) line.items.push(it);
    else lines.push({ y: it.y, items: [it] });
  }
  for (const l of lines) l.items.sort((a, b) => a.x - b.x);
  return lines;
}

/** Match a header cell's text to a column role, or null. */
function roleForHeader(text: string): Role | null {
  const t = cleanText(text).toLowerCase();
  if (!t) return null;
  for (const { role, words } of HEADER_KEYWORDS) {
    if (words.some((w) => t === w || t.includes(w))) return role;
  }
  return null;
}

/**
 * Find the header line and derive column bands from it. Returns null if no
 * convincing header (>= 2 distinct roles incl. a date or description and a
 * money column) is found.
 */
function detectColumns(lines: Line[]): { headerIndex: number; columns: Column[] } | null {
  let best: { index: number; cols: { role: Role; x: number }[] } | null = null;

  for (let index = 0; index < lines.length; index++) {
    const cols: { role: Role; x: number }[] = [];
    const seen = new Set<Role>();
    for (const it of lines[index].items) {
      const role = roleForHeader(it.str);
      if (role && !seen.has(role)) {
        seen.add(role);
        cols.push({ role, x: it.x });
      }
    }
    const hasLabel = seen.has('date') || seen.has('description');
    const hasMoney = seen.has('debit') || seen.has('credit') || seen.has('amount');
    if (hasLabel && hasMoney && cols.length >= 2 && (!best || cols.length > best.cols.length)) {
      best = { index, cols };
    }
  }

  if (!best) return null;

  const ordered = [...best.cols].sort((a, b) => a.x - b.x);
  const columns: Column[] = ordered.map((c, i) => {
    const prevX = i === 0 ? -Infinity : ordered[i - 1].x;
    const nextX = i === ordered.length - 1 ? Infinity : ordered[i + 1].x;
    return {
      role: c.role,
      left: i === 0 ? -Infinity : (prevX + c.x) / 2,
      right: i === ordered.length - 1 ? Infinity : (c.x + nextX) / 2,
    };
  });
  return { headerIndex: best.index, columns };
}

/** Build a role→text map for a data line using the column bands. */
function cellsForLine(line: Line, columns: Column[]): Partial<Record<Role, string>> {
  const buckets: Partial<Record<Role, string[]>> = {};
  for (const it of line.items) {
    const center = it.x + it.width / 2;
    const col = columns.find((c) => center >= c.left && center < c.right);
    if (!col || col.role === 'other') continue;
    (buckets[col.role] ??= []).push(it.str);
  }
  const out: Partial<Record<Role, string>> = {};
  for (const role of Object.keys(buckets) as Role[]) {
    out[role] = cleanText(buckets[role]!.join(' '));
  }
  return out;
}

/** Decide day-first vs month-first from the actual date column values. */
function detectDayFirst(dateStrings: string[], fallback: boolean): boolean {
  let dayVotes = 0;
  let monthVotes = 0;
  for (const s of dateStrings) {
    const m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.]\d{2,4}/);
    if (!m) continue;
    const a = +m[1];
    const b = +m[2];
    if (a > 12 && b <= 12) dayVotes++;
    else if (b > 12 && a <= 12) monthVotes++;
  }
  if (dayVotes > monthVotes) return true;
  if (monthVotes > dayVotes) return false;
  return fallback;
}

/** Resolve a signed amount for a data row given the detected columns. */
function resolveAmount(
  cells: Partial<Record<Role, string>>,
  description: string,
  hasDebitCredit: boolean,
  prevBalance: number | null,
): { amount: number; balance: number | null } {
  const balance = cells.balance ? parseAmount(cells.balance) : null;

  // Separate debit / credit columns: the column the number sits in *is* the sign.
  if (hasDebitCredit) {
    const debit = cells.debit ? parseAmount(cells.debit) : null;
    const credit = cells.credit ? parseAmount(cells.credit) : null;
    let amount = 0;
    if (credit !== null && credit !== 0) amount = Math.abs(credit);
    else if (debit !== null && debit !== 0) amount = -Math.abs(debit);
    return { amount, balance };
  }

  // Single amount column: use explicit sign, else infer from balance delta.
  const raw = cells.amount ?? '';
  const parsed = parseAmount(raw);
  if (parsed === null) return { amount: 0, balance };
  const magnitude = Math.abs(parsed);

  if (parsed < 0 || /\bdr\b/i.test(raw) || /^\s*\(/.test(raw.trim())) {
    return { amount: -magnitude, balance };
  }
  if (/\bcr\b/i.test(raw) || /^\s*\+/.test(raw)) return { amount: magnitude, balance };
  if (balance !== null && prevBalance !== null && balance !== prevBalance) {
    return { amount: balance > prevBalance ? magnitude : -magnitude, balance };
  }
  if (INCOME_HINT_RE.test(description)) return { amount: magnitude, balance };
  // No sign signal at all: default to an expense (statements are mostly debits).
  return { amount: -magnitude, balance };
}

/** Extract transactions from positioned page items. */
export function extractTable(
  items: PositionedItem[],
  source: string,
  fallbackDayFirst: boolean,
  assumeYear?: number,
  yTol = 3,
): TableResult {
  const lines = groupLines(items, yTol);
  const detected = detectColumns(lines);
  if (!detected) return { transactions: [], headerFound: false, dayFirst: fallbackDayFirst };

  const { headerIndex, columns } = detected;
  const roles = new Set(columns.map((c) => c.role));
  const hasDebitCredit = roles.has('debit') || roles.has('credit');
  const dataLines = lines.slice(headerIndex + 1);

  // Pre-pass: detect the date format from real values.
  const dateStrings: string[] = [];
  for (const line of dataLines) {
    const d = cellsForLine(line, columns).date;
    if (d) dateStrings.push(d);
  }
  const dayFirst = detectDayFirst(dateStrings, fallbackDayFirst);

  const transactions: DraftTransaction[] = [];
  let prev: DraftTransaction | null = null;
  let prevBalance: number | null = null;

  for (const line of dataLines) {
    const cells = cellsForLine(line, columns);
    const date = cells.date ? extractDate(cells.date, dayFirst, assumeYear) : null;

    if (!date) {
      // A wrapped description line: no date, no money — append to the previous row.
      const desc = cells.description;
      const hasMoney = cells.amount || cells.debit || cells.credit;
      if (prev && desc && !hasMoney) {
        prev.description = cleanText(`${prev.description} ${desc}`);
        prev.id = transactionId(prev.date, prev.amount, prev.description);
      }
      continue;
    }

    const description = cells.description || 'Transaction';
    if (SUMMARY_RE.test(description)) {
      // Keep the balance running through summary rows, but don't emit them.
      const b = cells.balance ? parseAmount(cells.balance) : null;
      if (b !== null) prevBalance = b;
      continue;
    }

    const { amount, balance } = resolveAmount(cells, description, hasDebitCredit, prevBalance);
    if (balance !== null) prevBalance = balance;
    if (amount === 0) continue;

    const txn: DraftTransaction = {
      id: transactionId(date, amount, description),
      date,
      description,
      amount,
      category: categorize(description, amount, []),
      source,
    };
    transactions.push(txn);
    prev = txn;
  }

  return { transactions, headerFound: true, dayFirst };
}
