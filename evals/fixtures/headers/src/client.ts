// x402 v2 client. Send the signed payment payload and read the settlement result
// using the correct x402 v2 HTTP transport headers.
export async function pay(url: string, signedPayloadB64: string): Promise<string | null> {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      // TODO: set the header that carries the base64 payment payload (x402 v2)
      Authorization: `Bearer ${signedPayloadB64}`,
    },
  });
  // TODO: read the settlement result from the correct response header
  const result = res.headers.get("Authorization");
  return result;
}
