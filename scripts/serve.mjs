import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PORT || 8000);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
http.createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const relative = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
    if (relative !== 'index.html' && !relative.startsWith('assets/') && !relative.startsWith('templates/')) throw new Error('Not found');
    const target = path.resolve(root, relative);
    if (!target.startsWith(root) || !(await stat(target)).isFile()) throw new Error('Not found');
    res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' });
    res.end(await readFile(target));
  } catch { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('找不到頁面'); }
}).listen(port, '127.0.0.1', () => console.log(`Local: http://localhost:${port}`));
