import { Hono } from 'hono';
import { AUTH_CONSTANTS } from './constants.js';
import crypto from 'crypto';

interface AuthorizationRequest {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: string;
}

export class MockAuthServer {
  private app: Hono;
  private authorizationRequests: Map<string, AuthorizationRequest> = new Map();
  public issuerPath: string;

  constructor(issuerPath: string = '', metadataLocation: string = '/.well-known/oauth-authorization-server') {
    this.app = new Hono();
    this.issuerPath = issuerPath;
    this.setupRoutes(metadataLocation);
  }

  private setupRoutes(metadataLocation: string): void {
    // OAuth Authorization Server Metadata endpoint
    this.app.get(metadataLocation, (c) => {
      const baseUrl = `https://${c.req.header('host')}`;
      const issuer = baseUrl + this.issuerPath;

      const metadata = {
        issuer: issuer,
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
    this.app.get('/authorize', (c) => {
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
      this.authorizationRequests.set(AUTH_CONSTANTS.FIXED_AUTH_CODE, {
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
    this.app.post('/token', async (c) => {
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
        const authRequest = this.authorizationRequests.get(code);
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
        if (!this.validatePKCE(code_verifier, authRequest.codeChallenge)) {
          return c.json({
            error: 'invalid_grant',
            error_description: 'Invalid PKCE code verifier'
          }, 400);
        }

        // Clean up used authorization code
        this.authorizationRequests.delete(code);

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

        // Return new access token (same static value for simplicity)
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

    // Client registration endpoint (returns static client info)
    this.app.post('/register', async (c) => {
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
    this.app.get('/health', (c) => {
      return c.json({ status: 'ok', server: 'mock-auth-server' });
    });
  }

  private validatePKCE(codeVerifier: string, codeChallenge: string): boolean {
    if (!codeVerifier || !codeChallenge) {
      return false;
    }

    // Compute S256 challenge from verifier
    const hash = crypto.createHash('sha256');
    hash.update(codeVerifier);
    const computedChallenge = hash.digest('base64url');

    return computedChallenge === codeChallenge;
  }

  getApp(): Hono {
    return this.app;
  }
}