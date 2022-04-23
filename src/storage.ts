import { subLogger } from './log';

const logger = subLogger('storage');

function wrap<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onerror = reject;
    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

export interface IStore<T> {
  getAll(): Promise<T[]>;
  get(key: string | number): Promise<T>;
  put(value: T, key?: string | number): Promise<void>;
  delete(key: string | number): Promise<void>;

  export(): Promise<unknown>;
  import(dump: unknown): Promise<void>;
}

export type FStore<T> = () => IStore<T>;

export interface IStorage {
  settings: <T>() => IStore<T>;
  places: <T>() => IStore<T>;
  processed: <T>() => IStore<T>;
}

export async function open() {
  const IndexedDB = window.indexedDB; // || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;

  if (!IndexedDB) {
    throw new Error("Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.");
  }

  const request = IndexedDB.open('Likeur', 3);
  request.onupgradeneeded = event => {
    const db = request.result;
    if (event.oldVersion < 1) {
      logger.info('migrating to v1');
      db.createObjectStore('settings');
      db.createObjectStore('followers');
    }
    if (event.oldVersion < 2) {
      logger.info('migrating to v2');
      db.createObjectStore('places', { keyPath: 'pk' });
    }
    if (event.oldVersion < 3) {
      logger.info('migrating to v3');
      db.createObjectStore('processed', { keyPath: 'pk' });
    }
  };
  const db = await wrap(request);
  logger.debug('ready');
  return {
    settings: <T>() => makeStore<T>('settings'),
    places: <T>() => makeStore<T>('places', 'pk', ['info']),
    processed: <T>() => makeStore<T>('processed', 'pk'),
  };
  function makeStore<T>(name: string, keyPath?: string, skipKeys: string[] = []): IStore<T> {
    const transaction = db.transaction([name], 'readwrite');
    const store = transaction.objectStore(name);
    return {
      async getAll() {
        return wrap<T[]>(store.getAll());
      },
      async get(key: string | number) {
        return wrap<T>(store.get(key));
      },
      async put(value: T, key?: string | number) {
        logger.debug('put', store.name, omitSkipKeys(value), key);
        await wrap(store.put(value, key));
      },
      async delete(key: string | number) {
        logger.debug('del', store.name, key);
        await wrap(store.delete(key));
      },
      async export() {
        logger.info('exporting', name);
        const store = db.transaction([name], 'readonly')
          .objectStore(name);
        if (!keyPath) {
          const vv: Record<string, unknown> = {};
          for (const k of await wrap(store.getAllKeys())) {
            vv[String(k)] = omitSkipKeys(await wrap(store.get(k)));
          }
          return vv;
        }
        const values = await wrap(store.getAll());
        return values.map(omitSkipKeys);
      },
      async import(dump: unknown) {
        const store = db.transaction([name], 'readwrite')
          .objectStore(name);
        logger.info('importing', name);
        await wrap(store.clear());
        if (!keyPath) {
          for (const [k, v] of Object.entries(dump as any)) {
            await wrap(store.put(v, k));
          }
        } else {
          for (const v of dump as unknown[]) {
            await wrap(store.put(v));
          }
        }
      },
    };

    function omitSkipKeys<T>(value: T) {
      if (!skipKeys.length) {
        return value;
      }
      const result = { ...value } as Record<string, unknown>;
      for (const k of skipKeys) {
        delete result[k];
      }
      return result;
    }
  }
}
