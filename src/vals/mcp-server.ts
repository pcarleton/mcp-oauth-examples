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

function generateIndexHtml(config: ServerConfig): string {
  const serverType = config.type === "resource" ? "Resource Server" : "Authorization Server";

  const configDetails = Object.entries(config)
    .filter(([key, value]) => value !== undefined && key !== "port")
    .map(([key, value]) => {
      const formattedKey = key.replace(/([A-Z])/g, ' $1').toLowerCase()
        .replace(/^./, str => str.toUpperCase())
        .replace('_', ' ');
      return `<tr><td><strong>${formattedKey}:</strong></td><td>${value}</td></tr>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.name} - MCP OAuth ${serverType}</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            border-bottom: 2px solid #007bff;
            padding-bottom: 10px;
        }
        .server-type {
            color: #007bff;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 20px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        td {
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        td:first-child {
            width: 200px;
            color: #666;
        }
        .endpoints {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }
        .endpoint {
            background: #f8f9fa;
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
            font-family: monospace;
        }
        .note {
            margin-top: 30px;
            padding: 15px;
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="server-type">${serverType}</div>
        <h1>${config.name}</h1>

        <h2>Configuration</h2>
        <table>
            ${configDetails}
        </table>

        <div class="endpoints">
            <h2>Available Endpoints</h2>
            ${config.type === "resource" ? `
                <div class="endpoint"><a href="/health" target="_blank">GET /health</a></div>
                <div class="endpoint"><a href="${config.metadataPath || '/.well-known/oauth-protected-resource'}" target="_blank">GET ${config.metadataPath || '/.well-known/oauth-protected-resource'}</a></div>
                <div class="endpoint">
                    <div>POST /mcp (requires Bearer token)</div>
                    <textarea readonly id="mcp-curl" style="width: 100%; height: 60px; margin-top: 8px; font-family: monospace; font-size: 12px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; background: #f8f9fa;"></textarea>
                </div>
            ` : `
                <div class="endpoint"><a href="/health" target="_blank">GET /health</a></div>
                <div class="endpoint"><a href="/.well-known/openid-configuration" target="_blank">GET /.well-known/openid-configuration</a></div>
                <div class="endpoint"><a href="/authorize" target="_blank">GET /authorize</a></div>
                <div class="endpoint">
                    <div>POST /token</div>
                    <textarea readonly id="token-curl" style="width: 100%; height: 80px; margin-top: 8px; font-family: monospace; font-size: 12px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; background: #f8f9fa;"></textarea>
                </div>
            `}
        </div>

        <script>
            document.addEventListener('DOMContentLoaded', function() {
                const origin = window.location.origin;

                ${config.type === "resource" ? `
                    const mcpCurl = document.getElementById('mcp-curl');
                    if (mcpCurl) {
                        mcpCurl.textContent = \`curl -X POST \${origin}/mcp \\\\
  -H "Authorization: Bearer ${config.fixedAccessToken}" \\\\
  -H "Content-Type: application/json" \\\\
  -H 'Accept: application/json, text/event-stream' \\\\
  -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}'\`;
                    }
                ` : `
                    const tokenCurl = document.getElementById('token-curl');
                    if (tokenCurl) {
                        tokenCurl.textContent = \`curl -X POST \${origin}/token \\\\
  -H "Content-Type: application/x-www-form-urlencoded" \\\\
  -d "grant_type=authorization_code&code=${config.fixedAuthCode || 'test_auth_code_123'}&redirect_uri=http://localhost:3000/callback"\`;
                    }
                `}
            });
        </script>
        </div>

        <div class="note">
            <strong>Note:</strong> This is an MCP OAuth example server for testing and development purposes.
            ${config.type === "resource"
              ? `Access to the /mcp endpoint requires a valid Bearer token: <code>${config.fixedAccessToken}</code>`
              : `This server uses fixed test credentials for demonstration purposes.`
            }
        </div>
    </div>
</body>
</html>`;
}

function createResourceServer(config: ServerConfig) {
  const app = new Hono();

  // CORS middleware - apply to all routes
  app.use("*", async (c, next) => {
    // Handle preflight requests
    if (c.req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, mcp-protocol-version",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // Add CORS headers to all responses
    await next();

    // Add CORS headers after the response is generated
    c.header("Access-Control-Allow-Origin", "*");
    c.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

    // If WWW-Authenticate header is present, expose it
    if (c.res.headers.get("WWW-Authenticate")) {
      c.header("Access-Control-Expose-Headers", "WWW-Authenticate");
    }
  });

  // Root index page
  app.get("/", (c) => c.html(generateIndexHtml(config)));

  // Health check endpoint
  app.get("/health", (c) => c.json({ status: "ok", server: config.name }));

  // OAuth Protected Resource metadata endpoint
  app.get(config.metadataPath!, (c) => {
    const resourceUrl = `https://${c.req.header("host")}/mcp`;
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

  // Root index page
  app.get("/", (c) => c.html(generateIndexHtml(config)));

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

  const port = config.type === "resource" ? 3000 : 3001

  const serverType = config.type === "resource" ? "Resource" : "Auth";
  console.log(`${serverType} Server (${config.name}) running at http://localhost:${port}`);

  if (config.type === "resource") {
    console.log("\nEndpoints:");
    console.log(`  MCP: http://localhost:${port}/mcp`);
    console.log(`  Metadata: http://localhost:${port}${config.metadataPath}`);
    console.log(`  Health: http://localhost:${port}/health`);
    if (config.authServerUrl) {
      console.log(`  Auth Server: ${config.authServerUrl}`);
    }
  } else {
    const metadataPath = config.tenantPath
      ? `/.well-known/oauth-authorization-server${config.tenantPath}`
      : "/.well-known/oauth-authorization-server";
    console.log("\nEndpoints:");
    console.log(`  Metadata: http://localhost:${port}${metadataPath}`);
    console.log(`  Authorize: http://localhost:${port}/authorize`);
    console.log(`  Token: http://localhost:${port}/token`);
    console.log(`  Health: http://localhost:${port}/health`);
  }

  Deno.serve({ port, hostname: "127.0.0.1" }, app.fetch);
}
