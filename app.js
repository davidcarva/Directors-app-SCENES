"use strict";

/* ============================================================
   Diretor — app de roteiros + acervo de técnicas
   Dados de texto: localStorage. Imagens: IndexedDB (blobs).
   ============================================================ */

const app = document.getElementById("app");
const fileInput = document.getElementById("file-input");

/* ---------------- IndexedDB (imagens) ---------------- */
function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open("diretor", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("imgs", { keyPath: "id" });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbPut(blob) {
  const id = "img_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction("imgs", "readwrite");
    tx.objectStore("imgs").put({ id, blob });
    tx.oncomplete = () => res(id);
    tx.onerror = () => rej(tx.error);
  });
}
async function idbPutId(id, blob) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction("imgs", "readwrite");
    tx.objectStore("imgs").put({ id, blob });
    tx.oncomplete = () => res(id);
    tx.onerror = () => rej(tx.error);
  });
}
async function idbGet(id) {
  if (!id) return null;
  const db = await openDB();
  return new Promise((res) => {
    const tx = db.transaction("imgs", "readonly");
    const rq = tx.objectStore("imgs").get(id);
    rq.onsuccess = () => res(rq.result ? rq.result.blob : null);
    rq.onerror = () => res(null);
  });
}
async function idbDel(id) {
  if (!id) return;
  const db = await openDB();
  return new Promise((res) => {
    const tx = db.transaction("imgs", "readwrite");
    tx.objectStore("imgs").delete(id);
    tx.oncomplete = () => res();
    tx.onerror = () => res();
  });
}

/* ---------------- localStorage ---------------- */
const store = {
  getRoteiros() {
    try { return JSON.parse(localStorage.getItem("roteiros") || "[]"); }
    catch { return []; }
  },
  saveRoteiros(r) { localStorage.setItem("roteiros", JSON.stringify(r)); },
  getTecImgs() {
    try { return JSON.parse(localStorage.getItem("tecImgs") || "{}"); }
    catch { return {}; }
  },
  saveTecImgs(m) { localStorage.setItem("tecImgs", JSON.stringify(m)); }
};

function uid(p) { return p + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7); }

/* ---------------- Imagens: compressão + render ---------------- */
function compress(file) {
  return new Promise((res) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 1280;
      let w = img.width, h = img.height;
      if (w > h && w > max) { h = Math.round((h * max) / w); w = max; }
      else if (h >= w && h > max) { w = Math.round((w * max) / h); h = max; }
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      c.toBlob((b) => res(b || file), "image/jpeg", 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(url); res(file); };
    img.src = url;
  });
}

let pendingPick = null;
function pickImage(cb) {
  pendingPick = cb;
  fileInput.value = "";
  fileInput.click();
}
fileInput.addEventListener("change", async () => {
  const file = fileInput.files && fileInput.files[0];
  if (!file || !pendingPick) return;
  const cb = pendingPick;
  pendingPick = null;
  const blob = await compress(file);
  const id = await idbPut(blob);
  cb(id);
});

const urlCache = [];
function clearUrls() {
  urlCache.forEach((u) => URL.revokeObjectURL(u));
  urlCache.length = 0;
}
async function fillImg(el, id) {
  const blob = await idbGet(id);
  if (!blob || !el) return;
  const u = URL.createObjectURL(blob);
  urlCache.push(u);
  el.src = u;
}

/* ---------------- Helpers de domínio ---------------- */
function getRoteiro(id) { return store.getRoteiros().find((r) => r.id === id); }
function updateCena(rid, cid, patch) {
  const all = store.getRoteiros();
  const r = all.find((x) => x.id === rid);
  const c = r && r.cenas.find((x) => x.id === cid);
  if (!c) return null;
  Object.assign(c, patch);
  r.atualizadoEm = Date.now();
  store.saveRoteiros(all);
  return c;
}
function blobToDataURL(blob) {
  return new Promise((res) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = () => res(null);
    fr.readAsDataURL(blob);
  });
}
function updateRoteiro(id, patch) {
  const all = store.getRoteiros();
  const r = all.find((x) => x.id === id);
  if (!r) return null;
  Object.assign(r, patch);
  r.atualizadoEm = Date.now();
  store.saveRoteiros(all);
  return r;
}
function emocao(id) { return (window.EMOCOES || []).find((e) => e.id === id); }
function funcao(id) { return (window.FUNCOES || []).find((f) => f.id === id); }

