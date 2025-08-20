// Val Town version - Example 1 Resource Server
// Deploy this directly to Val Town

import { Hono } from "npm:hono@3";
import { McpServer } from 'npm:@modelcontextprotocol/sdk/server/mcp.js';
import { toFetchResponse, toReqRes } from "npm:fetch-to-node";
import { StreamableHTTPServerTransport } from 'npm:@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'npm:zod';
import { CallToolResult } from 'npm:@modelcontextprotocol/sdk/types.js';

const AUTH_CONSTANTS = {
  FIXED_ACCESS_TOKEN: 'test_access_token_abc',
};

// Get auth server URL from environment or use default
const AUTH_SERVER_URL = typeof Deno !== 'undefined' 
  ? (Deno.env.get("EX1_AS_URL") || 'http://localhost:3002')
  : 'https://your-username-mcp-oauth-ex1-as.web.val.run';

const getServer = () => {
  const server = new McpServer({
    name: 'mcp-oauth-example',
    version: '1.0.0',
  }, { 
    capabilities: { 
      tools: {} 
    } 
  });

  // Register a simple addition tool
  server.tool(
    'add',
    'Add two numbers together',
    {
      a: z.number().describe('First number'),
      b: z.number().describe('Second number'),
    },
    async ({ a, b }): Promise<CallToolResult> => {
      return {
        content: [
          {
            type: 'text',
            text: `${a} + ${b} = ${a + b}`,
          }
        ],
      };
    }
  );

  return server;
};

const app = new Hono();

// Health check endpoint
app.get('/health', (c) => c.json({ status: 'ok' }));

// OAuth Protected Resource metadata endpoint
app.get('/.well-known/oauth-protected-resource-abc123', (c) => {
  const resourceUrl = `https://${c.req.header('host')}`;
  
  return c.json({
    resource: resourceUrl,
    authorization_servers: [AUTH_SERVER_URL]
  });
});

// MCP endpoint with auth
app.post('/mcp', async (c) => {
  // Check for bearer token
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const resourceMetadataUrl = `https://${c.req.header('host')}/.well-known/oauth-protected-resource-abc123`;
    
    return c.json({
      jsonrpc: "2.0",
      error: {
        code: -32001,
        message: "Authentication required"
      },
      id: null
    }, { 
      status: 401, 
      headers: {
        'WWW-Authenticate': `Bearer resource_metadata="${resourceMetadataUrl}"`
      }
    });
  }

  const token = authHeader.substring(7);
  if (token !== AUTH_CONSTANTS.FIXED_ACCESS_TOKEN) {
    return c.json({
      jsonrpc: "2.0",
      error: {
        code: -32001,
        message: "Invalid token"
      },
      id: null
    }, { status: 401 });
  }

  // Handle MCP request
  const { req, res } = toReqRes(c.req.raw);
  const server = getServer();
  
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
    console.error('Error handling MCP request:', error);
    
    try {
      server.close();
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
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
      { status: 500 }
    );
  }
});

// For local development with Deno
if (import.meta.main) {
  const port = 3001;
  console.log(`Resource Server running at http://localhost:${port}`);
  console.log(`Auth Server expected at: ${AUTH_SERVER_URL}`);
  console.log('\nEndpoints:');
  console.log(`  MCP: http://localhost:${port}/mcp`);
  console.log(`  Metadata: http://localhost:${port}/.well-known/oauth-protected-resource-abc123`);
  console.log(`  Health: http://localhost:${port}/health`);
  Deno.serve({ port }, app.fetch);
}

export default app.fetch;