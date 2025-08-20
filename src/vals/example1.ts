// Import from relative path - works both locally and on Val Town
import { createServer, startServer, ServerConfig } from "./mcp-server.ts";

const config: ServerConfig = {
  type: "resource",
  name: "mcp-oauth-ex1",
  port: 3001, // For local testing
  metadataPath: "/.well-known/oauth-protected-resource-abc123",
  authServerUrl: "https://mcp-oauth-as1.val.run/",
  fixedAccessToken: "test_access_token_abc",
};

// For Val Town deployment
export default createServer(config);

// For local development
if (import.meta.main) {
  startServer(config);
}