// Curva de energia das cenas (sparkline) baseada na função de cada cena.
function curvaRitmo(cenas) {
  if (!cenas.length) return "";
  const w = 320, h = 64, pad = 10;
  const pts = cenas.map((c, i) => {
    const f = funcao(c.funcao);
    const e = f ? f.energia : 3;
    const x = cenas.length === 1 ? w / 2 : pad + (i * (w - 2 * pad)) / (cenas.length - 1);
    const y = h - pad - ((e - 1) / 4) * (h - 2 * pad);
    return [x, y];
  });
  const path = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const dots = pts.map((p) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3" fill="#e0c060"/>`).join("");
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%;height:64px;display:block">
      <line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}" stroke="#333" stroke-width="1"/>
      <path d="${path}" fill="none" stroke="#e0c060" stroke-width="2" stroke-linejoin="round"/>${dots}
    </svg>`;
}

/* ---------------- Luz da cena (complemento manipulável) ---------------- */
const LUZ_CORES = { quente: "255,206,140", neutra: "255,247,235", fria: "188,214,255" };
const LUZ_DEFAULT = { x: 50, y: 10, cor: "neutra", suave: true, contra: false };
function luzRgb(luz) { return LUZ_CORES[luz && luz.cor] || LUZ_CORES.neutra; }
function luzSphereBg(luz) {
  const rgb = luzRgb(luz);
  if (luz.contra) return "radial-gradient(circle at 50% 50%, #2c2c2c, #141414 72%)";
  const mid = luz.suave ? "44%" : "34%";
  return `radial-gradient(circle at ${luz.x}% ${luz.y}%, rgba(${rgb},1), #6c6c6c ${mid}, #161616 80%)`;
}
function luzGlowBg(luz) {
  const rgb = luzRgb(luz);
  if (luz.contra) return `radial-gradient(circle at 50% 47%, rgba(${rgb},0.75), rgba(${rgb},0) 44%)`;
  const spread = luz.suave ? "66%" : "40%";
  return `radial-gradient(circle at ${luz.x}% ${luz.y}%, rgba(${rgb},0.6), rgba(${rgb},0) ${spread})`;
}
function luzOverlayStyle(luz) { return "background:" + luzGlowBg(luz) + ";"; }
function luzOverlay(luz) { return luz ? `<div class="luz-overlay" style="${luzOverlayStyle(luz)}"></div>` : ""; }
function luzLabel(luz) {
  if (!luz) return "";
  if (luz.contra) return "Contraluz";
  if (luz.y <= 33) return "Luz de cima";
  if (luz.y >= 67) return "Luz de baixo";
  if (luz.x <= 33) return "Luz à esquerda";
  if (luz.x >= 67) return "Luz à direita";
  return "Luz frontal";
}
function luzStage(luz) {
  return `<div class="luz-stage" id="luz-stage">
      <div class="luz-glow" style="background:${luzGlowBg(luz)}"></div>
      <div class="luz-ball" style="background:${luzSphereBg(luz)}"></div>
      ${luz.contra ? "" : `<div class="luz-handle" id="luz-handle" style="left:${luz.x}%;top:${luz.y}%"><i class="ti ti-sun"></i></div>`}
    </div>`;
}
// Atualiza a luz ao vivo (sem re-render) durante o arrasto.
function aplicarLuzLive(luz) {
  const glow = document.querySelector("#luz-stage .luz-glow");
  const ball = document.querySelector("#luz-stage .luz-ball");
  const handle = document.getElementById("luz-handle");
  if (glow) glow.style.background = luzGlowBg(luz);
  if (ball) ball.style.background = luzSphereBg(luz);
  if (handle) { handle.style.left = luz.x + "%"; handle.style.top = luz.y + "%"; }
  document.querySelectorAll(".luz-overlay").forEach((o) => o.setAttribute("style", luzOverlayStyle(luz)));
}
function cenaLuz(rid, cid) {
  const r = getRoteiro(rid);
  const c = r && r.cenas.find((x) => x.id === cid);
  return c && c.luz ? c.luz : Object.assign({}, LUZ_DEFAULT);
}
function tecnica(id) { return window.TECNICAS.find((t) => t.id === id); }
function categoria(id) { return window.CATEGORIAS.find((c) => c.id === id); }
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
function plural(n, sing, plu) { return n + " " + (n === 1 ? sing : plu); }
function diagrama(id) { return (window.DIAGRAMAS && window.DIAGRAMAS[id]) || ""; }
function ytUrl(busca) { return "https://www.youtube.com/results?search_query=" + encodeURIComponent(busca); }

// Buscas de foto (Wikimedia Commons) por técnica — termos pensados pra trazer fotos reais.
const COMMONS_Q = {
  tercos: "rule of thirds photography",
  "linhas-guia": "leading lines photography road",
  "moldura-natural": "natural framing photography window",
  profundidade: "depth of field bokeh photography",
  "espaco-respiro": "portrait profile looking away",
  simetria: "symmetry architecture photography",
  "nivel-olho": "eye level portrait photography",
  "contre-plongee": "low angle photography building",
  plongee: "high angle aerial view street",
  dutch: "dutch angle photography",
  pov: "first person view pov cycling",
  "over-shoulder": "over the shoulder view photography",
  tracking: "motion blur running sport",
  dolly: "corridor hallway perspective depth",
  handheld: "street photography candid",
  "whip-pan": "panning motion blur photography",
  orbit: "low angle person against sky",
  reveal: "silhouette doorway light",
  "golden-hour": "golden hour landscape photography",
  contraluz: "backlight silhouette photography",
  "luz-qualidade": "soft light portrait photography",
  paleta: "color grading film still",
  "som-ambiente": "nature field recording",
  "voz-perto": "microphone interview recording",
  trilha: "music studio recording",
  silencio: "quiet calm landscape",
  "corte-batida": "video editing timeline",
  cobertura: "film camera on set",
  "jump-cut": "video editing screen",
  "b-roll": "b roll footage city",
  "match-cut": "film editing studio",
  "corte-movimento": "motion blur action sport",
  "mascara-objeto": "foreground object street photography",
  fundido: "double exposure photography"
};

function limparHtml(s) {
  const d = document.createElement("div");
  d.innerHTML = s || "";
  let t = (d.textContent || "").replace(/\s+/g, " ").trim();
  if (t.length > 26) t = t.slice(0, 24) + "…";
  return t || "autor";
}

// Carrega fotos de exemplo (licença livre) do Wikimedia Commons e preenche o elemento.
async function carregarFotos(tid, el) {
  if (!el) return;
  const term = COMMONS_Q[tid];
  if (!term) { el.innerHTML = ""; return; }
  const cacheKey = "fotos_" + tid;
  let dados = null;
  try { dados = JSON.parse(sessionStorage.getItem(cacheKey) || "null"); } catch (e) {}

  if (!dados) {
    const url =
      "https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*" +
      "&generator=search&gsrnamespace=6&gsrlimit=6&gsrsearch=" + encodeURIComponent(term) +
      "&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=400";
    try {
      const res = await fetch(url);
      const json = await res.json();
      const pages = json.query && json.query.pages ? Object.values(json.query.pages) : [];
      dados = pages.map((p) => {
        const ii = p.imageinfo && p.imageinfo[0];
        if (!ii || !ii.thumburl) return null;
        const meta = ii.extmetadata || {};
        return {
          thumb: ii.thumburl,
          src: ii.descriptionurl,
          autor: limparHtml((meta.Artist && meta.Artist.value) || ""),
          lic: (meta.LicenseShortName && meta.LicenseShortName.value) || "CC"
        };
      }).filter(Boolean);
      sessionStorage.setItem(cacheKey, JSON.stringify(dados));
    } catch (e) { dados = null; }
  }

  // O elemento pode ter sido substituído por outra navegação — revalida.
  el = document.getElementById("fotos-grid");
  if (!el || el.getAttribute("data-tid") !== tid) return;

  if (!dados) {
    el.innerHTML = '<p class="hint">Sem internet agora — conecte pra ver fotos de exemplo. Os desenhos e links acima funcionam offline.</p>';
    return;
  }
  if (!dados.length) {
    el.innerHTML = '<p class="hint">Nenhuma foto encontrada pra essa técnica.</p>';
    return;
  }
  el.innerHTML = dados.map((d) => `
    <a class="foto" href="${esc(d.src)}" target="_blank" rel="noopener noreferrer">
      <img loading="lazy" src="${esc(d.thumb)}" alt="">
      <span class="foto-cred">${esc(d.autor)} · ${esc(d.lic)}</span>
    </a>`).join("");
}

/* ---------------- Router ---------------- */
function parseHash() {
  const h = (location.hash || "#/").replace(/^#/, "");
  return h.split("/").filter(Boolean); // ex: ["roteiro","abc"]
}
function go(path) { location.hash = path; }
window.addEventListener("hashchange", render);
window.addEventListener("load", () => {
  if (!location.hash) location.hash = "#/";
  render();
});

/* ---------------- Componentes base ---------------- */
function topbar(title, opts = {}) {
  const back = opts.back
    ? `<button class="icon-btn" data-act="${esc(opts.back)}" aria-label="Voltar"><i class="ti ti-arrow-left"></i></button>`
    : "";
  const right = opts.right || "";
  return `<div class="topbar">${back}<h1>${esc(title)}</h1>${right}</div>`;
}
function bottomNav(active) {
  const item = (href, icon, label, key) =>
    `<a href="${href}" class="${active === key ? "active" : ""}"><i class="ti ${icon}"></i>${label}</a>`;
  return `<div class="bottom-nav">
    ${item("#/", "ti-clapperboard", "Roteiros", "roteiros")}
    ${item("#/acervo", "ti-books", "Acervo", "acervo")}
  </div>`;
}

/* ---------------- Telas ---------------- */
function viewHome() {
  const roteiros = store.getRoteiros().sort((a, b) => b.atualizadoEm - a.atualizadoEm);
  const lista = roteiros.length
    ? `<div class="list">${roteiros.map((r) => `
        <div class="roteiro-item" data-act="open-roteiro" data-id="${r.id}">
          <div class="meta">
            <p class="nome">${esc(r.nome)}</p>
            <p class="sub">${plural(r.cenas.length, "cena", "cenas")}</p>
          </div>
          <i class="ti ti-chevron-right chev"></i>
        </div>`).join("")}</div>`
    : `<div class="empty-state">
         <i class="ti ti-clapperboard"></i>
         <p>Nenhum roteiro ainda.<br>Crie o primeiro e comece a montar suas cenas.</p>
       </div>`;

  app.innerHTML =
    topbar("Meus roteiros", {
      right: `<button class="icon-btn" data-act="abrir-config" aria-label="Configurações"><i class="ti ti-settings"></i></button>`
    }) +
    `<div class="content">
       ${lista}
       <div class="spacer"></div>
       <button class="btn btn-primary" data-act="novo-roteiro"><i class="ti ti-plus"></i> Novo roteiro</button>
     </div>` +
    bottomNav("roteiros");
}

function viewRoteiro(id) {
  const r = getRoteiro(id);
  if (!r) { go("#/"); return; }

  const cenas = r.cenas.map((c, i) => {
    const tec = tecnica(c.tecnicaId);
    const f = funcao(c.funcao);
    const emo = emocao(c.emocao);
    const tags =
      (f ? `<span class="tag tag-fn">${esc(f.nome)}</span>` : "") +
      (emo ? `<span class="tag tag-emo">${esc(emo.nome)}</span>` : "") +
      (c.luz ? `<span class="tag tag-luz"><i class="ti ti-bulb"></i> ${esc(luzLabel(c.luz))}</span>` : "");
    const badge = tec ? `<span class="badge">${esc(tec.nome)}</span><br>` : "";
    const descCls = c.descricao ? "desc" : "desc empty";
    const descTxt = c.descricao ? esc(c.descricao) : (c.dica ? esc(c.dica) : "Toque pra escrever a descrição…");
    const thumb = c.imagemId
      ? `<div class="thumb img"><img data-img="${c.imagemId}" alt=""></div>`
      : tec
        ? `<div class="thumb diag">${diagrama(tec.id) || `<i class="ti ${esc(tec.icone)}"></i>`}${luzOverlay(c.luz)}</div>`
        : `<div class="thumb"><i class="ti ti-photo"></i><span>referência</span></div>`;
    const check = c.gravada ? ` · <span class="grav-ok"><i class="ti ti-circle-check"></i> gravada</span>` : "";
    return `<div class="cena" data-act="open-cena" data-rid="${r.id}" data-cid="${c.id}">
        ${thumb}
        <div class="body">
          <p class="num">Cena ${i + 1}${check}</p>
          ${tags ? `<div class="tags">${tags}</div>` : ""}
          ${badge}
          <p class="${descCls}">${descTxt}</p>
        </div>
      </div>`;
  }).join("");

  const msgBox = `
    <div class="field">
      <span class="label"><i class="ti ti-bulb" style="color:var(--accent);vertical-align:-2px"></i> Mensagem do vídeo</span>
      <textarea id="roteiro-msg" rows="2" placeholder="O que esse vídeo diz? O que o viewer deve sentir/entender?">${esc(r.mensagem || "")}</textarea>
    </div>`;

  const gravadas = r.cenas.filter((c) => c.gravada).length;
  const ritmo = r.cenas.length
    ? `<p class="section-title">Ritmo (energia das cenas)</p>
       <div class="card" style="margin-bottom:16px">${curvaRitmo(r.cenas)}</div>`
    : "";
  const progresso = r.cenas.length
    ? `<div class="prog">
         <span>${gravadas} de ${r.cenas.length} gravadas</span>
         <button class="btn-mini" data-act="modo-gravacao" data-id="${r.id}"><i class="ti ti-checklist"></i> Checklist</button>
       </div>`
    : "";

  const modelos = `
    <div class="empty-state"><i class="ti ti-movie"></i><p>Sem cenas ainda.</p></div>
    <p class="section-title">Começar de um modelo</p>
    <div class="list">
      ${(window.ESTRUTURAS || []).map((m) => `
        <button class="roteiro-item" data-act="usar-modelo" data-id="${r.id}" data-mod="${m.id}">
          <div class="meta">
            <p class="nome">${esc(m.nome)}</p>
            <p class="sub">${esc(m.descricao)}</p>
          </div>
          <i class="ti ti-chevron-right chev"></i>
        </button>`).join("")}
    </div>
    <p class="hint" style="margin-top:10px">O modelo cria as cenas já com a função na narrativa — você só preenche.</p>`;

  const corpo = r.cenas.length ? `<div class="list">${cenas}</div>` : modelos;

  app.innerHTML =
    topbar(r.nome, {
      back: "go-home",
      right: `<button class="icon-btn" data-act="roteiro-menu" data-id="${r.id}" aria-label="Opções"><i class="ti ti-dots-vertical"></i></button>`
    }) +
    `<div class="content">
       ${msgBox}
       ${ritmo}
       ${progresso}
       ${corpo}
       <div class="spacer"></div>
       <button class="btn btn-primary" data-act="nova-cena" data-id="${r.id}"><i class="ti ti-plus"></i> Adicionar cena</button>
     </div>` +
    bottomNav("roteiros");

  hydrateImgs();

  const msgEl = document.getElementById("roteiro-msg");
  if (msgEl) msgEl.addEventListener("input", () => updateRoteiro(id, { mensagem: msgEl.value }));
}

function viewCena(rid, cid) {
  const r = getRoteiro(rid);
  if (!r) { go("#/"); return; }
  const idx = r.cenas.findIndex((c) => c.id === cid);
  if (idx < 0) { go("#/roteiro/" + rid); return; }
  const c = r.cenas[idx];
  const tec = tecnica(c.tecnicaId);

  const refBlock = `
    <div class="field">
      <span class="label">Insight visual (referência)</span>
      ${tec ? `
        <div class="card" style="margin-bottom:10px;display:flex;align-items:center;gap:12px;">
          <i class="ti ${esc(tec.icone)}" style="font-size:24px;color:var(--accent)"></i>
          <div style="flex:1;min-width:0">
            <div style="font-weight:500">${esc(tec.nome)}</div>
            <div style="font-size:12px;color:var(--text-3)">${esc((categoria(tec.categoria) || {}).nome || "")}</div>
          </div>
          <button class="icon-btn" data-act="ver-tecnica" data-tid="${tec.id}" aria-label="Ver técnica"><i class="ti ti-info-circle"></i></button>
          <button class="icon-btn" data-act="rm-tecnica" data-rid="${rid}" data-cid="${cid}" aria-label="Remover técnica"><i class="ti ti-x"></i></button>
        </div>` : ""}
      ${c.imagemId ? `
        <div class="card" style="margin-bottom:10px;padding:0;overflow:hidden;position:relative;">
          <img data-img="${c.imagemId}" alt="" style="width:100%;display:block;max-height:280px;object-fit:cover;">
          <button class="icon-btn" data-act="rm-foto" data-rid="${rid}" data-cid="${cid}" aria-label="Remover foto"
            style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.6);color:#fff"><i class="ti ti-trash"></i></button>
        </div>` : ""}
      ${(tec && !c.imagemId) ? `<div class="diagram sm" style="margin-bottom:10px">${diagrama(tec.id)}${luzOverlay(c.luz)}</div>` : ""}
      <div class="btn-row">
        <button class="btn btn-outline" data-act="escolher-tecnica" data-rid="${rid}" data-cid="${cid}"><i class="ti ti-books"></i> ${tec ? "Trocar técnica" : "Escolher técnica"}</button>
        <button class="btn btn-outline" data-act="add-foto" data-rid="${rid}" data-cid="${cid}"><i class="ti ti-camera"></i> ${c.imagemId ? "Trocar foto" : "Adicionar foto"}</button>
      </div>
    </div>`;

  const sugIds = c.emocao ? (window.EMOCAO_TECNICAS[c.emocao] || []) : [];
  const sugestoes = c.emocao ? `
    <div class="sugestoes">
      <span class="sug-label">Técnicas pra "${esc((emocao(c.emocao) || {}).nome || "")}" — toque pra usar:</span>
      <div class="sug-list">
        ${sugIds.map((tid) => {
          const tt = tecnica(tid);
          if (!tt) return "";
          return `<button class="sug-chip ${c.tecnicaId === tid ? "active" : ""}" data-act="set-tecnica-cena" data-rid="${rid}" data-cid="${cid}" data-tid="${tid}"><i class="ti ${esc(tt.icone)}"></i> ${esc(tt.nome)}</button>`;
        }).join("")}
      </div>
    </div>` : "";

  const intencaoBlock = `
    <div class="field">
      <span class="label">Emoção-alvo — o que o viewer deve sentir?</span>
      <div class="emo-chips">
        ${(window.EMOCOES || []).map((e) => `<button class="emo-chip ${c.emocao === e.id ? "active" : ""}" data-act="set-emocao" data-rid="${rid}" data-cid="${cid}" data-emo="${e.id}">${esc(e.nome)}</button>`).join("")}
      </div>
      ${sugestoes}
    </div>
    <div class="field">
      <span class="label">Função na narrativa</span>
      <div class="emo-chips">
        ${(window.FUNCOES || []).map((f) => `<button class="emo-chip ${c.funcao === f.id ? "active" : ""}" data-act="set-funcao" data-rid="${rid}" data-cid="${cid}" data-fn="${f.id}">${esc(f.nome)}</button>`).join("")}
      </div>
    </div>`;

  const lz = c.luz;
  const chipLuz = (preset, rotulo, ativo) =>
    `<button class="emo-chip ${ativo ? "active" : ""}" data-act="set-luz-preset" data-rid="${rid}" data-cid="${cid}" data-preset="${preset}">${rotulo}</button>`;
  const luzBlock = `
    <div class="field">
      <span class="label">Luz da cena (complemento)</span>
      ${lz ? `
        ${luzStage(lz)}
        <div class="emo-chips" style="margin-top:10px">
          ${chipLuz("cima", "Cima", !lz.contra && lz.y <= 33 && lz.x > 33 && lz.x < 67)}
          ${chipLuz("baixo", "Baixo", !lz.contra && lz.y >= 67 && lz.x > 33 && lz.x < 67)}
          ${chipLuz("esquerda", "Esquerda", !lz.contra && lz.x <= 33)}
          ${chipLuz("direita", "Direita", !lz.contra && lz.x >= 67)}
          ${chipLuz("frente", "Frontal", !lz.contra && lz.x > 33 && lz.x < 67 && lz.y > 33 && lz.y < 67)}
          ${chipLuz("contra", "Contraluz", lz.contra)}
        </div>
        <div class="luz-controles">
          <div>
            <span class="sug-label">Cor</span>
            <div class="emo-chips">
              <button class="emo-chip ${lz.cor === "quente" ? "active" : ""}" data-act="set-luz-cor" data-rid="${rid}" data-cid="${cid}" data-cor="quente">Quente</button>
              <button class="emo-chip ${lz.cor === "neutra" ? "active" : ""}" data-act="set-luz-cor" data-rid="${rid}" data-cid="${cid}" data-cor="neutra">Neutra</button>
              <button class="emo-chip ${lz.cor === "fria" ? "active" : ""}" data-act="set-luz-cor" data-rid="${rid}" data-cid="${cid}" data-cor="fria">Fria</button>
            </div>
          </div>
          <div>
            <span class="sug-label">Qualidade</span>
            <div class="emo-chips">
              <button class="emo-chip ${lz.suave ? "active" : ""}" data-act="set-luz-suave" data-rid="${rid}" data-cid="${cid}" data-suave="1">Suave</button>
              <button class="emo-chip ${!lz.suave ? "active" : ""}" data-act="set-luz-suave" data-rid="${rid}" data-cid="${cid}" data-suave="0">Dura</button>
            </div>
          </div>
        </div>
        <p class="hint" style="margin-top:8px">Arraste o sol pra mover a luz. Ela aparece por cima da ilustração da cena.</p>
        <button class="btn btn-danger" data-act="rm-luz" data-rid="${rid}" data-cid="${cid}" style="margin-top:10px"><i class="ti ti-x"></i> Remover luz</button>
      ` : `
        <button class="btn btn-outline" data-act="add-luz" data-rid="${rid}" data-cid="${cid}"><i class="ti ti-bulb"></i> Adicionar luz à cena</button>
      `}
    </div>`;

  app.innerHTML =
    topbar("Cena " + (idx + 1), {
      back: "go-roteiro:" + rid,
      right: `<button class="icon-btn" data-act="del-cena" data-rid="${rid}" data-cid="${cid}" aria-label="Excluir cena"><i class="ti ti-trash"></i></button>`
    }) +
    `<div class="content">
       ${intencaoBlock}
       ${refBlock}
       ${luzBlock}
       <div class="field">
         <span class="label">Descrição da cena</span>
         <textarea id="cena-desc" rows="5" placeholder="${esc(c.dica || "O que acontece nessa cena? O que você vai filmar?")}">${esc(c.descricao)}</textarea>
       </div>

       <div class="field">
         <span class="label">Detalhes da gravação (opcional)</span>
         <input id="cena-local" type="text" placeholder="Local (ex: pista, parque)" value="${esc(c.local || "")}" style="margin-bottom:8px">
         <input id="cena-horario" type="text" placeholder="Horário / luz (ex: golden hour)" value="${esc(c.horario || "")}" style="margin-bottom:8px">
         <input id="cena-equip" type="text" placeholder="Equipamento (ex: celular + gimbal)" value="${esc(c.equipamento || "")}">
       </div>

       <button class="btn ${c.gravada ? "btn-primary" : "btn-outline"}" data-act="toggle-gravada" data-rid="${rid}" data-cid="${cid}">
         <i class="ti ${c.gravada ? "ti-circle-check" : "ti-circle"}"></i> ${c.gravada ? "Gravada ✓" : "Marcar como gravada"}
       </button>
       <p class="hint" style="margin-top:12px">A referência fica em cima, a descrição embaixo. Tudo salva sozinho.</p>
     </div>` +
    bottomNav("roteiros");

  hydrateImgs();

  const bind = (id, campo) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", () => updateCena(rid, cid, { [campo]: el.value }));
  };
  bind("cena-desc", "descricao");
  bind("cena-local", "local");
  bind("cena-horario", "horario");
  bind("cena-equip", "equipamento");

  // Arrastar (ou tocar) pra mover a luz dentro do palco.
  const stage = document.getElementById("luz-stage");
  if (stage && c.luz && !c.luz.contra) {
    let dragging = false;
    const move = (cx, cy) => {
      const rect = stage.getBoundingClientRect();
      let x = Math.round(((cx - rect.left) / rect.width) * 100);
      let y = Math.round(((cy - rect.top) / rect.height) * 100);
      x = Math.max(0, Math.min(100, x));
      y = Math.max(0, Math.min(100, y));
      const luz = Object.assign({}, cenaLuz(rid, cid), { x, y, contra: false });
      updateCena(rid, cid, { luz });
      aplicarLuzLive(luz);
    };
    stage.addEventListener("pointerdown", (e) => {
      dragging = true;
      try { stage.setPointerCapture(e.pointerId); } catch (err) {}
      move(e.clientX, e.clientY);
    });
    stage.addEventListener("pointermove", (e) => { if (dragging) move(e.clientX, e.clientY); });
    const end = () => { dragging = false; };
    stage.addEventListener("pointerup", end);
    stage.addEventListener("pointercancel", end);
  }
}

