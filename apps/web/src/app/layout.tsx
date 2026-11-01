import type { Metadata } from 'next';
import Link from 'next/link';
import { ServiceWorkerRegistration } from './service-worker-registration';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_BASE_URL || 'http://127.0.0.1:8085'),
  title: 'TMS | Perjalanan wisata',
  description: 'Temukan perjalanan wisata dari berbagai daerah di Indonesia.',
  openGraph: { type: 'website', locale: 'id_ID', siteName: 'TMS' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>
    <ServiceWorkerRegistration />
    <header className="site-header"><Link className="brand" href="/" aria-label="TMS, beranda"><span className="brand-mark" aria-hidden="true">T</span><span>jalan<span className="brand-accent">kita</span></span></Link><nav aria-label="Navigasi utama"><Link href="/#trips-heading">Cari perjalanan</Link><Link href="/booking/status">Cek booking</Link><Link href="/admin">Admin</Link></nav></header>
    {children}
    <footer className="site-footer"><span>© TMS · Perjalanan dari berbagai daerah</span><span>Informasi trip mengikuti data dari operator.</span></footer>
  </body></html>;
}
