// Gera o material da Play Store em store/: ícone de 512, imagem de destaque de 1024 x 500 e,
// se houver Chrome ou Edge no computador, capturas de tela de 1080 x 1920 do app com um progresso de exemplo.
// Uso: npm run loja
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { C, art, full, render } from './make-icons.mjs';
import { launch, serve, sleep } from './headless.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..'), out = join(root, 'store');
const html = (await import('node:fs')).readFileSync(join(root, 'index.html'), 'utf8');
const VER = (html.match(/<meta name="app-version" content="([^"]+)"/) || [])[1] || '';
mkdirSync(join(out, 'screenshots'), { recursive: true });

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

/* ---------- capturas de tela: Chrome ou Edge escondido (scripts/headless.mjs) ---------- */
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
  const browser = await launch({ width: 360, height: 640, scale: 3 });
  if (!browser) { console.warn('Chrome ou Edge não encontrado: as capturas de tela não foram geradas (o resto sim).'); return 0; }
  const srv = await serve(root), cdp = browser.cdp;
  let n = 0;
  try {
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: SEED });
    await browser.goto(srv.url);
    await browser.eval('document.fonts.ready.then(()=>new Promise(r=>setTimeout(r,800)))');
    // Os avisos de conquista do progresso de exemplo não entram na foto.
    await browser.eval('document.head.insertAdjacentHTML("beforeend","<style>#toast{display:none!important}</style>")');
    // celular (1080 x 1920) e tablets de 7 e 10 polegadas (1200 x 1920 e 1600 x 2560), que a ficha da loja também aceita
    for (const [dir, width, height, scale] of [['screenshots', 360, 640, 3], ['screenshots-tablet7', 600, 960, 2], ['screenshots-tablet10', 800, 1280, 2]]) {
      mkdirSync(join(out, dir), { recursive: true });
      await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: true });
      await sleep(300);
      for (const [name, script] of SHOTS) {
        try { await browser.eval(`(()=>{${script};return 'ok';})()`); } catch (e) { console.warn(`${dir}/${name}: ${e.message}`); continue; }
        await sleep(450);
        const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
        writeFileSync(join(out, dir, name + '.png'), Buffer.from(data, 'base64')); n++;
      }
    }
  } finally { await browser.close(); srv.close(); }
  return n;
}

/* ---------- gera tudo ---------- */
const fonts = await archivoFonts(), family = fonts.length ? 'Archivo' : 'Segoe UI, Arial, sans-serif';
const fontOpts = { font: { fontFiles: fonts, loadSystemFonts: true, defaultFontFamily: fonts.length ? 'Archivo' : 'Arial' } };
writeFileSync(join(out, 'icone-512.png'), render(full(512), 512).asPng());
writeFileSync(join(out, 'feature-graphic.png'), render(featureSVG(family), 1024, fontOpts).asPng());
console.log('store/icone-512.png e store/feature-graphic.png gerados' + (fonts.length ? ' com a fonte Archivo.' : ' com fonte do sistema.'));
const shots = await screenshots();
if (shots) console.log(`${shots} capturas de tela em store/screenshots/ (celular, 1080 x 1920), screenshots-tablet7/ (1200 x 1920) e screenshots-tablet10/ (1600 x 2560).`);
