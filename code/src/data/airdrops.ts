export type RiskFlag = 'verified' | 'unverified' | 'suspect';

export interface Airdrop {
  slug: string;
  project: string;
  chain: string;
  blurb: string;
  action: string;
  effort: string;
  costFloor: string;
  deadline: string;
  risk: RiskFlag;
  officialUrl: string;
  twitter?: string;
}

// PLACEHOLDER data — real curated entries land in problem #3.
// These exist solely to verify the route shape + SEO indexing.
export const airdrops: Airdrop[] = [
  {
    slug: 'placeholder-example-one',
    project: 'Example Protocol',
    chain: 'Ethereum',
    blurb: 'Placeholder entry. Real curated listings replace this in the next tick.',
    action: 'Swap any amount on the project DEX.',
    effort: '~5 min',
    costFloor: 'gas only',
    deadline: 'ongoing',
    risk: 'unverified',
    officialUrl: 'https://example.com',
    twitter: 'example',
  },
  {
    slug: 'placeholder-example-two',
    project: 'Example Bridge',
    chain: 'Solana',
    blurb: 'Placeholder entry. Real curated listings replace this in the next tick.',
    action: 'Bridge ≥ $10 worth of assets.',
    effort: '~10 min',
    costFloor: '$10',
    deadline: '2026-06-30',
    risk: 'unverified',
    officialUrl: 'https://example.com',
  },
  {
    slug: 'placeholder-example-three',
    project: 'Example L2',
    chain: 'Base',
    blurb: 'Placeholder entry. Real curated listings replace this in the next tick.',
    action: 'Hold the testnet NFT until snapshot.',
    effort: 'ongoing',
    costFloor: '$0',
    deadline: '2026-07-15',
    risk: 'unverified',
    officialUrl: 'https://example.com',
  },
];

export const findAirdrop = (slug: string): Airdrop | undefined =>
  airdrops.find((a) => a.slug === slug);
