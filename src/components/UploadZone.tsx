import { useRef, useState } from 'react';
import type { DraftTransaction, ParseResult } from '../types';

interface Props {
  onParsed: (drafts: DraftTransaction[]) => void;
}

const ACCEPT = '.pdf,.csv,.xls,.xlsx,.png,.jpg,.jpeg';

export default function UploadZone({ onParsed }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dayFirst, setDayFirst] = useState(true);
  const [useOcr, setUseOcr] = useState(false);
  const [lastColumnIsBalance, setLastColumnIsBalance] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);

  async function parseOne(file: File): Promise<ParseResult> {
    const name = file.name.toLowerCase();
    const onProgress = (stage: string, fraction: number) =>
      setProgress(`${file.name}: ${stage} ${Math.round(fraction * 100)}%`);

    // Parsers are loaded on demand so pdf.js / xlsx / PapaParse stay out of the
    // initial bundle — nothing heavy loads until the user actually imports.
    if (name.endsWith('.pdf')) {
      const { parsePdf } = await import('../lib/pdfParser');
      return parsePdf(file, { dayFirst, useOcr, lastColumnIsBalance, onProgress });
    }
    if (/\.(png|jpe?g)$/.test(name)) {
      const { parseImage } = await import('../lib/imageParser');
      return parseImage(file, { dayFirst, lastColumnIsBalance, onProgress });
    }
    const { parseTabular } = await import('../lib/tabularParser');
    return parseTabular(file, { dayFirst });
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setWarnings([]);
    const allDrafts: DraftTransaction[] = [];
    const allWarnings: string[] = [];

    for (const file of Array.from(files)) {
      setProgress(`Reading ${file.name}…`);
      try {
        const result = await parseOne(file);
        allDrafts.push(...result.transactions);
        allWarnings.push(...result.warnings.map((w) => `${file.name}: ${w}`));
      } catch (err) {
        allWarnings.push(`${file.name}: ${err instanceof Error ? err.message : 'Failed to parse.'}`);
      }
    }

    setBusy(false);
    setProgress('');
    setWarnings(allWarnings);
    if (allDrafts.length > 0) onParsed(allDrafts);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <section className="card">
      <div className="mb-3 flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={dayFirst} onChange={(e) => setDayFirst(e.target.checked)} />
          Day-first dates (DD/MM)
        </label>
        <label className="flex items-center gap-2" title="If your PDF has a running balance in the last column, the amount is taken from the column before it.">
          <input
            type="checkbox"
            checked={lastColumnIsBalance}
            onChange={(e) => setLastColumnIsBalance(e.target.checked)}
          />
          Last column is a balance
        </label>
        <label className="flex items-center gap-2" title="Read scanned / image-only pages with in-browser OCR. Slower.">
          <input type="checkbox" checked={useOcr} onChange={(e) => setUseOcr(e.target.checked)} />
          OCR scanned pages
        </label>
      </div>

      <div
        className={`grid place-items-center rounded-xl border-2 border-dashed p-8 text-center transition ${
          dragging ? 'border-brand-500 bg-brand-50' : 'border-slate-300'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
      >
        <p className="text-slate-600">Drag &amp; drop statements here</p>
        <p className="mt-1 text-xs text-slate-400">PDF · CSV · Excel · image — add as many as you like</p>
        <button
          className="btn-primary mt-3"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? 'Processing…' : 'Choose files'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>

      {progress && <p className="mt-3 text-sm text-slate-500">{progress}</p>}

      {warnings.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-amber-700">
          {warnings.map((w, i) => (
            <li key={i}>⚠️ {w}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
