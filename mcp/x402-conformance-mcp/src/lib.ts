/**
 * Shared helpers: payload decoding, plugin-root/corpus discovery, finding shape,
 * and the on-chain net-balance check used by inspect_payment_response.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export type Severity = 'critical' | 'high' | 'info' | 'pass' | 'fail';
export interface Finding {
  severity: Severity;
  message: string;
  where?: string;
  spec?: string;
}

export function hasBlocker(findings: Finding[]): boolean {
  return findings.some((f) => f.severity === 'critical' || f.severity === 'high' || f.severity === 'fail');
}

/** Accept a payload as a JS object, raw JSON string, or base64-encoded JSON (x402 header form). */
export function decodePayload(args: { json?: unknown; raw?: string }): {
  value: any;
  encoding: 'object' | 'json' | 'base64-json';
} {
  if (args.json !== undefined && args.json !== null) {
    return { value: args.json, encoding: 'object' };
  }
  const raw = (args.raw ?? '').trim();
  if (!raw) throw new Error('no input: provide `json` (object) or `raw` (string)');
  try {
    return { value: JSON.parse(raw), encoding: 'json' };
  } catch {
    /* fall through */
  }
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8');
    return { value: JSON.parse(decoded), encoding: 'base64-json' };
  } catch {
    throw new Error('could not parse `raw` as JSON or base64-encoded JSON');
  }
}

/** Locate the plugin root (the dir containing .x402-specs/). Honors CLAUDE_PLUGIN_ROOT. */
export function pluginRoot(): string {
  const env = process.env.CLAUDE_PLUGIN_ROOT;
  if (env && existsSync(join(env, '.x402-specs'))) return env;
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(dir, '.x402-specs'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('could not locate the bundled corpus (.x402-specs/). Set CLAUDE_PLUGIN_ROOT to the plugin root.');
}

export function readCorpusFile(relPath: string): string {
  return readFileSync(join(pluginRoot(), relPath), 'utf8');
}

export function requireField(obj: any, names: string[], tag: string, findings: Finding[], severity: Severity = 'critical'): void {
  const present = names.some((n) => obj != null && obj[n] !== undefined && obj[n] !== null && obj[n] !== '');
  if (!present) {
    findings.push({ severity, message: `${tag}: missing ${names[0]}${names.length > 1 ? ' (or ' + names.slice(1).join('/') + ')' : ''}` });
  }
}

/**
 * Sum the net balance change for one address (optionally one asset) from a list of
 * balanceChanges (Sui-shaped). Pushes a pass/critical finding comparing to expected.
 * Returns a JSON-safe summary (BigInts stringified).
 */
export function netBalanceCheck(
  balanceChanges: any[],
  payTo: string,
  asset: string | undefined,
  expectedAmount: string | number | undefined,
  findings: Finding[],
  status?: string,
): { netToPayTo: string; asset?: string; expected?: string; match: boolean; status?: string } {
  const norm = (a: unknown) => String(a ?? '').toLowerCase();
  let net = 0n;
  for (const c of balanceChanges ?? []) {
    const owner = c?.owner?.AddressOwner ?? c?.owner?.addressOwner ?? c?.owner;
    if (norm(owner) === norm(payTo) && (!asset || c?.coinType === asset)) {
      try {
        net += BigInt(c.amount);
      } catch {
        /* skip non-integer */
      }
    }
  }
  if (status && status !== 'success') {
    findings.push({ severity: 'critical', message: `on-chain transaction status is "${status}", not success` });
  }
  let expected: bigint | undefined;
  if (expectedAmount !== undefined) {
    const intPart = String(expectedAmount).split('.')[0];
    try {
      expected = BigInt(intPart!);
    } catch {
      expected = undefined;
    }
  }
  const match = expected !== undefined && net === expected;
  if (expected !== undefined) {
    if (match) {
      findings.push({
        severity: 'pass',
        message: `on-chain net to payTo = ${net} atomic${asset ? ' of ' + asset : ''} — matches advertised amount (recomputed from the ledger, not trust-the-operator)`,
      });
    } else {
      findings.push({
        severity: 'critical',
        message: `on-chain net to payTo = ${net} atomic, but advertised amount = ${expected} — MISMATCH`,
      });
    }
  }
  const out: { netToPayTo: string; asset?: string; expected?: string; match: boolean; status?: string } = {
    netToPayTo: net.toString(),
    match,
  };
  if (asset !== undefined) out.asset = asset;
  if (expected !== undefined) out.expected = expected.toString();
  if (status !== undefined) out.status = status;
  return out;
}
