/**
 * inspect_payment_response — decode and validate an x402 PAYMENT-RESPONSE, and
 * optionally confirm it against the ledger (net balance change to payTo). The
 * on-chain check is the #2648 "recomputed, not trust-the-operator" property.
 * For Sui networks it queries the RPC directly; for any chain it accepts a
 * caller-supplied balanceChanges array. No secrets.
 */
import { decodePayload, Finding, hasBlocker, netBalanceCheck } from '../lib.js';

async function suiNetBalance(rpcUrl: string, digest: string, payTo: string, asset: string, expected: string | number | undefined, findings: Finding[]): Promise<unknown> {
  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'sui_getTransactionBlock',
    params: [digest, { showBalanceChanges: true, showEffects: true }],
  };
  const res = await fetch(rpcUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const json: any = await res.json();
  if (json?.error) {
    findings.push({ severity: 'high', message: `Sui RPC error: ${JSON.stringify(json.error)}` });
    return { rpcError: json.error };
  }
  const bc = json?.result?.balanceChanges ?? [];
  const status = json?.result?.effects?.status?.status;
  return netBalanceCheck(bc, payTo, asset, expected, findings, status);
}

export async function inspectPaymentResponse(args: any): Promise<unknown> {
  const { value, encoding } = decodePayload(args);
  const pr = value;
  const findings: Finding[] = [];

  const success = pr?.success ?? pr?.isValid;
  const settlementId = pr?.transaction ?? pr?.txDigest ?? pr?.txHash ?? pr?.settlementId;
  const payer = pr?.payer;
  const network = pr?.network;
  const amount = pr?.amount;

  if (success === undefined) findings.push({ severity: 'high', message: 'no success/isValid field' });
  else if (success === false) findings.push({ severity: 'high', message: 'response reports success=false' });
  if (!settlementId) findings.push({ severity: 'critical', message: 'no settlement identifier (transaction/txDigest/settlementId) — cannot bind to the on-chain effect' });
  if (typeof amount === 'string' && amount.includes('.')) findings.push({ severity: 'critical', message: `amount "${amount}" is a human decimal; expected an atomic-integer string` });

  let onChain: unknown;
  if (args?.observedBalanceChanges && args?.expectedPayTo) {
    onChain = netBalanceCheck(args.observedBalanceChanges, args.expectedPayTo, args.expectedAsset, args.expectedAmount ?? amount, findings);
  } else if (args?.rpcUrl && settlementId && args?.expectedPayTo && typeof network === 'string' && network.startsWith('sui')) {
    onChain = await suiNetBalance(args.rpcUrl, settlementId, args.expectedPayTo, args.expectedAsset ?? '0x2::sui::SUI', args.expectedAmount ?? amount, findings);
  } else if (args?.expectedPayTo) {
    findings.push({ severity: 'info', message: 'on-chain check skipped: supply `rpcUrl` for a sui:* network, or `observedBalanceChanges` for any chain, to recompute net-to-payTo' });
  }

  if (!hasBlocker(findings)) findings.push({ severity: 'pass', message: 'PAYMENT-RESPONSE has a settlement id and success flag' });
  return { encoding, success, settlementId, payer, network, amount, onChain, findings };
}
