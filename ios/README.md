# App iPhone: como compilar e publicar

O projeto desta pasta está pronto, mas **nunca foi compilado nem testado num iPhone**: compilar para iOS exige um Mac com Xcode, e nada disso roda no Windows nem no GitHub Actions gratuito. Esta lista é o caminho inteiro, na ordem.

## O que precisa

- Um Mac com macOS recente e o **Xcode 26** (ou mais novo) instalado pela App Store, com os componentes do iOS baixados na primeira abertura.
- **Node.js 22** (https://nodejs.org) e o **CocoaPods**: `sudo gem install cocoapods` (o Capacitor usa para instalar os plugins nativos).
- Para rodar no seu próprio iPhone: uma conta Apple gratuita basta (o app expira em 7 dias e precisa ser reinstalado).
- Para TestFlight e App Store: o **Apple Developer Program** (US$ 99 por ano), em https://developer.apple.com/programs/.

## Compilar e rodar no iPhone

```
git clone https://github.com/luizneogrid-commits/appviolao.git
cd appviolao
npm install
npm run ios
```

`npm run ios` monta a pasta `www/`, sincroniza os plugins (`npx cap sync ios`) e abre o Xcode. No Xcode:

1. Selecione o projeto **App** na barra lateral, alvo **App**, aba **Signing & Capabilities**. Marque "Automatically manage signing" e escolha a sua equipe (Team). O Bundle Identifier é `app.violaodiario`; se a Apple disser que já existe, troque também em `capacitor.config.json` (appId) e rode `npx cap sync ios` de novo.
2. Conecte o iPhone pelo cabo, libere "Confiar neste computador" e, no iPhone, ative o Modo Desenvolvedor (Ajustes, Privacidade e Segurança, Modo Desenvolvedor).
3. Escolha o iPhone no seletor de dispositivos e aperte Run (▶). Na primeira vez, o iPhone pede para confiar no desenvolvedor em Ajustes, Geral, VPN e Gerenciamento de Dispositivo.

## O que conferir no aparelho (nunca foi testado)

- Som: metrônomo, batidas e notas dos acordes, com e sem fone.
- Microfone: o afinador, a contagem de trocas e o "Conferir pelo som" devem pedir a permissão uma vez (texto em `App/App/Info.plist`, chave `NSMicrophoneUsageDescription`) e funcionar depois. O app usa a sessão de áudio `playAndRecord` com saída no alto-falante (`App/App/AppDelegate.swift`).
- Tela acesa durante o metrônomo e os treinos (plugin keep-awake).
- Vibração nos toques e nas trocas (plugin haptics).
- Lembrete diário: escolha um horário em Perfil (na barra de baixo), e veja se a notificação chega com o app fechado.
- Progresso guardado depois de fechar e reabrir o app (plugin preferences).
- Tela de abertura e ícone (gerados por `npm run icons`; o ícone de 1024 px está em `App/App/Assets.xcassets/AppIcon.appiconset`).

Se algo do microfone falhar, o `index.html` tem o painel "Diagnóstico" em Perfil (na barra de baixo), com o botão "Copiar diagnóstico".

## Publicar (TestFlight e App Store)

1. Em https://appstoreconnect.apple.com, crie o app: nome Violão Diário, idioma principal português (Brasil), Bundle ID `app.violaodiario`, SKU livre (por exemplo `violao-diario`).
2. No Xcode, escolha "Any iOS Device (arm64)" como destino e vá em **Product, Archive**. Quando terminar, na janela Organizer, **Distribute App**, **App Store Connect**, **Upload**.
3. No App Store Connect, aba TestFlight: adicione testadores internos (até 100, pelo Apple ID) e instale pelo app TestFlight no iPhone. É a hora de testar a lista acima com mais gente.
4. Aba App Store: preencha a ficha. Os textos de `store/listagem.md` servem aqui também (nome até 30 caracteres, subtítulo até 30, descrição até 4000, palavras-chave até 100). A política de privacidade é a mesma: https://luizneogrid-commits.github.io/appviolao/privacidade.html
5. Capturas de tela: a Apple exige para iPhone de 6,9" (1320 x 2868 ou 1290 x 2796). Tire no Simulador do Xcode (iPhone 16 Pro Max; Cmd+S salva a captura) com o app aberto nas mesmas telas de `store/screenshots/`.
6. "Privacidade do app": declare que o app **não coleta dados**. Microfone: usado só no aparelho, sem gravação.
7. Classificação etária: responda o questionário; o resultado esperado é 4+.
8. Envie para análise. A Apple costuma responder em um ou dois dias e às vezes pede um vídeo ou uma explicação do uso do microfone: "O afinador e a contagem de trocas analisam o som ao vivo; nada é gravado."

## Atualizar

A cada versão nova do `index.html` (aumente o `<meta name="app-version">`, como no Android), no Mac:

```
git pull
npm install
npm run ios
```

No Xcode, o número da versão (`MARKETING_VERSION`) e o build (`CURRENT_PROJECT_VERSION`) ficam em App, alvo App, aba General. Aumente os dois (o build sempre maior que o anterior), faça Archive e Upload de novo.
