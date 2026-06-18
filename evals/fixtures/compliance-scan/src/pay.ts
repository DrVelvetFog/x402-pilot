// Resource server: build the PaymentRequired for a paid endpoint on Sui.
// (This integration has correctness bugs — they are the point of the exercise.)

const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const DECIMALS = 6;

export function priceRequest(priceHuman: number) {
  // charge `priceHuman` of the native asset on Sui mainnet
  const atomic = String(Math.round(priceHuman * 10 ** DECIMALS));
  return {
    x402Version: 2,
    accepts: [
      {
        scheme: "exact",
        network: "sui:mainnet",
        asset: USDC_BASE,
        payTo: process.env.PAY_TO,
        amount: "0.50",
        atomicAmount: atomic,
        maxTimeoutSeconds: 60,
      },
    ],
  };
}
