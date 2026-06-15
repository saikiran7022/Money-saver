import { useRef, useState } from 'react';
import { AlertTriangle, FileUp, Loader2 } from 'lucide-react';
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
    <section>
      <div
        className={`grid place-items-center rounded-2xl border-2 border-dashed p-10 text-center transition ${
          dragging ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-slate-50/50'
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
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-brand-600 shadow-card">
          {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <FileUp className="h-6 w-6" />}
        </div>
        <p className="mt-4 font-medium text-slate-700">Drag &amp; drop your statements here</p>
        <p className="mt-1 text-xs text-slate-400">PDF · CSV · Excel · image — add as many as you like</p>
        <button
          className="btn-primary mt-4"
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

      {/* Parsing options */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <Toggle checked={dayFirst} onChange={setDayFirst} label="Day-first dates (DD/MM)" />
        <Toggle
          checked={lastColumnIsBalance}
          onChange={setLastColumnIsBalance}
          label="Last column is a balance"
          title="If your statement shows a running balance in the last column, the amount is taken from the column before it."
        />
        <Toggle
          checked={useOcr}
          onChange={setUseOcr}
          label="OCR scanned pages"
          title="Read scanned / image-only pages with on-device OCR. Slower."
        />
      </div>

      {progress && (
        <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          {progress}
        </p>
      )}

      {warnings.length > 0 && (
        <ul className="mt-3 space-y-1.5 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
          {warnings.map((w, i) => (
            <li key={i} className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{w}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  title,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  title?: string;
}) {
  return (
    <label
      title={title}
      className={`chip cursor-pointer border transition ${
        checked
          ? 'border-brand-200 bg-brand-50 text-brand-700'
          : 'border-slate-200 bg-white text-slate-500'
      }`}
    >
      <input
        type="checkbox"
        className="h-3.5 w-3.5 accent-brand-600"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