function viewAcervo() {
  const catId = sessionStorage.getItem("acervoCat") || "todas";
  const chip = (id, nome) =>
    `<button class="chip ${catId === id ? "active" : ""}" data-act="filtrar" data-cat="${id}">${esc(nome)}</button>`;

  const chips = `<div class="chips">
      ${chip("todas", "Todas")}
      ${window.CATEGORIAS.map((c) => chip(c.id, c.nome)).join("")}
    </div>`;

  const lista = window.TECNICAS.filter((t) => catId === "todas" || t.categoria === catId);
  const cards = lista.map((t) => `
    <button class="tecnica-card" data-act="ver-tecnica" data-tid="${t.id}">
      <div class="card-diagram">${diagrama(t.id)}</div>
      <div class="t-nome"><i class="ti ${esc(t.icone)}"></i> ${esc(t.nome)}</div>
    </button>`).join("");

  const guia = `
    <button class="guide-card" data-act="abrir-guia">
      <i class="ti ti-bulb"></i>
      <div class="g-meta">
        <div class="g-title">Como decodificar uma cena</div>
        <div class="g-sub">As 5 perguntas pra achar a técnica</div>
      </div>
      <i class="ti ti-chevron-right g-chev"></i>
    </button>`;

  app.innerHTML =
    topbar("Acervo de técnicas") +
    `<div class="content">
       ${guia}
       ${chips}
       <div class="grid2">${cards}</div>
     </div>` +
    bottomNav("acervo");
}

