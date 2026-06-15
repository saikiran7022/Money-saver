// In-browser OCR via tesseract.js. Everything runs locally in a Web Worker;
// the engine (wasm), worker script and language data are all served from the
// app's own origin under /vendor/tesseract so OCR works with the strict
// zero-egress Content-Security-Policy (no CDN, no network).
//
// Those assets are populated once with `npm run setup:ocr`. If they're absent
// the recognize call rejects and the UI shows a friendly "run setup" message
// rather than silently reaching out to the internet.

import type { Worker as TesseractWorker } from 'tesseract.js';

export type OcrProgress = (fraction: number) => void;

function vendorPath(file: string): string {
  // BASE_URL respects the app's deploy base (e.g. project GitHub Pages).
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/vendor/tesseract/${file}`;
}

let workerPromise: Promise<TesseractWorker> | null = null;

async function getWorker(onProgress?: OcrProgress): Promise<TesseractWorker> {
  if (workerPromise) return workerPromise;
  workerPromise = (async () => {
    const { createWorker } = await import('tesseract.js');
    return createWorker('eng', 1, {
      workerPath: vendorPath('worker.min.js'),
      corePath: vendorPath('tesseract-core.wasm.js'),
      langPath: vendorPath('lang'),
      gzip: true,
      logger: (m: { status: string; progress: number }) => {
        if (m.status === 'recognizing text' && onProgress) onProgress(m.progress);
      },
    });
  })();
  return workerPromise;
}

/** Recognize text from a canvas/image source. Returns the raw OCR text. */
export async function ocrImage(
  source: HTMLCanvasElement | HTMLImageElement | Blob,
  onProgress?: OcrProgress,
): Promise<string> {
  try {
    const worker = await getWorker(onProgress);
    const { data } = await worker.recognize(source);
    return data.text;
  } catch (err) {
    // Reset so a later attempt (after setup) can re-init.
    workerPromise = null;
    throw new Error(
      'OCR engine could not start. Run `npm run setup:ocr` to install the local ' +
        'OCR assets, then reload. ' +
        (err instanceof Error ? err.message : ''),
    );
  }
}

/** Free the OCR worker and its memory. */
export async function terminateOcr(): Promise<void> {
  if (!workerPromise) return;
  const worker = await workerPromise;
  await worker.terminate();
  workerPromise = null;
}
