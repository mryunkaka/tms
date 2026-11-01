import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return { name: 'TMS | Perjalanan wisata', short_name: 'TMS', description: 'Temukan perjalanan wisata dari berbagai daerah di Indonesia.', start_url: '/', display: 'standalone', background_color: '#f7f8f6', theme_color: '#0b6e69' };
}
