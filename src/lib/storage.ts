// Opt-in local persistence. When the user enables "save on this device", the
// transaction list, custom rules and settings are written to IndexedDB — which
// lives only in this browser and never touches a server. Disabled by default;
// "Clear all data" wipes the database entirely.

import { openDB, type IDBPDatabase } from 'idb';
import type { Rule, Settings, Transaction } from '../types';

const DB_NAME = 'money-saver';
const STORE = 'state';
const VERSION = 1;

interface PersistedState {
  transactions: Transaction[];
  rules: Rule[];
  settings: Settings;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function db(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(STORE)) {
          database.createObjectStore(STORE);
        }
      },
    });
  }
  return dbPromise;
}

export async function saveState(state: PersistedState): Promise<void> {
  const database = await db();
  await database.put(STORE, state, 'snapshot');
}

export async function loadState(): Promise<PersistedState | null> {
  try {
    const database = await db();
    return (await database.get(STORE, 'snapshot')) ?? null;
  } catch {
    return null;
  }
}

/** Delete all persisted data from this browser. */
export async function clearState(): Promise<void> {
  const database = await db();
  await database.clear(STORE);
}
