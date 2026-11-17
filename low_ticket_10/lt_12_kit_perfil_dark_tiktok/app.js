(function () {
  "use strict";

  var PIX_KEY = "vudotsur@gmail.com";
  var MERCHANT_NAME = "FELIPE LINARES";
  var MERCHANT_CITY = "LONDRINA";
  var TXID = "LT12";
  var DEFAULT_BASE_PRICE = 29.90;
  var CHANNEL_DISCOUNT_PRICE = 19.90;
  var BUMP_PRICE = 14.90;
  var ALLOWED_PRICES = Object.freeze([19.90, 29.90, 14.90]);
  var CHANNEL_COUPON_SOURCES = Object.freeze(["shorts", "kwai", "reels"]);

  function isAllowedPrice(val) {
    var num = Number(Number(val).toFixed(2));
    return ALLOWED_PRICES.indexOf(num) !== -1;
  }

  function resolveChannelOffer(searchQuery) {
    var params = new URLSearchParams(searchQuery || "");
    var rawSrc = (params.get("src") || "").trim().toLowerCase();
    var hasCoupon = CHANNEL_COUPON_SOURCES.indexOf(rawSrc) !== -1;
    var candidateBase = hasCoupon ? CHANNEL_DISCOUNT_PRICE : DEFAULT_BASE_PRICE;
    var safeBase = isAllowedPrice(candidateBase) ? candidateBase : DEFAULT_BASE_PRICE;
    var safeBump = isAllowedPrice(BUMP_PRICE) ? BUMP_PRICE : 14.90;
    return {
      src: hasCoupon ? rawSrc : "",
      hasChannelOffer: hasCoupon && safeBase === CHANNEL_DISCOUNT_PRICE,
      basePrice: safeBase,
      bumpPrice: safeBump
    };
  }

  var channelOffer = resolveChannelOffer(
    typeof window !== "undefined" && window.location ? window.location.search : ""
  );
  var BASE_PRICE = channelOffer.basePrice;

  // --- EMVCo Pix BR Code Generator ---
  function tlv(id, value) {
    return id + String(value.length).padStart(2, "0") + value;
  }

  function crc16ccitt(str) {
    var crc = 0xFFFF;
    for (var i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (var j = 0; j < 8; j++) {
        crc = (crc & 0x8000) ? (((crc << 1) ^ 0x1021) & 0xFFFF) : ((crc << 1) & 0xFFFF);
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
  }

  function buildBrCode(amountNum) {
    var mai = tlv("26", tlv("00", "br.gov.bcb.pix") + tlv("01", PIX_KEY));
    var payload =
      tlv("00", "01") +
      mai +
      tlv("52", "0000") +
      tlv("53", "986") +
      tlv("54", amountNum.toFixed(2)) +
      tlv("58", "BR") +
      tlv("59", MERCHANT_NAME) +
      tlv("60", MERCHANT_CITY) +
      tlv("62", tlv("05", TXID)) +
      "6304";
    return payload + crc16ccitt(payload);
  }

  // --- Pure-JS SVG QR Code Generator (Byte-Mode, Reed-Solomon) ---
  var QR_PARAMS = {
    1: { size: 21, dataBytes: 19, eccPerBlock: 7, blocks: [19], align: [] },
    2: { size: 25, dataBytes: 34, eccPerBlock: 10, blocks: [34], align: [6, 18] },
    3: { size: 29, dataBytes: 55, eccPerBlock: 15, blocks: [55], align: [6, 22] },
    4: { size: 33, dataBytes: 80, eccPerBlock: 20, blocks: [80], align: [6, 26] },
    5: { size: 37, dataBytes: 108, eccPerBlock: 26, blocks: [108], align: [6, 30] },
    6: { size: 41, dataBytes: 136, eccPerBlock: 18, blocks: [68, 68], align: [6, 34] },
    7: { size: 45, dataBytes: 156, eccPerBlock: 20, blocks: [78, 78], align: [6, 22, 38] },
    8: { size: 49, dataBytes: 194, eccPerBlock: 24, blocks: [97, 97], align: [6, 24, 42] },
    9: { size: 53, dataBytes: 232, eccPerBlock: 30, blocks: [116, 116], align: [6, 26, 46] },
    10: { size: 57, dataBytes: 274, eccPerBlock: 18, blocks: [68, 68, 69, 69], align: [6, 28, 50] }
  };

  var GF_EXP = new Uint8Array(512), GF_LOG = new Uint8Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      GF_EXP[i] = x;
      GF_LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11D;
    }
    for (var j = 255; j < 512; j++) GF_EXP[j] = GF_EXP[j - 255];
  })();

  function gfMul(a, b) {
    return (a === 0 || b === 0) ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]];
  }

  function rsEncode(data, eccLen) {
    var poly = [1];
    for (var i = 0; i < eccLen; i++) {
      var next = new Array(poly.length + 1).fill(0);
      for (var j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMul(poly[j], GF_EXP[i]);
      }
      poly = next;
    }
    var res = new Uint8Array(data.length + eccLen);
    res.set(data);
    for (var k = 0; k < data.length; k++) {
      var coef = res[k];
      if (coef !== 0) {
        for (var m = 0; m < poly.length; m++) res[k + m] ^= gfMul(poly[m], coef);
      }
    }
    return Array.from(res.slice(data.length));
  }

  function encodeQRMatrix(text) {
    var bytes = [];
    for (var i = 0; i < text.length; i++) bytes.push(text.charCodeAt(i) & 0xFF);
    var ver = 1;
    while (ver <= 10) {
      if ((4 + (ver < 10 ? 8 : 16)) + bytes.length * 8 <= QR_PARAMS[ver].dataBytes * 8) break;
      ver++;
    }
    if (ver > 10) ver = 10;
    var p = QR_PARAMS[ver], bits = [];
    function pushBits(val, len) {
      for (var b = len - 1; b >= 0; b--) bits.push((val >> b) & 1);
    }
    pushBits(4, 4);
    pushBits(bytes.length, ver < 10 ? 8 : 16);
    for (var k = 0; k < bytes.length; k++) pushBits(bytes[k], 8);
    var maxBits = p.dataBytes * 8;
    for (var t = 0; t < 4 && bits.length < maxBits; t++) bits.push(0);
    while (bits.length % 8 !== 0) bits.push(0);
    var padIdx = 0;
    while (bits.length < maxBits) {
      pushBits(padIdx % 2 === 0 ? 0xEC : 0x11, 8);
      padIdx++;
    }
    var dataCodewords = [];
    for (var d = 0; d < bits.length; d += 8) {
      var bv = 0;
      for (var b2 = 0; b2 < 8; b2++) bv = (bv << 1) | bits[d + b2];
      dataCodewords.push(bv);
    }
    var dataBlocks = [], eccBlocks = [], offset = 0;
    for (var blk = 0; blk < p.blocks.length; blk++) {
      var len = p.blocks[blk], slice = dataCodewords.slice(offset, offset + len);
      offset += len;
      dataBlocks.push(slice);
      eccBlocks.push(rsEncode(slice, p.eccPerBlock));
    }
    var interleaved = [], maxDataLen = Math.max.apply(null, p.blocks);
    for (var c = 0; c < maxDataLen; c++) {
      for (var blk2 = 0; blk2 < dataBlocks.length; blk2++) {
        if (c < dataBlocks[blk2].length) interleaved.push(dataBlocks[blk2][c]);
      }
    }
    for (var e = 0; e < p.eccPerBlock; e++) {
      for (var blk3 = 0; blk3 < eccBlocks.length; blk3++) {
        interleaved.push(eccBlocks[blk3][e]);
      }
    }
    var n = p.size, mat = Array.from({ length: n }, function () { return new Int8Array(n); }), isFunc = Array.from({ length: n }, function () { return new Uint8Array(n); });
    function setFunc(r, col, val) {
      mat[r][col] = val ? 1 : 0;
      isFunc[r][col] = 1;
    }
    function drawFinder(r0, c0) {
      for (var dr = -1; dr <= 7; dr++) {
        for (var dc = -1; dc <= 7; dc++) {
          var r = r0 + dr, col = c0 + dc;
          if (r < 0 || r >= n || col < 0 || col >= n) continue;
          setFunc(r, col, (dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6) && (dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4)));
        }
      }
    }
    drawFinder(0, 0);
    drawFinder(0, n - 7);
    drawFinder(n - 7, 0);
    for (var i2 = 8; i2 < n - 8; i2++) {
      setFunc(6, i2, i2 % 2 === 0);
      setFunc(i2, 6, i2 % 2 === 0);
    }
    for (var ar = 0; ar < p.align.length; ar++) {
      for (var ac = 0; ac < p.align.length; ac++) {
        var rc = p.align[ar], cc = p.align[ac];
        if (isFunc[rc][cc]) continue;
        for (var dr2 = -2; dr2 <= 2; dr2++) {
          for (var dc2 = -2; dc2 <= 2; dc2++) {
            setFunc(rc + dr2, cc + dc2, Math.max(Math.abs(dr2), Math.abs(dc2)) !== 1);
          }
        }
      }
    }
    setFunc(n - 8, 8, true);
    for (var f = 0; f < 9; f++) if (f !== 6) { isFunc[8][f] = 1; isFunc[f][8] = 1; }
    for (var f2 = 0; f2 < 8; f2++) { isFunc[8][n - 1 - f2] = 1; isFunc[n - 1 - f2][8] = 1; }
    if (ver >= 7) {
      var rem = ver;
      for (var vb = 0; vb < 12; vb++) rem = (rem << 1) ^ ((rem >> 11) * 0x1F25);
      var verBits = (ver << 12) | rem;
      for (var vi = 0; vi < 18; vi++) {
        var bit = ((verBits >> vi) & 1) === 1, a = Math.floor(vi / 3), b3 = n - 11 + (vi % 3);
        setFunc(a, b3, bit);
        setFunc(b3, a, bit);
      }
    }
    var bitStream = [];
    for (var ib = 0; ib < interleaved.length; ib++) {
      for (var s = 7; s >= 0; s--) bitStream.push((interleaved[ib] >> s) & 1);
    }
    var bitIdx = 0, up = true;
    for (var right = n - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < n; vert++) {
        var row = up ? n - 1 - vert : vert;
        for (var lr = 0; lr < 2; lr++) {
          var col2 = right - lr;
          if (!isFunc[row][col2]) mat[row][col2] = bitIdx < bitStream.length ? bitStream[bitIdx++] : 0;
        }
      }
      up = !up;
    }
    function applyFormat(grid, mask) {
      var data = (1 << 3) | mask, r = data;
      for (var i3 = 0; i3 < 10; i3++) r = (r << 1) ^ ((r >> 9) * 0x537);
      var fmt = ((data << 10) | r) ^ 0x5412;
      for (var i4 = 0; i4 <= 5; i4++) grid[8][i4] = (fmt >> i4) & 1;
      grid[8][7] = (fmt >> 6) & 1;
      grid[8][8] = (fmt >> 7) & 1;
      grid[7][8] = (fmt >> 8) & 1;
      for (var i5 = 9; i5 < 15; i5++) grid[14 - i5][8] = (fmt >> i5) & 1;
      for (var i6 = 0; i6 < 8; i6++) grid[n - 1 - i6][8] = (fmt >> i6) & 1;
      for (var i7 = 8; i7 < 15; i7++) grid[8][n - 15 + i7] = (fmt >> i7) & 1;
    }
    function maskCond(m, r, c) {
      switch (m) {
        case 0: return (r + c) % 2 === 0;
        case 1: return r % 2 === 0;
        case 2: return c % 3 === 0;
        case 3: return (r + c) % 3 === 0;
        case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
        case 5: return ((r * c) % 2 + (r * c) % 3) === 0;
        case 6: return (((r * c) % 2 + (r * c) % 3) % 2) === 0;
        default: return (((r + c) % 2 + (r * c) % 3) % 2) === 0;
      }
    }
    function penalty(grid) {
      var score = 0;
      for (var r = 0; r < n; r++) {
        var rH = 1, rV = 1;
        for (var c = 1; c < n; c++) {
          if (grid[r][c] === grid[r][c - 1]) rH++;
          else {
            if (rH >= 5) score += 3 + (rH - 5);
            rH = 1;
          }
          if (grid[c][r] === grid[c - 1][r]) rV++;
          else {
            if (rV >= 5) score += 3 + (rV - 5);
            rV = 1;
          }
        }
        if (rH >= 5) score += 3 + (rH - 5);
        if (rV >= 5) score += 3 + (rV - 5);
      }
      for (var r2 = 0; r2 < n - 1; r2++) {
        for (var c2 = 0; c2 < n - 1; c2++) {
          var v = grid[r2][c2];
          if (v === grid[r2][c2 + 1] && v === grid[r2 + 1][c2] && v === grid[r2 + 1][c2 + 1]) score += 3;
        }
      }
      return score;
    }
    var bestGrid = null, bestScore = Infinity;
    for (var m = 0; m < 8; m++) {
      var cand = mat.map(function (row) { return new Int8Array(row); });
      for (var r3 = 0; r3 < n; r3++) {
        for (var c3 = 0; c3 < n; c3++) {
          if (!isFunc[r3][c3] && maskCond(m, r3, c3)) cand[r3][c3] ^= 1;
        }
      }
      applyFormat(cand, m);
      var sc = penalty(cand);
      if (sc < bestScore) {
        bestScore = sc;
        bestGrid = cand;
      }
    }
    return bestGrid;
  }

  function renderQRSvg(container, text) {
    var grid = encodeQRMatrix(text), n = grid.length, quiet = 2, total = n + quiet * 2;
    var svgNS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 " + total + " " + total);
    svg.setAttribute("width", "192");
    svg.setAttribute("height", "192");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "QR Code Pix");

    var bg = document.createElementNS(svgNS, "rect");
    bg.setAttribute("width", String(total));
    bg.setAttribute("height", String(total));
    bg.setAttribute("fill", "#ffffff");
    svg.appendChild(bg);

    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (grid[r][c] === 1) {
          var rect = document.createElementNS(svgNS, "rect");
          rect.setAttribute("x", String(c + quiet));
          rect.setAttribute("y", String(r + quiet));
          rect.setAttribute("width", "1");
          rect.setAttribute("height", "1");
          rect.setAttribute("fill", "#0f172a");
          svg.appendChild(rect);
        }
      }
    }
    container.replaceChildren(svg);
  }

  function formatMoney(num) {
    return "R$ " + num.toFixed(2).replace(".", ",");
  }

  // --- Interactive Preview Simulator ---
  var PREVIEWS = {
    economia: {
      hook: "\"Você gasta R$ 300 a mais no mercado todo mês por causa desse único erro no corredor.\"",
      prompt: "Cena vertical 9:16, iluminação limpa de supermercado brasileiro, close em carrinho com etiquetas de preço em destaque, legenda amarela centralizada em fonte forte, estilo realista, sem texto borrado."
    },
    curiosidades: {
      hook: "\"Por que os aviões sempre deixam as janelas abertas na hora do pouso? Quase ninguém sabe.\"",
      prompt: "Cena vertical 9:16, vista interna de janela de avião ao pôr do sol, contraste cinematográfico escuro, foco nítido na asa, espaço livre no centro para legenda grande amarela."
    },
    achadinhos: {
      hook: "\"Essa mini seladora de R$ 19 resolve um problema chato que todo mundo tem na cozinha.\"",
      prompt: "Cena vertical 9:16, bancada de cozinha moderna organizada, close de mãos fechando pacote de biscoito com mini seladora portátil, luz natural nítida, estilo vídeo curto de achadinhos."
    }
  };

  var simNicheEl = document.getElementById("sim-niche");
  var simFreqEl = document.getElementById("sim-freq");
  var previewHookEl = document.getElementById("preview-hook");
  var previewPromptEl = document.getElementById("preview-prompt");
  var previewPaceEl = document.getElementById("preview-pace");

  function updatePreview() {
    var niche = simNicheEl ? simNicheEl.value : "economia";
    var freq = simFreqEl ? parseInt(simFreqEl.value, 10) || 1 : 1;
    var item = PREVIEWS[niche] || PREVIEWS.economia;
    if (previewHookEl) previewHookEl.textContent = item.hook;
    if (previewPromptEl) previewPromptEl.textContent = item.prompt;
    if (previewPaceEl) {
      var daysCovered = Math.floor(60 / freq);
      previewPaceEl.textContent = "Com 60 roteiros prontos postando " + freq + " vídeo(s) por dia, você tem " + daysCovered + " dias inteiros de conteúdo garantido sem precisar pensar no que gravar.";
    }
  }

  if (simNicheEl) simNicheEl.addEventListener("change", updatePreview);
  if (simFreqEl) simFreqEl.addEventListener("change", updatePreview);
  updatePreview();

  // --- Deliverable Builders ---
  function buildDeliverableTxt(includeBump) {
    var lines = [
      "=======================================================================",
      "KIT PERFIL DARK NO TIKTOK: 60 ROTEIROS, PROMPTS E PLANO DE 7 DIAS",
      "=======================================================================",
      "",
      "PARTE 1: PLANO DE EXECUCAO DE 7 DIAS (PASSO A PASSO SEM APARECER)",
      "-----------------------------------------------------------------------",
      "Dia 1 - Configuracao Segura do Perfil: Escolha 1 unico nicho (Economia, Curiosidades ou Achadinhos), crie nome facil de lembrar e foto de perfil limpa sem poluição.",
      "Dia 2 - Aquecimento Organico: Assista 15 minutos de videos do seu nicho, curta e comente como pessoa real antes de publicar.",
      "Dia 3 - Primeiros 2 Videos no Ar: Use os Roteiros #01 e #21 abaixo, marque 'Conteudo gerado por IA' se usar voz/imagem sintetica e publique com intervalo de 6 horas.",
      "Dia 4 - Analise de Retencao (3 Segundos): Veja quantas pessoas ficaram apos os primeiros 3 segundos; se ficou abaixo de 40%, troque apenas a primeira frase.",
      "Dia 5 - Comentario Fixado Estrategico: Fixe um comentario curto em cada video pedindo uma palavra-chave (ex: 'Comenta QUERO que te mando o guia').",
      "Dia 6 - Sequencia de Oferta: Poste 1 video utilitario + 1 video com chamada direta para o link do perfil.",
      "Dia 7 - Escala Sem Bloqueio: Mantenha ritmo de 1 a 2 videos por dia nos horarios de pico (12h e 19h) e responda comentarios nos primeiros 30 minutos.",
      "",
      "PARTE 2: PROMPTS PRONTOS DE VIDEO E NARRACAO (COPIAR E COLAR)",
      "-----------------------------------------------------------------------",
      "[PROMPT DE CENA 9:16 - ECONOMIA]: Cena vertical 9:16, iluminacao natural nitida, bancada brasileira com notas de real e caderno de anotacoes, foco fechado, espaco livre no centro para legenda amarela.",
      "[PROMPT DE CENA 9:16 - CURIOSIDADES]: Cena vertical 9:16, estilo documentario cinematografico, iluminacao dramatica em tons escuros, objeto central em alta definicao, sem texto na imagem.",
      "[PROMPT DE CENA 9:16 - ACHADINHOS]: Cena vertical 9:16, cozinha ou escritorio organizado, luz clara de dia, demonstracao pratica de objeto utilitario sobre mesa limpa.",
      "[PROMPT DE ROTEIRO EXTRA]: Escreva um roteiro de 25 segundos em portugues do Brasil para TikTok sem aparecer sobre [TEMA]. Comece com um gancho de 3 segundos que quebre a curiosidade, agite um problema diario em 2 frases, entregue 1 solucao pratica e feche pedindo para comentar uma palavra-chave.",
      "",
      "PARTE 3: 60 ROTEIROS PRONTOS (GANCHO 0-3s + MEIO + CHAMADA)",
      "-----------------------------------------------------------------------"
    ];

    var temasEconomia = [
      "3 tarifas escondidas que o banco cobra sem você notar",
      "O erro no corredor do supermercado que encarece sua compra em 25%",
      "Como sobrar R$ 200 no mês cortando assinaturas fantasmas",
      "Por que parcelar compras pequenas no cartão destrói seu mês",
      "A regra dos 10 segundos antes de passar o Pix no shopping",
      "Como comparar preço por quilo no mercado em 5 segundos",
      "O horário secreto em que padarias e hortifrútis baixam o preço",
      "Por que guardar dinheiro na conta corrente faz você gastar sem ver",
      "Como montar uma reserva de emergência começando com R$ 20",
      "3 alimentos que custam o dobro só por causa da embalagem",
      "O jeito certo de usar o cartão sem cair no rotativo",
      "Como economizar energia elétrica no chuveiro sem passar frio",
      "Por que você nunca deve ir ao mercado com fome ou sem lista",
      "Como renegociar dívida antiga pagando só o que cabe no bolso",
      "A diferença entre querer agora e precisar de verdade",
      "Como controlar gastos pequenos do dia a dia (café, lanche, entrega)",
      "3 coisas que parecem baratas mas custam caro no fim do ano",
      "Como fazer o salário render até o último dia do mês",
      "O truque da lista fechada para não cair em promoção falsa",
      "Como separar dinheiro fixo de dinheiro livre em 2 minutos"
    ];
    for (var i = 0; i < temasEconomia.length; i++) {
      var num1 = String(i + 1).padStart(2, "0");
      lines.push("Roteiro #" + num1 + " [Economia]: Gancho (0-3s): 'Pare agora se você ainda faz isso com seu dinheiro: " + temasEconomia[i] + ".' | Meio: Mostre o problema real em 2 frases diretas e dê 1 passo prático. | CTA: 'Salva esse vídeo e comenta GUIA que eu te mando o passo a passo.'");
    }

    var temasCuriosidades = [
      "Por que as janelas do avião têm um furinho minúsculo embaixo",
      "O motivo real de os supermercados nunca terem relógio na parede",
      "Por que o sinal vermelho sempre parece durar mais que o verde",
      "O que acontece no seu cérebro nos primeiros 3 segundos de um vídeo",
      "Por que a pipoca do cinema tem um cheiro diferente da de casa",
      "O motivo pelo qual preços sempre terminam em 90 ou 99 centavos",
      "Por que a porta do micro-ondas tem uma grade preta furadinha",
      "De onde veio o costume de dizer saúde quando alguém espirra",
      "Por que a água do mar é salgada e a do rio não é",
      "O truque visual que faz prédios parecerem maiores por fora",
      "Por que sentimos mais sono depois do almoço",
      "O motivo real de os botões da camisa masculina ficarem de um lado",
      "Por que o gelo flutua na água se é feito da mesma coisa",
      "O que significa aquela luzinha laranja que acende no celular",
      "Por que o céu muda de cor exatamente no fim da tarde",
      "O motivo de o teclado não seguir a ordem alfabética A-B-C",
      "Por que lembramos de músicas antigas mas esquecemos o que almoçamos",
      "O segredo por trás das cores vermelha e amarela em lanchonetes",
      "Por que o som da sua própria voz parece estranho em áudio",
      "O motivo de existirem ranhuras nas laterais das moedas"
    ];
    for (var j = 0; j < temasCuriosidades.length; j++) {
      var num2 = String(j + 21).padStart(2, "0");
      lines.push("Roteiro #" + num2 + " [Curiosidades]: Gancho (0-3s): 'Quase ninguém sabe disso, mas: " + temasCuriosidades[j] + ".' | Meio: Explique a causa em linguagem simples em 15 segundos com legenda grande. | CTA: 'Você já sabia disso? Comenta SIM ou NÃO aqui embaixo e segue o perfil.'");
    }

    var temasAchadinhos = [
      "Mini seladora térmica para não murchar pacote aberto",
      "Suporte articulado de celular para gravar ou trabalhar sem dor no pescoço",
      "Organizador de cabos para acabar com a bagunça atrás da mesa",
      "Escova elétrica giratória para limpar rejunte sem esforço",
      "Dispenser automático de sabão para pia da cozinha",
      "Luminária de sensor para armário e corredor escuro",
      "Mini processador portátil sem fio para alho e temperos",
      "Tapete superabsorvente que seca os pés em segundos",
      "Kit de potes herméticos empilháveis para geladeira",
      "Aspirador portátil recarregável para carro e teclado",
      "Espelho dobrável com luz para maquiagem ou barba",
      "Balança digital de bolso para mala de viagem e cozinha",
      "Suporte magnético de facas para liberar espaço na bancada",
      "Capa impermeável reutilizável para tênis em dia de chuva",
      "Mini umidificador silencioso para mesa de trabalho",
      "Cortador múltiplo de legumes com trava de segurança",
      "Organizador retrátil de gaveta para talheres e meias",
      "Fita dupla face lavável de alta fixação para parede",
      "Carregador múltiplo com proteção contra pico de energia",
      "Garrafa térmica com indicador de temperatura na tampa"
    ];
    for (var k = 0; k < temasAchadinhos.length; k++) {
      var num3 = String(k + 41).padStart(2, "0");
      lines.push("Roteiro #" + num3 + " [Achadinhos]: Gancho (0-3s): 'Se você ainda sofre com isso em casa, olha o que resolve: " + temasAchadinhos[k] + ".' | Meio: Mostre o antes e depois em 12 segundos sem enrolação. | CTA: 'Quer o link direto? Comenta QUERO aqui nos comentários ou acesse a bio.'");
    }

    if (includeBump) {
      lines.push("");
      lines.push("=======================================================================");
      lines.push("BONUS ORDER BUMP: 30 GANCHOS DE 3 SEGUNDOS PARA TRAVAR A ROLAGEM");
      lines.push("=======================================================================");
      var ganchosBonus = [
        "01. Pare tudo o que você está fazendo e olhe isso antes de gastar dinheiro hoje.",
        "02. Ninguém te contou isso, mas você está perdendo tempo fazendo do jeito antigo.",
        "03. Eu testei por 7 dias para você não precisar gastar à toa.",
        "04. Três sinais claros de que você precisa mudar isso ainda hoje.",
        "05. O erro número 1 que trava 90% de quem está começando.",
        "06. Se eu soubesse disso há 1 ano, teria economizado muito.",
        "07. Não passe esse vídeo se você quer resolver isso em 5 minutos.",
        "08. Olha a diferença entre o jeito comum e o jeito certo.",
        "09. Isso parece simples, mas muda completamente o resultado final.",
        "10. Você também faz isso todo dia sem perceber?",
        "11. A verdade que quase ninguém fala sobre começar sem aparecer.",
        "12. Três passos rápidos que cabem em menos de 15 minutos por dia.",
        "13. Guarde esse vídeo porque você vai precisar disso esta semana.",
        "14. Antes de comprar qualquer coisa parecida, veja esse detalhe.",
        "15. Como fazer do jeito prático gastando quase zero.",
        "16. O segredo está nos primeiros 3 segundos — preste atenção aqui.",
        "17. Muita gente desiste exatamente nessa etapa por falta desse ajuste.",
        "18. Olha o que acontece quando você aplica isso por 7 dias seguidos.",
        "19. Pare de complicar o que pode ser feito em três cliques.",
        "20. Esse é o atalho mais seguro para quem não quer mostrar o rosto.",
        "21. Duas coisas que você deve cortar hoje mesmo da sua rotina.",
        "22. Funciona no celular mesmo sem computador caro.",
        "23. Quanto custa ignorar esse detalhe no fim do mês?",
        "24. Veja até o final porque a terceira dica é a que mais dá resultado.",
        "25. Você não precisa de mil seguidores para começar a testar isso.",
        "26. O método simples de 3 partes para nunca mais ficar sem ideia.",
        "27. Se você travou na frente da tela hoje, use exatamente essa frase.",
        "28. De zero a primeira publicação em menos de uma tarde.",
        "29. Isso aqui vale mais do que muito curso caro que tem por aí.",
        "30. Comenta a palavra-chave aqui embaixo para receber o guia completo."
      ];
      for (var g = 0; g < ganchosBonus.length; g++) {
        lines.push(ganchosBonus[g]);
      }
    }

    return lines.join("\n");
  }

  function buildDeliverableCsv(includeBump) {
    var rows = [
      "Dia,Roteiro_ID,Nicho,Gancho_3s,Status,Views_3s,Comentarios,Vendas_Pix"
    ];
    for (var d = 1; d <= 60; d++) {
      var dia = "Dia " + Math.ceil(d / 2);
      var nid = "R" + String(d).padStart(2, "0");
      var nicho = d <= 20 ? "Economia" : (d <= 40 ? "Curiosidades" : "Achadinhos");
      rows.push(dia + "," + nid + "," + nicho + ",Gancho do Roteiro " + nid + ",Pendente,0,0,0");
    }
    if (includeBump) {
      rows.push("");
      rows.push("Bonus_ID,Categoria,Gancho_Extra_3s,Taxa_Retencao_Alvo");
      rows.push("B01,Quebra de Padrao,Pare tudo e olhe isso antes de gastar hoje,>45%");
      rows.push("B02,Prova Pratica,Eu testei por 7 dias para voce nao perder tempo,>45%");
      rows.push("B03,Erro Comum,O erro numero 1 que trava quem esta comecando,>50%");
    }
    return rows.join("\n");
  }

  // --- Modal & Pix Logic ---
  var modal = document.getElementById("pix-modal");
  var modalClose = document.getElementById("modal-close");
  var orderBumpEl = document.getElementById("order-bump");
  var modalTotalEl = document.getElementById("modal-total");
  var qrContainer = document.getElementById("qr-container");
  var copyBrBtn = document.getElementById("copy-brcode");
  var copyKeyBtn = document.getElementById("copy-pixkey");
  var btnDownloadTxt = document.getElementById("btn-download-txt");
  var btnDownloadCsv = document.getElementById("btn-download-csv");

  var currentBrCode = "";

  function refreshPixState() {
    var isBump = Boolean(orderBumpEl && orderBumpEl.checked);
    var safeBase = isAllowedPrice(BASE_PRICE) ? BASE_PRICE : DEFAULT_BASE_PRICE;
    var safeBump = isAllowedPrice(BUMP_PRICE) ? BUMP_PRICE : 14.90;
    var total = Number((safeBase + (isBump ? safeBump : 0)).toFixed(2));
    if (modalTotalEl) {
      modalTotalEl.textContent = formatMoney(total);
    }
    currentBrCode = buildBrCode(total);
    if (qrContainer) {
      renderQRSvg(qrContainer, currentBrCode);
    }
  }

  function applyChannelOfferToDom() {
    if (!channelOffer.hasChannelOffer) return;
    var bannerEl = document.getElementById("channel-offer-banner");
    var noteEl = document.getElementById("channel-offer-note");
    var modalBadgeEl = document.getElementById("modal-channel-badge");
    var heroOldEl = document.getElementById("hero-price-old");
    var heroCurrentEl = document.getElementById("hero-price-current");
    var ctaHeroEl = document.getElementById("cta-hero");
    var ctaMidEl = document.getElementById("cta-mid");
    var faqPriceEl = document.getElementById("faq-price-amount");

    var discountStr = formatMoney(channelOffer.basePrice);
    var originalStr = formatMoney(DEFAULT_BASE_PRICE);
    var offerHeadline = "Oferta Especial do Canal: De " + originalStr + " por " + discountStr;

    if (bannerEl) {
      bannerEl.textContent = offerHeadline;
      bannerEl.classList.remove("hidden");
    }
    if (noteEl) {
      noteEl.classList.remove("hidden");
    }
    if (modalBadgeEl) {
      modalBadgeEl.textContent = offerHeadline;
      modalBadgeEl.classList.remove("hidden");
    }
    if (heroOldEl) heroOldEl.textContent = "De " + originalStr;
    if (heroCurrentEl) heroCurrentEl.textContent = discountStr;
    if (ctaHeroEl) ctaHeroEl.textContent = "Quero meu Kit Perfil Dark agora — " + discountStr;
    if (ctaMidEl) ctaMidEl.textContent = "Quero meu Kit Perfil Dark agora — " + discountStr;
    if (faqPriceEl) faqPriceEl.textContent = discountStr;
  }

  applyChannelOfferToDom();

  function openModal() {
    refreshPixState();
    if (modal) modal.classList.remove("hidden");
  }

  function closeModal() {
    if (modal) modal.classList.add("hidden");
  }

  var ctaHero = document.getElementById("cta-hero");
  if (ctaHero) ctaHero.addEventListener("click", openModal);

  var ctaMid = document.getElementById("cta-mid");
  if (ctaMid) ctaMid.addEventListener("click", openModal);

  if (modalClose) modalClose.addEventListener("click", closeModal);
  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeModal();
    });
  }

  if (orderBumpEl) {
    orderBumpEl.addEventListener("change", refreshPixState);
  }

  if (copyBrBtn) {
    copyBrBtn.addEventListener("click", function () {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        navigator.clipboard.writeText(currentBrCode).then(function () {
          var orig = "Copiar Código Pix (Copia e Cola)";
          copyBrBtn.textContent = "Código Pix copiado!";
          setTimeout(function () { copyBrBtn.textContent = orig; }, 2000);
        });
      }
    });
  }

  if (copyKeyBtn) {
    copyKeyBtn.addEventListener("click", function () {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        navigator.clipboard.writeText(PIX_KEY).then(function () {
          var orig = "Copiar Chave Pix: " + PIX_KEY;
          copyKeyBtn.textContent = "Chave Pix copiada!";
          setTimeout(function () { copyKeyBtn.textContent = orig; }, 2000);
        });
      }
    });
  }

  function triggerDownload(filename, content, mime) {
    var blob = new Blob([content], { type: mime || "text/plain;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (btnDownloadTxt) {
    btnDownloadTxt.addEventListener("click", function () {
      var isBump = Boolean(orderBumpEl && orderBumpEl.checked);
      var txtContent = buildDeliverableTxt(isBump);
      triggerDownload("kit-perfil-dark-tiktok-60-roteiros.txt", txtContent, "text/plain;charset=utf-8;");
    });
  }

  if (btnDownloadCsv) {
    btnDownloadCsv.addEventListener("click", function () {
      var isBump = Boolean(orderBumpEl && orderBumpEl.checked);
      var csvContent = buildDeliverableCsv(isBump);
      triggerDownload("planilha-controle-perfil-dark.csv", csvContent, "text/csv;charset=utf-8;");
    });
  }
})();
