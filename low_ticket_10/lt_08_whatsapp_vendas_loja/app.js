(function () {
  "use strict";

  var PIX_KEY = "vudotsur@gmail.com";
  var MERCHANT_NAME = "FELIPE LINARES";
  var MERCHANT_CITY = "LONDRINA";
  var TXID = "LT08";
  var BASE_PRICE = 17.90;
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

  // --- Interactive Preview ---
  var SCRIPTS = {
    orcamento: [
      {
        title: "Orçamento com ancoragem de benefício",
        body: "Oi, [NOME]! Tudo bem? Separei o [PRODUTO] certinho para você. Ele já vai com [BENEFÍCIO/GARANTIA] e fica em R$ [VALOR] no Pix (ou em até [PARCELAS]). Prefere que eu já deixe reservado no seu nome?"
      },
      {
        title: "Orçamento com 2 opções (evita o 'vou pensar')",
        body: "[NOME], para o que você precisa hoje tenho duas opções ótimas: a opção básica por R$ [VALOR 1] e a completa (que já inclui [EXTRA]) por R$ [VALOR 2]. Qual das duas faz mais sentido para você?"
      }
    ],
    caro: [
      {
        title: "Quebra elegante de 'tá caro'",
        body: "Entendo super, [NOME]! Hoje muita gente olha só o preço inicial, mas no nosso caso você não paga nada além e já leva [DIFERENCIAL/GARANTIA]. Se dividirmos no Pix + cartão ou ajustarmos para o modelo [OPÇÃO MENOR], fica melhor para você?"
      },
      {
        title: "Comparação de custo diário",
        body: "Faz todo sentido avaliar o valor, [NOME]. Como esse [PRODUTO] dura [TEMPO], sai menos de R$ [CENTAVOS] por dia para resolver [PROBLEMA]. Quer que eu simule no cartão sem compromisso?"
      }
    ],
    sumido: [
      {
        title: "Retomada leve (zero pressão)",
        body: "Oi, [NOME]! Passando rapidinho só para saber se você conseguiu resolver aquilo do [PRODUTO] ou se ainda precisa de alguma informação. Fico por aqui se precisar!"
      },
      {
        title: "Gatilho de fechamento de agenda/estoque",
        body: "[NOME], estou fechando os pedidos/horários de hoje aqui na loja. Lembrei do seu orçamento de [PRODUTO] — quer que eu segure o seu antes de encerrar?"
      }
    ],
    posvenda: [
      {
        title: "Pós-venda que gera fidelidade",
        body: "Oi, [NOME]! Passando para saber se deu tudo certo com seu [PRODUTO] e se você gostou. Qualquer dúvida no uso, me chama aqui!"
      },
      {
        title: "Pedido de indicação natural",
        body: "Que bom que você curtiu, [NOME]! Se tiver algum amigo ou familiar precisando de [PRODUTO/SERVIÇO], pode passar meu contato que eu capricho no atendimento igual fiz com você."
      }
    ]
  };

  var catEl = document.getElementById("wa-cat");
  var clienteEl = document.getElementById("wa-cliente");
  var listEl = document.getElementById("wa-list");

  function renderScripts() {
    var cat = catEl.value;
    var nome = (clienteEl.value || "Cliente").trim();
    var items = SCRIPTS[cat];
    var nodes = [];

    items.forEach(function (item) {
      var text = item.body.replace(/\[NOME\]/g, nome);
      var card = document.createElement("div");
      card.className = "rounded-xl bg-slate-50 border border-slate-200 p-4";

      var header = document.createElement("div");
      header.className = "flex items-center justify-between gap-2 mb-2";

      var title = document.createElement("span");
      title.className = "text-xs font-bold uppercase tracking-wide text-slate-500";
      title.textContent = item.title;

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "text-xs font-semibold px-3 py-1 rounded-md bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer";
      btn.textContent = "Copiar texto";
      btn.addEventListener("click", function () {
        navigator.clipboard.writeText(text).then(function () {
          btn.textContent = "Copiado!";
          setTimeout(function () { btn.textContent = "Copiar texto"; }, 1800);
        });
      });

      header.appendChild(title);
      header.appendChild(btn);

      var p = document.createElement("p");
      p.className = "text-sm text-slate-800 leading-relaxed";
      p.textContent = text;

      card.appendChild(header);
      card.appendChild(p);
      nodes.push(card);
    });

    listEl.replaceChildren.apply(listEl, nodes);
  }

  catEl.addEventListener("change", renderScripts);
  clienteEl.addEventListener("input", renderScripts);
  renderScripts();

  // --- Deliverable TXT (50 Scripts) ---
  function buildDeliverableTxt(includeBump) {
    var sections = [
      {
        title: "BLOCO 1: PRIMEIRO CONTATO (10 MENSAGENS)",
        items: [
          "01. Oi, [NOME]! Tudo bem? Vi seu interesse no [PRODUTO]. Para eu te indicar certinho, voce busca para uso proprio ou presente?",
          "02. Ola [NOME], seja bem-vindo(a)! Recebi sua mensagem sobre [PRODUTO]. Como posso te ajudar hoje?",
          "03. Oi [NOME]! Obrigado pelo contato. Me conta rapidinho o que voce precisa para eu ja te passar a melhor opcao.",
          "04. Ola [NOME]! Temos [PRODUTO] disponivel sim. Voce prefere retirar aqui ou receber em casa?",
          "05. Oi [NOME]! Que bom falar com voce. Para agilizar seu atendimento, qual tamanho/modelo voce esta procurando?",
          "06. Ola [NOME], tudo joia? Vi que voce clicou no nosso anuncio de [PRODUTO]. Quer ver as fotos reais dele?",
          "07. Oi [NOME]! Aqui e [SEU NOME] da [SUA LOJA]. Ja separei as opcoes de [PRODUTO] para voce dar uma olhada.",
          "08. Ola [NOME]! Voce precisa do [PRODUTO] para alguma data especifica? Assim ja confiro nossa entrega.",
          "09. Oi [NOME]! Posso te mandar um resumo de 2 linhas com os diferenciais do nosso [PRODUTO]?",
          "10. Ola [NOME]! Obrigado por chamar no WhatsApp. Qual bairro voce esta para eu calcular o frete mais rapido?"
        ]
      },
      {
        title: "BLOCO 2: ENVIO DE ORCAMENTO (10 MENSAGENS)",
        items: [
          "11. Oi [NOME]! Separei o [PRODUTO] certinho para voce. Ele ja vai com [BENEFICIO] e fica em R$ [VALOR] no Pix. Posso reservar?",
          "12. [NOME], temos duas opcoes: a basica por R$ [VALOR 1] e a completa (com [EXTRA]) por R$ [VALOR 2]. Qual faz mais sentido?",
          "13. O valor do [PRODUTO] e R$ [VALOR]. No Pix voce ainda ganha [DESCONTO/BRINDE]. Quer que eu gere a chave?",
          "14. [NOME], esse servico inclui [ITEM 1], [ITEM 2] e garantia de [PRAZO]. O investimento total fica em R$ [VALOR].",
          "15. Para fechar hoje, consigo fazer R$ [VALOR] em ate [X]x sem juros ou R$ [VALOR PIX] no Pix. Como fica melhor?",
          "16. [NOME], o orcamento completo ficou em R$ [VALOR], ja com entrega incluida para o seu bairro.",
          "17. Esse modelo tem saido muito porque resolve [DOR]. O valor dele e R$ [VALOR]. Quer ver a tabela de cores?",
          "18. [NOME], se voce levar o combo com 2 unidades, cada uma sai por R$ [VALOR COMBO]. Vale muito a pena!",
          "19. O valor e R$ [VALOR] e a entrega sai hoje mesmo se confirmarmos ate as [HORA].",
          "20. [NOME], ja deixei pre-separado aqui. Se quiser confirmar por R$ [VALOR], e so me dar um ok!"
        ]
      },
      {
        title: "BLOCO 3: QUEBRA DE OBJECOES (10 MENSAGENS)",
        items: [
          "21. ('Ta caro') Entendo super, [NOME]! No nosso caso voce nao paga taxa extra e ja leva [GARANTIA/QUALIDADE].",
          "22. ('Ta caro') Faz sentido avaliar! Como o [PRODUTO] dura [TEMPO], sai menos de R$ [CENTAVOS] por dia.",
          "23. ('Vou pensar') Claro, [NOME]! So me diz: ficou alguma duvida sobre o produto ou foi so o momento da compra?",
          "24. ('Vou falar com meu marido/esposa') Perfeito! Quer que eu mande um resumo com foto e valor em 1 mensagem para facilitar mostrar?",
          "25. ('Vi mais barato') Entendo! Muitas vezes o mais barato nao inclui [DIFERENCIAL/GARANTIA]. Aqui voce tem seguranca total.",
          "26. ('So mes que vem') Sem problemas, [NOME]! Posso te dar um oi no dia [DATA] para ver se ainda precisa?",
          "27. ('Frete caro') Se voce fechar no Pix hoje, consigo rachar o frete com voce. O que acha?",
          "28. ('Nao sei se serve') Me manda sua medida/modelo que eu confiro na hora antes de enviar para nao ter erro!",
          "29. ('Tenho medo de comprar online') Pode ficar tranquilo(a), [NOME]! Voce tem 7 dias de garantia por lei e pode pagar na entrega/Pix seguro.",
          "30. ('Agora estou ocupado') Imagina! Quando estiver livre me responde com '1' que eu continuo daqui."
        ]
      },
      {
        title: "BLOCO 4: RECUPERACAO DE SUMIDOS (10 MENSAGENS)",
        items: [
          "31. Oi [NOME]! Passando rapidinho so para saber se conseguiu resolver aquilo do [PRODUTO] ou se ainda precisa de ajuda.",
          "32. [NOME], estou fechando os pedidos de hoje. Lembrei do seu orcamento — quer que eu segure o seu?",
          "33. Oi [NOME]! Liberou mais uma unidade daquele [PRODUTO] que voce olhou. Ainda tem interesse?",
          "34. [NOME], tudo bem? Ficou alguma duvida no orcamento que te mandei ontem?",
          "35. Oi [NOME]! Se o problema foi a forma de pagamento, consegui liberar em [X]x no cartao para voce.",
          "36. [NOME], passando para avisar que o lote atual esta acabando. Se quiser garantir no preco antigo, me avisa!",
          "37. Oi [NOME]! Nao quero incomodar, e so um oi para saber se posso encerrar seu orcamento ou manter em aberto.",
          "38. [NOME], lembrei de voce porque chegou novidade parecida com o que voce pediu. Quer dar uma olhada?",
          "39. Oi [NOME]! Hoje estamos com entrega rapida gratuita na sua regiao. Aproveita para fechar seu pedido?",
          "40. [NOME], se ainda precisar de [PRODUTO] esta semana, me chama que mantenho aquela condicao para voce."
        ]
      },
      {
        title: "BLOCO 5: POS-VENDA E INDICACAO (10 MENSAGENS)",
        items: [
          "41. Oi [NOME]! Passando para saber se deu tudo certo com seu [PRODUTO] e se voce gostou!",
          "42. [NOME], seu pedido ja saiu para entrega! Qualquer coisa me chama aqui.",
          "43. Obrigado pela confianca, [NOME]! Se precisar de qualquer dica de uso do [PRODUTO], estou por aqui.",
          "44. Que bom que curtiu, [NOME]! Se tiver algum amigo precisando de [PRODUTO], pode passar meu contato.",
          "45. [NOME], como voce ja e cliente da casa, na proxima compra tem [DESCONTO/BRINDE] garantido!",
          "46. Oi [NOME]! Faz 30 dias da sua compra. Tudo funcionando perfeitamente por ai?",
          "47. [NOME], se puder avaliar nosso atendimento com uma frase rapida, ajuda muito nosso pequeno negocio!",
          "48. Oi [NOME]! Chegou reposicao daquele item que combina com o que voce levou. Quer ver?",
          "49. [NOME], feliz aniversario/mes! Passando para agradecer por ser nosso cliente.",
          "50. Oi [NOME]! Sempre que precisar de [PRODUTO], e so mandar um oi aqui que ja tenho seu cadastro."
        ]
      }
    ];

    var out = [
      "====================================================================",
      "50 MENSAGENS PRONTAS DE WHATSAPP PARA LOJAS E AUTONOMOS",
      "====================================================================",
      "DICA: Substitua os trechos entre [COLCHETES] pelos dados do seu cliente.",
      ""
    ];

    sections.forEach(function (sec) {
      out.push(sec.title);
      out.push("--------------------------------------------------------------------");
      sec.items.forEach(function (line) { out.push(line); });
      out.push("");
    });

    if (includeBump) {
      out.push(
        "====================================================================",
        "BONUS: GUIA DE AUDIOS CURTOS (20s) & ETIQUETAS WHATSAPP BUSINESS",
        "====================================================================",
        "ETIQUETAS RECOMENDADAS:",
        "1. [Azul] Novo Orcamento",
        "2. [Amarelo] Aguardando Pix / Pagamento",
        "3. [Vermelho] Sumido (Chamar em 48h)",
        "4. [Verde] Pedido Pago / Entregue",
        "",
        "ROTEIRO DE AUDIO DE 20 SEGUNDOS PARA DESTRAVAR VENDA:",
        "'Oi [NOME], tudo bem? Mandei um audio rapidinho porque e mais facil explicar: o [PRODUTO] ja vai completo com [BENEFICIO] e consigo te entregar ainda hoje/amanha. Me da um ok que eu ja separo o seu!'"
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
    a.download = "50-mensagens-whatsapp-vendas.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
})();
