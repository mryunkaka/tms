import type { Metadata } from 'next';
import { AdminConsole } from './admin-console';

export const metadata: Metadata = {
  title: 'Admin | TMS',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminConsole />;
}
