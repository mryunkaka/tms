import { describe, expect, it, jest } from '@jest/globals';
import { renderToStaticMarkup } from 'react-dom/server';
import HomePage from './page';

describe('home page', () => {
  it('renders a trip search and a truthful empty state when the catalogue has no published content', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn<typeof fetch>().mockImplementation(async () => new Response(JSON.stringify([]), { status: 200 }));
    try {
      const html = renderToStaticMarkup(await HomePage());
      expect(html).toContain('Temukan perjalanan');
      expect(html).toContain('Belum ada perjalanan yang dipublikasikan.');
      expect(html).toContain('name="destination"');
    } finally {
      global.fetch = originalFetch;
    }
  });
});
