import { describe, expect, it } from '@jest/globals';
import { renderToStaticMarkup } from 'react-dom/server';
import GuidePage, { metadata } from './page';

describe('public guide page', () => {
  it('explains the current search, booking and lookup flow without promising online payment', () => {
    const html = renderToStaticMarkup(GuidePage());

    expect(html).toContain('Panduan perjalanan');
    expect(html).toContain('Cari perjalanan');
    expect(html).toContain('Membuat booking');
    expect(html).toContain('Cek status booking');
    expect(html).toContain('Pembayaran online belum tersedia');
    expect(html).toContain('TBD: diisi pemilik bisnis');
  });

  it('provides guide metadata', () => {
    expect(metadata.title).toBe('Panduan perjalanan | TMS');
    expect(metadata.description).toContain('booking');
  });
});
