import { describe, expect, it } from '@jest/globals';
import { renderToStaticMarkup } from 'react-dom/server';
import { AdminConsole } from './admin-console';
import { buildTripDestinationLinks, parseItineraryTitles } from './admin-form-data';
import { DestinationSortOrderField } from './destination-sort-order-field';

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

  it('renders the destination order as an editable non-negative number', () => {
    const html = renderToStaticMarkup(<DestinationSortOrderField value={12} />);
    expect(html).toContain('Urutan tampil');
    expect(html).toContain('type="number" min="0" max="2147483647" step="1"');
    expect(html).toContain('value="12"');
  });

  it('preserves trip visit order when catalog option order changes', () => {
    expect(buildTripDestinationLinks('primary', ['second', 'first'], [
      { destinationId: 'primary', position: 0 },
      { destinationId: 'first', position: 1 },
      { destinationId: 'second', position: 2 },
    ])).toEqual([
      { destinationId: 'primary', position: 0, isPrimary: true },
      { destinationId: 'first', position: 1, isPrimary: false },
      { destinationId: 'second', position: 2, isPrimary: false },
    ]);
  });
});
