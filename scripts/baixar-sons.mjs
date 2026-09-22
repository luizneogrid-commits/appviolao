// Baixa as notas gravadas de violão (nylon, aço e guitarra limpa) para a pasta sons/: uma nota a cada 3 semitons,
// do Mi da 6ª corda solta (40) ao Mi da casa 12 da 1ª corda (76). As casas no meio tocam a nota mais próxima com
// a velocidade ajustada. Fonte: soundfont FluidR3_GM (Frank Wen), servido nota a nota em MP3 pelo projeto
// midi-js-soundfonts, licença Creative Commons BY 3.0 (crédito no app, em "Sobre e ajuda", e no README).
// Uso: node scripts/baixar-sons.mjs [--forcar]   (só precisa rodar de novo para trocar de soundfont)
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..'), out = join(root, 'sons'), force = process.argv.includes('--forcar');
const BASE = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/';
const TYPES = { nylon: 'acoustic_guitar_nylon', aco: 'acoustic_guitar_steel', eletrico: 'electric_guitar_clean' };
const NOTES = [40, 43, 46, 49, 52, 55, 58, 61, 64, 67, 70, 73, 76];
const NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'], name = m => NAMES[m % 12] + (Math.floor(m / 12) - 1);

let n = 0, bytes = 0;
for (const [type, inst] of Object.entries(TYPES)) {
  mkdirSync(join(out, type), { recursive: true });
  for (const m of NOTES) {
    const file = join(out, type, m + '.mp3');
    if (existsSync(file) && !force) continue;
    const url = BASE + inst + '-mp3/' + name(m) + '.mp3', r = await fetch(url);
    if (!r.ok) { console.error(`Falhou ${url}: HTTP ${r.status}`); process.exit(1); }
    const buf = Buffer.from(await r.arrayBuffer());
    writeFileSync(file, buf); n++; bytes += buf.length;
  }
}
writeFileSync(join(out, 'CREDITOS.md'), `# Sons de violão

As notas gravadas desta pasta (\`nylon/\`, \`aco/\`, \`eletrico/\`; o número do arquivo é a nota MIDI) vêm do soundfont
**FluidR3_GM**, de Frank Wen, servido nota a nota em MP3 pelo projeto **midi-js-soundfonts** (Benjamin Gleitzman):
https://github.com/gleitz/midi-js-soundfonts

Licença: Creative Commons Attribution 3.0 (CC BY 3.0), https://creativecommons.org/licenses/by/3.0/us/
O app dá o crédito em Evolução, Perfil, "Sobre e ajuda", "Créditos".

Para baixar de novo ou trocar de soundfont: \`node scripts/baixar-sons.mjs --forcar\`.
`);
console.log(`${n} arquivos baixados (${Math.round(bytes / 1024)} KB); sons/ tem ${Object.keys(TYPES).length * NOTES.length} notas.`);
