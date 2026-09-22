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
const HELPERS = `window.__t={click:s=>{const e=document.querySelector(s);if(!e)throw new Error('sem '+s+' (tela: '+((document.querySelector('#view h1')||{}).textContent||'?')+')');e.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return e;},
 wait:ms=>new Promise(r=>setTimeout(r,ms)),S:()=>JSON.parse(localStorage.getItem('violao-diario-v1')||'null'),
 view:()=>(document.querySelector('#tabs [aria-current]')||{dataset:{}}).dataset.v,text:()=>document.querySelector('#view').innerText,
 broken:()=>/Algo deu errado nesta tela/.test(document.querySelector('#view').innerText),errs:()=>JSON.parse(localStorage.getItem('violao-diario-v1-erros')||'[]'),
 perfil:()=>{document.querySelector('[data-act="nav"][data-v="perfil"]').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));}};`; // perfil(): abre a aba Perfil

try {
  await browser.goto(srv.url);
  await browser.eval(`localStorage.clear();localStorage.removeItem('violao-diario-v1-erros');'ok'`);
  await browser.goto(srv.url);
  await browser.eval(HELPERS);
  await browser.eval(`document.fonts.ready.then(()=>new Promise(r=>setTimeout(r,300)))`);

  await test('primeira tela: escolher nível e tempo e montar o treino', `const t=__t;t.click('[data-act="ob-level"][data-v="2"]');t.click('[data-act="ob-goal"][data-v="15"]');t.click('[data-act="ob-go"]');await t.wait(200);const S=t.S();return S.onboarded&&S.level===2&&S.goal===15&&document.querySelectorAll('.blk').length===4;`);
  await test('Hoje: blocos, revisão, roteiro e diário sem erro', `const t=__t;return !t.broken()&&/Treino de 15 minutos/.test(t.text())&&/Roteiro: nível 2/.test(t.text());`);
  await test('boas-vindas: aparecem depois do cadastro, o guia abre em Teoria, e somem ao fechar', `const t=__t;if(!document.querySelector('[data-act="welcome-done"]'))throw new Error('sem boas-vindas');t.click('[data-act="open-guia"]');await t.wait(150);const guia=document.querySelector('#guia'),open=guia&&guia.querySelector('details').open;t.click('[data-act="nav"][data-v="hoje"]');return !!guia&&open&&!document.querySelector('[data-act="welcome-done"]')&&t.S().welcomed===true;`);
  await test('meta semanal: 5 dias por semana aparece em Hoje', `const t=__t;t.perfil();t.click('[data-act="wgoal"][data-v="5"]');t.click('[data-act="nav"][data-v="hoje"]');const ok=/Esta semana: \\d de 5 dias/.test(t.text());t.perfil();t.click('[data-act="wgoal"][data-v="0"]');t.click('[data-act="nav"][data-v="hoje"]');return ok&&!/Esta semana:/.test(t.text());`);
  await test('bloco de treino: iniciar, concluir e desfazer', `const t=__t;t.click('[data-act="blk-start"]');await t.wait(100);t.click('[data-act="blk-done"]');await t.wait(200);const k=Object.keys(t.S().days).pop();const done=Object.keys(t.S().days[k].done).length===1;t.click('[data-act="blk-undo"]');await t.wait(100);return done&&Object.keys(t.S().days[k].done).length===0;`);
  await test('todas as abas e subabas abrem sem erro', `const t=__t;const out=[];for(const [v,subs] of [['hoje',[]],['meu',[]],['treinar',['trocas','batidas','tempo','ouvido']],['ferramentas',['metronomo','afinador']],['acordes',['acordes','notas','teoria']],['evolucao',['numeros','roteiro','musicas']]]){t.click('[data-act="nav"][data-v="'+v+'"]');if(t.broken()||!document.querySelector('#view').children.length)out.push(v);for(const s of subs){t.click('[data-act="sub"][data-v="'+s+'"]');if(t.broken())out.push(v+'/'+s);}}
    t.perfil();if(t.broken()||!/Seu nível/.test(t.text())||!document.querySelector('[data-act="pf-go"]'))out.push('perfil');t.click('[data-act="pf-go"][data-id="pf-ajuda"]');if(t.view()!=='perfil')out.push('perfil/aba');
    if(out.length)throw new Error('telas com erro: '+out.join(', '));return true;`);
  await test('ouvido: as cinco modalidades geram pergunta', `const t=__t;t.click('[data-act="nav"][data-v="treinar"]');t.click('[data-act="sub"][data-g="treinar"][data-v="ouvido"]');const n=[];for(const s of ['mm','qual','ivl','prog']){t.click('[data-act="sub"][data-g="ouvido"][data-v="'+s+'"]');n.push(document.querySelectorAll('.opt').length);}t.click('[data-act="sub"][data-g="ouvido"][data-v="sing"]');const sing=/Cante a nota/.test(t.text());return n[0]===2&&n[1]===4&&n[2]===4&&n[3]===4&&sing;`);
  await test('metrônomo: liga, muda BPM e desliga', `const t=__t;t.click('[data-act="nav"][data-v="ferramentas"]');t.click('[data-act="sub"][data-g="ferramentas"][data-v="metronomo"]');t.click('#m-go');await t.wait(300);const on=document.querySelector('#m-go').textContent==='Parar';t.click('[data-act="m-bpm"][data-d="5"]');const bpm=+document.querySelector('#m-num').textContent;t.click('#m-go');return on&&bpm===75&&document.querySelector('#m-go').textContent==='Iniciar';`);
  await test('metrônomo: som de madeira usa ruído e o piscar liga', `const t=__t;t.click('[data-act="nav"][data-v="ferramentas"]');t.click('[data-act="sub"][data-g="ferramentas"][data-v="metronomo"]');const P=(window.AudioContext||window.webkitAudioContext).prototype,os=P.createBufferSource;let n=0;P.createBufferSource=function(){n++;return os.call(this);};
    t.click('[data-act="m-click"][data-v="madeira"]');t.click('[data-act="m-flash"]');t.click('#m-go');await t.wait(700);const flashed=document.body.classList.contains('flash')||n>0;t.click('#m-go');P.createBufferSource=os;const S=t.S();t.click('[data-act="m-click"][data-v="beep"]');t.click('[data-act="m-flash"]');if(!(n>0&&S.mclick==='madeira'&&S.mflash===true))throw new Error('ruídos '+n+', '+JSON.stringify([S.mclick,S.mflash]));return n;`);
  await test('batidas: todas as batidas tocam junto por um compasso', `const t=__t;t.click('[data-act="nav"][data-v="treinar"]');t.click('[data-act="sub"][data-g="treinar"][data-v="batidas"]');const ids=[...document.querySelectorAll('[data-act="gr-pat"]')].map(b=>b.dataset.v);for(const id of ids){t.click('[data-act="gr-pat"][data-v="'+id+'"]');for(let i=0;i<20;i++)t.click('[data-act="gr-bpm"][data-d="4"]');t.click('[data-act="gr-toggle"]');await t.wait(2600);if(document.querySelector('[data-act="gr-toggle"]').textContent!=='Parar')throw new Error('não tocou: '+id);t.click('[data-act="gr-toggle"]');}return ids.length;`);
  await test('biblioteca: todos os acordes têm diagrama e teoria', `const t=__t;t.click('[data-act="nav"][data-v="acordes"]');t.click('[data-act="sub"][data-g="acordes"][data-v="acordes"]');t.click('[data-act="sub"][data-g="filtro"][data-v="todos"]');const names=[...document.querySelectorAll('.ctile .name')].map(n=>n.textContent.trim().replace(/ fácil$/,''));if(document.querySelectorAll('.ctile svg').length!==names.length)throw new Error('diagrama faltando');t.click('[data-act="sub"][data-g="acordes"][data-v="teoria"]');const bad=[];for(const n of names){const b=[...document.querySelectorAll('[data-act="th-pick"]')].find(x=>x.dataset.c===n);if(!b){bad.push(n);continue;}b.dispatchEvent(new MouseEvent('click',{bubbles:true}));if(t.broken()||document.querySelector('.thname').textContent!==n)bad.push(n);}if(bad.length)throw new Error('teoria falhou em '+bad.join(', '));return names.length;`);
  await test('escalas: tocar junto marca notas no braço', `const t=__t;t.click('[data-act="sg-toggle"]');await t.wait(1400);const on=!!document.querySelector('.sfb circle.on');t.click('[data-act="sg-toggle"]');return on;`);
  await test('músicas: adicionar, abrir a cifra, transpor e tocar junto', `const t=__t;t.click('[data-act="nav"][data-v="evolucao"]');t.click('[data-act="sub"][data-g="evolucao"][data-v="musicas"]');document.querySelector('#s-title').value='Teste';document.querySelector('#s-chords').value='G D Em C';document.querySelector('#s-cifra').value='G   D   Em   C\\nletra da música';t.click('[data-act="song-add"]');t.click('[data-act="song-play"]');const n0=document.querySelectorAll('.cif-ch[data-i]').length;if(document.querySelectorAll('.cmini .chord').length!==4)throw new Error('faixa de acordes: '+document.querySelectorAll('.cmini .chord').length);t.click('[data-act="song-tr"][data-d="1"]');t.click('[data-act="song-tr"][data-d="1"]');const first=document.querySelector('.cif-ch').textContent;t.click('[data-act="song-playalong"]');await t.wait(300);const playing=document.querySelector('[data-act="song-playalong"]').textContent==='Parar';t.click('[data-act="song-playalong"]');t.click('[data-act="song-close"]');return n0===4&&first==='A'&&playing;`);
  await test('meu treino: montar, salvar e compartilhar por código', `const t=__t;t.click('[data-act="nav"][data-v="meu"]');t.click('[data-act="ce-suggest"]');t.click('[data-act="ce-save"]');await t.wait(100);const n=t.S().custom.length;const code=__t.S().custom[0];document.querySelector('details.tcard summary').click();document.querySelector('#ct-code').value=location.origin+'/#treino='+btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify({n:'Recebido',c:code.chords,p:code.pats,b:code.bpm,m:code.min,r:0})))).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'');t.click('[data-act="ct-import"]');await t.wait(100);return n===1&&t.S().custom.length===2&&t.S().custom[1].name==='Recebido';`);
  await test('perfil: letra maior, tema escuro e canhoto', `const t=__t;t.perfil();t.click('[data-act="font"][data-v="2"]');t.click('[data-act="theme"][data-v="dark"]');t.click('[data-act="lefty"][data-v="1"]');const ok=getComputedStyle(document.documentElement).fontSize==='19px'&&document.documentElement.dataset.theme==='dark'&&t.S().lefty===true;t.click('[data-act="font"][data-v="0"]');t.click('[data-act="theme"][data-v=""]');t.click('[data-act="lefty"][data-v="0"]');return ok;`);
  await test('violão do app: nylon, aço e elétrico tocam (o aço com duas cordas por nota)', `const t=__t,P=(window.AudioContext||window.webkitAudioContext).prototype,os=P.createBufferSource;let n=0;P.createBufferSource=function(){n++;return os.call(this);};
    t.perfil();const counts={};
    for(const k of ['nylon','aco','eletrico']){t.click('[data-act="guitar"][data-v="'+k+'"]');n=0;t.click('[data-act="chord-play"][data-c="G"]');counts[k]=n;}
    P.createBufferSource=os;t.click('[data-act="guitar"][data-v="nylon"]');if(!(counts.nylon===6&&counts.aco===12&&counts.eletrico===6&&t.S().guitar==='nylon'))throw new Error(JSON.stringify(counts));return true;`);
  await test('notas gravadas: os arquivos existem, decodificam e o app as usa', `const t=__t;const ab=await fetch('sons/nylon/52.mp3').then(r=>{if(!r.ok)throw new Error('http '+r.status);return r.arrayBuffer();});
    const buf=await new Promise((res,rej)=>{const p=new OfflineAudioContext(1,1,44100).decodeAudioData(ab,res,rej);if(p&&p.then)p.then(res,rej);});if(!(buf.duration>.5))throw new Error('duração '+buf.duration);
    t.perfil();t.click('[data-act="guitar"][data-v="nylon"]');
    let txt='';for(let i=0;i<40;i++){txt=document.querySelector('#smp-state').textContent;if(/prontas/.test(txt))break;await t.wait(250);}if(!/prontas/.test(txt))throw new Error('estado: '+txt);
    const P=(window.AudioContext||window.webkitAudioContext).prototype,ob=P.createBiquadFilter;let filt=0;P.createBiquadFilter=function(){filt++;return ob.call(this);};t.click('[data-act="play-notes"][data-m="40,45,50,55,59,64"]');P.createBiquadFilter=ob;
    return 'duração '+buf.duration.toFixed(2)+' s, notas suaves com filtro: '+filt;`);
  await test('cópias automáticas: a de hoje existe e restaurar volta o nível', `const t=__t;let list=[];for(let i=0;i<30;i++){t.perfil();list=[...document.querySelectorAll('[data-act="bak-restore"]')];if(list.length)break;await t.wait(300);t.click('[data-act="nav"][data-v="hoje"]');}
    if(list.length!==1)throw new Error('cópias: '+list.length);const before=t.S().level;t.click('[data-act="set-level"][data-l="3"]');if(t.S().level!==3)throw new Error('nível não mudou');
    t.click('[data-act="bak-restore"]');t.click('[data-act="bak-restore"]');await t.wait(400);if(t.S().level!==before)throw new Error('restaurou nível '+t.S().level);return true;`);
  await test('cartão de progresso: gera uma imagem PNG', `const t=__t;t.click('[data-act="nav"][data-v="hoje"]');t.click('[data-act="free-add"][data-v="5"]');t.click('[data-act="nav"][data-v="evolucao"]');t.click('[data-act="sub"][data-g="evolucao"][data-v="numeros"]');let blob=null;const oc=URL.createObjectURL,ok=HTMLAnchorElement.prototype.click,sh=navigator.share;
    try{URL.createObjectURL=b=>{blob=b;return 'blob:x';};HTMLAnchorElement.prototype.click=function(){if(!this.download)ok.call(this);};navigator.share=undefined;t.click('[data-act="share-card"]');for(let i=0;i<20&&!blob;i++)await t.wait(150);}
    finally{URL.createObjectURL=oc;HTMLAnchorElement.prototype.click=ok;navigator.share=sh;}
    if(!blob||blob.type!=='image/png'||blob.size<5000)throw new Error('imagem: '+(blob&&blob.type)+' '+(blob&&blob.size));return Math.round(blob.size/1024)+' KB';`);
  await test('exportar e importar o progresso', `const t=__t;let blob=null;const oc=URL.createObjectURL;URL.createObjectURL=b=>{blob=b;return 'blob:x';};const ok=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(!this.download)ok.call(this);};t.perfil();t.click('[data-act="export"]');URL.createObjectURL=oc;HTMLAnchorElement.prototype.click=ok;const txt=await blob.text();const before=t.S().level;t.click('[data-act="set-level"][data-l="3"]');document.querySelector('details.tcard summary').click();document.querySelector('#imp-text').value=txt;t.click('[data-act="imp-paste"]');t.click('[data-act="imp-go"]');await t.wait(100);return JSON.parse(txt).app==='violao-diario'&&t.S().level===before;`);
  // criar um perfil recarrega a página: o clique é agendado e o teste seguinte espera a página voltar
  const reloaded = browser.cdp.wait('Page.loadEventFired');
  await test('perfis: criar um segundo perfil', `const t=__t;t.perfil();document.querySelector('#prof-name').value='Teste';setTimeout(()=>t.click('[data-act="prof-add"]'),50);return true;`);
  await reloaded; await browser.eval(HELPERS);
  await test('segundo perfil abre do zero; o principal continua salvo', `const t=__t;const reg=JSON.parse(localStorage.getItem('violao-diario-perfis'));const fresh=!!document.querySelector('[data-act="ob-go"]');const main=JSON.parse(localStorage.getItem('violao-diario-v1'));reg.current='';localStorage.setItem('violao-diario-perfis',JSON.stringify(reg));return reg.list.length===1&&fresh&&main&&main.onboarded===true;`);
  await browser.goto(srv.url); await browser.eval(HELPERS);
  await test('de volta ao principal, com o progresso e sem erros registrados', `const t=__t;return t.S().onboarded===true&&t.view()==='hoje'&&t.errs().length===0;`);

  // Microfone sintético: osciladores no lugar do microfone, um por nota; cada getUserMedia recebe um stream novo
  // (o app encerra as faixas ao desligar o microfone).
  await browser.eval(`window.__mic={ctx:null,oscs:{},setup(){if(!this.ctx){this.ctx=new AudioContext();navigator.mediaDevices.getUserMedia=async()=>{const d=this.ctx.createMediaStreamDestination();this.dest=d;Object.values(this.oscs).forEach(x=>x.g.connect(d));return d.stream;};}return this;},
    note(m,on){this.setup();if(on&&!this.oscs[m]){const o=this.ctx.createOscillator();o.frequency.value=440*Math.pow(2,(m-69)/12);const g=this.ctx.createGain();g.gain.value=.15;o.connect(g);if(this.dest)g.connect(this.dest);o.start();this.oscs[m]={o,g};}else if(!on&&this.oscs[m]){this.oscs[m].o.stop();delete this.oscs[m];}},
    chord(ms){Object.keys(this.oscs).forEach(m=>this.note(+m,false));ms.forEach(m=>this.note(m,true));}};'ok'`);
  await test('microfone: contar trocas pelo som (G e C)', `const t=__t,m=__mic.setup();t.click('[data-act="nav"][data-v="treinar"]');t.click('[data-act="sub"][data-g="treinar"][data-v="trocas"]');
    for(const [id,v] of [['t-a','G'],['t-b','C']]){const s=document.querySelector('#'+id);s.value=v;s.dispatchEvent(new Event('change',{bubbles:true}));}
    t.click('[data-act="t-mode"][data-v="mic"]');const real=Date.now;let off=0;Date.now=()=>real()+off;
    m.chord([43,47,50,55,59,67]);t.click('[data-act="t-start"]');await t.wait(500);off+=3000;await t.wait(700);
    for(let i=0;i<4;i++){m.chord(i%2?[43,47,50,55,59,67]:[48,52,55,60,64]);await t.wait(700);}
    const count=+document.querySelector('#t-n').textContent;off+=61000;await t.wait(500);Date.now=real;m.chord([]);
    const rec=t.S().changes['C|G'];if(!(count>=3&&rec&&rec.length===1&&rec[0].n===count))throw new Error('contou '+count+', registro '+JSON.stringify(rec));return count;`);
  await test('microfone: conferir o acorde pelo som (Am)', `const t=__t,m=__mic.setup();m.chord([45,52,57,60,64]);t.click('[data-act="nav"][data-v="acordes"]');t.click('[data-act="sub"][data-g="acordes"][data-v="acordes"]');t.click('[data-act="sub"][data-g="filtro"][data-v="todos"]');
    [...document.querySelectorAll('[data-act="chk-open"]')].find(x=>x.dataset.c==='Am').dispatchEvent(new MouseEvent('click',{bubbles:true}));await t.wait(1500);const ok=document.querySelector('#chk-msg').textContent;
    m.note(60,false);await t.wait(1500);const miss=document.querySelector('#chk-msg').textContent;t.click('[data-act="chk-close"]');m.chord([]);
    if(!/Soou como Am/.test(ok)||!/2ª corda/.test(miss))throw new Error(ok+' | '+miss);return true;`);
  await test('microfone: cantar a nota', `const t=__t,m=__mic.setup();t.click('[data-act="nav"][data-v="treinar"]');t.click('[data-act="sub"][data-g="treinar"][data-v="ouvido"]');t.click('[data-act="sub"][data-g="ouvido"][data-v="sing"]');
    t.click('[data-act="sing-mic"]');await t.wait(500);let hit=false;for(const p of [52,53,55,57,59,60,62]){m.chord([p]);await t.wait(900);if(/Certo/.test(document.querySelector('#sing-msg').textContent)){hit=true;break;}}
    t.click('[data-act="sing-mic"]');m.chord([]);if(!hit)throw new Error('nenhuma nota reconhecida como certa');return t.S().ear.ok>=1;`);
  await test('gravação de 30 segundos (gravar, guardar, listar)', `const t=__t,m=__mic.setup();m.chord([57]);t.click('[data-act="nav"][data-v="hoje"]');const d=document.querySelector('#hoje-more');if(d)d.open=true;
    if(!document.querySelector('[data-act="rec-start"]'))return 'sem MediaRecorder';t.click('[data-act="rec-start"]');await t.wait(2600);t.click('[data-act="rec-stop"]');await t.wait(900);m.chord([]);
    const recs=t.S().recs;if(recs.length!==1||recs[0].sec<2)throw new Error('gravações: '+JSON.stringify(recs));t.click('[data-act="open-recs"]');await t.wait(150);return !!document.querySelector('#rec-audio')&&document.querySelectorAll('[data-act="rec-play"]').length===1;`);
  await test('acessibilidade: nomes, rótulos, descrições e contraste', `const t=__t,bad=[];
    const chk=tag=>{document.querySelectorAll('#view button,#tabs button').forEach(b=>{if(!(b.textContent.trim()||b.getAttribute('aria-label')||b.title))bad.push(tag+': botão sem nome ('+(b.dataset.act||b.className)+')');});
      document.querySelectorAll('#view input,#view select,#view textarea').forEach(i=>{if(!(i.getAttribute('aria-label')||(i.id&&document.querySelector('label[for="'+i.id+'"]'))))bad.push(tag+': campo sem rótulo ('+(i.id||i.className)+')');});
      document.querySelectorAll('#view svg').forEach(s=>{if(!(s.getAttribute('aria-label')||s.getAttribute('aria-hidden')==='true'||s.closest('[aria-label]')||s.closest('button')))bad.push(tag+': desenho sem descrição');});
      document.querySelectorAll('#view img').forEach(i=>{if(!i.hasAttribute('alt'))bad.push(tag+': imagem sem alt');});};
    for(const [v,subs] of [['hoje',[]],['meu',[]],['treinar',['trocas','batidas','tempo','ouvido']],['ferramentas',['metronomo','afinador']],['acordes',['acordes','notas','teoria']],['evolucao',['numeros','roteiro','musicas']]]){t.click('[data-act="nav"][data-v="'+v+'"]');chk(v);for(const s of subs){t.click('[data-act="sub"][data-v="'+s+'"]');chk(v+'/'+s);}}
    t.perfil();chk('perfil');
    const lum=c=>{const k=c.match(/\\d+/g).map(Number),f=x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4);};return .2126*f(k[0])+.7152*f(k[1])+.0722*f(k[2]);},ratio=(a,b)=>{const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+.05)/(y+.05);};
    const probe=document.createElement('div');document.body.appendChild(probe);const col=v=>{probe.style.color='var('+v+')';return getComputedStyle(probe).color;};
    for(const theme of ['light','dark']){document.documentElement.dataset.theme=theme;[['--ink','--bg'],['--ink','--surface'],['--muted','--surface'],['--muted','--bg'],['--on-primary','--primary'],['--primary','--surface']].forEach(([f,b])=>{const r=ratio(col(f),col(b));if(r<4.5)bad.push('contraste '+theme+': '+f+' sobre '+b+' = '+r.toFixed(2));});}
    delete document.documentElement.dataset.theme;probe.remove();t.click('[data-act="nav"][data-v="hoje"]');
    if(bad.length)throw new Error([...new Set(bad)].slice(0,12).join('; '));return true;`);
} finally {
  await browser.close(); srv.close();
}
console.log(`Testes de tela: ${results.length - failed} de ${results.length} passaram.`);
if (failed) process.exit(1);
