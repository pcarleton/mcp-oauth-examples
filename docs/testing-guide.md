# Testing Guide

This guide provides detailed instructions for testing each OAuth example configuration.

## Testing Example 1: Random PRM Location

### Endpoints

- **Resource Server**: `https://[username]-mcp-oauth-ex1-rs.web.val.run`
  - MCP: `/mcp`
  - Metadata: `/.well-known/oauth-protected-resource-abc123`
  - Health: `/health`

- **Auth Server**: `https://[username]-mcp-oauth-ex1-as.web.val.run`
  - Metadata: `/.well-known/oauth-authorization-server`
  - Authorize: `/authorize`
  - Token: `/token`
  - Register: `/register`
  - Health: `/health`

### Manual Testing with cURL

```bash
# 1. Test unauthenticated request (should return 401)
curl -X POST https://[username]-mcp-oauth-ex1-rs.web.val.run/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"0.1.0"},"id":1}'

# 2. Get Protected Resource Metadata
curl https://[username]-mcp-oauth-ex1-rs.web.val.run/.well-known/oauth-protected-resource-abc123

# 3. Get Authorization Server Metadata
curl https://[username]-mcp-oauth-ex1-as.web.val.run/.well-known/oauth-authorization-server

# 4. Test with bearer token
curl -X POST https://[username]-mcp-oauth-ex1-rs.web.val.run/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test_access_token_abc" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"0.1.0"},"id":1}'
```

### Testing OAuth Flow

1. **Generate PKCE Challenge**
```javascript
// Node.js example
const crypto = require('crypto');
const codeVerifier = crypto.randomBytes(32).toString('base64url');
const codeChallenge = crypto
  .createHash('sha256')
  .update(codeVerifier)
  .digest('base64url');
console.log('Verifier:', codeVerifier);
console.log('Challenge:', codeChallenge);
```

2. **Authorization Request**
```
https://[username]-mcp-oauth-ex1-as.web.val.run/authorize?
  response_type=code&
  client_id=test_client_id&
  redirect_uri=http://localhost:8080/callback&
  state=random_state&
  code_challenge=[YOUR_CHALLENGE]&
  code_challenge_method=S256
```

3. **Token Exchange**
```bash
curl -X POST https://[username]-mcp-oauth-ex1-as.web.val.run/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=test_auth_code_123&redirect_uri=http://localhost:8080/callback&code_verifier=[YOUR_VERIFIER]"
```

## Testing Example 2: Path-Aware Configuration

### Endpoints

- **Resource Server**: `https://[username]-mcp-oauth-ex2-rs.web.val.run`
  - MCP: `/mcp`
  - Metadata: `/.well-known/oauth-protected-resource/tenant1`
  - Health: `/health`

- **Auth Server**: `https://[username]-mcp-oauth-ex2-as.web.val.run`
  - Metadata: `/.well-known/oauth-authorization-server/tenant1`
  - Authorize: `/authorize`
  - Token: `/token`
  - Register: `/register`
  - Health: `/health`

### Key Differences

1. **Metadata Location**: Uses path suffix `/tenant1` for tenant isolation
2. **Issuer Path**: Auth server includes `/tenant1` in issuer URL
3. **Resource Identification**: Demonstrates multi-tenant OAuth patterns

### Testing Multi-Tenant Behavior

```bash
# Get tenant-specific metadata
curl https://[username]-mcp-oauth-ex2-rs.web.val.run/.well-known/oauth-protected-resource/tenant1

# Response should show tenant-aware auth server
{
  "resource": "https://[username]-mcp-oauth-ex2-rs.web.val.run",
  "authorization_servers": ["https://[username]-mcp-oauth-ex2-as.web.val.run/tenant1"]
}
```

## Testing MCP Tools

Once authenticated, test the `add` tool:

```bash
curl -X POST https://[username]-mcp-oauth-ex[N]-rs.web.val.run/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test_access_token_abc" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "add",
      "arguments": {
        "a": 5,
        "b": 3
      }
    },
    "id": 2
  }'
```

Expected response:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "5 + 3 = 8"
      }
    ]
  },
  "id": 2
}
```

## Automated Testing

Create a test script to validate the OAuth flow:

```javascript
// test-oauth-flow.js
const axios = require('axios');
const crypto = require('crypto');

async function testOAuthFlow(exampleNum) {
  const baseUrlRS = `https://[username]-mcp-oauth-ex${exampleNum}-rs.web.val.run`;
  const baseUrlAS = `https://[username]-mcp-oauth-ex${exampleNum}-as.web.val.run`;
  
  console.log(`Testing Example ${exampleNum}...`);
  
  // Step 1: Test unauthenticated access
  try {
    await axios.post(`${baseUrlRS}/mcp`, {
      jsonrpc: "2.0",
      method: "initialize",
      params: { protocolVersion: "0.1.0" },
      id: 1
    });
    console.error("❌ Should have returned 401");
  } catch (error) {
    if (error.response?.status === 401) {
      console.log("✅ Unauthenticated request blocked");
      console.log("   WWW-Authenticate:", error.response.headers['www-authenticate']);
    }
  }
  
  // Step 2: Test authenticated access
  try {
    const response = await axios.post(`${baseUrlRS}/mcp`, {
      jsonrpc: "2.0",
      method: "tools/list",
      params: {},
      id: 2
    }, {
      headers: {
        'Authorization': 'Bearer test_access_token_abc'
      }
    });
    console.log("✅ Authenticated request succeeded");
    console.log("   Tools:", response.data.result?.tools?.map(t => t.name));
  } catch (error) {
    console.error("❌ Authenticated request failed:", error.message);
  }
}

// Test both examples
testOAuthFlow(1).then(() => testOAuthFlow(2));
```

## Debugging Tips

1. **Check Server Logs**: Val Town provides logs for each val
2. **Use Browser DevTools**: For authorization flow debugging
3. **Test Incrementally**: Verify each step of the OAuth flow separately
4. **Validate PKCE**: Ensure challenge and verifier are properly generated

## Common Test Scenarios

1. **Missing Bearer Token**: Should return 401 with WWW-Authenticate header
2. **Invalid Token**: Should return 401 without WWW-Authenticate
3. **Expired Token**: Currently not implemented (tokens don't expire in test server)
4. **PKCE Mismatch**: Token endpoint should reject with `invalid_grant`
5. **Wrong Redirect URI**: Token endpoint should reject with `invalid_grant`