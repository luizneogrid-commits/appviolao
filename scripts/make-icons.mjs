// Gera os ícones e as telas de abertura dos apps Android e iOS a partir do desenho do ícone
// (rosácea do violão com seis cordas), redesenhado em vetor com as medidas do icons/icon-512.png.
// Uso: npm run icons   (só precisa rodar de novo se o desenho ou as cores mudarem)
// O desenho (svg, art) e as cores (C) também servem ao scripts/store-assets.mjs, que os importa daqui.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { deflateSync, crc32 } from 'node:zlib';
import { Resvg } from '@resvg/resvg-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const RES = join(root, 'android', 'app', 'src', 'main', 'res');
const XC = join(root, 'ios', 'App', 'App', 'Assets.xcassets');
const preview = process.argv.includes('--preview') ? process.argv[process.argv.indexOf('--preview') + 1] : null;

export const C = { bg: '#7A2E4D', brass: '#C98A1B', dark: '#24161D', cream: '#F3E3C2', hole: '#1A0E14', gold: '#DFB766', steel: '#F4E6C6', shadow: '#1A0E14' };
// Medidas em unidades do ícone de 512 px, com a origem no centro da rosácea.
const RINGS = [[185.5, C.brass], [172.5, C.dark], [163.5, C.cream], [155.5, C.dark], [148.5, C.brass], [135.5, C.hole]];
const STRINGS = [[-76.7, 7, C.gold], [-46.1, 6, C.gold], [-15.5, 5, C.gold], [15.1, 4.4, C.steel], [45.7, 3.6, C.steel], [76.3, 3, C.steel]];
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

/* Desenho da rosácea e das cordas. k = tamanho de 1 unidade do ícone original na tela final.
   strings: 'full' (cordas atravessam tudo) ou um número = meio comprimento, com as pontas esmaecendo.
   mono: versão de uma cor só (ícone temático do Android 13+). */
export function art({ cx, cy, k, strings = 'full', mono = false }) {
  const L = strings === 'full' ? 4000 : strings;
  const defs = [], body = [];
  if (strings !== 'full') {
    const a = (L - 185.5 * 1.08) / (2 * L); // esmaece do lado de fora da rosácea até a ponta
    defs.push(`<linearGradient id="fg" x1="0" y1="${-L}" x2="0" y2="${L}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="${a.toFixed(3)}" stop-color="#fff"/><stop offset="${(1 - a).toFixed(3)}" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`,
      `<mask id="fade" maskUnits="userSpaceOnUse" x="${-L}" y="${-L}" width="${2 * L}" height="${2 * L}"><rect x="${-L}" y="${-L}" width="${2 * L}" height="${2 * L}" fill="url(#fg)"/></mask>`);
  }
  const fade = strings === 'full' ? '' : ' mask="url(#fade)"';
  if (mono) {
    // Faixas claras da rosácea, com um vão em volta de cada corda para as cordas não grudarem nos anéis.
    defs.push(`<mask id="gaps" maskUnits="userSpaceOnUse" x="-400" y="-400" width="800" height="800"><rect x="-400" y="-400" width="800" height="800" fill="#fff"/>${STRINGS.map(([x, w]) => `<rect x="${x - w / 2 - 2}" y="-400" width="${w + 4}" height="800" fill="#000"/>`).join('')}</mask>`);
    body.push(`<g mask="url(#gaps)" fill="none" stroke="#fff"><circle r="179" stroke-width="13"/><circle r="159.5" stroke-width="8"/><circle r="142" stroke-width="13"/></g>`);
    body.push(`<g${fade}>${STRINGS.map(([x, w]) => `<rect x="${x - w / 2}" y="${-L}" width="${w}" height="${2 * L}" fill="#fff"/>`).join('')}</g>`);
  } else {
    body.push(RINGS.map(([r, c]) => `<circle r="${r}" fill="${c}"/>`).join(''));
    body.push(`<g${fade}>${STRINGS.map(([x, w, c]) => `<rect x="${x + w / 2}" y="${-L}" width="1.4" height="${2 * L}" fill="${C.shadow}" opacity=".85"/><rect x="${x - w / 2}" y="${-L}" width="${w}" height="${2 * L}" fill="${c}"/>`).join('')}</g>`);
  }
  return { defs: defs.join(''), g: `<g transform="translate(${cx} ${cy}) scale(${k})">${body.join('')}</g>` };
}

