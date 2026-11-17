(function () {
  "use strict";

  var PIX_KEY = "vudotsur@gmail.com";
  var MERCHANT_NAME = "FELIPE LINARES";
  var MERCHANT_CITY = "LONDRINA";
  var TXID = "LT06";
  var BASE_PRICE = 14.90;
  var BUMP_PRICE = 9.90;

  // --- EMVCo BR Code Generator ---
  function tlv(id, value) {
    var len = String(value.length).padStart(2, "0");
    return id + len + value;
  }

  function crc16ccitt(str) {
    var crc = 0xFFFF;
    for (var i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (var j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
        } else {
          crc = (crc << 1) & 0xFFFF;
        }
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
  }

  function buildBrCode(amountNum) {
    var gui = tlv("00", "br.gov.bcb.pix");
    var key = tlv("01", PIX_KEY);
    var mai = tlv("26", gui + key);
    var mcc = tlv("52", "0000");
    var cur = tlv("53", "986");
    var amt = tlv("54", amountNum.toFixed(2));
    var ctry = tlv("58", "BR");
    var name = tlv("59", MERCHANT_NAME.slice(0, 25));
    var city = tlv("60", MERCHANT_CITY.slice(0, 15));
    var addData = tlv("62", tlv("05", TXID));
    var payload = tlv("00", "01") + mai + mcc + cur + amt + ctry + name + city + addData + "6304";
    return payload + crc16ccitt(payload);
  }

  // --- Pure-JS QR Code Generator (Byte mode, ECC Level L, Versions 1..10) ---
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

  var GF_EXP = new Uint8Array(512);
  var GF_LOG = new Uint8Array(256);
  (function initGF() {
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
    if (a === 0 || b === 0) return 0;
    return GF_EXP[GF_LOG[a] + GF_LOG[b]];
  }

  function rsGeneratorPoly(deg) {
    var poly = [1];
    for (var i = 0; i < deg; i++) {
      var next = new Array(poly.length + 1).fill(0);
      var factor = GF_EXP[i];
      for (var j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMul(poly[j], factor);
      }
      poly = next;
    }
    return poly;
  }

  function rsEncode(data, eccLen) {
    var gen = rsGeneratorPoly(eccLen);
    var res = new Uint8Array(data.length + eccLen);
    res.set(data);
    for (var i = 0; i < data.length; i++) {
      var coef = res[i];
      if (coef !== 0) {
        for (var j = 0; j < gen.length; j++) {
          res[i + j] ^= gfMul(gen[j], coef);
        }
      }
    }
    return Array.from(res.slice(data.length));
  }

  function encodeQRMatrix(text) {
    var bytes = [];
    for (var i = 0; i < text.length; i++) {
      bytes.push(text.charCodeAt(i) & 0xFF);
    }

    var ver = 1;
    while (ver <= 10) {
      var cap = QR_PARAMS[ver].dataBytes;
      var headerBits = 4 + (ver < 10 ? 8 : 16);
      if (headerBits + bytes.length * 8 <= cap * 8) break;
      ver++;
    }
    if (ver > 10) ver = 10;

    var p = QR_PARAMS[ver];
    var bits = [];
    function pushBits(val, len) {
      for (var b = len - 1; b >= 0; b--) bits.push((val >> b) & 1);
    }

    pushBits(4, 4); // Byte mode
    pushBits(bytes.length, ver < 10 ? 8 : 16);
    for (var k = 0; k < bytes.length; k++) pushBits(bytes[k], 8);
    var maxBits = p.dataBytes * 8;
    for (var t = 0; t < 4 && bits.length < maxBits; t++) bits.push(0);
    while (bits.length % 8 !== 0) bits.push(0);
    var padBytes = [0xEC, 0x11];
    var padIdx = 0;
    while (bits.length < maxBits) {
      pushBits(padBytes[padIdx % 2], 8);
      padIdx++;
    }

    var dataCodewords = [];
    for (var d = 0; d < bits.length; d += 8) {
      var byteVal = 0;
      for (var b2 = 0; b2 < 8; b2++) byteVal = (byteVal << 1) | bits[d + b2];
      dataCodewords.push(byteVal);
    }

    var dataBlocks = [];
    var eccBlocks = [];
    var offset = 0;
    for (var blk = 0; blk < p.blocks.length; blk++) {
      var len = p.blocks[blk];
      var slice = dataCodewords.slice(offset, offset + len);
      offset += len;
      dataBlocks.push(slice);
      eccBlocks.push(rsEncode(slice, p.eccPerBlock));
    }

    var interleaved = [];
    var maxDataLen = Math.max.apply(null, p.blocks);
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

    var n = p.size;
    var mat = Array.from({ length: n }, function () { return new Int8Array(n); });
    var isFunc = Array.from({ length: n }, function () { return new Uint8Array(n); });

    function setFunc(r, col, val) {
      mat[r][col] = val ? 1 : 0;
      isFunc[r][col] = 1;
    }

    function drawFinder(r0, c0) {
      for (var dr = -1; dr <= 7; dr++) {
        for (var dc = -1; dc <= 7; dc++) {
          var r = r0 + dr;
          var col = c0 + dc;
          if (r < 0 || r >= n || col < 0 || col >= n) continue;
          var dark = (dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6) &&
            (dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
          setFunc(r, col, dark);
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

    var align = p.align;
    for (var ar = 0; ar < align.length; ar++) {
      for (var ac = 0; ac < align.length; ac++) {
        var rCenter = align[ar];
        var cCenter = align[ac];
        if (isFunc[rCenter][cCenter]) continue;
        for (var dr2 = -2; dr2 <= 2; dr2++) {
          for (var dc2 = -2; dc2 <= 2; dc2++) {
            var isDark = Math.max(Math.abs(dr2), Math.abs(dc2)) !== 1;
            setFunc(rCenter + dr2, cCenter + dc2, isDark);
          }
        }
      }
    }

    setFunc(n - 8, 8, true);

    // Reserve format info
    for (var f = 0; f < 9; f++) {
      if (f !== 6) {
        isFunc[8][f] = 1;
        isFunc[f][8] = 1;
      }
    }
    for (var f2 = 0; f2 < 8; f2++) {
      isFunc[8][n - 1 - f2] = 1;
      isFunc[n - 1 - f2][8] = 1;
    }

    // Version info for >= 7
    if (ver >= 7) {
      var rem = ver;
      for (var vb = 0; vb < 12; vb++) rem = (rem << 1) ^ ((rem >> 11) * 0x1F25);
      var verBits = (ver << 12) | rem;
      for (var vi = 0; vi < 18; vi++) {
        var bit = ((verBits >> vi) & 1) === 1;
        var a = Math.floor(vi / 3);
        var b3 = n - 11 + (vi % 3);
        setFunc(a, b3, bit);
        setFunc(b3, a, bit);
      }
    }

    // Place data bits
    var bitStream = [];
    for (var ib = 0; ib < interleaved.length; ib++) {
      for (var s = 7; s >= 0; s--) bitStream.push((interleaved[ib] >> s) & 1);
    }

    var bitIdx = 0;
    var up = true;
    for (var right = n - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < n; vert++) {
        var row = up ? n - 1 - vert : vert;
        for (var lr = 0; lr < 2; lr++) {
          var col2 = right - lr;
          if (!isFunc[row][col2]) {
            mat[row][col2] = bitIdx < bitStream.length ? bitStream[bitIdx++] : 0;
          }
        }
      }
      up = !up;
    }

    function applyFormat(grid, mask) {
      var data = (1 << 3) | mask; // ECC L = 01
      var r = data;
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
        var runH = 1, runV = 1;
        for (var c = 1; c < n; c++) {
          if (grid[r][c] === grid[r][c - 1]) runH++;
          else { if (runH >= 5) score += 3 + (runH - 5); runH = 1; }
          if (grid[c][r] === grid[c - 1][r]) runV++;
          else { if (runV >= 5) score += 3 + (runV - 5); runV = 1; }
        }
        if (runH >= 5) score += 3 + (runH - 5);
        if (runV >= 5) score += 3 + (runV - 5);
      }
      for (var r2 = 0; r2 < n - 1; r2++) {
        for (var c2 = 0; c2 < n - 1; c2++) {
          var v = grid[r2][c2];
          if (v === grid[r2][c2 + 1] && v === grid[r2 + 1][c2] && v === grid[r2 + 1][c2 + 1]) score += 3;
        }
      }
      return score;
    }

    var bestGrid = null;
    var bestScore = Infinity;
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
    var grid = encodeQRMatrix(text);
    var n = grid.length;
    var quiet = 2;
    var total = n + quiet * 2;
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

  // --- ABNT Mini-Tool Logic ---
  var tipoEl = document.getElementById("abnt-tipo");
  var sobrenomeEl = document.getElementById("abnt-sobrenome");
  var prenomeEl = document.getElementById("abnt-prenome");
  var tituloEl = document.getElementById("abnt-titulo");
  var localEl = document.getElementById("abnt-local");
  var anoEl = document.getElementById("abnt-ano");
  var outputEl = document.getElementById("abnt-output");
  var tipEl = document.getElementById("abnt-tip");
  var copyAbntBtn = document.getElementById("abnt-copy");

  function updateAbntPreview() {
    var tipo = tipoEl.value;
    var sob = (sobrenomeEl.value || "AUTOR").trim().toUpperCase();
    var pre = (prenomeEl.value || "Nome").trim();
    var tit = (tituloEl.value || "Título da obra").trim();
    var loc = (localEl.value || "São Paulo: Editora").trim();
    var ano = (anoEl.value || "2024").trim();

    var ref = "";
    var tip = "";

    if (tipo === "livro") {
      ref = sob + ", " + pre + ". " + tit + ". " + loc + ", " + ano + ".";
      tip = "Dica ABNT: No Word/Docs, aplique negrito apenas no título \"" + tit + "\".";
    } else if (tipo === "artigo") {
      ref = sob + ", " + pre + ". " + tit + ". " + loc + ", p. 1-15, " + ano + ".";
      tip = "Dica ABNT: Destaque o nome da revista em negrito, nunca o título do artigo.";
    } else if (tipo === "site") {
      var url = loc.indexOf("http") === 0 ? loc : "https://exemplo.com.br";
      ref = sob + ", " + pre + ". " + tit + ". Disponível em: " + url + ". Acesso em: " + ano + ".";
      tip = "Dica ABNT: Use meses abreviados com 3 letras em minúsculo (ex: 15 nov. 2026), exceto maio.";
    } else {
      ref = sob + ". " + tit + ". " + loc + ", " + ano + ".";
      tip = "Dica ABNT: Para leis federais, o autor é sempre BRASIL em caixa alta.";
    }

    outputEl.textContent = ref;
    tipEl.textContent = tip;
  }

  [tipoEl, sobrenomeEl, prenomeEl, tituloEl, localEl, anoEl].forEach(function (el) {
    el.addEventListener("input", updateAbntPreview);
    el.addEventListener("change", updateAbntPreview);
  });
  updateAbntPreview();

  copyAbntBtn.addEventListener("click", function () {
    navigator.clipboard.writeText(outputEl.textContent).then(function () {
      var orig = "Copiar referência";
      copyAbntBtn.textContent = "Copiado!";
      setTimeout(function () { copyAbntBtn.textContent = orig; }, 1800);
    });
  });

  // --- Deliverable Content & Download ---
  function buildDeliverableTxt(includeBump) {
    var lines = [
      "====================================================================",
      "GUIA ANTI-ERRO DE REFERENCIAS ABNT (NBR 6023) - TCC E ARTIGOS",
      "====================================================================",
      "",
      "1. REGRAS DE OURO (EVITE DESCONTOS DE NOTA)",
      "- Alinhamento da lista de referencias: SEMPRE a esquerda (nao justificar).",
      "- Espacamento: simples entre linhas da mesma referencia e 1 linha em branco entre referencias.",
      "- Ordem: alfabetica pelo sobrenome do primeiro autor (ou titulo, se nao houver autor).",
      "- Destaque tipografico: escolha UM padrao (negrito OU italico) e use ate o fim do trabalho.",
      "- Meses abreviados: jan., fev., mar., abr., maio, jun., jul., ago., set., out., nov., dez.",
      "",
      "2. 25 MODELOS PRONTOS PARA COPIAR E COLAR",
      "",
      "[01] Livro com 1 autor:",
      "SOBRENOME, Nome. **Titulo do livro**: subtitulo. Edicao. Cidade: Editora, ano.",
      "",
      "[02] Livro com 2 ou 3 autores:",
      "SOBRENOME1, Nome1; SOBRENOME2, Nome2. **Titulo do livro**. Cidade: Editora, ano.",
      "",
      "[03] Livro com 4 ou mais autores (et al.):",
      "SOBRENOME1, Nome1 *et al*. **Titulo do livro**. Cidade: Editora, ano.",
      "",
      "[04] Capitulo de livro (mesmo autor):",
      "SOBRENOME, Nome. Titulo do capitulo. In: ______. **Titulo do livro**. Cidade: Editora, ano. p. 10-25.",
      "",
      "[05] Capitulo de livro (autor diferente do organizador):",
      "SOBRENOME, Nome. Titulo do capitulo. In: ORGANIZADOR, Nome (org.). **Titulo do livro**. Cidade: Editora, ano. p. 10-25.",
      "",
      "[06] E-book / Livro digital:",
      "SOBRENOME, Nome. **Titulo do livro**. Cidade: Editora, ano. E-book. Disponivel em: https://link. Acesso em: 10 nov. 2026.",
      "",
      "[07] Artigo de revista cientifica (impresso):",
      "SOBRENOME, Nome. Titulo do artigo. **Nome da Revista**, Cidade, v. 10, n. 2, p. 45-60, jan./jun. 2024.",
      "",
      "[08] Artigo de revista cientifica (online):",
      "SOBRENOME, Nome. Titulo do artigo. **Nome da Revista**, Cidade, v. 10, n. 2, p. 45-60, 2024. Disponivel em: https://link. Acesso em: 10 nov. 2026.",
      "",
      "[09] Artigo com DOI:",
      "SOBRENOME, Nome. Titulo do artigo. **Nome da Revista**, v. 10, n. 2, p. 45-60, 2024. DOI: https://doi.org/10.xxxx/xxxx.",
      "",
      "[10] TCC, Dissertacao ou Tese:",
      "SOBRENOME, Nome. **Titulo do trabalho**. Ano. Tipo (Curso) - Instituicao, Cidade, ano.",
      "",
      "[11] TCC, Dissertacao ou Tese online:",
      "SOBRENOME, Nome. **Titulo do trabalho**. Ano. Tipo (Curso) - Instituicao, Cidade, ano. Disponivel em: https://link. Acesso em: 10 nov. 2026.",
      "",
      "[12] Site ou pagina institucional (com autor):",
      "SOBRENOME, Nome. **Titulo da pagina**. Nome do site, ano. Disponivel em: https://link. Acesso em: 10 nov. 2026.",
      "",
      "[13] Site sem autor (comeca pelo titulo em caixa alta na 1a palavra):",
      "TITULO da pagina. **Nome do site**, ano. Disponivel em: https://link. Acesso em: 10 nov. 2026.",
      "",
      "[14] Artigo de jornal online:",
      "SOBRENOME, Nome. Titulo da materia. **Nome do Jornal**, Cidade, 12 out. 2025. Disponivel em: https://link. Acesso em: 10 nov. 2026.",
      "",
      "[15] Constituicao Federal:",
      "BRASIL. **Constituicao da Republica Federativa do Brasil de 1988**. Brasilia, DF: Presidencia da Republica, 1988.",
      "",
      "[16] Lei Federal:",
      "BRASIL. **Lei n. 13.709, de 14 de agosto de 2018**. Lei Geral de Protecao de Dados Pessoais (LGPD). Brasilia, DF: Presidencia da Republica, 2018.",
      "",
      "[17] Decreto Municipal / Estadual:",
      "SAO PAULO (Estado). **Decreto n. XX.XXX, de 10 de marco de 2023**. Dispoe sobre [...]. Sao Paulo: Governo do Estado, 2023.",
      "",
      "[18] Norma Tecnica (ABNT):",
      "ASSOCIACAO BRASILEIRA DE NORMAS TECNICAS. **ABNT NBR 6023**: Informacao e documentacao - Referencias - Elaboracao. Rio de Janeiro: ABNT, 2018.",
      "",
      "[19] Trabalho apresentado em congresso/evento:",
      "SOBRENOME, Nome. Titulo do trabalho. In: NOME DO EVENTO, 5., ano, Cidade. **Anais [...]**. Cidade: Editora, ano. p. 100-112.",
      "",
      "[20] Video do YouTube:",
      "TITULO do video. [S. l.: s. n.], 2024. 1 video (12 min). Publicado pelo canal Nome do Canal. Disponivel em: https://youtube.com/watch?v=xxx. Acesso em: 10 nov. 2026.",
      "",
      "[21] Podcast / Audio:",
      "SOBRENOME, Nome (org.). **Titulo do episodio**. [Locucao de]: Nome. Cidade: Produtora, 15 ago. 2025. Podcast. Disponivel em: https://link. Acesso em: 10 nov. 2026.",
      "",
      "[22] Post em rede social (Instagram / LinkedIn):",
      "NOME DO PERFIL. **Texto inicial da publicacao**. Cidade, 10 jan. 2026. Instagram: @perfil. Disponivel em: https://instagram.com/p/xxx. Acesso em: 10 nov. 2026.",
      "",
      "[23] Relatorio tecnico / Dados oficiais (IBGE, IPEA):",
      "IBGE. **Pesquisa Nacional por Amostra de Domicilios**. Rio de Janeiro: IBGE, 2025. Disponivel em: https://ibge.gov.br. Acesso em: 10 nov. 2026.",
      "",
      "[24] Entrevista concedida:",
      "ENTREVISTADO, Nome. Titulo da entrevista. [Entrevista concedida a] Nome do Entrevistador. **Revista**, Cidade, v. 2, p. 12-18, 2024.",
      "",
      "[25] Documento sem data [s.d.] ou sem local [S.l.]:",
      "SOBRENOME, Nome. **Titulo**. [S. l.: s. n.], [2024?].",
      "",
      "3. CHECKLIST ANTI-REPROVACAO (10 PONTOS ANTES DE ENVIAR)",
      "[ ] Toda citacao no texto aparece na lista final de referencias?",
      "[ ] Toda referencia da lista foi realmente citada no texto?",
      "[ ] Os sobrenomes estao em CAIXA ALTA antes da virgula?",
      "[ ] A lista esta alinhada a esquerda (nao justificada)?",
      "[ ] Todos os links tem 'Disponivel em:' e 'Acesso em:'?",
      "[ ] Nenhum 'et al.' foi usado com menos de 4 autores (padrao tradicional)?",
      "[ ] O destaque (negrito ou italico) esta uniforme em todas as referencias?",
      "[ ] As aspas e parenteses estao fechados corretamente?",
      "[ ] Os meses abreviados estao em minusculo com ponto (exceto maio)?",
      "[ ] A ordem alfabetica foi conferida de A a Z?"
    ];

    if (includeBump) {
      lines.push(
        "",
        "====================================================================",
        "BONUS: CHECKLIST DE FORMATACAO WORD / GOOGLE DOCS ABNT",
        "====================================================================",
        "[ ] Papel A4 (21 x 29,7 cm)",
        "[ ] Margens: Superior 3 cm | Esquerda 3 cm | Inferior 2 cm | Direita 2 cm",
        "[ ] Fonte: Arial ou Times New Roman tamanho 12 no texto (10 em citacoes >3 linhas e notas)",
        "[ ] Espacamento entre linhas: 1,5 no corpo do texto; simples nas referencias e citacoes longas",
        "[ ] Recuo de paragrafo: 1,25 cm na primeira linha",
        "[ ] Paginacao: conta a partir da folha de rosto, mas so aparece visivel a partir da Introducao (canto superior direito)",
        "[ ] Sumario automatico: use estilos Titulo 1, Titulo 2, Titulo 3 antes de gerar o sumario"
      );
    }
    return lines.join("\r\n");
  }

  // --- Modal & Pix Logic ---
  var modal = document.getElementById("pix-modal");
  var modalClose = document.getElementById("modal-close");
  var orderBumpEl = document.getElementById("order-bump");
  var modalTotalEl = document.getElementById("modal-total");
  var qrContainer = document.getElementById("qr-container");
  var copyBrBtn = document.getElementById("copy-brcode");
  var copyKeyBtn = document.getElementById("copy-pixkey");
  var downloadBtn = document.getElementById("download-btn");
  var currentBrCode = "";

  function formatBRL(val) {
    return "R$ " + val.toFixed(2).replace(".", ",");
  }

  function refreshPixState() {
    var total = BASE_PRICE + (orderBumpEl.checked ? BUMP_PRICE : 0);
    modalTotalEl.textContent = formatBRL(total);
    currentBrCode = buildBrCode(total);
    renderQRSvg(qrContainer, currentBrCode);
  }

  function openModal() {
    refreshPixState();
    modal.classList.remove("hidden");
  }

  function closeModal() {
    modal.classList.add("hidden");
  }

  document.getElementById("cta-hero").addEventListener("click", openModal);
  document.getElementById("cta-mid").addEventListener("click", openModal);
  modalClose.addEventListener("click", closeModal);
  modal.addEventListener("click", function (e) {
    if (e.target === modal) closeModal();
  });
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
    a.download = "guia-abnt-nbr-6023-sem-erro.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
})();
