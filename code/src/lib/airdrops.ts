import { getCollection, type CollectionEntry } from 'astro:content';

export type AirdropEntry = CollectionEntry<'airdrops'>;

const ONGOING_SENTINEL = '9999-12-31';

const normalizedDeadline = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) return ONGOING_SENTINEL;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return ONGOING_SENTINEL;
};

export async function listPublishedAirdrops(): Promise<AirdropEntry[]> {
  const entries = await getCollection('airdrops');
  return entries
    .filter((entry) => entry.data.risk !== 'suspect')
    .sort((a, b) => {
      const da = normalizedDeadline(a.data.deadline);
      const db = normalizedDeadline(b.data.deadline);
      if (da !== db) return da.localeCompare(db);
      return a.data.project.localeCompare(b.data.project);
    });
}