// w x h em unidades livres (dp, pt ou px); clip: 'round' (quadrado arredondado) ou 'circle'.
export function svg({ w, h, bg = null, clip = null, margin = 0, ...a }) {
  const { defs, g } = art(a);
  let clipDef = '', open = '', close = '';
  if (clip) {
    const s = Math.min(w, h) - 2 * margin, x = (w - s) / 2, y = (h - s) / 2;
    clipDef = clip === 'circle' ? `<clipPath id="c"><circle cx="${w / 2}" cy="${h / 2}" r="${s / 2}"/></clipPath>` : `<clipPath id="c"><rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${s * 0.2}"/></clipPath>`;
    open = '<g clip-path="url(#c)">'; close = '</g>';
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}${clipDef}</defs>${open}${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${g}${close}</svg>`;
}

export function render(svgText, widthPx, opts = {}) {
  return new Resvg(svgText, { fitTo: { mode: 'width', value: Math.round(widthPx) }, ...opts }).render();
}
// PNG sem canal alfa (a App Store recusa o ícone de 1024 com transparência).
export function opaquePng(img) {
  const { width, height, pixels } = img, row = width * 3 + 1, raw = Buffer.alloc(row * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4, o = y * row + 1 + x * 3;
    raw[o] = pixels[i]; raw[o + 1] = pixels[i + 1]; raw[o + 2] = pixels[i + 2];
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]), crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const written = [];
function out(file, svgText, widthPx, opaque = false) {
  mkdirSync(dirname(file), { recursive: true });
  const img = render(svgText, widthPx);
  writeFileSync(file, opaque ? opaquePng(img) : img.asPng());
  written.push(file);
}

/* ---------- desenhos ---------- */
export const full = s => svg({ w: s, h: s, bg: C.bg, cx: s / 2, cy: s / 2, k: s / 512 });                           // ícone original, sangrado
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main();
function main() {
const legacy = clip => svg({ w: 48, h: 48, bg: C.bg, clip, margin: 2, cx: 24, cy: 24, k: 44 / 512 });                // Android 7: ícone com forma própria
const foreground = mono => svg({ w: 108, h: 108, cx: 54, cy: 54, k: 0.145, mono });                                 // camada do ícone adaptável
const statIcon = svg({ w: 24, h: 24, cx: 12, cy: 12, k: 0.052, mono: true });                                       // ícone branco da barra de status (notificações)
const SPLASH_R = 60;                                                                                                  // raio da rosácea na abertura, em dp/pt
const splashIcon = svg({ w: 288, h: 288, cx: 144, cy: 144, k: SPLASH_R / 185.5, strings: 290 });                     // Android 12+: cabe no círculo de 192 dp
const splashFull = (w, h, r) => svg({ w, h, bg: C.bg, cx: w / 2, cy: h / 2, k: r / 185.5, strings: 290 });

/* ---------- Android ---------- */
for (const [d, f] of Object.entries(DENSITIES)) {
  out(join(RES, `mipmap-${d}`, 'ic_launcher.png'), legacy('round'), 48 * f);
  out(join(RES, `mipmap-${d}`, 'ic_launcher_round.png'), legacy('circle'), 48 * f);
  out(join(RES, `mipmap-${d}`, 'ic_launcher_foreground.png'), foreground(false), 108 * f);
  out(join(RES, `mipmap-${d}`, 'ic_launcher_monochrome.png'), foreground(true), 108 * f);
  out(join(RES, `drawable-${d}`, 'splash_icon.png'), splashIcon, 288 * f);
  out(join(RES, `drawable-${d}`, 'ic_stat_violao.png'), statIcon, 24 * f);
  // Tela de abertura antiga (usada só se a API de abertura do Android 12 falhar)
  const port = { mdpi: [320, 480], hdpi: [480, 800], xhdpi: [720, 1280], xxhdpi: [960, 1600], xxxhdpi: [1280, 1920] }[d];
  out(join(RES, `drawable-port-${d}`, 'splash.png'), splashFull(port[0], port[1], SPLASH_R * f), port[0]);
  out(join(RES, `drawable-land-${d}`, 'splash.png'), splashFull(port[1], port[0], SPLASH_R * f), port[1]);
}
out(join(RES, 'drawable', 'splash.png'), splashFull(480, 320, SPLASH_R), 480);
writeFileSync(join(RES, 'values', 'ic_launcher_background.xml'), `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${C.bg}</color>\n</resources>\n`);

/* ---------- iOS ---------- */
out(join(XC, 'AppIcon.appiconset', 'AppIcon-512@2x.png'), full(1024), 1024, true);
for (const n of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'])
  out(join(XC, 'Splash.imageset', n), splashFull(2732, 2732, 240), 2732, true);

/* ---------- prévia para conferência (opcional) ---------- */
if (preview) {
  mkdirSync(preview, { recursive: true });
  out(join(preview, 'full-512.png'), full(512), 512);
  out(join(preview, 'foreground-432.png'), svg({ w: 108, h: 108, bg: C.bg, clip: 'circle', margin: 18, cx: 54, cy: 54, k: 0.145 }), 432);
  out(join(preview, 'monochrome-432.png'), svg({ w: 108, h: 108, bg: '#3b3b3b', cx: 54, cy: 54, k: 0.145, mono: true }), 432);
  out(join(preview, 'splash-icon-576.png'), svg({ w: 288, h: 288, bg: C.bg, cx: 144, cy: 144, k: SPLASH_R / 185.5, strings: 290 }), 576);
}
console.log(`${written.length} imagens geradas.`);
}
