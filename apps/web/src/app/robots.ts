import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.APP_BASE_URL || 'http://127.0.0.1:8085').replace(/\/$/, '');
  return { rules: { userAgent: '*', allow: '/', disallow: '/admin' }, sitemap: `${base}/sitemap.xml` };
}
