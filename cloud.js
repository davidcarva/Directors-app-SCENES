/* ============================================================
   cloud.js — login Google (Firebase Auth) + sync local-first
   (Firestore). Módulo ES. Só ativa se firebase-config.js estiver
   preenchido; caso contrário o Diretor roda 100% local.

   Estratégia local-first: o localStorage continua a "verdade" e o
   app segue síncrono/offline. Este módulo espelha os roteiros pro
   Firestore (debounce) e, no login, puxa+mescla por "atualizadoEm"
   (mais novo vence por roteiro). Conflitos de exclusão entre 2
   aparelhos ficam pra fase futura (tombstones).
   ============================================================ */
(() => {
  const FB_VER = "10.12.2"; // se o SDK não carregar, trocamos a versão
  const cfg = window.FIREBASE_CONFIG || {};
  const configured = !!(cfg && cfg.apiKey);

  let auth = null, db = null, provider = null, user = null;
  const fns = {};
  let ready = false;
  let pushTimer = null;
  const DEBOUNCE = 1500;
  let lastSnapshot = "[]";

  const emit = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));

  window.Cloud = {
    isConfigured: () => configured,
    isReady: () => ready,
    getUser: () => user,
    async signIn() {
      if (!ready) return;
      try { await fns.signInWithPopup(auth, provider); }
      catch (e) { console.warn("[Cloud] signIn falhou:", e && e.code); emit("cloud-error", { where: "signin", e }); }
    },
    async signOut() { if (ready) { try { await fns.signOut(auth); } catch (e) {} } },
    notifyLocalChange(roteiros) { scheduleFlush(roteiros); },
    syncNow() { if (user) pullAndMerge(); },

    // ---- Imagens (guardadas no Firestore como dataURL) ----
    // O Cloud Storage exige plano pago, então usamos o Firestore:
    // 1 doc por imagem em users/{uid}/imgs/{id}, limite ~1MB por doc.
    async uploadImage(id, blob) {
      if (!ready || !user || !blob) return false;
      try {
        const dataUrl = await comprimirParaNuvem(blob);
        if (!dataUrl) return false;
        await fns.setDoc(imgDoc(id), { data: dataUrl, em: Date.now() });
        imgsSubidas.add(id);
        return true;
      } catch (e) { console.warn("[Cloud] upload img", id, e && e.code); return false; }
    },
    // Devolve uma dataURL — serve direto em <img src>.
    async imageUrl(id) {
      if (!ready || !user) return null;
      try {
        const snap = await fns.getDoc(imgDoc(id));
        return snap.exists() ? (snap.data().data || null) : null;
      } catch (e) { return null; }
    },
    notifyTecImgs(map) { saveTecImgs(map); }
  };

  function imgDoc(id) { return fns.doc(db, "users", user.uid, "imgs", id); }

  // Reduz a imagem até caber com folga no limite de 1MB do documento.
  async function comprimirParaNuvem(blob) {
    const LIMITE = 700 * 1024; // ~700KB de dataURL (base64 infla ~33%)
    const tentativas = [[1100, 0.72], [900, 0.65], [700, 0.55], [520, 0.45]];
    for (const [maxLado, q] of tentativas) {
      const url = await redimensionar(blob, maxLado, q);
      if (url && url.length <= LIMITE) return url;
    }
    console.warn("[Cloud] imagem muito grande pra sincronizar — fica só neste aparelho.");
    return null;
  }
  function redimensionar(blob, maxLado, q) {
    return new Promise((res) => {
      const img = new Image();
      const src = URL.createObjectURL(blob);
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > h && w > maxLado) { h = Math.round((h * maxLado) / w); w = maxLado; }
        else if (h >= w && h > maxLado) { w = Math.round((w * maxLado) / h); h = maxLado; }
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(src);
        try { res(c.toDataURL("image/jpeg", q)); } catch (e) { res(null); }
      };
      img.onerror = () => { URL.revokeObjectURL(src); res(null); };
      img.src = src;
    });
  }

  if (!configured) {
    console.info("[Cloud] Firebase não configurado — rodando 100% local. Preencha firebase-config.js pra ligar login/sync.");
    return;
  }

  init();

  async function init() {
    try {
      const [appMod, authMod, fsMod] = await Promise.all([
        import(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-app.js`),
        import(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-auth.js`),
        import(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-firestore.js`)
      ]);

      const app = appMod.initializeApp(cfg);
      auth = authMod.getAuth(app);
      provider = new authMod.GoogleAuthProvider();
      fns.signInWithPopup = authMod.signInWithPopup;
      fns.signOut = authMod.signOut;

      try {
        db = fsMod.initializeFirestore(app, {
          localCache: fsMod.persistentLocalCache({ tabManager: fsMod.persistentMultipleTabManager() })
        });
      } catch (e) {
        db = fsMod.getFirestore(app); // fallback sem cache persistente
      }
      fns.collection = fsMod.collection;
      fns.doc = fsMod.doc;
      fns.getDoc = fsMod.getDoc;
      fns.getDocs = fsMod.getDocs;
      fns.setDoc = fsMod.setDoc;
      fns.deleteDoc = fsMod.deleteDoc;
      fns.onSnapshot = fsMod.onSnapshot;


      ready = true;
      authMod.onAuthStateChanged(auth, async (u) => {
        user = u || null;
        emit("cloud-auth", { user });
        if (user) { await pullAndMerge(); ouvirAoVivo(); }
        else if (unsubLive) { unsubLive(); unsubLive = null; }
      });
    } catch (e) {
      console.error("[Cloud] falha ao iniciar Firebase (verifique a config e a versão do SDK):", e);
      emit("cloud-error", { where: "init", e });
    }
  }

  // Escuta a coleção em tempo real: roteiro criado em outro aparelho (ou
  // enviado pelo Newsletter) entra na lista sozinho, sem recarregar.
  let unsubLive = null;
  function ouvirAoVivo() {
    if (!ready || !user || unsubLive) return;
    try {
      unsubLive = fns.onSnapshot(
        fns.collection(db, "users", user.uid, "roteiros"),
        (snap) => {
          const cloud = [];
          snap.forEach((d) => cloud.push(d.data()));
          mesclarDaNuvem(cloud);
        },
        (e) => console.warn("[Cloud] listener:", e && e.code)
      );
    } catch (e) { console.warn("[Cloud] onSnapshot indisponível:", e); }
  }
  // Traz o que é mais novo na nuvem pro local (não apaga nada local aqui).
  function mesclarDaNuvem(cloud) {
    const byId = new Map();
    localRoteiros().forEach((r) => byId.set(r.id, r));
    let mudou = false;
    cloud.forEach((r) => {
      const cur = byId.get(r.id);
      if (!cur || (r.atualizadoEm || 0) > (cur.atualizadoEm || 0)) { byId.set(r.id, r); mudou = true; }
    });
    if (!mudou) return;
    const merged = [...byId.values()];
    writeLocal(merged); // atualiza lastSnapshot => o flush não apaga os novos
    emit("cloud-synced", { count: merged.length });
  }

  function localRoteiros() {
    try { return JSON.parse(localStorage.getItem("roteiros") || "[]"); } catch { return []; }
  }
  function writeLocal(arr) {
    localStorage.setItem("roteiros", JSON.stringify(arr));
    lastSnapshot = JSON.stringify(arr);
  }

  async function pullAndMerge() {
    if (!ready || !user) return;
    const cloud = [];
    try {
      const snap = await fns.getDocs(fns.collection(db, "users", user.uid, "roteiros"));
      snap.forEach((d) => cloud.push(d.data()));
    } catch (e) { console.warn("[Cloud] pull falhou:", e); return; }

    const byId = new Map();
    localRoteiros().forEach((r) => byId.set(r.id, r));
    cloud.forEach((r) => {
      const cur = byId.get(r.id);
      if (!cur || (r.atualizadoEm || 0) >= (cur.atualizadoEm || 0)) byId.set(r.id, r);
    });
    const merged = [...byId.values()];
    writeLocal(merged);
    await pullTecImgs();
    emit("cloud-synced", { count: merged.length });
    pushAll(merged); // garante que o que é mais novo local suba
    backfillImagens(merged); // sobe imagens locais que ainda não estão na nuvem
  }

  // ---- Mapa de referências das técnicas (users/{uid}/meta/tecImgs) ----
  function tecImgsRef() { return fns.doc(db, "users", user.uid, "meta", "tecImgs"); }
  async function pullTecImgs() {
    if (!ready || !user) return;
    try {
      const snap = await fns.getDoc(tecImgsRef());
      const remoto = snap.exists() ? (snap.data().map || {}) : {};
      let local = {};
      try { local = JSON.parse(localStorage.getItem("tecImgs") || "{}"); } catch {}
      // união por técnica (sem perder referência de nenhum aparelho)
      const merged = Object.assign({}, remoto);
      Object.keys(local).forEach((tid) => {
        merged[tid] = [...new Set([...(remoto[tid] || []), ...(local[tid] || [])])];
      });
      localStorage.setItem("tecImgs", JSON.stringify(merged));
      await fns.setDoc(tecImgsRef(), { map: merged });
    } catch (e) { console.warn("[Cloud] tecImgs", e && e.code); }
  }
  async function saveTecImgs(map) {
    if (!ready || !user) return;
    try { await fns.setDoc(tecImgsRef(), { map: map || {} }); } catch (e) {}
  }

  // Sobe as imagens referenciadas que ainda não estão na nuvem.
  async function backfillImagens(roteiros) {
    if (!ready || !user) return;
    const ids = new Set();
    (roteiros || []).forEach((r) => (r.cenas || []).forEach((c) => { if (c.imagemId) ids.add(c.imagemId); }));
    try {
      const m = JSON.parse(localStorage.getItem("tecImgs") || "{}");
      Object.values(m).forEach((arr) => (arr || []).forEach((id) => ids.add(id)));
    } catch {}
    for (const id of ids) {
      if (imgsSubidas.has(id)) continue;
      try {
        const blob = await window.idbGetBlob(id);   // exposto pelo app.js
        if (!blob) continue;                         // não temos local (veio de outro aparelho)
        const jaTem = await fns.getDoc(imgDoc(id));
        if (jaTem.exists()) { imgsSubidas.add(id); continue; }
        await window.Cloud.uploadImage(id, blob);
      } catch (e) { /* segue o baile */ }
    }
  }
  const imgsSubidas = new Set();

  function scheduleFlush(roteiros) {
    if (!ready || !user) { lastSnapshot = JSON.stringify(roteiros); return; }
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => flush(roteiros), DEBOUNCE);
  }

  async function flush(roteiros) {
    if (!ready || !user) return;
    let prev = [];
    try { prev = JSON.parse(lastSnapshot); } catch {}
    const curIds = new Set(roteiros.map((r) => r.id));
    for (const r of roteiros) {
      const before = prev.find((p) => p.id === r.id);
      if (!before || JSON.stringify(before) !== JSON.stringify(r)) {
        try { await fns.setDoc(fns.doc(db, "users", user.uid, "roteiros", r.id), r); }
        catch (e) { console.warn("[Cloud] push", r.id, e && e.code); }
      }
    }
    for (const p of prev) {
      if (!curIds.has(p.id)) {
        try { await fns.deleteDoc(fns.doc(db, "users", user.uid, "roteiros", p.id)); } catch (e) {}
      }
    }
    lastSnapshot = JSON.stringify(roteiros);
  }

  async function pushAll(roteiros) {
    if (!ready || !user) return;
    for (const r of roteiros) {
      try { await fns.setDoc(fns.doc(db, "users", user.uid, "roteiros", r.id), r); } catch (e) {}
    }
    lastSnapshot = JSON.stringify(roteiros);
  }
})();
