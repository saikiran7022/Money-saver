import { useEffect, useState } from 'react';
import type { DraftTransaction } from './types';
import { useStore } from './state/store';
import Header from './components/Header';
import PrivacyBanner from './components/PrivacyBanner';
import UploadZone from './components/UploadZone';
import ReviewTable from './components/ReviewTable';
import Dashboard from './components/Dashboard';

export default function App() {
  const hydrate = useStore((s) => s.hydrate);
  const hydrated = useStore((s) => s.hydrated);
  const transactions = useStore((s) => s.transactions);
  const commitDrafts = useStore((s) => s.commitDrafts);

  // Drafts awaiting review before they're committed to the dataset.
  const [drafts, setDrafts] = useState<DraftTransaction[] | null>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  function handleParsed(parsed: DraftTransaction[]) {
    setDrafts((prev) => [...(prev ?? []), ...parsed]);
  }

  function handleCommit(reviewed: DraftTransaction[]) {
    commitDrafts(reviewed);
    setDrafts(null);
  }

  if (!hydrated) {
    return (
      <div className="grid min-h-screen place-items-center text-slate-500">Loading…</div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <PrivacyBanner />
        <UploadZone onParsed={handleParsed} />

        {drafts && (
          <ReviewTable
            drafts={drafts}
            onCommit={handleCommit}
            onCancel={() => setDrafts(null)}
          />
        )}

        {transactions.length > 0 ? (
          <Dashboard />
        ) : (
          !drafts && (
            <div className="card text-center text-slate-500">
              No transactions yet. Upload a bank statement above to get started.
            </div>
          )
        )}
      </main>
    </div>
  );
}
