import { LiFiWidget, type WidgetConfig } from '@lifi/widget';
import { useMemo } from 'react';

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
  | { kind: 'solana' }
  | { kind: 'fallback' };

function resolveFromUrl(): { fromChain?: number; fromToken?: string } {
  if (typeof window === 'undefined') return {};
  try {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');
    const chain = params.get('chain');
    const registryEl = document.getElementById('swap-registry');
    const registry = registryEl ? JSON.parse(registryEl.textContent || '{}') : {};
    const slugTargets: Record<string, SlugTarget> = registry.slugTargets || {};
    const jumperChains: Record<string, string> = registry.jumperChains || {};

    let target: SlugTarget | null = null;
    if (slug && slugTargets[slug]) {
      target = slugTargets[slug];
    } else if (chain) {
      const lower = chain.toLowerCase();
      for (const [needle, key] of Object.entries(jumperChains)) {
        if (lower.includes(needle)) {
          target = { kind: 'evm', fromChain: key, chainLabel: needle };
          break;
        }
      }
    }

    if (target && target.kind === 'evm') {
      const chainId = JUMPER_KEY_TO_CHAIN_ID[target.fromChain];
      if (chainId) {
        return { fromChain: chainId, fromToken: target.fromToken };
      }
    }
  } catch (err) {
    console.error('[web3-discover] lifi preselect parse failed:', err);
  }
  return {};
}

export default function LifiSwapWidget() {
  const preselect = useMemo(() => resolveFromUrl(), []);

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
      fromChain: preselect.fromChain ?? 1,
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
