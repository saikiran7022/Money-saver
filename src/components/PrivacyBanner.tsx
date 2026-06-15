import { useState } from 'react';

export default function PrivacyBanner() {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">🔒 Your data never leaves this device.</p>
          <p className="mt-1 text-emerald-800">
            Statements are parsed and analyzed entirely in your browser. There is no server,
            no account, no tracking, and no bank connection. Data is kept only in memory unless
            you tick “Save on this device”, which stores it locally (IndexedDB) and nowhere else.
            Refresh or use “Clear all data” to wipe everything.
          </p>
        </div>
        <button
          className="shrink-0 rounded-md px-2 py-1 text-emerald-700 hover:bg-emerald-100"
          onClick={() => setOpen(false)}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
