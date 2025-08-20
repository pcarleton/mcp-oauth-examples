import { MockAuthServer } from '../shared/auth-server.js';

// Path-aware OAuth metadata location with tenant1 issuer path
const authServer = new MockAuthServer('/tenant1', '/.well-known/oauth-authorization-server/tenant1');

const app = authServer.getApp();

// Export for Val Town
export default app.fetch;