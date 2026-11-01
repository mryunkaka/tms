export function parseItineraryTitles(value: string, durationDays: number) {
  const titles = value.split(/\r?\n/).map((title) => title.trim()).filter(Boolean);
  if (!Number.isInteger(durationDays) || durationDays < 1 || titles.length !== durationDays) {
    throw new Error('Judul itinerary harus diisi untuk setiap hari perjalanan.');
  }
  return titles.map((title, index) => ({ day: index + 1, title }));
}
