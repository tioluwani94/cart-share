// Local-only design harness. Serves this directory, never the application or .env.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, sep, extname } from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.webp':'image/webp', '.ttf':'font/ttf', '.md':'text/plain; charset=utf-8' };
http.createServer(async (req,res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/__ready') {
      console.log(`Harness running: ${/iPhone/.test(req.headers['user-agent'] || '') ? 'iPhone' : 'browser'} · variant ${url.searchParams.get('v') || '1'}`);
      res.writeHead(204, { 'Cache-Control':'no-store' }); res.end(); return;
    }
    let file = resolve(root, '.' + decodeURIComponent(url.pathname));
    if (file !== root.slice(0,-1) && !file.startsWith(root.endsWith(sep) ? root : root + sep)) throw new Error('outside root');
    if ((await stat(file)).isDirectory()) file = resolve(file,'index.html');
    const type = types[extname(file)];
    if (!type) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type':type, 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer' });
    res.end(req.method === 'HEAD' ? undefined : await readFile(file));
    if (url.pathname === '/' || url.pathname === '/index.html') console.log(`Prototype opened: ${/iPhone/.test(req.headers['user-agent'] || '') ? 'iPhone' : 'browser'} · variant ${url.searchParams.get('v') || '1'}`);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(8788,'0.0.0.0',() => console.log('Pantry prototype ready on port 8788. Demo data only.'));