function viewTecnica(tid) {
  const t = tecnica(tid);
  if (!t) { go("#/acervo"); return; }
  const tecImgs = store.getTecImgs();
  const imgs = tecImgs[tid] || [];

  const galeria = `
    <div class="gallery">
      ${imgs.map((iid) => `
        <div class="cell">
          <img data-img="${iid}" alt="">
          <button class="del" data-act="del-tec-img" data-tid="${tid}" data-iid="${iid}" aria-label="Remover"><i class="ti ti-x"></i></button>
        </div>`).join("")}
      <button class="cell add" data-act="add-tec-img" data-tid="${tid}" aria-label="Adicionar referência"><i class="ti ti-plus"></i></button>
    </div>`;

  app.innerHTML =
    topbar(t.nome, { back: "go-acervo" }) +
    `<div class="content">
       <div class="diagram">${diagrama(t.id)}</div>

       <p class="section-title">A perspectiva</p>
       <p class="prose">${esc(t.perspectiva)}</p>

       <p class="section-title">Como aplicar</p>
       <ol class="steps">${t.comoAplicar.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>

       <p class="section-title">Exemplos pra estudar (abre no YouTube)</p>
       <ul class="examples">${t.exemplos.map((e) => `<li><i class="ti ti-brand-youtube"></i><a href="${ytUrl(e.busca)}" target="_blank" rel="noopener noreferrer">${esc(e.nome)}</a></li>`).join("")}</ul>

       <div class="spacer"></div>
       <p class="section-title">Fotos de exemplo (banco livre)</p>
       <p class="hint" style="margin-bottom:10px">Imagens reais com licença livre (Wikimedia Commons). Toque pra abrir a fonte e o crédito.</p>
       <div class="fotos-grid" id="fotos-grid" data-tid="${t.id}"><p class="hint">Carregando fotos…</p></div>

       <div class="spacer"></div>
       <p class="section-title">Suas referências</p>
       <p class="hint" style="margin-bottom:12px">Salve prints de filmes, YouTubers e Instagram que encaixam nessa técnica.</p>
       ${galeria}
     </div>` +
    bottomNav("acervo");

  hydrateImgs();
  carregarFotos(t.id, document.getElementById("fotos-grid"));
}

