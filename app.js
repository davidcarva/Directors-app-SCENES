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
    tx.oncomplete = () => {
      // Espelha na nuvem (se logado); se falhar, fica só local.
      if (window.Cloud && window.Cloud.uploadImage) window.Cloud.uploadImage(id, blob);
      res(id);
    };
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
  saveRoteiros(r) {
    localStorage.setItem("roteiros", JSON.stringify(r));
    if (window.Cloud && window.Cloud.notifyLocalChange) window.Cloud.notifyLocalChange(r);
  },
  getTecImgs() {
    try { return JSON.parse(localStorage.getItem("tecImgs") || "{}"); }
    catch { return {}; }
  },
  saveTecImgs(m) {
    localStorage.setItem("tecImgs", JSON.stringify(m));
    if (window.Cloud && window.Cloud.notifyTecImgs) window.Cloud.notifyTecImgs(m);
  }
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
  if (!el) return;
  const blob = await idbGet(id);
  if (blob) {
    const u = URL.createObjectURL(blob);
    urlCache.push(u);
    el.src = u;
    return;
  }
  // Não está neste aparelho: busca na nuvem (imagem de outra máquina).
  if (window.Cloud && window.Cloud.imageUrl) {
    const url = await window.Cloud.imageUrl(id);
    if (url) el.src = url;
  }
}

// Usado pelo cloud.js pra subir imagens já existentes no aparelho.
window.idbGetBlob = idbGet;

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

