export type DestinationNode = { id: string; slug: string; name: string; sortOrder: number; children: DestinationNode[] };
export type PublicSchedule = { id: string; departureAt: string; priceIdr: number; availableSeats: number; minimumPax: number };
export type PublicTrip = {
  id: string; slug: string; name: string; summary: string; durationDays: number;
  destinations: { slug: string; name: string; position: number; isPrimary: boolean }[];
  schedules: PublicSchedule[];
};
export type PublicTripDetail = PublicTrip & {
  itinerary: unknown;
  inclusions: string[];
  exclusions: string[];
  meetingPoint: string;
  terms: string;
  cancellationPolicy: string;
};

const API_BASE_URL = (process.env.API_BASE_URL || 'http://127.0.0.1:3001').replace(/\/$/, '');

async function get<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1${path}`, { cache: 'no-store' });
    return response.ok ? await response.json() as T : null;
  } catch {
    return null;
  }
}

export async function getDestinations() {
  return get<DestinationNode[]>('/destinations');
}

export async function getTrips(filters: Record<string, string | undefined> = {}) {
  const params = new URLSearchParams(Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1])));
  const query = params.size ? `?${params}` : '';
  return get<PublicTrip[]>(`/trips${query}`);
}

export async function getTrip(slug: string) {
  return await get<PublicTripDetail>(`/trips/${encodeURIComponent(slug)}`);
}

export function findDestination(nodes: DestinationNode[], slug: string): DestinationNode | undefined {
  for (const node of nodes) {
    if (node.slug === slug) return node;
    const child = findDestination(node.children, slug);
    if (child) return child;
  }
  return undefined;
}

export function formatIdr(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
}

export function formatMakassarDate(iso: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'Asia/Makassar' }).format(new Date(iso));
}

export function formatMakassarDateTime(iso: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Makassar' }).format(new Date(iso));
}
