/**
 * MCP server entrypoint for the x402 conformance tools. Stdio transport.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';
import { info, error } from './logger.js';

async function main(): Promise<void> {
  info('Starting x402-conformance MCP server');
  const server = createServer();

  const cleanup = async (): Promise<void> => {
    info('Shutting down x402-conformance MCP server');
    process.exit(0);
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  info('x402-conformance MCP server started');
}

process.on('unhandledRejection', (reason) => {
  error('Unhandled promise rejection', { reason: String(reason) });
  process.exit(1);
});
process.on('uncaughtException', (err) => {
  error('Uncaught exception', { error: (err as Error).message });
  process.exit(1);
});

main().catch((err) => {
  error('Main failed', { error: (err as Error).message });
  process.exit(1);
});
