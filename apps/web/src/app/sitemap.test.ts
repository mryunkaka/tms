import { afterEach, describe, expect, it, jest } from '@jest/globals';
import sitemap from './sitemap';

describe('sitemap', () => {
  const originalFetch = global.fetch;

  afterEach(() => { global.fetch = originalFetch; });

  it('includes the public guide route', async () => {
    global.fetch = jest.fn<typeof fetch>().mockImplementation(async () => new Response('[]', { status: 200 }));

    const routes = await sitemap();

    expect(routes.map(({ url }) => url)).toContain('http://127.0.0.1:8085/panduan');
  });
});
