// Esquemas visuais originais (desenhos) de cada técnica.
// São ilustrações próprias, não imagens de filmes — livres pra usar e publicar.
(function () {
  var S = "#e0c060"; // sujeito / elemento principal (accent)
  var H = "#6f6f6f"; // linhas auxiliares
  var M = "#a8a8a8"; // secundário
  var F =
    '<rect x="2" y="2" width="156" height="86" rx="5" fill="none" stroke="#4a4a4a" stroke-width="2"/>';
  function svg(inner) {
    return (
      '<svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block">' +
      F + inner + "</svg>"
    );
  }
  // Forma de onda: barras verticais centradas em y=45.
  function wave(heights, x0, gap, color, w) {
    return heights.map(function (h, i) {
      var x = x0 + i * gap;
      return '<line x1="' + x + '" y1="' + (45 - h) + '" x2="' + x + '" y2="' + (45 + h) +
        '" stroke="' + color + '" stroke-width="' + (w || 3) + '" stroke-linecap="round"/>';
    }).join("");
  }

  window.DIAGRAMAS = {
    // ---- Enquadramento ----
    tercos: svg(
      '<line x1="54" y1="4" x2="54" y2="86" stroke="' + H + '" stroke-width="1"/>' +
      '<line x1="106" y1="4" x2="106" y2="86" stroke="' + H + '" stroke-width="1"/>' +
      '<line x1="4" y1="32" x2="156" y2="32" stroke="' + H + '" stroke-width="1"/>' +
      '<line x1="4" y1="60" x2="156" y2="60" stroke="' + H + '" stroke-width="1"/>' +
      '<circle cx="106" cy="32" r="10" fill="' + S + '"/>'
    ),
    "linhas-guia": svg(
      '<line x1="6" y1="86" x2="80" y2="46" stroke="' + H + '" stroke-width="1.5"/>' +
      '<line x1="154" y1="86" x2="80" y2="46" stroke="' + H + '" stroke-width="1.5"/>' +
      '<line x1="46" y1="86" x2="80" y2="46" stroke="' + H + '" stroke-width="1" opacity="0.6"/>' +
      '<line x1="114" y1="86" x2="80" y2="46" stroke="' + H + '" stroke-width="1" opacity="0.6"/>' +
      '<circle cx="80" cy="44" r="7" fill="' + S + '"/>'
    ),
    "moldura-natural": svg(
      '<rect x="38" y="20" width="84" height="58" rx="6" fill="none" stroke="' + H + '" stroke-width="3"/>' +
      '<circle cx="80" cy="46" r="11" fill="' + S + '"/>'
    ),
    profundidade: svg(
      '<ellipse cx="28" cy="62" rx="20" ry="26" fill="' + H + '" opacity="0.35"/>' +
      '<circle cx="86" cy="46" r="13" fill="' + S + '"/>' +
      '<circle cx="128" cy="36" r="7" fill="' + M + '" opacity="0.7"/>'
    ),
    "espaco-respiro": svg(
      '<circle cx="48" cy="40" r="11" fill="' + S + '"/>' +
      '<line x1="64" y1="45" x2="136" y2="45" stroke="' + H + '" stroke-width="1.5" stroke-dasharray="4 4"/>' +
      '<polygon points="136,40 146,45 136,50" fill="' + H + '"/>'
    ),
    simetria: svg(
      '<line x1="80" y1="4" x2="80" y2="86" stroke="' + H + '" stroke-width="1" stroke-dasharray="3 3"/>' +
      '<rect x="22" y="30" width="20" height="40" fill="none" stroke="' + H + '" stroke-width="1.5"/>' +
      '<rect x="118" y="30" width="20" height="40" fill="none" stroke="' + H + '" stroke-width="1.5"/>' +
      '<circle cx="80" cy="48" r="11" fill="' + S + '"/>'
    ),

    // ---- Ângulos ----
    "nivel-olho": svg(
      '<polygon points="22,38 22,52 36,45" fill="' + M + '"/>' +
      '<line x1="36" y1="45" x2="112" y2="45" stroke="' + H + '" stroke-width="1" stroke-dasharray="3 3"/>' +
      '<rect x="116" y="30" width="7" height="36" rx="2" fill="' + S + '"/>' +
      '<circle cx="119" cy="24" r="6" fill="' + S + '"/>'
    ),
    "contre-plongee": svg(
      '<polygon points="20,66 20,80 34,73" fill="' + M + '"/>' +
      '<line x1="34" y1="72" x2="112" y2="30" stroke="' + H + '" stroke-width="1" stroke-dasharray="3 3"/>' +
      '<rect x="114" y="18" width="9" height="54" rx="2" fill="' + S + '"/>' +
      '<circle cx="118" cy="13" r="6" fill="' + S + '"/>'
    ),
    plongee: svg(
      '<polygon points="20,12 20,26 34,19" fill="' + M + '"/>' +
      '<line x1="34" y1="20" x2="116" y2="62" stroke="' + H + '" stroke-width="1" stroke-dasharray="3 3"/>' +
      '<rect x="116" y="58" width="7" height="20" rx="2" fill="' + S + '"/>' +
      '<circle cx="119" cy="53" r="5" fill="' + S + '"/>'
    ),
    dutch: svg(
      '<g transform="rotate(-13 80 45)">' +
      '<line x1="14" y1="58" x2="146" y2="58" stroke="' + H + '" stroke-width="1.5"/>' +
      '<rect x="74" y="30" width="8" height="30" rx="2" fill="' + S + '"/>' +
      '<circle cx="78" cy="25" r="6" fill="' + S + '"/>' +
      "</g>"
    ),
    pov: svg(
      '<line x1="4" y1="38" x2="156" y2="38" stroke="' + H + '" stroke-width="1" stroke-dasharray="3 3"/>' +
      '<line x1="60" y1="58" x2="100" y2="58" stroke="' + S + '" stroke-width="5" stroke-linecap="round"/>' +
      '<line x1="40" y1="86" x2="60" y2="58" stroke="' + S + '" stroke-width="5" stroke-linecap="round"/>' +
      '<line x1="120" y1="86" x2="100" y2="58" stroke="' + S + '" stroke-width="5" stroke-linecap="round"/>'
    ),
    "over-shoulder": svg(
      '<circle cx="110" cy="38" r="10" fill="' + S + '"/>' +
      '<rect x="100" y="50" width="20" height="22" rx="5" fill="' + S + '"/>' +
      '<circle cx="34" cy="56" r="18" fill="' + H + '"/>' +
      '<path d="M8,90 L8,80 Q8,68 34,68 Q60,68 60,80 L60,90 Z" fill="' + H + '"/>'
    ),

    // ---- Movimento ----
    tracking: svg(
      '<circle cx="92" cy="40" r="11" fill="' + S + '"/>' +
      '<line x1="40" y1="33" x2="66" y2="33" stroke="' + M + '" stroke-width="2" opacity="0.7"/>' +
      '<line x1="34" y1="41" x2="64" y2="41" stroke="' + M + '" stroke-width="2" opacity="0.5"/>' +
      '<line x1="40" y1="49" x2="66" y2="49" stroke="' + M + '" stroke-width="2" opacity="0.7"/>' +
      '<line x1="28" y1="76" x2="126" y2="76" stroke="' + S + '" stroke-width="2"/>' +
      '<polygon points="126,71 136,76 126,81" fill="' + S + '"/>'
    ),
    dolly: svg(
      '<circle cx="80" cy="34" r="12" fill="' + S + '"/>' +
      '<polygon points="74,84 86,84 80,74" fill="' + M + '"/>' +
      '<line x1="80" y1="80" x2="80" y2="56" stroke="' + S + '" stroke-width="2"/>' +
      '<polygon points="74,58 80,48 86,58" fill="' + S + '"/>'
    ),
    handheld: svg(
      '<rect x="8" y="8" width="144" height="74" rx="4" fill="none" stroke="' + H + '" stroke-width="1.5" opacity="0.45" transform="rotate(2.5 80 45)"/>' +
      '<circle cx="80" cy="45" r="11" fill="' + S + '"/>' +
      '<path d="M28,20 q4,-5 8,0 q4,5 8,0" stroke="' + M + '" fill="none" stroke-width="1.5"/>' +
      '<path d="M116,68 q4,-5 8,0 q4,5 8,0" stroke="' + M + '" fill="none" stroke-width="1.5"/>'
    ),
    "whip-pan": svg(
      '<line x1="8" y1="30" x2="118" y2="30" stroke="' + M + '" stroke-width="2" opacity="0.5" stroke-linecap="round"/>' +
      '<line x1="20" y1="40" x2="150" y2="40" stroke="' + S + '" stroke-width="4" opacity="0.85" stroke-linecap="round"/>' +
      '<line x1="10" y1="50" x2="134" y2="50" stroke="' + M + '" stroke-width="2" opacity="0.5" stroke-linecap="round"/>' +
      '<line x1="30" y1="60" x2="150" y2="60" stroke="' + M + '" stroke-width="2" opacity="0.4" stroke-linecap="round"/>' +
      '<ellipse cx="120" cy="45" rx="18" ry="11" fill="' + S + '" opacity="0.5"/>'
    ),
    orbit: svg(
      '<ellipse cx="80" cy="46" rx="48" ry="28" fill="none" stroke="' + H + '" stroke-width="1.5" stroke-dasharray="5 4"/>' +
      '<circle cx="80" cy="46" r="11" fill="' + S + '"/>' +
      '<polygon points="126,41 137,46 126,51" fill="' + H + '"/>'
    ),
    reveal: svg(
      '<circle cx="98" cy="44" r="11" fill="' + S + '"/>' +
      '<rect x="40" y="8" width="36" height="74" fill="' + H + '"/>' +
      '<line x1="52" y1="78" x2="118" y2="78" stroke="' + S + '" stroke-width="2"/>' +
      '<polygon points="118,73 128,78 118,83" fill="' + S + '"/>'
    ),

    // ---- Luz e cor ----
    "golden-hour": svg(
      '<line x1="4" y1="58" x2="156" y2="58" stroke="' + H + '" stroke-width="1.5"/>' +
      '<circle cx="116" cy="50" r="13" fill="' + S + '"/>' +
      '<line x1="116" y1="30" x2="116" y2="22" stroke="' + S + '" stroke-width="2" stroke-linecap="round"/>' +
      '<line x1="138" y1="50" x2="146" y2="50" stroke="' + S + '" stroke-width="2" stroke-linecap="round"/>' +
      '<line x1="100" y1="34" x2="105" y2="39" stroke="' + S + '" stroke-width="2" stroke-linecap="round"/>' +
      '<rect x="44" y="36" width="8" height="22" rx="2" fill="' + M + '"/>' +
      '<circle cx="48" cy="31" r="6" fill="' + M + '"/>'
    ),
    contraluz: svg(
      '<circle cx="80" cy="42" r="32" fill="' + S + '" opacity="0.28"/>' +
      '<circle cx="80" cy="42" r="20" fill="' + S + '" opacity="0.4"/>' +
      '<rect x="74" y="32" width="12" height="40" rx="2" fill="' + H + '"/>' +
      '<circle cx="80" cy="27" r="8" fill="' + H + '"/>'
    ),
    "luz-qualidade": svg(
      '<circle cx="48" cy="45" r="18" fill="' + M + '"/>' +
      '<path d="M48 27 A18 18 0 0 1 48 63 Z" fill="' + H + '" opacity="0.4"/>' +
      '<circle cx="112" cy="45" r="18" fill="' + M + '"/>' +
      '<path d="M112 27 A18 18 0 0 1 112 63 Z" fill="' + H + '"/>'
    ),
    paleta: svg(
      '<rect x="22" y="30" width="27" height="34" rx="3" fill="#BA7517"/>' +
      '<rect x="53" y="30" width="27" height="34" rx="3" fill="' + S + '"/>' +
      '<rect x="84" y="30" width="27" height="34" rx="3" fill="#378ADD"/>' +
      '<rect x="115" y="30" width="23" height="34" rx="3" fill="#185FA5"/>'
    ),

    // ---- Áudio ----
    "som-ambiente": svg(wave([6, 10, 7, 12, 8, 11, 9, 13, 7, 10, 8, 12, 6, 9, 7], 16, 9, M, 3)),
    "voz-perto": svg(
      '<rect x="26" y="28" width="14" height="24" rx="7" fill="' + S + '"/>' +
      '<path d="M22 44 a11 11 0 0 0 22 0" fill="none" stroke="' + S + '" stroke-width="2"/>' +
      '<line x1="33" y1="55" x2="33" y2="64" stroke="' + S + '" stroke-width="2" stroke-linecap="round"/>' +
      wave([4, 8, 14, 18, 14, 8, 5, 10, 6], 62, 10, M, 3)
    ),
    trilha: svg(
      '<circle cx="36" cy="58" r="7" fill="' + S + '"/>' +
      '<rect x="41" y="24" width="3" height="34" fill="' + S + '"/>' +
      '<path d="M44 24 q11 2 11 11 q-4 -7 -11 -5 z" fill="' + S + '"/>' +
      wave([16, 6, 18, 8, 20, 7, 15, 9], 66, 11, M, 3)
    ),
    silencio: svg(
      '<line x1="14" y1="45" x2="70" y2="45" stroke="' + M + '" stroke-width="2" stroke-linecap="round"/>' +
      '<line x1="80" y1="36" x2="80" y2="54" stroke="' + S + '" stroke-width="3" stroke-linecap="round"/>' +
      '<line x1="90" y1="45" x2="146" y2="45" stroke="' + M + '" stroke-width="2" stroke-linecap="round"/>'
    ),

    // ---- Ritmo e edição ----
    "corte-batida": svg(
      '<rect x="16" y="34" width="54" height="18" rx="3" fill="' + M + '"/>' +
      '<rect x="90" y="34" width="54" height="18" rx="3" fill="' + M + '"/>' +
      '<line x1="80" y1="26" x2="80" y2="60" stroke="' + S + '" stroke-width="3"/>' +
      '<circle cx="34" cy="66" r="2.5" fill="' + S + '"/><circle cx="58" cy="66" r="2.5" fill="' + S + '"/>' +
      '<circle cx="80" cy="66" r="2.5" fill="' + S + '"/><circle cx="104" cy="66" r="2.5" fill="' + S + '"/>' +
      '<circle cx="128" cy="66" r="2.5" fill="' + S + '"/>'
    ),
    cobertura: svg(
      '<rect x="20" y="24" width="120" height="20" rx="3" fill="' + M + '"/>' +
      '<rect x="20" y="50" width="56" height="18" rx="3" fill="' + S + '"/>' +
      '<rect x="84" y="50" width="56" height="18" rx="3" fill="' + S + '" opacity="0.55"/>'
    ),
    "jump-cut": svg(
      '<rect x="16" y="34" width="40" height="18" rx="3" fill="' + M + '"/>' +
      '<rect x="62" y="34" width="36" height="18" rx="3" fill="none" stroke="' + S + '" stroke-width="1.5" stroke-dasharray="4 3"/>' +
      '<rect x="104" y="34" width="40" height="18" rx="3" fill="' + M + '"/>' +
      '<line x1="66" y1="62" x2="94" y2="62" stroke="' + S + '" stroke-width="1.5"/>' +
      '<polygon points="66,62 72,59 72,65" fill="' + S + '"/><polygon points="94,62 88,59 88,65" fill="' + S + '"/>'
    ),
    "b-roll": svg(
      '<rect x="18" y="30" width="124" height="30" rx="4" fill="' + M + '"/>' +
      '<rect x="92" y="38" width="44" height="30" rx="4" fill="' + S + '" stroke="#0f0f0f" stroke-width="2"/>'
    ),

    // ---- Transições ----
    "match-cut": svg(
      '<rect x="14" y="26" width="58" height="40" rx="4" fill="none" stroke="' + H + '" stroke-width="1.5"/>' +
      '<rect x="88" y="26" width="58" height="40" rx="4" fill="none" stroke="' + H + '" stroke-width="1.5"/>' +
      '<circle cx="43" cy="46" r="11" fill="' + S + '"/>' +
      '<circle cx="117" cy="46" r="11" fill="' + S + '"/>' +
      '<line x1="54" y1="46" x2="106" y2="46" stroke="' + S + '" stroke-width="1.5" stroke-dasharray="4 3"/>'
    ),
    "corte-movimento": svg(
      '<line x1="80" y1="24" x2="80" y2="66" stroke="' + H + '" stroke-width="2" stroke-dasharray="3 3"/>' +
      '<circle cx="40" cy="45" r="9" fill="' + S + '"/>' +
      '<circle cx="120" cy="45" r="9" fill="' + S + '"/>' +
      '<line x1="30" y1="70" x2="130" y2="70" stroke="' + S + '" stroke-width="2"/>' +
      '<polygon points="130,65 140,70 130,75" fill="' + S + '"/>'
    ),
    "mascara-objeto": svg(
      '<circle cx="62" cy="44" r="11" fill="' + S + '"/>' +
      '<rect x="86" y="8" width="20" height="74" fill="' + H + '"/>' +
      '<line x1="70" y1="74" x2="118" y2="74" stroke="' + S + '" stroke-width="2"/>' +
      '<polygon points="118,69 128,74 118,79" fill="' + S + '"/>'
    ),
    fundido: svg(
      '<rect x="26" y="28" width="60" height="40" rx="4" fill="' + S + '" opacity="0.45"/>' +
      '<rect x="74" y="28" width="60" height="40" rx="4" fill="' + M + '" opacity="0.5"/>'
    )
  };
})();
