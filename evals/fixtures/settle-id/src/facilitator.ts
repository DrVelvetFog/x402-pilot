// After executing settlement, build the PAYMENT-RESPONSE.
// `intent` is the client's signed pre-execution intent.
// `execute()` actually settles on chain and returns the executed result.
export async function settle(
  intent: { id: string },
  execute: () => Promise<{ digest: string; status: string }>,
): Promise<{ success: boolean; transaction: string; network: string }> {
  const settled = await execute();
  return {
    success: true,
    // TODO: `transaction` must identify what actually settled on chain.
    transaction: intent.id,
    network: "sui:testnet",
  };
}