// Gráfico de energia das cenas (área) baseado na função de cada cena.
// Usa vector-effect=non-scaling-stroke pra o traço não distorcer quando
// o SVG estica na largura (evita o efeito "esticado").
function curvaRitmo(cenas) {
  if (!cenas.length) return "";
  const w = 320, h = 100, padY = 16;
  const xs = (i) => (cenas.length === 1 ? w / 2 : (i * w) / (cenas.length - 1));
  const pts = cenas.map((c, i) => {
    const f = funcao(c.funcao);
    const e = f ? f.energia : 3;
    const y = h - padY - ((e - 1) / 4) * (h - 2 * padY);
    return [xs(i), y];
  });
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = `M0 ${h} ` + pts.map((p) => `L${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ") + ` L${w} ${h} Z`;
  const grid = pts.map((p) => `<line x1="${p[0].toFixed(1)}" y1="8" x2="${p[0].toFixed(1)}" y2="${h - 8}" stroke="#2f2f2f" stroke-width="1" vector-effect="non-scaling-stroke"/>`).join("");
  return `<div class="ritmo-chart"><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <defs><linearGradient id="ritmoFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="rgba(242,223,158,0.32)"/>
        <stop offset="1" stop-color="rgba(242,223,158,0)"/>
      </linearGradient></defs>
      ${grid}
      <path d="${area}" fill="url(#ritmoFill)"/>
      <path d="${line}" fill="none" stroke="#f2df9e" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
    </svg></div>`;
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

/* ---------------- Modo Livre: compor a cena ----------------
   Palco 16:9: fundo (foto/cenário/nenhum) desfocável + elementos
   (pessoa/formas) arrastáveis e redimensionáveis + luz que ilumina
   o cenário e projeta sombra nos elementos.
   Modelo: c.comp = { blur:0..16, bg:'auto'|'none', elements:[{id,tipo,x,y,size}] }
   Luz: reaproveita c.luz (a mesma da seção "Luz da cena").
   ------------------------------------------------------------ */
let compSel = null; // id do elemento selecionado (não persistido)
const PAL_LABEL = { pessoa: "Pessoa", circulo: "Círculo", quadrado: "Quadrado", retangulo: "Retângulo", triangulo: "Triângulo" };
const PAL_ICON = { pessoa: "ti-user", circulo: "ti-circle", quadrado: "ti-square", retangulo: "ti-rectangle", triangulo: "ti-triangle" };

// Normaliza c.comp (migra o "subj" antigo pra elements).
function compData(c) {
  const comp = (c && c.comp) || {};
  let elements = comp.elements;
  if (!elements) {
    elements = comp.subj ? [{ id: "el_0", tipo: "pessoa", x: comp.subj.x, y: comp.subj.y, size: comp.subj.size }] : [];
  }
  return { blur: comp.blur || 0, bg: comp.bg || "auto", elements };
}
function getComp(rid, cid) { const r = getRoteiro(rid); const c = r && r.cenas.find((x) => x.id === cid); return compData(c || {}); }
function saveComp(rid, cid, d) { updateCena(rid, cid, { comp: { blur: d.blur, bg: d.bg, elements: d.elements } }); }
function rawLuz(rid, cid) { const r = getRoteiro(rid); const c = r && r.cenas.find((x) => x.id === cid); return (c && c.luz) || null; }
function compTemAlgo(c) { const d = compData(c); return !!(d.elements.length || d.blur || (c && c.luz)); }

function addElemento(rid, cid, tipo) {
  const d = getComp(rid, cid);
  const el = { id: uid("el"), tipo, x: 50, y: tipo === "pessoa" ? 58 : 50, size: tipo === "pessoa" ? 24 : 20 };
  d.elements = d.elements.concat([el]);
  saveComp(rid, cid, d);
  return el.id;
}
function updateElemento(rid, cid, elid, patch) {
  const d = getComp(rid, cid);
  d.elements = d.elements.map((e) => (e.id === elid ? Object.assign({}, e, patch) : e));
  saveComp(rid, cid, d);
}
function removeElemento(rid, cid, elid) {
  const d = getComp(rid, cid);
  d.elements = d.elements.filter((e) => e.id !== elid);
  saveComp(rid, cid, d);
}
function setCompBg(rid, cid, bg) { const d = getComp(rid, cid); d.bg = bg; saveComp(rid, cid, d); }

function shapeDefs() {
  return `<svg class="comp-defs" aria-hidden="true" width="0" height="0"><defs>
      <linearGradient id="elGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#252b36"/><stop offset="1" stop-color="#05070a"/>
      </linearGradient></defs></svg>`;
}
function shapeSvg(tipo) {
  const st = `fill="url(#elGrad)" stroke="rgba(255,255,255,0.24)" stroke-width="1.4"`;
  if (tipo === "circulo") return `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" ${st}/></svg>`;
  if (tipo === "quadrado") return `<svg viewBox="0 0 100 100"><rect x="6" y="6" width="88" height="88" rx="8" ${st}/></svg>`;
  if (tipo === "retangulo") return `<svg viewBox="0 0 140 90"><rect x="5" y="5" width="130" height="80" rx="8" ${st}/></svg>`;
  if (tipo === "triangulo") return `<svg viewBox="0 0 100 100"><path d="M50 8 L94 92 L6 92 Z" ${st} stroke-linejoin="round"/></svg>`;
  return `<svg viewBox="0 0 40 96"><circle cx="20" cy="12" r="9" ${st}/><path d="M6 96 C6 46 11 32 20 32 C29 32 34 46 34 96 Z" ${st}/></svg>`;
}
// Sombra do elemento na direção oposta à luz (dá a sensação de interação).
function elShadow(el, luz) {
  if (!luz || luz.contra) return "drop-shadow(0 5px 9px rgba(0,0,0,0.55))";
  const dx = Math.max(-9, Math.min(9, (el.x - luz.x) / 7));
  const dy = Math.max(-3, Math.min(11, (el.y - luz.y) / 7 + 3));
  return `drop-shadow(${dx.toFixed(1)}px ${dy.toFixed(1)}px 8px rgba(0,0,0,0.6))`;
}
// Palco interativo (thumb=false) ou miniatura (thumb=true, sem ids/eventos).
function compStageHtml(c, thumb) {
  const d = compData(c);
  const luz = c && c.luz;
  const bgOn = d.bg !== "none";
  const bgInner = !bgOn ? "" :
    (c && c.imagemId ? `<img class="comp-bg-img" data-img="${c.imagemId}" alt="">` : `<div class="comp-bg-scene"></div>`);
  const light = luz ? `<div class="comp-light"${thumb ? "" : ` id="comp-light"`} style="background:${luzGlowBg(luz)}"></div>` : "";
  const handle = (!thumb && luz && !luz.contra)
    ? `<div class="comp-luz-handle" id="comp-luz-handle" style="left:${luz.x}%;top:${luz.y}%"><i class="ti ti-sun"></i></div>` : "";
  const els = d.elements.map((el) => {
    const sel = (!thumb && compSel === el.id) ? " selected" : "";
    return `<div class="comp-el${sel}"${thumb ? "" : ` data-elid="${el.id}"`} data-x="${el.x}" data-y="${el.y}" style="left:${el.x}%;top:${el.y}%;width:${el.size}%;filter:${elShadow(el, luz)}">${shapeSvg(el.tipo)}</div>`;
  }).join("");
  const vazio = (!thumb && !d.elements.length)
    ? `<div class="comp-empty"><i class="ti ti-shape"></i> Adicione um sujeito ou forma</div>` : "";
  return `<div class="comp-stage${thumb ? " thumb-comp" : ""}"${thumb ? "" : ` id="comp-stage"`}>
      ${shapeDefs()}
      <div class="comp-bg"${thumb ? "" : ` id="comp-bg"`} style="filter:blur(${d.blur}px)">${bgInner}</div>
      ${light}${els}${handle}${vazio}
    </div>`;
}
function compThumb(c) { return compStageHtml(c, true); }
// Atualiza glow + handle + sombras ao vivo enquanto arrasta a luz.
function aplicarLuzComp(luz) {
  const glow = document.getElementById("comp-light");
  if (glow) glow.style.background = luzGlowBg(luz);
  const h = document.getElementById("comp-luz-handle");
  if (h) { h.style.left = luz.x + "%"; h.style.top = luz.y + "%"; }
  document.querySelectorAll("#comp-stage .comp-el").forEach((dv) => {
    dv.style.filter = elShadow({ x: +dv.getAttribute("data-x"), y: +dv.getAttribute("data-y") }, luz);
  });
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
// Nuvem: re-renderiza quando o login muda ou quando o sync traz dados.
window.addEventListener("cloud-auth", () => render());
window.addEventListener("cloud-synced", () => render());

/* ---------------- Componentes base ---------------- */

// Estado das seções recolhíveis (sobrevive a re-renders da mesma sessão).
const accOpen = {};
function accHtml(key, icon, title, val, isSet, body, defOpen = false) {
  const open = key in accOpen ? accOpen[key] : defOpen;
  return `<details class="acc" data-key="${esc(key)}" ${open ? "open" : ""}>
      <summary>
        <i class="ti ${esc(icon)} acc-ic"></i>
        <span class="acc-meta"><span class="acc-tit">${title}</span><span class="acc-val ${isSet ? "set" : ""}">${val}</span></span>
        <i class="ti ti-chevron-down acc-chev"></i>
      </summary>
      <div class="acc-body">${body}</div>
    </details>`;
}
function bindAccs() {
  document.querySelectorAll("details.acc[data-key]").forEach((el) => {
    el.addEventListener("toggle", () => { accOpen[el.getAttribute("data-key")] = el.open; });
  });
}

function progbar(done, total) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return `<div class="progbar ${done === total && total ? "done" : ""}"><div style="width:${pct}%"></div></div>`;
}

function topbar(title, opts = {}) {
  const back = opts.back
    ? `<button class="icon-btn" data-act="${esc(opts.back)}" aria-label="Voltar"><i class="ti ti-arrow-left"></i></button>`
    : "";
  const right = opts.right || "";
  return `<div class="topbar">${back}<h1>${esc(title)}</h1>${right}</div>`;
}
// Navegação lateral (desktop, estilo Steam). No mobile fica escondida via CSS.
function sideNav(active) {
  const item = (href, icon, label, key) =>
    `<a href="${href}" class="side-item ${active === key ? "active" : ""}"><i class="ti ${icon}"></i><span>${label}</span></a>`;
  return `<aside class="app-sidebar">
    <div class="side-brand"><i class="ti ti-movie"></i> Diretor</div>
    <nav class="side-nav">
      ${item("#/", "ti-clapperboard", "Roteiros", "roteiros")}
      ${item("#/acervo", "ti-books", "Acervo", "acervo")}
      ${item("#/config", "ti-settings", "Configurações", "config")}
    </nav>
  </aside>`;
}

function bottomNav(active) {
  const item = (href, icon, label, key) =>
    `<a href="${href}" class="${active === key ? "active" : ""}"><i class="ti ${icon}"></i>${label}</a>`;
  return sideNav(active) + `<div class="bottom-nav">
    ${item("#/", "ti-clapperboard", "Roteiros", "roteiros")}
    ${item("#/acervo", "ti-books", "Acervo", "acervo")}
  </div>`;
}

/* ---------------- Diálogos, action sheet e toast ----------------
   Substituem prompt()/confirm()/alert() nativos por UI do próprio app.
   Todos retornam Promise, então dá pra usar `await` nos handlers.
   ------------------------------------------------------------------ */
function closeOverlay(ov) {
  ov.classList.add("closing");
  setTimeout(() => ov.remove(), 170);
}
function mkOverlay(html, cls) {
  const ov = document.createElement("div");
  ov.className = "overlay " + (cls || "");
  ov.innerHTML = html;
  document.body.appendChild(ov);
  return ov;
}

function confirmDialog(opts) {
  const o = Object.assign({ title: "", message: "", confirm: "Confirmar", cancel: "Cancelar", danger: false }, opts);
  return new Promise((resolve) => {
    const ov = mkOverlay(`
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-body">
          ${o.title ? `<h2 class="modal-title">${esc(o.title)}</h2>` : ""}
          ${o.message ? `<p class="modal-msg">${esc(o.message)}</p>` : ""}
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" data-x="0">${esc(o.cancel)}</button>
          <button class="btn ${o.danger ? "btn-danger-solid" : "btn-primary"}" data-x="1">${esc(o.confirm)}</button>
        </div>
      </div>`, "modal-overlay");
    let done = false;
    const onKey = (e) => { if (e.key === "Escape") finish(false); };
    const finish = (v) => {
      if (done) return; done = true;
      document.removeEventListener("keydown", onKey);
      closeOverlay(ov); resolve(v);
    };
    ov.addEventListener("click", (e) => {
      if (e.target === ov) return finish(false);
      const b = e.target.closest("[data-x]");
      if (b) finish(b.getAttribute("data-x") === "1");
    });
    document.addEventListener("keydown", onKey);
    const ok = ov.querySelector('[data-x="1"]'); if (ok) ok.focus();
  });
}

function alertDialog(opts) {
  const o = Object.assign({ title: "", message: "", ok: "OK" }, opts);
  return new Promise((resolve) => {
    const ov = mkOverlay(`
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-body">
          ${o.title ? `<h2 class="modal-title">${esc(o.title)}</h2>` : ""}
          ${o.message ? `<p class="modal-msg">${esc(o.message)}</p>` : ""}
        </div>
        <div class="modal-actions"><button class="btn btn-primary" data-x="1">${esc(o.ok)}</button></div>
      </div>`, "modal-overlay");
    let done = false;
    const finish = () => { if (done) return; done = true; closeOverlay(ov); resolve(); };
    ov.addEventListener("click", (e) => { if (e.target === ov || e.target.closest("[data-x]")) finish(); });
    const ok = ov.querySelector('[data-x="1"]'); if (ok) ok.focus();
  });
}

function promptDialog(opts) {
  const o = Object.assign({ title: "", label: "", value: "", placeholder: "", confirm: "Salvar", cancel: "Cancelar" }, opts);
  return new Promise((resolve) => {
    const ov = mkOverlay(`
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-body">
          ${o.title ? `<h2 class="modal-title">${esc(o.title)}</h2>` : ""}
          ${o.label ? `<span class="label">${esc(o.label)}</span>` : ""}
          <input id="modal-input" type="text" value="${esc(o.value)}" placeholder="${esc(o.placeholder)}" autocomplete="off">
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" data-x="0">${esc(o.cancel)}</button>
          <button class="btn btn-primary" data-x="1">${esc(o.confirm)}</button>
        </div>
      </div>`, "modal-overlay");
    const input = ov.querySelector("#modal-input");
    let done = false;
    const onKey = (e) => { if (e.key === "Escape") finish(null); };
    const finish = (v) => {
      if (done) return; done = true;
      document.removeEventListener("keydown", onKey);
      closeOverlay(ov); resolve(v);
    };
    ov.addEventListener("click", (e) => {
      if (e.target === ov) return finish(null);
      const b = e.target.closest("[data-x]");
      if (b) finish(b.getAttribute("data-x") === "1" ? input.value.trim() : null);
    });
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") finish(input.value.trim()); });
    document.addEventListener("keydown", onKey);
    setTimeout(() => { input.focus(); input.select(); }, 60);
  });
}

// actionSheet({title, actions:[{id, label, icon, danger}]}) -> resolve(id | null)
function actionSheet(opts) {
  const o = Object.assign({ title: "", actions: [] }, opts);
  return new Promise((resolve) => {
    const rows = o.actions.map((a) => `
      <button class="action-row ${a.danger ? "danger" : ""}" data-id="${esc(a.id)}">
        ${a.icon ? `<i class="ti ${esc(a.icon)}"></i>` : ""}<span>${esc(a.label)}</span>
      </button>`).join("");
    const ov = mkOverlay(`
      <div class="sheet action-sheet">
        <div class="sheet-head">
          <h2>${esc(o.title)}</h2>
          <button class="icon-btn" data-id="__close" aria-label="Fechar"><i class="ti ti-x"></i></button>
        </div>
        <div class="sheet-body">${rows}</div>
      </div>`, "");
    let done = false;
    const finish = (v) => { if (done) return; done = true; closeOverlay(ov); resolve(v); };
    ov.addEventListener("click", (e) => {
      if (e.target === ov) return finish(null);
      const b = e.target.closest("[data-id]");
      if (!b) return;
      const id = b.getAttribute("data-id");
      finish(id === "__close" ? null : id);
    });
  });
}

let toastTimer = null;
function toast(msg, opts) {
  const o = Object.assign({ icon: "ti-check", ms: 2200 }, opts);
  let t = document.getElementById("toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; document.body.appendChild(t); }
  t.innerHTML = `<i class="ti ${esc(o.icon)}"></i><span>${esc(msg)}</span>`;
  t.classList.remove("show");
  void t.offsetWidth; // reinicia a transição
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), o.ms);
}

