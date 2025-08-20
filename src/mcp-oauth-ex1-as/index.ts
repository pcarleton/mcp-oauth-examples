// Val Town version - Example 1 Authorization Server
// Deploy this directly to Val Town

import { Hono } from "npm:hono@3";
import * as crypto from "node:crypto";

const AUTH_CONSTANTS = {
  FIXED_AUTH_CODE: 'test_auth_code_123',
  FIXED_ACCESS_TOKEN: 'test_access_token_abc',
  FIXED_REFRESH_TOKEN: 'test_refresh_token_xyz',
  TOKEN_EXPIRY: 3600,
  CLIENT_ID: 'test_client_id',
  CLIENT_SECRET: 'test_client_secret',
};

interface AuthorizationRequest {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: string;
}

const authorizationRequests = new Map<string, AuthorizationRequest>();

const app = new Hono();

// OAuth Authorization Server Metadata endpoint
app.get('/.well-known/oauth-authorization-server', (c) => {
  const baseUrl = `https://${c.req.header('host')}`;
  
  const metadata = {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/authorize`,
    token_endpoint: `${baseUrl}/token`,
    registration_endpoint: `${baseUrl}/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post']
  };

  return c.json(metadata);
});

// OAuth2 authorization endpoint
app.get('/authorize', (c) => {
  const {
    response_type,
    client_id,
    redirect_uri,
    state,
    code_challenge,
    code_challenge_method,
  } = c.req.query();

  // Basic validation
  if (response_type !== 'code') {
    return c.json({
      error: 'unsupported_response_type',
      error_description: 'Only code response type is supported'
    }, 400);
  }

  if (!code_challenge || code_challenge_method !== 'S256') {
    return c.json({
      error: 'invalid_request',
      error_description: 'PKCE is required with S256 method'
    }, 400);
  }

  // Store the request for later PKCE validation
  authorizationRequests.set(AUTH_CONSTANTS.FIXED_AUTH_CODE, {
    clientId: client_id,
    redirectUri: redirect_uri,
    state: state || '',
    codeChallenge: code_challenge,
    codeChallengeMethod: code_challenge_method
  });

  // Immediately redirect back with authorization code (no user interaction)
  const redirectUrl = new URL(redirect_uri);
  redirectUrl.searchParams.set('code', AUTH_CONSTANTS.FIXED_AUTH_CODE);
  if (state) {
    redirectUrl.searchParams.set('state', state);
  }

  return c.redirect(redirectUrl.toString());
});

// OAuth2 token endpoint
app.post('/token', async (c) => {
  const body = await c.req.parseBody();
  const {
    grant_type,
    code,
    redirect_uri,
    code_verifier,
    refresh_token,
  } = body as Record<string, string>;

  if (grant_type === 'authorization_code') {
    // Validate authorization code
    if (code !== AUTH_CONSTANTS.FIXED_AUTH_CODE) {
      return c.json({
        error: 'invalid_grant',
        error_description: 'Invalid authorization code'
      }, 400);
    }

    // Get the stored authorization request
    const authRequest = authorizationRequests.get(code);
    if (!authRequest) {
      return c.json({
        error: 'invalid_grant',
        error_description: 'Authorization code not found or expired'
      }, 400);
    }

    // Validate redirect URI matches
    if (redirect_uri !== authRequest.redirectUri) {
      return c.json({
        error: 'invalid_grant',
        error_description: 'Redirect URI mismatch'
      }, 400);
    }

    // Validate PKCE code verifier
    const hash = crypto.createHash('sha256');
    hash.update(code_verifier);
    const computedChallenge = hash.digest('base64url');
    
    if (computedChallenge !== authRequest.codeChallenge) {
      return c.json({
        error: 'invalid_grant',
        error_description: 'Invalid PKCE code verifier'
      }, 400);
    }

    // Clean up used authorization code
    authorizationRequests.delete(code);

    // Return tokens
    return c.json({
      access_token: AUTH_CONSTANTS.FIXED_ACCESS_TOKEN,
      token_type: 'Bearer',
      expires_in: AUTH_CONSTANTS.TOKEN_EXPIRY,
      refresh_token: AUTH_CONSTANTS.FIXED_REFRESH_TOKEN,
      scope: 'mcp'
    });

  } else if (grant_type === 'refresh_token') {
    // Simple refresh token validation
    if (refresh_token !== AUTH_CONSTANTS.FIXED_REFRESH_TOKEN) {
      return c.json({
        error: 'invalid_grant',
        error_description: 'Invalid refresh token'
      }, 400);
    }

    // Return new access token
    return c.json({
      access_token: AUTH_CONSTANTS.FIXED_ACCESS_TOKEN,
      token_type: 'Bearer',
      expires_in: AUTH_CONSTANTS.TOKEN_EXPIRY,
      refresh_token: AUTH_CONSTANTS.FIXED_REFRESH_TOKEN,
      scope: 'mcp'
    });

  } else {
    return c.json({
      error: 'unsupported_grant_type',
      error_description: 'Grant type not supported'
    }, 400);
  }
});

// Client registration endpoint
app.post('/register', async (c) => {
  const body = await c.req.json();
  const { client_name, redirect_uris } = body;

  // Return a static client configuration
  return c.json({
    client_id: AUTH_CONSTANTS.CLIENT_ID,
    client_name: client_name || 'Test Client',
    redirect_uris: redirect_uris || [],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'client_secret_post'
  }, 201);
});

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', server: 'mock-auth-server' });
});

// For local development with Deno
if (import.meta.main) {
  const port = 3002;
  console.log(`Auth Server running at http://localhost:${port}`);
  Deno.serve({ port }, app.fetch);
}

export default app.fetch;