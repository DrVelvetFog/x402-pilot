import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const pluginRoot = resolve(process.cwd(), '../..'); // x402-pilot/
const transport = new StdioClientTransport({
  command: 'node',
  args: ['dist/index.js'],
  env: { ...process.env, CLAUDE_PLUGIN_ROOT: pluginRoot },
});
const client = new Client({ name: 'smoke', version: '0' }, { capabilities: {} });
await client.connect(transport);

const parse = (r) => JSON.parse(r.content[0].text);
let failures = 0;
const check = (label, cond, extra = '') => {
  console.log(`  ${cond ? '✓' : '✗ FAIL'} ${label}${extra ? ' — ' + extra : ''}`);
  if (!cond) failures++;
};

// 0. tools/list
const { tools } = await client.listTools();
console.log(`\n[tools] ${tools.map((t) => t.name).join(', ')}`);
check('6 tools registered', tools.length === 6, `${tools.length}`);

// 1. decode_402 — human-decimal amount must be flagged critical
console.log('\n[decode_402] PaymentRequired with a human-decimal amount');
const d = parse(
  await client.callTool({
    name: 'decode_402',
    arguments: { json: { x402Version: 1, accepts: [{ scheme: 'exact', network: 'sui:testnet', asset: '0x2::sui::SUI', payTo: '0xabc', maxAmountRequired: '0.001' }] } },
  }),
);
check('flags human-decimal amount as critical', d.findings.some((f) => f.severity === 'critical' && /human decimal/i.test(f.message)));

// 1b. decode_402 — clean atomic amount passes
const d2 = parse(
  await client.callTool({
    name: 'decode_402',
    arguments: { json: { x402Version: 1, accepts: [{ scheme: 'exact', network: 'sui:testnet', asset: '0x2::sui::SUI', payTo: '0xabc', maxAmountRequired: '1000000', extra: { decimals: 9 } }] } },
  }),
);
check('clean atomic PaymentRequired passes', d2.findings.some((f) => f.severity === 'pass'));

// 2. inspect_payment_response — the live #2648 settlement, recomputed from on-chain balanceChanges
console.log('\n[inspect_payment_response] live #2648 settlement + on-chain balanceChanges');
const ip = parse(
  await client.callTool({
    name: 'inspect_payment_response',
    arguments: {
      json: { success: true, payer: '0x614a0c94465bcec8d053cfe5252d3435df4eaff391e1e423c6a24acd67793916', transaction: '7eGzqT3xijsWJKw5aJRA8c6EtmB8ZbfXuDfMe4LJsGEW', network: 'sui:testnet', amount: '1000000' },
      observedBalanceChanges: [
        { owner: { AddressOwner: '0x614a0c94465bcec8d053cfe5252d3435df4eaff391e1e423c6a24acd67793916' }, coinType: '0x2::sui::SUI', amount: '-2997880' },
        { owner: { AddressOwner: '0xf0dab0dbd3011967b8a986abe16d0a7e580e408e972b6dc8473532815b898d86' }, coinType: '0x2::sui::SUI', amount: '1000000' },
      ],
      expectedPayTo: '0xf0dab0dbd3011967b8a986abe16d0a7e580e408e972b6dc8473532815b898d86',
      expectedAsset: '0x2::sui::SUI',
      expectedAmount: '1000000',
    },
  }),
);
check('on-chain net-to-payTo matches advertised amount', ip.onChain && ip.onChain.match === true, `net=${ip.onChain?.netToPayTo}`);
check('surfaces settlement id', ip.settlementId === '7eGzqT3xijsWJKw5aJRA8c6EtmB8ZbfXuDfMe4LJsGEW');

// 3. check_compliance — fixture with hardcoded decimals + human-decimal amount
console.log('\n[check_compliance] fixture with hardcoded decimals + float amount');
const dir = mkdtempSync(join(tmpdir(), 'x402c-'));
writeFileSync(join(dir, 'bad.ts'), ['const decimals = 6;', 'const amount = "42.00";', 'const scaled = price * 1e6;', 'const chainId = 8453;'].join('\n'));
const cc = parse(await client.callTool({ name: 'check_compliance', arguments: { path: dir } }));
check('finds hardcoded/float issues', (cc.counts.critical ?? 0) + (cc.counts.high ?? 0) >= 3, JSON.stringify(cc.counts));

// 4. lint_scheme_spec — a real corpus scheme should pass against the template
console.log('\n[lint_scheme_spec] real corpus scheme_exact_sui.md vs template');
const ls = parse(await client.callTool({ name: 'lint_scheme_spec', arguments: { path: join(pluginRoot, '.x402-specs/schemes/exact/scheme_exact_sui.md') } }));
check('lints a real scheme without throwing', Array.isArray(ls.findings), JSON.stringify({ templateSections: ls.templateSections, draftSections: ls.draftSections }));

// 5. validate_extension — offer-and-receipt missing signature → high
console.log('\n[validate_extension] offer-and-receipt missing signature');
const ve = parse(await client.callTool({ name: 'validate_extension', arguments: { name: 'offer-and-receipt', payload: { info: { foo: 'bar' } } } }));
check('flags missing signature field', ve.findings.some((f) => f.severity === 'high' && /signature/i.test(f.message)));

await client.close();
console.log(`\n${failures === 0 ? 'ALL SMOKE CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
