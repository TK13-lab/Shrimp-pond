import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = fileURLToPath(new URL('.', import.meta.url));
const rootDir = resolve(currentDir, '..');
const requestedPort = Number(process.env.PORT ?? 8080);

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml']
]);

startServer(requestedPort, 0);

function startServer(port, attempt) {
  const server = createServer(async (request, response) => {
    const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host}`);
    const safePath = normalize(decodeURIComponent(requestUrl.pathname)).replace(
      /^(\.\.[/\\])+/,
      ''
    );
    const requestedFile = safePath === '/' ? '/index.html' : safePath;
    const filePath = join(rootDir, requestedFile);

    if (!filePath.startsWith(rootDir)) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }

    try {
      const fileStat = await stat(filePath);

      if (!fileStat.isFile()) {
        response.writeHead(404);
        response.end('Not found');
        return;
      }

      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type':
          contentTypes.get(extname(filePath)) ?? 'application/octet-stream'
      });
      createReadStream(filePath).pipe(response);
    } catch {
      response.writeHead(404);
      response.end('Not found');
    }
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && attempt < 10) {
      startServer(port + 1, attempt + 1);
      return;
    }

    throw error;
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`Shrimp Pond web portal is running at http://127.0.0.1:${port}`);
  });
}
