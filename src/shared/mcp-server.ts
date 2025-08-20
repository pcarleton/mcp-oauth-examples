import { Hono } from 'hono';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { toReqRes, toFetchResponse } from './val-town-utils.js';
import { AUTH_CONSTANTS } from './constants.js';

interface ResourceServerConfig {
  authRequired: boolean;
  metadataLocation: string;
  authServerUrl?: string;
  includeWwwAuthenticate?: boolean;
}

export function createResourceServer(config: ResourceServerConfig): Hono {
  const app = new Hono();

  // Health check endpoint
  app.get('/health', (c) => c.json({ status: 'ok' }));

  // OAuth Protected Resource metadata endpoint (if auth is required)
  if (config.authRequired && config.authServerUrl) {
    app.get(config.metadataLocation, (c) => {
      const resourceUrl = `https://${c.req.header('host')}`;
      
      // Serve OAuth Protected Resource Metadata (RFC 9728)
      return c.json({
        resource: resourceUrl,
        authorization_servers: [config.authServerUrl]
      });
    });
  }

  // MCP endpoint with optional auth
  app.post('/mcp', async (c) => {
    // Check for bearer token if auth is required
    if (config.authRequired) {
      const authHeader = c.req.header('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const resourceMetadataUrl = config.includeWwwAuthenticate !== false
          ? `https://${c.req.header('host')}${config.metadataLocation}`
          : undefined;
        
        const headers: Record<string, string> = {};
        if (resourceMetadataUrl) {
          headers['WWW-Authenticate'] = `Bearer resource_metadata="${resourceMetadataUrl}"`;
        }
        
        return c.json({
          jsonrpc: "2.0",
          error: {
            code: -32001,
            message: "Authentication required"
          },
          id: null
        }, { status: 401, headers });
      }

      const token = authHeader.substring(7); // Remove "Bearer " prefix
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
    }

    const { req, res } = toReqRes(c.req.raw);

    const server = createMCPServer();
    
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

  return app;
}

function createMCPServer(): McpServer {
  const mcpServer = new McpServer({
    name: 'mcp-oauth-example',
    version: '1.0.0'
  }, {
    capabilities: {
      tools: {}
    }
  });

  // Register a simple addition tool using the simpler API
  const addSchema = z.object({
    a: z.number().describe('First number'),
    b: z.number().describe('Second number')
  });

  mcpServer.tool(
    'add',
    'Add two numbers together',
    addSchema,
    async ({ a, b }) => {
      return {
        content: [{
          type: 'text',
          text: `${a} + ${b} = ${a + b}`
        }]
      };
    }
  );

  return mcpServer;
}