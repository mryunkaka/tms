import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TMS | Perjalanan wisata',
  description: 'Temukan perjalanan wisata dari berbagai daerah di Indonesia.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
