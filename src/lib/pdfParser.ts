// Client-side PDF parsing with pdf.js. The worker is bundled locally (no CDN)
// so it complies with the zero-egress CSP.
//
// Strategy:
//  1. Extract the text layer with positions and run the column-aware table
//     parser (handles Chase / BofA / Wells Fargo / Capital One / Citi / Amex …).
//  2. If no column header is detected, fall back to the line-regex heuristic.
//  3. If a page has no text layer (scanned image), optionally OCR it and feed
//     the recovered text through the line heuristic.

import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { ParseResult } from '../types';
import { linesToTransactions, type HeuristicOptions } from './parseHeuristics';
import { extractTable, type PositionedItem } from './pdfTable';
import { ocrImage } from './ocr';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export interface PdfParseOptions extends Omit<HeuristicOptions, 'source' | 'assumeYear'> {
  /** Allow OCR fallback for scanned pages (slower). */
  useOcr: boolean;
  onProgress?: (stage: string, fraction: number) => void;
}

// Below this many characters on a page we assume there's no usable text layer.
const MIN_TEXT_CHARS = 20;
// Per-page vertical offset so multi-page items keep document order and never
// collide across pages when grouped into lines.
const PAGE_Y_OFFSET = 1_000_000;

interface RawItem {
  str: string;
  transform: number[];
  width: number;
}

/** Group positioned items into visual lines (for the regex fallback / OCR). */
function itemsToLines(items: RawItem[]): string[] {
  const rows: { y: number; items: { x: number; str: string }[] }[] = [];
  const TOL = 3;
  for (const it of items) {
    if (!it.str.trim()) continue;
    const x = it.transform[4];
    const y = it.transform[5];
    let row = rows.find((r) => Math.abs(r.y - y) <= TOL);
    if (!row) {
      row = { y, items: [] };
      rows.push(row);
    }
    row.items.push({ x, str: it.str });
  }
  rows.sort((a, b) => b.y - a.y);
  return rows.map((r) =>
    r.items
      .sort((a, b) => a.x - b.x)
      .map((i) => i.str)
      .join(' '),
  );
}

/** Guess the statement year from any 4-digit years in the document text. */
function inferYear(text: string): number | undefined {
  const matches = text.match(/\b(?:19|20)\d{2}\b/g);
  if (!matches) return undefined;
  const thisYear = new Date().getFullYear();
  const counts = new Map<number, number>();
  for (const m of matches) {
    const y = +m;
    if (y <= thisYear + 1) counts.set(y, (counts.get(y) ?? 0) + 1);
  }
  let best: number | undefined;
  let bestCount = -1;
  for (const [y, c] of counts) {
    // Prefer the most frequent year; break ties toward the more recent one.
    if (c > bestCount || (c === bestCount && best !== undefined && y > best)) {
      best = y;
      bestCount = c;
    }
  }
  return best;
}

export async function parsePdf(file: File, opts: PdfParseOptions): Promise<ParseResult> {
  const warnings: string[] = [];
  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;

  const positioned: PositionedItem[] = [];
  const allLines: string[] = [];
  const allText: string[] = [];
  let ocrUsed = false;

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    opts.onProgress?.('Reading pages', pageNum / doc.numPages);
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const items = content.items as RawItem[];
    const lines = itemsToLines(items);
    const charCount = lines.join('').length;

    if (charCount >= MIN_TEXT_CHARS) {
      const yShift = (pageNum - 1) * PAGE_Y_OFFSET;
      for (const it of items) {
        if (!it.str.trim()) continue;
        positioned.push({
          str: it.str,
          x: it.transform[4],
          y: it.transform[5] - yShift,
          width: it.width ?? 0,
        });
        allText.push(it.str);
      }
      allLines.push(...lines);
      continue;
    }

    // Scanned / image-only page.
    if (!opts.useOcr) {
      warnings.push(
        `Page ${pageNum} has no text layer (scanned). Enable OCR to read it, or add those rows manually.`,
      );
      continue;
    }

    opts.onProgress?.(`OCR page ${pageNum}`, 0);
    const canvas = await renderPageToCanvas(page);
    const text = await ocrImage(canvas, (f) => opts.onProgress?.(`OCR page ${pageNum}`, f));
    ocrUsed = true;
    allLines.push(...text.split('\n'));
    allText.push(text);
  }

  await doc.cleanup();
  if (ocrUsed) warnings.push('Used OCR for scanned page(s) — please double-check those rows.');

  const assumeYear = inferYear(allText.join(' '));

  // 1) Preferred: column-aware table extraction on the text layer.
  let transactions = [] as ParseResult['transactions'];
  if (positioned.length > 0 && !ocrUsed) {
    const table = extractTable(positioned, file.name, opts.dayFirst, assumeYear);
    if (table.headerFound && table.transactions.length > 0) {
      transactions = table.transactions;
    }
  }

  // 2) Fallback: line-regex heuristic (also used for OCR'd pages).
  if (transactions.length === 0) {
    transactions = linesToTransactions(allLines, {
      dayFirst: opts.dayFirst,
      lastColumnIsBalance: opts.lastColumnIsBalance,
      source: file.name,
      assumeYear,
    });
    if (transactions.length > 0 && positioned.length > 0 && !ocrUsed) {
      warnings.push('No clear column header found — used the simple parser. Please double-check the rows.');
    }
  }

  if (transactions.length === 0) {
    warnings.push(
      'No transactions were detected automatically. Try toggling OCR or the date format, or add rows manually.',
    );
  }

  return { source: file.name, transactions, warnings };
}

/** Render a PDF page to an offscreen canvas at 2x for better OCR accuracy. */
async function renderPageToCanvas(page: pdfjsLib.PDFPageProxy): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get a 2D canvas context for OCR rendering.');
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}
