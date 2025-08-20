#!/usr/bin/env deno run --allow-net --allow-env --allow-read

// Run both servers in the same process for local development
import rsApp from '../src/val-town/example1-rs.ts';
import asApp from '../src/val-town/example1-as.ts';

const RS_PORT = 3001;
const AS_PORT = 3002;

// Set environment variable for RS to find AS
Deno.env.set("EX1_AS_URL", `http://localhost:${AS_PORT}`);

console.log('Starting local MCP OAuth Example servers...\n');

// Start auth server
Deno.serve({ port: AS_PORT }, asApp);
console.log(`✅ Auth Server running at: http://localhost:${AS_PORT}`);

// Start resource server
Deno.serve({ port: RS_PORT }, rsApp);
console.log(`✅ Resource Server running at: http://localhost:${RS_PORT}`);

console.log('\nEndpoints:');
console.log(`  Auth Metadata: http://localhost:${AS_PORT}/.well-known/oauth-authorization-server`);
console.log(`  Resource Metadata: http://localhost:${RS_PORT}/.well-known/oauth-protected-resource-abc123`);
console.log(`  MCP Endpoint: http://localhost:${RS_PORT}/mcp`);

console.log('\nTest commands:');
console.log(`  # Test without auth (should return 401):`);
console.log(`  curl -X POST http://localhost:${RS_PORT}/mcp \\`);
console.log(`    -H "Content-Type: application/json" \\`);
console.log(`    -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"0.1.0"},"id":1}'`);
console.log(`  `);
console.log(`  # Test with auth:`);
console.log(`  curl -X POST http://localhost:${RS_PORT}/mcp \\`);
console.log(`    -H "Content-Type: application/json" \\`);
console.log(`    -H "Authorization: Bearer test_access_token_abc" \\`);
console.log(`    -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"0.1.0"},"id":1}'`);