export default async function(req: Request): Promise<Response> {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MCP OAuth Examples</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          max-width: 900px;
          margin: 0 auto;
          padding: 2rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
        }
        .container {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        h1 {
          color: #333;
          border-bottom: 3px solid #667eea;
          padding-bottom: 0.5rem;
          margin-bottom: 2rem;
        }
        h2 {
          color: #555;
          margin-top: 2rem;
        }
        .example-grid {
          display: grid;
          gap: 1.5rem;
          margin-top: 2rem;
        }
        .example-card {
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 1.5rem;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .example-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0,0,0,0.1);
        }
        .example-card h3 {
          color: #667eea;
          margin-top: 0;
        }
        .example-card h3 a {
          color: inherit;
          text-decoration: none;
        }
        .example-card h3 a:hover {
          text-decoration: underline;
        }
        .example-card p {
          color: #666;
          margin: 0.5rem 0;
        }
        .links {
          margin-top: 1rem;
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .links a {
          display: inline-block;
          padding: 0.5rem 1rem;
          background: #667eea;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-size: 0.9rem;
          transition: background 0.2s;
          text-align: center;
          min-width: 200px;
        }
        .links a small {
          display: block;
          font-size: 0.75rem;
          opacity: 0.9;
          margin-top: 0.2rem;
        }
        .links a:hover {
          background: #5a67d8;
        }
        .links a.secondary {
          background: #48bb78;
        }
        .links a.secondary:hover {
          background: #38a169;
        }
        code {
          background: #f4f4f4;
          padding: 0.2rem 0.4rem;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
          font-size: 0.9em;
        }
        .info-box {
          background: #f0f9ff;
          border-left: 4px solid #3182ce;
          padding: 1rem;
          margin: 1.5rem 0;
          border-radius: 4px;
        }
        .info-box h4 {
          margin-top: 0;
          color: #2c5282;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1><a href="https://mcp-oauth-landing.val.run" style="text-decoration: none; color: inherit;">🔐 MCP OAuth Examples</a></h1>

        <div class="info-box">
          <h4>What is this?</h4>
          <p>This is a collection of example implementations for the MCP (Model Context Protocol) OAuth specification.
          These examples demonstrate different OAuth flows and configurations for protecting MCP resources.</p>
        </div>

        <h2>📚 Available Examples</h2>

        <div class="example-grid">
          <div class="example-card">
            <h3><a href="https://mcp-oauth-ex1.val.run">Example 1: PRM Metadata at Root</a></h3>
            <p>Tests Protected Resource Metadata (PRM) discovery at the server root without WWW-Authenticate headers.</p>
            <p><strong>Configuration:</strong></p>
            <ul>
              <li>No WWW-Authenticate header</li>
              <li>PRM metadata at <code>/.well-known/oauth-protected-resource</code></li>
              <li>Fixed token validation</li>
            </ul>
            <div class="links">
              <a href="https://mcp-oauth-ex1.val.run/mcp">MCP Endpoint<br><small>https://mcp-oauth-ex1.val.run/mcp</small></a>
              <a href="https://mcp-oauth-ex1.val.run/.well-known/oauth-protected-resource" class="secondary">Metadata<br><small>/.well-known/oauth-protected-resource</small></a>
            </div>
          </div>

          <div class="example-card">
            <h3><a href="https://mcp-oauth-ex2.val.run">Example 2: PRM Metadata at Path</a></h3>
            <p>Tests Protected Resource Metadata (PRM) discovery at the specific resource path without WWW-Authenticate headers.</p>
            <p><strong>Configuration:</strong></p>
            <ul>
              <li>No WWW-Authenticate header</li>
              <li>PRM metadata at <code>/.well-known/oauth-protected-resource/mcp</code></li>
              <li>Fixed token validation</li>
            </ul>
            <div class="links">
              <a href="https://mcp-oauth-ex2.val.run/mcp">MCP Endpoint<br><small>https://mcp-oauth-ex2.val.run/mcp</small></a>
              <a href="https://mcp-oauth-ex2.val.run/.well-known/oauth-protected-resource/mcp" class="secondary">Metadata<br><small>/.well-known/oauth-protected-resource/mcp</small></a>
            </div>
          </div>

          <div class="example-card">
            <h3><a href="https://mcp-oauth-ex3.val.run">Example 3: WWW-Authenticate with Custom PRM Location</a></h3>
            <p>Tests OAuth protection with WWW-Authenticate headers and PRM metadata at a custom location.</p>
            <p><strong>Configuration:</strong></p>
            <ul>
              <li>WWW-Authenticate header included</li>
              <li>PRM metadata at custom location</li>
            </ul>
            <div class="links">
              <a href="https://mcp-oauth-ex3.val.run/mcp">MCP Endpoint<br><small>https://mcp-oauth-ex3.val.run/mcp</small></a>
              <a href="https://mcp-oauth-ex3.val.run/custom/metadata-path" class="secondary">Metadata<br><small>/custom/metadata-path</small></a>
            </div>
          </div>

          <div class="example-card">
            <h3><a href="https://mcp-oauth-as1.val.run">Authorization Server 1</a></h3>
            <p>A simple OAuth authorization server for testing with the example resource servers.</p>
            <p><strong>Features:</strong></p>
            <ul>
              <li>Metadata at the root</li>
              <li>Fixed access and refresh token</li>
              <li>PKCE validation</li>
            </ul>
            <div class="links">
              <a href="https://mcp-oauth-as1.val.run/">Server Home<br><small>https://mcp-oauth-as1.val.run/</small></a>
              <a href="https://mcp-oauth-as1.val.run/.well-known/oauth-authorization-server" class="secondary">Metadata<br><small>/.well-known/oauth-authorization-server</small></a>
            </div>
          </div>
        </div>

        <h2>🚀 Getting Started</h2>

        <div class="info-box">
          <h4>Testing the Examples</h4>
          <p>You can test these endpoints using:</p>
          <ul>
            <li>Live production clients</li>
            <li><code>curl</code> with Authorization headers</li>
            <li>MCP client libraries</li>
            <li>OAuth testing tools like Postman</li>
          </ul>
          <p><strong>Example request:</strong></p>
          <textarea readonly id="token-curl" style="width: 100%; height: 80px; margin-top: 8px; font-family: monospace; font-size: 12px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; background: #f8f9fa;">
curl -X POST https://mcp-oauth-ex1.val.run/mcp \\
  -H "Authorization: Bearer test_access_token_abc" \\
  -H "Content-Type: application/json" \\
  -H 'Accept: application/json, text/event-stream' \\
  -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}'</textarea>
        </div>

        <h2>📖 Documentation</h2>
        <p>For more information about MCP and OAuth:</p>
        <ul>
          <li><a href="https://modelcontextprotocol.io/specification/2025-03-26/basic/authorization" target="_blank">Model Context Protocol Documentation</a></li>
          <li><a href="https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1" target="_blank">OAuth 2.1 Specification</a></li>
          <li><a href="https://datatracker.ietf.org/doc/rfc9728/" target="_blank">OAuth 2.0 Protected Resource Metadata</a></li>
          <li><a href="https://github.com/pcarleton/mcp-oauth-examples" target="_blank">Source Code on GitHub</a></li>
        </ul>

        <hr style="margin-top: 3rem; border: none; border-top: 1px solid #e9ecef;">
        <p style="text-align: center; color: #999; font-size: 0.9rem;">
          Built with Val Town | <a href="https://val.town" target="_blank" style="color: #667eea;">val.town</a>
        </p>
      </div>
    </body>
    </html>
  `;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
