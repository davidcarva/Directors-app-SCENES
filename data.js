// Acervo de técnicas de cinematografia.
// Cada técnica: id, categoria, nome, icone (Tabler), perspectiva, comoAplicar[], exemplos[{nome, busca}].
// "busca" vira um link de busca no YouTube (sem URLs que quebram com o tempo).
window.CATEGORIAS = [
  { id: "enquadramento", nome: "Enquadramento e composição", icone: "ti-grid-dots" },
  { id: "angulos", nome: "Ângulos de câmera", icone: "ti-angle" },
  { id: "movimento", nome: "Movimento de câmera", icone: "ti-arrows-move" },
  { id: "luz-cor", nome: "Luz e cor", icone: "ti-sun" },
  { id: "audio", nome: "Áudio", icone: "ti-microphone" },
  { id: "edicao", nome: "Ritmo e edição", icone: "ti-scissors" },
  { id: "transicoes", nome: "Transições", icone: "ti-transition-right" }
];

window.TECNICAS = [
  // ---------- ENQUADRAMENTO E COMPOSIÇÃO ----------
  {
    id: "tercos",
    categoria: "enquadramento",
    nome: "Regra dos terços",
    icone: "ti-grid-dots",
    perspectiva:
      "Divida a tela em 3 colunas e 3 linhas. Pôr o que importa sobre as linhas (e não no centro) cria equilíbrio e dá movimento ao olhar. O vazio do lado também conta história.",
    comoAplicar: [
      "Ative as linhas-guia da câmera do celular (nas configurações da câmera).",
      "Alinhe os olhos da pessoa na linha horizontal de cima.",
      "Coloque o sujeito numa das colunas laterais, deixando espaço pra onde ele olha.",
      "Para paisagem, ponha o horizonte na linha de baixo (mais céu) ou de cima (mais chão)."
    ],
    exemplos: [
      { nome: "Regra dos terços explicada", busca: "regra dos terços cinematografia" },
      { nome: "StudioBinder — composição", busca: "StudioBinder rule of thirds composition" }
    ]
  },
  {
    id: "linhas-guia",
    categoria: "enquadramento",
    nome: "Linhas-guia",
    icone: "ti-arrows-diagonal",
    perspectiva:
      "Estradas, corrimãos, paredes e sombras formam linhas que puxam o olhar pra dentro da imagem, direto pro sujeito. Dá profundidade e intenção.",
    comoAplicar: [
      "Procure linhas reais no ambiente: rua, calçada, trilho, mureta.",
      "Posicione-se de forma que as linhas apontem pro seu sujeito.",
      "Linhas que convergem ao longe aumentam a sensação de distância.",
      "Funciona muito bem com o sujeito no fim da linha (ponto de fuga)."
    ],
    exemplos: [
      { nome: "Kubrick — ponto de fuga (one-point perspective)", busca: "Kubrick one point perspective" },
      { nome: "Linhas-guia na imagem", busca: "leading lines cinematography" }
    ]
  },
  {
    id: "moldura-natural",
    categoria: "enquadramento",
    nome: "Moldura natural",
    icone: "ti-frame",
    perspectiva:
      "Usar algo em primeiro plano (porta, janela, galhos, vão) pra emoldurar o sujeito cria camadas e foca a atenção. Dá a sensação de estar 'espiando' a cena.",
    comoAplicar: [
      "Coloque algo perto da câmera nas bordas: folhas, batente de porta, grade.",
      "Mantenha o sujeito no centro do 'buraco' da moldura.",
      "Deixe a moldura levemente desfocada pra separar do sujeito.",
      "Ótimo pra dar contexto de lugar (filmar de dentro de um carro, por exemplo)."
    ],
    exemplos: [
      { nome: "Enquadrar dentro do quadro", busca: "framing within a frame cinematography" }
    ]
  },
  {
    id: "profundidade",
    categoria: "enquadramento",
    nome: "Profundidade e camadas",
    icone: "ti-stack-2",
    perspectiva:
      "Ter algo perto, algo no meio e algo ao fundo transforma uma imagem 'chapada' numa cena 3D. O cérebro lê profundidade como produção cara.",
    comoAplicar: [
      "Construa 3 planos: primeiro plano, sujeito, fundo.",
      "Coloque um objeto desfocado bem perto da lente (primeiro plano).",
      "Afaste o sujeito do fundo pra separar os planos.",
      "Use abertura/retrato do celular pra desfocar o fundo."
    ],
    exemplos: [
      { nome: "Profundidade com primeiro plano", busca: "foreground depth cinematography" },
      { nome: "Blade Runner 2049 — fotografia (Deakins)", busca: "Blade Runner 2049 cinematography analysis" }
    ]
  },
  {
    id: "espaco-respiro",
    categoria: "enquadramento",
    nome: "Espaço de respiro",
    icone: "ti-layout-align-center",
    perspectiva:
      "Espaço sobre a cabeça (headroom) e espaço pra onde a pessoa olha/anda (lead room) deixam a imagem confortável. Apertar demais sufoca; folgar demais perde força.",
    comoAplicar: [
      "Deixe pouco espaço acima da cabeça em close — não corte no meio do queixo nem sobre testa.",
      "Se a pessoa olha pra esquerda, deixe mais espaço à esquerda.",
      "Em movimento, deixe espaço à frente pra onde ela vai.",
      "Quebre a regra de propósito quando quiser tensão ou desconforto."
    ],
    exemplos: [
      { nome: "Headroom e lead room", busca: "headroom and lead room cinematography" }
    ]
  },
  {
    id: "simetria",
    categoria: "enquadramento",
    nome: "Simetria e centralização",
    icone: "ti-layout-distribute-horizontal",
    perspectiva:
      "Centralizar e espelhar os dois lados cria ordem, controle e impacto. É o oposto da regra dos terços — usado de propósito pra um visual forte e 'desenhado'.",
    comoAplicar: [
      "Procure ambientes simétricos: corredores, fachadas, pontes.",
      "Alinhe o centro do sujeito com o centro do quadro.",
      "Mantenha a câmera bem reta (use o nível da câmera do celular).",
      "Quanto mais limpo e organizado o fundo, mais forte o efeito."
    ],
    exemplos: [
      { nome: "Wes Anderson — simetria", busca: "Wes Anderson symmetry" },
      { nome: "Kubrick — simetria", busca: "Kubrick symmetry" }
    ]
  },

  // ---------- ÂNGULOS DE CÂMERA ----------
  {
    id: "nivel-olho",
    categoria: "angulos",
    nome: "Nível do olho",
    icone: "ti-eye",
    perspectiva:
      "Câmera na altura dos olhos é neutra e natural — coloca o espectador de igual pra igual com o sujeito. É a base; os outros ângulos ganham força por contraste com este.",
    comoAplicar: [
      "Suba ou abaixe a câmera até a altura dos olhos da pessoa.",
      "Use pra diálogo, depoimentos e momentos de conexão.",
      "Mantenha estável — é o ângulo onde tremida incomoda mais.",
      "Sirva de 'descanso' entre tomadas mais dramáticas."
    ],
    exemplos: [
      { nome: "Plano à altura do olho", busca: "eye level shot filmmaking" }
    ]
  },
  {
    id: "contre-plongee",
    categoria: "angulos",
    nome: "Plano baixo (contre-plongée)",
    icone: "ti-arrow-up",
    perspectiva:
      "Filmar de baixo pra cima faz o sujeito parecer poderoso, dominante, heroico. O olho lê altura como força.",
    comoAplicar: [
      "Apoie o celular quase no chão, apontando pra cima.",
      "Deixe o céu ou o teto preencher o fundo pra reforçar a grandeza.",
      "Ótimo pra entradas, manobras de esporte e retratos fortes.",
      "Cuidado pra não distorcer demais o rosto em closes."
    ],
    exemplos: [
      { nome: "Plano baixo (low angle) explicado", busca: "low angle shot cinematography" },
      { nome: "Skate filmado do chão", busca: "skateboarding low angle filming" }
    ]
  },
  {
    id: "plongee",
    categoria: "angulos",
    nome: "Plano alto (plongée)",
    icone: "ti-arrow-down",
    perspectiva:
      "Filmar de cima pra baixo encolhe o sujeito — passa fragilidade, vulnerabilidade, solidão, ou dá uma visão de contexto/mapa da cena.",
    comoAplicar: [
      "Suba a câmera acima da linha dos olhos e aponte pra baixo.",
      "Use pra mostrar alguém pequeno num espaço grande.",
      "No topo total (90°, 'plano cenital') vira visão de drone/mesa.",
      "Bom pra abrir uma cena e situar onde tudo acontece."
    ],
    exemplos: [
      { nome: "Plano alto (high angle)", busca: "high angle shot cinematography" },
      { nome: "Plano cenital (overhead / top down)", busca: "overhead top down shot filmmaking" }
    ]
  },
  {
    id: "dutch",
    categoria: "angulos",
    nome: "Plano holandês (inclinado)",
    icone: "ti-angle",
    perspectiva:
      "Inclinar a câmera (horizonte torto) gera desconforto, tensão, caos ou energia. Quebra o equilíbrio de propósito.",
    comoAplicar: [
      "Gire a câmera uns 10–30° pro lado.",
      "Use em momentos de adrenalina, confusão ou estranheza.",
      "Combine com plano baixo pra dobrar a intensidade.",
      "Use com moderação — em excesso cansa e parece erro."
    ],
    exemplos: [
      { nome: "Plano holandês (dutch angle)", busca: "dutch angle shot" }
    ]
  },
  {
    id: "pov",
    categoria: "angulos",
    nome: "POV (ponto de vista)",
    icone: "ti-eyeglass",
    perspectiva:
      "A câmera vira os olhos do personagem — o espectador vê o que ele vê. Cria imersão imediata e coloca a pessoa 'dentro' da ação.",
    comoAplicar: [
      "Segure a câmera na altura e direção do olhar de quem age.",
      "Inclua mãos, guidão, prancha no quadro pra reforçar o 'eu'.",
      "Ótimo pra esporte: andar de skate, correr, pedalar.",
      "Movimento natural do corpo ajuda — não precisa estar perfeito."
    ],
    exemplos: [
      { nome: "GoPro — POV de ação", busca: "GoPro POV action" },
      { nome: "Plano POV no cinema", busca: "POV shot filmmaking" }
    ]
  },
  {
    id: "over-shoulder",
    categoria: "angulos",
    nome: "Sobre o ombro",
    icone: "ti-user",
    perspectiva:
      "Filmar por trás do ombro de alguém coloca o espectador na conversa e mostra a relação entre duas pessoas/objetos. Dá contexto e profundidade ao diálogo.",
    comoAplicar: [
      "Posicione a câmera atrás e ao lado de um ombro.",
      "Deixe o ombro/cabeça desfocado em primeiro plano.",
      "Foque em quem está de frente (o que recebe a atenção).",
      "Alterne entre os dois ombros pra montar um diálogo."
    ],
    exemplos: [
      { nome: "Plano sobre o ombro", busca: "over the shoulder shot" }
    ]
  },

  // ---------- MOVIMENTO DE CÂMERA ----------
  {
    id: "tracking",
    categoria: "movimento",
    nome: "Tracking lateral",
    icone: "ti-arrows-horizontal",
    perspectiva:
      "Acompanhar o sujeito pelo lado, na mesma velocidade, transmite movimento e energia mantendo ele no quadro. O fundo corre e cria sensação de velocidade.",
    comoAplicar: [
      "Ande ou corra paralelo ao sujeito, na mesma velocidade.",
      "Mantenha a distância constante pra ele ficar nítido e estável.",
      "Use algo passando perto da lente pra dar mais velocidade.",
      "Estabilizador (gimbal) ajuda, mas dá pra fazer com braços firmes."
    ],
    exemplos: [
      { nome: "Tracking shot explicado", busca: "tracking shot cinematography" },
      { nome: "Red Bull — esporte em alta velocidade", busca: "Red Bull tracking shot sports" }
    ]
  },
  {
    id: "dolly",
    categoria: "movimento",
    nome: "Dolly in / out",
    icone: "ti-zoom-in",
    perspectiva:
      "Aproximar a câmera (dolly in) intensifica a emoção e foca; afastar (dolly out) revela contexto ou cria solidão. Diferente do zoom: a perspectiva muda de verdade, parece cinema.",
    comoAplicar: [
      "Ande fisicamente em direção ao sujeito (não dê zoom).",
      "Dolly in lento durante uma fala forte aumenta a tensão.",
      "Dolly out no fim de uma cena dá sensação de encerramento.",
      "Movimento bem lento e suave é o segredo."
    ],
    exemplos: [
      { nome: "Dolly in vs zoom", busca: "dolly in vs zoom" }
    ]
  },
  {
    id: "handheld",
    categoria: "movimento",
    nome: "Câmera na mão",
    icone: "ti-hand-stop",
    perspectiva:
      "A tremida leve da mão dá realismo, urgência e presença — como se alguém estivesse ali vivendo o momento. Aproxima o espectador do caos ou da intimidade.",
    comoAplicar: [
      "Segure com as duas mãos, cotovelos junto ao corpo.",
      "Mexa o corpo todo, não só os pulsos, pra tremida ficar orgânica.",
      "Use em ação, documentário e momentos espontâneos.",
      "Evite em cenas calmas — ali a estabilidade comunica melhor."
    ],
    exemplos: [
      { nome: "Bourne — câmera na mão", busca: "Bourne handheld camera style" },
      { nome: "Look de câmera na mão", busca: "handheld camera look" }
    ]
  },
  {
    id: "whip-pan",
    categoria: "movimento",
    nome: "Whip pan",
    icone: "ti-arrow-bounce",
    perspectiva:
      "Um giro rápido da câmera que borra a imagem — usado pra transição energética entre cenas ou pra reagir a algo de repente. Dá ritmo e dinamismo.",
    comoAplicar: [
      "Gire a câmera rápido pro lado no fim de uma tomada.",
      "Comece a próxima tomada com outro giro rápido na mesma direção.",
      "Corte no meio do borrão pra emendar as duas — transição limpa.",
      "Ótimo pra acelerar o ritmo em vlogs e edits de esporte."
    ],
    exemplos: [
      { nome: "Sam Kolder — transições whip pan", busca: "Sam Kolder whip pan transition" }
    ]
  },
  {
    id: "orbit",
    categoria: "movimento",
    nome: "Orbit (giro ao redor)",
    icone: "ti-rotate",
    perspectiva:
      "Girar a câmera em volta do sujeito mostra ele por todos os lados e cria um momento épico, de destaque. Separa o sujeito do fundo, que muda o tempo todo.",
    comoAplicar: [
      "Ande em círculo ao redor da pessoa, mantendo-a centralizada.",
      "Mantenha a mesma distância durante todo o giro.",
      "Velocidade constante e lenta fica mais elegante.",
      "Ótimo pra apresentar alguém ou um objeto/produto."
    ],
    exemplos: [
      { nome: "Orbit shot (giro)", busca: "orbit shot filmmaking" }
    ]
  },
  {
    id: "reveal",
    categoria: "movimento",
    nome: "Revelação (reveal)",
    icone: "ti-eye-check",
    perspectiva:
      "Esconder algo e revelar com o movimento (saindo de trás de um objeto, subindo, ou desfocando pra focar) cria surpresa e controla quando o espectador descobre a informação.",
    comoAplicar: [
      "Comece com algo bloqueando a cena (parede, objeto, costas).",
      "Mova a câmera pra revelar o sujeito por trás disso.",
      "Ou comece desfocado e ajuste o foco pra revelar.",
      "Use pra abrir um vídeo ou apresentar um lugar com impacto."
    ],
    exemplos: [
      { nome: "Reveal shot (revelação)", busca: "reveal shot cinematography" }
    ]
  },

  // ---------- LUZ E COR ----------
  {
    id: "golden-hour",
    categoria: "luz-cor",
    nome: "Golden hour",
    icone: "ti-sunset",
    perspectiva:
      "A primeira hora depois do nascer e a última antes do pôr do sol dão uma luz baixa, dourada e suave. Tudo fica mais bonito, com sombras longas e clima de cinema — quase de graça.",
    comoAplicar: [
      "Filme até ~1h depois do amanhecer ou ~1h antes do anoitecer.",
      "Ponha o sol de lado pra ganhar textura e sombras longas.",
      "Toque na tela pra travar a exposição e não estourar o céu.",
      "Chegue cedo: a luz boa dura pouco e muda rápido."
    ],
    exemplos: [
      { nome: "Golden hour explicado", busca: "golden hour cinematography" },
      { nome: "Como filmar na golden hour", busca: "how to shoot golden hour video" }
    ]
  },
  {
    id: "contraluz",
    categoria: "luz-cor",
    nome: "Contraluz e silhueta",
    icone: "ti-shadow",
    perspectiva:
      "Com a luz vindo de trás do sujeito, você cria um contorno brilhante (rim light) ou uma silhueta total. Dá drama, mistério e separa o sujeito do fundo.",
    comoAplicar: [
      "Posicione a fonte de luz (sol/janela) atrás do sujeito.",
      "Pra silhueta: exponha pelo fundo claro (o sujeito vira preto).",
      "Pra contorno: deixe um pouco de luz preencher a frente.",
      "Use entradas, finais e momentos de impacto."
    ],
    exemplos: [
      { nome: "Contraluz e silhueta", busca: "backlight silhouette cinematography" }
    ]
  },
  {
    id: "luz-qualidade",
    categoria: "luz-cor",
    nome: "Luz dura vs suave",
    icone: "ti-bulb",
    perspectiva:
      "Luz dura (sol a pino, lanterna) faz sombras fortes e marcadas — tensão, contraste. Luz suave (dia nublado, luz difusa) suaviza a pele e o clima. Saber qual usar muda totalmente a sensação.",
    comoAplicar: [
      "Quer suave? Filme na sombra, em dia nublado, ou perto de janela com cortina.",
      "Quer dura? Use sol direto ou uma fonte pequena e distante.",
      "Pra suavizar o sol: ponha a pessoa na sombra de uma parede/árvore.",
      "Observe a borda da sombra: nítida = dura, esfumada = suave."
    ],
    exemplos: [
      { nome: "Luz dura vs suave", busca: "hard light vs soft light" }
    ]
  },
  {
    id: "paleta",
    categoria: "luz-cor",
    nome: "Paleta de cores",
    icone: "ti-palette",
    perspectiva:
      "As cores dominantes contam história: tons quentes (laranja, dourado) passam aconchego e energia; frios (azul, verde) passam calma, frio ou distância. Uma paleta coerente deixa tudo com cara de produção.",
    comoAplicar: [
      "Escolha 2–3 cores que combinem com o clima da cena.",
      "Procure cenários e roupas que repitam essas cores.",
      "Contraste quente x frio pra destacar o sujeito do fundo.",
      "No edit, ajuste a cor (color grading) pra unificar tudo."
    ],
    exemplos: [
      { nome: "Paleta de cores no cinema", busca: "color palette in film" },
      { nome: "Color grading básico", busca: "color grading basics tutorial" }
    ]
  },

  // ---------- ÁUDIO ----------
  {
    id: "som-ambiente",
    categoria: "audio",
    nome: "Som ambiente",
    icone: "ti-wave-sine",
    perspectiva:
      "O som do lugar (vento, rua, passos, natureza) coloca o espectador dentro da cena. Sem ele, a imagem fica 'morta'. É metade da imersão — e a maioria esquece.",
    comoAplicar: [
      "Grave 30s só do ambiente em cada local (o 'wild sound').",
      "Use isso por baixo de tudo no edit pra preencher o silêncio.",
      "Evite vento direto no microfone (proteja com a mão/espuma).",
      "Som bom importa tanto quanto imagem boa."
    ],
    exemplos: [
      { nome: "Som ambiente / wild sound", busca: "ambient sound recording filmmaking" }
    ]
  },
  {
    id: "voz-perto",
    categoria: "audio",
    nome: "Microfone perto",
    icone: "ti-microphone",
    perspectiva:
      "Quanto mais perto o microfone da boca, mais limpa e presente a voz, com menos eco e ruído. Distância é o inimigo nº1 do áudio bom.",
    comoAplicar: [
      "Aproxime o microfone (ou o celular) o máximo possível da fonte.",
      "Em local fechado, fale perto pra evitar eco do ambiente.",
      "Um microfone de lapela barato já resolve 90% dos casos.",
      "Monitore com fone se puder — descobre problema na hora."
    ],
    exemplos: [
      { nome: "Áudio limpo: distância do microfone", busca: "clean audio microphone distance" }
    ]
  },
  {
    id: "trilha",
    categoria: "audio",
    nome: "Trilha e ritmo",
    icone: "ti-music",
    perspectiva:
      "A música define a emoção e o ritmo do vídeo. A batida guia onde cortar e dá energia — escolher a trilha certa muda completamente a sensação do mesmo material.",
    comoAplicar: [
      "Escolha a música antes de editar — ela dita o ritmo.",
      "Corte as imagens na batida pra dar pulso ao vídeo.",
      "Use trilha livre de direitos (evita bloqueio nas plataformas).",
      "Baixe o volume da música quando alguém fala."
    ],
    exemplos: [
      { nome: "Como escolher trilha sonora", busca: "choosing music for video editing" }
    ]
  },
  {
    id: "silencio",
    categoria: "audio",
    nome: "Silêncio e respiro",
    icone: "ti-volume-3",
    perspectiva:
      "Tirar o som de repente (ou deixar um respiro sem música) cria peso, tensão e destaque. O silêncio bem colocado vale mais que qualquer batida.",
    comoAplicar: [
      "Corte a música um instante antes de um momento de impacto.",
      "Deixe respiros sem trilha pra cena não cansar.",
      "Use silêncio antes de uma 'virada' pra criar expectativa.",
      "Mesmo no silêncio, mantenha o som ambiente baixinho."
    ],
    exemplos: [
      { nome: "O poder do silêncio", busca: "using silence in film editing" }
    ]
  },

  // ---------- RITMO E EDIÇÃO ----------
  {
    id: "corte-batida",
    categoria: "edicao",
    nome: "Cortar na batida",
    icone: "ti-cut",
    perspectiva:
      "Sincronizar os cortes com a batida da música dá ritmo e satisfação — o vídeo 'pulsa'. É o que faz edits de esporte e vlog parecerem profissionais.",
    comoAplicar: [
      "Marque as batidas da música na linha do tempo.",
      "Faça os cortes caírem em cima dessas marcas.",
      "Acelere os cortes nos trechos de mais energia.",
      "Varie: nem todo corte precisa ser na batida — senão cansa."
    ],
    exemplos: [
      { nome: "Cortar na batida da música", busca: "editing to the beat tutorial" }
    ]
  },
  {
    id: "cobertura",
    categoria: "edicao",
    nome: "Cobertura (variar planos)",
    icone: "ti-stack-2",
    perspectiva:
      "Gravar a mesma ação em planos diferentes (aberto, médio, detalhe) te dá opções pra editar sem cortes secos. Quem grava pensando na edição sofre muito menos depois.",
    comoAplicar: [
      "De cada momento importante, pegue um plano aberto e um detalhe.",
      "Grave alguns segundos a mais no começo e no fim de cada tomada.",
      "Repita a ação se precisar, mudando o ângulo.",
      "Detalhes (mãos, pés, objetos) salvam a edição e dão ritmo."
    ],
    exemplos: [
      { nome: "Cobertura: planos pra editar", busca: "shot coverage filmmaking" }
    ]
  },
  {
    id: "jump-cut",
    categoria: "edicao",
    nome: "Jump cut",
    icone: "ti-player-skip-forward",
    perspectiva:
      "Cortar os tempos mortos do mesmo plano (a pessoa 'pula' levemente) mantém o vídeo dinâmico e direto. É a base do ritmo de vlog moderno.",
    comoAplicar: [
      "Corte as pausas, gaguejos e tempos parados da fala.",
      "Mantenha só o que prende a atenção.",
      "Disfarce o pulo com um zoom leve ou um B-roll por cima.",
      "Não exagere: ritmo demais vira cansaço."
    ],
    exemplos: [
      { nome: "Jump cut explicado", busca: "jump cut editing explained" }
    ]
  },
  {
    id: "b-roll",
    categoria: "edicao",
    nome: "B-roll (imagens de apoio)",
    icone: "ti-movie",
    perspectiva:
      "B-roll são as imagens de apoio (detalhes, paisagens, ações) que você coloca por cima da narração. Elas ilustram o que é dito, escondem cortes e dão respiro visual.",
    comoAplicar: [
      "Grave bastante detalhe do lugar e da ação, além do principal.",
      "Use o B-roll por cima da voz pra ilustrar o que se fala.",
      "Ele cobre jump cuts e transições de forma natural.",
      "Regra de ouro: grave o dobro de B-roll do que acha que precisa."
    ],
    exemplos: [
      { nome: "Como usar B-roll", busca: "how to use b roll" }
    ]
  },

  // ---------- TRANSIÇÕES ----------
  {
    id: "match-cut",
    categoria: "transicoes",
    nome: "Match cut (corte casado)",
    icone: "ti-transition-right",
    perspectiva:
      "Cortar de uma imagem pra outra parecida (mesma forma, movimento ou cor) emenda duas cenas de forma fluida e inteligente. Liga ideias e impressiona sem efeito nenhum.",
    comoAplicar: [
      "Procure formas parecidas no fim de uma cena e no início da outra.",
      "Ex.: uma roda que vira um sol; um pulo que vira outro pulo.",
      "Alinhe a posição do objeto nos dois planos antes de cortar.",
      "Funciona com forma, cor ou direção do movimento."
    ],
    exemplos: [
      { nome: "Match cut (exemplos)", busca: "match cut examples" }
    ]
  },
  {
    id: "corte-movimento",
    categoria: "transicoes",
    nome: "Corte no movimento",
    icone: "ti-arrows-right",
    perspectiva:
      "Cortar no meio de um movimento (match on action) esconde o corte: o olho segue a ação e nem percebe a troca de plano. É a transição invisível mais usada do cinema.",
    comoAplicar: [
      "Grave a mesma ação em dois ângulos.",
      "Corte no meio do movimento (a mão fechando a porta, o pulo).",
      "Mantenha a direção do movimento igual nos dois planos.",
      "Quanto mais no auge do movimento, mais invisível o corte."
    ],
    exemplos: [
      { nome: "Corte no movimento (match on action)", busca: "match on action editing" }
    ]
  },
  {
    id: "mascara-objeto",
    categoria: "transicoes",
    nome: "Passagem por objeto",
    icone: "ti-layout-sidebar",
    perspectiva:
      "Quando algo passa bem na frente da lente (uma parede, pessoa, poste) e cobre a tela, você corta ali — parece que a cena 'limpou' pra outra. Transição natural e elegante.",
    comoAplicar: [
      "Termine a cena com algo cobrindo toda a tela (passando perto).",
      "Comece a próxima cena com algo saindo da frente da lente.",
      "Corte no instante em que a tela está coberta.",
      "Ótimo pra mudar de local sem corte seco."
    ],
    exemplos: [
      { nome: "Transição passando por objeto", busca: "whip transition object wipe" }
    ]
  },
  {
    id: "fundido",
    categoria: "transicoes",
    nome: "Fundido (dissolve)",
    icone: "ti-contrast-2",
    perspectiva:
      "Misturar uma imagem na outra (cross dissolve) suaviza a passagem e sugere tempo passando, sonho ou lembrança. É calmo — o oposto do corte seco.",
    comoAplicar: [
      "Use pra indicar passagem de tempo ou clima contemplativo.",
      "Mantenha curto (alguns quadros) pra não arrastar.",
      "Evite em cenas de ação rápida — ali o corte seco é melhor.",
      "Fade pra preto/branco no fim dá sensação de encerramento."
    ],
    exemplos: [
      { nome: "Fundido / cross dissolve", busca: "cross dissolve transition" }
    ]
  }
];

