// Comparison metadata for /vs/<slug> programmatic SEO pages.
// Honest framing: every entry names a real "use them instead" case.

export type CapabilityKey =
  | 'curation'
  | 'paidPlacementDisclosure'
  | 'deadlineTracker'
  | 'walletAwareEligibility'
  | 'freshnessStamp'
  | 'cc0DataExport'
  | 'mcpEmbed';

export interface CapabilityCell {
  text: string;
  // 'yes' = clean win, 'partial' = caveated, 'no' = absent.
  state: 'yes' | 'partial' | 'no';
}

export interface CompetitorFaq {
  q: string;
  a: string;
}

export interface Competitor {
  slug: string;
  name: string;
  domain: string;
  shortName: string;
  // One-paragraph honest framing (rendered as lede under H1).
  framing: string;
  // Per-axis comparison.
  capabilities: Record<CapabilityKey, { competitor: CapabilityCell; us: CapabilityCell }>;
  // Honest counter-take — when the competitor is actually the better choice.
  whenToUseThemInstead: string[];
  // FAQ items used for JSON-LD FAQPage.
  faq: CompetitorFaq[];
  // Search-engine meta.
  metaDescription: string;
}

export const CAPABILITY_ORDER: { key: CapabilityKey; label: string; sub: string }[] = [
  { key: 'curation', label: 'Curation discipline', sub: 'Curated vs. volume-listing' },
  { key: 'paidPlacementDisclosure', label: 'Paid-placement disclosure', sub: 'Are ads visually separated from listings?' },
  { key: 'deadlineTracker', label: 'Deadline tracker', sub: 'iCal feed / weekly digest' },
  { key: 'walletAwareEligibility', label: 'Wallet-aware eligibility', sub: 'Paste address → personal verdict' },
  { key: 'freshnessStamp', label: 'Per-entry freshness stamp', sub: 'When was this last verified?' },
  { key: 'cc0DataExport', label: 'CC0 / data export', sub: 'Bulk JSON, machine-readable' },
  { key: 'mcpEmbed', label: 'MCP server + embed widget', sub: 'LLM-native + 1-line <script> embed' },
];

const US_DEFAULTS: Record<CapabilityKey, CapabilityCell> = {
  curation: { state: 'yes', text: 'Hand-vetted, scam-filtered (42 entries). Suspected scams excluded, not silently hidden.' },
  paidPlacementDisclosure: { state: 'yes', text: 'No paid placements. Sponsor slot (if any) is labelled and separated from listings on a dedicated /sponsor page.' },
  deadlineTracker: { state: 'yes', text: 'Public iCal feed at /airdrops.ics + weekly Wednesday digest by email.' },
  walletAwareEligibility: { state: 'yes', text: 'Paste your wallet at /tools/eligibility — 14 on-chain rules return a personal verdict in seconds.' },
  freshnessStamp: { state: 'yes', text: 'Every entry shows "last verified YYYY-MM-DD"; weekly freshness sweep keeps it current.' },
  cc0DataExport: { state: 'yes', text: 'Bulk JSON at /api/airdrops.json + CC0 mirror at github.com/SolvoHQ/web3-discover-data.' },
  mcpEmbed: { state: 'yes', text: 'Public MCP server at /api/mcp (4 tools) + 1-line <script> embed widget at /embed.js.' },
};

