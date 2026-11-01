import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { resolve } from 'node:path';
import { describe, expect, it, jest } from '@jest/globals';

function loadWorker() {
  const listeners = new Map<string, (event: unknown) => void>();
  const cached = new Map<string, string>();
  const cache = { add: jest.fn(async (url: string) => { cached.set(url, '<h1>Mode offline</h1>'); }) };
  const cacheStorage = {
    open: jest.fn(async (name?: string) => { void name; return cache; }),
    match: jest.fn(async (url: string) => {
      const response = cached.get(url);
      return response === undefined ? undefined : new Response(response);
    }),
    keys: jest.fn(async () => ['tms-offline-v0', 'unrelated-cache']),
    delete: jest.fn(async (name?: string) => { void name; return true; }),
  };
  const self = {
    location: { origin: 'https://tms.example.test' },
    clients: { claim: jest.fn(async () => undefined) },
    skipWaiting: jest.fn(async () => undefined),
    addEventListener: (name: string, listener: (event: unknown) => void) => listeners.set(name, listener),
  };
  const fetch = jest.fn(async (request?: unknown) => { void request; return new Response('network page'); });
  const source = readFileSync(resolve('public/sw.js'), 'utf8');
  runInNewContext(source, { self, caches: cacheStorage, fetch, URL, Promise });
  return { listeners, cached, cache, cacheStorage, fetch };
}

describe('offline service worker', () => {
  it('pre-caches only the static offline shell', async () => {
    const worker = loadWorker();
    let install: Promise<void> | undefined;
    worker.listeners.get('install')?.({ waitUntil: (promise: Promise<void>) => { install = promise; } });

    await install;

    expect(worker.cacheStorage.open).toHaveBeenCalledWith('tms-offline-v1');
    expect(worker.cache.add).toHaveBeenCalledWith('/offline.html');
    expect([...worker.cached.keys()]).toEqual(['/offline.html']);
  });

  it('uses the static shell when an admin navigation is offline without caching the response', async () => {
    const worker = loadWorker();
    worker.cached.set('/offline.html', '<h1>Mode offline</h1>');
    worker.fetch.mockRejectedValueOnce(new Error('offline'));
    let response: Promise<Response> | undefined;
    worker.listeners.get('fetch')?.({
      request: { method: 'GET', mode: 'navigate', url: 'https://tms.example.test/admin' },
      respondWith: (promise: Promise<Response>) => { response = promise; },
    });

    expect(await (await response)?.text()).toBe('<h1>Mode offline</h1>');
    expect(worker.cacheStorage.match).toHaveBeenCalledWith('/offline.html');
    expect(worker.cached.has('https://tms.example.test/admin')).toBe(false);
  });

  it('removes only prior TMS offline caches on activation', async () => {
    const worker = loadWorker();
    let activation: Promise<void> | undefined;
    worker.listeners.get('activate')?.({ waitUntil: (promise: Promise<void>) => { activation = promise; } });

    await activation;

    expect(worker.cacheStorage.delete).toHaveBeenCalledTimes(1);
    expect(worker.cacheStorage.delete).toHaveBeenCalledWith('tms-offline-v0');
  });

  it('does not intercept booking API POST requests', () => {
    const worker = loadWorker();
    const respondWith = jest.fn();
    worker.listeners.get('fetch')?.({
      request: { method: 'POST', mode: 'cors', url: 'https://tms.example.test/api/v1/bookings' },
      respondWith,
    });

    expect(respondWith).not.toHaveBeenCalled();
    expect(worker.fetch).not.toHaveBeenCalled();
  });
});
