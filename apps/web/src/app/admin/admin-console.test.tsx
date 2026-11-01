import { describe, expect, it } from '@jest/globals';
import { renderToStaticMarkup } from 'react-dom/server';
import { AdminConsole } from './admin-console';
import { parseItineraryTitles } from './admin-form-data';

describe('admin console', () => {
  it('starts with a sign-in form and does not expose admin data before authentication', () => {
    const html = renderToStaticMarkup(<AdminConsole />);
    expect(html).toContain('Masuk admin');
    expect(html).toContain('Kata sandi');
    expect(html).not.toContain('Peserta booking');
  });

  it('requires one owner-provided itinerary title for each trip day', () => {
    expect(parseItineraryTitles('TBD: diisi pemilik bisnis\nHari kedua', 2)).toEqual([
      { day: 1, title: 'TBD: diisi pemilik bisnis' },
      { day: 2, title: 'Hari kedua' },
    ]);
    expect(() => parseItineraryTitles('Satu hari', 2)).toThrow('Judul itinerary harus diisi untuk setiap hari perjalanan.');
  });
});
