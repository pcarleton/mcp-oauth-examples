#!/usr/bin/env node
import { serve } from '@hono/node-server';
import { createResourceServer } from '../shared/mcp-server.js';

const PORT = 3001;

// For local dev, we'll run without auth for simplicity
const app = createResourceServer({
  authRequired: false,
  metadataLocation: '/.well-known/oauth-protected-resource-abc123',
  includeWwwAuthenticate: true
});

serve({
  fetch: app.fetch,
  port: PORT,
}, (info) => {
  console.log(`✅ Resource Server (no auth) running at: http://localhost:${PORT}`);
  console.log('\nEndpoints:');
  console.log(`  MCP: http://localhost:${PORT}/mcp`);
  console.log(`  Health: http://localhost:${PORT}/health`);
  console.log('\nTest with:');
  console.log(`  curl -X POST http://localhost:${PORT}/mcp \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"0.1.0"},"id":1}'`);
});