# Diretor — roteiros e referências visuais

App web (PWA) pra montar roteiros visuais: você cria roteiros, adiciona cenas com
**referência visual em cima** e **descrição embaixo**, e consulta um **acervo de
técnicas de cinematografia** com explicação da perspectiva e de como aplicar.

Funciona offline e guarda tudo no próprio celular (nada vai pra internet).

## O que tem dentro

- **Roteiros** — crie quantos quiser; cada um tem várias cenas.
- **Cenas** — cada cena = uma técnica/insight visual + uma foto de referência (opcional) + a descrição.
- **Acervo** — 18 técnicas em 3 categorias:
  - Enquadramento e composição (regra dos terços, linhas-guia, moldura natural, profundidade, espaço de respiro, simetria)
  - Ângulos de câmera (nível do olho, plano baixo, plano alto, plano holandês, POV, sobre o ombro)
  - Movimento de câmera (tracking, dolly, câmera na mão, whip pan, orbit, revelação)
- Em cada técnica você cola **seus próprios prints** de filmes, YouTubers e Instagram.

## Como abrir no celular (Android)

O jeito mais fácil é hospedar de graça e abrir o link no celular:

### Opção A — Netlify Drop (sem conta, mais rápido)
1. No computador, acesse https://app.netlify.com/drop
2. Arraste a pasta inteira `Directors app` pra dentro da página.
3. Ele gera um link (ex: `https://algo.netlify.app`).
4. Abra esse link no Chrome do Android.
5. Menu (⋮) → **Adicionar à tela inicial**. Pronto, vira um app.

### Opção B — abrir no próprio PC (atalho)
- Use o atalho **Diretor** na Área de Trabalho (duplo-clique). Ele:
  - liga o servidor (`iniciar-servidor.bat`) e
  - abre o app no navegador em `http://localhost:8123`.
- Para desligar: rode **`fechar-servidor.bat`** (ou feche a janelinha "Diretor Server").

### Opção C — testar no celular pela mesma Wi-Fi
1. No PC, abra com o atalho **Diretor** (ou rode `iniciar-servidor.bat`).
2. Descubra o IP do computador (ex: `192.168.0.10`).
3. No celular (mesma Wi-Fi), abra `http://192.168.0.10:8123`.
   (Observação: alguns recursos de PWA pedem HTTPS — a Opção A é mais confiável pra instalar.)

### Atalhos / scripts (Windows)
- `iniciar-servidor.bat` — liga o servidor e abre o app no navegador.
- `fechar-servidor.bat` — desliga o servidor (libera a porta 8123).
- `server.js` — servidor estático leve em Node, sem dependências.
- Atalho **Diretor** na Área de Trabalho aponta pro `iniciar-servidor.bat`.

## Estrutura dos arquivos

- `index.html` — página principal
- `app.css` — visual (tema escuro, mobile)
- `app.js` — toda a lógica (telas, navegação, salvamento)
- `data.js` — o acervo de técnicas (texto curado)
- `sw.js` + `manifest.webmanifest` — fazem virar app instalável e offline
- `vendor/` — fonte de ícones (local, pra funcionar offline)
- `icon.svg` / `icon-maskable.svg` — ícone do app

## Onde os dados ficam

- Roteiros, cenas e descrições: `localStorage` do navegador.
- Fotos: `IndexedDB` (comprimidas pra não pesar).
- Tudo fica só no aparelho. Limpar os dados do site/navegador apaga o conteúdo.
