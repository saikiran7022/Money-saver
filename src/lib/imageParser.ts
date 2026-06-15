// Parse a statement supplied as an image (PNG/JPG photo or scan) by running it
// directly through in-browser OCR, then the shared transaction heuristics.

import type { ParseResult } from '../types';
import { linesToTransactions } from './parseHeuristics';
import { ocrImage } from './ocr';

export interface ImageParseOptions {
  dayFirst: boolean;
  lastColumnIsBalance: boolean;
  onProgress?: (stage: string, fraction: number) => void;
}

export async function parseImage(file: File, opts: ImageParseOptions): Promise<ParseResult> {
  const warnings: string[] = ['Read via OCR — please double-check the detected rows.'];
  opts.onProgress?.('OCR', 0);
  const text = await ocrImage(file, (f) => opts.onProgress?.('OCR', f));

  const transactions = linesToTransactions(text.split('\n'), {
    dayFirst: opts.dayFirst,
    lastColumnIsBalance: opts.lastColumnIsBalance,
    source: file.name,
  });

  if (transactions.length === 0) {
    warnings.push('No transactions detected — try a clearer image or add rows manually.');
  }
  return { source: file.name, transactions, warnings };
}