/* ---------------- Novo roteiro com IA ----------------
   Chama a função serverless /api/gerar-roteiro (chave OpenAI fica lá)
   e cria um roteiro já estruturado em cenas.
   ------------------------------------------------------ */
function abrirRoteiroIA(modo) {
  const importar = modo === "importar";
  const ov = mkOverlay(`
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-body">
        <h2 class="modal-title"><i class="ti ${importar ? "ti-file-import" : "ti-sparkles"}"></i> ${importar ? "Importar roteiro" : "Novo roteiro com IA"}</h2>
        <p class="modal-msg" style="margin-bottom:14px">${importar
          ? "Cole um roteiro pronto (ex: do Newsletter). A IA divide em cenas filmáveis preservando as suas falas."
          : "Descreva a ideia — a IA divide em cenas short-form já com função e técnica sugerida."}</p>
        <span class="label">${importar ? "Texto do roteiro" : "Sobre o que é o vídeo?"}</span>
        <textarea id="ia-tema" rows="${importar ? 7 : 3}" placeholder="${importar
          ? "Cole aqui o roteiro inteiro…"
          : "Ex: 3 erros que iniciantes cometem ao editar vídeo"}"></textarea>
        <div class="ia-row">
          <div class="ia-n"><span class="label">Nº de cenas</span>
            <input id="ia-ncenas" type="number" min="3" max="12" value="${importar ? "" : "6"}" placeholder="${importar ? "auto" : ""}" inputmode="numeric"></div>
          <div style="flex:1"><span class="label">Estilo (opcional)</span>
            <input id="ia-estilo" type="text" placeholder="Ex: informal, gancho forte"></div>
        </div>
        <p class="ia-msg" id="ia-msg"></p>
      </div>
      <div class="modal-actions">
        <button class="btn btn-outline" data-ia="cancel">Cancelar</button>
        <button class="btn btn-primary" data-ia="go"><i class="ti ${importar ? "ti-file-import" : "ti-sparkles"}"></i> ${importar ? "Importar" : "Gerar"}</button>
      </div>
    </div>`, "modal-overlay");

  const temaEl = ov.querySelector("#ia-tema");
  const msgEl = ov.querySelector("#ia-msg");
  const goBtn = ov.querySelector('[data-ia="go"]');
  let done = false, loading = false;
  const close = () => { if (loading || done) return; done = true; closeOverlay(ov); };

  ov.addEventListener("click", (e) => {
    if (e.target === ov) return close();
    const b = e.target.closest("[data-ia]");
    if (!b) return;
    if (b.getAttribute("data-ia") === "cancel") return close();
    if (b.getAttribute("data-ia") === "go") gerar();
  });

  async function gerar() {
    const entrada = temaEl.value.trim();
    if (!entrada) {
      msgEl.className = "ia-msg err";
      msgEl.textContent = importar ? "Cole o roteiro primeiro." : "Escreve a ideia do vídeo primeiro.";
      temaEl.focus(); return;
    }
    const nRaw = parseInt(ov.querySelector("#ia-ncenas").value, 10);
    // No modo importar, campo vazio = auto (a IA decide pelos cortes do texto).
    const nCenas = isNaN(nRaw) ? (importar ? 0 : 6) : Math.max(3, Math.min(12, nRaw));
    const estilo = ov.querySelector("#ia-estilo").value.trim();
    loading = true;
    goBtn.disabled = true;
    goBtn.innerHTML = `<i class="ti ti-loader-2 spin"></i> ${importar ? "Importando…" : "Gerando…"}`;
    msgEl.className = "ia-msg info";
    msgEl.textContent = importar ? "A IA está decupando seu roteiro em cenas…" : "A IA está montando suas cenas…";
    try {
      // Caminho COM .js: o builds da Vercel monta a função no path do arquivo.
      const resp = await fetch("/api/gerar-roteiro.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tema: importar ? "" : entrada,
          texto: importar ? entrada : "",
          nCenas, estilo,
          funcoes: (window.FUNCOES || []).map((f) => ({ id: f.id, nome: f.nome })),
          tecnicas: (window.TECNICAS || []).map((t) => ({ id: t.id, nome: t.nome }))
        })
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.erro || ("Erro " + resp.status));
      const cenasIA = Array.isArray(data.cenas) ? data.cenas : [];
      if (!cenasIA.length) throw new Error("A IA não retornou cenas.");
      // A IA às vezes devolve o NOME ("Clímax") em vez do id ("climax").
      // Casa por id ou nome, ignorando acento/caixa.
      const norm = (s) => String(s == null ? "" : s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
      const acharFuncao = (v) => {
        const n = norm(v);
        if (!n || n === "null") return null;
        const f = (window.FUNCOES || []).find((x) => norm(x.id) === n || norm(x.nome) === n);
        return f ? f.id : null;
      };
      const acharTecnica = (v) => {
        const n = norm(v);
        if (!n || n === "null") return null;
        const t = (window.TECNICAS || []).find((x) => norm(x.id) === n || norm(x.nome) === n);
        return t ? t.id : null;
      };
      const cenas = cenasIA.map((c) => ({
        id: uid("cen"),
        descricao: String(c.descricao || "").trim(),
        tecnicaId: acharTecnica(c.tecnicaId),
        funcao: acharFuncao(c.funcao),
        emocao: null, imagemId: null, comp: null, luz: null,
        dica: "", local: "", horario: "", equipamento: "", gravada: false
      }));
      const novo = {
        id: uid("rot"),
        nome: String(data.nome || (importar ? "Roteiro importado" : entrada)).slice(0, 80),
        mensagem: String(data.mensagem || "").trim(),
        criadoEm: Date.now(), atualizadoEm: Date.now(),
        cenas
      };
      const all = store.getRoteiros();
      all.push(novo);
      store.saveRoteiros(all);
      done = true; closeOverlay(ov);
      toast(importar ? "Roteiro importado em cenas" : "Roteiro gerado com IA", { icon: importar ? "ti-file-import" : "ti-sparkles" });
      go("#/roteiro/" + novo.id);
    } catch (e) {
      loading = false;
      goBtn.disabled = false;
      goBtn.innerHTML = `<i class="ti ${importar ? "ti-file-import" : "ti-sparkles"}"></i> ${importar ? "Importar" : "Gerar"}`;
      const local = location.hostname === "localhost" || location.hostname === "127.0.0.1";
      msgEl.className = "ia-msg err";
      msgEl.textContent = String((e && e.message) || e) + (local ? " — a IA só roda no site publicado (Vercel), não no localhost." : "");
    }
  }

  setTimeout(() => temaEl.focus(), 60);
}