function viewGuia() {
  const perguntas = [
    { ic: "ti-camera", t: "Onde está a câmera?", d: "Alta, baixa, no chão, na altura do olho? → é o ângulo." },
    { ic: "ti-arrows-move", t: "A câmera mexe?", d: "Anda junto, gira, treme, fica parada? → é o movimento." },
    { ic: "ti-grid-dots", t: "Onde está o sujeito no quadro?", d: "Centro, num terço, atrás de algo? → é a composição." },
    { ic: "ti-bulb", t: "De onde vem a luz?", d: "Atrás (silhueta), de lado, sol baixo? → é a luz." },
    { ic: "ti-mood-smile", t: "Por que me fez sentir algo?", d: "Poder, velocidade, calma, tensão? → é o efeito (o motivo de usar)." }
  ];
  const passos = [
    "Vê uma cena boa → roda as 5 perguntas → identifica a técnica.",
    "Tira um print (uso pessoal) → salva na técnica certa no Acervo.",
    "Pra planejar um vídeo → cria o roteiro, adiciona cenas, escolhe a técnica e escreve a descrição.",
    "Repete até o roteiro inteiro estar montado — cada cena com sua referência por cima."
  ];

  app.innerHTML =
    topbar("Como decodificar", { back: "go-acervo" }) +
    `<div class="content">
       <p class="prose" style="margin-top:4px">Pause qualquer cena de filme, série ou vídeo e responda 5 perguntas. As respostas viram o insight visual da sua cena.</p>

       <p class="section-title">As 5 perguntas</p>
       <div class="list" style="margin-bottom:24px">
         ${perguntas.map((p, i) => `
           <div class="card" style="display:flex;gap:12px;align-items:flex-start">
             <div class="q-num">${i + 1}</div>
             <div style="flex:1;min-width:0">
               <div style="font-weight:500"><i class="ti ${p.ic}" style="color:var(--accent);margin-right:6px"></i>${esc(p.t)}</div>
               <div style="font-size:14px;color:var(--text-2);margin-top:2px">${esc(p.d)}</div>
             </div>
           </div>`).join("")}
       </div>

       <p class="section-title">Como isso vira um roteiro</p>
       <ol class="steps">${passos.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>

       <p class="hint">Lembre: você copia a técnica, não o arquivo. Prints de filmes ficam só no seu celular, como estudo pessoal.</p>
       <div class="spacer"></div>
       <button class="btn btn-primary" data-act="go-acervo"><i class="ti ti-books"></i> Ir pro acervo de técnicas</button>
     </div>` +
    bottomNav("acervo");
}

