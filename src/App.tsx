import { useEffect, useState } from 'react';
import type { PeriodFilter } from './types';
import { useStore } from './state/store';
import Sidebar, { type Section } from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import Landing from './components/Landing';
import Overview from './components/Overview';
import TransactionsView from './components/TransactionsView';
import RulesManager from './components/RulesManager';
import ImportModal from './components/ImportModal';

export default function App() {
  const hydrate = useStore((s) => s.hydrate);
  const hydrated = useStore((s) => s.hydrated);
  const hasData = useStore((s) => s.transactions.length > 0);

  const [section, setSection] = useState<Section>('overview');
  const [filter, setFilter] = useState<PeriodFilter>({ kind: 'all' });
  const [importing, setImporting] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return <div className="app-canvas grid h-full place-items-center text-slate-400">Loading…</div>;
  }

  return (
    <div className="flex h-full">
      <Sidebar
        section={section}
        onSection={setSection}
        open={navOpen}
        onClose={() => setNavOpen(false)}
      />

      <div className="app-canvas flex min-w-0 flex-1 flex-col">
        <Topbar
          section={section}
          filter={filter}
          onFilter={setFilter}
          onImport={() => setImporting(true)}
          onMenu={() => setNavOpen(true)}
        />

        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          <div className="mx-auto max-w-6xl">
            {!hasData ? (
              <Landing onImport={() => setImporting(true)} />
            ) : section === 'overview' ? (
              <Overview filter={filter} />
            ) : section === 'transactions' ? (
              <TransactionsView filter={filter} />
            ) : (
              <RulesManager />
            )}
          </div>
        </main>
      </div>

      <ImportModal open={importing} onClose={() => setImporting(false)} />
    </div>
  );
}
