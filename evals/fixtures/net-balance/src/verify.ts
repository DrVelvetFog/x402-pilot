// Verify the payment moved `expectedAmount` of `asset` to `payTo`.
// `tx.balanceChanges` is available: Array<{ owner, coinType, amount }> (atomic, signed).
// The current approach parses transaction outputs — which is wrong on rails where
// "the transaction" and "what moved" differ (gas, change outputs).
export function assertPaid(tx: any, payTo: string, asset: string, expectedAmount: bigint): boolean {
  // TODO: assert value/recipient from the NET BALANCE CHANGE to payTo, not by parsing outputs.
  const out = tx.outputs[0];
  return out.recipient === payTo && BigInt(out.value) === expectedAmount;
}
