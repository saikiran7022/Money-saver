import { create } from 'zustand';
import type { DraftTransaction, Rule, Settings, Transaction } from '../types';
import { mergeTransactions } from '../lib/dedupe';
import { recategorizeAll } from '../lib/categorize';
import { clearState, loadState, saveState } from '../lib/storage';

interface AppState {
  transactions: Transaction[];
  rules: Rule[];
  settings: Settings;
  hydrated: boolean;
  /** Transient: result of the last import for a toast/summary. */
  lastImport: { added: number; duplicates: number } | null;

  hydrate: () => Promise<void>;
  commitDrafts: (drafts: DraftTransaction[]) => void;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  removeTransaction: (id: string) => void;
  setCategory: (id: string, category: string, createRule: boolean) => void;
  addRule: (rule: Omit<Rule, 'id'>) => void;
  removeRule: (id: string) => void;
  setSettings: (patch: Partial<Settings>) => void;
  clearAll: () => Promise<void>;
}

const DEFAULT_SETTINGS: Settings = { persist: false, currency: '$' };

function ruleId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export const useStore = create<AppState>((set, get) => {
  // Persist after any mutation, but only when the user opted in.
  function persistIfEnabled() {
    const { settings, transactions, rules } = get();
    if (settings.persist) void saveState({ transactions, rules, settings });
  }

  return {
    transactions: [],
    rules: [],
    settings: DEFAULT_SETTINGS,
    hydrated: false,
    lastImport: null,

    async hydrate() {
      const saved = await loadState();
      if (saved) {
        set({
          transactions: saved.transactions,
          rules: saved.rules,
          settings: { ...DEFAULT_SETTINGS, ...saved.settings },
        });
      }
      set({ hydrated: true });
    },

    commitDrafts(drafts) {
      const { transactions } = get();
      const { merged, added, duplicates } = mergeTransactions(transactions, drafts);
      set({ transactions: merged, lastImport: { added, duplicates } });
      persistIfEnabled();
    },

    updateTransaction(id, patch) {
      set((s) => ({
        transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      }));
      persistIfEnabled();
    },

    removeTransaction(id) {
      set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }));
      persistIfEnabled();
    },

    setCategory(id, category, createRule) {
      const txn = get().transactions.find((t) => t.id === id);
      set((s) => ({
        transactions: s.transactions.map((t) => (t.id === id ? { ...t, category } : t)),
      }));
      // Optionally remember this choice as a rule keyed on the description.
      if (createRule && txn) {
        get().addRule({ match: txn.description.toLowerCase(), category });
      } else {
        persistIfEnabled();
      }
    },

    addRule(rule) {
      const rules = [...get().rules, { ...rule, id: ruleId() }];
      // Re-apply rules across all transactions so the change is retroactive.
      const transactions = recategorizeAll(get().transactions, rules) as Transaction[];
      set({ rules, transactions });
      persistIfEnabled();
    },

    removeRule(id) {
      const rules = get().rules.filter((r) => r.id !== id);
      const transactions = recategorizeAll(get().transactions, rules) as Transaction[];
      set({ rules, transactions });
      persistIfEnabled();
    },

    setSettings(patch) {
      const settings = { ...get().settings, ...patch };
      set({ settings });
      if (settings.persist) {
        const { transactions, rules } = get();
        void saveState({ transactions, rules, settings });
      } else if ('persist' in patch && patch.persist === false) {
        // User turned persistence off — remove anything already on disk.
        void clearState();
      }
    },

    async clearAll() {
      await clearState();
      set({ transactions: [], rules: [], lastImport: null });
    },
  };
});