/* ---------------- Telas ---------------- */
function viewHome() {
  const roteiros = store.getRoteiros().sort((a, b) => b.atualizadoEm - a.atualizadoEm);

  const corpo = roteiros.length
    ? `<div class="list">${roteiros.map((r) => {
        const n = r.cenas.length;
        const g = r.cenas.filter((c) => c.gravada).length;
        const sub = n ? `${plural(n, "cena", "cenas")} · ${g}/${n} gravadas` : "Sem cenas ainda";
        return `<div class="roteiro-item" data-act="open-roteiro" data-id="${r.id}">
          <div class="meta">
            <p class="nome">${esc(r.nome)}</p>
            <p class="sub">${sub}</p>
            ${n ? `<div class="progbar mini ${g === n ? "done" : ""}"><div style="width:${Math.round((g / n) * 100)}%"></div></div>` : ""}
          </div>
          <i class="ti ti-chevron-right chev"></i>
        </div>`;
      }).join("")}</div>
      <div class="spacer"></div>
      <button class="btn btn-primary" data-act="novo-roteiro-ia"><i class="ti ti-sparkles"></i> Novo roteiro com IA</button>
      <button class="btn btn-outline mt-2" data-act="importar-roteiro-ia"><i class="ti ti-file-import"></i> Importar roteiro pronto</button>
      <button class="btn btn-outline mt-2" data-act="novo-roteiro"><i class="ti ti-plus"></i> Novo roteiro em branco</button>`
    : `<div class="onboarding">
         <div class="ob-icon"><i class="ti ti-clapperboard"></i></div>
         <h2>Planeje seus vídeos, cena por cena</h2>
         <p>Crie um roteiro, adicione cenas e escolha a técnica visual de cada uma. Tudo salva sozinho no aparelho.</p>
         <div class="ob-steps">
           <div class="ob-step"><span class="ob-n">1</span> Crie um roteiro</div>
           <div class="ob-step"><span class="ob-n">2</span> Monte as cenas com uma referência visual</div>
           <div class="ob-step"><span class="ob-n">3</span> Marque como gravada conforme filma</div>
         </div>
         <button class="btn btn-primary" data-act="novo-roteiro-ia"><i class="ti ti-sparkles"></i> Criar roteiro com IA</button>
         <button class="btn btn-outline" data-act="importar-roteiro-ia"><i class="ti ti-file-import"></i> Importar roteiro pronto</button>
         <button class="btn btn-outline" data-act="novo-roteiro"><i class="ti ti-plus"></i> Criar em branco</button>
         <button class="btn btn-ghost" data-act="go-acervo"><i class="ti ti-books"></i> Explorar técnicas</button>
       </div>`;

  app.innerHTML =
    topbar("Meus roteiros", {
      right: `<button class="icon-btn" data-act="abrir-config" aria-label="Configurações"><i class="ti ti-settings"></i></button>`
    }) +
    `<div class="content">${corpo}</div>` +
    bottomNav("roteiros");
}

