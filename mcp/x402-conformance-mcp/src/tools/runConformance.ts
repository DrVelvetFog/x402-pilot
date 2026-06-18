/**
 * run_conformance — drive the x402 conformance sequence against a facilitator.
 *
 * This MCP holds NO keys. It automates every check that doesn't require signing:
 * the 402 negotiation, facilitator reachability, and malformed-payload rejection.
 * The happy path (verify/settle/idempotency/tampered) is orchestrated ONLY when the
 * caller supplies a pre-signed `paymentPayload` + `paymentRequirements`; otherwise
 * those steps are reported as "skip" with the reason. Assumes the standard x402
 * facilitator API: POST /verify and POST /settle with { paymentPayload, paymentRequirements }.
 */
type StepStatus = 'pass' | 'fail' | 'skip';
interface Step {
  name: string;
  status: StepStatus;
  detail: string;
}

async function postJson(url: string, body: unknown): Promise<{ ok: boolean; status: number; json: any; text: string }> {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  return { ok: res.ok, status: res.status, json, text };
}

function deepMutate(payload: any): any {
  const clone = JSON.parse(JSON.stringify(payload));
  // flip one byte of the first string we find that looks like a signature/digest/amount
  const visit = (o: any): boolean => {
    if (o && typeof o === 'object') {
      for (const k of Object.keys(o)) {
        const v = o[k];
        if (typeof v === 'string' && v.length >= 8) {
          const arr = v.split('');
          arr[arr.length - 1] = arr[arr.length - 1] === '0' ? '1' : '0';
          o[k] = arr.join('');
          return true;
        }
        if (typeof v === 'object' && visit(v)) return true;
      }
    }
    return false;
  };
  visit(clone);
  return clone;
}

