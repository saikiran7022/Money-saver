import type { DraftTransaction, Transaction } from '../types';
import { cleanText } from './money';

/**
 * Deterministic content id for a transaction. Two rows that share the same
 * date, amount and normalized description are considered the same line — this
 * is what lets a user import overlapping statements (e.g. a monthly + a yearly
 * statement covering the same month) without double-counting.
 */
export function transactionId(date: string, amount: number, description: string): string {
  const key = `${date}|${amount.toFixed(2)}|${normalize(description)}`;
  return hash(key);
}

function normalize(description: string): string {
  return cleanText(description).toLowerCase();
}

/** Small, fast, non-cryptographic string hash (FNV-1a) rendered as hex. */
function hash(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

/**
 * Merge new drafts into the existing transaction list, dropping any whose id
 * already exists. Returns the merged list plus how many duplicates were
 * skipped (surfaced to the user after an import).
 */
export function mergeTransactions(
  existing: Transaction[],
  incoming: DraftTransaction[],
): { merged: Transaction[]; added: number; duplicates: number } {
  const seen = new Set(existing.map((t) => t.id));
  const merged = [...existing];
  let added = 0;
  let duplicates = 0;

  for (const t of incoming) {
    if (seen.has(t.id)) {
      duplicates++;
      continue;
    }
    seen.add(t.id);
    merged.push(t);
    added++;
  }

  merged.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return { merged, added, duplicates };
}
