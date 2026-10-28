/* ============================================================
   Vercel Serverless Function — descoberta de referências visuais
   em fontes de licença livre (Openverse: Flickr, museus, etc).

   Dois modos (POST):
     { q: "termo" }        -> busca, devolve lista normalizada
     { baixar: "url" }     -> baixa a imagem e devolve dataURL
   O proxy existe por 2 motivos: evitar CORS no navegador e não
   expor o usuário a hosts arbitrários.
   ============================================================ */
const OPENVERSE = "https://api.openverse.org/v1/images/";
const MAX_BYTES = 6 * 1024 * 1024;
const UA = { "User-Agent": "Mozilla/5.0 (compatible; DiretorApp/1.0; referencias visuais)" };

module.exports = async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ erro: "Use POST." }); return; }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};

  const baixar = String(body.baixar || "").trim();
  if (baixar) return baixarImagem(baixar, res);

  const q = String(body.q || "").trim();
  if (!q) { res.status(400).json({ erro: "Faltou o termo de busca." }); return; }

  const url = OPENVERSE + "?" + new URLSearchParams({
    q,
    page_size: "24",
    license_type: "all-cc",   // só conteúdo com licença aberta
    mature: "false"
  }).toString();

  // Openverse costuma barrar acesso anônimo (429/Cloudflare); se falhar,
  // caímos no Wikimedia Commons, que funciona sem chave.
  try {
    const r = await fetch(url, { headers: UA });
    if (r.ok) {
      const data = await r.json();
      const itens = (data.results || []).map((x) => ({
        id: x.id,
        titulo: x.title || "",
        autor: x.creator || "",
        licenca: [x.license, x.license_version].filter(Boolean).join(" ").toUpperCase(),
        fonte: x.source || "openverse",
        pagina: x.foreign_landing_url || "",
        thumb: x.thumbnail || x.url,
        full: x.url
      })).filter((x) => x.thumb);
      if (itens.length) { res.status(200).json({ itens, fonte: "openverse" }); return; }
    }
  } catch (e) { /* cai no Commons */ }

  try {
    const itens = await buscarCommons(q);
    res.status(200).json({ itens, fonte: "wikimedia" });
  } catch (e) {
    res.status(502).json({ erro: "As fontes de busca não responderam agora. Tente de novo em instantes." });
  }
};

async function buscarCommons(q) {
  const url = "https://commons.wikimedia.org/w/api.php?" + new URLSearchParams({
    action: "query", format: "json", origin: "*",
    generator: "search", gsrnamespace: "6", gsrlimit: "24", gsrsearch: q,
    prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "500"
  }).toString();
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error("commons " + r.status);
  const json = await r.json();
  const pages = (json.query && json.query.pages) ? Object.values(json.query.pages) : [];
  const limpar = (h) => String(h || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 40);
  return pages.map((p) => {
    const ii = (p.imageinfo || [])[0];
    if (!ii || !ii.thumburl) return null;
    const meta = ii.extmetadata || {};
    return {
      id: String(p.pageid),
      titulo: String(p.title || "").replace(/^File:/, "").replace(/\.[a-z]+$/i, ""),
      autor: limpar(meta.Artist && meta.Artist.value) || "",
      licenca: (meta.LicenseShortName && meta.LicenseShortName.value) || "CC",
      fonte: "wikimedia",
      pagina: ii.descriptionurl || "",
      thumb: ii.thumburl,
      full: ii.url || ii.thumburl
    };
  }).filter(Boolean);
}

// Aceita link direto de imagem OU uma página (pin do Pinterest, item do
// Cosmos, post...) — nesse caso pega a imagem principal via og:image.
async function baixarImagem(url, res) {
  if (!/^https:\/\//i.test(url)) { res.status(400).json({ erro: "Use um link https." }); return; }
  try {
    let r = await fetch(url, { headers: UA, redirect: "follow" });
    if (!r.ok) { res.status(502).json({ erro: "Não consegui abrir o link (" + r.status + ")." }); return; }
    let tipo = (r.headers.get("content-type") || "").split(";")[0].toLowerCase();

    // É uma página: procura a imagem principal declarada no HTML.
    if (!/^image\//.test(tipo)) {
      if (!/html/.test(tipo)) { res.status(415).json({ erro: "O link não é imagem nem página." }); return; }
      const html = (await r.text()).slice(0, 400000);
      const img = acharOgImage(html, url);
      if (!img) { res.status(404).json({ erro: "Não achei a imagem principal dessa página. Copie a imagem direto e cole aqui." }); return; }
      r = await fetch(img, { headers: UA, redirect: "follow" });
      if (!r.ok) { res.status(502).json({ erro: "Achei a imagem mas não consegui baixar." }); return; }
      tipo = (r.headers.get("content-type") || "").split(";")[0].toLowerCase();
      if (!/^image\//.test(tipo)) { res.status(415).json({ erro: "A imagem da página é inválida." }); return; }
    }

    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > MAX_BYTES) { res.status(413).json({ erro: "Imagem grande demais." }); return; }
    res.status(200).json({ dataUrl: "data:" + tipo + ";base64," + buf.toString("base64") });
  } catch (e) {
    res.status(500).json({ erro: "Falha ao baixar.", detalhe: String(e).slice(0, 200) });
  }
}

function acharOgImage(html, base) {
  const padroes = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i
  ];
  for (const p of padroes) {
    const m = html.match(p);
    if (m && m[1]) {
      try { return new URL(m[1].replace(/&amp;/g, "&"), base).href; } catch (e) { /* segue */ }
    }
  }
  return null;
}