export async function runConformance(args: any): Promise<unknown> {
  const facilitatorUrl = String(args?.facilitatorUrl ?? '').replace(/\/+$/, '');
  if (!facilitatorUrl) throw new Error('`facilitatorUrl` is required');
  const steps: Step[] = [];

  // 1. Negotiation: GET the resource (unpaid) and expect a well-formed 402.
  if (args?.resourceUrl) {
    try {
      const res = await fetch(String(args.resourceUrl), { method: 'GET' });
      const text = await res.text();
      let body: any;
      try {
        body = JSON.parse(text);
      } catch {
        /* ignore */
      }
      const offers = body?.accepts ?? body?.paymentRequirements;
      if (res.status === 402 && offers) steps.push({ name: 'negotiation_402', status: 'pass', detail: `resource returned 402 with ${Array.isArray(offers) ? offers.length : 1} offer(s)` });
      else steps.push({ name: 'negotiation_402', status: 'fail', detail: `expected 402 + offers, got HTTP ${res.status}` });
    } catch (e) {
      steps.push({ name: 'negotiation_402', status: 'fail', detail: `GET resource failed: ${(e as Error).message}` });
    }
  } else {
    steps.push({ name: 'negotiation_402', status: 'skip', detail: 'no resourceUrl supplied' });
  }

  // 2. Facilitator reachability (GET /supported is the common discovery endpoint).
  try {
    const res = await fetch(`${facilitatorUrl}/supported`, { method: 'GET' });
    steps.push({ name: 'facilitator_reachable', status: res.ok ? 'pass' : 'fail', detail: `GET /supported → HTTP ${res.status}` });
  } catch (e) {
    steps.push({ name: 'facilitator_reachable', status: 'fail', detail: `GET /supported failed: ${(e as Error).message}` });
  }

  // 3. Malformed verify must be rejected (no keys needed — garbage in, rejection out).
  try {
    const r = await postJson(`${facilitatorUrl}/verify`, { paymentPayload: {}, paymentRequirements: {} });
    const rejected = !r.ok || r.json?.isValid === false || r.json?.valid === false;
    steps.push({ name: 'malformed_verify_rejected', status: rejected ? 'pass' : 'fail', detail: rejected ? `rejected (HTTP ${r.status}${r.json?.invalidReason ? ', ' + r.json.invalidReason : ''})` : `accepted a malformed payload (HTTP ${r.status}) — should reject` });
  } catch (e) {
    steps.push({ name: 'malformed_verify_rejected', status: 'fail', detail: `POST /verify failed: ${(e as Error).message}` });
  }

  // 4–7. Keyed paths — only if the caller supplies a pre-signed payload.
  const payload = args?.paymentPayload;
  const reqs = args?.paymentRequirements;
  if (payload && reqs) {
    // 4. verify happy-path
    let verifiedOk = false;
    try {
      const r = await postJson(`${facilitatorUrl}/verify`, { paymentPayload: payload, paymentRequirements: reqs });
      verifiedOk = r.ok && (r.json?.isValid === true || r.json?.valid === true);
      steps.push({ name: 'verify_happy_path', status: verifiedOk ? 'pass' : 'fail', detail: verifiedOk ? 'valid payload verified' : `not verified (HTTP ${r.status}${r.json?.invalidReason ? ', ' + r.json.invalidReason : ''})` });
    } catch (e) {
      steps.push({ name: 'verify_happy_path', status: 'fail', detail: `${(e as Error).message}` });
    }

    // 5. tampered payload rejected
    try {
      const r = await postJson(`${facilitatorUrl}/verify`, { paymentPayload: deepMutate(payload), paymentRequirements: reqs });
      const rejected = !r.ok || r.json?.isValid === false || r.json?.valid === false;
      steps.push({ name: 'tampered_verify_rejected', status: rejected ? 'pass' : 'fail', detail: rejected ? 'tampered payload rejected' : 'tampered payload accepted — should reject' });
    } catch (e) {
      steps.push({ name: 'tampered_verify_rejected', status: 'fail', detail: `${(e as Error).message}` });
    }

    // 6 + 7. settle + idempotent re-settle (only if explicitly allowed — settles real value)
    if (args?.allowSettle === true) {
      let firstId: string | undefined;
      try {
        const r = await postJson(`${facilitatorUrl}/settle`, { paymentPayload: payload, paymentRequirements: reqs });
        firstId = r.json?.transaction ?? r.json?.txDigest ?? r.json?.settlementId;
        const ok = r.ok && r.json?.success !== false && !!firstId;
        steps.push({ name: 'settle', status: ok ? 'pass' : 'fail', detail: ok ? `settled → ${firstId}` : `settle failed (HTTP ${r.status})` });
      } catch (e) {
        steps.push({ name: 'settle', status: 'fail', detail: `${(e as Error).message}` });
      }
      try {
        const r = await postJson(`${facilitatorUrl}/settle`, { paymentPayload: payload, paymentRequirements: reqs });
        const id2 = r.json?.transaction ?? r.json?.txDigest ?? r.json?.settlementId;
        const idempotent = r.ok && r.json?.success !== false && !!id2 && id2 === firstId;
        steps.push({ name: 'idempotent_resettle', status: idempotent ? 'pass' : 'fail', detail: idempotent ? `re-settle returned the same id (${id2}) with no error` : `re-settle id=${id2} firstId=${firstId} — not idempotent` });
      } catch (e) {
        steps.push({ name: 'idempotent_resettle', status: 'fail', detail: `${(e as Error).message}` });
      }
    } else {
      steps.push({ name: 'settle', status: 'skip', detail: 'pass allowSettle=true to settle real (testnet) value' });
      steps.push({ name: 'idempotent_resettle', status: 'skip', detail: 'requires settle (allowSettle=true)' });
    }
  } else {
    for (const n of ['verify_happy_path', 'tampered_verify_rejected', 'settle', 'idempotent_resettle']) {
      steps.push({ name: n, status: 'skip', detail: 'no signed paymentPayload supplied — this MCP holds no keys; produce a payload with your keyed SDK and pass it as `paymentPayload` + `paymentRequirements`' });
    }
  }

  const summary = {
    pass: steps.filter((s) => s.status === 'pass').length,
    fail: steps.filter((s) => s.status === 'fail').length,
    skip: steps.filter((s) => s.status === 'skip').length,
  };
  return { facilitatorUrl, summary, overallPass: summary.fail === 0, steps };
}
