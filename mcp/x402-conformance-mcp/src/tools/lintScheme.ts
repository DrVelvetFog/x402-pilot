/**
 * lint_scheme_spec — diff a draft scheme spec against the bundled scheme_template.md
 * (required sections present + in order) and check it specifies the load-bearing
 * concepts a scheme must pin down. Reads the corpus; no network, no secrets.
 */
import { readFileSync } from 'node:fs';
import { Finding, readCorpusFile } from '../lib.js';

function headings(md: string): string[] {
  const out: string[] = [];
  for (const line of md.split('\n')) {
    const m = /^#{1,3}\s+(.+?)\s*$/.exec(line);
    if (m) out.push(m[1]!.replace(/[`*]/g, '').trim().toLowerCase());
  }
  return out;
}

const REQUIRED_CONCEPTS: { label: string; re: RegExp; severity: Finding['severity'] }[] = [
  { label: 'value/recipient assertion', re: /balance\s*change|net\s*balance|asserted?\s*from|verify\b/i, severity: 'high' },
  { label: 'settlement identifier', re: /settlement\s*id|transaction\s*(id|digest|hash)|payment_?hash|txdigest/i, severity: 'high' },
  { label: 'replay protection', re: /replay|nonce|already\s*spent|idempoten|archiv/i, severity: 'high' },
  { label: 'amount encoding (atomic + decimals)', re: /atomic|decimals/i, severity: 'high' },
  { label: 'verify + settle flow', re: /settle/i, severity: 'high' },
];

export async function lintSchemeSpec(args: any): Promise<unknown> {
  const path = String(args?.path ?? '');
  if (!path) throw new Error('`path` is required (the draft scheme markdown to lint)');
  const draft = readFileSync(path, 'utf8');

  const templateRel = args?.template ? String(args.template) : '.x402-specs/scheme_template.md';
  let template: string;
  try {
    template = readCorpusFile(templateRel);
  } catch (e) {
    return { error: `could not read template ${templateRel}: ${(e as Error).message}. Pass \`template\` (path relative to plugin root).` };
  }

  const tHeads = headings(template);
  const dHeads = headings(draft);
  const dSet = new Set(dHeads);

  const findings: Finding[] = [];
  const missing = tHeads.filter((h) => !dSet.has(h) && !dHeads.some((d) => d.includes(h) || h.includes(d)));
  for (const h of missing) findings.push({ severity: 'high', message: `missing template section: "${h}"` });

  for (const c of REQUIRED_CONCEPTS) {
    if (!c.re.test(draft)) findings.push({ severity: c.severity, message: `does not appear to specify: ${c.label}` });
  }

  const extra = dHeads.filter((h) => !tHeads.some((t) => t.includes(h) || h.includes(t)));
  if (extra.length) findings.push({ severity: 'info', message: `sections not in the template (ok if intentional): ${extra.slice(0, 8).join('; ')}` });

  const clean = !findings.some((f) => f.severity === 'high' || f.severity === 'critical');
  if (clean) findings.unshift({ severity: 'pass', message: 'draft covers the template sections and the load-bearing scheme concepts' });
  return {
    draft: path,
    template: templateRel,
    templateSections: tHeads.length,
    draftSections: dHeads.length,
    findings,
  };
}
