'use client';

import { FormEvent, useState } from 'react';
import { formatIdr, formatMakassarDateTime, PublicSchedule } from '@/lib/public-api';

type BookingResult = { code: string; status: string; totalPriceIdr: number; amountDueIdr: number; holdExpiresAt: string };

export function BookingForm({ schedule }: { schedule: PublicSchedule }) {
  const [participants, setParticipants] = useState(['']);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/v1/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId: schedule.id, bookerName: form.get('bookerName'), email: form.get('email'), phone: form.get('phone'),
          participants: participants.map((fullName) => ({ fullName })),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(typeof body.message === 'string' ? body.message : 'Booking tidak dapat diproses.');
      setResult(body as BookingResult);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Koneksi gagal. Silakan coba kembali.');
    } finally {
      setBusy(false);
    }
  }

  if (result) return <div className="booking-result" role="status">
    <p className="eyebrow">Booking tercatat</p><h3>Kode booking: <code>{result.code}</code></h3>
    <p>Status: <strong>{result.status}</strong></p><p>Total: <strong>{formatIdr(result.totalPriceIdr)}</strong> · Tagihan saat ini: <strong>{formatIdr(result.amountDueIdr)}</strong></p>
    <p>Batas hold: {formatMakassarDateTime(result.holdExpiresAt)}</p>
    <p>Pembayaran online belum tersedia di tahap ini. Jika belum dibayar, booking berakhir otomatis saat batas hold terlewati.</p>
    <a className="text-link" href="/booking/status">Cek status booking</a>
  </div>;

  return <form className="booking-form" onSubmit={submit}>
    <h3>Pesan jadwal ini</h3>
    <p>Harga mulai {formatIdr(schedule.priceIdr)} per peserta · {schedule.availableSeats} kursi tersedia</p>
    <label className="form-field">Nama pemesan<input name="bookerName" autoComplete="name" required maxLength={160} /></label>
    <label className="form-field">Email<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
    <label className="form-field">Nomor telepon<input name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="+628123456789" pattern="\+?[0-9]{8,15}" required /></label>
    <fieldset className="participant-fields"><legend>Nama peserta</legend>{participants.map((name, index) => <label className="form-field" key={index}>Peserta {index + 1}<input value={name} onChange={(event) => setParticipants((current) => current.map((value, i) => i === index ? event.target.value : value))} required maxLength={160} /></label>)}</fieldset>
    <div className="form-actions"><button className="button button-secondary" type="button" disabled={participants.length >= Math.min(schedule.availableSeats, 10)} onClick={() => setParticipants((current) => [...current, ''])}>Tambah peserta</button>{participants.length > 1 && <button className="text-link" type="button" onClick={() => setParticipants((current) => current.slice(0, -1))}>Hapus peserta terakhir</button>}</div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Memproses…' : 'Buat booking sementara'}</button>
    <small>Batas waktu penahanan dan jumlah tagihan ditampilkan setelah booking dibuat. Jumlah dan harga dihitung oleh server.</small>
  </form>;
}
