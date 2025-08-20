# MCP OAuth Examples

Example MCP (Model Context Protocol) servers demonstrating OAuth 2.0 authentication patterns, designed for deployment on Val Town's serverless platform.

## Overview

This project provides working examples of MCP servers with OAuth 2.0 authentication, showcasing different metadata discovery patterns and authentication flows. Each example consists of:

- **Resource Server (RS)**: An MCP server protected by OAuth 2.0
- **Authorization Server (AS)**: Handles OAuth authorization and token issuance

These examples are designed to help developers understand and test OAuth-protected MCP implementations with real production clients.

## Project Goals

1. **Demonstrate OAuth Patterns**: Show different ways to configure OAuth metadata discovery
2. **Test Client Compatibility**: Provide endpoints for testing MCP clients with OAuth
3. **Educational Resource**: Help developers understand OAuth 2.0 in the MCP context
4. **Production-Ready Testing**: Allow testing with real clients, not just test harnesses

## Examples

### Example 1: WWW-Authenticate with Random PRM Location

- **Resource Server**: Protected Resource Metadata at `/.well-known/oauth-protected-resource-abc123`
- **Auth Server**: Standard OAuth metadata at `/.well-known/oauth-authorization-server`
- **Pattern**: Demonstrates non-standard metadata location with WWW-Authenticate header

### Example 2: Path-Aware PRM Location

- **Resource Server**: Tenant-specific metadata at `/.well-known/oauth-protected-resource/tenant1`
- **Auth Server**: Issuer with path `/tenant1`, metadata at `/.well-known/oauth-authorization-server/tenant1`
- **Pattern**: Shows multi-tenant OAuth setup with path-based isolation

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Val Town account and API key
- Val Town CLI (`npm install -g @val-town/vt`)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd mcp-oauth-examples

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env and add your Val Town API key
```

### Local Development

```bash
# Test locally (requires @hono/node-server)
npm install --save-dev @hono/node-server
npm run test:local
```

### Deployment to Val Town

```bash
# Set up Val Town CLI
vt auth

# Deploy all examples
npm run deploy

# Or deploy individual examples
npm run deploy:ex1  # Deploy Example 1
npm run deploy:ex2  # Deploy Example 2
```

After deployment, update your `.env` file with the actual Val Town URLs.

## Testing with MCP Clients

### Configure Your MCP Client

For each example, configure your MCP client with:

1. **MCP Endpoint**: `https://[username]-mcp-oauth-ex1-rs.web.val.run/mcp`
2. **OAuth Discovery**: The client should automatically discover OAuth metadata

### OAuth Flow

1. Client requests MCP endpoint without authentication
2. Server returns 401 with WWW-Authenticate header pointing to metadata
3. Client fetches Protected Resource Metadata
4. Client fetches Authorization Server Metadata
5. Client initiates OAuth authorization flow
6. After authorization, client receives access token
7. Client retries MCP request with Bearer token

### Test Credentials

All examples use fixed test credentials for predictable testing:

- **Access Token**: `test_access_token_abc`
- **Refresh Token**: `test_refresh_token_xyz`
- **Client ID**: `test_client_id`
- **Authorization Code**: `test_auth_code_123`

## Available MCP Tools

Each resource server provides a simple `add` tool for testing:

```json
{
  "name": "add",
  "description": "Add two numbers together",
  "inputSchema": {
    "type": "object",
    "properties": {
      "a": { "type": "number" },
      "b": { "type": "number" }
    }
  }
}
```

## Architecture

```
┌─────────────┐       ┌──────────────┐       ┌─────────────┐
│ MCP Client  │──────>│Resource      │──────>│    Auth     │
│             │       │Server (RS)   │       │Server (AS)  │
└─────────────┘       └──────────────┘       └─────────────┘
      │                      │                       │
      │   1. Request         │                       │
      │   ────────────>      │                       │
      │                      │                       │
      │   2. 401 + WWW-Auth  │                       │
      │   <────────────      │                       │
      │                      │                       │
      │   3. Get Metadata    │                       │
      │   ────────────>      │                       │
      │                      │                       │
      │   4. OAuth Flow      │                       │
      │   ─────────────────────────────────────>    │
      │                      │                       │
      │   5. Access Token    │                       │
      │   <─────────────────────────────────────    │
      │                      │                       │
      │   6. Request + Token │                       │
      │   ────────────>      │                       │
      │                      │                       │
      │   7. MCP Response    │                       │
      │   <────────────      │                       │
```

## Environment Variables

```bash
# Val Town API key for deployment
VAL_TOWN_API_KEY=your_api_key_here

# Example URLs (set after deployment)
EX1_RS_URL=https://username-mcp-oauth-ex1-rs.web.val.run
EX1_AS_URL=https://username-mcp-oauth-ex1-as.web.val.run
EX2_RS_URL=https://username-mcp-oauth-ex2-rs.web.val.run
EX2_AS_URL=https://username-mcp-oauth-ex2-as.web.val.run
```

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check that your client supports OAuth discovery via WWW-Authenticate
2. **PKCE Validation Failed**: Ensure your client implements PKCE with S256 method
3. **Metadata Not Found**: Verify the metadata URLs match the example configuration
4. **Val Town Deployment Issues**: Check that your API key has proper permissions

### Debug Endpoints

Each server provides health check endpoints:

- Resource Server: `/health`
- Auth Server: `/health`

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT