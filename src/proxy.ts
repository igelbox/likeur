import { subLogger } from './log';

const logger = subLogger('proxy');

export function create(settings: Record<string, unknown>) {
  return async function proxyGet(path: string, query?: Record<string, unknown>) {
    logger.debug('get', path, query);
    const params = Object.entries(query ?? {})
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(String(v)))
      .join('&');
    const url = path + '?' + params;
    const u = new URL(url);
    const res = await fetch(settings.proxy + '?url=' + encodeURIComponent(url), {
      headers: {
        ...settings.headers as any,
        'X-Host': u.host,
      },
    });
    return res.json();
  }
}