// Emoções-alvo (o que o viewer deve sentir numa cena).
window.EMOCOES = [
  { id: "tensao", nome: "Tensão" },
  { id: "poder", nome: "Poder" },
  { id: "vulnerabilidade", nome: "Vulnerabilidade" },
  { id: "euforia", nome: "Euforia" },
  { id: "calma", nome: "Calma" },
  { id: "nostalgia", nome: "Nostalgia" },
  { id: "intimidade", nome: "Intimidade" },
  { id: "caos", nome: "Caos" },
  { id: "misterio", nome: "Mistério" },
  { id: "adrenalina", nome: "Adrenalina" }
];

// Quais técnicas servem cada emoção (sugestões).
window.EMOCAO_TECNICAS = {
  tensao: ["dutch", "contre-plongee", "silencio", "dolly", "contraluz", "reveal"],
  poder: ["contre-plongee", "simetria", "orbit", "golden-hour", "trilha"],
  vulnerabilidade: ["plongee", "espaco-respiro", "luz-qualidade", "silencio"],
  euforia: ["tracking", "whip-pan", "corte-batida", "handheld", "pov"],
  calma: ["nivel-olho", "simetria", "golden-hour", "som-ambiente", "fundido"],
  nostalgia: ["golden-hour", "paleta", "fundido", "silencio", "luz-qualidade"],
  intimidade: ["over-shoulder", "nivel-olho", "profundidade", "voz-perto", "luz-qualidade"],
  caos: ["dutch", "handheld", "whip-pan", "jump-cut"],
  misterio: ["contraluz", "contre-plongee", "dutch", "silencio", "dolly"],
  adrenalina: ["tracking", "pov", "whip-pan", "corte-batida", "handheld"]
};

