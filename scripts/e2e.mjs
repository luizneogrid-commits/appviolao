// Testes de tela: abre o app num Chrome ou Edge escondido e percorre as telas como uma pessoa faria.
// Roda em "npm test" e no GitHub antes de compilar o Android. Sem navegador no computador, avisa e passa.
// Uso: node scripts/e2e.mjs [--verbose]
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, serve, sleep } from './headless.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..'), verbose = process.argv.includes('--verbose');
const browser = await launch({ width: 390, height: 780 });
if (!browser) { console.log('Testes de tela: Chrome ou Edge não encontrado neste computador, pulando.'); process.exit(0); }
const srv = await serve(root);
const results = [];
let failed = 0;

// Cada teste avalia código na página e precisa devolver um valor "verdadeiro"; um erro ou um valor falso reprova.
async function test(name, expression) {
  try {
    const v = await browser.eval(`(async()=>{${expression}})()`);
    if (v === false || v == null) throw new Error('devolveu ' + String(v));
    results.push({ name, ok: true, v }); if (verbose) console.log('ok  ' + name + (v === true ? '' : ': ' + JSON.stringify(v)));
  } catch (e) { failed++; results.push({ name, ok: false, e: e.message }); console.error('ERRO ' + name + ': ' + e.message); }
}
// Ajudas que ficam na página: clique por seletor (funciona em SVG também), espera, e leitura do estado salvo.
const HELPERS = `window.__t={click:s=>{const e=document.querySelector(s);if(!e)throw new Error('sem '+s);e.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return e;},
 wait:ms=>new Promise(r=>setTimeout(r,ms)),S:()=>JSON.parse(localStorage.getItem('violao-diario-v1')||'null'),
 view:()=>(document.querySelector('#tabs [aria-current]')||{dataset:{}}).dataset.v,text:()=>document.querySelector('#view').innerText,
 broken:()=>/Algo deu errado nesta tela/.test(document.querySelector('#view').innerText),errs:()=>JSON.parse(localStorage.getItem('violao-diario-v1-erros')||'[]')};`;

