// Browser-based MCP OAuth Client for Val.town
// This client demonstrates OAuth authentication flow with an MCP server

export default async function (req: Request): Promise<Response> {
  const url = new URL(req.url);

  // Handle OAuth callback
  if (url.pathname === '/callback') {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>OAuth Callback</title>
          <script>
            // Post message back to the opener window
            if (window.opener) {
              window.opener.postMessage({
                type: 'oauth_callback',
                code: '${code}',
                state: '${state}'
              }, '*');
              setTimeout(() => window.close(), 1000);
            }
          </script>
        </head>
        <body>
          <h1>Authorization successful!</h1>
          <p>This window will close automatically...</p>
          <p>Code: ${code}</p>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  // Main client page
  return new Response(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>MCP OAuth Client</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
          }
          .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          }
          h1 {
            color: #333;
            margin-bottom: 30px;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .input-group {
            margin-bottom: 25px;
          }
          label {
            display: block;
            margin-bottom: 8px;
            color: #555;
            font-weight: 500;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          input {
            width: 100%;
            padding: 12px;
            border: 2px solid #e1e4e8;
            border-radius: 6px;
            font-size: 14px;
            transition: border-color 0.2s;
          }
          input:focus {
            outline: none;
            border-color: #667eea;
          }
          .button-group {
            display: flex;
            gap: 10px;
            margin-top: 30px;
          }
          button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
          }
          button:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
          }
          button:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
          }
          .log {
            background: #f6f8fa;
            border: 1px solid #e1e4e8;
            border-radius: 6px;
            padding: 20px;
            margin-top: 30px;
            max-height: 400px;
            overflow-y: auto;
            font-family: 'SF Mono', Monaco, 'Courier New', monospace;
            font-size: 13px;
          }
          .log-entry {
            margin-bottom: 8px;
            padding: 8px;
            border-left: 3px solid transparent;
            background: white;
            border-radius: 3px;
            display: flex;
            align-items: start;
            gap: 10px;
          }
          .log-entry .time {
            color: #6a737d;
            font-size: 11px;
            white-space: nowrap;
          }
          .log-entry .message {
            flex: 1;
          }
          .log-entry.info {
            border-left-color: #0366d6;
          }
          .log-entry.success {
            border-left-color: #28a745;
            background: #f0fff4;
          }
          .log-entry.error {
            border-left-color: #dc3545;
            background: #ffeef0;
          }
          .log-entry.auth {
            border-left-color: #ffc107;
            background: #fffbf0;
          }
          .status {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-left: auto;
          }
          .status.connected {
            background: #d4edda;
            color: #155724;
          }
          .status.disconnected {
            background: #f8d7da;
            color: #721c24;
          }
          .status.connecting {
            background: #fff3cd;
            color: #856404;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>
            = MCP OAuth Client Demo
            <span id="status" class="status disconnected">Disconnected</span>
          </h1>

          <div class="input-group">
            <label for="serverUrl">MCP Server URL</label>
            <input
              type="text"
              id="serverUrl"
              placeholder="https://your-mcp-server.val.run"
              value="https://mcp-oauth-ex1.val.run/mcp"
            />
          </div>

          <div class="input-group">
            <label for="callbackUrl">OAuth Callback URL</label>
            <input
              type="text"
              id="callbackUrl"
              placeholder="https://your-client.val.run/callback"
              value="${url.origin}/callback"
              readonly
            />
          </div>

          <div class="button-group">
            <button id="connectBtn">Connect to Server</button>
            <button id="listToolsBtn" disabled>List Tools</button>
            <button id="disconnectBtn" disabled>Disconnect</button>
          </div>

          <div class="log" id="log"></div>
        </div>

        <script type="module">
          // Import MCP SDK from esm.sh with direct dist/esm paths
          import { Client } from 'https://esm.sh/@modelcontextprotocol/sdk@1.17.2/dist/esm/client';
          import { StreamableHTTPClientTransport } from 'https://esm.sh/@modelcontextprotocol/sdk@1.17.2/dist/esm/client/streamableHttp';

          let client = null;
          let transport = null;
          let authTokens = null;

          window.log = function(message, type = 'info') {
            const logDiv = document.getElementById('log');
            const entry = document.createElement('div');
            entry.className = 'log-entry ' + type;

            const time = document.createElement('span');
            time.className = 'time';
            time.textContent = new Date().toLocaleTimeString();

            const msg = document.createElement('span');
            msg.className = 'message';
            msg.textContent = message;

            entry.appendChild(time);
            entry.appendChild(msg);
            logDiv.appendChild(entry);
            logDiv.scrollTop = logDiv.scrollHeight;
          }

          window.setStatus = function(status) {
            const statusEl = document.getElementById('status');
            statusEl.className = 'status ' + status;
            statusEl.textContent = status.charAt(0).toUpperCase() + status.slice(1);
          }

          window.connectToServer = async function() {
            const serverUrl = document.getElementById('serverUrl').value;
            const callbackUrl = document.getElementById('callbackUrl').value;

            if (!serverUrl) {
              log('Please enter a server URL', 'error');
              return;
            }

            const connectBtn = document.getElementById('connectBtn');
            const listToolsBtn = document.getElementById('listToolsBtn');
            const disconnectBtn = document.getElementById('disconnectBtn');

            connectBtn.disabled = true;
            setStatus('connecting');

            try {
              log('Initializing MCP client...', 'info');

              // Create the client
              client = new Client({
                name: 'browser-oauth-client',
                version: '1.0.0'
              }, {
                capabilities: {}
              });

              // Create transport with OAuth configuration
              transport = new StreamableHTTPClientTransport(
                new URL(serverUrl),
                {
                  oauth: {
                    clientId: 'browser-client',
                    redirectUri: callbackUrl,
                    scope: 'mcp',
                    authorizationUrl: serverUrl + '/oauth/authorize',
                    tokenUrl: serverUrl + '/oauth/token',
                    onAuthorizationRequest: async (authUrl) => {
                      log('Opening authorization window...', 'auth');

                      return new Promise((resolve, reject) => {
                        // Open auth window
                        const authWindow = window.open(authUrl, '_blank', 'width=600,height=700');

                        // Listen for callback
                        const messageHandler = (event) => {
                          if (event.data.type === 'oauth_callback') {
                            log('Received authorization code', 'auth');
                            window.removeEventListener('message', messageHandler);
                            resolve(event.data.code);
                          }
                        };

                        window.addEventListener('message', messageHandler);

                        // Timeout after 5 minutes
                        setTimeout(() => {
                          window.removeEventListener('message', messageHandler);
                          reject(new Error('Authorization timeout'));
                        }, 300000);
                      });
                    },
                    onTokensReceived: (tokens) => {
                      authTokens = tokens;
                      log('Received access tokens', 'auth');
                    }
                  }
                }
              );

              log('Connecting to server...', 'info');
              await client.connect(transport);

              log('Successfully connected to MCP server!', 'success');
              setStatus('connected');

              connectBtn.disabled = true;
              listToolsBtn.disabled = false;
              disconnectBtn.disabled = false;

              // Get server info
              const serverInfo = client.getServerInfo();
              if (serverInfo) {
                log(\`Server: \${serverInfo.name} v\${serverInfo.version}\`, 'info');
              }

            } catch (error) {
              log('Connection error: ' + error.message, 'error');
              setStatus('disconnected');
              connectBtn.disabled = false;
            }
          }

          window.listTools = async function() {
            if (!client) {
              log('Not connected to server', 'error');
              return;
            }

            try {
              log('Fetching available tools...', 'info');
              const result = await client.listTools();

              if (result.tools && result.tools.length > 0) {
                log(\`Found \${result.tools.length} tools:\`, 'success');
                result.tools.forEach(tool => {
                  log(\`  " \${tool.name}: \${tool.description}\`, 'info');
                });
              } else {
                log('No tools available', 'info');
              }
            } catch (error) {
              log('Error listing tools: ' + error.message, 'error');
            }
          }

          window.disconnect = async function() {
            if (transport) {
              try {
                log('Disconnecting...', 'info');
                await transport.close();
                log('Disconnected from server', 'success');
              } catch (error) {
                log('Error disconnecting: ' + error.message, 'error');
              }
            }

            client = null;
            transport = null;
            authTokens = null;

            setStatus('disconnected');
            document.getElementById('connectBtn').disabled = false;
            document.getElementById('listToolsBtn').disabled = true;
            document.getElementById('disconnectBtn').disabled = true;
          }

          // Initial log entry
          log('MCP OAuth Client ready. Enter a server URL to connect.', 'info');

          // Attach event listeners
          document.getElementById('connectBtn').addEventListener('click', connectToServer);
          document.getElementById('listToolsBtn').addEventListener('click', listTools);
          document.getElementById('disconnectBtn').addEventListener('click', disconnect);
        </script>
      </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html' }
  });
}
