import {
  FileText,
  Lock,
  PieChart,
  ScanLine,
  Sparkles,
  Upload,
  Wallet,
} from 'lucide-react';

const FEATURES = [
  {
    icon: FileText,
    title: 'Any statement',
    text: 'PDF, CSV or Excel — add as many as you want, from a single month to a full year.',
  },
  {
    icon: ScanLine,
    title: 'Reads scanned PDFs',
    text: 'Image-only statements are read with on-device OCR. Nothing is sent anywhere.',
  },
  {
    icon: PieChart,
    title: 'Instant insights',
    text: 'Income vs spending, savings rate, categories, trends and recurring charges.',
  },
  {
    icon: Sparkles,
    title: 'Smart categories',
    text: 'Transactions are auto-categorized with rules you can tweak — and it remembers them.',
  },
];

export default function Landing({ onImport }: { onImport: () => void }) {
  return (
    <div className="mx-auto max-w-4xl animate-fade-in px-2 py-10">
      {/* Hero */}
      <div className="text-center">
        <span className="chip mx-auto border border-emerald-200 bg-emerald-50 text-emerald-700">
          <Lock className="h-3.5 w-3.5" />
          Private by design — your data never leaves this device
        </span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Understand your money,
          <br />
          <span className="bg-gradient-to-r from-brand-500 to-sky-500 bg-clip-text text-transparent">
            without giving it away.
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          Drop in your bank statements and get a clear picture of your spending and earnings.
          Everything is parsed and analyzed right here in your browser — no account, no upload,
          no tracking.
        </p>
        <div className="mt-7 flex items-center justify-center gap-3">
          <button className="btn-primary px-5 py-2.5 text-base" onClick={onImport}>
            <Upload className="h-5 w-5" />
            Import statements
          </button>
          <span className="text-sm text-slate-400">PDF · CSV · Excel · images</span>
        </div>
      </div>

      {/* Feature grid */}
      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="card card-hover flex gap-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{title}</h3>
              <p className="mt-1 text-sm text-slate-600">{text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Reassurance strip */}
      <div className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-500">
        <Wallet className="h-4 w-4 text-slate-400" />
        Works fully offline after the first load. Close the tab and it's gone — unless you choose
        to save it on this device.
      </div>
    </div>
  );
}