try {
  await browser.goto(srv.url);
  await browser.eval(`localStorage.clear();localStorage.removeItem('violao-diario-v1-erros');'ok'`);
  await browser.goto(srv.url);
  await browser.eval(HELPERS);
  await browser.eval(`document.fonts.ready.then(()=>new Promise(r=>setTimeout(r,300)))`);

  await test('primeira tela: escolher nível e tempo e montar o treino', `const t=__t;t.click('[data-act="ob-level"][data-v="2"]');t.click('[data-act="ob-goal"][data-v="15"]');t.click('[data-act="ob-go"]');await t.wait(200);const S=t.S();return S.onboarded&&S.level===2&&S.goal===15&&document.querySelectorAll('.blk').length===4;`);
  await test('Hoje: blocos, revisão, roteiro e diário sem erro', `const t=__t;return !t.broken()&&/Treino de 15 minutos/.test(t.text())&&/Roteiro: nível 2/.test(t.text());`);
  await test('bloco de treino: iniciar, concluir e desfazer', `const t=__t;t.click('[data-act="blk-start"]');await t.wait(100);t.click('[data-act="blk-done"]');await t.wait(200);const k=Object.keys(t.S().days).pop();const done=Object.keys(t.S().days[k].done).length===1;t.click('[data-act="blk-undo"]');await t.wait(100);return done&&Object.keys(t.S().days[k].done).length===0;`);
  await test('todas as abas e subabas abrem sem erro', `const t=__t;const out=[];for(const [v,subs] of [['hoje',[]],['meu',[]],['treinar',['trocas','batidas','tempo','ouvido']],['ferramentas',['metronomo','afinador']],['acordes',['acordes','notas','teoria']],['evolucao',['numeros','roteiro','musicas','perfil']]]){t.click('[data-act="nav"][data-v="'+v+'"]');if(t.broken()||!document.querySelector('#view').children.length)out.push(v);for(const s of subs){t.click('[data-act="sub"][data-v="'+s+'"]');if(t.broken())out.push(v+'/'+s);}}if(out.length)throw new Error('telas com erro: '+out.join(', '));return true;`);
  await test('ouvido: as cinco modalidades geram pergunta', `const t=__t;t.click('[data-act="nav"][data-v="treinar"]');t.click('[data-act="sub"][data-g="treinar"][data-v="ouvido"]');const n=[];for(const s of ['mm','qual','ivl','prog']){t.click('[data-act="sub"][data-g="ouvido"][data-v="'+s+'"]');n.push(document.querySelectorAll('.opt').length);}t.click('[data-act="sub"][data-g="ouvido"][data-v="sing"]');const sing=/Cante a nota/.test(t.text());return n[0]===2&&n[1]===4&&n[2]===4&&n[3]===4&&sing;`);
  await test('metrônomo: liga, muda BPM e desliga', `const t=__t;t.click('[data-act="nav"][data-v="ferramentas"]');t.click('[data-act="sub"][data-g="ferramentas"][data-v="metronomo"]');t.click('#m-go');await t.wait(300);const on=document.querySelector('#m-go').textContent==='Parar';t.click('[data-act="m-bpm"][data-d="5"]');const bpm=+document.querySelector('#m-num').textContent;t.click('#m-go');return on&&bpm===75&&document.querySelector('#m-go').textContent==='Iniciar';`);
  await test('batidas: todas as batidas tocam junto por um compasso', `const t=__t;t.click('[data-act="nav"][data-v="treinar"]');t.click('[data-act="sub"][data-g="treinar"][data-v="batidas"]');const ids=[...document.querySelectorAll('[data-act="gr-pat"]')].map(b=>b.dataset.v);for(const id of ids){t.click('[data-act="gr-pat"][data-v="'+id+'"]');for(let i=0;i<20;i++)t.click('[data-act="gr-bpm"][data-d="4"]');t.click('[data-act="gr-toggle"]');await t.wait(2600);if(document.querySelector('[data-act="gr-toggle"]').textContent!=='Parar')throw new Error('não tocou: '+id);t.click('[data-act="gr-toggle"]');}return ids.length;`);
  await test('biblioteca: todos os acordes têm diagrama e teoria', `const t=__t;t.click('[data-act="nav"][data-v="acordes"]');t.click('[data-act="sub"][data-g="acordes"][data-v="acordes"]');t.click('[data-act="sub"][data-g="filtro"][data-v="todos"]');const names=[...document.querySelectorAll('.ctile .name')].map(n=>n.textContent.trim().replace(/ fácil$/,''));if(document.querySelectorAll('.ctile svg').length!==names.length)throw new Error('diagrama faltando');t.click('[data-act="sub"][data-g="acordes"][data-v="teoria"]');const bad=[];for(const n of names){const b=[...document.querySelectorAll('[data-act="th-pick"]')].find(x=>x.dataset.c===n);if(!b){bad.push(n);continue;}b.dispatchEvent(new MouseEvent('click',{bubbles:true}));if(t.broken()||document.querySelector('.thname').textContent!==n)bad.push(n);}if(bad.length)throw new Error('teoria falhou em '+bad.join(', '));return names.length;`);
  await test('escalas: tocar junto marca notas no braço', `const t=__t;t.click('[data-act="sg-toggle"]');await t.wait(1400);const on=!!document.querySelector('.sfb circle.on');t.click('[data-act="sg-toggle"]');return on;`);
  await test('músicas: adicionar, abrir a cifra, transpor e tocar junto', `const t=__t;t.click('[data-act="nav"][data-v="evolucao"]');t.click('[data-act="sub"][data-g="evolucao"][data-v="musicas"]');document.querySelector('#s-title').value='Teste';document.querySelector('#s-chords').value='G D Em C';document.querySelector('#s-cifra').value='G   D   Em   C\\nletra da música';t.click('[data-act="song-add"]');t.click('[data-act="song-play"]');const n0=document.querySelectorAll('.cif-ch[data-i]').length;t.click('[data-act="song-tr"][data-d="1"]');t.click('[data-act="song-tr"][data-d="1"]');const first=document.querySelector('.cif-ch').textContent;t.click('[data-act="song-playalong"]');await t.wait(300);const playing=document.querySelector('[data-act="song-playalong"]').textContent==='Parar';t.click('[data-act="song-playalong"]');t.click('[data-act="song-close"]');return n0===4&&first==='A'&&playing;`);
  await test('meu treino: montar, salvar e compartilhar por código', `const t=__t;t.click('[data-act="nav"][data-v="meu"]');t.click('[data-act="ce-suggest"]');t.click('[data-act="ce-save"]');await t.wait(100);const n=t.S().custom.length;const code=__t.S().custom[0];document.querySelector('details.tcard summary').click();document.querySelector('#ct-code').value=location.origin+'/#treino='+btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify({n:'Recebido',c:code.chords,p:code.pats,b:code.bpm,m:code.min,r:0})))).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'');t.click('[data-act="ct-import"]');await t.wait(100);return n===1&&t.S().custom.length===2&&t.S().custom[1].name==='Recebido';`);
  await test('perfil: letra maior, tema escuro e canhoto', `const t=__t;t.click('[data-act="nav"][data-v="evolucao"]');t.click('[data-act="sub"][data-g="evolucao"][data-v="perfil"]');t.click('[data-act="font"][data-v="2"]');t.click('[data-act="theme"][data-v="dark"]');t.click('[data-act="lefty"][data-v="1"]');const ok=getComputedStyle(document.documentElement).fontSize==='19px'&&document.documentElement.dataset.theme==='dark'&&t.S().lefty===true;t.click('[data-act="font"][data-v="0"]');t.click('[data-act="theme"][data-v=""]');t.click('[data-act="lefty"][data-v="0"]');return ok;`);
  await test('exportar e importar o progresso', `const t=__t;let blob=null;const oc=URL.createObjectURL;URL.createObjectURL=b=>{blob=b;return 'blob:x';};const ok=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(!this.download)ok.call(this);};t.click('[data-act="export"]');URL.createObjectURL=oc;HTMLAnchorElement.prototype.click=ok;const txt=await blob.text();const before=t.S().level;t.click('[data-act="set-level"][data-l="3"]');document.querySelector('details.tcard summary').click();document.querySelector('#imp-text').value=txt;t.click('[data-act="imp-paste"]');t.click('[data-act="imp-go"]');await t.wait(100);return JSON.parse(txt).app==='violao-diario'&&t.S().level===before;`);
  // criar um perfil recarrega a página: o clique é agendado e o teste seguinte espera a página voltar
  const reloaded = browser.cdp.wait('Page.loadEventFired');
  await test('perfis: criar um segundo perfil', `const t=__t;document.querySelector('#prof-name').value='Teste';setTimeout(()=>t.click('[data-act="prof-add"]'),50);return true;`);
  await reloaded; await browser.eval(HELPERS);
  await test('segundo perfil abre do zero; o principal continua salvo', `const t=__t;const reg=JSON.parse(localStorage.getItem('violao-diario-perfis'));const fresh=!!document.querySelector('[data-act="ob-go"]');const main=JSON.parse(localStorage.getItem('violao-diario-v1'));reg.current='';localStorage.setItem('violao-diario-perfis',JSON.stringify(reg));return reg.list.length===1&&fresh&&main&&main.onboarded===true;`);
  await browser.goto(srv.url); await browser.eval(HELPERS);
  await test('de volta ao principal, com o progresso e sem erros registrados', `const t=__t;return t.S().onboarded===true&&t.view()==='hoje'&&t.errs().length===0;`);
} finally {
  await browser.close(); srv.close();
}
console.log(`Testes de tela: ${results.length - failed} de ${results.length} passaram.`);
if (failed) process.exit(1);
