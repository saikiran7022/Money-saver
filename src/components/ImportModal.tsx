import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { DraftTransaction } from '../types';
import { useStore } from '../state/store';
import UploadZone from './UploadZone';
import ReviewTable from './ReviewTable';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ImportModal({ open, onClose }: Props) {
  const commitDrafts = useStore((s) => s.commitDrafts);
  const [drafts, setDrafts] = useState<DraftTransaction[] | null>(null);

  // Reset the draft state whenever the modal is reopened.
  useEffect(() => {
    if (!open) setDrafts(null);
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const reviewing = drafts !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm sm:p-8">
      <div className="my-auto w-full max-w-3xl animate-fade-in rounded-2xl bg-white shadow-card-lg">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {reviewing ? 'Review transactions' : 'Import statements'}
            </h2>
            <p className="text-sm text-slate-500">
              {reviewing
                ? 'Fix anything the parser got wrong, then add it to your analysis.'
                : 'Your files are read in this browser and never uploaded.'}
            </p>
          </div>
          <button className="btn-subtle h-9 w-9 !px-0" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {reviewing ? (
            <ReviewTable
              drafts={drafts}
              onCommit={(reviewed) => {
                commitDrafts(reviewed);
                onClose();
              }}
              onCancel={() => setDrafts(null)}
            />
          ) : (
            <UploadZone onParsed={(d) => setDrafts((prev) => [...(prev ?? []), ...d])} />
          )}
        </div>
      </div>
    </div>
  );
}
