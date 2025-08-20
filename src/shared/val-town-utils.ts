/**
 * For Val Town deployment, we'll need to install fetch-to-node package
 * But for local development, we'll create a compatible implementation
 */

// Simple implementation that mimics fetch-to-node for local dev
// In Val Town, replace with: import { toReqRes, toFetchResponse } from "npm:fetch-to-node";

export function toReqRes(request: Request) {
  // Create Node.js-like req and res objects from Fetch Request
  const req = request as any;
  
  // Create a mock response object compatible with StreamableHTTPServerTransport
  const res = {
    headers: new Headers(),
    statusCode: 200,
    statusMessage: 'OK',
    setHeader(name: string, value: string) {
      this.headers.set(name, value);
      return this;
    },
    writeHead(statusCode: number, statusMessage?: string, headers?: any) {
      this.statusCode = statusCode;
      if (statusMessage) this.statusMessage = statusMessage;
      if (headers) {
        Object.entries(headers).forEach(([k, v]) => {
          this.headers.set(k, v as string);
        });
      }
      return this;
    },
    write(chunk: any) {
      if (!this.body) {
        this.body = [];
      }
      this.body.push(chunk);
      return true;
    },
    end(data?: any) {
      if (data) {
        this.write(data);
      }
      this.ended = true;
      // Emit close event after a tick
      setTimeout(() => this.emit('close'), 0);
    },
    on(event: string, listener: Function) {
      if (!this.listeners) {
        this.listeners = {};
      }
      if (!this.listeners[event]) {
        this.listeners[event] = [];
      }
      this.listeners[event].push(listener);
      return this;
    },
    emit(event: string, ...args: any[]) {
      if (this.listeners && this.listeners[event]) {
        this.listeners[event].forEach((listener: Function) => listener(...args));
      }
    },
    body: [] as any[],
    ended: false,
    listeners: {} as Record<string, Function[]>
  };

  return { req, res };
}

export function toFetchResponse(res: any): Response {
  let body = '';
  if (res.body && res.body.length > 0) {
    body = res.body.map((chunk: any) => {
      if (typeof chunk === 'string') return chunk;
      if (chunk instanceof Buffer) return chunk.toString();
      return JSON.stringify(chunk);
    }).join('');
  }

  return new Response(body, {
    status: res.statusCode || 200,
    headers: res.headers
  });
}