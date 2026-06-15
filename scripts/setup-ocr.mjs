// One-time setup to enable in-browser OCR fully offline.
//
// Copies the tesseract.js worker + wasm core out of node_modules and downloads
// the English language data into public/vendor/tesseract. After this runs, the
// app serves every OCR asset from its own origin, so OCR works under the strict
// zero-egress Content-Security-Policy with no runtime network access.
//
// Run with: npm run setup:ocr
// (The single download below is an explicit, one-time build step — not runtime
// egress. The app itself never connects to the internet.)

import { cp, mkdir, writeFile, access } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const OUT = new URL('../public/vendor/tesseract/', import.meta.url).pathname;
const LANG_DIR = join(OUT, 'lang');
const LANG_URL = 'https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz';

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function copyCore() {
  // Resolve the installed tesseract.js packages.
  const workerPath = require.resolve('tesseract.js/dist/worker.min.js');
  const coreEntry = require.resolve('tesseract.js-core/tesseract-core.wasm.js');
  const coreDir = dirname(coreEntry);

  await mkdir(OUT, { recursive: true });
  await cp(workerPath, join(OUT, 'worker.min.js'));
  // Copy the whole core dir so both wasm + its js loader are present.
  await cp(coreDir, OUT, { recursive: true });
  console.log('✓ Copied tesseract worker + wasm core to public/vendor/tesseract');
}

async function downloadLang() {
  await mkdir(LANG_DIR, { recursive: true });
  const dest = join(LANG_DIR, 'eng.traineddata.gz');
  if (await exists(dest)) {
    console.log('✓ Language data already present');
    return;
  }
  console.log(`Downloading English OCR data from ${LANG_URL} …`);
  const res = await fetch(LANG_URL);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  console.log(`✓ Saved ${(buf.length / 1e6).toFixed(1)} MB to public/vendor/tesseract/lang`);
}

try {
  await copyCore();
  await downloadLang();
  console.log('\nOCR is ready. Scanned PDFs and statement images can now be read offline.');
} catch (err) {
  console.error('\nOCR setup failed:', err.message);
  console.error('OCR is optional — text-based PDFs and CSV/Excel imports work without it.');
  process.exit(1);
}