function viewRoteiro(id) {
  const r = getRoteiro(id);
  if (!r) { go("#/"); return; }

  const arrastavel = r.cenas.length > 1;
  const cenas = r.cenas.map((c, i) => {
    const tec = tecnica(c.tecnicaId);
    const f = funcao(c.funcao);
    const emo = emocao(c.emocao);
    const metaTags =
      (tec ? `<span class="tag tag-tec"><i class="ti ${esc(tec.icone)}"></i> ${esc(tec.nome)}</span>` : "") +
      (f ? `<span class="tag tag-fn">${esc(f.nome)}</span>` : "") +
      (emo ? `<span class="tag tag-emo">${esc(emo.nome)}</span>` : "") +
      (c.luz ? `<span class="tag tag-luz"><i class="ti ti-bulb"></i> ${esc(luzLabel(c.luz))}</span>` : "");
    const descCls = c.descricao ? "desc" : "desc empty";
    const descTxt = c.descricao ? esc(c.descricao) : (c.dica ? esc(c.dica) : "Toque pra escrever a descrição…");
    const thumb = compTemAlgo(c)
      ? `<div class="thumb comp-thumb">${compThumb(c)}</div>`
      : c.imagemId
        ? `<div class="thumb img"><img data-img="${c.imagemId}" alt=""></div>`
        : tec
          ? `<div class="thumb diag">${diagrama(tec.id) || `<i class="ti ${esc(tec.icone)}"></i>`}${luzOverlay(c.luz)}</div>`
          : `<div class="thumb"><i class="ti ti-photo"></i><span>referência</span></div>`;
    return `<div class="cena ${c.gravada ? "gravada" : ""}" data-act="open-cena" data-rid="${r.id}" data-cid="${c.id}">
        ${thumb}
        <div class="body">
          <div class="num-row">
            <span class="num">Cena ${i + 1}</span>
            ${c.gravada ? `<span class="grav-ok"><i class="ti ti-circle-check"></i> gravada</span>` : ""}
          </div>
          <p class="${descCls}">${descTxt}</p>
          ${metaTags ? `<div class="tags">${metaTags}</div>` : ""}
        </div>
        ${arrastavel ? `<div class="drag-handle" aria-label="Arrastar para reordenar"><i class="ti ti-grip-vertical"></i></div>` : ""}
      </div>`;
  }).join("");

  const msgResumo = (r.mensagem || "").trim();
  const msgBox = accHtml("rot:" + id + ":msg", "ti-bulb", "Mensagem do vídeo",
    msgResumo ? esc(msgResumo) : "O que o viewer deve sentir ou entender?",
    !!msgResumo,
    `<textarea id="roteiro-msg" rows="2" placeholder="O que esse vídeo diz? O que o viewer deve sentir/entender?">${esc(r.mensagem || "")}</textarea>`,
    false);

  const gravadas = r.cenas.filter((c) => c.gravada).length;
  const ritmo = r.cenas.length
    ? accHtml("rot:" + id + ":ritmo", "ti-activity", "Ritmo do vídeo",
        "Energia das cenas ao longo da história", false,
        curvaRitmo(r.cenas), false)
    : "";
  const progresso = r.cenas.length
    ? `<div class="prog mt-3">
         <span><strong>${gravadas}</strong> de ${r.cenas.length} gravadas</span>
         <button class="btn-mini" data-act="modo-gravacao" data-id="${r.id}"><i class="ti ti-checklist"></i> Checklist</button>
       </div>
       ${progbar(gravadas, r.cenas.length)}`
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
    <p class="hint mt-2">O modelo cria as cenas já com a função na narrativa — você só preenche.</p>`;

  const dicaReorder = r.cenas.length > 1
    ? `<p class="reorder-hint"><i class="ti ti-arrows-move"></i> Arraste os cards para reordenar as cenas</p>`
    : "";
  const corpo = r.cenas.length ? `${dicaReorder}<div class="list">${cenas}</div>` : modelos;

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
  bindAccs();
  if (r.cenas.length > 1) initReorder(document.querySelector(".content .list"), id);

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

  const refBody = `
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
      ${(!tec && !c.imagemId) ? `<p class="hint" style="margin:0 0 12px">Escolha uma técnica do acervo (o desenho vira sua referência) ou adicione uma foto sua.</p>` : ""}
      <div class="btn-row">
        <button class="btn btn-outline" data-act="escolher-tecnica" data-rid="${rid}" data-cid="${cid}"><i class="ti ti-books"></i> ${tec ? "Trocar técnica" : "Escolher técnica"}</button>
        <button class="btn btn-outline" data-act="add-foto" data-rid="${rid}" data-cid="${cid}"><i class="ti ti-camera"></i> ${c.imagemId ? "Trocar foto" : "Adicionar foto"}</button>
      </div>`;
  const refVal = tec ? esc(tec.nome) + (c.imagemId ? " · foto" : "")
    : c.imagemId ? "Foto adicionada"
    : "Como filmar — técnica ou foto de referência";

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

  const intencaoBody = `
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
  const fAtual = funcao(c.funcao);
  const emoAtual = emocao(c.emocao);
  const intVal = [emoAtual && emoAtual.nome, fAtual && fAtual.nome].filter(Boolean).map(esc).join(" · ")
    || "O que o viewer sente + papel na história";

  const lz = c.luz;
  const chipLuz = (preset, rotulo, ativo) =>
    `<button class="emo-chip ${ativo ? "active" : ""}" data-act="set-luz-preset" data-rid="${rid}" data-cid="${cid}" data-preset="${preset}">${rotulo}</button>`;
  const luzBody = `
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
        <p class="hint mt-2">Arraste o sol pra mover a luz. Ela aparece por cima da ilustração da cena.</p>
        <button class="btn btn-danger mt-2" data-act="rm-luz" data-rid="${rid}" data-cid="${cid}"><i class="ti ti-x"></i> Remover luz</button>
      ` : `
        <p class="hint" style="margin:0 0 12px">Defina de onde vem a luz — ela aparece por cima da ilustração da cena.</p>
        <button class="btn btn-outline" data-act="add-luz" data-rid="${rid}" data-cid="${cid}"><i class="ti ti-bulb"></i> Adicionar luz à cena</button>
      `}`;
  const luzVal = lz
    ? esc(luzLabel(lz)) + " · " + (lz.cor === "quente" ? "quente" : lz.cor === "fria" ? "fria" : "neutra") + (lz.contra ? "" : lz.suave ? " · suave" : " · dura")
    : "Opcional — posição e cor da luz";
  const detVal = [c.local, c.horario, c.equipamento].filter(Boolean).map(esc).join(" · ")
    || "Local, horário e equipamento";

  // Modo Livre (compor cena)
  const cd = compData(c);
  const selEl = cd.elements.find((e) => e.id === compSel);
  const paleta = ["pessoa", "circulo", "quadrado", "retangulo", "triangulo"];
  const bgLabel = c.imagemId ? "Sua foto" : "Cenário";
  const compBody = `
      ${compStageHtml(c, false)}
      <div class="comp-controls">
        <div class="comp-group">
          <span class="comp-sub">Adicionar elemento</span>
          <div class="comp-pal">
            ${paleta.map((t) => `<button class="comp-pal-btn" data-act="comp-add-el" data-rid="${rid}" data-cid="${cid}" data-tipo="${t}"><i class="ti ${PAL_ICON[t]}"></i>${PAL_LABEL[t]}</button>`).join("")}
          </div>
        </div>

        <div class="comp-sel-ctl${selEl ? "" : " off"}" id="comp-sel-ctl">
          <label class="comp-ctl"><span><i class="ti ti-arrows-diagonal"></i> Tamanho ${selEl ? "(" + PAL_LABEL[selEl.tipo].toLowerCase() + ")" : "— toque num elemento"}</span>
            <input type="range" id="comp-el-size" min="6" max="72" step="1" value="${selEl ? selEl.size : 24}" ${selEl ? "" : "disabled"}></label>
          <button class="btn btn-danger" data-act="comp-del-el" data-rid="${rid}" data-cid="${cid}" ${selEl ? "" : "disabled"}><i class="ti ti-trash"></i> Excluir elemento</button>
        </div>

        <div class="comp-group">
          <span class="comp-sub">Fundo</span>
          <div class="seg">
            <button class="seg-btn ${cd.bg !== "none" ? "active" : ""}" data-act="comp-bg" data-rid="${rid}" data-cid="${cid}" data-bg="auto">${bgLabel}</button>
            <button class="seg-btn ${cd.bg === "none" ? "active" : ""}" data-act="comp-bg" data-rid="${rid}" data-cid="${cid}" data-bg="none">Nenhum</button>
          </div>
        </div>

        ${cd.bg !== "none" ? `<label class="comp-ctl"><span><i class="ti ti-blur"></i> Desfoque do fundo</span>
          <input type="range" id="comp-blur" min="0" max="16" step="1" value="${cd.blur}"></label>` : ""}

        <div class="comp-group">
          <span class="comp-sub">Luz da cena</span>
          ${c.luz ? `
            <div class="emo-chips">
              <button class="emo-chip ${c.luz.cor === "quente" ? "active" : ""}" data-act="comp-luz-cor" data-rid="${rid}" data-cid="${cid}" data-cor="quente">Quente</button>
              <button class="emo-chip ${c.luz.cor === "neutra" ? "active" : ""}" data-act="comp-luz-cor" data-rid="${rid}" data-cid="${cid}" data-cor="neutra">Neutra</button>
              <button class="emo-chip ${c.luz.cor === "fria" ? "active" : ""}" data-act="comp-luz-cor" data-rid="${rid}" data-cid="${cid}" data-cor="fria">Fria</button>
              <button class="emo-chip ${c.luz.contra ? "active" : ""}" data-act="comp-luz-contra" data-rid="${rid}" data-cid="${cid}">Contraluz</button>
            </div>
            <button class="btn btn-outline mt-2" data-act="comp-luz-rm" data-rid="${rid}" data-cid="${cid}"><i class="ti ti-bulb-off"></i> Remover luz</button>
            <p class="hint mt-2">Arraste o sol no palco pra mover a luz — o fundo acende e os elementos ganham sombra na direção certa.</p>
          ` : `
            <button class="btn btn-outline" data-act="comp-luz-add" data-rid="${rid}" data-cid="${cid}"><i class="ti ti-bulb"></i> Adicionar luz</button>
          `}
        </div>
      </div>`;
  const compVal = compTemAlgo(c)
    ? [cd.elements.length ? plural(cd.elements.length, "elemento", "elementos") : "", cd.blur ? "desfoque " + cd.blur : "", c.luz ? "com luz" : ""].filter(Boolean).join(" · ")
    : "Monte a cena: formas, fundo e luz";

  app.innerHTML =
    topbar("Cena " + (idx + 1), {
      back: "go-roteiro:" + rid,
      right: `<button class="icon-btn" data-act="del-cena" data-rid="${rid}" data-cid="${cid}" aria-label="Excluir cena"><i class="ti ti-trash"></i></button>`
    }) +
    `<div class="content">
       <div class="field">
         <span class="label">O que acontece nessa cena?</span>
         <textarea id="cena-desc" rows="4" placeholder="${esc(c.dica || "Descreva o que você vai filmar…")}">${esc(c.descricao)}</textarea>
       </div>

       ${accHtml("cena:" + cid + ":comp", "ti-stack-2", "Compor cena (livre)", compVal, compTemAlgo(c), compBody, true)}
       ${accHtml("cena:" + cid + ":ref", "ti-camera", "Referência visual", refVal, !!(tec || c.imagemId), refBody, false)}
       ${accHtml("cena:" + cid + ":int", "ti-mood-smile", "Intenção da cena", intVal, !!(emoAtual || fAtual), intencaoBody, false)}
       ${accHtml("cena:" + cid + ":luz", "ti-bulb", "Luz da cena", luzVal, !!lz, luzBody, false)}
       ${accHtml("cena:" + cid + ":det", "ti-map-pin", "Detalhes da gravação", detVal, !!(c.local || c.horario || c.equipamento), `
         <input id="cena-local" type="text" placeholder="Local (ex: pista, parque)" value="${esc(c.local || "")}" style="margin-bottom:8px">
         <input id="cena-horario" type="text" placeholder="Horário / luz (ex: golden hour)" value="${esc(c.horario || "")}" style="margin-bottom:8px">
         <input id="cena-equip" type="text" placeholder="Equipamento (ex: celular + gimbal)" value="${esc(c.equipamento || "")}">`, false)}

       <div class="spacer-sm"></div>
       <button class="btn ${c.gravada ? "btn-ok" : "btn-outline"}" data-act="toggle-gravada" data-rid="${rid}" data-cid="${cid}">
         <i class="ti ${c.gravada ? "ti-circle-check" : "ti-circle"}"></i> ${c.gravada ? "Gravada ✓" : "Marcar como gravada"}
       </button>
       <p class="hint mt-3 tc">Tudo salva sozinho enquanto você edita.</p>
     </div>` +
    bottomNav("roteiros");

  hydrateImgs();
  bindAccs();

  const bind = (id, campo) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", () => updateCena(rid, cid, { [campo]: el.value }));
  };
  bind("cena-desc", "descricao");
  bind("cena-local", "local");
  bind("cena-horario", "horario");
  bind("cena-equip", "equipamento");

  // Modo Livre: seleciona um elemento (sem re-render) e sincroniza controles.
  const selecionarEl = (elid) => {
    compSel = elid;
    const st = document.getElementById("comp-stage");
    if (st) st.querySelectorAll(".comp-el").forEach((dv) => dv.classList.toggle("selected", dv.getAttribute("data-elid") === elid));
    const el = getComp(rid, cid).elements.find((e) => e.id === elid);
    const ctl = document.getElementById("comp-sel-ctl");
    const sizeInp = document.getElementById("comp-el-size");
    const delBtn = ctl && ctl.querySelector('[data-act="comp-del-el"]');
    if (ctl) ctl.classList.toggle("off", !el);
    if (sizeInp) { sizeInp.disabled = !el; if (el) sizeInp.value = el.size; }
    if (delBtn) delBtn.disabled = !el;
  };

  // Desfoque do fundo (ao vivo + persiste)
  const blurEl = document.getElementById("comp-blur");
  if (blurEl) blurEl.addEventListener("input", () => {
    const v = +blurEl.value;
    const bg = document.getElementById("comp-bg");
    if (bg) bg.style.filter = "blur(" + v + "px)";
    const d = getComp(rid, cid); d.blur = v; saveComp(rid, cid, d);
  });

  // Tamanho do elemento selecionado
  const elSizeEl = document.getElementById("comp-el-size");
  if (elSizeEl) elSizeEl.addEventListener("input", () => {
    if (!compSel) return;
    const v = +elSizeEl.value;
    const dv = document.querySelector('.comp-el[data-elid="' + compSel + '"]');
    if (dv) dv.style.width = v + "%";
    updateElemento(rid, cid, compSel, { size: v });
  });

  // Selecionar + arrastar cada elemento no palco
  const compStage = document.getElementById("comp-stage");
  if (compStage) {
    compStage.querySelectorAll(".comp-el").forEach((elDiv) => {
      const elid = elDiv.getAttribute("data-elid");
      let dragging = false, pid = null;
      const moveTo = (cx, cy) => {
        const rect = compStage.getBoundingClientRect();
        let x = Math.max(2, Math.min(98, Math.round(((cx - rect.left) / rect.width) * 100)));
        let y = Math.max(3, Math.min(98, Math.round(((cy - rect.top) / rect.height) * 100)));
        elDiv.style.left = x + "%"; elDiv.style.top = y + "%";
        elDiv.setAttribute("data-x", x); elDiv.setAttribute("data-y", y);
        elDiv.style.filter = elShadow({ x, y }, rawLuz(rid, cid));
        updateElemento(rid, cid, elid, { x, y });
      };
      elDiv.addEventListener("pointerdown", (e) => {
        dragging = true; pid = e.pointerId; e.preventDefault();
        selecionarEl(elid);
        try { elDiv.setPointerCapture(pid); } catch (err) {}
      });
      elDiv.addEventListener("pointermove", (e) => { if (dragging) moveTo(e.clientX, e.clientY); });
      const end = () => { dragging = false; };
      elDiv.addEventListener("pointerup", end);
      elDiv.addEventListener("pointercancel", end);
    });
  }

  // Arrastar o sol da luz DENTRO do palco de composição
  const luzHandle = document.getElementById("comp-luz-handle");
  if (luzHandle && compStage && c.luz && !c.luz.contra) {
    let dragging = false, pid = null;
    const move = (cx, cy) => {
      const rect = compStage.getBoundingClientRect();
      let x = Math.max(0, Math.min(100, Math.round(((cx - rect.left) / rect.width) * 100)));
      let y = Math.max(0, Math.min(100, Math.round(((cy - rect.top) / rect.height) * 100)));
      const luz = Object.assign({}, cenaLuz(rid, cid), { x, y, contra: false });
      updateCena(rid, cid, { luz });
      aplicarLuzComp(luz);
    };
    luzHandle.addEventListener("pointerdown", (e) => {
      dragging = true; pid = e.pointerId; e.preventDefault();
      try { luzHandle.setPointerCapture(pid); } catch (err) {}
    });
    luzHandle.addEventListener("pointermove", (e) => { if (dragging) move(e.clientX, e.clientY); });
    const end = () => { dragging = false; };
    luzHandle.addEventListener("pointerup", end);
    luzHandle.addEventListener("pointercancel", end);
  }

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

  // Busca sem acentos: "silencio" acha "Silêncio".
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const lista = window.TECNICAS.filter((t) => catId === "todas" || t.categoria === catId);
  const cards = lista.map((t) => `
    <button class="tecnica-card" data-act="ver-tecnica" data-tid="${t.id}" data-nome="${esc(norm(t.nome))}">
      <div class="card-diagram">${diagrama(t.id)}</div>
      <div class="t-nome"><i class="ti ${esc(t.icone)}"></i> ${esc(t.nome)}</div>
      <div class="t-cat">${esc((categoria(t.categoria) || {}).nome || "")}</div>
    </button>`).join("");

  const busca = `
    <div class="search-wrap">
      <i class="ti ti-search"></i>
      <input id="acervo-busca" type="search" placeholder="Buscar técnica… (ex: silhueta, terços)" autocomplete="off">
    </div>`;

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
       ${busca}
       ${chips}
       <div class="grid2" id="acervo-grid">${cards}</div>
       <p class="hint" id="acervo-vazio" style="display:none;text-align:center;padding:24px 0">Nenhuma técnica com esse nome nessa categoria.</p>
     </div>` +
    bottomNav("acervo");

  // Filtro ao vivo — esconde/mostra cards sem re-render (mantém o foco no campo).
  const buscaEl = document.getElementById("acervo-busca");
  if (buscaEl) {
    buscaEl.addEventListener("input", () => {
      const q = norm(buscaEl.value.trim());
      let visiveis = 0;
      document.querySelectorAll("#acervo-grid .tecnica-card").forEach((el) => {
        const mostra = !q || (el.getAttribute("data-nome") || "").includes(q);
        el.style.display = mostra ? "" : "none";
        if (mostra) visiveis++;
      });
      const vazio = document.getElementById("acervo-vazio");
      if (vazio) vazio.style.display = visiveis ? "none" : "";
    });
  }
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
       <p class="hint mb-2">Imagens reais com licença livre (Wikimedia Commons). Toque pra abrir a fonte e o crédito.</p>
       <div class="fotos-grid" id="fotos-grid" data-tid="${t.id}"><p class="hint">Carregando fotos…</p></div>

       <div class="spacer"></div>
       <p class="section-title">Suas referências</p>
       <p class="hint mb-2">Salve prints de filmes, YouTubers e Instagram que encaixam nessa técnica.</p>
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
       <p class="prose mt-1">Pause qualquer cena de filme, série ou vídeo e responda 5 perguntas. As respostas viram o insight visual da sua cena.</p>

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
    topbar("Checklist", {
      back: "go-roteiro:" + rid,
      right: `<button class="icon-btn" data-act="modo-foco" data-rid="${rid}" aria-label="Modo gravação"><i class="ti ti-player-play"></i></button>`
    }) +
    `<div class="content">
       <div class="prog"><span><strong>${gravadas}</strong> de ${r.cenas.length} gravadas</span></div>
       ${progbar(gravadas, r.cenas.length)}
       <button class="btn btn-primary mb-3" data-act="modo-foco" data-rid="${rid}"><i class="ti ti-player-play"></i> Iniciar modo gravação</button>
       <div class="check-list">${itens}</div>
     </div>` +
    bottomNav("roteiros");
}

