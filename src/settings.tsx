import { subLogger } from './log';
import { IStore } from './storage';

const logger = subLogger('settings');

type Setting = {
  name: string;
  question: string;
  postprocess?(value: unknown, settings: Record<string, unknown>): void;
};

export const SCHEMA: Record<string, Setting> = {
  curl: {
    name: 'cURL',
    question: 'Paste i.instagram.com cURL request',
    postprocess(value: string, settings) {
      const rg = /-H '([^:]+): ([^']+)'/g;
      const headers: Record<string, unknown> = {};
      for (let m; m = rg.exec(value);) {
        let [_, k, v] = m;
        switch (k) {
          case 'Connection':
            continue;
          case 'Cookie':
            k = 'X-' + k;
            break;
        }
        headers[k] = v;
      }
      logger.info('headers:', headers);
      if (!headers['X-Cookie']) {
        throw new Error('Cookie not found');
      }
      settings.headers = headers;
      return value;
    }
  },
  proxy: { name: 'Proxy', question: 'Proxy host' },
};

class Cancelled extends Error { }

export async function crate(store: () => IStore<unknown>, prompt: (title: string) => null | string | Promise<string>) {
  const settings: Record<string, unknown> = {};
  return {
    settings,
    async ask(key: string) {
      const schema = SCHEMA[key];
      const value = await ask(key, schema.question, store());
      settings[key] = schema.postprocess ? schema.postprocess(value, settings) : value;
    },
    async process() {
      const s = store();
      for (const [key, schema] of Object.entries(SCHEMA)) {
        let value = await s.get(key);
        if (!value) {
          value = await ask(key, schema.question, s);
        }
        settings[key] = schema.postprocess ? schema.postprocess(value, settings) : value;
      }
      logger.info(settings);
    },
  };
  async function ask(key: string, question: string, store: IStore<unknown>) {
    const value = await prompt(question);
    if (value == null) {
      throw new Cancelled();
    }
    await store.put(value, key);
    return value;
  }
}
