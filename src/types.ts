// Core domain types shared across parsing, analytics and UI.

/** A single parsed bank-statement line. */
export interface Transaction {
  /** Stable id (content hash) used for dedupe and React keys. */
  id: string;
  /** ISO date string: YYYY-MM-DD. */
  date: string;
  /** Cleaned-up description / merchant text. */
  description: string;
  /**
   * Signed amount in the account currency. Positive = money in (income/credit),
   * negative = money out (expense/debit).
   */
  amount: number;
  /** Assigned spending/earning category. */
  category: string;
  /** Name of the source file this came from (for traceability in the UI). */
  source: string;
}

/** Direction of a transaction, derived from the sign of `amount`. */
export type Direction = 'income' | 'expense';

/**
 * A transaction candidate produced by a parser before the user has reviewed
 * and committed it. Same shape as Transaction but conceptually "draft".
 */
export type DraftTransaction = Transaction;

/** A user-defined categorization rule: if description contains `match`, use `category`. */
export interface Rule {
  id: string;
  /** Lower-cased substring to look for in the description. */
  match: string;
  category: string;
}

/** Persisted/app settings. */
export interface Settings {
  /** When true, data is saved to browser IndexedDB between visits. Opt-in. */
  persist: boolean;
  /** Currency symbol used for display only. */
  currency: string;
}

/** A named period filter for the dashboard. */
export interface PeriodFilter {
  kind: 'all' | 'year' | 'month' | 'custom';
  /** YYYY for 'year', YYYY-MM for 'month'. */
  value?: string;
  /** ISO dates for 'custom'. */
  from?: string;
  to?: string;
}

/** Result of parsing one uploaded file. */
export interface ParseResult {
  source: string;
  transactions: DraftTransaction[];
  /** Non-fatal notes shown to the user (e.g. "used OCR", "no text layer"). */
  warnings: string[];
}