/* ---------------- Modo gravação (tela cheia, 1 cena por vez) ----------------
   Pra usar com o celular na mão: a fala em letra grande, o essencial embaixo
   e um botão grande "Gravei". Sem formulário, sem ruído.
   --------------------------------------------------------------------------- */
function viewFoco(rid, idxStr) {
  const r = getRoteiro(rid);
  if (!r || !r.cenas.length) { go("#/roteiro/" + rid); return; }
  const total = r.cenas.length;
  let idx = parseInt(idxStr, 10);
  if (isNaN(idx)) idx = Math.max(0, r.cenas.findIndex((c) => !c.gravada)); // retoma na 1ª não gravada
  idx = Math.max(0, Math.min(total - 1, idx));
  const c = r.cenas[idx];
  const tec = tecnica(c.tecnicaId);
  const gravadas = r.cenas.filter((x) => x.gravada).length;

  // Só mostra o que existe — nada de campo vazio ocupando espaço.
  const extras = [
    tec ? `<span class="foco-chip"><i class="ti ${esc(tec.icone)}"></i> ${esc(tec.nome)}</span>` : "",
    c.luz ? `<span class="foco-chip"><i class="ti ti-bulb"></i> ${esc(luzLabel(c.luz))}</span>` : "",
    c.local ? `<span class="foco-chip"><i class="ti ti-map-pin"></i> ${esc(c.local)}</span>` : "",
    c.horario ? `<span class="foco-chip"><i class="ti ti-clock"></i> ${esc(c.horario)}</span>` : "",
    c.equipamento ? `<span class="foco-chip"><i class="ti ti-device-camera"></i> ${esc(c.equipamento)}</span>` : ""
  ].filter(Boolean).join("");

  const fala = c.descricao ? esc(c.descricao) : (c.dica ? esc(c.dica) : "(sem texto nesta cena)");
  const falaCls = c.descricao ? "" : " vazia";

  app.innerHTML = `
    <div class="foco">
      <div class="foco-top">
        <button class="icon-btn" data-act="sair-foco" data-rid="${rid}" aria-label="Sair"><i class="ti ti-x"></i></button>
        <div class="foco-prog">
          <span>Cena ${idx + 1} de ${total}</span>
          ${progbar(gravadas, total)}
        </div>
      </div>

      <div class="foco-corpo">
        <p class="foco-fala${falaCls}">${fala}</p>
        ${extras ? `<div class="foco-chips">${extras}</div>` : ""}
      </div>

      <div class="foco-acoes">
        <button class="btn btn-outline foco-nav" data-act="foco-ir" data-rid="${rid}" data-idx="${idx - 1}" ${idx === 0 ? "disabled" : ""} aria-label="Anterior"><i class="ti ti-chevron-left"></i></button>
        <button class="btn ${c.gravada ? "btn-ok" : "btn-primary"} foco-ok" data-act="foco-gravei" data-rid="${rid}" data-cid="${c.id}" data-idx="${idx}">
          <i class="ti ${c.gravada ? "ti-circle-check" : "ti-video"}"></i> ${c.gravada ? "Gravada ✓" : "Gravei"}
        </button>
        <button class="btn btn-outline foco-nav" data-act="foco-ir" data-rid="${rid}" data-idx="${idx + 1}" ${idx === total - 1 ? "disabled" : ""} aria-label="Próxima"><i class="ti ti-chevron-right"></i></button>
      </div>
    </div>`;
}

