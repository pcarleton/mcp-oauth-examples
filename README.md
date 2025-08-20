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

### Example 2: Path-Aware PRM Location  
- **Resource Server**: Tenant-specific metadata at `/.well-known/oauth-protected-resource/tenant1`
- **Auth Server**: Issuer with path `/tenant1`, metadata at `/.well-known/oauth-authorization-server/tenant1`
- **Use Case**: Shows multi-tenant OAuth setup with path-based isolation

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

1. Copy the content of any example file (e.g., `src/examples/example1-rs.ts`)
2. Create a new HTTP val in Val Town
3. Paste the code
4. Deploy and note the URL
5. Update the corresponding server's AUTH_SERVER_URL if needed

## Testing with MCP Clients

### Test without authentication (should return 401):
```bash
curl -X POST https://your-val.web.val.run/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"0.1.0","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}},"id":1}'
```

### Test with authentication:
```bash
curl -X POST https://your-val.web.val.run/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test_access_token_abc" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}'
```

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
│   └── examples/
│       ├── example1-rs.ts  # Example 1 Resource Server
│       ├── example1-as.ts  # Example 1 Auth Server
│       ├── example2-rs.ts  # Example 2 Resource Server
│       └── example2-as.ts  # Example 2 Auth Server
├── deno.json               # Deno configuration and tasks
└── README.md               # This file
```

## License

MIT