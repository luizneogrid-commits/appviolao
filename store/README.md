# Material para a Play Store

Tudo o que a ficha do app pede, pronto para copiar.

| Arquivo | O que é |
|---|---|
| `listagem.md` | Nome, descrição breve, descrição completa, categoria, política de privacidade e respostas do formulário de segurança dos dados. |
| `icone-512.png` | Ícone da loja, 512 x 512. |
| `feature-graphic.png` | Imagem de destaque, 1024 x 500. |
| `screenshots/` | Capturas de tela do celular, 1080 x 1920 (9:16), com dados de exemplo. |
| `screenshots-tablet7/`, `screenshots-tablet10/` | As mesmas telas em tablet de 7 polegadas (1200 x 1920) e de 10 polegadas (1600 x 2560), para as seções de tablet da ficha. |

## Gerar de novo

```
npm run loja
```

O comando refaz o ícone e a imagem de destaque com o desenho do app (`scripts/make-icons.mjs`) e, se encontrar o Chrome ou o Edge no computador, abre o app escondido, carrega um progresso de exemplo e fotografa as telas principais em `screenshots/`. Sem navegador, ele gera só as imagens e avisa.

A fonte Archivo da imagem de destaque é baixada do Google Fonts na primeira vez e guardada em `node_modules/.cache/archivo/`. Sem internet, o script usa uma fonte do sistema.

## Passo a passo na loja

1. Conta de desenvolvedor no Google Play Console (taxa única de US$ 25).
2. "Criar app": nome Violão Diário, idioma padrão português (Brasil), app gratuito.
3. "Configuração do app": preencha o questionário de classificação, o público-alvo (13+), a segurança dos dados e a política de privacidade com os textos de `listagem.md`.
4. "Presença na loja", "Ficha da loja principal": textos, ícone, imagem de destaque e capturas de tela desta pasta.
5. "Produção", "Criar nova versão": envie o `violao-diario.aab` do Release mais recente do GitHub (https://github.com/luizneogrid-commits/appviolao/releases/latest). Na primeira vez o Google ativa o Play App Signing.
6. Envie para análise. A primeira análise costuma levar alguns dias.

Para as versões seguintes, só o passo 5 se repete: suba o `.aab` novo (a versão interna precisa ser maior, e o `index.html` cuida disso) e cole as novidades da versão.