/* ---------------- Configurações / backup ---------------- */
function cloudBlock() {
  const C = window.Cloud;
  if (!C || !C.isConfigured()) {
    return `<p class="section-title">Conta (nuvem)</p>
       <div class="card">
         <div>Sincronização ainda não configurada.</div>
         <div style="color:var(--text-3);font-size:13px;margin-top:4px">Preencha <code>firebase-config.js</code> pra ativar o login e sincronizar seus roteiros entre aparelhos.</div>
       </div>`;
  }
  const u = C.getUser && C.getUser();
  if (u) {
    return `<p class="section-title">Conta (nuvem)</p>
       <div class="card" style="display:flex;align-items:center;gap:12px">
         <i class="ti ti-cloud-check" style="font-size:26px;color:var(--ok)"></i>
         <div style="flex:1;min-width:0">
           <div style="font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(u.displayName || u.email || "Conectado")}</div>
           <div style="color:var(--text-3);font-size:12px">Roteiros e fotos sincronizam automaticamente</div>
         </div>
       </div>
       <div class="card mt-2">
         <div style="font-size:12px;color:var(--text-2);margin-bottom:6px">Seu ID de usuário (pra conectar o Newsletter)</div>
         <code style="word-break:break-all;font-size:12px">${esc(u.uid)}</code>
         <button class="btn btn-outline mt-2" data-act="copiar-uid" data-uid="${esc(u.uid)}"><i class="ti ti-copy"></i> Copiar ID</button>
       </div>
       <button class="btn btn-outline mt-2" data-act="cloud-signout"><i class="ti ti-logout"></i> Sair</button>`;
  }
  return `<p class="section-title">Conta (nuvem)</p>
     <p class="hint mb-2">Entre pra salvar seus roteiros na nuvem e acessar de qualquer aparelho.</p>
     <button class="btn btn-primary" data-act="cloud-signin"><i class="ti ti-brand-google"></i> Entrar com Google</button>`;
}

