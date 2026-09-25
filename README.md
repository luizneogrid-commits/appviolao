# Violão Diário

Treino diário de violão: plano por nível, metrônomo, afinador, batidas para tocar junto, acordes e notas.

O mesmo `index.html` vira três coisas:

- **Site instalável (PWA)**, publicado pelo GitHub Pages, que se instala pelo navegador e se atualiza sozinho.
- **App Android**, um APK de verdade gerado na nuvem pelo GitHub Actions, pronto para instalar ou mandar para a Play Store.
- **App iPhone**, um projeto Xcode pronto para compilar num Mac.

## O que tem aqui

| Arquivo | Para que serve |
|---|---|
| `index.html` | O app inteiro. É o arquivo que muda a cada atualização. |
| `manifest.webmanifest`, `sw.js`, `icons/`, `fonts/` | Instalação, atalhos do ícone e uso sem internet do site (PWA); a fonte Archivo vai junto. |
| `sons/` | Notas gravadas de violão (nylon, aço, guitarra limpa), CC BY 3.0; veja `sons/CREDITOS.md`. |
| `android/` | Projeto do app Android (ícones, tela de abertura, permissão do microfone). |
| `ios/` | Projeto do app iPhone (Xcode). |
| `capacitor.config.json`, `package.json` | Configuração do Capacitor, a ponte entre o `index.html` e os apps nativos. |
| `scripts/` | Montagem do app (`build-www`), ícones (`make-icons`), compilação Android (`android-build`), chave de assinatura (`criar-chave`), material da loja (`store-assets`) e verificações (`check-syntax`, `check-data` e os testes de tela `e2e`, rodados por `npm test` e pelo GitHub antes de compilar). |
| `store/` | Textos, ícone, imagem de destaque e capturas de tela para a Play Store (`npm run loja` refaz as imagens). |
| `privacidade.html` | Política de privacidade, publicada junto com o site; as lojas pedem o link. |
| `.github/workflows/android.yml` | Gera o APK na nuvem a cada envio para a branch `main`. |

## App Android

### Baixar e instalar

O GitHub gera o APK sozinho a cada envio para a branch `main` e anexa o arquivo ao Release da versão. O link abaixo sempre baixa o mais recente:

**https://github.com/luizneogrid-commits/appviolao/releases/latest/download/violao-diario.apk**

1. Abra o link no celular Android e baixe o arquivo.
2. Toque no arquivo baixado. Na primeira vez o Android pede para permitir "instalar apps desconhecidos" para o navegador: permita e volte.
3. Toque em "Instalar".

Para acompanhar uma compilação, abra a aba **Actions** do repositório. Para gerar de novo sem mudar nada, use "Run workflow" no workflow "App Android".

### Chave do app (fazer uma vez)

Todo APK é assinado. Sem a chave do app, o GitHub usa uma assinatura temporária, diferente a cada compilação. Nesse caso o celular não aceita instalar a versão nova por cima da antiga: é preciso desinstalar antes, e o progresso se perde.

Para as atualizações instalarem por cima, crie a chave uma vez, num computador com Node.js, Java (JDK 21) e o GitHub CLI logado (`gh auth login`), dentro da pasta do projeto:

```
npm install
npm run chave
```

