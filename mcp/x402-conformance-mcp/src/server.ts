/**
 * MCP server for x402 conformance + compliance. Six tools, none of which hold keys:
 *   decode_402, inspect_payment_response, check_compliance,
 *   lint_scheme_spec, validate_extension, run_conformance
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { error } from './logger.js';
import { decode402 } from './tools/decode402.js';
import { inspectPaymentResponse } from './tools/paymentResponse.js';
import { checkCompliance } from './tools/checkCompliance.js';
import { lintSchemeSpec } from './tools/lintScheme.js';
import { validateExtension } from './tools/validateExtension.js';
import { runConformance } from './tools/runConformance.js';

const TOOL_DEFINITIONS = [
  {
    name: 'decode_402',
    description:
      'Parse and validate an x402 PaymentRequired (HTTP 402) response and explain every field. Flags missing economic fields (scheme/network/asset/payTo/amount), number-typed or human-decimal amounts (must be atomic-integer strings), and missing explicit decimals. Provide ONE of: `url` (does an unpaid GET and decodes the 402), `raw` (a JSON or base64-encoded-JSON body string), or `json` (an object). Deterministic; the only network is the optional unpaid GET.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Resource URL to GET unpaid; expects a 402 with a PaymentRequired body.' },
        raw: { type: 'string', description: 'A PaymentRequired as a JSON string or base64-encoded JSON.' },
        json: { type: 'object', description: 'A PaymentRequired as an object.' },
      },
    },
  },
  {
    name: 'inspect_payment_response',
    description:
      'Decode and validate an x402 PAYMENT-RESPONSE, surfacing success, settlement id, payer, network, and amount. Optionally recomputes the on-chain truth: pass `rpcUrl` + `expectedPayTo` for a sui:* network (queries sui_getTransactionBlock balanceChanges), or `observedBalanceChanges` + `expectedPayTo` for any chain, and it confirms the net balance change to payTo equals the advertised atomic amount (the "recomputed, not trust-the-operator" check). Provide the response via `raw` (JSON/base64) or `json`.',
    inputSchema: {
      type: 'object',
      properties: {
        raw: { type: 'string', description: 'PAYMENT-RESPONSE as a JSON string or base64-encoded JSON.' },
        json: { type: 'object', description: 'PAYMENT-RESPONSE as an object.' },
        rpcUrl: { type: 'string', description: 'Optional. Chain RPC URL; used for the on-chain net-balance check on sui:* networks.' },
        observedBalanceChanges: { type: 'array', description: 'Optional. A balanceChanges array (any chain) to recompute net-to-payTo from, instead of an RPC call.' },
        expectedPayTo: { type: 'string', description: 'Optional. The recipient address to sum net balance change for.' },
        expectedAsset: { type: 'string', description: 'Optional. Asset/coin type to filter on (defaults to 0x2::sui::SUI for Sui).' },
        expectedAmount: { type: 'string', description: 'Optional. Expected atomic amount; defaults to the response amount.' },
      },
    },
  },
  {
    name: 'check_compliance',
    description:
      'Heuristically scan x402 code (a file or directory) for the high-severity classes: hardcoded chain id, hardcoded decimals, magic-number decimal scaling (10**N, 1eN, *1_000_000), human-decimal/float amounts, and literal asset/token addresses. Returns findings with file:line and severity. Heuristic — a documented default may be a false positive; every finding cites a location for human judgement. No network.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'A file or directory to scan.' },
        maxFiles: { type: 'number', description: 'Cap on files scanned (default 2000).' },
        maxFindings: { type: 'number', description: 'Cap on findings returned (default 300).' },
      },
      required: ['path'],
    },
  },
  {
    name: 'lint_scheme_spec',
    description:
      'Lint a draft scheme spec (markdown) against the bundled scheme_template.md: reports missing/extra template sections and whether the draft pins down the load-bearing concepts a scheme must specify (value/recipient assertion, settlement identifier, replay protection, atomic+decimals amount encoding, verify/settle flow). Reads the bundled corpus; no network.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the draft scheme markdown.' },
        template: { type: 'string', description: 'Optional template path relative to the plugin root (default .x402-specs/scheme_template.md).' },
      },
      required: ['path'],
    },
  },
  {
    name: 'validate_extension',
    description:
      'Structurally validate an x402 extension payload: checks the typed { info, schema } envelope and runs light known-extension field checks (offer-and-receipt, payment_identifier, gas-sponsoring, sign-in-with-x, builder_code). Pass `payload` as a single entry (with `name`), an extensions map keyed by name, or an array. Full JSON-schema validation needs the extension’s published schema; this is the structural gate plus a spec pointer. No network.',
    inputSchema: {
      type: 'object',
      properties: {
        payload: { description: 'An extension entry, an extensions map, or an array of entries.' },
        name: { type: 'string', description: 'Optional extension name when `payload` is a single entry.' },
      },
      required: ['payload'],
    },
  },
  {
    name: 'run_conformance',
    description:
      'Drive the x402 conformance sequence against a facilitator. Holds NO keys: automates the 402 negotiation (with `resourceUrl`), facilitator reachability (GET /supported), and malformed-verify rejection. The keyed steps (verify happy-path, tampered-reject, settle, idempotent re-settle) run ONLY when you supply a pre-signed `paymentPayload` + `paymentRequirements`; settle additionally requires `allowSettle: true` (it settles real testnet value). Assumes the standard facilitator API (POST /verify, POST /settle). Returns a pass/fail/skip line per step.',
    inputSchema: {
      type: 'object',
      properties: {
        facilitatorUrl: { type: 'string', description: 'Base URL of the facilitator (POST /verify, /settle).' },
        resourceUrl: { type: 'string', description: 'Optional. A payment-gated resource URL to test 402 negotiation.' },
        paymentPayload: { type: 'object', description: 'Optional. A pre-signed payment payload (produced by your keyed SDK) to run the happy/tampered paths.' },
        paymentRequirements: { type: 'object', description: 'Optional. The paymentRequirements the payload pays.' },
        allowSettle: { type: 'boolean', description: 'Optional. Must be true to actually settle (settles real testnet value). Default false.' },
      },
      required: ['facilitatorUrl'],
    },
  },
];

type Handler = (args: any) => Promise<unknown>;
const HANDLERS: Record<string, Handler> = {
  decode_402: decode402,
  inspect_payment_response: inspectPaymentResponse,
  check_compliance: checkCompliance,
  lint_scheme_spec: lintSchemeSpec,
  validate_extension: validateExtension,
  run_conformance: runConformance,
};

export function createServer(): Server {
  const server = new Server({ name: 'x402-conformance', version: '0.1.0' }, { capabilities: { tools: {} } });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOL_DEFINITIONS }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    const handler = HANDLERS[name];
    if (!handler) {
      return { content: [{ type: 'text', text: `unknown tool: ${name}` }], isError: true };
    }
    try {
      const result = await handler(args ?? {});
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      error(`tool ${name} failed`, { error: (err as Error).message });
      return { content: [{ type: 'text', text: `error in ${name}: ${(err as Error).message}` }], isError: true };
    }
  });

  return server;
}
