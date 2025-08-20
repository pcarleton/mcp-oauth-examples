import { createResourceServer } from '../shared/mcp-server.js';

// Get auth server URL from environment or use default
const AUTH_SERVER_URL = process.env.EX2_AS_URL || 'https://your-username-mcp-oauth-ex2-as.web.val.run';

const app = createResourceServer({
  authRequired: true,
  metadataLocation: '/.well-known/oauth-protected-resource/tenant1', // Path-aware location
  authServerUrl: AUTH_SERVER_URL + '/tenant1', // Include tenant path in issuer
  includeWwwAuthenticate: true
});

// Export for Val Town
export default app.fetch;