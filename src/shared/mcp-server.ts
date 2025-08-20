import { Hono } from "npm:hono@3";
import { McpServer } from "npm:@modelcontextprotocol/sdk/server/mcp.js";
import { toFetchResponse, toReqRes } from "npm:fetch-to-node";
import { StreamableHTTPServerTransport } from "npm:@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "npm:zod@3.23.8";
import { CallToolResult } from "npm:@modelcontextprotocol/sdk/types.js";

export interface ServerConfig {
  type: "resource" | "auth";
  name: string;
  port?: number;
  
  // Resource server specific
  metadataPath?: string;
  authServerUrl?: string;
  includeWwwAuthenticate?: boolean;  // Whether to include WWW-Authenticate header

  // Auth server specific
  issuer?: string;
  tenantPath?: string;

  // Common
  fixedAccessToken: string;
  fixedRefreshToken?: string;
  fixedClientId?: string;
  fixedAuthCode?: string;
}

const createMcpServer = (config: ServerConfig) => {
  const server = new McpServer({
    name: config.name,
    version: "1.0.0",
  }, {
    capabilities: {
      // logging: {},
    },
  });

  // Register a simple addition tool
  server.registerTool(
    "add",
    {
      title: "Add tool",
      description: "A simple addition tool",
      inputSchema: {
        a: z.number().describe("First number"),
        b: z.number().describe("Second number"),
      },
    },
    async ({ a, b }): Promise<CallToolResult> => {
      return {
        content: [
          {
            type: "text",
            text: `${a} + ${b} = ${a + b}`,
          },
        ],
      };
    },
  );

  return server;
};

function createResourceServer(config: ServerConfig) {
  const app = new Hono();

  // Health check endpoint
  app.get("/health", (c) => c.json({ status: "ok", server: config.name }));

  // OAuth Protected Resource metadata endpoint
  app.get(config.metadataPath!, (c) => {
    const resourceUrl = `https://${c.req.header("host")}`;
    const authServers = config.tenantPath 
      ? [`${config.authServerUrl}${config.tenantPath}`]
      : [config.authServerUrl!];

    return c.json({
      resource: resourceUrl,
      authorization_servers: authServers,
    });
  });

  // MCP endpoint with auth
  app.post("/mcp", async (c) => {
    // Check for bearer token
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      const resourceMetadataUrl = `https://${c.req.header("host")}${config.metadataPath}`;

      const responseHeaders: Record<string, string> = {};

      // Only include WWW-Authenticate header if configured
      if (config.includeWwwAuthenticate !== false) {
        responseHeaders["WWW-Authenticate"] = `Bearer resource_metadata="${resourceMetadataUrl}"`;
      }

      return c.json({
        jsonrpc: "2.0",
        error: {
          code: -32001,
          message: "Authentication required",
        },
        id: null,
      }, {
        status: 401,
        headers: responseHeaders,
      });
    }

    const token = authHeader.substring(7);
    if (token !== config.fixedAccessToken) {
      return c.json({
        jsonrpc: "2.0",
        error: {
          code: -32001,
          message: "Invalid token",
        },
        id: null,
      }, { status: 401 });
    }

    // Handle MCP request
    const { req, res } = toReqRes(c.req.raw);
    const server = createMcpServer(config);

    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });

      transport.onerror = console.error.bind(console);

      await server.connect(transport);

      const body = await c.req.json();

      await transport.handleRequest(req, res, body);

      console.log(`${new Date().toISOString()} MCP request handled`);

      res.on("close", () => {
        console.log(`${new Date().toISOString()} Request closed`);
        transport.close();
        server.close();
      });

      return toFetchResponse(res);
    } catch (error) {
      console.error("Error handling MCP request:", error);

      try {
        server.close();
      } catch (cleanupError) {
        console.error("Error during cleanup:", cleanupError);
      }
      return c.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error",
          },
          id: null,
        },
        { status: 500 },
      );
    }
  });

  return app;
}

