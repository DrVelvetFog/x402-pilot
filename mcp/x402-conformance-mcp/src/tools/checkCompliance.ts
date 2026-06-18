/**
 * check_compliance — heuristic static scan of x402 code for the high-severity
 * classes: hardcoded chain id / token-asset address / decimals, magic-number
 * scaling, and human-decimal amounts. Deterministic, no network, no secrets.
 * Heuristics can false-positive; every finding cites file:line so a human can judge.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { Finding } from '../lib.js';

const TEXT_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.go', '.java', '.rs', '.move', '.json']);
const SKIP_DIR = new Set(['node_modules', 'dist', 'build', '.git', '.next', 'vendor', '__pycache__', 'coverage']);

interface Rule {
  re: RegExp;
  severity: Finding['severity'];
  why: string;
}

const RULES: Rule[] = [
  { re: /\b(chain_?id)\s*[:=]\s*['"]?\d+/i, severity: 'high', why: 'hardcoded chain id — read it from PaymentRequired/config, not a literal' },
  { re: /['"]eip155:\d+['"]/, severity: 'high', why: 'hardcoded CAIP-2 chain reference — derive it from the offer/network, not a literal' },
  { re: /\b(decimals?)\s*[:=]\s*\d{1,2}\b/i, severity: 'high', why: 'hardcoded decimals — assets differ (SUI=9, USDC=6, ETH=18); read from the asset/config' },
  { re: /(?:\*|\/)\s*1e\d+/, severity: 'high', why: 'magic-number decimal scaling (1eN) — derive the scale from the asset decimals' },
  { re: /10\s*\*\*\s*\d+/, severity: 'high', why: 'magic-number decimal scaling (10 ** N) — derive the scale from the asset decimals' },
  { re: /(?:\*|\/)\s*1_?000_?000\b/, severity: 'high', why: 'magic-number scaling by a million — looks like a hardcoded 6-decimals assumption' },
  { re: /\b(amount|price|value)\b[^\n]{0,40}['"]\d+\.\d+['"]/i, severity: 'critical', why: 'human-decimal amount string — x402 amounts must be atomic-integer strings + explicit decimals' },
  { re: /\b(amount|price|value)\s*[:=]\s*\d+\.\d+/i, severity: 'critical', why: 'float amount — x402 amounts must be atomic-integer strings, never floats' },
  { re: /['"]0x[0-9a-fA-F]{40}['"]/, severity: 'info', why: 'literal EVM address — fine if it is a documented default, but a hardcoded asset/token address should come from config' },
  { re: /['"]0x[0-9a-f]{1,64}::[a-z_]+::[A-Za-z][A-Za-z0-9_]*['"]/, severity: 'info', why: 'literal Move/Sui coin type — fine as a default, but a hardcoded asset should come from config' },
];

function walk(path: string, acc: string[], cap: number): void {
  if (acc.length >= cap) return;
  let st;
  try {
    st = statSync(path);
  } catch {
    return;
  }
  if (st.isDirectory()) {
    for (const name of readdirSync(path)) {
      if (SKIP_DIR.has(name)) continue;
      walk(join(path, name), acc, cap);
      if (acc.length >= cap) return;
    }
  } else if (TEXT_EXT.has(extname(path))) {
    acc.push(path);
  }
}

export async function checkCompliance(args: any): Promise<unknown> {
  const root = String(args?.path ?? '');
  if (!root) throw new Error('`path` is required (a file or directory to scan)');
  const fileCap = Number(args?.maxFiles ?? 2000);
  const findingCap = Number(args?.maxFindings ?? 300);

  const files: string[] = [];
  walk(root, files, fileCap);

  const findings: Finding[] = [];
  for (const file of files) {
    if (findings.length >= findingCap) break;
    let lines: string[];
    try {
      lines = readFileSync(file, 'utf8').split('\n');
    } catch {
      continue;
    }
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (/^\s*(\/\/|#|\*)/.test(line)) continue; // skip obvious comment lines
      for (const rule of RULES) {
        if (rule.re.test(line)) {
          findings.push({ severity: rule.severity, message: rule.why, where: `${relative(process.cwd(), file)}:${i + 1}` });
          break;
        }
      }
      if (findings.length >= findingCap) break;
    }
  }

  const counts = { critical: 0, high: 0, info: 0 } as Record<string, number>;
  for (const f of findings) counts[f.severity] = (counts[f.severity] ?? 0) + 1;
  const clean = findings.length === 0;
  return {
    scanned: { path: root, files: files.length },
    counts,
    clean,
    note: 'Heuristic scan — findings cite file:line for human judgement. A literal that is a documented default (not a payment parameter) may be a false positive.',
    findings: clean ? [{ severity: 'pass', message: 'no hardcoded chain/token/decimals or human-decimal amount patterns found' }] : findings,
  };
}
