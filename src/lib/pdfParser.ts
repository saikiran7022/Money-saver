// Client-side PDF parsing with pdf.js. The worker is bundled locally (no CDN)
// so it complies with the zero-egress CSP. We first try the PDF text layer;
// if a page is a scanned image with little/no text, we render it to a canvas
// and fall back to in-browser OCR.

import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { ParseResult } from '../types';
import { linesToTransactions, type HeuristicOptions } from './parseHeuristics';
import { ocrImage } from './ocr';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export interface PdfParseOptions extends Omit<HeuristicOptions, 'source'> {
  /** Allow OCR fallback for scanned pages (slower). */
  useOcr: boolean;
  onProgress?: (stage: string, fraction: number) => void;
}

// Below this many characters on a page we assume there's no usable text layer.
const MIN_TEXT_CHARS = 20;

/** Group pdf.js text items into visual lines using their y-coordinates. */
function itemsToLines(items: { str: string; transform: number[] }[]): string[] {
  const rows: { y: number; items: { x: number; str: string }[] }[] = [];
  const TOL = 3; // points of vertical tolerance for "same line"

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

  rows.sort((a, b) => b.y - a.y); // top of page first
  return rows.map((r) =>
    r.items
      .sort((a, b) => a.x - b.x)
      .map((i) => i.str)
      .join(' '),
  );
}

export async function parsePdf(file: File, opts: PdfParseOptions): Promise<ParseResult> {
  const warnings: string[] = [];
  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;

  const allLines: string[] = [];
  let ocrUsed = false;

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    opts.onProgress?.('Reading pages', pageNum / doc.numPages);
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const items = content.items as { str: string; transform: number[] }[];
    const lines = itemsToLines(items);
    const charCount = lines.join('').length;

    if (charCount >= MIN_TEXT_CHARS) {
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
  }

  await doc.cleanup();

  if (ocrUsed) warnings.push('Used OCR for scanned page(s) — please double-check those rows.');

  const transactions = linesToTransactions(allLines, {
    dayFirst: opts.dayFirst,
    lastColumnIsBalance: opts.lastColumnIsBalance,
    source: file.name,
  });

  if (transactions.length === 0) {
    warnings.push(
      'No transactions were detected automatically. Try toggling OCR or the date format, or add rows manually.',
    );
  }

  return { source: file.name, transactions, warnings };
}

/** Render a PDF page to an offscreen canvas at 2x for better OCR accuracy. */
async function renderPageToCanvas(
  page: pdfjsLib.PDFPageProxy,
): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get a 2D canvas context for OCR rendering.');
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}