function createAuthServer(config: ServerConfig) {
  const app = new Hono();

  // OAuth Authorization Server Metadata endpoint
  const metadataPath = config.tenantPath 
    ? `/.well-known/oauth-authorization-server${config.tenantPath}`
    : "/.well-known/oauth-authorization-server";
    
  app.get(metadataPath, (c) => {
    const baseUrl = `https://${c.req.header("host")}`;
    const issuer = config.issuer || (config.tenantPath ? `${baseUrl}${config.tenantPath}` : baseUrl);
    
    const metadata = {
      issuer: issuer,
      authorization_endpoint: `${baseUrl}/authorize`,
      token_endpoint: `${baseUrl}/token`,
      registration_endpoint: `${baseUrl}/register`,
      jwks_uri: `${baseUrl}/jwks`,
      response_types_supported: ["code"],
      subject_types_supported: ["public"],
      id_token_signing_alg_values_supported: ["RS256"],
      scopes_supported: ["openid", "profile", "email", "offline_access"],
      token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],
      claims_supported: ["sub", "name", "email"],
      code_challenge_methods_supported: ["plain", "S256"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      response_modes_supported: ["query", "fragment"],
      authorization_response_iss_parameter_supported: true,
      backchannel_logout_supported: false,
      frontchannel_logout_supported: false,
      end_session_endpoint: `${baseUrl}/logout`,
      request_parameter_supported: false,
      request_uri_parameter_supported: false,
    };

    return c.json(metadata);
  });

  // Mock authorization endpoint
  app.get("/authorize", (c) => {
    const redirectUri = c.req.query("redirect_uri");
    const state = c.req.query("state");
    const codeChallenge = c.req.query("code_challenge");
    const codeChallengeMethod = c.req.query("code_challenge_method");

    if (!redirectUri) {
      return c.text("redirect_uri is required", 400);
    }

    // Store code challenge for PKCE validation (in real impl, store in DB)
    console.log("PKCE:", { codeChallenge, codeChallengeMethod });

    // In real implementation, show login/consent screen
    // For testing, immediately redirect with code
    const code = config.fixedAuthCode || "test_auth_code_123";
    const params = new URLSearchParams({
      code,
      ...(state && { state }),
    });

    const authorizeRedirectUrl = `${redirectUri}?${params}`;
    return c.redirect(authorizeRedirectUrl);
  });

  // Mock token endpoint
  app.post("/token", async (c) => {
    const contentType = c.req.header("Content-Type");
    let grantType, code, refreshToken, codeVerifier;

    if (contentType?.includes("application/x-www-form-urlencoded")) {
      const body = await c.req.text();
      const params = new URLSearchParams(body);
      grantType = params.get("grant_type");
      code = params.get("code");
      refreshToken = params.get("refresh_token");
      codeVerifier = params.get("code_verifier");
    } else {
      const body = await c.req.json();
      grantType = body.grant_type;
      code = body.code;
      refreshToken = body.refresh_token;
      codeVerifier = body.code_verifier;
    }

    // Validate PKCE if provided
    if (codeVerifier) {
      console.log("PKCE verification:", { codeVerifier });
      // In real impl, verify against stored code_challenge
    }

    if (grantType === "authorization_code") {
      if (code !== (config.fixedAuthCode || "test_auth_code_123")) {
        return c.json({ error: "invalid_grant" }, 400);
      }

      return c.json({
        access_token: config.fixedAccessToken,
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: config.fixedRefreshToken || "test_refresh_token_xyz",
        scope: "openid profile email",
      });
    } else if (grantType === "refresh_token") {
      if (refreshToken !== (config.fixedRefreshToken || "test_refresh_token_xyz")) {
        return c.json({ error: "invalid_grant" }, 400);
      }

      return c.json({
        access_token: config.fixedAccessToken,
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: config.fixedRefreshToken || "test_refresh_token_xyz",
        scope: "openid profile email",
      });
    }

    return c.json({ error: "unsupported_grant_type" }, 400);
  });

  // Mock JWKS endpoint
  app.get("/jwks", (c) => {
    return c.json({
      keys: [
        {
          kty: "RSA",
          use: "sig",
          kid: "test-key-1",
          alg: "RS256",
          n: "xGOr-H7A-PWG",
          e: "AQAB",
        },
      ],
    });
  });

  // Mock client registration endpoint
  app.post("/register", async (c) => {
    const body = await c.req.json();
    
    return c.json({
      client_id: config.fixedClientId || "test_client_id",
      client_secret: "test_client_secret",
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_secret_expires_at: 0,
      redirect_uris: body.redirect_uris || [],
      token_endpoint_auth_method: "client_secret_basic",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      client_name: body.client_name || "Test Client",
      scope: body.scope || "openid profile email",
    });
  });

  // Mock logout endpoint
  app.get("/logout", (c) => {
    return c.text("Logged out successfully");
  });

  // Health check
  app.get("/health", (c) => {
    return c.json({ status: "ok", server: config.name });
  });

  return app;
}

export function createServer(config: ServerConfig) {
  const app = config.type === "resource" 
    ? createResourceServer(config)
    : createAuthServer(config);

  return app.fetch;
}

export function startServer(config: ServerConfig) {
  const app = config.type === "resource" 
    ? createResourceServer(config)
    : createAuthServer(config);
    
  if (config.port) {
    const serverType = config.type === "resource" ? "Resource" : "Auth";
    console.log(`${serverType} Server (${config.name}) running at http://localhost:${config.port}`);
    
    if (config.type === "resource") {
      console.log("\nEndpoints:");
      console.log(`  MCP: http://localhost:${config.port}/mcp`);
      console.log(`  Metadata: http://localhost:${config.port}${config.metadataPath}`);
      console.log(`  Health: http://localhost:${config.port}/health`);
      if (config.authServerUrl) {
        console.log(`  Auth Server: ${config.authServerUrl}`);
      }
    } else {
      const metadataPath = config.tenantPath 
        ? `/.well-known/oauth-authorization-server${config.tenantPath}`
        : "/.well-known/oauth-authorization-server";
      console.log("\nEndpoints:");
      console.log(`  Metadata: http://localhost:${config.port}${metadataPath}`);
      console.log(`  Authorize: http://localhost:${config.port}/authorize`);
      console.log(`  Token: http://localhost:${config.port}/token`);
      console.log(`  Health: http://localhost:${config.port}/health`);
    }
    
    Deno.serve({ port: config.port }, app.fetch);
  }
}