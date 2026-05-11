import { LiFiWidget, type WidgetConfig } from '@lifi/widget';
import { useMemo } from 'react';

const SOLANA_CHAIN_ID = 1151111081099710;

const JUMPER_KEY_TO_CHAIN_ID: Record<string, number> = {
  ETH: 1,
  ARB: 42161,
  OPT: 10,
  BAS: 8453,
  POL: 137,
  BSC: 56,
  AVA: 43114,
  LNA: 59144,
  INK: 57073,
  BER: 80094,
  SCL: 534352,
  ERA: 324,
  BLS: 81457,
  MNT: 5000,
};

type SlugTarget =
  | { kind: 'evm'; fromChain: string; fromToken?: string; chainLabel: string; tokenLabel?: string }
  | { kind: 'solana'; inputMint?: string; outputMint?: string; symbol?: string }
  | { kind: 'fallback' };

function resolveFromUrl(
  defaultChainId: number,
): { fromChain: number; fromToken?: string } {
  if (typeof window === 'undefined') return { fromChain: defaultChainId };
  try {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');
    const chain = params.get('chain');
    const token = params.get('token');
    const registryEl = document.getElementById('swap-registry');
    const registry = registryEl ? JSON.parse(registryEl.textContent || '{}') : {};
    const slugTargets: Record<string, SlugTarget> = registry.slugTargets || {};
    const jumperChains: Record<string, string> = registry.jumperChains || {};
    const solanaMints: Record<string, string> = registry.solanaMints || {};

    let target: SlugTarget | null = null;
    if (slug && slugTargets[slug]) {
      target = slugTargets[slug];
    } else if (token && solanaMints[token.toUpperCase().trim()]) {
      target = { kind: 'solana', inputMint: solanaMints[token.toUpperCase().trim()] };
    } else if (chain) {
      const lower = chain.toLowerCase();
      if (/\bsolana\b/.test(lower)) {
        target = { kind: 'solana' };
      } else {
        for (const [needle, key] of Object.entries(jumperChains)) {
          if (lower.includes(needle)) {
            target = { kind: 'evm', fromChain: key, chainLabel: needle };
            break;
          }
        }
      }
    }

    if (target && target.kind === 'evm') {
      const chainId = JUMPER_KEY_TO_CHAIN_ID[target.fromChain];
      if (chainId) {
        return { fromChain: chainId, fromToken: target.fromToken };
      }
    }
    if (target && target.kind === 'solana') {
      return { fromChain: SOLANA_CHAIN_ID, fromToken: target.inputMint };
    }
  } catch (err) {
    console.error('[web3-discover] lifi preselect parse failed:', err);
  }
  return { fromChain: defaultChainId };
}

type Props = {
  defaultChainId?: number;
};

export default function LifiSwapWidget({ defaultChainId = 1 }: Props) {
  const preselect = useMemo(() => resolveFromUrl(defaultChainId), [defaultChainId]);

  const config = useMemo<WidgetConfig>(
    () => ({
      integrator: 'web3-discover',
      fee: 0.003,
      feeConfig: {
        name: 'web3-discover',
        fee: 0.003,
        showFeePercentage: true,
      },
      variant: 'compact',
      appearance: 'light',
      hiddenUI: ['poweredBy'],
      fromChain: preselect.fromChain,
      fromToken: preselect.fromToken,
      theme: {
        container: {
          border: '1px solid var(--rule, #d9d4c4)',
          borderRadius: '8px',
          maxWidth: '460px',
        },
      },
    }),
    [preselect.fromChain, preselect.fromToken],
  );

  return <LiFiWidget integrator="web3-discover" config={config} />;
}