O comando cria `android/violao-diario-upload.jks` e `android/keystore.properties` e grava a chave nos Secrets do repositório (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`). Esses arquivos ficam fora do git. **Guarde uma cópia deles em lugar seguro**: sem a chave não dá para atualizar o app, nem na Play Store.

Depois da chave criada, cada compilação sai assinada e o Release também traz o `violao-diario.aab`, o formato da Play Store. Quem instalou o APK de teste precisa desinstalá-lo uma vez antes de instalar o assinado.

### Publicar na Play Store

1. Crie uma conta de desenvolvedor no Google Play Console (taxa única de US$ 25).
2. Crie o app e envie o `violao-diario.aab` do Release. O Google ativa o "Play App Signing" e a chave do app passa a ser a sua chave de envio.
3. O identificador do app é `app.violaodiario` (em `capacitor.config.json` e `android/app/build.gradle`). Ele não muda depois da primeira publicação: se quiser outro, troque antes.
4. A ficha da loja (textos, ícone, imagem de destaque, capturas de tela, política de privacidade e formulário de segurança dos dados) está pronta em `store/`, com o passo a passo em `store/README.md`.

### Versão

A versão do app vem do `<meta name="app-version" content="1.2.3">` do `index.html`. O Android usa `1.2.3` como nome e `10203` como número interno, que a Play Store exige sempre maior. Então aumente a versão a cada atualização, como já se faz para o site. Cada parte da versão vai de 0 a 99.

### Compilar no próprio computador (opcional)

Com o Android Studio instalado (ele traz o Android SDK):

```
npm install
npm run apk        # APK de teste em dist/
npm run android    # abre o projeto no Android Studio
```

## App iPhone

A pasta `ios/` tem o projeto pronto, mas compilar para iPhone exige um Mac com Xcode 26 ou mais novo, e publicar exige uma conta Apple Developer (US$ 99 por ano). No Mac:

```
npm install
npm run ios
```

No Xcode, escolha a equipe em "Signing & Capabilities" e rode no iPhone conectado, ou use Product, Archive para mandar ao TestFlight e à App Store. O app iPhone ainda não foi testado num aparelho: a lista completa do que instalar, conferir e publicar está em `ios/README.md`.

## Site instalável (PWA)

O site é publicado pelo GitHub Pages em **https://luizneogrid-commits.github.io/appviolao/**

Para ativar: em Settings, Pages, escolha "Deploy from a branch", branch `main`, pasta `/ (root)`, e salve. Em um ou dois minutos o site estará no ar. O pacote usa só caminhos relativos, então funciona na raiz de um domínio ou dentro de uma subpasta, em qualquer hospedagem `https://`.

Instalar no celular: ao abrir o link, o próprio app mostra o aviso "Instale no celular".

- **Android (Chrome):** toque em "Instalar app" no aviso. Se o botão não aparecer: menu ⋮, "Instalar app" ou "Adicionar à tela inicial".
- **iPhone (Safari):** botão Compartilhar, "Adicionar à Tela de Início", "Adicionar".
- Se o link abrir dentro de outro aplicativo (Instagram, por exemplo), abra no navegador antes.

## Atualizar

1. Troque o `index.html` e aumente o número em `<meta name="app-version" ...>`.
2. Envie para a branch `main`. O site se atualiza sozinho para quem abrir com internet; se estiver aberto, aparece "Nova versão disponível".
3. O GitHub gera o APK novo. Quem usa o app Android baixa e instala pelo mesmo link (ou recebe pela Play Store, se publicado).

Só troque o `sw.js` se ele mudar. Se mudar a lista de arquivos guardados, aumente o nome `violao-diario-v1` para `v2`.

## O que muda quando o index.html roda como app

O `index.html` percebe que está dentro do app (Capacitor) e:

- esconde o aviso de instalação e a busca de atualização do site;
- traz a fonte Archivo dentro do pacote (`fonts/`, a mesma que o site usa), então abre rápido e sem internet;
- mantém a tela acesa enquanto o metrônomo, as batidas, o afinador, um bloco do treino ou a contagem de trocas estão rodando;
- vibra pelo motor de vibração do aparelho, inclusive no iPhone;
- no Android, o botão voltar leva para Hoje e, em Hoje, minimiza o app;
- no celular fica em pé (retrato); no tablet (largura mínima de 600 dp) gira junto com o aparelho (`MainActivity.java`);
- guarda o progresso também no armazenamento do aparelho, que o sistema não apaga sozinho;
- pede o microfone pelo sistema na primeira vez que o afinador é ligado;
- manda um lembrete diário no horário escolhido em Perfil (na barra de baixo) (notificação local; no Android 13 ou mais novo o sistema pede permissão na primeira vez);
- no Android, segurar o ícone do app mostra atalhos para o afinador, o metrônomo e as trocas (`android/app/src/main/res/xml/shortcuts.xml`; cada atalho abre o app com um endereço `app.violaodiario://...` que o `index.html` lê).

No navegador, nada disso muda: o site continua igual.

## Testes

`npm test` confere a sintaxe do `index.html`, os dados do app (acordes, batidas, roteiro, músicas, escalas) e, se houver Chrome ou Edge no computador, roda os testes de tela (`scripts/e2e.mjs`, que terminam com uma auditoria de acessibilidade do axe-core em cada tela, nos temas claro e escuro, falhando em problemas sérios ou críticos, e com uma passada em largura de tablet conferindo que nenhuma tela estoura para o lado): abre o app escondido e percorre a primeira tela, o treino de Hoje, todas as abas, ouvido, metrônomo, todas as batidas, todos os acordes na teoria, escalas, músicas com cifra, Meu treino, perfil, exportar e importar e perfis. Os recursos de microfone (contar trocas, conferir pelo som, cantar a nota, gravar) são testados com um microfone sintético: osciladores no lugar do microfone. Uma passada de acessibilidade confere que todo botão tem nome, todo campo tem rótulo, todo desenho tem descrição e que as cores dos dois temas têm contraste de pelo menos 4,5. Sem navegador, os testes de tela são pulados com aviso. `npm run test:telas` mostra cada teste. O GitHub roda tudo antes de compilar o Android.

## Bom saber

- O som das notas e dos acordes vem de notas gravadas de violão (pasta `sons/`: nylon, aço e guitarra limpa, uma nota a cada 3 semitons, do soundfont FluidR3_GM de Frank Wen via midi-js-soundfonts, licença CC BY 3.0, com crédito em "Sobre e ajuda"). No site, só o tipo escolhido é baixado, na primeira vez que o som é usado; no app vão embutidas. Enquanto carregam, ou sem os arquivos, toca a corda sintetizada (Karplus-Strong). Lá de referência em 440 Hz, temperamento igual. Em Perfil (na barra de baixo), "Violão do app" escolhe o timbre; os parâmetros da corda sintetizada, da "caixa" e da sala ficam em `GUITARS`, no começo do script do `index.html`. `node scripts/baixar-sons.mjs --forcar` baixa os arquivos de novo.
- Perfis: em Perfil (na barra de baixo), "Perfis neste aparelho" cria um progresso separado para outra pessoa no mesmo celular. O principal é o de sempre; os outros ficam em chaves próprias (`violao-diario-v1-p-...`). O lembrete diário é do aparelho: vale o último perfil que o configurou.
- Compartilhar um treino: em Meu treino, "Compartilhar" manda um link do site com o treino embutido (`#treino=...`). Quem abre recebe o treino; no app, cole o link em "Receber um treino por link ou código".
- Receber uma cifra de outro app: no navegador ou no app de cifras, selecione e copie o texto da cifra, use o menu Compartilhar e escolha o Violão Diário (app Android ou site instalado). O texto cai em Evolução, Músicas, "Adicionar música", com o nome e os acordes já preenchidos; compartilhar só o link da página não traz a cifra. No Android é o `MainActivity.java` que transforma o texto recebido num link `app.violaodiario://musica?texto=...`; no site é o `share_target` do manifesto. Ao colar uma cifra sem a lista de acordes, o app anota os acordes sozinho, e cada música tem "Compartilhar" (nome, acordes e cifra como texto).
- Metrônomo: além de bipe, madeira e clave, o clique pode ser uma bateria simples (bumbo, caixa e chimbal sintetizados), que segue o compasso e a subdivisão.
- Sua batida: em Treinar, Batidas, "Sua batida" monta uma batida própria (↓, ↑, x, B em 8 ou 6 casas). Ela fica salva no progresso (`mypats`), entra na lista de batidas, no tocar junto das músicas e em Meu treino. Um treino compartilhado por link não leva a batida junto: quem recebe fica só com as batidas prontas.
- Atalhos de teclado no computador: 1 a 7 trocam de aba, espaço liga e desliga o que estiver na tela (metrônomo, tocar junto), setas para cima e para baixo (ou + e -) mudam o BPM, Esc sai do modo palco.
- Afinador: "Lá de referência" (436 a 444 Hz) muda a leitura do microfone e o som das notas do app (as gravadas mudam de velocidade; as sintetizadas são recalculadas).
- Depois do nível 9, com as quatro metas cumpridas, Hoje monta um treino de manutenção (`maintPlan` no `index.html`): a cada dia uma semana diferente do roteiro inteiro, o par de acordes que a pessoa troca mais devagar e uma música (em andamento primeiro; dominadas inteiras nos outros dias).
- Evolução, Números: minutos por semana nas últimas 12 semanas (linha da meta semanal quando "Dias por semana" está definido), melhor troca por minuto de cada semana e acertos do ouvido por modalidade (contados a partir da 1.27).
- Cronômetro de prática livre (Hoje, "Mais", "Praticar agora"): guarda o instante em que começou (`freeStart`) e conta por relógio, então segue com a tela apagada ou o app fechado; "Parar e somar" registra os minutos no dia.
- O manifesto do site traz as capturas de `store/screenshots` (a instalação no Chrome mostra uma prévia), então `npm run loja` deve manter os mesmos nomes de arquivo.
- Acordes, Descobrir: "Que acorde é esse?" identifica um desenho marcado no diagrama (`chordIdentify`: cada nota como tônica contra as fórmulas de `FORMS`; tônica no baixo vale mais, senão vira acorde com baixo; a quinta pode faltar) e "Formas móveis" mostra as formas de E e de A com pestana em qualquer casa (`movShape`). `chordSVG` aceita um desenho pronto além do nome.
- Na cifra, "Tom provável" (`songKey`) pontua cada tom maior pelos graus presentes e mostra também o relativo menor e os acordes do tom.
- Tocar junto com trecho em loop: os seletores "do acorde" e "ao" (`SV.la`, `SV.lb`) recortam a sequência antes de `grStart`; a cifra marca o trecho e o destaque do acorde da vez usa o deslocamento. Cada passagem completa pela música inteira conta em `plays`; com três, a cifra sugere marcar como dominada.
- Volumes (Perfil, Som): o clique, a bateria e a contagem passam por um ganho próprio (`CLK`); o violão multiplica os ganhos da corda sintetizada e das amostras (`applyVolumes`).
- Voltar (Android) e Esc chamam `goBack`: fecha o desenho do acorde, o exercício de tempo, o palco e a música, uma coisa por vez; depois vai para Hoje e, no app, minimiza.
- Ouvido, Braço ("Onde está a nota?"): o app toca uma nota até a 7ª casa e a pessoa responde tocando num braço com as notas escondidas; qualquer posição com a mesma altura vale, e depois da resposta as posições certas aparecem. Conta nos acertos por modalidade.
- Conquistas: 21 (as seis últimas: cem dias de violão, cem dias seguidos, 3000 minutos, primeira música dominada, cinco dominadas e batida própria).
- Acordes meus: em Descobrir, "Guardar como acorde meu" guarda o desenho em `mychords` (nome no formato de cifra, uma casa por corda); `chordsSync` põe esses acordes em `CHORDS` e `CH` no grupo "meus", então aparecem na biblioteca, viram botões nas cifras e tocam. Sem números de dedos e sem a explicação de teoria quando o nome foge do formato conhecido.
- Seções da cifra: linhas como "[Intro]", "Refrão:" ou "Ponte" viram marcadores (`SECRE`); a cifra ganha atalhos "Ir para" e o trecho em loop mostra a seção de cada acorde. A cifra aceita até 12 mil caracteres (também no compartilhamento pelo Android) e avisa quando corta.
- Compartilhar a música manda a cifra no tom da tela: `cifraTransposeText` transpõe as linhas de acordes com o mesmo deslocamento dos desenhos (transposição menos capotraste).
- Modo roda: no palco, "Anterior" e "Próxima" (`song-nav`, ou as setas no teclado) abrem a música vizinha na ordem da lista, sem sair do palco.
- Tocar junto com "Subir aos poucos" (`ramp` por música): a cada volta completa pela sequência o andamento sobe 4 BPM, até 160, sem mudar o BPM guardado.
- Cópias: além das diárias (a primeira de cada dia, sete guardadas), `bakExit` grava a cópia "ao sair" sempre que o app vai para segundo plano (no máximo a cada 30 s); ela aparece no alto da lista em Perfil, Seus dados.
- Lembrete no calendário: `remindIcs` monta um evento com repetição diária no horário escolhido; no site é um arquivo .ics para baixar, no app vai pelo compartilhamento. É o caminho para o site instalado e para o iPhone, onde não há notificação.
- Biblioteca de acordes: filtro "Das minhas músicas" (`songChordSet`: os acordes conhecidos de todas as músicas cadastradas) e "Meus" (acordes guardados em Descobrir).
- Treino compartilhado: o código leva as batidas próprias usadas (campo `q`, com id, nome e casas); `parseTrain` as guarda em `mypats` de quem recebe (até 20) antes de montar o treino, então ela chega junto.
- Imprimir a cifra: o link "Imprimir" na música usa `window.print()`; as regras de impressão escondem os controles e deixam título, os primeiros desenhos e a cifra.
- Músicas: com mais de três cadastradas, busca por nome ou acorde e ordem por nome, recentes (última vez tocada junto) ou situação (`songsView`); as setas de reordenar só aparecem na ordem de cadastro sem busca. Cada linha mostra as vezes tocadas junto (`plays`) e a última (`lastPlay`).
- Evolução, Números: painel Repertório (músicas por situação, dominadas, a mais tocada). Biblioteca, filtro "Das minhas músicas": lista os acordes das cifras que o app não conhece, e o toque leva a Descobrir com o nome preenchido (`CFI.want`).
- Tocar junto: "Bater o andamento" (`song-tap`) usa a média dos últimos toques como BPM da música, como o tap do metrônomo.
- Importar tem dois caminhos: "Substituir" (`adopt`) e "Juntar com o que já tenho" (`mergeData`): o arquivo passa pela validação do carregamento e depois soma-se ao aparelho (dias com o maior tempo, músicas por nome, batidas e acordes meus por id ou nome, treinos por código, marcas e conquistas pelo melhor); as gravações não são juntadas, porque o áudio fica no aparelho de origem.
- Afinação guiada (afinador por corda com o microfone ligado): lista das seis cordas; a que está soando fica marcada e, depois de alguns instantes afinada, ganha ✓ (estado só daquela ligada do microfone).
- Aviso de última hora (app Android): com o lembrete ligado, uma segunda série de notificações às 21h, agendada só para dias sem prática (ids após `REMIND_N`; reagendada quando a prática do dia é registrada).
- Hoje, bloco de técnica: "Outro exercício" troca pelo próximo da mesma semana do roteiro (`S.adj.tech`), como o "Como foi?" de ontem já fazia.
- Ouvido em níveis (intervalos e acordes): `S.earLvl` guarda o nível (1 a 3) e `S.earRun` a rodada; dez respostas com 80% de acerto sobem o nível (`earLevelUp`). Intervalos do nível 1: oitava, quinta e terça maior; nível 2 soma quarta, terça menor e segunda; nível 3 tem todos. Acordes: 2, 3 ou 4 opções.
- Ao trocar de aba, `focusView` põe o foco no título da tela nova (leitor de tela começa pelo título; sem anel de foco para toque e mouse).
- Cifra com colchetes (ChordPro, "[C]letra"): `inlineChords` transforma cada colchete num botão de acorde e mantém a letra; a transposição para compartilhar também troca os colchetes.
- Forma com pestana: `barreAlt` monta, para maiores, menores e com sétima, a versão na forma de E ou de A (a mais perto da pestana; a outra, se a biblioteca já usar aquela), mostrada no desenho da cifra e na biblioteca.
- Rolagem "no ritmo" (`ritmoRate`): a distância até o fim da página dividida pela duração do tocar junto (acordes, compassos por acorde, casas da batida e BPM), recalculada a cada dois segundos; com o tocar junto ligado, o acorde da vez também é trazido para a tela.
- Em telas de 900 px ou mais, a música usa `.svgrid`: o painel de tocar junto fica fixo à esquerda e a cifra à direita.
- Evolução, "Onde vai o tempo": soma os minutos creditados por bloco (`days[k].done[id]`) por tipo; o que sobra do total do dia entra em "prática livre e outros" (blocos antigos sem crédito numérico também caem aí).
- Nos treinos com batida, cada acorde aparece com o nome e o desenho no braço: a fileira de acordes de Batidas e de Meu treino (até quatro acordes; com mais, ficam o "Agora" e o "Depois"), e o bloco de ritmo de Hoje mostra os acordes da primeira progressão do nível, os mesmos que o tocar junto usa.
- Painéis e linhas que são atalhos (`role="button"` com `data-act="go-..."`): a faixa da semana de Hoje, "Esta semana", o desafio da semana, Repertório, Ouvido por modalidade e as Marcas; o nome da música na lista abre a cifra. As barras dos gráficos trazem um `<title>` com o dia ou a semana e o valor.
- Bloco em andamento fora de Hoje: `mPaint` desenha na pílula o bloco e o tempo que falta (com "Voltar" e, se o metrônomo estiver tocando, "Parar som"); o tique do bloco atualiza o tempo; `blockBar` põe "Voltar ao treino" no alto de Batidas, Trocas, Tempo e Metrônomo; `blockDone` avisa qual bloco terminou e quanto contou, em qualquer tela.
- Evolução, Diário: dez últimos registros com "Ver todos" (`diaryAll`); conquistas por vir mostram quanto falta (`BADGE_LEFT`, só as que têm número).
- Treinar, Mão esquerda (`MAO_EX`): exercícios de mobilidade e de troca de acordes. Os de sequência (aranha, 1-3-2-4, 4-3-2-1, alongamento, mindinho, trilhos) tocam no mesmo motor do aquecimento e da escala (`sgStart` com kind "mao"), numa grade de casas genérica (`fretGridSVG`) em que o número é o dedo; "Pivô" lista os pares de acordes do nível com dedo âncora (`pivotPairs`) e abre as Trocas; "Voo dos dedos" e "Pressão mínima" são guiados por texto com o acorde do nível, conferir pelo som e metrônomo. O aquecimento de Hoje cita dois deles e tem o atalho.
- Cifra: "Repetir" (`song-sec-loop`) usa o índice de acorde em que cada seção começa para marcar o trecho em loop; no palco com o tocar junto ligado, "Agora" e "Depois" (`#st-now`, `#st-next`) são atualizados a cada acorde. "Vibrar na troca de acorde" (`grVib`, Perfil, Som) vibra a cada mudança de acorde no tocar junto e nas batidas.
- Gravações: "Compartilhar" (`rec-share`) lê o áudio do IndexedDB e manda pelo compartilhamento com arquivo (no site, baixa com a extensão do tipo gravado). Evolução: "Dias da semana" (`dowBars`, minutos por dia da semana) e "Imprimir a evolução" (regras de impressão que mostram os gráficos inteiros e escondem os controles).
- Hoje em telas de 900 px ou mais: `.hgrid` com o treino (`.hmain`) à esquerda e, à direita, os avisos com o desafio (`.hside-top`) e a cópia de segurança (`.hside-bottom`); no celular a ordem continua a mesma (faixa da semana, avisos, treino, cópia). O guia do iniciante ganhou "Afinar de ouvido pela casa 5", e `open-guia` aceita `data-card` para abrir um card específico.
- Acordes → Teoria: "Campo harmônico" (`harmonicPanel`, `keyChords`; `hfShape` usa a forma móvel de `MOV` quando a biblioteca não tem o desenho, e o diminuto fica só com o som): tom maior ou menor, sete graus com função, cadência, progressões comuns (`HF_PROGS`) e "Monte a sua progressão" (`TH.hs`; `hf-gr` manda para o Tocar junto de Batidas, que mostra a progressão escolhida como chip; `hf-save` cria um treino em Meu treino). Na cifra, `songKey` devolve `k` e a linha do tom tem "Ver o campo harmônico" (`open-campo`) e os acordes fora do tom (`songOutOfKey`).
- Tocar junto: progressão "Surpresa" (`BAT.rand`, `randProg` sorteia entre `earPool()` e os acordes das músicas; `grStep` troca a progressão a cada volta e anuncia o próximo acorde no `#gr-status`; `gr-rand` é o atalho em Trocas). Trocas: "Par sugerido" (`pairSuggest`: pares do roteiro nunca medidos ou com o menor recorde; `t-pair` preenche os dois acordes). Ouvido: modalidade "Batida" (`bat`: `patPlayOnce` toca dois compassos de uma batida de mão inteira num acorde; opções com `patLabel`; entra em `earLevelUp` e em `EM`).
- Cifra: "Só a letra" (`SV.lyrics`; `cifraParse` põe cada linha de acordes num `span.cl` com a própria quebra, e o CSS esconde `.cl` e `.cif-ch`). Linhas de tablatura (`TABRE`) viram `span.cif-tab`, monoespaçado com rolagem lateral, fora da detecção de acordes. "Voltar onde parou" (`whereSave` em `onHide`, `whereRestore` antes do primeiro `render`, janela de 30 minutos, sem link profundo). Perfil, Seus dados: `navigator.storage.estimate()` e `persisted()` (`STO`, `stoRefresh`), `stoPersist` pede persistência no site depois de dez dias de prática, e `rec-prune` apaga as gravações além das dez últimas.
- Treinar → Mãos: a subaba `mao` ganhou o par Mão esquerda / Mão direita (`MAO.hand`). A mão direita (`MD`, `MD_EX`, `mdView`) tem oito exercícios de dedilhado escritos como células do tocar junto (P, b, I, M, A, C); cada um vira uma entrada `md-*` em `PAT` (fora de `PATTERNS`) e toca com `grStart` numa configuração própria (`noRec`: não entra nos recordes do tocar junto), com o acorde à escolha entre os do nível e o BPM (`md-bpm`). Atalhos: `open-md` em Batidas e no aquecimento de Hoje.
- Adicionar música: `cifraHeader` lê "Tom:" e "Capotraste na Nª casa" (a música recebe `capo` e `tr` iguais, para os acordes ficarem como escritos, e `tomHdr`/`capoHdr` para a linha do tom); nome repetido pede confirmação (`SV.dup`, `song-add-dup`); o formulário é um rascunho (`draftSave`/`draftLoad`/`draftClear`, chave `KEY-rascunho`, carregado no boot em `SV.pre` com `draft:true`). Busca de músicas: um nome de acorde válido (`CHRE`) filtra pelo acorde exato. Cartão do acorde (`chordPop`): `chordFacts` (situação, músicas suas, recorde de trocas) e "Músicas com este acorde" (`songs-with` preenche `SV.q`).
- Desafio da semana (`S.chal`, um por semana, `chalNew`): dias, minutos, passar a melhor troca de um par, tocar uma música inteira três vezes ou cinco acertos seguidos no ouvido; o tipo gira com a semana entre os que se aplicam. Dias, minutos e trocas são lidos dos registros; música e ouvido contam nos eventos (`recordPlay`, `chalEar`). Cumpridos ficam em `chalLog`.
- Gravação de 30 ou 60 segundos (`recSecs`). No cadastro, "Não sei meu nível" (`obQuiz`/`obSuggest`): acordes que saem limpos, pestana e trocas por minuto sugerem o nível de 1 a 5.
- Links que abrem no app (Android App Links): o manifesto declara os endereços `https://luizneogrid-commits.github.io/appviolao/...` e o site publica `.well-known/assetlinks.json` com a impressão digital SHA-256 do certificado do app. Com isso, um link de treino ou um atalho `?ir=afinador` abre direto no app instalado. Depois de publicar na Play Store, o Google passa a assinar o app com a chave dele: pegue a impressão digital em Play Console, Configuração do app, Integridade do app, "Certificado da chave de assinatura do app", e acrescente à lista `sha256_cert_fingerprints` (mantendo a atual, que é a da chave de upload e serve para o APK do GitHub).

- O progresso fica salvo no aparelho de cada pessoa. O app Android, o site instalado e o link do Claude guardam progressos separados. Para mover de um para o outro, ou antes de trocar de celular, use Exportar e Importar em Perfil (na barra de baixo), Seus dados. O app também guarda, no próprio aparelho, uma cópia automática por dia (as últimas sete), com "Restaurar" no mesmo lugar.
- Quem instalou pelo APK recebe, dentro do app, o aviso de versão nova (o app consulta o último Release do GitHub) com o link para baixar; pela Play Store, a loja atualiza.
- Em Evolução, Números, "Compartilhar meu progresso" gera uma imagem com a sequência, os minutos e o nível, pelo compartilhamento do celular.
- No iPhone, o site instalado e o Safari também guardam dados separados. Peça para a pessoa instalar primeiro e começar a usar depois.
- Som e microfone funcionam melhor no app ou no site instalado do que dentro de outros aplicativos.
- "Conferir pelo som" (Acordes, e no treino de Hoje) ouve o acorde e diz que corda não soou ou que dedo parece uma casa fora do lugar. É uma ajuda, não um juiz: funciona melhor em lugar silencioso e não enxerga tudo (uma corda grave que não devia tocar, por exemplo, nem sempre é notada).
- Canhoto: em Perfil (na barra de baixo), Aparência, "Canhoto" espelha os desenhos de acordes e o braço.
- No iPhone, o microfone (afinador, contagem de trocas e conferir pelo som) exige iOS 13.4 ou mais novo. Se ele ligar mas não chegar som, o app mostra o nível do microfone e o botão "Religar o microfone"; feche outros apps que usem o microfone antes.
- A instalação do site exige `https://`. Em `http://` ou abrindo o arquivo direto do disco, o app funciona, mas sem instalação e sem uso offline.
- Os ícones dos apps saem de `scripts/make-icons.mjs`. Se mudar o desenho ou as cores, rode `npm run icons`.
