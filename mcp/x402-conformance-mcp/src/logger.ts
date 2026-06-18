/**
 * Logs go to stderr — stdout is the MCP protocol channel and must stay clean.
 */
function ts(): string {
  return new Date().toISOString();
}
function safe(meta: unknown): string {
  if (meta === undefined) return '';
  try {
    return ' ' + JSON.stringify(meta);
  } catch {
    return ' ' + String(meta);
  }
}
export function info(msg: string, meta?: unknown): void {
  process.stderr.write(`[${ts()}] INFO  ${msg}${safe(meta)}\n`);
}
export function error(msg: string, meta?: unknown): void {
  process.stderr.write(`[${ts()}] ERROR ${msg}${safe(meta)}\n`);
}
