import { createResourceServer } from '../shared/mcp-server.js';

// Get auth server URL from environment or use default
const AUTH_SERVER_URL = process.env.EX1_AS_URL || 'https://your-username-mcp-oauth-ex1-as.web.val.run';

const app = createResourceServer({
  authRequired: true,
  metadataLocation: '/.well-known/oauth-protected-resource-abc123', // Random location
  authServerUrl: AUTH_SERVER_URL,
  includeWwwAuthenticate: true
});

// Export for Val Town
export default app.fetch;