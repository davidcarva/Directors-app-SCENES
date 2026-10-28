/* ============================================================
   Vercel Serverless Function — analisa uma imagem de referência
   e devolve a "ficha técnica" do take: plano, ângulo, lente, luz,
   composição + como reproduzir com o equipamento do usuário.
   Chave da OpenAI em env var; sem dependências (fetch do Node 18+).
   ============================================================ */
module.exports = async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ erro: "Use POST." }); return; }
  const key = process.env.OPENAI_API_KEY;
  if (!key) { res.status(500).json({ erro: "OPENAI_API_KEY não configurada na Vercel." }); return; }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  const imagem = String(body.imagem || "");          // dataURL (data:image/...;base64,...)
  const equipamento = String(body.equipamento || "").trim();
  const nota = String(body.nota || "").trim();        // o que o usuário quer daquela ref
  const tecnicas = Array.isArray(body.tecnicas) ? body.tecnicas : [];
  if (!imagem.startsWith("data:image/")) {
    res.status(400).json({ erro: "Mande a imagem como dataURL." });
    return;
  }

  const model = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";
  const tecList = tecnicas.map((t) => `${t.id} = ${t.nome}`).join("; ") || "(nenhuma)";
  const gear = equipamento || "celular comum, sem equipamento extra";

  const sys =
`Você é um diretor de fotografia analisando um frame de referência. Responda em português do Brasil.
Devolva SOMENTE JSON válido neste formato exato:
{"titulo":"nome curto e descritivo do take","plano":"tamanho do plano","angulo":"altura/ângulo da câmera","lente":"lente aproximada e por quê","profundidade":"nitidez do fundo / abertura aproximada","luz":{"direcao":"de onde vem","qualidade":"dura ou suave","temperatura":"quente, neutra ou fria","resumo":"o esquema de luz em 1 frase"},"composicao":"como o quadro está organizado","mood":"a sensação que passa, em poucas palavras","cores":"a paleta em 1 frase","tecnicas":["<id>"],"reproduzir":["passo prático 1","passo 2","passo 3"]}
Regras:
- Seja CONCRETO e técnico, mas em linguagem direta. Nada de poesia vaga.
- "tecnicas": só ids desta lista (0 a 3 que realmente se aplicam): ${tecList}.
- "reproduzir": 3 a 5 passos EXECUTÁVEIS com este equipamento: ${gear}. Diga onde pôr a câmera, onde pôr a luz/sujeito e o ajuste no aparelho. Se o take exigir algo que esse equipamento não faz, diga a aproximação possível.
- Nada de texto fora do JSON.
${nota ? "- O usuário quer focar em: " + nota : ""}`;

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: [
            { type: "text", text: "Analise este frame de referência." },
            { type: "image_url", image_url: { url: imagem, detail: "low" } }
          ] }
        ],
        response_format: { type: "json_object" },
        max_tokens: 900
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
    res.status(500).json({ erro: "Falha ao analisar.", detalhe: String(e).slice(0, 200) });
  }
};
