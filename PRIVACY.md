# Privacy Policy — x402-pilot

_Last updated: 2026-06-18_

x402-pilot is a developer-assistant plugin for Claude Code. It is designed to
collect nothing.

## What it collects

**No personal data.** x402-pilot has no accounts, no analytics, no telemetry, and
does not phone home. It does not read, store, or transmit your code, files, prompts,
or any identifying information to UIG Studios or any third party.

## What runs locally

- The **bundled spec corpus** (`.x402-specs/`, `.x402-docs/`, `.x402-sdk-docs/`) is
  static documentation searched on your machine. Nothing about your searches leaves
  the machine.
- The **conformance MCP** holds **no keys and signs nothing** (non-custodial). Its
  tools are either fully local (`check_compliance`, `lint_scheme_spec`,
  `validate_extension`, and decoding an inline 402 / PAYMENT-RESPONSE) or make
  outbound network requests **only to URLs you explicitly provide** — for example a
  facilitator URL passed to `run_conformance`, or a chain RPC URL passed to
  `inspect_payment_response`. Those requests go directly from your machine to the
  endpoint you named; x402-pilot does not proxy, log, or retain them.

## Third parties

x402-pilot integrates no third-party analytics or tracking. Any network endpoint it
contacts is one you supplied; that endpoint's own privacy practices apply to it.

## Changes

Material changes to this policy will be reflected in this file in the repository,
with an updated date above.

## Contact

Questions: tjagodka@gmail.com (UIG Studios LLC).
