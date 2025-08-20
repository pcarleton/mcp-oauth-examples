// Import from relative path - works both locally and on Val Town
import { createServer, startServer, ServerConfig } from "./mcp-server.ts";

const config: ServerConfig = {
  type: "resource",
  name: "mcp-oauth-example2-tenant1-rs",
  port: 3011, // For local testing
  metadataPath: "/.well-known/oauth-protected-resource/tenant1",
  authServerUrl: typeof Deno !== "undefined" && Deno.env.get("LOCAL_DEV")
    ? (Deno.env.get("EX2_AS_URL") || "http://localhost:3012")
    : "https://pcarleton-mcp-oauth-ex2-as.web.val.run",
  tenantPath: "/tenant1",
  fixedAccessToken: "test_access_token_abc",
};

// For Val Town deployment
export default createServer(config);

// For local development
if (import.meta.main) {
  startServer(config);
}