// Função narrativa de cada cena (e a energia que ela costuma ter, 1–5).
window.FUNCOES = [
  { id: "gancho", nome: "Gancho", energia: 4 },
  { id: "desenvolvimento", nome: "Desenvolvimento", energia: 3 },
  { id: "virada", nome: "Virada", energia: 4 },
  { id: "climax", nome: "Clímax", energia: 5 },
  { id: "respiro", nome: "Respiro", energia: 1 },
  { id: "encerramento", nome: "Encerramento", energia: 2 }
];

// Modelos de arco — criam cenas já com função e uma dica de preenchimento.
window.ESTRUTURAS = [
  {
    id: "classica",
    nome: "Clássica",
    descricao: "Gancho → desenvolvimento → clímax → encerramento",
    cenas: [
      { funcao: "gancho", dica: "Abertura que prende nos primeiros segundos" },
      { funcao: "desenvolvimento", dica: "Constrói o contexto / a ação" },
      { funcao: "desenvolvimento", dica: "Aumenta a intensidade" },
      { funcao: "climax", dica: "O ponto alto — a melhor imagem/momento" },
      { funcao: "encerramento", dica: "Fecha o clima / chamada final" }
    ]
  },
  {
    id: "antes-depois",
    nome: "Antes e depois",
    descricao: "Situação inicial → processo → transformação",
    cenas: [
      { funcao: "gancho", dica: "Mostra o 'antes' / a promessa" },
      { funcao: "desenvolvimento", dica: "O processo / o esforço" },
      { funcao: "desenvolvimento", dica: "Continuação do processo" },
      { funcao: "climax", dica: "A revelação do 'depois'" },
      { funcao: "encerramento", dica: "Reflexão / fechamento" }
    ]
  },
  {
    id: "esporte",
    nome: "Jornada de esporte",
    descricao: "Chegada → aquecimento → ação → clímax → vibe",
    cenas: [
      { funcao: "gancho", dica: "Chegada no local / preparação (cria expectativa)" },
      { funcao: "desenvolvimento", dica: "Aquecimento / primeiras tentativas" },
      { funcao: "virada", dica: "A ação principal acontecendo" },
      { funcao: "climax", dica: "A melhor manobra / o momento épico" },
      { funcao: "respiro", dica: "Desacelera — reação, detalhe, vibe" },
      { funcao: "encerramento", dica: "Encerramento com clima" }
    ]
  },
  {
    id: "dia-a-dia",
    nome: "Dia a dia",
    descricao: "Acordar → rotina → momento alto → fim do dia",
    cenas: [
      { funcao: "gancho", dica: "Abertura do dia — primeira luz, acordar (cria o clima)" },
      { funcao: "desenvolvimento", dica: "Rotina / preparação — detalhes do cotidiano" },
      { funcao: "desenvolvimento", dica: "A atividade principal do dia" },
      { funcao: "climax", dica: "O momento mais marcante do dia" },
      { funcao: "respiro", dica: "Desacelera — pôr do sol, descanso, um detalhe" },
      { funcao: "encerramento", dica: "Fecha o dia / uma reflexão" }
    ]
  },
  {
    id: "viagem",
    nome: "Viagem",
    descricao: "Partida → chegada → imersão → ápice → despedida",
    cenas: [
      { funcao: "gancho", dica: "Partida / expectativa — malas, estrada, mapa" },
      { funcao: "desenvolvimento", dica: "Chegada e primeiras descobertas do lugar" },
      { funcao: "desenvolvimento", dica: "Imersão — pessoas, comida, cultura, detalhes" },
      { funcao: "climax", dica: "O ápice — a paisagem ou experiência inesquecível" },
      { funcao: "respiro", dica: "Um momento contemplativo" },
      { funcao: "encerramento", dica: "Despedida — o que ficou de você ali" }
    ]
  },
  {
    id: "tutorial",
    nome: "Tutorial / como fazer",
    descricao: "Promessa → materiais → passo a passo → resultado",
    cenas: [
      { funcao: "gancho", dica: "A promessa — mostre o resultado final logo de cara" },
      { funcao: "desenvolvimento", dica: "O que vai precisar — materiais / preparação" },
      { funcao: "desenvolvimento", dica: "Passo a passo — as etapas principais" },
      { funcao: "virada", dica: "O segredo / a dica que faz diferença" },
      { funcao: "climax", dica: "O resultado pronto em destaque" },
      { funcao: "encerramento", dica: "Recapitula / chamada pra ação" }
    ]
  },
  {
    id: "mini-doc",
    nome: "Mini-documentário",
    descricao: "Gancho → contexto → conflito → superação → sentido",
    cenas: [
      { funcao: "gancho", dica: "Abertura intrigante — uma pergunta ou imagem forte" },
      { funcao: "desenvolvimento", dica: "Contexto — quem, o quê, onde" },
      { funcao: "virada", dica: "O conflito / o desafio central" },
      { funcao: "climax", dica: "O momento de superação ou revelação" },
      { funcao: "respiro", dica: "Reflexão sobre o que aconteceu" },
      { funcao: "encerramento", dica: "A lição / o sentido de tudo" }
    ]
  },
  {
    id: "reels",
    nome: "Reels rápido",
    descricao: "Gancho de 1s → entrega direta → fecho/loop",
    cenas: [
      { funcao: "gancho", dica: "O primeiro segundo que prende — a promessa ou o choque" },
      { funcao: "desenvolvimento", dica: "Entrega direta — o conteúdo, sem enrolação" },
      { funcao: "climax", dica: "O ponto alto / a virada de chave" },
      { funcao: "encerramento", dica: "Fecho rápido / loop / chamada" }
    ]
  },
  {
    id: "lista",
    nome: "Lista / montagem temática",
    descricao: "Intro → itens em ritmo → o melhor no fim",
    cenas: [
      { funcao: "gancho", dica: "Intro — o tema da lista / a promessa" },
      { funcao: "desenvolvimento", dica: "Item 1 — o primeiro destaque" },
      { funcao: "desenvolvimento", dica: "Itens do meio — mantenha o mesmo ritmo" },
      { funcao: "climax", dica: "O melhor item / o número 1" },
      { funcao: "encerramento", dica: "Fecho / chamada" }
    ]
  },
  {
    id: "contraste",
    nome: "Contraste / dois mundos",
    descricao: "Mundo A → transição → mundo B → síntese",
    cenas: [
      { funcao: "gancho", dica: "Mundo A — uma realidade ou estado" },
      { funcao: "desenvolvimento", dica: "Aprofunda o mundo A" },
      { funcao: "virada", dica: "A transição — o corte para o mundo B" },
      { funcao: "desenvolvimento", dica: "Mundo B — o contraste" },
      { funcao: "climax", dica: "O choque / a síntese entre os dois" },
      { funcao: "encerramento", dica: "O que o contraste revela" }
    ]
  }
];