function viewConfig() {
  const roteiros = store.getRoteiros();
  const nCenas = roteiros.reduce((s, r) => s + r.cenas.length, 0);
  app.innerHTML =
    topbar("Configurações", { back: "go-home" }) +
    `<div class="content">
       ${cloudBlock()}
       <div class="spacer"></div>
       <p class="section-title">Backup dos seus dados</p>
       <p class="hint mb-2">Seus roteiros e fotos ficam só neste aparelho. Exporte de vez em quando pra não perder nada ao limpar o navegador ou trocar de celular.</p>
       <div class="btn-row mb-1">
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
    bottomNav("config");
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
  toast("Backup exportado", { icon: "ti-download" });
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
  catch (e) { return alertDialog({ title: "Arquivo inválido", message: "Não consegui ler esse arquivo." }); }
  if (!data || data.app !== "diretor" || !Array.isArray(data.roteiros)) {
    return alertDialog({ title: "Backup inválido", message: "Esse arquivo não é um backup do Diretor." });
  }
  const ok = await confirmDialog({
    title: "Restaurar backup",
    message: "Isso vai substituir seus roteiros e fotos atuais pelo conteúdo do backup. Continuar?",
    confirm: "Substituir", danger: true
  });
  if (!ok) return;

  const imagens = data.imagens || {};
  for (const id of Object.keys(imagens)) {
    try { const blob = await (await fetch(imagens[id])).blob(); await idbPutId(id, blob); }
    catch (e) {}
  }
  store.saveRoteiros(data.roteiros);
  store.saveTecImgs(data.tecImgs || {});
  toast("Backup restaurado", { icon: "ti-circle-check" });
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

/* ---------------- Reordenar cenas (arrastar) ----------------
   Desktop (mouse): arrasta qualquer parte do card (drag começa após
   mover ~6px; clique sem mover abre a cena).
   Toque: arrasta pela alça (touch-action:none evita rolar a página).
   ------------------------------------------------------------ */
let suppressCenaClick = false;
function initReorder(listEl, rid) {
  if (!listEl) return;
  let card = null, pid = null, active = false, sx = 0, sy = 0;
  const THRESH = 6;

  const reordenarDom = (y) => {
    const irmaos = [...listEl.querySelectorAll(".cena:not(.dragging)")];
    let ref = null;
    for (const s of irmaos) {
      const box = s.getBoundingClientRect();
      if (y < box.top + box.height / 2) { ref = s; break; }
    }
    if (ref) listEl.insertBefore(card, ref);
    else listEl.appendChild(card);
  };

  const ativar = () => {
    active = true;
    card.classList.add("dragging");
    listEl.classList.add("reordering");
  };

  const onMove = (e) => {
    if (!card) return;
    if (!active) {
      if (Math.abs(e.clientY - sy) > THRESH || Math.abs(e.clientX - sx) > THRESH) ativar();
      else return;
    }
    e.preventDefault();
    reordenarDom(e.clientY);
  };

  const onUp = () => {
    if (!card) return;
    const c = card, foiArrasto = active;
    try { c.releasePointerCapture(pid); } catch (e) {}
    c.removeEventListener("pointermove", onMove);
    c.removeEventListener("pointerup", onUp);
    c.removeEventListener("pointercancel", onUp);
    card = null; active = false;
    if (foiArrasto) {
      c.classList.remove("dragging");
      listEl.classList.remove("reordering");
      const ordem = [...listEl.querySelectorAll(".cena")].map((el) => el.getAttribute("data-cid"));
      const all = store.getRoteiros();
      const rr = all.find((x) => x.id === rid);
      if (rr) {
        rr.cenas.sort((a, b) => ordem.indexOf(a.id) - ordem.indexOf(b.id));
        rr.atualizadoEm = Date.now();
        store.saveRoteiros(all);
      }
      suppressCenaClick = true;
      setTimeout(() => { suppressCenaClick = false; }, 320);
      toast("Ordem atualizada", { icon: "ti-arrows-sort" });
      render();
    }
  };

  listEl.addEventListener("pointerdown", (e) => {
    const alvoCard = e.target.closest(".cena");
    if (!alvoCard) return;
    const naAlca = !!e.target.closest(".drag-handle");
    // No toque, só a alça inicia o arrasto (pra não brigar com a rolagem).
    if (!naAlca && e.pointerType !== "mouse") return;
    card = alvoCard; pid = e.pointerId; active = false;
    sx = e.clientX; sy = e.clientY;
    if (naAlca) { ativar(); e.preventDefault(); }
    try { card.setPointerCapture(pid); } catch (err) {}
    card.addEventListener("pointermove", onMove);
    card.addEventListener("pointerup", onUp);
    card.addEventListener("pointercancel", onUp);
  });
}

/* ---------------- Render principal ---------------- */
let lastRoute = null;
function render() {
  clearUrls();
  // Anima a entrada só quando a rota muda (não em re-renders de clique).
  const route = location.hash || "#/";
  const mudouRota = route !== lastRoute;
  lastRoute = route;
  app.classList.toggle("anim", mudouRota);
  if (mudouRota) window.scrollTo(0, 0);
  const parts = parseHash();
  const [a, b, c] = parts;
  if (!a) return viewHome();
  if (a === "roteiro") return viewRoteiro(b);
  if (a === "cena") return viewCena(b, c);
  if (a === "acervo") return viewAcervo();
  if (a === "tecnica") return viewTecnica(b);
  if (a === "guia") return viewGuia();
  if (a === "gravacao") return viewGravacao(b);
  if (a === "foco") return viewFoco(b, c);
  if (a === "config") return viewConfig();
  return viewHome();
}

/* ---------------- Ações (delegação de clique) ---------------- */
document.addEventListener("click", async (e) => {
  // Toque/clique na alça de arrastar não navega.
  if (e.target.closest(".drag-handle")) return;
  const el = e.target.closest("[data-act]");
  if (!el) return;
  const act = el.getAttribute("data-act");
  const d = el.dataset;

  // Navegação genérica
  if (act === "go-home") return go("#/");
  if (act === "go-acervo") return go("#/acervo");
  if (act.startsWith("go-roteiro:")) return go("#/roteiro/" + act.split(":")[1]);

  if (act === "open-roteiro") return go("#/roteiro/" + d.id);
  if (act === "open-cena") { if (suppressCenaClick) return; return go("#/cena/" + d.rid + "/" + d.cid); }
  if (act === "ver-tecnica") return go("#/tecnica/" + d.tid);
  if (act === "abrir-guia") return go("#/guia");
  if (act === "abrir-config") return go("#/config");

  if (act === "novo-roteiro-ia") return abrirRoteiroIA();
  if (act === "importar-roteiro-ia") return abrirRoteiroIA("importar");

  // Nuvem (login Google)
  if (act === "cloud-signin") { if (window.Cloud) window.Cloud.signIn(); return; }
  if (act === "cloud-signout") { if (window.Cloud) window.Cloud.signOut(); return; }
  if (act === "copiar-uid") {
    try { await navigator.clipboard.writeText(d.uid); toast("ID copiado", { icon: "ti-copy" }); }
    catch (e) { toast("Copie manualmente o ID acima", { icon: "ti-alert-circle" }); }
    return;
  }

  // Checklist de gravação
  if (act === "modo-gravacao") return go("#/gravacao/" + d.id);

  // Modo gravação (foco)
  if (act === "modo-foco") return go("#/foco/" + d.rid);
  if (act === "sair-foco") return go("#/roteiro/" + d.rid);
  if (act === "foco-ir") return go("#/foco/" + d.rid + "/" + d.idx);
  if (act === "foco-gravei") {
    const all = store.getRoteiros();
    const rr = all.find((x) => x.id === d.rid);
    const cc = rr && rr.cenas.find((x) => x.id === d.cid);
    if (!cc) return;
    const marcando = !cc.gravada;
    updateCena(d.rid, d.cid, { gravada: marcando });
    const i = parseInt(d.idx, 10);
    // Ao marcar, já pula pra próxima; se era a última, mostra o fim.
    if (marcando && i < rr.cenas.length - 1) return go("#/foco/" + d.rid + "/" + (i + 1));
    if (marcando) { toast("Roteiro gravado! 🎬", { icon: "ti-circle-check" }); return go("#/roteiro/" + d.rid); }
    return render();
  }
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
    toast(plural(novas.length, "cena adicionada", "cenas adicionadas"), { icon: "ti-movie" });
    return render();
  }

  // Modo Livre: elementos, fundo e luz
  if (act === "comp-add-el") {
    compSel = addElemento(d.rid, d.cid, d.tipo);
    toast(PAL_LABEL[d.tipo] + " adicionado", { icon: PAL_ICON[d.tipo] });
    return render();
  }
  if (act === "comp-del-el") {
    if (compSel) removeElemento(d.rid, d.cid, compSel);
    compSel = null;
    return render();
  }
  if (act === "comp-bg") { setCompBg(d.rid, d.cid, d.bg); return render(); }
  if (act === "comp-luz-add") { updateCena(d.rid, d.cid, { luz: Object.assign({}, LUZ_DEFAULT) }); return render(); }
  if (act === "comp-luz-rm") { updateCena(d.rid, d.cid, { luz: null }); return render(); }
  if (act === "comp-luz-cor") {
    updateCena(d.rid, d.cid, { luz: Object.assign({}, cenaLuz(d.rid, d.cid), { cor: d.cor }) });
    return render();
  }
  if (act === "comp-luz-contra") {
    const cur = cenaLuz(d.rid, d.cid);
    updateCena(d.rid, d.cid, { luz: Object.assign({}, cur, { contra: !cur.contra }) });
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
    const nome = await promptDialog({ title: "Novo roteiro", label: "Nome do roteiro", placeholder: "Ex: Vlog da viagem", confirm: "Criar" });
    if (!nome) return;
    const all = store.getRoteiros();
    const novo = { id: uid("rot"), nome, criadoEm: Date.now(), atualizadoEm: Date.now(), cenas: [] };
    all.push(novo);
    store.saveRoteiros(all);
    toast("Roteiro criado", { icon: "ti-clapperboard" });
    return go("#/roteiro/" + novo.id);
  }

  // Menu do roteiro (renomear / duplicar / excluir)
  if (act === "roteiro-menu") {
    const all = store.getRoteiros();
    const r = all.find((x) => x.id === d.id);
    if (!r) return;
    const escolha = await actionSheet({
      title: r.nome,
      actions: [
        { id: "rename", label: "Renomear", icon: "ti-pencil" },
        { id: "dup", label: "Duplicar", icon: "ti-copy" },
        { id: "del", label: "Excluir roteiro", icon: "ti-trash", danger: true }
      ]
    });
    if (escolha === "rename") {
      const novo = await promptDialog({ title: "Renomear roteiro", label: "Novo nome", value: r.nome, confirm: "Salvar" });
      if (novo) { r.nome = novo; r.atualizadoEm = Date.now(); store.saveRoteiros(all); toast("Renomeado"); render(); }
    } else if (escolha === "dup") {
      const copia = JSON.parse(JSON.stringify(r));
      copia.id = uid("rot");
      copia.nome = r.nome + " (cópia)";
      copia.criadoEm = copia.atualizadoEm = Date.now();
      // Clona os blobs das fotos pra não compartilhar imagem entre os dois roteiros.
      for (const cena of copia.cenas) {
        cena.id = uid("cen");
        if (cena.imagemId) {
          const blob = await idbGet(cena.imagemId);
          cena.imagemId = blob ? await idbPut(blob) : null;
        }
      }
      all.push(copia);
      store.saveRoteiros(all);
      toast("Roteiro duplicado", { icon: "ti-copy" });
      render();
    } else if (escolha === "del") {
      const ok = await confirmDialog({
        title: "Excluir roteiro",
        message: `Excluir "${r.nome}" e todas as cenas? Isso não pode ser desfeito.`,
        confirm: "Excluir", danger: true
      });
      if (ok) {
        for (const cena of r.cenas) if (cena.imagemId) await idbDel(cena.imagemId);
        store.saveRoteiros(all.filter((x) => x.id !== r.id));
        toast("Roteiro excluído", { icon: "ti-trash" });
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
    const ok = await confirmDialog({ title: "Excluir cena", message: "Esta cena será removida do roteiro.", confirm: "Excluir", danger: true });
    if (!ok) return;
    if (cena.imagemId) await idbDel(cena.imagemId);
    r.cenas = r.cenas.filter((x) => x.id !== d.cid);
    r.atualizadoEm = Date.now();
    store.saveRoteiros(all);
    toast("Cena excluída", { icon: "ti-trash" });
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
      toast("Foto adicionada", { icon: "ti-camera" });
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
    const ok = await confirmDialog({ title: "Remover referência", message: "Remover esta imagem de referência?", confirm: "Remover", danger: true });
    if (!ok) return;
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
