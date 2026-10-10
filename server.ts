import express, { Request, Response } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApp } from './src/server/app';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

export { createApp };

export async function startServer() {
  const { app, handleWebSocketConnection } = createApp();

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    handleWebSocketConnection(ws, req);
  });

  // Frontend Serving
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  return new Promise<http.Server>((resolve, reject) => {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`KAMPASS Full-Stack Server running on http://0.0.0.0:${PORT} [${isProd ? 'production' : 'development'}]`);
      resolve(server);
    });
    server.on('error', reject);
  });
}

// Only auto-start if run directly
const isMain = process.argv[1] && (process.argv[1] === __filename || process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js'));
if (isMain || process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
