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

  let auth = null, db = null, provider = null, user = null, storage = null;
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

    // ---- Imagens (Firebase Storage) ----
    // Sobe o blob; silencioso se offline/deslogado (fica só local).
    async uploadImage(id, blob) {
      if (!ready || !user || !storage || !blob) return false;
      try {
        await fns.uploadBytes(fns.sref(storage, imgPath(user.uid, id)), blob);
        return true;
      } catch (e) { console.warn("[Cloud] upload img", id, e && e.code); return false; }
    },
    // URL pra usar direto em <img src> (não precisa de CORS).
    async imageUrl(id) {
      if (!ready || !user || !storage) return null;
      try { return await fns.getDownloadURL(fns.sref(storage, imgPath(user.uid, id))); }
      catch (e) { return null; }
    },
    notifyTecImgs(map) { saveTecImgs(map); }
  };

  function imgPath(uid, id) { return "users/" + uid + "/imgs/" + id; }

  if (!configured) {
    console.info("[Cloud] Firebase não configurado — rodando 100% local. Preencha firebase-config.js pra ligar login/sync.");
    return;
  }

  init();

  async function init() {
    try {
      const [appMod, authMod, fsMod, stMod] = await Promise.all([
        import(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-app.js`),
        import(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-auth.js`),
        import(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-firestore.js`),
        import(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-storage.js`)
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

      storage = stMod.getStorage(app);
      fns.sref = stMod.ref;
      fns.uploadBytes = stMod.uploadBytes;
      fns.getDownloadURL = stMod.getDownloadURL;

      ready = true;
      authMod.onAuthStateChanged(auth, async (u) => {
        user = u || null;
        emit("cloud-auth", { user });
        if (user) await pullAndMerge();
      });
    } catch (e) {
      console.error("[Cloud] falha ao iniciar Firebase (verifique a config e a versão do SDK):", e);
      emit("cloud-error", { where: "init", e });
    }
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

  // Sobe pro Storage as imagens referenciadas que ainda não subiram.
  async function backfillImagens(roteiros) {
    if (!ready || !user || !storage) return;
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
        await fns.uploadBytes(fns.sref(storage, imgPath(user.uid, id)), blob);
        imgsSubidas.add(id);
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
