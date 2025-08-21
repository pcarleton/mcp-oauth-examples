// Browser-based MCP OAuth Client for Val.town
// This client demonstrates OAuth authentication flow with an MCP server

async function handleRequest(req: Request): Promise<Response> {
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

  // Get SDK version from query param or default
  const sdkVersion = url.searchParams.get('sdk') || 'latest';
  const customSdkUrl = url.searchParams.get('customSdk') || '';

  // Determine the SDK base URL
  let sdkBaseUrl= `https://esm.sh/@modelcontextprotocol/sdk@${sdkVersion}`

  // Main client page
  return new Response(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>MCP OAuth Workbench</title>
        <style>
          body {
            font-family: 'SF Mono', Monaco, 'Courier New', monospace;
            margin: 0;
            padding: 0;
            background: #1e1e1e;
            color: #cccccc;
            min-height: 100vh;
          }
          .container {
            background: #252526;
            border: 1px solid #3c3c3c;
            height: 100vh;
            display: flex;
            flex-direction: column;
          }
          .header {
            background: #2d2d30;
            border-bottom: 1px solid #3c3c3c;
            padding: 10px 20px;
            display: flex;
            align-items: center;
            gap: 20px;
          }
          h1 {
            color: #cccccc;
            font-size: 14px;
            font-weight: normal;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .main-content {
            flex: 1;
            display: flex;
            overflow: hidden;
          }
          .sidebar {
            width: 350px;
            border-right: 1px solid #3c3c3c;
            padding: 20px;
            overflow-y: auto;
            background: #1e1e1e;
          }
          .input-group {
            margin-bottom: 20px;
          }
          label {
            display: block;
            margin-bottom: 6px;
            color: #969696;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          input, select {
            width: 100%;
            padding: 6px 8px;
            background: #3c3c3c;
            border: 1px solid #464647;
            color: #cccccc;
            font-size: 12px;
            font-family: inherit;
          }
          input:focus, select:focus {
            outline: none;
            border-color: #007acc;
            background: #2d2d30;
          }
          select {
            cursor: pointer;
          }
          .button-group {
            display: flex;
            gap: 8px;
            margin-top: 20px;
          }
          button {
            background: #0e639c;
            color: white;
            padding: 6px 12px;
            border: none;
            font-size: 11px;
            font-family: inherit;
            cursor: pointer;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          button:hover:not(:disabled) {
            background: #1177bb;
          }
          button:disabled {
            background: #3c3c3c;
            color: #666;
            cursor: not-allowed;
          }
          button.secondary {
            background: #3c3c3c;
            color: #cccccc;
          }
          button.secondary:hover:not(:disabled) {
            background: #464647;
          }
          .log-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: #1e1e1e;
          }
          .log-header {
            background: #2d2d30;
            border-bottom: 1px solid #3c3c3c;
            padding: 8px 20px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #969696;
          }
          .log {
            flex: 1;
            overflow-y: auto;
            padding: 10px 20px;
            font-size: 12px;
            font-family: 'SF Mono', Monaco, 'Courier New', monospace;
          }
          .log-entry {
            margin-bottom: 4px;
            display: flex;
            align-items: start;
            gap: 10px;
            line-height: 1.4;
          }
          .log-entry .time {
            color: #6a737d;
            font-size: 11px;
            white-space: nowrap;
          }
          .log-entry .message {
            flex: 1;
          }
          .log-entry.info .message {
            color: #cccccc;
          }
          .log-entry.success .message {
            color: #89d185;
          }
          .log-entry.error .message {
            color: #f48771;
          }
          .log-entry.auth .message {
            color: #dcdcaa;
          }
          .status {
            display: inline-block;
            padding: 2px 6px;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-left: auto;
            border: 1px solid;
          }
          .status.connected {
            color: #89d185;
            border-color: #89d185;
          }
          .status.disconnected {
            color: #f48771;
            border-color: #f48771;
          }
          .status.connecting {
            color: #dcdcaa;
            border-color: #dcdcaa;
          }
          .sdk-info {
            margin-top: 10px;
            padding: 8px;
            background: #2d2d30;
            border: 1px solid #3c3c3c;
            font-size: 10px;
            color: #969696;
            word-break: break-all;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>MCP OAuth Workbench</h1>
            <span id="status" class="status disconnected">Disconnected</span>
          </div>
          <div class="main-content">
            <div class="sidebar">
              <div class="input-group">
                <label for="serverSelect">Server Endpoint</label>
                <select id="serverSelect">
                  <option value="https://mcp-oauth-ex1.val.run/mcp">Example Server 1 (PRM Root)</option>
                  <option value="https://mcp-oauth-ex2.val.run/mcp">Example Server 2 (PRM Path)</option>
                  <option value="https://mcp-oauth-ex3.val.run/mcp">Example Server 3 (PRM custom w/ www-authenticate)</option>
                  <option value="custom">Custom URL...</option>
                </select>
              </div>

              <div class="input-group" id="customUrlGroup" style="display: none;">
                <label for="customUrl">Custom Server URL</label>
                <input
                  type="text"
                  id="customUrl"
                  placeholder="https://your-mcp-server.val.run/mcp"
                />
              </div>

              <div class="input-group">
                <label for="sdkSelect">SDK Version</label>
                <select id="sdkSelect">
                ${(() => {
                  const versions = ['latest', '1.17.3', '1.17.2', '1.17.1', '1.17.0', '1.16.0', '1.15.1', '1.15.0', '1.14.0', '1.13.3', '1.13.2'];
                  return versions.map(version => {
                    const isSelected = sdkVersion === version ? 'selected' : '';
                      const label = version === 'latest' ? '@modelcontextprotocol/sdk@latest' : `@modelcontextprotocol/sdk@${version}`;
                      return `<option value="${version}" ${isSelected}>${label}</option>`;
                    }).join('\n                  ');
                  })()}
                </select>
              </div>

              <div class="input-group" id="customSdkGroup" style="${customSdkUrl ? '' : 'display: none;'}">
                <label for="customSdk">Custom SDK URL</label>
                <input
                  type="text"
                  id="customSdk"
                  placeholder="https://esm.sh/@your/sdk@version"
                  value="${customSdkUrl}"
                />
              </div>

              <div class="sdk-info">
                Current SDK: ${sdkBaseUrl}
              </div>

              <div class="input-group">
                <label for="callbackUrl">OAuth Callback URL</label>
                <input
                  type="text"
                  id="callbackUrl"
                  value="${url.origin}/callback"
                  readonly
                />
              </div>

              <div class="button-group">
                <button id="connectBtn">Connect</button>
                <button id="listToolsBtn" disabled>List Tools</button>
                <button id="disconnectBtn" class="secondary" disabled>Disconnect</button>
                <button id="clearLogBtn" class="secondary">Clear Log</button>
              </div>
            </div>
            <div class="log-container">
              <div class="log-header">Console Output</div>
              <div class="log" id="log"></div>
            </div>
          </div>
        </div>

        <script type="module">
          // Import MCP SDK dynamically based on selection
          import { Client } from '${sdkBaseUrl}/dist/esm/client';
          import { StreamableHTTPClientTransport } from '${sdkBaseUrl}/dist/esm/client/streamableHttp';
          import { UnauthorizedError } from '${sdkBaseUrl}/dist/esm/client/auth';

          // OAuth Provider implementation for browser
          class BrowserOAuthProvider {
            constructor(redirectUrl, clientMetadata) {
              this._redirectUrl = redirectUrl;
              this._clientMetadata = clientMetadata;
              this._clientInformation = null;
              this._tokens = null;
              this._codeVerifier = null;
              this._authCode = null;
            }

            get redirectUrl() {
              return this._redirectUrl;
            }

            get clientMetadata() {
              return this._clientMetadata;
            }

            clientInformation() {
              return this._clientInformation;
            }

            saveClientInformation(clientInformation) {
              this._clientInformation = clientInformation;
            }

            tokens() {
              return this._tokens;
            }

            saveTokens(tokens) {
              this._tokens = tokens;
              window.log('Tokens saved successfully', 'auth');
            }

            async redirectToAuthorization(authorizationUrl) {
              window.log('Opening authorization window...', 'auth');

              return new Promise((resolve, reject) => {
                // Open auth window
                const authWindow = window.open(authorizationUrl.toString(), '_blank', 'width=600,height=700');

                // Listen for callback
                const messageHandler = (event) => {
                  if (event.data.type === 'oauth_callback') {
                    window.log('Received authorization code', 'auth');
                    this._authCode = event.data.code;
                    window.removeEventListener('message', messageHandler);
                    resolve();
                  }
                };

                window.addEventListener('message', messageHandler);

                // Timeout after 5 minutes
                setTimeout(() => {
                  window.removeEventListener('message', messageHandler);
                  reject(new Error('Authorization timeout'));
                }, 300000);
              });
            }

            async getAuthCode() {
              if (this._authCode) {
                return this._authCode;
              }
              throw new Error('No authorization code');
            }

            saveCodeVerifier(codeVerifier) {
              this._codeVerifier = codeVerifier;
            }

            codeVerifier() {
              if (!this._codeVerifier) {
                throw new Error('No code verifier saved');
              }
              return this._codeVerifier;
            }
          }

          let client = null;
          let transport = null;
          let oauthProvider = null;

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

          // Save preferences to localStorage
          function savePreferences() {
            const serverSelect = document.getElementById('serverSelect');
            const customUrl = document.getElementById('customUrl').value;

            localStorage.setItem('mcp_server_select', serverSelect.value);
            if (serverSelect.value === 'custom') {
              localStorage.setItem('mcp_custom_url', customUrl);
            }
          }

          // Load preferences from localStorage
          function loadPreferences() {
            const savedServer = localStorage.getItem('mcp_server_select');
            const savedCustomUrl = localStorage.getItem('mcp_custom_url');

            if (savedServer) {
              document.getElementById('serverSelect').value = savedServer;
              if (savedServer === 'custom') {
                document.getElementById('customUrlGroup').style.display = 'block';
                if (savedCustomUrl) {
                  document.getElementById('customUrl').value = savedCustomUrl;
                }
              }
            }
          }

          // Handle server selection change
          document.getElementById('serverSelect').addEventListener('change', function(e) {
            const customUrlGroup = document.getElementById('customUrlGroup');
            if (e.target.value === 'custom') {
              customUrlGroup.style.display = 'block';
            } else {
              customUrlGroup.style.display = 'none';
            }
            savePreferences();
          });

          // Handle custom URL change
          document.getElementById('customUrl').addEventListener('change', savePreferences);

          // Handle SDK selection change
          document.getElementById('sdkSelect').addEventListener('change', function(e) {
            const customSdkGroup = document.getElementById('customSdkGroup');
            if (e.target.value === 'custom-sdk') {
              customSdkGroup.style.display = 'block';
            } else {
              customSdkGroup.style.display = 'none';
            }

            // Reload the page with the new SDK version
            const url = new URL(window.location.href);
            if (e.target.value === 'custom-sdk') {
              const customSdk = document.getElementById('customSdk').value;
              if (customSdk) {
                url.searchParams.set('customSdk', customSdk);
                url.searchParams.delete('sdk');
              } else {
                log('Please enter a custom SDK URL first', 'error');
                return;
              }
            } else {
              url.searchParams.set('sdk', e.target.value);
              url.searchParams.delete('customSdk');
            }

            log('Reloading with new SDK version...', 'info');
            setTimeout(() => {
              window.location.href = url.toString();
            }, 500);
          });

          // Handle custom SDK URL change
          document.getElementById('customSdk').addEventListener('change', function(e) {
            if (document.getElementById('sdkSelect').value === 'custom-sdk') {
              const url = new URL(window.location.href);
              url.searchParams.set('customSdk', e.target.value);
              url.searchParams.delete('sdk');

              log('Reloading with custom SDK...', 'info');
              setTimeout(() => {
                window.location.href = url.toString();
              }, 500);
            }
          });

          window.connectToServer = async function() {
            const serverSelect = document.getElementById('serverSelect');
            const callbackUrl = document.getElementById('callbackUrl').value;

            let serverUrl;
            if (serverSelect.value === 'custom') {
              serverUrl = document.getElementById('customUrl').value;
              if (!serverUrl) {
                log('Please enter a custom server URL', 'error');
                return;
              }
            } else {
              serverUrl = serverSelect.value;
            }

            const connectBtn = document.getElementById('connectBtn');
            const listToolsBtn = document.getElementById('listToolsBtn');
            const disconnectBtn = document.getElementById('disconnectBtn');

            connectBtn.disabled = true;
            setStatus('connecting');

            try {
              log('Initializing MCP client...', 'info');
              log('Using SDK: ${sdkBaseUrl}', 'info');

              // Set up OAuth provider
              const clientMetadata = {
                client_name: 'Browser Test Client',
                redirect_uris: [callbackUrl],
                grant_types: ['authorization_code', 'refresh_token'],
                response_types: ['code'],
                token_endpoint_auth_method: 'none',
                scope: 'mcp'
              };

              oauthProvider = new BrowserOAuthProvider(callbackUrl, clientMetadata);

              // Create the client
              client = new Client({
                name: 'browser-oauth-client',
                version: '1.0.0'
              }, {
                capabilities: {}
              });

              // Create transport with OAuth provider
              transport = new StreamableHTTPClientTransport(
                new URL(serverUrl),
                {
                  authProvider: oauthProvider
                }
              );

              // Try to connect - handle OAuth if needed
              try {
                log('Connecting to server: ' + serverUrl, 'info');
                await client.connect(transport);
                log('Successfully connected to MCP server!', 'success');
                setStatus('connected');
              } catch (error) {
                // TODO: why is this instanceof not working
                if (error instanceof UnauthorizedError || error.message == 'Unauthorized') {
                  log('OAuth required - handling authorization...', 'auth');

                  // The provider will automatically fetch the auth code
                  const authCode = await oauthProvider.getAuthCode();

                  // Complete the auth flow
                  await transport.finishAuth(authCode);

                  // Close the old transport
                  await transport.close();

                  // Create a new transport with the authenticated provider
                  transport = new StreamableHTTPClientTransport(
                    new URL(serverUrl),
                    {
                      authProvider: oauthProvider
                    }
                  );

                  // Connect with the new transport
                  await client.connect(transport);
                  log('Successfully connected with authentication!', 'success');
                  setStatus('connected');
                } else {
                  throw error;
                }
              }

              connectBtn.disabled = true;
              listToolsBtn.disabled = false;
              disconnectBtn.disabled = false;

              savePreferences();
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
            oauthProvider = null;

            setStatus('disconnected');
            document.getElementById('connectBtn').disabled = false;
            document.getElementById('listToolsBtn').disabled = true;
            document.getElementById('disconnectBtn').disabled = true;
          }

          // Clear log function
          window.clearLog = function() {
            const logDiv = document.getElementById('log');
            logDiv.innerHTML = '';
            log('Log cleared', 'info');
          }

          // Load saved preferences
          loadPreferences();

          // Initial log entry
          log('MCP OAuth Workbench ready', 'info');
          log('SDK loaded: ${sdkBaseUrl}', 'info');

          // Attach event listeners
          document.getElementById('connectBtn').addEventListener('click', connectToServer);
          document.getElementById('listToolsBtn').addEventListener('click', listTools);
          document.getElementById('disconnectBtn').addEventListener('click', disconnect);
          document.getElementById('clearLogBtn').addEventListener('click', clearLog);
        </script>
      </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html' }
  });
}

// For Val Town deployment
export default handleRequest;

// For local development
if (import.meta.main) {
  const port = parseInt(Deno.env.get("PORT") || "8000");
  console.log(`Starting OAuth client server on http://localhost:${port}`);
  console.log(`Open your browser to http://localhost:${port} to use the client`);

  Deno.serve({ port }, handleRequest);
}
