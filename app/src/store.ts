/**
 * Where the app keeps the pet on the phone, under the same save file the Pi writes
 * (core/src/pet.ts, SaveFile).
 *
 * - In the app from the stores, a file in the app's own data folder. The phone's backup carries
 *   it (Android's backup to the Google account, iCloud), and so does moving to a new phone.
 * - In a browser, IndexedDB. Clearing the browser's data would take the pet with it; the
 *   browser version is for trying the pet out.
 */

import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";

import { native } from "./native";

export const PET_KEY = "pet";
// A save that could not be read is kept here instead of being overwritten
export const BROKEN_KEY = "pet.broken";
// The pet that was on the phone before one came over from a display (see takeInSave)
export const ASIDE_KEY = "pet.before-load";

export interface Store {
  /** The value under `key`, or undefined if there is none. */
  get(key: string): Promise<unknown>;
  put(key: string, value: unknown): Promise<void>;
}

/**
 * Puts the save `file` of a pet from a display in place of the one the phone keeps, which is kept
 * aside once (as the Pi does when a save is loaded). Only while no LocalPet is open: it would
 * write its own pet over it.
 */
export async function takeInSave(store: Store, file: unknown): Promise<void> {
  const kept = await store.get(PET_KEY);
  if (kept !== undefined) {
    await store.put(ASIDE_KEY, kept);
  }
  await store.put(PET_KEY, file);
}

/** The app's store: a file in the app from the stores, IndexedDB in a browser. */
export async function openStore(): Promise<Store> {
  if (!native) {
    return BrowserStore.open();
  }
  const store = new FileStore();
  if (await store.get(PET_KEY) === undefined) {
    // a pet from before the app kept it in a file
    try {
      const old = await (await BrowserStore.open()).get(PET_KEY);
      if (old !== undefined) {
        await store.put(PET_KEY, old);
      }
    } catch {
      // nothing there
    }
  }
  return store;
}

// ---------- In the browser: IndexedDB ----------

const DB_NAME = "blobling";
const DB_STORE = "saves";

function promised<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

class BrowserStore implements Store {
  private constructor(private readonly db: IDBDatabase) {}

  static async open(): Promise<BrowserStore> {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(DB_STORE);
    const store = new BrowserStore(await promised(request));
    // Ask the browser not to clear it when space runs low (it may say no)
    void navigator.storage?.persist?.().catch(() => false);
    return store;
  }

  get(key: string): Promise<unknown> {
    return promised(this.db.transaction(DB_STORE).objectStore(DB_STORE).get(key));
  }

  put(key: string, value: unknown): Promise<void> {
    const transaction = this.db.transaction(DB_STORE, "readwrite");
    transaction.objectStore(DB_STORE).put(value, key);
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }
}

// ---------- In the app from the stores: files ----------

const FOLDER = { directory: Directory.Data, encoding: Encoding.UTF8 } as const;

class FileStore implements Store {
  // one write after the other, so two saves never mix in the temporary file
  private writing: Promise<void> = Promise.resolve();

  async get(key: string): Promise<unknown> {
    // the temporary file only counts if a write stopped between its two steps
    for (const path of [`${key}.json`, `${key}.tmp`]) {
      let text: string;
      try {
        ({ data: text } = await Filesystem.readFile({ path, ...FOLDER }) as { data: string });
      } catch {
        continue; // not there
      }
      try {
        return JSON.parse(text);
      } catch {
        return text; // not a save file any more: the pet keeps it aside (local.ts)
      }
    }
    return undefined;
  }

  put(key: string, value: unknown): Promise<void> {
    const write = async (): Promise<void> => {
      // written next to it first, so an app that is killed halfway never leaves half a pet behind
      const tmp = `${key}.tmp`;
      await Filesystem.writeFile({ path: tmp, data: JSON.stringify(value), ...FOLDER });
      await Filesystem.deleteFile({ path: `${key}.json`, directory: Directory.Data }).catch(() => {});
      await Filesystem.rename({ from: tmp, to: `${key}.json`, directory: Directory.Data, toDirectory: Directory.Data });
    };
    const done = this.writing.then(write);
    this.writing = done.catch(() => {});
    return done;
  }
}
