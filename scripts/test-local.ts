#!/usr/bin/env node
import { createResourceServer } from '../src/shared/mcp-server.js';
import { MockAuthServer } from '../src/shared/auth-server.js';
import { serve } from '@hono/node-server';

const PORT_RS = 3001;
const PORT_AS = 3002;

console.log('Starting local test servers...\n');

// Start auth server
const authServer = new MockAuthServer('', '/.well-known/oauth-authorization-server');
const authApp = authServer.getApp();

// Start resource server
const rsApp = createResourceServer({
  authRequired: true,
  metadataLocation: '/.well-known/oauth-protected-resource-abc123',
  authServerUrl: `http://localhost:${PORT_AS}`,
  includeWwwAuthenticate: true
});

// Start auth server
serve({
  fetch: authApp.fetch,
  port: PORT_AS,
}, (info) => {
  console.log(`✅ Auth Server running at: http://localhost:${PORT_AS}`);
});

// Start resource server
serve({
  fetch: rsApp.fetch,
  port: PORT_RS,
}, (info) => {
  console.log(`✅ Resource Server running at: http://localhost:${PORT_RS}`);
  console.log('\nEndpoints:');
  console.log(`  Auth Metadata: http://localhost:${PORT_AS}/.well-known/oauth-authorization-server`);
  console.log(`  Resource Metadata: http://localhost:${PORT_RS}/.well-known/oauth-protected-resource-abc123`);
  console.log(`  MCP Endpoint: http://localhost:${PORT_RS}/mcp`);
  console.log('\nPress Ctrl+C to stop the servers.');
});