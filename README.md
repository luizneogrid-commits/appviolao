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
| `manifest.webmanifest`, `sw.js`, `icons/` | Instalação e uso sem internet do site (PWA). |
| `android/` | Projeto do app Android (ícones, tela de abertura, permissão do microfone). |
| `ios/` | Projeto do app iPhone (Xcode). |
| `capacitor.config.json`, `package.json` | Configuração do Capacitor, a ponte entre o `index.html` e os apps nativos. |
| `scripts/` | Montagem do app (`build-www`), ícones (`make-icons`), compilação Android (`android-build`), chave de assinatura (`criar-chave`), material da loja (`store-assets`) e verificações (`check-syntax`, `check-data`, rodadas por `npm test` e pelo GitHub antes de compilar). |
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
- usa a fonte Archivo embutida no app, sem depender do Google Fonts, então abre rápido e sem internet;
- mantém a tela acesa enquanto o metrônomo, as batidas, o afinador, um bloco do treino ou a contagem de trocas estão rodando;
- vibra pelo motor de vibração do aparelho, inclusive no iPhone;
- no Android, o botão voltar leva para Hoje e, em Hoje, minimiza o app;
- guarda o progresso também no armazenamento do aparelho, que o sistema não apaga sozinho;
- pede o microfone pelo sistema na primeira vez que o afinador é ligado;
- manda um lembrete diário no horário escolhido em Evolução, Perfil (notificação local; no Android 13 ou mais novo o sistema pede permissão na primeira vez);
- no Android, segurar o ícone do app mostra atalhos para o afinador, o metrônomo e as trocas (`android/app/src/main/res/xml/shortcuts.xml`; cada atalho abre o app com um endereço `app.violaodiario://...` que o `index.html` lê).

No navegador, nada disso muda: o site continua igual.

## Bom saber

- O progresso fica salvo no aparelho de cada pessoa. O app Android, o site instalado e o link do Claude guardam progressos separados. Para mover de um para o outro, ou antes de trocar de celular, use Exportar e Importar em Evolução, Perfil, Seus dados.
- No iPhone, o site instalado e o Safari também guardam dados separados. Peça para a pessoa instalar primeiro e começar a usar depois.
- Som e microfone funcionam melhor no app ou no site instalado do que dentro de outros aplicativos.
- "Conferir pelo som" (Acordes, e no treino de Hoje) ouve o acorde e diz que corda não soou ou que dedo parece uma casa fora do lugar. É uma ajuda, não um juiz: funciona melhor em lugar silencioso e não enxerga tudo (uma corda grave que não devia tocar, por exemplo, nem sempre é notada).
- Canhoto: em Evolução, Perfil, Aparência, "Canhoto" espelha os desenhos de acordes e o braço.
- No iPhone, o microfone (afinador, contagem de trocas e conferir pelo som) exige iOS 13.4 ou mais novo. Se ele ligar mas não chegar som, o app mostra o nível do microfone e o botão "Religar o microfone"; feche outros apps que usem o microfone antes.
- A instalação do site exige `https://`. Em `http://` ou abrindo o arquivo direto do disco, o app funciona, mas sem instalação e sem uso offline.
- Os ícones dos apps saem de `scripts/make-icons.mjs`. Se mudar o desenho ou as cores, rode `npm run icons`.
