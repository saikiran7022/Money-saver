import type { DraftTransaction } from '../types';
import { cleanText, parseAmount, parseDate } from './money';
import { transactionId } from './dedupe';
import { categorize } from './categorize';

/**
 * Turn an array of raw text lines (from a PDF text layer or from OCR) into
 * transaction candidates. This is the heuristic core shared by every parser:
 *
 *  - a line is a transaction if it begins (roughly) with a date and contains
 *    at least one money-like amount;
 *  - the LAST money token on the line is treated as the transaction amount
 *    (statement layouts almost always put a running balance last only when a
 *    balance column exists — see the two-amount handling below);
 *  - the text between the date and the amount(s) becomes the description.
 *
 * It deliberately errs toward producing candidates; the user corrects them in
 * the review step before anything is committed.
 */
export interface HeuristicOptions {
  dayFirst: boolean;
  source: string;
  /** If a line has two trailing amounts, treat the last as a running balance. */
  lastColumnIsBalance: boolean;
}

// A money token: optional currency symbol, digits with separators, optional
// trailing CR/DR. Anchored so we can scan a line for all occurrences.
const MONEY_RE =
  /[-(]?\s*[$£€₹]?\s*\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?\s*\)?(?:\s*(?:cr|dr))?/gi;

// A leading date token in common formats.
const DATE_RE =
  /^\s*(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{1,2}[\s-][A-Za-z]{3,9}[\s-]\d{2,4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{2,4})/;

// Descriptions that strongly imply money coming IN, used to guess the sign of
// an unsigned amount when no running balance is available to infer direction.
const INCOME_HINT_RE =
  /\b(salary|payroll|paycheck|deposit|refund|credit|interest|dividend|reimburse|received|cashback)\b/i;

// Statement summary rows that look like transactions but aren't.
const SUMMARY_RE =
  /\b(opening|closing|brought forward|carried forward|b\/f|c\/f|statement balance|available balance)\b/i;

/**
 * Determine the signed amount for a row. PDF/OCR amounts rarely carry a sign,
 * so we infer direction in priority order:
 *   1. an explicit running-balance column (delta vs the previous row) — the
 *      most reliable signal when present;
 *   2. explicit markers on the amount token (-, parentheses, CR/DR, leading +);
 *   3. income-like wording in the description;
 *   4. otherwise default to an expense (statements are mostly debits).
 */
function inferSignedAmount(
  rawAmount: string,
  parsedValue: number,
  description: string,
  balanceDelta: number | null,
): number {
  const magnitude = Math.abs(parsedValue);

  if (balanceDelta !== null && balanceDelta !== 0) {
    return balanceDelta > 0 ? magnitude : -magnitude;
  }
  // Explicit signal already captured by parseAmount (negative) or CR/+.
  if (parsedValue < 0) return -magnitude;
  if (/\bcr\b/i.test(rawAmount) || /^\s*\+/.test(rawAmount)) return magnitude;
  if (INCOME_HINT_RE.test(description)) return magnitude;
  return -magnitude;
}

export function linesToTransactions(
  lines: string[],
  opts: HeuristicOptions,
): DraftTransaction[] {
  const out: DraftTransaction[] = [];
  let prevBalance: number | null = null;

  for (const rawLine of lines) {
    const line = cleanText(rawLine);
    if (!line) continue;

    const dateMatch = line.match(DATE_RE);
    if (!dateMatch) continue;
    const date = parseDate(dateMatch[1], opts.dayFirst);
    if (!date) continue;

    // Find every money-like token and keep those that actually parse.
    const moneyTokens: { raw: string; value: number; index: number }[] = [];
    for (const m of line.matchAll(MONEY_RE)) {
      const value = parseAmount(m[0]);
      if (value === null || m.index === undefined) continue;
      // Skip tokens that are really part of the date we already consumed.
      if (m.index < dateMatch[0].length) continue;
      moneyTokens.push({ raw: m[0], value, index: m.index });
    }
    if (moneyTokens.length === 0) continue;

    // Choose the amount column and (optionally) the running-balance column.
    const useBalance = opts.lastColumnIsBalance && moneyTokens.length >= 2;
    const amountToken = useBalance
      ? moneyTokens[moneyTokens.length - 2]
      : moneyTokens[moneyTokens.length - 1];

    // Description = text after the date up to the first amount token.
    const descStart = dateMatch[0].length;
    const descEnd = moneyTokens[0].index;
    let description = cleanText(line.slice(descStart, descEnd));
    if (!description) {
      description = cleanText(line.slice(descStart, amountToken.index)) || 'Transaction';
    }

    // Infer direction from the balance delta when a balance column exists.
    let balanceDelta: number | null = null;
    if (useBalance) {
      const balance = moneyTokens[moneyTokens.length - 1].value;
      if (prevBalance !== null) balanceDelta = balance - prevBalance;
      prevBalance = balance;
    }

    if (SUMMARY_RE.test(description)) continue; // skip opening/closing balance rows

    const amount = inferSignedAmount(amountToken.raw, amountToken.value, description, balanceDelta);
    if (amount === 0) continue;

    const category = categorize(description, amount, []);
    out.push({
      id: transactionId(date, amount, description),
      date,
      description,
      amount,
      category,
      source: opts.source,
    });
  }

  return out;
}
