import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTrip, formatIdr, formatMakassarDate } from '@/lib/public-api';
import { BookingForm } from './booking-form';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const trip = await getTrip(slug);
  return trip ? { title: `${trip.name} | TMS`, description: trip.summary } : { title: 'Perjalanan tidak ditemukan | TMS' };
}

function itineraryDays(value: unknown): { day: number; title: string; description?: string }[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is { day: number; title: string; description?: string } => typeof item === 'object' && item !== null && Number.isInteger(item.day) && typeof item.title === 'string');
}

export default async function TripDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const trip = await getTrip(slug);
  if (!trip) notFound();
  const minimumPrice = trip.schedules.length ? Math.min(...trip.schedules.map(({ priceIdr }) => priceIdr)) : undefined;
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'TouristTrip', name: trip.name, description: trip.summary,
    touristType: 'Wisatawan', itinerary: trip.itinerary,
    offers: minimumPrice === undefined ? undefined : { '@type': 'Offer', priceCurrency: 'IDR', price: minimumPrice },
  };

  return <main className="site-main detail-main">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    <nav className="breadcrumbs" aria-label="Breadcrumb"><a href="/">Beranda</a><span aria-hidden="true">/</span><span>{trip.name}</span></nav>
    <header className="detail-hero"><p className="eyebrow">{trip.destinations.map(({ name }) => name).join(' · ')}</p><h1>{trip.name}</h1><p>{trip.summary}</p><div className="detail-meta"><span>{trip.durationDays} hari</span>{minimumPrice !== undefined && <span>Mulai {formatIdr(minimumPrice)} / peserta</span>}</div></header>
    <div className="detail-layout">
      <div className="detail-content">
        <section className="detail-section"><h2>Itinerary</h2>{itineraryDays(trip.itinerary).length ? <ol className="itinerary-list">{itineraryDays(trip.itinerary).map((item) => <li key={item.day}><strong>Hari {item.day} · {item.title}</strong>{item.description && <p>{item.description}</p>}</li>)}</ol> : <p className="empty-state">TBD: diisi pemilik bisnis.</p>}</section>
        <section className="detail-section"><h2>Termasuk</h2>{trip.inclusions.length ? <ul>{trip.inclusions.map((item, index) => <li key={index}>{item}</li>)}</ul> : <p>TBD: diisi pemilik bisnis.</p>}</section>
        <section className="detail-section"><h2>Belum termasuk</h2>{trip.exclusions.length ? <ul>{trip.exclusions.map((item, index) => <li key={index}>{item}</li>)}</ul> : <p>TBD: diisi pemilik bisnis.</p>}</section>
        <section className="detail-section"><h2>Titik kumpul</h2><p>{trip.meetingPoint || 'TBD: diisi pemilik bisnis.'}</p></section>
        <section className="detail-section"><h2>Syarat perjalanan</h2><p>{trip.terms || 'TBD: diisi pemilik bisnis.'}</p></section>
        <section className="detail-section"><h2>Kebijakan pembatalan</h2><p>{trip.cancellationPolicy || 'TBD: diisi pemilik bisnis.'}</p></section>
      </div>
      <aside className="schedule-panel" aria-labelledby="schedule-heading"><h2 id="schedule-heading">Pilih jadwal</h2>{trip.schedules.length ? trip.schedules.map((schedule) => <div className="schedule-option" key={schedule.id}><p><strong>{formatMakassarDate(schedule.departureAt)}</strong></p><p>{formatIdr(schedule.priceIdr)} / peserta</p><p>{schedule.availableSeats} kursi tersedia · minimum {schedule.minimumPax} peserta</p><BookingForm schedule={schedule} /></div>) : <p className="empty-state">Belum ada jadwal yang tersedia.</p>}</aside>
    </div>
  </main>;
}
