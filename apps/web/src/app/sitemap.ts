import type { MetadataRoute } from 'next';
import { DestinationNode, getDestinations, getTrips } from '@/lib/public-api';

function flatten(nodes: DestinationNode[]): DestinationNode[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children)]);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [destinations, trips] = await Promise.all([getDestinations(), getTrips()]);
  const base = (process.env.APP_BASE_URL || 'http://127.0.0.1:8085').replace(/\/$/, '');
  return [
    { url: base, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/panduan`, changeFrequency: 'monthly', priority: 0.5 },
    ...flatten(destinations ?? []).map(({ slug }) => ({ url: `${base}/destinations/${slug}`, changeFrequency: 'weekly' as const, priority: 0.7 })),
    ...(trips ?? []).map(({ slug }) => ({ url: `${base}/trips/${slug}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
  ];
}
