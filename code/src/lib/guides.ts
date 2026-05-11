import { getCollection, type CollectionEntry } from 'astro:content';

export type GuideEntry = CollectionEntry<'guides'>;
export type GuideTheme = GuideEntry['data']['theme'];

export async function listGuides(): Promise<GuideEntry[]> {
  const entries = await getCollection('guides');
  return entries.sort((a, b) =>
    b.data.publishedOn.localeCompare(a.data.publishedOn) ||
    a.data.title.localeCompare(b.data.title),
  );
}

// Map an airdrop entry to the 1-2 most relevant guides.
// Risk-flagged entries lead with scams; everything gets hygiene + taxes
// as backup recommendations. The set always contains at least 1 slug.
export function relatedGuideSlugsFor(input: {
  risk: 'verified' | 'unverified' | 'suspect';
}): GuideTheme[] {
  if (input.risk === 'suspect' || input.risk === 'unverified') {
    return ['scams', 'hygiene'];
  }
  return ['hygiene', 'taxes'];
}

export const GUIDE_SLUG_BY_THEME: Record<GuideTheme, string> = {
  scams: 'airdrop-scams',
  taxes: 'airdrop-taxes',
  hygiene: 'wallet-hygiene',
};
