'use client';

import { FormEvent, useEffect, useState } from 'react';
import { formatIdr, formatMakassarDateTime } from '@/lib/public-api';
import { parseItineraryTitles } from './admin-form-data';

type Destination = { id: string; slug: string; name: string; description?: string | null; isActive: boolean; parentId: string | null };
type Trip = { id: string; slug: string; name: string; summary: string; durationDays: number; itinerary: { day: number; title: string }[]; inclusions: string[]; exclusions: string[]; meetingPoint: string; terms: string; cancellationPolicy: string; status: string; destinations: { destinationId: string; destination: Destination; position: number; isPrimary: boolean }[]; schedules: Schedule[] };
type Schedule = { id: string; departureAt: string; capacity: number; heldSeats: number; soldSeats: number; priceIdr: number; minimumPax: number; isActive: boolean };
type Booking = { id: string; code: string; status: string; bookerName: string; email: string; phone: string; participantCount: number; totalPriceIdr: number; amountDueIdr: number; createdAt: string; schedule: { departureAt: string; trip: { name: string } }; participants: { fullName: string }[] };
type AdminData = { destinations: Destination[]; trips: Trip[]; bookings: Booking[] };

async function api<T>(path: string, token: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(path, { method, credentials: 'include', headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof result.message === 'string' ? result.message : 'Permintaan tidak dapat diproses.');
  return result as T;
}

async function fetchAdminData(token: string): Promise<AdminData> {
  const [destinations, trips, bookings] = await Promise.all([
    api<Destination[]>('/api/v1/admin/destinations', token),
    api<Trip[]>('/api/v1/admin/trips', token),
    api<{ items: Booking[] }>('/api/v1/admin/bookings?limit=50', token),
  ]);
  return { destinations, trips, bookings: bookings.items };
}

function witaInputToIso(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? new Date(`${value}:00+08:00`).toISOString() : '';
}

function isoToWitaInput(value: string) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value)).replace(' ', 'T');
}

