// Pay a 402 offer. The offer (PaymentRequirements) is passed in.
// The current code hardcodes the asset and network — fix it to read from the offer.
export function buildPayment(offer: {
  scheme: string;
  network: string;
  asset: string;
  amount: string;
  payTo: string;
}) {
  const network = "eip155:8453";
  const asset = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  return { scheme: "exact", network, asset, amount: offer.amount, payTo: offer.payTo };
}
