# Diretor — roteiros visuais e acervo de cinematografia

App mobile (PWA + APK Android) para **criar roteiros cena a cena** com referências de cinematografia.
A ideia: você monta o roteiro escrevendo a descrição da cena e colocando o **insight visual** por cima —
escolhendo a técnica, a emoção que quer passar e até a luz — pra deixar o conteúdo mais cinematográfico,
artístico e com mensagem, e não só "na média".

> Não cria cenas automaticamente: você é o diretor. O app te dá o repertório, as referências e a estrutura.

## O que ele faz

- **Roteiros e cenas** — cada cena tem descrição + referência visual (técnica e/ou foto sua).
- **Acervo de técnicas** — 34 técnicas em 7 categorias (enquadramento, ângulos, movimento, luz e cor,
  áudio, ritmo/edição, transições), cada uma com **esquema visual**, explicação da perspectiva, como
  aplicar, **exemplos no YouTube** e **fotos de licença livre** (Wikimedia Commons).
- **Camada autoral** — campo de **mensagem** do vídeo, **emoção-alvo** por cena que **sugere técnicas**,
  **função narrativa** (gancho, clímax, respiro…) e **curva de ritmo** das cenas.
- **Modelos de arco** — 10 estruturas prontas (clássica, antes/depois, esporte, dia a dia, viagem,
  tutorial, mini-doc, reels, lista, contraste).
- **Luz da cena** — complemento manipulável: arraste o foco de luz (cima, baixo, lados, frontal,
  contraluz), com cor (quente/neutra/fria) e qualidade (suave/dura); a luz aparece sobre a ilustração.
- **Checklist de gravação** — marque as cenas já gravadas.
- **Backup** — exportar/importar todos os dados (roteiros + fotos) num arquivo `.json`.
- **Guia "Como decodificar uma cena"** — as 5 perguntas pra identificar a técnica de qualquer referência.
- **Funciona offline** e é instalável (PWA) ou empacotável como **APK** (Capacitor).

## Como rodar

- **No navegador / PWA:** abra `index.html` por um servidor estático (ex.: `node server.js`) e acesse
  `http://localhost:8123`. No Windows há os atalhos `iniciar-servidor.bat` / `fechar-servidor.bat`.
- **No celular (APK):** instale o `Diretor.apk`.
- Mais detalhes em [LEIA-ME.md](LEIA-ME.md).

## Tecnologia

HTML/CSS/JavaScript puro (sem framework). Dados de texto em `localStorage`, imagens em `IndexedDB`.
Service worker pra funcionar offline. APK gerado com Capacitor.

| Arquivo | O quê |
|---|---|
| `index.html` | Estrutura da página |
| `app.js` | Lógica, telas e armazenamento |
| `data.js` | Acervo (técnicas, emoções, funções, modelos) |
| `diagrams.js` | Esquemas visuais (SVG) das técnicas |
| `app.css` | Estilo |
| `sw.js` | Service worker (offline) |
| `server.js` | Servidor estático local |
