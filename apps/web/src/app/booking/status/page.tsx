import type { Metadata } from 'next';
import { LookupForm } from './lookup-form';

export const metadata: Metadata = { title: 'Cek status booking | TMS', robots: { index: false, follow: false } };

export default function BookingStatusPage() {
  return <main className="site-main narrow-main"><p className="eyebrow">Informasi pemesanan</p><h1>Cek status booking</h1><p>Masukkan kode booking serta kontak pemesan untuk melihat status secara aman.</p><LookupForm /></main>;
}
