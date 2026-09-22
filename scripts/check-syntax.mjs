// Confere a sintaxe de todos os <script> embutidos no index.html, sem executar nada.
// Uso: node scripts/check-syntax.mjs index.html
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const file = process.argv[2] || 'index.html';
const html = readFileSync(file, 'utf8');
const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if (!blocks.length) { console.error(`${file}: nenhum <script> encontrado`); process.exit(1); }
let bad = 0;
blocks.forEach((b, i) => {
  try { new Script(b[1], { filename: `${file}#script${i}` }); console.log(`script ${i}: OK (${b[1].length} caracteres)`); }
  catch (e) { bad++; console.error(`script ${i}: ERRO ${e.message}`); }
});
process.exit(bad ? 1 : 0);
