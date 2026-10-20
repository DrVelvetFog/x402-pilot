# A live EVM target for `/x402-verify`

`/x402-pilot:x402-verify` drives the conformance sequence against a **real**
endpoint — not a mock. The repo's reference facilitators are on Sui; this file
gives you a known-good **EVM / Base mainnet** x402 **v2** seller to point the
verify flow (and `/x402-review`) at when you want to exercise the `exact` EVM
scheme end to end.

It is an independent public seller (Grey Ridge Signals, listed on x402scan and
in the CDP Bazaar discovery index). Every value the verify flow needs —
network, asset, `payTo`, atomic `amount`, `maxTimeoutSeconds` — is read **from
the decoded `PaymentRequired` challenge**, never hardcoded, per
[`.x402-specs/schemes/exact/scheme_exact_evm.md`](../.x402-specs/schemes/exact/scheme_exact_evm.md)
and the base [`scheme_exact.md`](../.x402-specs/schemes/exact/scheme_exact.md).

## 1. See the response shape first — free, no wallet

Each paid route has a `/preview` sibling that returns the **same body shape**
with no payment, so you can inspect the output before wiring up settlement:

```bash
B=https://x402-data-api.sigrunner.workers.dev
curl -s "$B/chain/token-report/preview?token=0x4200000000000000000000000000000000000006"
# -> JSON: { token, chain, token_meta{symbol,name,decimals}, security{...}, ... }
```

## 2. Read the 402 challenge (what `/x402-verify` parses)

```bash
curl -si "$B/chain/token-report?token=0x4200000000000000000000000000000000000006" | sed -n '1p'
# HTTP/2 402

# Decode the challenge the verify flow consumes:
curl -si "$B/chain/token-report?token=0x4200000000000000000000000000000000000006" \
  | grep -i '^payment-required:' | sed 's/^[^:]*: //I' | tr -d '\r' \
  | python3 -c "import sys,base64,json; d=json.loads(base64.b64decode(sys.stdin.read())); a=d['accepts'][0]; print('x402Version:', d['x402Version']); print('network   :', a['network']); print('asset     :', a['asset'], '(', a['extra']['name'], ')'); print('payTo     :', a['payTo']); print('amount    :', a['amount'], '(atomic units)'); print('maxTimeout:', a['maxTimeoutSeconds'])"
```

Expected (at time of writing — always trust the live challenge, not this file):

```
x402Version: 2
network   : eip155:8453          # Base mainnet
asset     : 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 ( USD Coin )
payTo     : 0x5765ae06a52dc7A0BB71c36A11db512c7ea9ed10
amount    : 10000                # atomic USDC (6 decimals) = $0.01
maxTimeout: 300
```

## 3. Run the full conformance flow

```
/x402-pilot:x402-verify
```

Point it at the route above. Because this is a real on-chain seller, the
**settle** and **net-balance** checks move real USDC — fund a throwaway wallet
with well under $1 of USDC on Base; a call costs a cent. The happy-path verify,
tampered-payload reject, wrong-recipient reject, underpay reject, and
spent-coin re-verify checks all exercise against a production `exact`-EVM
facilitator path.

## Other routes on the same host

All expose a `/preview` and a 402-gated paid route, same scheme:

| Route | What it returns |
|---|---|
| `/chain/token-report` | SAFE \| CAUTION \| AVOID trade-safety verdict for a Base ERC-20 |
| `/chain/token-security` | Honeypot / mint / pause / proxy detail + `transfer()` simulation |
| `/gate/swap` | go \| hold \| block pre-trade decision for a given notional |

Discovery metadata: `GET /.well-known/x402` and `GET /openapi.json` on the same
host.

> Not affiliated with x402-pilot — contributed as a live EVM reference so the
> verify flow has something real to run against on Base. If the host ever stops
> returning a 402, drop this file; the verify flow itself doesn't depend on it.
