// Chrome ou Edge escondido, controlado pelo protocolo do DevTools, mais um servidor estático para o app.
// Usado pelos testes de tela (e2e.mjs) e pelas capturas da loja (store-assets.mjs).
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';

export const sleep = ms => new Promise(r => setTimeout(r, ms));

export function findBrowser() {
  const pf = process.env['ProgramFiles'] || 'C:\\Program Files', pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', local = process.env.LOCALAPPDATA || '';
  return [process.env.CHROME_PATH, join(pf, 'Google/Chrome/Application/chrome.exe'), join(pf86, 'Google/Chrome/Application/chrome.exe'), join(local, 'Google/Chrome/Application/chrome.exe'),
    join(pf86, 'Microsoft/Edge/Application/msedge.exe'), join(pf, 'Microsoft/Edge/Application/msedge.exe'),
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/opt/google/chrome/chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'].filter(Boolean).find(existsSync) || null;
}

export function serve(dir) { // servidor estático mínimo numa porta livre
  const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
  const srv = createServer((req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
      const file = normalize(join(dir, p)); if (!file.startsWith(normalize(dir)) || !existsSync(file)) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(readFileSync(file));
    } catch (e) { res.writeHead(500); res.end(); }
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ port: srv.address().port, url: `http://127.0.0.1:${srv.address().port}/`, close: () => srv.close() })));
}

async function getJson(url, tries = 1) {
  for (let i = 0; ; i++) { try { return await (await fetch(url)).json(); } catch (e) { if (i >= tries) throw e; await sleep(300); } }
}

function connect(url) { // cliente do protocolo do DevTools sobre o WebSocket do Node
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url), pending = new Map(), waiters = []; let id = 0;
    ws.onopen = () => resolve({
      send: (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); }),
      wait: event => new Promise(res => waiters.push({ event, res })),
      close: () => ws.close()
    });
    ws.onmessage = e => {
      const m = JSON.parse(String(e.data));
      if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result || {}); }
      else if (m.method) for (let i = waiters.length - 1; i >= 0; i--) if (waiters[i].event === m.method) { waiters[i].res(m.params); waiters.splice(i, 1); }
    };
    ws.onerror = () => reject(new Error('não conectou ao navegador'));
  });
}

// Abre o navegador escondido e devolve {cdp, close}. width x height em px de CSS; scale multiplica para a foto.
export async function launch({ width = 360, height = 640, scale = 1, mobile = true } = {}) {
  const exe = findBrowser();
  if (!exe) return null;
  const port = 9300 + Math.floor(Math.random() * 500), profile = join(tmpdir(), 'violao-diario-headless-' + process.pid + '-' + port);
  const args = ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--lang=pt-BR', `--window-size=${width},${height}`, '--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'];
  if (process.platform === 'linux') args.push('--no-sandbox', '--disable-dev-shm-usage');
  const proc = spawn(exe, args.concat('about:blank'), { stdio: 'ignore' });
  let cdp = null;
  try {
    await getJson(`http://127.0.0.1:${port}/json/version`, 50);
    const page = (await getJson(`http://127.0.0.1:${port}/json`, 10)).find(t => t.type === 'page');
    cdp = await connect(page.webSocketDebuggerUrl);
    await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile });
    if (mobile) await cdp.send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36', acceptLanguage: 'pt-BR' });
  } catch (e) { proc.kill(); rmSync(profile, { recursive: true, force: true }); throw e; }
  return {
    cdp,
    async goto(url) { const loaded = cdp.wait('Page.loadEventFired'); await cdp.send('Page.navigate', { url }); await loaded; },
    // Avalia uma expressão na página e devolve o valor (promessas são esperadas). Erro na página vira exceção aqui.
    async eval(expression) {
      const r = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text || 'erro na página');
      return r.result && r.result.value;
    },
    async close() { try { await cdp.send('Browser.close'); } catch (e) {} try { cdp.close(); } catch (e) {} proc.kill(); await sleep(300); rmSync(profile, { recursive: true, force: true }); }
  };
}
