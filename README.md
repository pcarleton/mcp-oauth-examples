# MCP OAuth Examples for Val Town

Example MCP (Model Context Protocol) servers demonstrating OAuth 2.0 authentication patterns, designed for Val Town deployment using Deno.

## Overview

This project provides working examples of MCP servers with OAuth 2.0 authentication that can be:
- Run locally with Deno for development
- Deployed directly to Val Town for production use
- Tested with real MCP clients that support OAuth 2.0

## Examples

### Example 1: Random PRM Location
- **Resource Server**: Protected Resource Metadata at `/.well-known/oauth-protected-resource-abc123`
- **Auth Server**: Standard OAuth metadata at `/.well-known/oauth-authorization-server`
- **Use Case**: Demonstrates non-standard metadata location with WWW-Authenticate header
- **Ports (local)**: RS on 3001, AS on 3002

### Example 2: Path-Aware PRM Location  
- **Resource Server**: Tenant-specific metadata at `/.well-known/oauth-protected-resource/tenant1`
- **Auth Server**: Issuer with path `/tenant1`, metadata at `/.well-known/oauth-authorization-server/tenant1`
- **Use Case**: Shows multi-tenant OAuth setup with path-based isolation
- **Ports (local)**: RS on 3011, AS on 3012

## Quick Start

### Prerequisites
- [Deno](https://deno.com/) installed
- Val Town account (for deployment)

### Local Development

```bash
# Run Example 1
deno task ex1:rs  # Start resource server on port 3001
deno task ex1:as  # Start auth server on port 3002 (in another terminal)

# Run Example 2
deno task ex2:rs  # Start resource server on port 3011
deno task ex2:as  # Start auth server on port 3012 (in another terminal)

# Test the servers
deno task test:ex1  # Test Example 1
deno task test:ex2  # Test Example 2
```

### Deploy to Val Town

#### Using Val Town CLI

1. Install the Val Town CLI via Deno:
   ```bash
   deno install --global --force --reload --allow-read --allow-write --allow-env --allow-net jsr:@valtown/vt
   ```

2. Authenticate with Val Town:
   ```bash
   vt auth
   ```

3. Create and deploy vals:
   ```bash
   cd src
   
   # Create val directories (use hyphens for domain-friendly names)
   vt create mcp-oauth-ex1-rs --no-editor-files
   vt create mcp-oauth-ex1-as --no-editor-files
   vt create mcp-oauth-ex2-rs --no-editor-files
   vt create mcp-oauth-ex2-as --no-editor-files
   
   # Copy example files as index.ts
   cp examples/example1-rs.ts mcp-oauth-ex1-rs/index.ts
   cp examples/example1-as.ts mcp-oauth-ex1-as/index.ts
   cp examples/example2-rs.ts mcp-oauth-ex2-rs/index.ts
   cp examples/example2-as.ts mcp-oauth-ex2-as/index.ts
   
   # Push each val
   cd mcp-oauth-ex1-rs && vt push && cd ..
   cd mcp-oauth-ex1-as && vt push && cd ..
   cd mcp-oauth-ex2-rs && vt push && cd ..
   cd mcp-oauth-ex2-as && vt push && cd ..
   ```

4. Update AUTH_SERVER_URL in resource server vals to point to your deployed auth server

#### Manual Deployment

1. Copy the content of any example file (e.g., `src/examples/example1-rs.ts`)
2. Create a new HTTP val in Val Town web interface
3. Paste the code
4. Deploy and note the URL
5. Update the corresponding server's AUTH_SERVER_URL if needed

## Testing with cURL

### Test without authentication (should return 401):
```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"0.1.0","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}},"id":1}'
```

### Test with authentication (should work):
```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test_access_token_abc" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"0.1.0","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}},"id":1}'
```

### List available tools:
```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test_access_token_abc" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":2}'
```

### Call the add tool:
```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test_access_token_abc" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"add","arguments":{"a":5,"b":3}},"id":3}'
```

### Test metadata endpoints:
```bash
# Resource server metadata (Example 1)
curl http://localhost:3001/.well-known/oauth-protected-resource-abc123

# Auth server metadata (Example 1)
curl http://localhost:3002/.well-known/oauth-authorization-server

# Resource server metadata (Example 2)
curl http://localhost:3011/.well-known/oauth-protected-resource/tenant1

# Auth server metadata (Example 2)
curl http://localhost:3012/.well-known/oauth-authorization-server/tenant1
```

For Val Town deployments, replace `localhost:PORT` with your Val Town URL (e.g., `https://username-mcp-oauth-ex1-rs.web.val.run`)

## OAuth Flow

1. Client requests MCP endpoint without authentication
2. Server returns 401 with `WWW-Authenticate` header
3. Client fetches Protected Resource Metadata
4. Client fetches Authorization Server Metadata
5. Client performs OAuth authorization flow with PKCE
6. Client receives access token
7. Client retries MCP request with Bearer token

## Test Credentials

All examples use fixed test credentials:
- **Access Token**: `test_access_token_abc`
- **Refresh Token**: `test_refresh_token_xyz`
- **Client ID**: `test_client_id`
- **Authorization Code**: `test_auth_code_123`

## Available MCP Tool

Each server provides a simple `add` tool:
```json
{
  "name": "add",
  "description": "Add two numbers together",
  "arguments": {"a": 5, "b": 3}
}
```

## Project Structure

```
mcp-oauth-examples/
├── src/
│   ├── examples/          # Source files for examples
│   │   ├── example1-rs.ts  # Example 1 Resource Server
│   │   ├── example1-as.ts  # Example 1 Auth Server
│   │   ├── example2-rs.ts  # Example 2 Resource Server
│   │   └── example2-as.ts  # Example 2 Auth Server
│   └── mcp-oauth-*/       # Val Town deployment directories (created by vt CLI)
│       └── index.ts       # Deployed val code
├── deno.json              # Deno configuration and tasks
├── deno.lock             # Deno lock file
└── README.md             # This file
```

## Troubleshooting

### Val Town CLI Issues

- If `vt` command is not found, make sure `/Users/[username]/.deno/bin` is in your PATH
- If you get "Token does not have the required permissions", run `vt auth` to re-authenticate
- Use `--no-editor-files` flag to avoid creating unnecessary Deno config files in val directories
- Use hyphens instead of underscores in val names for cleaner URLs

### MCP Testing

- Always include `Accept: application/json, text/event-stream` header for MCP requests
- The server returns event-stream format responses for MCP protocol
- Check that both resource server and auth server are running for OAuth flow testing

## License

MIT