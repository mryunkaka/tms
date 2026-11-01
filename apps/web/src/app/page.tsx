import Link from 'next/link';
import { DestinationNode, formatIdr, formatMakassarDate, getDestinations, getTrips } from '@/lib/public-api';

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }

function DestinationOptions({ items, depth = 0 }: { items: DestinationNode[]; depth?: number }): React.ReactNode[] {
  return items.flatMap((item) => [
    <option key={item.id} value={item.slug}>{`${'— '.repeat(depth)}${item.name}`}</option>,
    ...DestinationOptions({ items: item.children, depth: depth + 1 }),
  ]);
}

export const dynamic = 'force-dynamic';

export default async function HomePage({ searchParams }: { searchParams?: Promise<SearchParams> } = {}) {
  const params = searchParams ? await searchParams : {};
  const filters = Object.fromEntries(['destination', 'from', 'to', 'minDuration', 'maxDuration', 'minPrice', 'maxPrice'].map((key) => [key, firstValue(params[key])])) as Record<string, string | undefined>;
  const [destinationResult, tripResult] = await Promise.all([getDestinations(), getTrips(filters)]);
  const destinations = destinationResult ?? [];
  const trips = tripResult ?? [];

  return <main className="site-main">
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="eyebrow">Perjalanan pilihan, dikelola satu operator</p>
        <h1 id="hero-title">Temukan perjalanan yang terasa pas untukmu.</h1>
        <p className="hero-text">Jelajahi trip dari berbagai daerah, bandingkan jadwal dan biaya, lalu pesan dengan informasi yang jelas.</p>
      </div>
      <form className="search-panel" action="/" method="get" aria-label="Cari perjalanan">
        <label>Destinasi<select name="destination" defaultValue={filters.destination ?? ''}><option value="">Semua destinasi</option><DestinationOptions items={destinations} /></select></label>
        <label>Berangkat mulai<input name="from" type="date" defaultValue={filters.from} /></label>
        <label>Sampai tanggal<input name="to" type="date" defaultValue={filters.to} /></label>
        <label>Durasi minimum (hari)<input name="minDuration" type="number" min="1" defaultValue={filters.minDuration} /></label>
        <label>Budget maksimum (Rp)<input name="maxPrice" type="number" min="0" defaultValue={filters.maxPrice} /></label>
        <button className="button button-primary" type="submit">Temukan perjalanan</button>
      </form>
    </section>

    <section className="content-section" aria-labelledby="destination-heading">
      <div className="section-heading"><div><p className="eyebrow">Jelajahi lebih luas</p><h2 id="destination-heading">Pilih daerah tujuan</h2></div></div>
      {destinationResult === null ? <p className="empty-state" role="status">Daftar destinasi belum dapat dimuat.</p> : destinations.length ? <ul className="destination-list">{destinations.map((destination) => <li key={destination.id}><Link href={`/destinations/${destination.slug}`}>{destination.name}<span aria-hidden="true">→</span></Link></li>)}</ul> : <p className="empty-state">Destinasi akan ditampilkan setelah informasi dari operator tersedia.</p>}
    </section>

    <section className="content-section" aria-labelledby="trips-heading">
      <div className="section-heading"><div><p className="eyebrow">Jadwal dan biaya transparan</p><h2 id="trips-heading">Perjalanan yang tersedia</h2></div><span className="result-count">{trips.length} perjalanan</span></div>
      {tripResult === null ? <p className="empty-state" role="status">Daftar perjalanan belum dapat dimuat. Silakan coba kembali beberapa saat lagi.</p> : trips.length ? <div className="trip-grid">{trips.map((trip) => {
        const schedule = trip.schedules[0];
        return <article className="trip-card" key={trip.id}>
          <div className="trip-card-top"><span className="trip-duration">{trip.durationDays} hari</span><span className="trip-seats">{schedule.availableSeats} kursi tersedia</span></div>
          <p className="trip-location">{trip.destinations.map(({ name }) => name).join(' · ')}</p>
          <h3><Link href={`/trips/${trip.slug}`}>{trip.name}</Link></h3>
          <p className="trip-summary">{trip.summary}</p>
          <div className="trip-card-footer"><div><span>Mulai</span><strong>{formatIdr(schedule.priceIdr)}</strong><small>{formatMakassarDate(schedule.departureAt)}</small></div><Link className="text-link" href={`/trips/${trip.slug}`}>Lihat detail <span aria-hidden="true">→</span></Link></div>
        </article>;
      })}</div> : <p className="empty-state">Belum ada perjalanan yang dipublikasikan.</p>}
    </section>
  </main>;
}
