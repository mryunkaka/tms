import { afterEach, describe, expect, it, jest } from '@jest/globals';
import sitemap from './sitemap';

describe('sitemap', () => {
  const originalFetch = global.fetch;
  const originalBaseUrl = process.env.APP_BASE_URL;

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalBaseUrl === undefined) delete process.env.APP_BASE_URL;
    else process.env.APP_BASE_URL = originalBaseUrl;
  });

  it('includes the public guide route', async () => {
    process.env.APP_BASE_URL = 'https://guide.example.test';
    global.fetch = jest.fn<typeof fetch>().mockImplementation(async () => new Response('[]', { status: 200 }));

    const routes = await sitemap();

    expect(routes.map(({ url }) => url)).toContain('https://guide.example.test/panduan');
  });
});
