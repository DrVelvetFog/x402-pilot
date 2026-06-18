/**
 * decode_402 — parse and validate an x402 PaymentRequired (402) response.
 * Accepts a URL to GET, a raw/base64 body, or a JSON object. Deterministic; the
 * only network is an unpaid GET when `url` is given. No secrets.
 */
import { decodePayload, Finding, hasBlocker, requireField } from '../lib.js';

function checkAmount(amount: unknown, tag: string, offer: any, findings: Finding[]): void {
  if (typeof amount === 'number') {
    findings.push({ severity: 'high', message: `${tag}: amount is a number (${amount}); x402 amounts must be atomic-integer STRINGS to avoid precision loss` });
  } else if (typeof amount === 'string') {
    if (amount.includes('.')) {
      findings.push({ severity: 'critical', message: `${tag}: amount "${amount}" looks like a human decimal; it must be an atomic-integer string (e.g. "1000000") with decimals carried separately` });
    } else if (!/^\d+$/.test(amount)) {
      findings.push({ severity: 'high', message: `${tag}: amount "${amount}" is not a plain integer string` });
    } else {
      findings.push({ severity: 'pass', message: `${tag}: amount "${amount}" is an atomic-integer string` });
    }
  }
  const decimals = offer?.extra?.decimals ?? offer?.decimals;
  if (decimals === undefined) {
    findings.push({ severity: 'info', message: `${tag}: no explicit decimals found — the consumer must know the asset's decimals; never assume 6 or 18` });
  }
}

function analyze(pr: any, httpStatus?: number): { version: unknown; offerCount: number; offers: any[]; findings: Finding[] } {
  const findings: Finding[] = [];
  if (httpStatus !== undefined && httpStatus !== 402) {
    findings.push({ severity: 'high', message: `HTTP status was ${httpStatus}; a payment-required response should be 402` });
  }
  if (!pr || typeof pr !== 'object') {
    findings.push({ severity: 'critical', message: 'no PaymentRequired object found in the response' });
    return { version: null, offerCount: 0, offers: [], findings };
  }
  const version = pr.x402Version ?? pr.version ?? null;
  if (version == null) findings.push({ severity: 'high', message: 'missing x402Version/version field' });

  const rawOffers = pr.accepts ?? pr.paymentRequirements ?? (Array.isArray(pr) ? pr : [pr]);
  const offers = Array.isArray(rawOffers) ? rawOffers : [rawOffers];
  if (offers.length === 0) findings.push({ severity: 'critical', message: 'no payment offers (accepts/paymentRequirements is empty)' });

  offers.forEach((o: any, i: number) => {
    const tag = `accepts[${i}]`;
    requireField(o, ['scheme'], tag, findings);
    requireField(o, ['network'], tag, findings);
    requireField(o, ['asset', 'token'], tag, findings);
    requireField(o, ['payTo', 'payToAddress', 'recipient'], tag, findings);
    const amount = o?.maxAmountRequired ?? o?.amount ?? o?.maxAmount;
    if (amount === undefined) findings.push({ severity: 'critical', message: `${tag}: missing amount (maxAmountRequired/amount)` });
    else checkAmount(amount, tag, o, findings);
  });

  if (!hasBlocker(findings)) findings.push({ severity: 'pass', message: 'PaymentRequired carries the core economic fields (scheme, network, asset, payTo, atomic amount)' });
  return { version, offerCount: offers.length, offers, findings };
}

export async function decode402(args: any): Promise<unknown> {
  if (args?.url) {
    const res = await fetch(String(args.url), { method: 'GET' });
    const text = await res.text();
    let body: any;
    try {
      body = JSON.parse(text);
    } catch {
      body = undefined;
    }
    const result = analyze(body, res.status);
    return { source: `GET ${args.url}`, httpStatus: res.status, expected402: res.status === 402, ...result };
  }
  const { value, encoding } = decodePayload(args);
  return { source: `input (${encoding})`, ...analyze(value, undefined) };
}
