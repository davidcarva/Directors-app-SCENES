"use strict";
// Servidor estático mínimo do app Diretor. Sem dependências.
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 8123;
const ROOT = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".webp": "image/webp"
};

const server = http.createServer((req, res) => {
  try {
    let urlPath = decodeURIComponent(req.url.split("?")[0]);
    if (urlPath === "/") urlPath = "/index.html";

    // Resolve dentro da pasta do app (evita sair do diretório)
    const filePath = path.join(ROOT, path.normalize(urlPath));
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      return res.end("Forbidden");
    }

    fs.stat(filePath, (err, stat) => {
      if (err || !stat.isFile()) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end("404 — arquivo nao encontrado");
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      fs.createReadStream(filePath).pipe(res);
    });
  } catch (e) {
    res.writeHead(500);
    res.end("Erro interno");
  }
});

// 0.0.0.0 => acessivel pelo PC (localhost) e pelo celular na mesma Wi-Fi
server.listen(PORT, "0.0.0.0", () => {
  console.log("Diretor rodando em:");
  console.log("  Neste PC:   http://localhost:" + PORT);
  console.log("  No celular: http://SEU-IP:" + PORT + "  (mesma Wi-Fi)");
  console.log("\nFeche esta janela ou rode fechar-servidor.bat para parar.");
});

server.on("error", (e) => {
  if (e.code === "EADDRINUSE") {
    console.log("A porta " + PORT + " ja esta em uso (o servidor talvez ja esteja aberto).");
  } else {
    console.log("Erro: " + e.message);
  }
  setTimeout(() => process.exit(1), 4000);
});
