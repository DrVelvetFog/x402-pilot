/**
 * validate_extension — structural validation of an x402 extension payload. Checks
 * the typed `{ info, schema }` envelope shape and runs light known-extension field
 * checks. Full JSON-schema validation needs the extension's published schema; this
 * is the structural gate plus a pointer to the spec. No network, no secrets.
 */
import { Finding, hasBlocker } from '../lib.js';

const KNOWN: Record<string, { needs: string[]; spec: string }> = {
  'offer-and-receipt': { needs: ['signature'], spec: '.x402-specs/extensions/extension-offer-and-receipt.md' },
  receipt: { needs: ['signature'], spec: '.x402-specs/extensions/extension-offer-and-receipt.md' },
  'payment_identifier': { needs: ['id'], spec: '.x402-specs/extensions/payment_identifier.md' },
  'sign-in-with-x': { needs: [], spec: '.x402-specs/extensions/sign-in-with-x.md' },
  'builder_code': { needs: [], spec: '.x402-specs/extensions/builder_code.md' },
  'eip2612_gas_sponsoring': { needs: [], spec: '.x402-specs/extensions/eip2612_gas_sponsoring.md' },
  'erc20_gas_sponsoring': { needs: [], spec: '.x402-specs/extensions/erc20_gas_sponsoring.md' },
};

function validateOne(name: string, entry: any, findings: Finding[]): void {
  const tag = `extension "${name}"`;
  if (entry == null || typeof entry !== 'object') {
    findings.push({ severity: 'critical', message: `${tag}: payload is not an object` });
    return;
  }
  // Typed { info, schema } envelope (per @x402/extensions). Some carry data inline.
  const hasEnvelope = 'info' in entry || 'schema' in entry;
  if (!hasEnvelope) {
    findings.push({ severity: 'info', message: `${tag}: no { info, schema } envelope — acceptable for inline-data extensions, but most x402 extensions are typed { info, schema } payloads` });
  }
  const known = KNOWN[name.toLowerCase()];
  if (known) {
    const body = entry.info ?? entry;
    for (const f of known.needs) {
      if (body?.[f] === undefined && entry?.[f] === undefined) {
        findings.push({ severity: 'high', message: `${tag}: missing expected field "${f}"`, spec: known.spec });
      }
    }
    findings.push({ severity: 'info', message: `${tag}: validate fully against ${known.spec}` });
  } else {
    findings.push({ severity: 'info', message: `${tag}: not a known extension; validated envelope shape only` });
  }
}

export async function validateExtension(args: any): Promise<unknown> {
  const findings: Finding[] = [];
  const payload = args?.payload;
  if (payload === undefined) throw new Error('`payload` is required (an extension payload, an extensions map, or a single entry)');

  if (args?.name) {
    validateOne(String(args.name), payload, findings);
  } else if (Array.isArray(payload)) {
    payload.forEach((e: any, i: number) => validateOne(e?.name ?? `[${i}]`, e, findings));
  } else if (payload && typeof payload === 'object') {
    const keys = Object.keys(payload);
    if (keys.length === 0) findings.push({ severity: 'high', message: 'empty extensions payload' });
    for (const k of keys) validateOne(k, payload[k], findings);
  } else {
    findings.push({ severity: 'critical', message: 'payload is neither an object map nor an array of extensions' });
  }

  if (!hasBlocker(findings)) findings.unshift({ severity: 'pass', message: 'extension payload envelope is well-formed' });
  return { findings };
}
