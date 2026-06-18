// Build the PaymentRequired for a $0.01 USDC charge on Base.
// USDC has 6 decimals. Fill in `amount` (atomic token units, string, per x402 v2).
export const paymentRequired = {
  x402Version: 2,
  accepts: [
    {
      scheme: "exact",
      network: "eip155:8453",
      asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
      payTo: process.env.PAY_TO,
      amount: "", // TODO: 0.01 USDC in atomic units
      maxTimeoutSeconds: 60,
    },
  ],
};
