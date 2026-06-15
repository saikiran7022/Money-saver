// CSV / Excel importing. This is the most reliable path when a user's bank
// offers a spreadsheet export. We auto-detect the date / description / amount
// columns (or a debit+credit pair) and let the UI override the mapping.

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { DraftTransaction, ParseResult } from '../types';
import { cleanText, parseAmount, parseDate } from './money';
import { transactionId } from './dedupe';
import { categorize } from './categorize';

export interface ColumnMapping {
  date: number;
  description: number;
  /** Single signed-amount column, or -1 when using debit/credit pair. */
  amount: number;
  debit: number;
  credit: number;
}

export interface TabularParseOptions {
  dayFirst: boolean;
  /** Optional explicit mapping; when omitted we auto-detect from headers. */
  mapping?: ColumnMapping;
}

const DATE_HINTS = ['date', 'posted', 'transaction date', 'value date'];
const DESC_HINTS = ['description', 'details', 'narrative', 'memo', 'payee', 'reference', 'merchant'];
const AMOUNT_HINTS = ['amount', 'value'];
const DEBIT_HINTS = ['debit', 'withdrawal', 'paid out', 'money out', 'dr'];
const CREDIT_HINTS = ['credit', 'deposit', 'paid in', 'money in', 'cr'];

/** Read a CSV or XLSX file into a 2D array of cell strings. */
export async function readTabular(file: File): Promise<string[][]> {
  const isCsv = /\.csv$/i.test(file.name) || file.type === 'text/csv';
  if (isCsv) {
    const text = await file.text();
    const result = Papa.parse<string[]>(text, { skipEmptyLines: true });
    return result.data;
  }
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: '' });
}

function findColumn(headers: string[], hints: string[]): number {
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const hint of hints) {
    const i = lower.findIndex((h) => h === hint);
    if (i >= 0) return i;
  }
  for (const hint of hints) {
    const i = lower.findIndex((h) => h.includes(hint));
    if (i >= 0) return i;
  }
  return -1;
}

/** Guess a column mapping from the header row. */
export function autoDetectMapping(headers: string[]): ColumnMapping {
  return {
    date: findColumn(headers, DATE_HINTS),
    description: findColumn(headers, DESC_HINTS),
    amount: findColumn(headers, AMOUNT_HINTS),
    debit: findColumn(headers, DEBIT_HINTS),
    credit: findColumn(headers, CREDIT_HINTS),
  };
}

/** Does the first row look like a header (no parseable date in it)? */
function looksLikeHeader(row: string[]): boolean {
  return !row.some((cell) => parseDate(String(cell ?? ''), true) !== null);
}

export function rowsToTransactions(
  rows: string[][],
  source: string,
  opts: TabularParseOptions,
): ParseResult {
  const warnings: string[] = [];
  if (rows.length === 0) return { source, transactions: [], warnings: ['File was empty.'] };

  const hasHeader = looksLikeHeader(rows[0]);
  const headers = hasHeader ? rows[0].map((h) => String(h ?? '')) : [];
  // With a header we auto-detect columns; without one we assume the common
  // date / description / amount ordering (the user can override the mapping).
  const mapping =
    opts.mapping ??
    (hasHeader
      ? autoDetectMapping(headers)
      : { date: 0, description: 1, amount: 2, debit: -1, credit: -1 });
  const dataRows = hasHeader ? rows.slice(1) : rows;

  if (mapping.date < 0) warnings.push('Could not find a date column — set the mapping manually.');
  if (mapping.amount < 0 && mapping.debit < 0 && mapping.credit < 0) {
    warnings.push('Could not find an amount column — set the mapping manually.');
  }

  const transactions: DraftTransaction[] = [];
  for (const row of dataRows) {
    const dateRaw = String(row[mapping.date] ?? '');
    const date = parseDate(dateRaw, opts.dayFirst);
    if (!date) continue;

    const description =
      cleanText(String(row[mapping.description] ?? '')) || 'Transaction';

    let amount: number | null = null;
    if (mapping.amount >= 0) {
      amount = parseAmount(String(row[mapping.amount] ?? ''));
    } else {
      const debit = parseAmount(String(row[mapping.debit] ?? '')) ?? 0;
      const credit = parseAmount(String(row[mapping.credit] ?? '')) ?? 0;
      // Debit columns are money out (negative), credit columns money in.
      amount = credit - Math.abs(debit);
    }
    if (amount === null || amount === 0) continue;

    transactions.push({
      id: transactionId(date, amount, description),
      date,
      description,
      amount,
      category: categorize(description, amount, []),
      source,
    });
  }

  if (transactions.length === 0) {
    warnings.push('No transactions detected — check the column mapping.');
  }
  return { source, transactions, warnings };
}

export async function parseTabular(file: File, opts: TabularParseOptions): Promise<ParseResult> {
  const rows = await readTabular(file);
  return rowsToTransactions(rows, file.name, opts);
}
