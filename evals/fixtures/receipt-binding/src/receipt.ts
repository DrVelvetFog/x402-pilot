// Bind an x402 settlement to a signed execution receipt so a third party can
// recompute the link OFFLINE, with no trust in our logs. Implement `bindReceipt`.
export interface Settlement {
  txDigest: string;
  payTo: string;
  amount: string; // atomic-integer string
  decimals: number;
  asset: string;
}
export interface Action {
  agentId: string;
  actionType: string;
  scope: string;
  seq: number;
  terminal: boolean;
}

export function bindReceipt(settlement: Settlement, action: Action): unknown {
  // TODO: produce a binding a third party can recompute offline from these bytes alone.
  throw new Error("not implemented");
}
