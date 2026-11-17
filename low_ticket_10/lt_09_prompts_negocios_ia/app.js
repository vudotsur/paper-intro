(function () {
  "use strict";

  var PIX_KEY = "vudotsur@gmail.com";
  var MERCHANT_NAME = "FELIPE LINARES";
  var MERCHANT_CITY = "LONDRINA";
  var TXID = "LT09";
  var BASE_PRICE = 24.90;
  var BUMP_PRICE = 9.90;

  function tlv(id, value) { return id + String(value.length).padStart(2, "0") + value; }
  function crc16ccitt(str) {
    var crc = 0xFFFF;
    for (var i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (var j = 0; j < 8; j++) crc = (crc & 0x8000) ? (((crc << 1) ^ 0x1021) & 0xFFFF) : ((crc << 1) & 0xFFFF);
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
  }
  function buildBrCode(amountNum) {
    var mai = tlv("26", tlv("00", "br.gov.bcb.pix") + tlv("01", PIX_KEY));
    var payload = tlv("00", "01") + mai + tlv("52", "0000") + tlv("53", "986") +
      tlv("54", amountNum.toFixed(2)) + tlv("58", "BR") +
      tlv("59", MERCHANT_NAME) + tlv("60", MERCHANT_CITY) +
      tlv("62", tlv("05", TXID)) + "6304";
    return payload + crc16ccitt(payload);
  }

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
    for (var i = 0; i < 255; i++) { GF_EXP[i] = x; GF_LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11D; }
    for (var j = 255; j < 512; j++) GF_EXP[j] = GF_EXP[j - 255];
  })();
  function gfMul(a, b) { return (a === 0 || b === 0) ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]]; }
  function rsEncode(data, eccLen) {
    var poly = [1];
    for (var i = 0; i < eccLen; i++) {
      var next = new Array(poly.length + 1).fill(0);
      for (var j = 0; j < poly.length; j++) { next[j] ^= poly[j]; next[j + 1] ^= gfMul(poly[j], GF_EXP[i]); }
      poly = next;
    }
    var res = new Uint8Array(data.length + eccLen); res.set(data);
    for (var k = 0; k < data.length; k++) {
      var coef = res[k];
      if (coef !== 0) for (var m = 0; m < poly.length; m++) res[k + m] ^= gfMul(poly[m], coef);
    }
    return Array.from(res.slice(data.length));
  }

  function encodeQRMatrix(text) {
    var bytes = [];
    for (var i = 0; i < text.length; i++) bytes.push(text.charCodeAt(i) & 0xFF);
    var ver = 1;
    while (ver <= 10) { if ((4 + (ver < 10 ? 8 : 16)) + bytes.length * 8 <= QR_PARAMS[ver].dataBytes * 8) break; ver++; }
    if (ver > 10) ver = 10;
    var p = QR_PARAMS[ver], bits = [];
    function pushBits(val, len) { for (var b = len - 1; b >= 0; b--) bits.push((val >> b) & 1); }
    pushBits(4, 4); pushBits(bytes.length, ver < 10 ? 8 : 16);
    for (var k = 0; k < bytes.length; k++) pushBits(bytes[k], 8);
    var maxBits = p.dataBytes * 8;
    for (var t = 0; t < 4 && bits.length < maxBits; t++) bits.push(0);
    while (bits.length % 8 !== 0) bits.push(0);
    var padIdx = 0;
    while (bits.length < maxBits) { pushBits(padIdx % 2 === 0 ? 0xEC : 0x11, 8); padIdx++; }
    var dataCodewords = [];
    for (var d = 0; d < bits.length; d += 8) {
      var bv = 0; for (var b2 = 0; b2 < 8; b2++) bv = (bv << 1) | bits[d + b2]; dataCodewords.push(bv);
    }
    var dataBlocks = [], eccBlocks = [], offset = 0;
    for (var blk = 0; blk < p.blocks.length; blk++) {
      var len = p.blocks[blk], slice = dataCodewords.slice(offset, offset + len); offset += len;
      dataBlocks.push(slice); eccBlocks.push(rsEncode(slice, p.eccPerBlock));
    }
    var interleaved = [], maxDataLen = Math.max.apply(null, p.blocks);
    for (var c = 0; c < maxDataLen; c++) for (var blk2 = 0; blk2 < dataBlocks.length; blk2++) if (c < dataBlocks[blk2].length) interleaved.push(dataBlocks[blk2][c]);
    for (var e = 0; e < p.eccPerBlock; e++) for (var blk3 = 0; blk3 < eccBlocks.length; blk3++) interleaved.push(eccBlocks[blk3][e]);
    var n = p.size, mat = Array.from({ length: n }, function () { return new Int8Array(n); }), isFunc = Array.from({ length: n }, function () { return new Uint8Array(n); });
    function setFunc(r, col, val) { mat[r][col] = val ? 1 : 0; isFunc[r][col] = 1; }
    function drawFinder(r0, c0) {
      for (var dr = -1; dr <= 7; dr++) for (var dc = -1; dc <= 7; dc++) {
        var r = r0 + dr, col = c0 + dc; if (r < 0 || r >= n || col < 0 || col >= n) continue;
        setFunc(r, col, (dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6) && (dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4)));
      }
    }
    drawFinder(0, 0); drawFinder(0, n - 7); drawFinder(n - 7, 0);
    for (var i2 = 8; i2 < n - 8; i2++) { setFunc(6, i2, i2 % 2 === 0); setFunc(i2, 6, i2 % 2 === 0); }
    for (var ar = 0; ar < p.align.length; ar++) for (var ac = 0; ac < p.align.length; ac++) {
      var rc = p.align[ar], cc = p.align[ac]; if (isFunc[rc][cc]) continue;
      for (var dr2 = -2; dr2 <= 2; dr2++) for (var dc2 = -2; dc2 <= 2; dc2++) setFunc(rc + dr2, cc + dc2, Math.max(Math.abs(dr2), Math.abs(dc2)) !== 1);
    }
    setFunc(n - 8, 8, true);
    for (var f = 0; f < 9; f++) if (f !== 6) { isFunc[8][f] = 1; isFunc[f][8] = 1; }
    for (var f2 = 0; f2 < 8; f2++) { isFunc[8][n - 1 - f2] = 1; isFunc[n - 1 - f2][8] = 1; }
    if (ver >= 7) {
      var rem = ver; for (var vb = 0; vb < 12; vb++) rem = (rem << 1) ^ ((rem >> 11) * 0x1F25);
      var verBits = (ver << 12) | rem;
      for (var vi = 0; vi < 18; vi++) { var bit = ((verBits >> vi) & 1) === 1, a = Math.floor(vi / 3), b3 = n - 11 + (vi % 3); setFunc(a, b3, bit); setFunc(b3, a, bit); }
    }
    var bitStream = [];
    for (var ib = 0; ib < interleaved.length; ib++) for (var s = 7; s >= 0; s--) bitStream.push((interleaved[ib] >> s) & 1);
    var bitIdx = 0, up = true;
    for (var right = n - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < n; vert++) {
        var row = up ? n - 1 - vert : vert;
        for (var lr = 0; lr < 2; lr++) { var col2 = right - lr; if (!isFunc[row][col2]) mat[row][col2] = bitIdx < bitStream.length ? bitStream[bitIdx++] : 0; }
      }
      up = !up;
    }
    function applyFormat(grid, mask) {
      var data = (1 << 3) | mask, r = data;
      for (var i3 = 0; i3 < 10; i3++) r = (r << 1) ^ ((r >> 9) * 0x537);
      var fmt = ((data << 10) | r) ^ 0x5412;
      for (var i4 = 0; i4 <= 5; i4++) grid[8][i4] = (fmt >> i4) & 1;
      grid[8][7] = (fmt >> 6) & 1; grid[8][8] = (fmt >> 7) & 1; grid[7][8] = (fmt >> 8) & 1;
      for (var i5 = 9; i5 < 15; i5++) grid[14 - i5][8] = (fmt >> i5) & 1;
      for (var i6 = 0; i6 < 8; i6++) grid[n - 1 - i6][8] = (fmt >> i6) & 1;
      for (var i7 = 8; i7 < 15; i7++) grid[8][n - 15 + i7] = (fmt >> i7) & 1;
    }
    function maskCond(m, r, c) {
      switch (m) {
        case 0: return (r + c) % 2 === 0; case 1: return r % 2 === 0; case 2: return c % 3 === 0; case 3: return (r + c) % 3 === 0;
        case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0; case 5: return ((r * c) % 2 + (r * c) % 3) === 0;
        case 6: return (((r * c) % 2 + (r * c) % 3) % 2) === 0; default: return (((r + c) % 2 + (r * c) % 3) % 2) === 0;
      }
    }
    function penalty(grid) {
      var score = 0;
      for (var r = 0; r < n; r++) {
        var rH = 1, rV = 1;
        for (var c = 1; c < n; c++) {
          if (grid[r][c] === grid[r][c - 1]) rH++; else { if (rH >= 5) score += 3 + (rH - 5); rH = 1; }
          if (grid[c][r] === grid[c - 1][r]) rV++; else { if (rV >= 5) score += 3 + (rV - 5); rV = 1; }
        }
        if (rH >= 5) score += 3 + (rH - 5); if (rV >= 5) score += 3 + (rV - 5);
      }
      for (var r2 = 0; r2 < n - 1; r2++) for (var c2 = 0; c2 < n - 1; c2++) {
        var v = grid[r2][c2]; if (v === grid[r2][c2 + 1] && v === grid[r2 + 1][c2] && v === grid[r2 + 1][c2 + 1]) score += 3;
      }
      return score;
    }
    var bestGrid = null, bestScore = Infinity;
    for (var m = 0; m < 8; m++) {
      var cand = mat.map(function (row) { return new Int8Array(row); });
      for (var r3 = 0; r3 < n; r3++) for (var c3 = 0; c3 < n; c3++) if (!isFunc[r3][c3] && maskCond(m, r3, c3)) cand[r3][c3] ^= 1;
      applyFormat(cand, m); var sc = penalty(cand);
      if (sc < bestScore) { bestScore = sc; bestGrid = cand; }
    }
    return bestGrid;
  }

  function renderQRSvg(container, text) {
    var grid = encodeQRMatrix(text), n = grid.length, quiet = 2, total = n + quiet * 2;
    var svgNS = "http://www.w3.org/2000/svg", svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 " + total + " " + total);
    svg.setAttribute("width", "192"); svg.setAttribute("height", "192");
    svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "QR Code Pix");
    var bg = document.createElementNS(svgNS, "rect");
    bg.setAttribute("width", String(total)); bg.setAttribute("height", String(total)); bg.setAttribute("fill", "#ffffff");
    svg.appendChild(bg);
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (grid[r][c] === 1) {
      var rect = document.createElementNS(svgNS, "rect");
      rect.setAttribute("x", String(c + quiet)); rect.setAttribute("y", String(r + quiet));
      rect.setAttribute("width", "1"); rect.setAttribute("height", "1"); rect.setAttribute("fill", "#0f172a");
      svg.appendChild(rect);
    }
    container.replaceChildren(svg);
  }

  // --- Prompt Customizer ---
  var nichoEl = document.getElementById("pr-nicho");
  var objEl = document.getElementById("pr-obj");
  var lojaEl = document.getElementById("pr-loja");
  var itemEl = document.getElementById("pr-item");
  var outEl = document.getElementById("pr-output");
  var copyPromptBtn = document.getElementById("pr-copy");

  function updatePrompt() {
    var nicho = nichoEl.value;
    var obj = objEl.value;
    var loja = (lojaEl.value || "Minha Loja").trim();
    var item = (itemEl.value || "Produto Principal").trim();
    var text = "";

    if (obj === "cardapio") {
      text = "Atue como um especialista em vendas locais para " + nicho + ".\n" +
        "Crie 3 opcoes de descricao curta (maximo 3 linhas cada) para o item \"" + item + "\" da loja \"" + loja + "\".\n" +
        "Use linguagem simples, natural e brasileira, destacando o sabor/beneficio principal e fechando com um convite direto para pedir hoje. Evite palavras exageradas ou roboticas.";
    } else if (obj === "post") {
      text = "Crie uma legenda de Instagram para o negocio \"" + loja + "\" (" + nicho + ") divulgando \"" + item + "\".\n" +
        "Estrutura: 1 frase inicial que chama atencao no bairro, 3 beneficios rapidos em topicos e 1 chamada final para o cliente mandar mensagem no WhatsApp.";
    } else {
      text = "Escreva uma resposta educada, acolhedora e profissional em nome de \"" + loja + "\" (" + nicho + ") para um cliente que avaliou ou perguntou sobre \"" + item + "\".\n" +
        "Mostre cuidado com o cliente, resolva a duvida de forma clara em ate 4 linhas e convide para voltar.";
    }
    outEl.textContent = text;
  }

  [nichoEl, objEl, lojaEl, itemEl].forEach(function (el) {
    el.addEventListener("input", updatePrompt);
    el.addEventListener("change", updatePrompt);
  });
  updatePrompt();

  copyPromptBtn.addEventListener("click", function () {
    navigator.clipboard.writeText(outEl.textContent).then(function () {
      var orig = "Copiar comando";
      copyPromptBtn.textContent = "Copiado!";
      setTimeout(function () { copyPromptBtn.textContent = orig; }, 1800);
    });
  });

  // --- Deliverable TXT ---
  function buildDeliverableTxt(includeBump) {
    var out = [
      "====================================================================",
      "CAIXA DE PROMPTS PRATICOS PARA PEQUENOS NEGOCIOS (40+ COMANDOS)",
      "====================================================================",
      "COMO USAR: Copie o comando, substitua os [COLCHETES] e cole no ChatGPT ou Gemini gratuito.",
      "",
      "--- BLOCO 1: CARDAPIO, IFOOD E CATALOGO (10 COMANDOS) ---",
      "01. Descricao irresistivel de prato/combo: 'Atue como redator de delivery. Reescreva a descricao de [PRATO] com [INGREDIENTES] em ate 3 linhas, dando agua na boca e sem exageros.'",
      "02. Nome criativo para combo: 'Sugira 5 nomes simples e atrativos para um combo de [ITEM 1] + [ITEM 2] voltado para [PUBLICO].'",
      "03. Descricao de produto fisico (roupa/cosmetico): 'Descreva [PRODUTO] destacando conforto, durabilidade e ocasiao de uso em 4 linhas para WhatsApp.'",
      "04. Destaque de diferenciacao: 'Liste 3 motivos claros para o cliente escolher [SEU PRODUTO] em vez da concorrencia comum.'",
      "05. Descricao para foto de catalogo: 'Crie uma legenda de 2 linhas para acompanhar a foto de [PRODUTO] com preco R$ [VALOR].'",
      "06. Cardapio economico (hora do almoco): 'Crie um texto curto de oferta de almoco executivo por R$ [VALOR] destacando rapidez e comida caseira.'",
      "07. Apresentacao de kit presente: 'Escreva uma descricao carinhosa para um kit presente de [ITENS] ideal para [OCASIAO].'",
      "08. Texto para adicional/upsell: 'Sugira 3 frases curtas para oferecer [ADICIONAL] na hora que o cliente pede [PRODUTO].'",
      "09. Aviso de lote limitado: 'Escreva uma nota curta e verdadeira avisando que temos poucas unidades de [PRODUTO] hoje.'",
      "10. Ficha tecnica amigavel: 'Transforme esses detalhes tecnicos [DETALHES] em 3 beneficios faceis de entender para o cliente.'",
      "",
      "--- BLOCO 2: POSTS, REELS E STORIES (10 COMANDOS) ---",
      "11. Calendario da semana: 'Crie 5 ideias simples de posts para esta semana para um(a) [TIPO DE NEGOCIO] usando fotos do dia a dia.'",
      "12. Roteiro de Reels de 15s: 'Escreva um roteiro de video curto de 15 segundos mostrando os bastidores de [SEU NEGOCIO] sem precisar aparecer falando.'",
      "13. Sequencia de 3 Stories de venda: 'Crie 3 stories em sequencia: Story 1 (enquete sobre problema), Story 2 (mostrando [PRODUTO]), Story 3 (link/WhatsApp).'",
      "14. Legenda de prova de trabalho: 'Escreva uma legenda para mostrar um antes e depois de [SERVICO] valorizando o cuidado no atendimento.'",
      "15. Post de bairro/cidade: 'Crie um post acolhedor convidando moradores de [BAIRRO/CIDADE] para conhecer [LOJA].'",
      "16. Post educativo rapido: 'Escreva 3 dicas praticas sobre [TEMA DO SEU RAMO] para postar no Instagram e gerar salvamentos.'",
      "17. Chamada para sexta/fim de semana: 'Crie uma legenda animada para sexta-feira oferecendo [OFERTA] para o fim de semana.'",
      "18. Enquete de interacao: 'Sugira 5 enquetes rapidas de 'Sim ou Nao' para os Stories de um(a) [TIPO DE NEGOCIO].'",
      "19. Legenda para carrossel de 4 telas: 'Divida a explicacao de [SERVICO/PRODUTO] em 4 frases curtas para um carrossel no Instagram.'",
      "20. Reaproveitamento de texto: 'Transforme este texto longo [COLAR TEXTO] em uma legenda curta de 4 linhas para Instagram.'",
      "",
      "--- BLOCO 3: ATENDIMENTO E GOOGLE MEU NEGOCIO (10 COMANDOS) ---",
      "21. Resposta de avaliacao 5 estrelas: 'Escreva uma resposta calorosa e unica agradecendo o elogio de [NOME DO CLIENTE] no Google.'",
      "22. Resposta elegante a critica: 'Escreva uma resposta educada, calma e resolutiva para um cliente que reclamou de [PROBLEMA], convidando para resolver no privado.'",
      "23. Mensagem de ausencia/horario: 'Crie uma mensagem automatica simpatica de WhatsApp para fora do horario comercial informando retorno as [HORA].'",
      "24. Explicacao de prazo de entrega: 'Explique de forma gentil por que o prazo de [SERVICO/ENTREGA] e de [DIAS] dias, valorizando a qualidade.'",
      "25. Agradecimento pos-compra: 'Crie uma mensagem curta de agradecimento para enviar junto com o pedido ou logo apos a entrega.'",
      "26. Pedido de avaliacao no Google: 'Escreva um convite leve de 2 linhas pedindo para o cliente satisfeito deixar uma avaliacao no Google.'",
      "27. Reajuste de preco sem atrito: 'Redija um aviso transparente e educado para clientes antigos sobre pequeno reajuste a partir de [DATA].'",
      "28. Confirmacao de agendamento: 'Crie uma mensagem curta de lembrete de horario marcado para amanha as [HORA] na [LOJA].'",
      "29. Resposta para pedido de desconto: 'Escreva 2 opcoes educadas para responder quando o cliente pede desconto, oferecendo condicao no Pix ou combo.'",
      "30. Boas-vindas para cliente novo: 'Crie uma mensagem de boas-vindas em 3 linhas apresentando o que fazemos de melhor na [LOJA].'",
      "",
      "--- BLOCO 4: PROMOCOES E GIRO DE ESTOQUE (10 COMANDOS) ---",
      "31. Queima de estoque inteligente: 'Crie uma campanha de 3 dias para girar [PRODUTO PARADO] sem parecer desespero, usando combo.'",
      "32. Oferta relampago de 24h: 'Escreva um texto curto para lista de transmissao do WhatsApp anunciando condicao especial valida somente hoje.'",
      "33. Cupom de primeira compra: 'Crie uma mensagem oferecendo [BENEFICIO] na primeira compra para quem nunca pediu na [LOJA].'",
      "34. Campanha de indicacao: 'Escreva uma oferta simples: indique um amigo e os dois ganham [BRINDE/DESCONTO].'",
      "35. Datas comemorativas: 'Crie 3 ideias de oferta para [DATA: Dia das Maes / Natal / Dia dos Pais] adaptadas para [SEU NEGOCIO].'",
      "36. Dia de movimento fraco: 'Sugira uma promocao criativa para atrair clientes na [TERCA/QUARTA-FEIRA] usando [PRODUTO].'",
      "37. Fidelidade simples: 'Crie o texto de um cartao fidelidade digital: a cada [X] compras, ganhe [PREMIO].'",
      "38. Lancamento de novidade: 'Escreva um anuncio de novidade para clientes VIP antes de abrir para todo mundo.'",
      "39. Combo familia/amigos: 'Monte a divulgacao de um pacote para grupo/familia economizar comprando junto.'",
      "40. Fechamento de mes: 'Crie uma mensagem de ultima semana do mes para bater a meta oferecendo entrega gratis acima de R$ [VALOR].'"
    ];

    if (includeBump) {
      out.push(
        "",
        "====================================================================",
        "BONUS: COMANDOS DE BIO DO INSTAGRAM & GOOGLE MEU NEGOCIO",
        "====================================================================",
        "BIO INSTAGRAM: 'Crie 3 opcoes de Bio do Instagram (maximo 150 caracteres) para [LOJA] em [CIDADE], dizendo o que vendemos, diferencial e chamada para o link do WhatsApp.'",
        "GOOGLE MEU NEGOCIO: 'Escreva uma descricao de ate 700 caracteres para o perfil do Google de [LOJA], citando os servicos [LISTA], bairro [BAIRRO] e horario de atendimento.'"
      );
    }

    return out.join("\r\n");
  }

  // --- Modal & Pix ---
  var modal = document.getElementById("pix-modal");
  var modalClose = document.getElementById("modal-close");
  var orderBumpEl = document.getElementById("order-bump");
  var modalTotalEl = document.getElementById("modal-total");
  var qrContainer = document.getElementById("qr-container");
  var copyBrBtn = document.getElementById("copy-brcode");
  var copyKeyBtn = document.getElementById("copy-pixkey");
  var downloadBtn = document.getElementById("download-btn");
  var currentBrCode = "";

  function refreshPixState() {
    var total = BASE_PRICE + (orderBumpEl.checked ? BUMP_PRICE : 0);
    modalTotalEl.textContent = "R$ " + total.toFixed(2).replace(".", ",");
    currentBrCode = buildBrCode(total);
    renderQRSvg(qrContainer, currentBrCode);
  }

  function openModal() { refreshPixState(); modal.classList.remove("hidden"); }
  function closeModal() { modal.classList.add("hidden"); }

  document.getElementById("cta-hero").addEventListener("click", openModal);
  document.getElementById("cta-mid").addEventListener("click", openModal);
  modalClose.addEventListener("click", closeModal);
  modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
  orderBumpEl.addEventListener("change", refreshPixState);

  copyBrBtn.addEventListener("click", function () {
    navigator.clipboard.writeText(currentBrCode).then(function () {
      var orig = "Copiar Código Pix (Copia e Cola)";
      copyBrBtn.textContent = "Código Pix copiado!";
      setTimeout(function () { copyBrBtn.textContent = orig; }, 2000);
    });
  });

  copyKeyBtn.addEventListener("click", function () {
    navigator.clipboard.writeText(PIX_KEY).then(function () {
      var orig = "Copiar Chave Pix: " + PIX_KEY;
      copyKeyBtn.textContent = "Chave Pix copiada!";
      setTimeout(function () { copyKeyBtn.textContent = orig; }, 2000);
    });
  });

  downloadBtn.addEventListener("click", function () {
    var content = buildDeliverableTxt(orderBumpEl.checked);
    var blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "caixa-prompts-pequenos-negocios.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
})();
