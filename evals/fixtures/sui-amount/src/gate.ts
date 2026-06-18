// Sui exact-scheme gate. Price: 0.001 SUI. Fill in `amount` in atomic units (string).
// Pick the correct number of decimals for native SUI.
export const offer = {
  scheme: "exact",
  network: "sui:mainnet",
  asset: "0x2::sui::SUI",
  payTo: process.env.PAY_TO,
  amount: "", // TODO: 0.001 SUI in atomic units
};
