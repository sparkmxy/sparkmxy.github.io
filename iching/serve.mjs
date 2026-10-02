import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// A local preview only: expose the three public module directories, never secrets.
const roots = Object.fromEntries(await Promise.all(['iching','tarot','divination'].map(async name=>
  [name, await realpath(fileURLToPath(new URL(`../${name}/`, import.meta.url)))])));
const port = Number(process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new RangeError('PORT 必须为 1 至 65535 之间的整数。');
}

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

function insideRoot(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
}

const server = createServer(async (request, response) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Cache-Control', 'no-store');
  const reply = (status, message) => {
    response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(request.method === 'HEAD' ? undefined : message);
  };

  if (!['GET', 'HEAD'].includes(request.method)) {
    response.setHeader('Allow', 'GET, HEAD');
    reply(405, 'Method not allowed');
    return;
  }

  let url;
  let pathname;
  try {
    url = new URL(request.url, 'http://127.0.0.1');
    pathname = decodeURIComponent(url.pathname);
  } catch {
    reply(400, 'Invalid URL');
    return;
  }
  if (pathname === '/' || ['/iching','/tarot'].includes(pathname)) {
    response.writeHead(302, { Location: pathname === '/tarot' ? '/tarot/' : '/iching/' });
    response.end();
    return;
  }
  const directory = pathname.split('/')[1];
  const root = Object.hasOwn(roots, directory) ? roots[directory] : null;
  if (!root || /[\\\u0000]/.test(pathname)) {
    reply(404, 'Not found');
    return;
  }

  const parts = pathname.slice(directory.length + 2).split('/');
  if (parts.some(part => part.startsWith('.') || part.includes(':'))) {
    reply(404, 'Not found');
    return;
  }
  let target = path.resolve(root, ...parts);
  if (!insideRoot(root, target)) {
    reply(404, 'Not found');
    return;
  }

  try {
    target = await realpath(target);
    if (!insideRoot(root, target)) {
      reply(404, 'Not found');
      return;
    }
    if ((await stat(target)).isDirectory()) {
      if (!pathname.endsWith('/')) {
        response.writeHead(302, { Location: `${url.pathname}/${url.search}` });
        response.end();
        return;
      }
      target = await realpath(path.join(target, 'index.html'));
      if (!insideRoot(root, target)) {
        reply(404, 'Not found');
        return;
      }
    }
    if (!(await stat(target)).isFile()) {
      reply(404, 'Not found');
      return;
    }
    const contents = await readFile(target);
    response.writeHead(200, {
      'Content-Type': types[path.extname(target).toLowerCase()] || 'application/octet-stream',
      'Content-Length': contents.length,
    });
    response.end(request.method === 'HEAD' ? undefined : contents);
  } catch (error) {
    reply(['ENOENT', 'ENOTDIR', 'EACCES', 'EPERM'].includes(error.code) ? 404 : 500, 'File unavailable');
  }
});

server.on('error', error => {
  console.error(`预览服务启动失败：${error.message}`);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  console.log(`周易 · 蓍草占筮： http://127.0.0.1:${port}/iching/`);
  console.log(`星镜 · 塔罗占卜： http://127.0.0.1:${port}/tarot/`);
  console.log('按 Ctrl+C 停止。');
});
