// One-shot keygen: produces EVM + Solana keypairs for integrator fee collection.
// Writes private keys to stdout; caller appends to .solvo/secrets.env (gitignored).
// Re-running generates fresh keys — don't run unless you want to rotate.

import { Wallet } from 'ethers';
import { generateKeyPairSync } from 'node:crypto';

// --- EVM (secp256k1 + keccak via ethers) ---
const evm = Wallet.createRandom();

// --- Solana (ed25519) ---
const { publicKey, privateKey } = generateKeyPairSync('ed25519');
// SPKI DER for ed25519 = 12-byte ASN.1 prefix + 32-byte raw pubkey
const pubBuf = publicKey.export({ type: 'spki', format: 'der' }).subarray(-32);
// PKCS8 DER for ed25519 = 16-byte ASN.1 prefix + 32-byte raw priv
const privBuf = privateKey.export({ type: 'pkcs8', format: 'der' }).subarray(-32);
// Phantom / solana-keygen "secret key" = 64 bytes: priv || pub
const solSecret64 = Buffer.concat([privBuf, pubBuf]);

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58(buf) {
  let n = 0n;
  for (const b of buf) n = (n << 8n) | BigInt(b);
  let out = '';
  while (n > 0n) {
    const r = Number(n % 58n);
    n /= 58n;
    out = B58[r] + out;
  }
  for (const b of buf) {
    if (b === 0) out = '1' + out;
    else break;
  }
  return out;
}

const solAddress = base58(pubBuf);
const solSecretB58 = base58(solSecret64);

const out = `
# --- integrator fee wallets (generated ${new Date().toISOString()}) ---
# Public addresses are baked into /tools/swap as integrator/fee-recipient.
# Private keys ONLY live here; never commit; never send to client bundle.

EVM_INTEGRATOR_ADDRESS=${evm.address}
EVM_INTEGRATOR_PRIVATE_KEY=${evm.privateKey}

SOL_INTEGRATOR_ADDRESS=${solAddress}
# Phantom-format 64-byte secret key, base58 encoded
SOL_INTEGRATOR_SECRET_KEY=${solSecretB58}
`;

process.stdout.write(out);
