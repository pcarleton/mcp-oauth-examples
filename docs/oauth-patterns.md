# OAuth Patterns in MCP

This document explains the OAuth 2.0 patterns demonstrated in these examples.

## Overview

The Model Context Protocol (MCP) supports OAuth 2.0 for protecting resources. This involves:

1. **Resource Server (RS)**: The MCP server that requires authentication
2. **Authorization Server (AS)**: Issues tokens after user authorization
3. **Protected Resource Metadata**: Describes the resource and its auth requirements
4. **WWW-Authenticate Header**: Signals auth requirements to clients

## Pattern 1: Non-Standard Metadata Location

### Use Case
When you want to avoid conflicts with other well-known URLs or need a unique identifier.

### Implementation (Example 1)
- Metadata at: `/.well-known/oauth-protected-resource-abc123`
- WWW-Authenticate: `Bearer resource_metadata=".../.well-known/oauth-protected-resource-abc123"`

### Benefits
- Avoids namespace collisions
- Can include version or deployment identifiers
- Useful for testing different configurations

### Considerations
- Clients must support arbitrary metadata URLs
- Less discoverable without WWW-Authenticate header

## Pattern 2: Path-Based Multi-Tenancy

### Use Case
When serving multiple tenants or organizations from the same deployment.

### Implementation (Example 2)
- Metadata at: `/.well-known/oauth-protected-resource/tenant1`
- Issuer includes path: `https://auth.example.com/tenant1`
- AS metadata at: `/.well-known/oauth-authorization-server/tenant1`

### Benefits
- Clear tenant isolation
- Single deployment serves multiple organizations
- Tenant-specific configuration

### Considerations
- Clients must handle path components correctly
- More complex URL construction

## OAuth 2.0 Flow in MCP

### 1. Initial Request
```http
POST /mcp HTTP/1.1
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "initialize",
  "params": {...},
  "id": 1
}
```

### 2. Authentication Challenge
```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer resource_metadata="https://server.com/.well-known/oauth-protected-resource"

{
  "jsonrpc": "2.0",
  "error": {
    "code": -32001,
    "message": "Authentication required"
  },
  "id": 1
}
```

### 3. Metadata Discovery

#### Protected Resource Metadata (RFC 9728)
```json
{
  "resource": "https://mcp-server.com",
  "authorization_servers": ["https://auth-server.com"]
}
```

#### Authorization Server Metadata (RFC 8414)
```json
{
  "issuer": "https://auth-server.com",
  "authorization_endpoint": "https://auth-server.com/authorize",
  "token_endpoint": "https://auth-server.com/token",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "code_challenge_methods_supported": ["S256"]
}
```

### 4. Authorization Flow with PKCE

#### Generate PKCE Values
```javascript
const codeVerifier = generateRandomString(128);
const codeChallenge = sha256(codeVerifier);
```

#### Authorization Request
```
GET /authorize?
  response_type=code&
  client_id=CLIENT_ID&
  redirect_uri=REDIRECT_URI&
  state=STATE&
  code_challenge=CHALLENGE&
  code_challenge_method=S256
```

#### Token Exchange
```http
POST /token HTTP/1.1
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=AUTH_CODE&
redirect_uri=REDIRECT_URI&
code_verifier=VERIFIER
```

### 5. Authenticated Request
```http
POST /mcp HTTP/1.1
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "params": {},
  "id": 2
}
```

## Security Considerations

### PKCE (Proof Key for Code Exchange)
- **Required** for public clients
- Prevents authorization code interception attacks
- Uses S256 method (SHA-256 hash)

### Token Handling
- Store tokens securely
- Implement token refresh before expiry
- Clear tokens on logout

### Redirect URI Validation
- Exact match required
- Prevents redirect attacks
- Register allowed URIs in advance

## Client Implementation Tips

### 1. Automatic Discovery
```javascript
async function discoverOAuth(mcpUrl) {
  // Try MCP endpoint first
  const response = await fetch(mcpUrl, { method: 'POST', ... });
  
  if (response.status === 401) {
    // Parse WWW-Authenticate header
    const authHeader = response.headers.get('WWW-Authenticate');
    const metadataUrl = parseResourceMetadata(authHeader);
    
    // Fetch metadata
    const metadata = await fetch(metadataUrl).then(r => r.json());
    const authServer = metadata.authorization_servers[0];
    
    // Get auth server metadata
    const authMetadata = await discoverAuthServerMetadata(authServer);
    
    return { resourceMetadata: metadata, authMetadata };
  }
}
```

### 2. Token Management
```javascript
class TokenManager {
  async getAccessToken() {
    if (this.isExpired()) {
      await this.refresh();
    }
    return this.token;
  }
  
  async refresh() {
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken
      })
    });
    
    const tokens = await response.json();
    this.updateTokens(tokens);
  }
}
```

### 3. Retry Logic
```javascript
async function callMCP(request, tokenManager) {
  let token = await tokenManager.getAccessToken();
  
  let response = await fetch(mcpUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  });
  
  if (response.status === 401) {
    // Token might be expired, try refresh
    await tokenManager.refresh();
    token = await tokenManager.getAccessToken();
    
    // Retry with new token
    response = await fetch(mcpUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });
  }
  
  return response.json();
}
```

## Testing Checklist

- [ ] Client discovers metadata from WWW-Authenticate header
- [ ] Client fetches Protected Resource Metadata
- [ ] Client fetches Authorization Server Metadata
- [ ] Client implements PKCE correctly
- [ ] Client handles authorization redirect
- [ ] Client exchanges code for tokens
- [ ] Client includes Bearer token in requests
- [ ] Client handles token refresh
- [ ] Client retries on 401 responses
- [ ] Client clears tokens on errors

## References

- [RFC 6749: OAuth 2.0](https://tools.ietf.org/html/rfc6749)
- [RFC 7636: PKCE](https://tools.ietf.org/html/rfc7636)
- [RFC 8414: OAuth 2.0 Authorization Server Metadata](https://tools.ietf.org/html/rfc8414)
- [RFC 9728: OAuth 2.0 Protected Resource Metadata](https://tools.ietf.org/html/rfc9728)
- [Model Context Protocol Specification](https://modelcontextprotocol.io)