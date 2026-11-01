'use client';

import { FormEvent, useState } from 'react';
import { formatIdr, formatMakassarDate, formatMakassarDateTime } from '@/lib/public-api';

type BookingStatus = { code: string; status: string; participantCount: number; totalPriceIdr: number; amountDueIdr: number; holdExpiresAt: string; tripName: string; departureAt: string };

export function LookupForm() {
  const [booking, setBooking] = useState<BookingStatus | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(''); setBooking(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/v1/bookings/lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: form.get('code'), email: form.get('email'), phone: form.get('phone') }) });
      const body = await response.json();
      if (!response.ok) throw new Error('Booking tidak ditemukan. Periksa kembali kode dan kontak pemesan.');
      setBooking(body as BookingStatus);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Koneksi gagal. Silakan coba kembali.');
    } finally { setBusy(false); }
  }

  return <div className="lookup-layout">
    <form className="panel-form" onSubmit={submit}>
      <label className="form-field">Kode booking<input name="code" autoCapitalize="characters" pattern="[A-Za-z0-9_-]{16}" required maxLength={16} /></label>
      <label className="form-field">Email pemesan<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
      <label className="form-field">Nomor telepon pemesan<input name="phone" type="tel" autoComplete="tel" pattern="\+?[0-9]{8,15}" required /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-primary" disabled={busy}>{busy ? 'Memeriksa…' : 'Lihat status'}</button>
      <small>Kontak digunakan untuk verifikasi dan tidak ditampilkan pada hasil.</small>
    </form>
    {booking && <section className="status-card" aria-live="polite"><p className="eyebrow">Status booking</p><h2>{booking.tripName}</h2><dl><div><dt>Kode</dt><dd>{booking.code}</dd></div><div><dt>Status</dt><dd>{booking.status}</dd></div><div><dt>Tanggal berangkat</dt><dd>{formatMakassarDate(booking.departureAt)}</dd></div><div><dt>Peserta</dt><dd>{booking.participantCount}</dd></div><div><dt>Total</dt><dd>{formatIdr(booking.totalPriceIdr)}</dd></div><div><dt>Tagihan saat ini</dt><dd>{formatIdr(booking.amountDueIdr)}</dd></div></dl><p>Batas hold: {formatMakassarDateTime(booking.holdExpiresAt)}</p></section>}
  </div>;
}
