// Import from relative path - works both locally and on Val Town
import { createServer, startServer, ServerConfig } from "./mcp-server.ts";

const config: ServerConfig = {
  type: "auth",
  name: "mcp-oauth-example1-as",
  port: 3002, // For local testing
  fixedAccessToken: "test_access_token_abc",
  fixedRefreshToken: "test_refresh_token_xyz",
  fixedClientId: "test_client_id",
  fixedAuthCode: "test_auth_code_123",
};

// For Val Town deployment
export default createServer(config);

// For local development
if (import.meta.main) {
  startServer(config);
}
