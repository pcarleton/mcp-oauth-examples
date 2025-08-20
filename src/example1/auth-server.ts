import { MockAuthServer } from '../shared/auth-server.js';

// Standard OAuth metadata location, no issuer path
const authServer = new MockAuthServer('', '/.well-known/oauth-authorization-server');

const app = authServer.getApp();

// Export for Val Town
export default app.fetch;