export const COMPETITORS: Competitor[] = [
  {
    slug: 'airdrops-io',
    name: 'airdrops.io',
    domain: 'airdrops.io',
    shortName: 'airdrops.io',
    metaDescription:
      'airdrops.io vs web3-discover — the dominant volume directory compared with a hand-vetted, scam-filtered airdrop index. Honest feature table, where each tool wins, and when to use them instead.',
    framing:
      'airdrops.io is the largest and longest-running airdrop directory on the open web — its strength is breadth, and its archive is genuinely useful when you are researching whether an old airdrop was real. The trade-off is that volume-first directories must list almost everything to maximise ad inventory, which means a meaningful share of entries are unvetted protocol-side announcements or thinly-disguised paid promotion. web3-discover takes the opposite position: we publish ~40 entries instead of ~400, every entry is hand-checked before it goes live, and suspected scams are excluded entirely rather than silently buried.',
    capabilities: {
      curation: {
        competitor: { state: 'no', text: 'Lists nearly every announced airdrop. Volume model. No public exclusion of suspect campaigns.' },
        us: US_DEFAULTS.curation,
      },
      paidPlacementDisclosure: {
        competitor: { state: 'partial', text: '"Hot" / featured slots and sidebar banners sit inline with editorial listings. Disclosure exists but is easy to miss on first scroll.' },
        us: US_DEFAULTS.paidPlacementDisclosure,
      },
      deadlineTracker: {
        competitor: { state: 'partial', text: 'Listing pages show deadline text, but there is no iCal feed or scheduled email digest of upcoming dated milestones.' },
        us: US_DEFAULTS.deadlineTracker,
      },
      walletAwareEligibility: {
        competitor: { state: 'no', text: 'No wallet-paste eligibility check; you read entries one by one and decide yourself.' },
        us: US_DEFAULTS.walletAwareEligibility,
      },
      freshnessStamp: {
        competitor: { state: 'partial', text: 'Some listings show a "last update" date; not all do, and there is no public sweep cadence.' },
        us: US_DEFAULTS.freshnessStamp,
      },
      cc0DataExport: {
        competitor: { state: 'no', text: 'No public bulk JSON / CSV export of listings. Data lives behind the website only.' },
        us: US_DEFAULTS.cc0DataExport,
      },
      mcpEmbed: {
        competitor: { state: 'no', text: 'No MCP server, no <script> embed for third-party sites.' },
        us: US_DEFAULTS.mcpEmbed,
      },
    },
    whenToUseThemInstead: [
      'You are researching the history of an airdrop that ended years ago — airdrops.io has a deeper archive of completed campaigns than we do.',
      'You want to scan a very large surface area of announcements and decide for yourself which are real — that is exactly the use case their volume model serves.',
      'You are looking for an aggregator that also indexes Galxe / Zealy quest campaigns at scale — they cover those by volume; we only feature them when we have manually verified the rewards.',
    ],
    faq: [
      {
        q: 'Is web3-discover an airdrops.io clone?',
        a: 'No. airdrops.io is a volume directory with ~400+ entries; web3-discover is a curated index with ~40. The product philosophy is the opposite — we exclude entries rather than include them.',
      },
      {
        q: 'Does web3-discover charge for placement?',
        a: 'No. There are no paid placements on web3-discover. Editorial listings and the (currently unsold) sponsor slot live on different URLs and are never mixed.',
      },
      {
        q: 'Can I check if I am eligible for an airdrop on airdrops.io?',
        a: 'airdrops.io does not have a wallet-aware eligibility tool. web3-discover does — paste your wallet at /tools/eligibility and 14 on-chain rules return a personal verdict.',
      },
    ],
  },
  {
    slug: 'airdropalert',
    name: 'AirdropAlert',
    domain: 'airdropalert.com',
    shortName: 'AirdropAlert',
    metaDescription:
      'AirdropAlert vs web3-discover — long-running airdrop alerts site vs a curated, wallet-aware airdrop directory. Where each wins and which one to use.',
    framing:
      'AirdropAlert has been publishing airdrop alerts since 2017 and runs an email-first model: their core product is push notifications when new campaigns appear. That has real value if you want maximum recall — you do not want to miss anything. The trade-off is the same as airdrops.io: optimising for recall means optimising against curation, and the email channel itself mixes in sponsored sections. web3-discover prioritises precision over recall — we send one curated digest per week instead of multiple alerts per day, and every entry is hand-checked before it enters the queue.',
    capabilities: {
      curation: {
        competitor: { state: 'no', text: 'Volume-first. Alerts fire for nearly every announced campaign — recall over precision.' },
        us: US_DEFAULTS.curation,
      },
      paidPlacementDisclosure: {
        competitor: { state: 'partial', text: 'Email blasts and listing pages include sponsored sections; disclosure is present but visually similar to editorial.' },
        us: US_DEFAULTS.paidPlacementDisclosure,
      },
      deadlineTracker: {
        competitor: { state: 'partial', text: 'Email alerts cover new campaigns, but there is no iCal feed of upcoming snapshot/claim deadlines.' },
        us: US_DEFAULTS.deadlineTracker,
      },
      walletAwareEligibility: {
        competitor: { state: 'no', text: 'No wallet-paste eligibility check.' },
        us: US_DEFAULTS.walletAwareEligibility,
      },
      freshnessStamp: {
        competitor: { state: 'partial', text: 'New-campaign timestamps exist; ongoing-status freshness sweeps are not advertised.' },
        us: US_DEFAULTS.freshnessStamp,
      },
      cc0DataExport: {
        competitor: { state: 'no', text: 'No public bulk export of campaigns.' },
        us: US_DEFAULTS.cc0DataExport,
      },
      mcpEmbed: {
        competitor: { state: 'no', text: 'No MCP server, no embeddable widget.' },
        us: US_DEFAULTS.mcpEmbed,
      },
    },
    whenToUseThemInstead: [
      'You want push notification the day a new campaign is announced and you accept that you will need to filter signal yourself.',
      'You want a long historical archive of past campaigns including ones that ended years ago.',
      'You prefer an email-first product to a website-first product — AirdropAlert is built around the inbox; we are built around a structured index.',
    ],
    faq: [
      {
        q: 'Does web3-discover do email alerts like AirdropAlert?',
        a: 'We send one curated weekly digest (Wednesday 14:00 UTC) instead of multiple per-campaign alerts. The trade-off is precision over recall.',
      },
      {
        q: 'Is the data on web3-discover the same as AirdropAlert?',
        a: 'No. AirdropAlert is a recall-optimised superset; web3-discover is a precision-optimised subset, hand-checked before publication and re-verified weekly.',
      },
      {
        q: 'Can I subscribe to web3-discover for free?',
        a: 'Yes — /subscribe is free, one-click unsubscribe, no paid placements in the digest.',
      },
    ],
  },
  {
    slug: 'earnifi',
    name: 'Earnifi',
    domain: 'earni.fi',
    shortName: 'Earnifi',
    metaDescription:
      'Earnifi vs web3-discover — claim-finder for already-eligible tokens vs forward-looking curated airdrop index. Honest table of where each one wins.',
    framing:
      'Earnifi solves a different problem than we do. Earnifi is a claim-finder: you connect a wallet and it tells you which already-live airdrops you can claim right now. That is a genuinely useful product, and for that specific job it is excellent. web3-discover sits one step earlier in the funnel — we tell you which airdrops are worth farming in the first place, before they have launched. If you want both jobs done, use Earnifi for claims and us for forward-looking opportunities; the two products complement each other rather than competing directly.',
    capabilities: {
      curation: {
        competitor: { state: 'partial', text: 'Focus is on detecting eligibility against already-launched token contracts. The "curation" question is largely answered by on-chain reality.' },
        us: US_DEFAULTS.curation,
      },
      paidPlacementDisclosure: {
        competitor: { state: 'yes', text: 'Earnifi has not historically mixed paid placements into claim results — the surface area for paid promotion is small.' },
        us: US_DEFAULTS.paidPlacementDisclosure,
      },
      deadlineTracker: {
        competitor: { state: 'partial', text: 'Surfaces claim windows for live tokens; does not maintain a forward-looking calendar of pre-TGE snapshot dates.' },
        us: US_DEFAULTS.deadlineTracker,
      },
      walletAwareEligibility: {
        competitor: { state: 'yes', text: 'This is their core product — connect a wallet, see live claimable tokens.' },
        us: US_DEFAULTS.walletAwareEligibility,
      },
      freshnessStamp: {
        competitor: { state: 'partial', text: 'Driven by on-chain reads, so data is live-fresh by construction. Per-airdrop editorial freshness is not the model.' },
        us: US_DEFAULTS.freshnessStamp,
      },
      cc0DataExport: {
        competitor: { state: 'no', text: 'No CC0 data export of campaigns.' },
        us: US_DEFAULTS.cc0DataExport,
      },
      mcpEmbed: {
        competitor: { state: 'no', text: 'No public MCP server / embed.' },
        us: US_DEFAULTS.mcpEmbed,
      },
    },
    whenToUseThemInstead: [
      'You want to know what you can claim right now from past airdrops — Earnifi is the right tool for that exact job.',
      'You only care about live, on-chain claimable distributions and have no interest in farming pre-TGE campaigns.',
      'You want a one-click wallet connection that surfaces forgotten tokens; that is their core flow, not ours.',
    ],
    faq: [
      {
        q: 'Is web3-discover a claim-finder like Earnifi?',
        a: 'No. We help you decide which airdrops to farm before they launch. Earnifi helps you claim ones that already launched. Use both for the full funnel.',
      },
      {
        q: 'Does web3-discover read my wallet like Earnifi?',
        a: 'Only at /tools/eligibility, /tools/wallet-check, /tools/wallet-age and /tools/token-holdings — and only client-side. We never proxy the read through a server we control.',
      },
      {
        q: 'Should I connect a wallet to web3-discover?',
        a: 'Only by pasting an address into the tools above. We do not request a wallet signature or transaction signature anywhere on the site.',
      },
    ],
  },
  {
    slug: 'layer3',
    name: 'Layer3',
    domain: 'layer3.xyz',
    shortName: 'Layer3',
    metaDescription:
      'Layer3 vs web3-discover — quest platform with in-platform rewards vs a directory of protocol-native airdrops. Honest comparison and when to use each.',
    framing:
      'Layer3 is a quest platform: protocols pay Layer3 to design quests, users complete them inside Layer3, and rewards (CUBE points / token rewards) flow through the Layer3 product. That is structurally different from what we do. web3-discover is a directory that points at protocol-native campaigns — the rewards come from the protocol itself, not from us. The two are complements, not direct substitutes: many users farm both quest platforms and protocol-native points programs side by side. Where we cross paths is that we list a small number of Layer3 quests when the underlying rewards have been publicly confirmed, so users can see them next to non-quest opportunities.',
    capabilities: {
      curation: {
        competitor: { state: 'partial', text: 'Quests on the platform are curated for fit with sponsoring protocols, not for editorial scam-filtering across the whole airdrop space.' },
        us: US_DEFAULTS.curation,
      },
      paidPlacementDisclosure: {
        competitor: { state: 'partial', text: 'By design every featured quest is paid-for-placement by the protocol sponsor; this is the platform model, but it is not a separately disclosed editorial line.' },
        us: US_DEFAULTS.paidPlacementDisclosure,
      },
      deadlineTracker: {
        competitor: { state: 'partial', text: 'Individual quests show end dates inside the platform; no global iCal feed across all opportunities.' },
        us: US_DEFAULTS.deadlineTracker,
      },
      walletAwareEligibility: {
        competitor: { state: 'partial', text: 'Quest progress is tied to a connected wallet, but there is no "paste any address and see your eligibility across 40 different external campaigns" tool.' },
        us: US_DEFAULTS.walletAwareEligibility,
      },
      freshnessStamp: {
        competitor: { state: 'partial', text: 'Quest state is live; freshness of external airdrop context is not the platform job.' },
        us: US_DEFAULTS.freshnessStamp,
      },
      cc0DataExport: {
        competitor: { state: 'no', text: 'Quest list lives behind the platform; no CC0 mirror.' },
        us: US_DEFAULTS.cc0DataExport,
      },
      mcpEmbed: {
        competitor: { state: 'no', text: 'No public MCP server / embed surface for third-party sites.' },
        us: US_DEFAULTS.mcpEmbed,
      },
    },
    whenToUseThemInstead: [
      'You want a guided, click-through-tasks experience with in-platform rewards — that is the Layer3 product, not ours.',
      'You want CUBE / Layer3-native points; we do not issue them.',
      'You prefer a single platform that aggregates quests across many protocols into one connected wallet flow.',
    ],
    faq: [
      {
        q: 'Does web3-discover replace Layer3?',
        a: 'No — they are complements. Layer3 runs platform-native quests; we index protocol-native airdrops. Many active farmers use both.',
      },
      {
        q: 'Does web3-discover list Layer3 quests?',
        a: 'Selectively, when the underlying token / points reward is publicly confirmed. We do not bulk-mirror every quest.',
      },
      {
        q: 'Is Layer3 paid placement?',
        a: 'On Layer3, every featured quest is sponsored by the protocol — that is how the platform works. On web3-discover, editorial listings are never paid placements.',
      },
    ],
  },
  {
    slug: 'defillama-airdrops',
    name: 'DefiLlama airdrops',
    domain: 'defillama.com/airdrops',
    shortName: 'DefiLlama airdrops',
    metaDescription:
      'DefiLlama airdrops vs web3-discover — DefiLlama\'s airdrops side feature compared with a single-purpose curated airdrop index. Honest table and when to use each.',
    framing:
      'DefiLlama is one of the most trusted data sources in DeFi, and their airdrops section inherits that trust — the underlying TVL / protocol data is excellent. But the airdrops tab is a side feature of a much larger product, not the main thing the team works on, and that shows up in the editorial layer: there is less hand-vetting per entry, less defence against scams that pretend to be DefiLlama-blessed, and no wallet-aware eligibility tooling specific to airdrops. web3-discover is the inverse: we do one thing only and we put the editorial work directly into each entry.',
    capabilities: {
      curation: {
        competitor: { state: 'partial', text: 'Inherits DefiLlama\'s underlying data quality; editorial curation per airdrop entry is lighter than the data layer.' },
        us: US_DEFAULTS.curation,
      },
      paidPlacementDisclosure: {
        competitor: { state: 'yes', text: 'DefiLlama is notable for keeping the data layer clean of paid placement. Same standard appears to extend to the airdrops tab.' },
        us: US_DEFAULTS.paidPlacementDisclosure,
      },
      deadlineTracker: {
        competitor: { state: 'partial', text: 'Listing-level deadlines are present; no iCal feed / scheduled email digest for the airdrops tab specifically.' },
        us: US_DEFAULTS.deadlineTracker,
      },
      walletAwareEligibility: {
        competitor: { state: 'no', text: 'No dedicated wallet-paste eligibility tool for airdrop campaigns.' },
        us: US_DEFAULTS.walletAwareEligibility,
      },
      freshnessStamp: {
        competitor: { state: 'partial', text: 'Underlying protocol stats refresh continuously; per-airdrop editorial freshness sweeps are not the operating model.' },
        us: US_DEFAULTS.freshnessStamp,
      },
      cc0DataExport: {
        competitor: { state: 'yes', text: 'DefiLlama itself is famously open with data, though airdrop-specific bulk exports are less obvious.' },
        us: US_DEFAULTS.cc0DataExport,
      },
      mcpEmbed: {
        competitor: { state: 'no', text: 'No airdrop-specific MCP server / embed widget.' },
        us: US_DEFAULTS.mcpEmbed,
      },
    },
    whenToUseThemInstead: [
      'You are cross-referencing airdrop economics against protocol TVL / fee data — DefiLlama is where that data lives, and you should trust it.',
      'You want maximum coverage of every announced campaign rather than a hand-picked subset.',
      'You prefer staying inside one trusted dashboard for all of DeFi rather than visiting a single-purpose site.',
    ],
    faq: [
      {
        q: 'Is web3-discover trying to replace DefiLlama?',
        a: 'No. DefiLlama is a multi-product DeFi data terminal. web3-discover does one thing: a curated, hand-vetted airdrop index. The two complement each other.',
      },
      {
        q: 'Where does web3-discover get its data?',
        a: 'Each entry is hand-checked against the project\'s own channel (docs, blog, official socials). On-chain rules used in /tools/eligibility are coded against public RPCs.',
      },
      {
        q: 'Does DefiLlama have a wallet-aware airdrop check?',
        a: 'Not at the dedicated tool level for airdrops. /tools/eligibility on web3-discover is purpose-built for that question.',
      },
    ],
  },
  {
    slug: 'dappradar-airdrops',
    name: 'DappRadar airdrops',
    domain: 'dappradar.com/airdrops',
    shortName: 'DappRadar airdrops',
    metaDescription:
      'DappRadar airdrops vs web3-discover — dapp-data terminal with airdrops tab vs a single-purpose, scam-filtered airdrop index. Where each one wins.',
    framing:
      'DappRadar is a dapp / NFT / DeFi data terminal whose airdrops section sits alongside dozens of other product surfaces. Their strength is the breadth of the underlying dapp data and a long-running brand; the trade-off is that the airdrops tab is one product of many, and DappRadar\'s monetisation includes sponsored slots that historically have been visible on adjacent pages. web3-discover is single-purpose: one job, no other product surfaces competing for attention, and no paid-placement-as-listing.',
    capabilities: {
      curation: {
        competitor: { state: 'partial', text: 'Inherits broader dapp data; airdrop-specific hand-vetting layer is lighter than the data layer.' },
        us: US_DEFAULTS.curation,
      },
      paidPlacementDisclosure: {
        competitor: { state: 'partial', text: 'DappRadar runs sponsored placements across the site; on the airdrops tab, separation of editorial vs paid is present but not absolute.' },
        us: US_DEFAULTS.paidPlacementDisclosure,
      },
      deadlineTracker: {
        competitor: { state: 'partial', text: 'Listings expose deadlines; no iCal feed / weekly email digest of upcoming snapshot dates.' },
        us: US_DEFAULTS.deadlineTracker,
      },
      walletAwareEligibility: {
        competitor: { state: 'partial', text: 'Wallet portfolio tools exist at the dapp / token level; no dedicated "paste a wallet, see airdrop eligibility across 40 campaigns" surface.' },
        us: US_DEFAULTS.walletAwareEligibility,
      },
      freshnessStamp: {
        competitor: { state: 'partial', text: 'Underlying dapp stats refresh continuously; per-airdrop editorial freshness sweeps are not the operating model.' },
        us: US_DEFAULTS.freshnessStamp,
      },
      cc0DataExport: {
        competitor: { state: 'no', text: 'No public CC0 bulk export of the airdrops tab.' },
        us: US_DEFAULTS.cc0DataExport,
      },
      mcpEmbed: {
        competitor: { state: 'no', text: 'No public airdrop-specific MCP server / 1-line embed.' },
        us: US_DEFAULTS.mcpEmbed,
      },
    },
    whenToUseThemInstead: [
      'You want dapp / NFT / DeFi / token data all in one terminal and airdrops as one tab among many.',
      'You are researching the activity of a specific dapp and want airdrop context as part of a broader picture.',
      'You prefer a large incumbent brand with multi-year track record across many surfaces.',
    ],
    faq: [
      {
        q: 'Is web3-discover similar to DappRadar?',
        a: 'No — DappRadar is a multi-product data terminal; we are a single-purpose curated airdrop index. Different scope, different editorial model.',
      },
      {
        q: 'Does DappRadar have wallet-aware airdrop eligibility?',
        a: 'Not at the dedicated airdrop-eligibility level. /tools/eligibility on web3-discover is purpose-built for that question.',
      },
      {
        q: 'Are listings on web3-discover paid placements?',
        a: 'No. Listings are never paid placements; the (currently unsold) sponsor slot is a separate, clearly-labelled surface on /sponsor.',
      },
    ],
  },
  {
    slug: 'airdrop-com',
    name: 'Airdrop.com',
    domain: 'airdrop.com',
    shortName: 'Airdrop.com',
    metaDescription:
      'Airdrop.com vs web3-discover — branded airdrop directory compared with a curated, scam-filtered, wallet-aware index. Honest feature table and when to use each.',
    framing:
      'Airdrop.com runs the airdrop.com domain as a branded directory + community surface — they have a strong domain name, a sizeable index, and quest-style integrations. The trade-off, again, is the recall-vs-precision axis: a directory designed for breadth has to admit more campaigns of uncertain quality than a curated index. web3-discover trades off coverage to gain trust per-entry, and bundles the editorial work with wallet-aware tools that volume directories generally do not build.',
    capabilities: {
      curation: {
        competitor: { state: 'partial', text: 'Branded directory with a sizable index; editorial scam-filtering across the whole index is lighter than a curated model.' },
        us: US_DEFAULTS.curation,
      },
      paidPlacementDisclosure: {
        competitor: { state: 'partial', text: 'Promoted / featured slots exist; separation of editorial vs paid is similar to other volume directories.' },
        us: US_DEFAULTS.paidPlacementDisclosure,
      },
      deadlineTracker: {
        competitor: { state: 'partial', text: 'Deadline text on listings; no public iCal feed of upcoming dated milestones.' },
        us: US_DEFAULTS.deadlineTracker,
      },
      walletAwareEligibility: {
        competitor: { state: 'no', text: 'No multi-airdrop wallet-paste eligibility tool.' },
        us: US_DEFAULTS.walletAwareEligibility,
      },
      freshnessStamp: {
        competitor: { state: 'partial', text: 'Some entries show timestamps; no advertised sweep cadence across the whole index.' },
        us: US_DEFAULTS.freshnessStamp,
      },
      cc0DataExport: {
        competitor: { state: 'no', text: 'No public CC0 bulk export.' },
        us: US_DEFAULTS.cc0DataExport,
      },
      mcpEmbed: {
        competitor: { state: 'no', text: 'No public MCP server / 1-line embed widget.' },
        us: US_DEFAULTS.mcpEmbed,
      },
    },
    whenToUseThemInstead: [
      'You like a quest-style flow inside the directory itself rather than being sent out to the protocol\'s own site.',
      'You want maximum breadth of announced campaigns and accept you will need to filter signal yourself.',
      'You prefer a brand-name domain in your bookmarks; airdrop.com is one of the most memorable.',
    ],
    faq: [
      {
        q: 'Is web3-discover the same product as Airdrop.com?',
        a: 'No — different editorial philosophy. Airdrop.com is volume + quests; web3-discover is curated + wallet-aware tools.',
      },
      {
        q: 'Why is web3-discover smaller?',
        a: 'Because every entry is hand-checked before publication and weekly-re-verified. A precision model is necessarily smaller than a recall model.',
      },
      {
        q: 'Are web3-discover\'s tools really free?',
        a: 'Yes — /tools/eligibility, /tools/wallet-check, /tools/wallet-age and /tools/token-holdings are all free, client-side, and never request a wallet signature.',
      },
    ],
  },
];

export function getCompetitor(slug: string): Competitor | undefined {
  return COMPETITORS.find((c) => c.slug === slug);
}
