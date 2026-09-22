// Confere os dados do app que são fáceis de quebrar sem perceber: acordes citados que não existem,
// batidas inválidas, roteiro fora do formato, provas apontando para semanas inexistentes.
// Uso: node scripts/check-data.mjs index.html
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const file = process.argv[2] || 'index.html';
const html = readFileSync(file, 'utf8');

// Extrai `const NOME=<literal>;` do script, respeitando colchetes e strings (o literal pode ter várias linhas).
function grab(name) {
  const start = html.indexOf(`const ${name}=`);
  if (start < 0) throw new Error(`${name} não encontrado`);
  let i = html.indexOf('=', start) + 1, depth = 0, str = null;
  for (; i < html.length; i++) {
    const c = html[i];
    if (str) { if (c === '\\') i++; else if (c === str) str = null; continue; }
    if (c === "'" || c === '"' || c === '`') { str = c; continue; }
    if (c === '[' || c === '{' || c === '(') depth++;
    else if (c === ']' || c === '}' || c === ')') depth--;
    else if (c === ';' && depth === 0) break;
  }
  return html.slice(start, i + 1);
}
const names = ['CHORDS', 'PATTERNS', 'LEVELS', 'ROAD', 'PROOF', 'SONGBOOK', 'SCALES'];
const D = runInNewContext(names.map(grab).join('\n') + '\n({' + names.join(',') + '})', {});
const CH = new Set(D.CHORDS.map(c => c.n)), PT = new Set(D.PATTERNS.map(p => p.id)), errors = [];
const err = m => errors.push(m);

// acordes: nome que a teoria sabe ler, 6 casas e 6 dedos, pestana coerente
D.CHORDS.forEach(c => {
  if (!/^([A-G])([#b]?)(m(?!aj))?(maj7|7)?(sus2|sus4|add9)?$/.test(c.n)) err(`acorde ${c.n}: nome fora do padrão que a teoria explica`);
  if (c.f.length !== 6 || c.d.length !== 6) err(`acorde ${c.n}: precisa de 6 casas e 6 dedos`);
  c.f.forEach((f, i) => { if (f > 0 && !c.d[i]) err(`acorde ${c.n}: corda ${6 - i} apertada sem dedo`); if (f <= 0 && c.d[i]) err(`acorde ${c.n}: corda ${6 - i} solta com dedo`); });
  if (c.barre && !c.f.some((f, i) => f === c.barre.fret && i >= c.barre.from && i <= c.barre.to)) err(`acorde ${c.n}: pestana sem cordas na casa`);
});
// batidas: células conhecidas, 6 ou 8 por compasso
D.PATTERNS.forEach(p => {
  if (![6, 8].includes(p.cells.length)) err(`batida ${p.id}: ${p.cells.length} células (esperado 6 ou 8)`);
  p.cells.forEach(c => { if (!['', '↓', '↑', 'x', 'B', 'P', 'b', 'I', 'M', 'A'].includes(c)) err(`batida ${p.id}: célula desconhecida "${c}"`); });
  if (!(p.bpm >= 40 && p.bpm <= 160)) err(`batida ${p.id}: bpm ${p.bpm}`);
});
// níveis: acordes, pares, progressões, batida e 4 habilidades
D.LEVELS.forEach((L, i) => {
  const n = i + 1;
  [].concat(L.chords, ...L.pairs, ...L.prog).forEach(c => { if (!CH.has(c)) err(`nível ${n}: acorde desconhecido ${c}`); });
  if (!PT.has(L.rhythm)) err(`nível ${n}: batida desconhecida ${L.rhythm}`);
  if (L.skills.length !== 4) err(`nível ${n}: ${L.skills.length} habilidades (esperado 4)`);
});
// roteiro: 4 semanas por nível, com pares, progressões e batida válidos
if (D.ROAD.length !== D.LEVELS.length) err(`ROAD tem ${D.ROAD.length} níveis, LEVELS tem ${D.LEVELS.length}`);
D.ROAD.forEach((weeks, li) => {
  if (weeks.length !== D.LEVELS[li].skills.length) err(`nível ${li + 1}: ${weeks.length} semanas vs ${D.LEVELS[li].skills.length} habilidades`);
  weeks.forEach((W, wi) => {
    const tag = `nível ${li + 1} semana ${wi + 1}`;
    if (!W.t || !W.tech || !W.tech.length) err(`${tag}: sem título ou técnica`);
    if (!PT.has(W.pat)) err(`${tag}: batida desconhecida ${W.pat}`);
    if (!(W.bpm >= 40 && W.bpm <= 160)) err(`${tag}: bpm ${W.bpm}`);
    if (!W.pairs || !W.pairs.length) err(`${tag}: sem pares`);
    (W.pairs || []).forEach(p => { if (p.length !== 2 || p[0] === p[1]) err(`${tag}: par inválido ${p}`); p.forEach(c => { if (!CH.has(c)) err(`${tag}: acorde desconhecido ${c} nos pares`); }); });
    if (!W.progs || !W.progs.length) err(`${tag}: sem progressões`);
    (W.progs || []).forEach(p => { if (p.length < 2 || p.length > 8) err(`${tag}: progressão com ${p.length} acordes`); p.forEach(c => { if (!CH.has(c)) err(`${tag}: acorde desconhecido ${c} nas progressões`); }); });
    if (`Semana ${wi + 1}: ${W.t}`.length > 40) err(`${tag}: nome do treino passa de 40 caracteres`);
    if (W.scale && (!D.SCALES.some(s => s.id === W.scale.sc) || !(W.scale.pc >= 0 && W.scale.pc < 12))) err(`${tag}: escala inválida ${JSON.stringify(W.scale)}`);
  });
});
// provas automáticas: semanas existentes, batidas e acordes válidos
Object.entries(D.PROOF).forEach(([k, p]) => {
  const [n, j] = k.split('.').map(Number);
  if (!(n >= 1 && n <= D.ROAD.length && j >= 0 && j < D.ROAD[n - 1].length)) err(`prova ${k}: semana inexistente`);
  if (p.pat && !PT.has(p.pat)) err(`prova ${k}: batida desconhecida ${p.pat}`);
  (p.pair || []).forEach(c => { if (!CH.has(c)) err(`prova ${k}: acorde desconhecido ${c}`); });
});
// músicas sugeridas: só acordes que o app tem
D.SONGBOOK.forEach(s => s[2].forEach(c => { if (!CH.has(c)) err(`música "${s[0]}": acorde desconhecido ${c}`); }));
// escalas: graus crescentes dentro da oitava
D.SCALES.forEach(s => { let last = -1; s.deg.forEach(([st, se]) => { if (se <= last || se >= 12) err(`escala ${s.id}: grau fora de ordem (${st}, ${se})`); last = se; }); });

console.log(`acordes ${CH.size}, batidas ${PT.size}, níveis ${D.LEVELS.length}, semanas ${D.ROAD.reduce((a, l) => a + l.length, 0)}, músicas ${D.SONGBOOK.length}, escalas ${D.SCALES.length}`);
if (errors.length) { console.error('ERROS:\n' + errors.join('\n')); process.exit(1); }
console.log('dados OK');
