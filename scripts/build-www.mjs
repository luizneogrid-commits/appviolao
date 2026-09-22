// Monta a pasta www/, que é o que vai dentro do app nativo (Android e iOS).
// É o mesmo site da raiz: index.html, manifest, ícones e a fonte Archivo (pasta fonts/), que o próprio
// index.html já embute. Assim o app abre rápido e funciona igual sem internet.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'www');

for (const f of ['fonts/archivo-latin-wdth-normal.woff2', 'fonts/archivo-latin-ext-wdth-normal.woff2']) {
  if (!existsSync(join(root, f))) { console.error(`Falta ${f}. As fontes ficam na pasta fonts/ do projeto.`); process.exit(1); }
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const f of ['manifest.webmanifest', 'icons', 'fonts']) cpSync(join(root, f), join(out, f), { recursive: true });

const html = readFileSync(join(root, 'index.html'), 'utf8');
if (/fonts\.googleapis\.com/.test(html)) console.warn('Aviso: o index.html ainda pede fonte ao Google Fonts; o app depende de internet para a letra.');
writeFileSync(join(out, 'index.html'), html);

const version = (html.match(/<meta name="app-version" content="([^"]+)"/) || [])[1] || '?';
console.log(`www/ pronto (versão ${version}).`);