export function AdminConsole() {
  const [token, setToken] = useState('');
  const [data, setData] = useState<AdminData>({ destinations: [], trips: [], bookings: [] });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function refreshData(currentToken: string) {
    try { setData(await fetchAdminData(currentToken)); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Data admin belum dapat dimuat.'); }
  }

  useEffect(() => {
    let mounted = true;
    void fetch('/api/v1/auth/refresh', { method: 'POST', credentials: 'include' })
      .then(async (response) => response.ok ? response.json() : null)
      .then((result) => { if (mounted && result?.accessToken) { setToken(result.accessToken); void refreshData(result.accessToken); } })
      .catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/v1/auth/login', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) });
      const result = await response.json();
      if (!response.ok) throw new Error('Email atau kata sandi tidak valid.');
      setToken(result.accessToken); setNotice(`Masuk sebagai ${result.user.email}`); await refreshData(result.accessToken);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Login gagal.'); }
    finally { setBusy(false); }
  }

  async function logout() {
    if (token) await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => undefined);
    setToken(''); setData({ destinations: [], trips: [], bookings: [] }); setNotice('Anda sudah keluar.');
  }

  async function action(work: () => Promise<unknown>, message: string): Promise<boolean> {
    setBusy(true); setError(''); setNotice('');
    try { await work(); setNotice(message); if (token) await refreshData(token); return true; }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Perubahan tidak dapat disimpan.'); return false; }
    finally { setBusy(false); }
  }

  function submitAndReset(form: HTMLFormElement, work: () => Promise<unknown>, message: string) {
    void action(work, message).then((saved) => { if (saved) form.reset(); });
  }

  if (!token) return <main className="site-main narrow-main admin-main"><p className="eyebrow">Ruang operator</p><h1>Masuk admin</h1><p>Panel ini hanya dapat dibuka dengan akun admin.</p><form className="panel-form" onSubmit={login}>
    <label className="form-field">Email<input name="email" type="email" autoComplete="username" required maxLength={254} /></label>
    <label className="form-field">Kata sandi<input name="password" type="password" autoComplete="current-password" required /></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button button-primary" disabled={busy}>{busy ? 'Memeriksa…' : 'Masuk admin'}</button>
  </form></main>;

  return <main className="site-main admin-main">
    <div className="admin-heading"><div><p className="eyebrow">Ruang operator</p><h1>Kelola perjalanan</h1></div><button className="button button-secondary" onClick={logout}>Keluar</button></div>
    {notice && <p className="form-notice" role="status">{notice}</p>}{error && <p className="form-error" role="alert">{error}</p>}
    <section className="admin-section"><h2>Destinasi</h2><form className="admin-form" onSubmit={(event) => { event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); submitAndReset(formElement, () => api('/api/v1/admin/destinations', token, 'POST', { slug: form.get('slug'), name: form.get('name'), description: form.get('description') || undefined, parentId: form.get('parentId') || undefined }), 'Destinasi disimpan sebagai draft.'); }}>
      <label className="form-field">Nama<input name="name" required maxLength={120} /></label><label className="form-field">Slug<input name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" required /></label><label className="form-field">Destinasi induk<select name="parentId"><option value="">Tanpa induk</option>{data.destinations.map((destination) => <option value={destination.id} key={destination.id}>{destination.name}</option>)}</select></label><label className="form-field">Deskripsi (opsional)<input name="description" maxLength={2000} /></label><button className="button button-primary" disabled={busy}>Tambah destinasi</button>
    </form><div className="admin-list">{data.destinations.map((destination) => <article className="admin-row" key={destination.id}><div><strong>{destination.name}</strong><small>/{destination.slug} · {destination.isActive ? 'Aktif' : 'Draft'}</small></div><div className="row-actions">{!destination.isActive && <button className="button button-secondary" disabled={busy} onClick={() => void action(() => api(`/api/v1/admin/destinations/${destination.id}`, token, 'PATCH', { isActive: true }), 'Destinasi diaktifkan.')}>Aktifkan</button>}{destination.isActive && <button className="text-link" disabled={busy} onClick={() => void action(() => api(`/api/v1/admin/destinations/${destination.id}`, token, 'DELETE'), 'Destinasi diarsipkan.')}>Arsipkan</button>}</div><details className="admin-edit"><summary>Sunting destinasi</summary><form className="admin-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void action(() => api(`/api/v1/admin/destinations/${destination.id}`, token, 'PATCH', { name: form.get('name'), slug: form.get('slug'), description: form.get('description') || undefined, parentId: form.get('parentId') || null }), 'Perubahan destinasi disimpan.'); }}><label className="form-field">Nama<input name="name" defaultValue={destination.name} required maxLength={120} /></label><label className="form-field">Slug<input name="slug" defaultValue={destination.slug} pattern="[a-z0-9]+(-[a-z0-9]+)*" required /></label><label className="form-field">Destinasi induk<select name="parentId" defaultValue={destination.parentId ?? ''}><option value="">Tanpa induk</option>{data.destinations.filter((item) => item.id !== destination.id).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label className="form-field">Deskripsi<input name="description" defaultValue={destination.description ?? ''} maxLength={2000} /></label><button className="button button-secondary" disabled={busy}>Simpan perubahan</button></form></details></article>)}</div></section>

    <section className="admin-section"><h2>Buat trip draft</h2><form className="admin-form" onSubmit={(event) => { event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); const durationDays = Number(form.get('durationDays')); let itinerary; try { itinerary = parseItineraryTitles(String(form.get('itineraryTitles') || ''), durationDays); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Itinerary tidak valid.'); return; } const primaryId = String(form.get('destinationId') || ''); const otherIds = (form.getAll('otherDestinationIds') as string[]).filter((id) => id && id !== primaryId); const destinationIds = [primaryId, ...new Set(otherIds)]; submitAndReset(formElement, () => api('/api/v1/admin/trips', token, 'POST', { slug: form.get('slug'), name: form.get('name'), summary: form.get('summary'), durationDays, itinerary, inclusions: String(form.get('inclusions') || '').split(',').map((item) => item.trim()).filter(Boolean), exclusions: String(form.get('exclusions') || '').split(',').map((item) => item.trim()).filter(Boolean), meetingPoint: form.get('meetingPoint'), terms: form.get('terms'), cancellationPolicy: form.get('cancellationPolicy'), destinations: destinationIds.map((destinationId, position) => ({ destinationId, position, isPrimary: position === 0 })) }), 'Trip draft disimpan.'); }}>
      <label className="form-field">Nama trip<input name="name" required maxLength={160} /></label><label className="form-field">Slug<input name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" required /></label><label className="form-field">Ringkasan<input name="summary" required maxLength={2000} /></label><label className="form-field">Durasi (hari)<input name="durationDays" type="number" min="1" required /></label><label className="form-field">Destinasi utama<select name="destinationId" required><option value="">Pilih destinasi</option>{data.destinations.map((destination) => <option value={destination.id} key={destination.id}>{destination.name}</option>)}</select></label><label className="form-field">Destinasi lain (opsional)<select name="otherDestinationIds" multiple size={3}>{data.destinations.map((destination) => <option value={destination.id} key={destination.id}>{destination.name}</option>)}</select></label><label className="form-field">Judul itinerary, satu baris untuk setiap hari<textarea name="itineraryTitles" required maxLength={2000} placeholder={'TBD: diisi pemilik bisnis\nTBD: diisi pemilik bisnis'} /></label><label className="form-field">Termasuk (pisahkan dengan koma)<input name="inclusions" /></label><label className="form-field">Belum termasuk (pisahkan dengan koma)<input name="exclusions" /></label><label className="form-field">Titik kumpul<input name="meetingPoint" required maxLength={500} /></label><label className="form-field">Syarat perjalanan<input name="terms" required maxLength={4000} /></label><label className="form-field">Kebijakan pembatalan<input name="cancellationPolicy" required maxLength={4000} /></label><button className="button button-primary" disabled={busy || !data.destinations.length}>Buat trip draft</button>
    </form><div className="admin-list">{data.trips.map((trip) => <article className="admin-row admin-trip" key={trip.id}><div><strong>{trip.name}</strong><small>/{trip.slug} · {trip.status} · {trip.destinations.map(({ destination }) => destination.name).join(', ')}</small><small>{trip.schedules.length} jadwal</small></div><div className="row-actions">{trip.status === 'DRAFT' && <button className="button button-secondary" disabled={busy} onClick={() => void action(() => api(`/api/v1/admin/trips/${trip.id}`, token, 'PATCH', { status: 'PUBLISHED' }), 'Trip diterbitkan.')}>Terbitkan</button>}{trip.status === 'PUBLISHED' && <button className="text-link" disabled={busy} onClick={() => void action(() => api(`/api/v1/admin/trips/${trip.id}`, token, 'PATCH', { status: 'ARCHIVED' }), 'Trip diarsipkan.')}>Arsipkan</button>}</div>
      <details className="admin-edit"><summary>Sunting trip</summary><form className="admin-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const durationDays = Number(form.get('durationDays')); let itinerary; try { itinerary = parseItineraryTitles(String(form.get('itineraryTitles') || ''), durationDays); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Itinerary tidak valid.'); return; } const primaryId = String(form.get('destinationId') || ''); const otherIds = (form.getAll('otherDestinationIds') as string[]).filter((id) => id && id !== primaryId); const destinationIds = [primaryId, ...new Set(otherIds)]; void action(() => api(`/api/v1/admin/trips/${trip.id}`, token, 'PATCH', { slug: form.get('slug'), name: form.get('name'), summary: form.get('summary'), durationDays, itinerary, inclusions: String(form.get('inclusions') || '').split(',').map((item) => item.trim()).filter(Boolean), exclusions: String(form.get('exclusions') || '').split(',').map((item) => item.trim()).filter(Boolean), meetingPoint: form.get('meetingPoint'), terms: form.get('terms'), cancellationPolicy: form.get('cancellationPolicy'), destinations: destinationIds.map((destinationId, position) => ({ destinationId, position, isPrimary: position === 0 })) }), 'Perubahan trip disimpan.'); }}><label className="form-field">Nama trip<input name="name" defaultValue={trip.name} required maxLength={160} /></label><label className="form-field">Slug<input name="slug" defaultValue={trip.slug} pattern="[a-z0-9]+(-[a-z0-9]+)*" required /></label><label className="form-field">Ringkasan<input name="summary" defaultValue={trip.summary} required maxLength={2000} /></label><label className="form-field">Durasi (hari)<input name="durationDays" type="number" min="1" defaultValue={trip.durationDays} required /></label><label className="form-field">Destinasi utama<select name="destinationId" defaultValue={trip.destinations.find(({ isPrimary }) => isPrimary)?.destinationId ?? ''} required><option value="">Pilih destinasi</option>{data.destinations.map((destination) => <option value={destination.id} key={destination.id}>{destination.name}</option>)}</select></label><label className="form-field">Destinasi lain<select name="otherDestinationIds" multiple size={3} defaultValue={trip.destinations.filter(({ isPrimary }) => !isPrimary).map(({ destinationId }) => destinationId)}>{data.destinations.map((destination) => <option value={destination.id} key={destination.id}>{destination.name}</option>)}</select></label><label className="form-field">Judul itinerary, satu baris per hari<textarea name="itineraryTitles" defaultValue={trip.itinerary.sort((a, b) => a.day - b.day).map(({ title }) => title).join('\n')} required maxLength={2000} /></label><label className="form-field">Termasuk<input name="inclusions" defaultValue={trip.inclusions.join(', ')} /></label><label className="form-field">Belum termasuk<input name="exclusions" defaultValue={trip.exclusions.join(', ')} /></label><label className="form-field">Titik kumpul<input name="meetingPoint" defaultValue={trip.meetingPoint} required maxLength={500} /></label><label className="form-field">Syarat perjalanan<input name="terms" defaultValue={trip.terms} required maxLength={4000} /></label><label className="form-field">Kebijakan pembatalan<input name="cancellationPolicy" defaultValue={trip.cancellationPolicy} required maxLength={4000} /></label><button className="button button-secondary" disabled={busy}>Simpan perubahan</button></form></details>
      <form className="schedule-form" onSubmit={(event) => { event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); submitAndReset(formElement, () => api('/api/v1/admin/schedules', token, 'POST', { tripId: trip.id, departureAt: witaInputToIso(form.get('departureAt')), capacity: Number(form.get('capacity')), priceIdr: Number(form.get('priceIdr')), minimumPax: Number(form.get('minimumPax')) }), 'Jadwal draft disimpan.'); }}><label className="form-field">Keberangkatan (WITA)<input name="departureAt" type="datetime-local" required /></label><label className="form-field">Kapasitas<input name="capacity" type="number" min="1" required /></label><label className="form-field">Harga per peserta (Rp)<input name="priceIdr" type="number" min="0" required /></label><label className="form-field">Minimum peserta<input name="minimumPax" type="number" min="1" required /></label><button className="button button-secondary" disabled={busy}>Tambah jadwal</button></form>
      {trip.schedules.map((schedule) => <div className="schedule-row" key={schedule.id}><span>{formatMakassarDateTime(schedule.departureAt)} · {formatIdr(schedule.priceIdr)} · {schedule.capacity - schedule.heldSeats - schedule.soldSeats} kursi · {schedule.isActive ? 'Aktif' : 'Draft'}</span>{!schedule.isActive && <button className="text-link" disabled={busy} onClick={() => void action(() => api(`/api/v1/admin/schedules/${schedule.id}`, token, 'PATCH', { isActive: true }), 'Jadwal diaktifkan.')}>Aktifkan</button>}{schedule.isActive && <button className="text-link" disabled={busy} onClick={() => void action(() => api(`/api/v1/admin/schedules/${schedule.id}`, token, 'DELETE'), 'Jadwal dinonaktifkan.')}>Nonaktifkan</button>}<details className="admin-edit"><summary>Sunting jadwal</summary><form className="schedule-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void action(() => api(`/api/v1/admin/schedules/${schedule.id}`, token, 'PATCH', { departureAt: witaInputToIso(form.get('departureAt')), capacity: Number(form.get('capacity')), priceIdr: Number(form.get('priceIdr')), minimumPax: Number(form.get('minimumPax')) }), 'Perubahan jadwal disimpan.'); }}><label className="form-field">Keberangkatan (WITA)<input name="departureAt" type="datetime-local" defaultValue={isoToWitaInput(schedule.departureAt)} required /></label><label className="form-field">Kapasitas<input name="capacity" type="number" min="1" defaultValue={schedule.capacity} required /></label><label className="form-field">Harga per peserta (Rp)<input name="priceIdr" type="number" min="0" defaultValue={schedule.priceIdr} required /></label><label className="form-field">Minimum peserta<input name="minimumPax" type="number" min="1" defaultValue={schedule.minimumPax} required /></label><button className="button button-secondary" disabled={busy}>Simpan perubahan</button></form></details></div>)}</article>)}</div></section>

    <section className="admin-section"><h2>Booking terbaru</h2>{data.bookings.length ? <div className="admin-list">{data.bookings.map((booking) => <article className="admin-row booking-row" key={booking.id}><div><strong>{booking.code} · {booking.status}</strong><small>{booking.schedule.trip.name} · {formatMakassarDateTime(booking.schedule.departureAt)}</small><small>{booking.bookerName} · {booking.email} · {booking.phone}</small><small>{booking.participantCount} peserta · {formatIdr(booking.totalPriceIdr)} · Tagihan {formatIdr(booking.amountDueIdr)}</small><small>Peserta: {booking.participants.map(({ fullName }) => fullName).join(', ')}</small></div></article>)}</div> : <p className="empty-state">Belum ada booking.</p>}</section>
  </main>;
}
