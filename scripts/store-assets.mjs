// Gera o material da Play Store em store/: ícone de 512, imagem de destaque de 1024 x 500 e,
// se houver Chrome ou Edge no computador, capturas de tela de 1080 x 1920 do app com um progresso de exemplo.
// Uso: npm run loja
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { C, art, full, render } from './make-icons.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..'), out = join(root, 'store');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const VER = (html.match(/<meta name="app-version" content="([^"]+)"/) || [])[1] || '';
mkdirSync(join(out, 'screenshots'), { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- fonte Archivo em TTF (o resvg não lê woff2): baixada uma vez do Google Fonts ---------- */
async function archivoFonts() {
  const dir = join(root, 'node_modules', '.cache', 'archivo'), files = [500, 800].map(w => join(dir, `archivo-${w}.ttf`));
  if (files.every(existsSync)) return files;
  try {
    mkdirSync(dir, { recursive: true });
    const css = await (await fetch('https://fonts.googleapis.com/css2?family=Archivo:wght@500;800&display=swap', { headers: { 'User-Agent': 'Mozilla/5.0' } })).text();
    for (const m of css.matchAll(/font-weight:\s*(\d+);[\s\S]*?url\((https:[^)]+\.ttf)\)/g)) {
      if (![500, 800].includes(+m[1])) continue;
      writeFileSync(join(dir, `archivo-${m[1]}.ttf`), Buffer.from(await (await fetch(m[2])).arrayBuffer()));
    }
  } catch (e) { console.warn('Fonte Archivo não baixada (' + e.message + '): a imagem de destaque usa uma fonte do sistema.'); }
  return files.filter(existsSync);
}

/* ---------- imagem de destaque: rosácea à direita, nome e frase à esquerda ---------- */
function featureSVG(family) {
  const { defs, g } = art({ cx: 850, cy: 250, k: 200 / 185.5, strings: 330 }), f = `font-family="${family}"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500"><defs>${defs}</defs><rect width="1024" height="500" fill="${C.bg}"/>${g}` +
    `<text x="64" y="212" ${f} font-weight="800" font-size="78" fill="${C.cream}">Violão Diário</text>` +
    `<text x="66" y="276" ${f} font-weight="500" font-size="31" fill="${C.cream}" opacity=".92">Um treino curto por dia,</text>` +
    `<text x="66" y="316" ${f} font-weight="500" font-size="31" fill="${C.cream}" opacity=".92">montado para o seu nível.</text>` +
    `<text x="66" y="392" ${f} font-weight="500" font-size="22" fill="${C.gold}">Metrônomo, afinador, acordes, batidas e teoria</text></svg>`;
}

/* ---------- capturas de tela: Chrome ou Edge escondido, controlado pelo protocolo do DevTools ---------- */
function findBrowser() {
  const pf = process.env['ProgramFiles'] || 'C:\\Program Files', pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', local = process.env.LOCALAPPDATA || '';
  return [join(pf, 'Google/Chrome/Application/chrome.exe'), join(pf86, 'Google/Chrome/Application/chrome.exe'), join(local, 'Google/Chrome/Application/chrome.exe'),
    join(pf86, 'Microsoft/Edge/Application/msedge.exe'), join(pf, 'Microsoft/Edge/Application/msedge.exe'),
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'].find(existsSync) || null;
}
function serve(dir) { // servidor estático mínimo numa porta livre
  const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
  const srv = createServer((req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
      const file = normalize(join(dir, p)); if (!file.startsWith(normalize(dir)) || !existsSync(file)) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(readFileSync(file));
    } catch (e) { res.writeHead(500); res.end(); }
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ port: srv.address().port, close: () => srv.close() })));
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
// Progresso de exemplo: 40 dias com folgas, três pares de trocas medidos, duas músicas e um treino salvo. Nada de nome nem dados reais.
const SEED = `(()=>{try{const d={},now=new Date(),key=t=>t.getFullYear()+'-'+('0'+(t.getMonth()+1)).slice(-2)+'-'+('0'+t.getDate()).slice(-2);
for(let i=0;i<40;i++){if([3,10,17,24,31].includes(i))continue;d[key(new Date(now-i*864e5))]={min:[15,20,12,18,15,25][i%6],done:i?{warm:1,tech:1,rhy:1,chg:1,rep:1}:{warm:1}};}
const chg={};[['G|C',[12,15,18,20,22,24,26]],['Em|Am',[18,22,26,30,33]],['C|D',[10,14,16]]].forEach(([k,a])=>{chg[k]=a.map((n,i)=>({d:key(new Date(now-(a.length-i)*2*864e5)),n}));});
const st={v:1,onboarded:true,name:'',level:2,levelSince:key(new Date(now-30*864e5)),goal:15,days:d,changes:chg,chords:{Em:'dominado',Am:'dominado',C:'aprendendo',G:'aprendendo'},
songs:[{id:'s1',title:'Trem-Bala',chords:'G D Em C',status:'devagar',cifra:''},{id:'s2',title:'Stand by Me',chords:'G Em C D',status:'aprendendo',cifra:''}],
custom:[{id:'t1',name:'Trocas de G, C e D',chords:['G','C','D'],pats:['baixocima'],bpm:66,min:10}],skills:{'1.0':true,'1.1':true,'1.2':true,'1.3':true,'2.0':true},
stats:{tuned:6,play:{},prog4:false},startLevel:1,seenVer:'${VER}',installDismissed:true,bpm:72,beats:4,maxBpm:84};
localStorage.setItem('violao-diario-v1',JSON.stringify(st));}catch(e){}})();`;
const click = s => `{const e=document.querySelector('${s}');if(!e)throw new Error('sem ${s}');e.click();}`;
const nav = v => click(`[data-act="nav"][data-v="${v}"]`), sub = (g, v) => click(`[data-act="sub"][data-g="${g}"][data-v="${v}"]`);
const SHOTS = [
  ['01-hoje', `${nav('hoje')}window.scrollTo(0,0)`],
  ['02-treino', `${nav('hoje')}const b=document.querySelector('.blocks');if(b){b.closest('section').scrollIntoView({block:'start'});window.scrollBy(0,-12);}`],
  ['03-acordes', `${nav('acordes')}${sub('acordes', 'acordes')}${sub('filtro', 'abertos')}window.scrollTo(0,0)`],
  ['04-teoria', `${nav('acordes')}${sub('acordes', 'teoria')}${click('[data-act="th-pick"][data-c="C"]')}document.querySelector('.thname').closest('section').scrollIntoView({block:'start'});window.scrollBy(0,-12)`],
  ['05-batidas', `${nav('treinar')}${sub('treinar', 'batidas')}window.scrollTo(0,0)`],
  ['06-metronomo', `${nav('ferramentas')}${sub('ferramentas', 'metronomo')}window.scrollTo(0,0)`],
  ['07-roteiro', `${nav('evolucao')}${sub('evolucao', 'roteiro')}window.scrollTo(0,0)`],
  ['08-evolucao', `${nav('evolucao')}${sub('evolucao', 'numeros')}window.scrollTo(0,0)`]
];
async function screenshots() {
  const exe = findBrowser();
  if (!exe) { console.warn('Chrome ou Edge não encontrado: as capturas de tela não foram geradas (o resto sim).'); return 0; }
  const srv = await serve(root), port = 9300 + Math.floor(Math.random() * 500), profile = join(tmpdir(), 'violao-diario-loja-' + process.pid);
  const proc = spawn(exe, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--lang=pt-BR', '--window-size=360,640', 'about:blank'], { stdio: 'ignore' });
  let n = 0;
  try {
    await getJson(`http://127.0.0.1:${port}/json/version`, 50);
    const page = (await getJson(`http://127.0.0.1:${port}/json`, 10)).find(t => t.type === 'page');
    const cdp = await connect(page.webSocketDebuggerUrl);
    await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 360, height: 640, deviceScaleFactor: 3, mobile: true });
    await cdp.send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36', acceptLanguage: 'pt-BR' });
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: SEED });
    const loaded = cdp.wait('Page.loadEventFired');
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${srv.port}/` }); await loaded;
    await cdp.send('Runtime.evaluate', { expression: 'document.fonts.ready.then(()=>new Promise(r=>setTimeout(r,800)))', awaitPromise: true });
    // Os avisos de conquista do progresso de exemplo não entram na foto.
    await cdp.send('Runtime.evaluate', { expression: 'document.head.insertAdjacentHTML("beforeend","<style>#toast{display:none!important}</style>")' });
    for (const [name, script] of SHOTS) {
      const r = await cdp.send('Runtime.evaluate', { expression: `(()=>{${script};return 'ok';})()`, returnByValue: true });
      if (r.exceptionDetails) { console.warn(`${name}: ${r.exceptionDetails.exception && r.exceptionDetails.exception.description || 'erro na tela'}`); continue; }
      await sleep(450);
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(join(out, 'screenshots', name + '.png'), Buffer.from(data, 'base64')); n++;
    }
    await cdp.send('Browser.close').catch(() => {}); cdp.close();
  } finally { proc.kill(); srv.close(); await sleep(300); rmSync(profile, { recursive: true, force: true }); }
  return n;
}

/* ---------- gera tudo ---------- */
const fonts = await archivoFonts(), family = fonts.length ? 'Archivo' : 'Segoe UI, Arial, sans-serif';
const fontOpts = { font: { fontFiles: fonts, loadSystemFonts: true, defaultFontFamily: fonts.length ? 'Archivo' : 'Arial' } };
writeFileSync(join(out, 'icone-512.png'), render(full(512), 512).asPng());
writeFileSync(join(out, 'feature-graphic.png'), render(featureSVG(family), 1024, fontOpts).asPng());
console.log('store/icone-512.png e store/feature-graphic.png gerados' + (fonts.length ? ' com a fonte Archivo.' : ' com fonte do sistema.'));
const shots = await screenshots();
if (shots) console.log(`${shots} capturas de tela em store/screenshots/ (1080 x 1920).`);