/* ---------------- Checklist de gravação ---------------- */
function viewGravacao(rid) {
  const r = getRoteiro(rid);
  if (!r || !r.cenas.length) { go("#/roteiro/" + rid); return; }
  const gravadas = r.cenas.filter((c) => c.gravada).length;

  const itens = r.cenas.map((c, i) => {
    const tec = tecnica(c.tecnicaId);
    const titulo = c.descricao ? esc(c.descricao) : "Cena " + (i + 1);
    const sub = "Cena " + (i + 1) + (tec ? " · " + esc(tec.nome) : "");
    return `<button class="check-item ${c.gravada ? "feito" : ""}" data-act="grav-toggle" data-rid="${rid}" data-cid="${c.id}">
        <span class="check-box"><i class="ti ${c.gravada ? "ti-circle-check" : "ti-circle"}"></i></span>
        <span class="check-meta">
          <span class="check-num">${sub}</span>
          <span class="check-desc">${titulo}</span>
        </span>
      </button>`;
  }).join("");

  app.innerHTML =
    topbar("Checklist", { back: "go-roteiro:" + rid }) +
    `<div class="content">
       <div class="prog"><span>${gravadas} de ${r.cenas.length} gravadas</span></div>
       <div class="check-list">${itens}</div>
     </div>` +
    bottomNav("roteiros");
}

/* ---------------- Configurações / backup ---------------- */
function viewConfig() {
  const roteiros = store.getRoteiros();
  const nCenas = roteiros.reduce((s, r) => s + r.cenas.length, 0);
  app.innerHTML =
    topbar("Configurações", { back: "go-home" }) +
    `<div class="content">
       <p class="section-title">Backup dos seus dados</p>
       <p class="hint" style="margin-bottom:12px">Seus roteiros e fotos ficam só neste aparelho. Exporte de vez em quando pra não perder nada ao limpar o navegador ou trocar de celular.</p>
       <div class="btn-row" style="margin-bottom:8px">
         <button class="btn btn-primary" data-act="exportar"><i class="ti ti-download"></i> Exportar</button>
         <button class="btn btn-outline" data-act="importar"><i class="ti ti-upload"></i> Importar</button>
       </div>
       <p class="hint">Exportar gera um arquivo <code>.json</code> com tudo (roteiros + fotos). Importar substitui os dados atuais pelo arquivo escolhido.</p>

       <div class="spacer"></div>
       <p class="section-title">Sobre</p>
       <div class="card">
         <div>${plural(roteiros.length, "roteiro", "roteiros")} · ${plural(nCenas, "cena", "cenas")}</div>
         <div style="color:var(--text-3);font-size:13px;margin-top:4px">Diretor · acervo com ${window.TECNICAS.length} técnicas</div>
       </div>
     </div>` +
    bottomNav("roteiros");
}

