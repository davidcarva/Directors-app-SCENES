# Gerar o APK (Android)

O APK é uma **casca Capacitor** que abre o app publicado em
`https://directors-app-scenes.vercel.app` (ver `capacitor.config.json`).

**Por que não empacotamos os arquivos locais:** o app depende das funções
`/api/*` (IA de roteiro, análise de referência, descoberta) e do login
Google do Firebase. Dentro de um APK com arquivos locais, `fetch("/api/…")`
não existe e o login em WebView quebra. Apontando pro site, tudo funciona
igual — e o app **atualiza sozinho** a cada deploy, sem reinstalar.

## Pré-requisitos (já presentes nesta máquina)
- Node + npm
- **JDK 21** — o do Android Studio serve: `C:\Program Files\Android\Android Studio\jbr`
- Android SDK em `C:\Users\david\AppData\Local\Android\Sdk`

## ⚠️ O build NÃO roda na pasta do projeto
O caminho `D:\Repositórios locais\…` tem acento (**ó**) e o plugin do Android
falha com *"A sintaxe do nome do arquivo… está incorreta"*. Compile numa
pasta sem acento.

## Passo a passo

```bash
# 1) pasta de build sem acento
B=/c/Users/david/diretor-build
rm -rf "$B" && mkdir -p "$B/www"
P="/d/Repositórios locais/Directors-app-SCENES-main"
cp "$P/capacitor.config.json" "$P/package.json" "$P/package-lock.json" "$B/"
cp "$P/www/index.html" "$B/www/"

# 2) dependências + projeto android
cd "$B" && npm i && npx cap add android

# 3) apontar o SDK (barras normais! em .properties, \U vira escape inválido)
printf 'sdk.dir=C:/Users/david/AppData/Local/Android/Sdk\n' > android/local.properties

# 4) compilar com o JDK 21
cd android
export JAVA_HOME="/c/Program Files/Android/Android Studio/jbr"
export ANDROID_HOME="C:/Users/david/AppData/Local/Android/Sdk"
./gradlew assembleDebug --no-daemon

# 5) trazer o APK pro projeto
cp app/build/outputs/apk/debug/app-debug.apk "$P/Diretor.apk"
```

## Instalar no celular
Copie o `Diretor.apk` pro aparelho e abra. O Android vai pedir pra permitir
"instalar de fontes desconhecidas" (é um APK **debug**, não assinado pra loja).

## Armadilhas já resolvidas
| Erro | Causa | Solução |
|---|---|---|
| `non-ASCII characters` no path | acento em "Repositórios" | compilar em `C:/Users/david/diretor-build` |
| `A sintaxe do nome do arquivo… incorreta` | `sdk.dir=C:\Users\…` — `\U` é escape Unicode inválido | usar barras normais em `local.properties` |
| `invalid source release: 21` | Capacitor 8 exige JDK 21, o do PATH é 17 | `JAVA_HOME` = jbr do Android Studio |

## Observações
- **appId:** `app.diretor.cenas`. Se o APK antigo tinha outro id, este instala
  como um app separado (dá pra ter os dois).
- O `Diretor.apk` está no `.gitignore` (binário de ~4 MB) — ele não vai pro
  repositório. Compartilhe o arquivo direto.
- Alternativa sem APK: abrir o site no Chrome do Android e usar
  **⋮ → Instalar app** (PWA). Mesma coisa, e atualiza sozinho.
