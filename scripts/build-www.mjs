// Monta a pasta www/, que é o que vai dentro do app nativo (Android e iOS).
// É o mesmo site da raiz, com uma diferença: a fonte Archivo vai embutida no app em vez de vir
// do Google Fonts. Assim o app abre rápido e funciona igual sem internet.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'www');
const fontSrc = join(root, 'node_modules', '@fontsource-variable', 'archivo', 'files');
const FONTS = [
  // [arquivo, unicode-range] (faixas iguais às do Google Fonts / Fontsource)
  ['archivo-latin-wdth-normal.woff2', 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'],
  ['archivo-latin-ext-wdth-normal.woff2', 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF']
];

if (!existsSync(fontSrc)) {
  console.error('Fonte não encontrada. Rode "npm install" antes.');
  process.exit(1);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'fonts'), { recursive: true });
for (const f of ['manifest.webmanifest', 'icons']) cpSync(join(root, f), join(out, f), { recursive: true });
for (const [file] of FONTS) cpSync(join(fontSrc, file), join(out, 'fonts', file));

const fontFace = FONTS.map(([file, range]) =>
  `@font-face{font-family:"Archivo";font-style:normal;font-display:swap;font-weight:100 900;font-stretch:62% 125%;src:url(fonts/${file}) format("woff2");unicode-range:${range}}`
).join('\n');

let html = readFileSync(join(root, 'index.html'), 'utf8');
const googleFonts = /<link[^>]*fonts\.googleapis\.com[^>]*>/;
if (googleFonts.test(html)) html = html.replace(googleFonts, `<style>\n${fontFace}\n</style>`);
else console.warn('Aviso: o <link> do Google Fonts não foi encontrado no index.html; a fonte embutida não foi aplicada.');
writeFileSync(join(out, 'index.html'), html);

const version = (html.match(/<meta name="app-version" content="([^"]+)"/) || [])[1] || '?';
console.log(`www/ pronto (versão ${version}).`);
