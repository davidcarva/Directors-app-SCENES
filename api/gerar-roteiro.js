/* ============================================================
   Vercel Serverless Function — gera um roteiro short-form
   estruturado em cenas (com função e técnica sugerida) a partir
   de um tema. A chave da OpenAI fica em env var (OPENAI_API_KEY),
   nunca no navegador. Sem dependências (usa fetch global do Node 18+).
   ============================================================ */
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ erro: "Use POST." });
    return;
  }
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    res.status(500).json({ erro: "OPENAI_API_KEY não configurada na Vercel (Settings → Environment Variables)." });
    return;
  }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  const tema = String(body.tema || "").trim();
  const estilo = String(body.estilo || "").trim();
  const nCenas = Math.max(3, Math.min(10, parseInt(body.nCenas, 10) || 6));
  const funcoes = Array.isArray(body.funcoes) ? body.funcoes : [];
  const tecnicas = Array.isArray(body.tecnicas) ? body.tecnicas : [];
  if (!tema) { res.status(400).json({ erro: "Faltou o tema do vídeo." }); return; }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const funcList = funcoes.map((f) => `${f.id} = ${f.nome}`).join("; ") || "(nenhuma)";
  const tecList = tecnicas.map((t) => `${t.id} = ${t.nome}`).join("; ") || "(nenhuma)";

  const sys =
`Você é um roteirista de vídeos short-form (Reels/TikTok/Shorts) em português do Brasil.
Recebe um tema e devolve um roteiro dividido em cenas curtas e FILMÁVEIS.
Responda SOMENTE com JSON válido neste formato exato:
{"nome":"título curto do vídeo","mensagem":"a ideia central em 1 frase","cenas":[{"descricao":"o que acontece/aparece + a fala ou legenda dessa cena; concreto e gravável, 1-2 frases","funcao":"<id>","tecnicaId":"<id ou null>"}]}
Regras rígidas:
- Exatamente ${nCenas} cenas, na ordem da narrativa (começa com gancho, termina com fecho/CTA).
- "funcao" DEVE ser o ID (o texto ANTES do "="), nunca o nome. Ids válidos: ${funcList}.
- "tecnicaId" DEVE ser o ID (texto antes do "="), ou null de verdade (não a string "null"), se nenhuma encaixar. Ids válidos: ${tecList}.
- Descrições concretas do que filmar (evite abstração). Nada de texto fora do JSON.
${estilo ? "- Estilo/tom desejado: " + estilo : ""}`;

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: "Tema do vídeo: " + tema }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8
      })
    });
    if (!r.ok) {
      const t = await r.text();
      res.status(502).json({ erro: "OpenAI respondeu " + r.status, detalhe: t.slice(0, 300) });
      return;
    }
    const data = await r.json();
    const txt = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "{}";
    let out;
    try { out = JSON.parse(txt); } catch (e) { res.status(502).json({ erro: "A IA não devolveu JSON válido." }); return; }
    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ erro: "Falha ao chamar a IA.", detalhe: String(e).slice(0, 200) });
  }
};