async function exportarDados() {
  const roteiros = store.getRoteiros();
  const tecImgs = store.getTecImgs();
  const ids = new Set();
  roteiros.forEach((r) => r.cenas.forEach((c) => { if (c.imagemId) ids.add(c.imagemId); }));
  Object.values(tecImgs).forEach((arr) => arr.forEach((id) => ids.add(id)));

  const imagens = {};
  for (const id of ids) {
    const blob = await idbGet(id);
    if (blob) { const d = await blobToDataURL(blob); if (d) imagens[id] = d; }
  }

  const data = { app: "diretor", versao: 1, exportadoEm: new Date().toISOString(), roteiros, tecImgs, imagens };
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "diretor-backup-" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

function pickBackup(cb) {
  const inp = document.createElement("input");
  inp.type = "file";
  inp.accept = "application/json,.json";
  inp.addEventListener("change", () => {
    const f = inp.files && inp.files[0];
    if (f) cb(f);
  });
  inp.click();
}

async function importarDados(file) {
  let data;
  try { data = JSON.parse(await file.text()); }
  catch (e) { alert("Arquivo inválido."); return; }
  if (!data || data.app !== "diretor" || !Array.isArray(data.roteiros)) {
    alert("Esse arquivo não é um backup do Diretor.");
    return;
  }
  if (!confirm("Isso vai SUBSTITUIR seus roteiros e fotos atuais pelo backup. Continuar?")) return;

  const imagens = data.imagens || {};
  for (const id of Object.keys(imagens)) {
    try { const blob = await (await fetch(imagens[id])).blob(); await idbPutId(id, blob); }
    catch (e) {}
  }
  store.saveRoteiros(data.roteiros);
  store.saveTecImgs(data.tecImgs || {});
  alert("Backup restaurado com sucesso!");
  go("#/");
}

/* ---------------- Sheet (escolher técnica) ---------------- */
function openTecnicaSheet(rid, cid) {
  const grupos = window.CATEGORIAS.map((cat) => {
    const itens = window.TECNICAS.filter((t) => t.categoria === cat.id);
    return `<div class="pick-group-title">${esc(cat.nome)}</div>` +
      itens.map((t) => `
        <div class="pick-row" data-act="pick-tecnica" data-rid="${rid}" data-cid="${cid}" data-tid="${t.id}">
          <i class="ti ${esc(t.icone)}"></i>
          <div style="flex:1;min-width:0">
            <div class="pr-nome">${esc(t.nome)}</div>
          </div>
          <i class="ti ti-chevron-right" style="color:var(--text-3);width:auto"></i>
        </div>`).join("");
  }).join("");

  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.id = "tec-sheet";
  overlay.innerHTML = `
    <div class="sheet">
      <div class="sheet-head">
        <h2>Escolher técnica</h2>
        <button class="icon-btn" data-act="close-sheet" aria-label="Fechar"><i class="ti ti-x"></i></button>
      </div>
      <div class="sheet-body">${grupos}</div>
    </div>`;
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

/* ---------------- Carregar imagens (lazy) ---------------- */
function hydrateImgs() {
  document.querySelectorAll("img[data-img]").forEach((el) => {
    fillImg(el, el.getAttribute("data-img"));
  });
}

/* ---------------- Render principal ---------------- */
function render() {
  clearUrls();
  const parts = parseHash();
  const [a, b, c] = parts;
  if (!a) return viewHome();
  if (a === "roteiro") return viewRoteiro(b);
  if (a === "cena") return viewCena(b, c);
  if (a === "acervo") return viewAcervo();
  if (a === "tecnica") return viewTecnica(b);
  if (a === "guia") return viewGuia();
  if (a === "gravacao") return viewGravacao(b);
  if (a === "config") return viewConfig();
  return viewHome();
}

/* ---------------- Ações (delegação de clique) ---------------- */
document.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-act]");
  if (!el) return;
  const act = el.getAttribute("data-act");
  const d = el.dataset;

  // Navegação genérica
  if (act === "go-home") return go("#/");
  if (act === "go-acervo") return go("#/acervo");
  if (act.startsWith("go-roteiro:")) return go("#/roteiro/" + act.split(":")[1]);

  if (act === "open-roteiro") return go("#/roteiro/" + d.id);
  if (act === "open-cena") return go("#/cena/" + d.rid + "/" + d.cid);
  if (act === "ver-tecnica") return go("#/tecnica/" + d.tid);
  if (act === "abrir-guia") return go("#/guia");
  if (act === "abrir-config") return go("#/config");

  // Checklist de gravação
  if (act === "modo-gravacao") return go("#/gravacao/" + d.id);
  if (act === "grav-toggle" || act === "toggle-gravada") {
    const all = store.getRoteiros();
    const r = all.find((x) => x.id === d.rid);
    const cc = r && r.cenas.find((x) => x.id === d.cid);
    if (cc) updateCena(d.rid, d.cid, { gravada: !cc.gravada });
    return render();
  }

  // Intenção / estrutura
  if (act === "set-emocao") {
    const all = store.getRoteiros();
    const r = all.find((x) => x.id === d.rid);
    const cc = r && r.cenas.find((x) => x.id === d.cid);
    if (cc) updateCena(d.rid, d.cid, { emocao: cc.emocao === d.emo ? null : d.emo });
    return render();
  }
  if (act === "set-funcao") {
    const all = store.getRoteiros();
    const r = all.find((x) => x.id === d.rid);
    const cc = r && r.cenas.find((x) => x.id === d.cid);
    if (cc) updateCena(d.rid, d.cid, { funcao: cc.funcao === d.fn ? null : d.fn });
    return render();
  }
  if (act === "set-tecnica-cena") {
    updateCena(d.rid, d.cid, { tecnicaId: d.tid });
    return render();
  }
  if (act === "usar-modelo") {
    const est = (window.ESTRUTURAS || []).find((m) => m.id === d.mod);
    const r = getRoteiro(d.id);
    if (!est || !r) return;
    const novas = est.cenas.map((tpl) => ({
      id: uid("cen"), descricao: "", tecnicaId: null, imagemId: null,
      emocao: null, funcao: tpl.funcao, dica: tpl.dica,
      local: "", horario: "", equipamento: "", gravada: false
    }));
    updateRoteiro(d.id, { cenas: r.cenas.concat(novas) });
    return render();
  }

  // Luz da cena
  if (act === "add-luz") { updateCena(d.rid, d.cid, { luz: Object.assign({}, LUZ_DEFAULT) }); return render(); }
  if (act === "rm-luz") { updateCena(d.rid, d.cid, { luz: null }); return render(); }
  if (act === "set-luz-preset") {
    const presets = {
      cima: { x: 50, y: 8, contra: false },
      baixo: { x: 50, y: 92, contra: false },
      esquerda: { x: 8, y: 50, contra: false },
      direita: { x: 92, y: 50, contra: false },
      frente: { x: 50, y: 50, contra: false },
      contra: { contra: true }
    };
    updateCena(d.rid, d.cid, { luz: Object.assign({}, cenaLuz(d.rid, d.cid), presets[d.preset]) });
    return render();
  }
  if (act === "set-luz-cor") {
    updateCena(d.rid, d.cid, { luz: Object.assign({}, cenaLuz(d.rid, d.cid), { cor: d.cor }) });
    return render();
  }
  if (act === "set-luz-suave") {
    updateCena(d.rid, d.cid, { luz: Object.assign({}, cenaLuz(d.rid, d.cid), { suave: d.suave === "1" }) });
    return render();
  }

  // Backup
  if (act === "exportar") return exportarDados();
  if (act === "importar") return pickBackup(importarDados);

  // Novo roteiro
  if (act === "novo-roteiro") {
    const nome = (prompt("Nome do roteiro:") || "").trim();
    if (!nome) return;
    const all = store.getRoteiros();
    const novo = { id: uid("rot"), nome, criadoEm: Date.now(), atualizadoEm: Date.now(), cenas: [] };
    all.push(novo);
    store.saveRoteiros(all);
    return go("#/roteiro/" + novo.id);
  }

  // Menu do roteiro (renomear / excluir)
  if (act === "roteiro-menu") {
    const all = store.getRoteiros();
    const r = all.find((x) => x.id === d.id);
    if (!r) return;
    const opc = (prompt(`"${r.nome}"\n\nDigite:\n1 = Renomear\n2 = Excluir roteiro`, "") || "").trim();
    if (opc === "1") {
      const novo = (prompt("Novo nome:", r.nome) || "").trim();
      if (novo) { r.nome = novo; r.atualizadoEm = Date.now(); store.saveRoteiros(all); render(); }
    } else if (opc === "2") {
      if (confirm(`Excluir o roteiro "${r.nome}" e todas as cenas?`)) {
        for (const cena of r.cenas) if (cena.imagemId) await idbDel(cena.imagemId);
        store.saveRoteiros(all.filter((x) => x.id !== r.id));
        return go("#/");
      }
    }
    return;
  }

  // Nova cena
  if (act === "nova-cena") {
    const all = store.getRoteiros();
    const r = all.find((x) => x.id === d.id);
    if (!r) return;
    const cena = { id: uid("cen"), descricao: "", tecnicaId: null, imagemId: null };
    r.cenas.push(cena);
    r.atualizadoEm = Date.now();
    store.saveRoteiros(all);
    return go("#/cena/" + r.id + "/" + cena.id);
  }

  // Excluir cena
  if (act === "del-cena") {
    const all = store.getRoteiros();
    const r = all.find((x) => x.id === d.rid);
    const cena = r && r.cenas.find((x) => x.id === d.cid);
    if (!cena) return;
    if (!confirm("Excluir esta cena?")) return;
    if (cena.imagemId) await idbDel(cena.imagemId);
    r.cenas = r.cenas.filter((x) => x.id !== d.cid);
    r.atualizadoEm = Date.now();
    store.saveRoteiros(all);
    return go("#/roteiro/" + d.rid);
  }

  // Escolher técnica (abre sheet)
  if (act === "escolher-tecnica") return openTecnicaSheet(d.rid, d.cid);
  if (act === "close-sheet") { const s = document.getElementById("tec-sheet"); if (s) s.remove(); return; }
  if (act === "pick-tecnica") {
    const all = store.getRoteiros();
    const r = all.find((x) => x.id === d.rid);
    const cena = r && r.cenas.find((x) => x.id === d.cid);
    if (cena) { cena.tecnicaId = d.tid; r.atualizadoEm = Date.now(); store.saveRoteiros(all); }
    const s = document.getElementById("tec-sheet"); if (s) s.remove();
    return render();
  }
  if (act === "rm-tecnica") {
    const all = store.getRoteiros();
    const r = all.find((x) => x.id === d.rid);
    const cena = r && r.cenas.find((x) => x.id === d.cid);
    if (cena) { cena.tecnicaId = null; r.atualizadoEm = Date.now(); store.saveRoteiros(all); }
    return render();
  }

  // Foto da cena
  if (act === "add-foto") {
    return pickImage(async (imgId) => {
      const all = store.getRoteiros();
      const r = all.find((x) => x.id === d.rid);
      const cena = r && r.cenas.find((x) => x.id === d.cid);
      if (!cena) return;
      if (cena.imagemId) await idbDel(cena.imagemId);
      cena.imagemId = imgId;
      r.atualizadoEm = Date.now();
      store.saveRoteiros(all);
      render();
    });
  }
  if (act === "rm-foto") {
    const all = store.getRoteiros();
    const r = all.find((x) => x.id === d.rid);
    const cena = r && r.cenas.find((x) => x.id === d.cid);
    if (cena && cena.imagemId) { await idbDel(cena.imagemId); cena.imagemId = null; r.atualizadoEm = Date.now(); store.saveRoteiros(all); }
    return render();
  }

  // Acervo: filtro
  if (act === "filtrar") { sessionStorage.setItem("acervoCat", d.cat); return render(); }

  // Galeria da técnica
  if (act === "add-tec-img") {
    return pickImage((imgId) => {
      const m = store.getTecImgs();
      (m[d.tid] = m[d.tid] || []).push(imgId);
      store.saveTecImgs(m);
      render();
    });
  }
  if (act === "del-tec-img") {
    if (!confirm("Remover esta referência?")) return;
    await idbDel(d.iid);
    const m = store.getTecImgs();
    m[d.tid] = (m[d.tid] || []).filter((x) => x !== d.iid);
    store.saveTecImgs(m);
    return render();
  }
});

/* ---------------- Service worker ---------------- */
// No navegador/PWA: registra o service worker (offline). Dentro do APK (Capacitor): não precisa.
if ("serviceWorker" in navigator && !window.Capacitor) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
