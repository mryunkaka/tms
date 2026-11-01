import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DestinationNode, findDestination, formatIdr, formatMakassarDate, getDestinations, getTrips } from '@/lib/public-api';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const destination = findDestination(await getDestinations() ?? [], slug);
  return destination ? { title: `${destination.name} | Perjalanan TMS`, description: `Lihat perjalanan yang tersedia di ${destination.name}.` } : { title: 'Destinasi tidak ditemukan | TMS' };
}

function childrenOf(node: DestinationNode): string[] { return [node.slug, ...node.children.flatMap(childrenOf)]; }

export default async function DestinationPage({ params }: PageProps) {
  const { slug } = await params;
  const destination = findDestination(await getDestinations() ?? [], slug);
  if (!destination) notFound();
  const trips = await getTrips({ destination: slug });
  const childSlugs = new Set(childrenOf(destination));
  const related = trips?.filter((trip) => trip.destinations.some((item) => childSlugs.has(item.slug))) ?? [];

  return <main className="site-main destination-main">
    <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Beranda</Link><span aria-hidden="true">/</span><span>{destination.name}</span></nav>
    <header className="detail-hero"><p className="eyebrow">Daerah tujuan</p><h1>{destination.name}</h1><p>Perjalanan yang tersedia di daerah ini mengikuti informasi yang dimasukkan operator.</p></header>
    <section className="content-section"><div className="section-heading"><div><p className="eyebrow">Katalog perjalanan</p><h2>Trip di {destination.name}</h2></div></div>
      {trips === null ? <p className="empty-state" role="status">Daftar perjalanan belum dapat dimuat.</p> : related.length ? <div className="trip-grid">{related.map((trip) => <article className="trip-card" key={trip.id}><div className="trip-card-top"><span className="trip-duration">{trip.durationDays} hari</span><span className="trip-seats">{trip.schedules[0].availableSeats} kursi tersedia</span></div><p className="trip-location">{trip.destinations.map(({ name }) => name).join(' · ')}</p><h3><Link href={`/trips/${trip.slug}`}>{trip.name}</Link></h3><p className="trip-summary">{trip.summary}</p><div className="trip-card-footer"><div><span>Mulai</span><strong>{formatIdr(trip.schedules[0].priceIdr)}</strong><small>{formatMakassarDate(trip.schedules[0].departureAt)}</small></div><Link className="text-link" href={`/trips/${trip.slug}`}>Lihat detail →</Link></div></article>)}</div> : <p className="empty-state">Belum ada perjalanan yang dipublikasikan di daerah ini.</p>}
    </section>
  </main>;
}
