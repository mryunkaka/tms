export function parseItineraryTitles(value: string, durationDays: number) {
  const titles = value.split(/\r?\n/).map((title) => title.trim()).filter(Boolean);
  if (!Number.isInteger(durationDays) || durationDays < 1 || titles.length !== durationDays) {
    throw new Error('Judul itinerary harus diisi untuk setiap hari perjalanan.');
  }
  return titles.map((title, index) => ({ day: index + 1, title }));
}

export function buildTripDestinationLinks(
  primaryId: string,
  selectedIds: string[],
  current: { destinationId: string; position: number }[] = [],
) {
  const selected = new Set([primaryId, ...selectedIds]);
  const retained = [...current]
    .sort((a, b) => a.position - b.position)
    .map(({ destinationId }) => destinationId)
    .filter((id) => id !== primaryId && selected.has(id));
  const retainedIds = new Set(retained);
  const added = [...new Set(selectedIds)].filter((id) => id !== primaryId && !retainedIds.has(id));

  return [primaryId, ...retained, ...added].map((destinationId, position) => ({
    destinationId,
    position,
    isPrimary: position === 0,
  }));
}
