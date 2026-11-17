(function () {
  "use strict";

  var PIX_KEY = "vudotsur@gmail.com";
  var MERCHANT_NAME = "FELIPE LINARES";
  var MERCHANT_CITY = "LONDRINA";
  var TXID = "LT11";
  var BASE_PRICE = 37.00;
  var BUMP_PRICE = 14.90;

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

  // --- Interactive MEI Margin & Maquininha Simulator ---
  var simPriceEl = document.getElementById("sim-price");
  var simCostEl = document.getElementById("sim-cost");
  var simPaymentEl = document.getElementById("sim-payment");
  var simDasEl = document.getElementById("sim-das");

  var outFeeEl = document.getElementById("out-fee");
  var outTotalCostEl = document.getElementById("out-total-cost");
  var outNetProfitEl = document.getElementById("out-net-profit");
  var outMarginEl = document.getElementById("out-margin");
  var outDiagnosticEl = document.getElementById("out-diagnostic");

  function formatMoney(num) {
    return "R$ " + num.toFixed(2).replace(".", ",");
  }

  function updateSimulator() {
    if (!simPriceEl || !simCostEl || !simPaymentEl || !simDasEl) return;
    var price = Math.max(0, parseFloat(simPriceEl.value) || 0);
    var directCost = Math.max(0, parseFloat(simCostEl.value) || 0);
    var feePct = Math.max(0, parseFloat(simPaymentEl.value) || 0);
    var dasShare = Math.max(0, parseFloat(simDasEl.value) || 0);

    var cardFee = price * (feePct / 100);
    var totalCost = directCost + cardFee + dasShare;
    var netProfit = price - totalCost;
    var marginPct = price > 0 ? (netProfit / price) * 100 : 0;

    if (outFeeEl) outFeeEl.textContent = formatMoney(cardFee);
    if (outTotalCostEl) outTotalCostEl.textContent = formatMoney(totalCost);
    if (outNetProfitEl) {
      outNetProfitEl.textContent = formatMoney(netProfit);
      outNetProfitEl.className = netProfit >= 0 ? "text-base sm:text-lg font-bold text-emerald-700" : "text-base sm:text-lg font-bold text-rose-600";
    }
    if (outMarginEl) {
      outMarginEl.textContent = marginPct.toFixed(1).replace(".", ",") + "%";
      outMarginEl.className = marginPct >= 20 ? "text-base sm:text-lg font-bold text-emerald-700" : (marginPct > 0 ? "text-base sm:text-lg font-bold text-amber-600" : "text-base sm:text-lg font-bold text-rose-600");
    }

    if (outDiagnosticEl) {
      if (netProfit < 0) {
        outDiagnosticEl.className = "p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs sm:text-sm text-rose-900 font-medium";
        outDiagnosticEl.textContent = "ALERTA DE PREJUÍZO: O preço cobrado não cobre os custos diretos e as taxas da maquininha. Você está pagando para trabalhar nessa venda!";
      } else if (marginPct < 20) {
        outDiagnosticEl.className = "p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs sm:text-sm text-amber-900 font-medium";
        outDiagnosticEl.textContent = "Atenção: Margem muito apertada (" + marginPct.toFixed(1).replace(".", ",") + "%). Qualquer imprevisto pode anular seu lucro. Sugerimos repassar a taxa da maquininha ou renegociar insumos.";
      } else if (marginPct < 45) {
        outDiagnosticEl.className = "p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-xs sm:text-sm text-blue-900 font-medium";
        outDiagnosticEl.textContent = "Margem equilibrada (" + marginPct.toFixed(1).replace(".", ",") + "%): Cobre todos os custos e garante retirada justa de pró-labore com reserva segura.";
      } else {
        outDiagnosticEl.className = "p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-900 font-medium";
        outDiagnosticEl.textContent = "Excelente margem (" + marginPct.toFixed(1).replace(".", ",") + "%): Preço altamente lucrativo! O MEI tem folga para investir no negócio e retirar pró-labore saudável.";
      }
    }
  }

  [simPriceEl, simCostEl, simPaymentEl, simDasEl].forEach(function (el) {
    if (el) {
      el.addEventListener("input", updateSimulator);
      el.addEventListener("change", updateSimulator);
    }
  });
  updateSimulator();

  // --- Deliverables Generation (.csv Planilha 5 Abas + .txt Guia MEI) ---
  function buildDeliverableCsv(includeBump) {
    var lines = [];

    // ABA 1
    lines.push('=== ABA 1: CONFIGURACAO E DADOS DO MEI ===;;;;;;;');
    lines.push('Campo;Valor Cadastrado;Referencia Oficial;Status;;;;');
    lines.push('Razao Social / Nome Fantasia;Minha Empresa MEI;Cadastro no Portal do Empreendedor;Ativo;;;;');
    lines.push('CNPJ MEI;00.000.000/0001-00;Receita Federal do Brasil;Regular;;;;');
    lines.push('Teto Anual de Faturamento MEI;R$ 81.000,00;Limite Lei Complementar 123/2006;Vigente;;;;');
    lines.push('Media Mensal de Faturamento Maxima;R$ 6.750,00;Limite Proporcional Seguro;Meta Mensal;;;;');
    lines.push('Meta de Retirada de Pro-Labore;R$ 2.500,00;Definicao Individual Mensal;A Definir;;;;');
    lines.push('Reserva de Emergencia Recomendada (3 meses);R$ 7.500,00;Conta Segura PJ;Planejada;;;;');
    lines.push(';;;;;;;');

    // ABA 2
    lines.push('=== ABA 2: LANCAMENTOS DIARIOS DE CAIXA ===;;;;;;;');
    lines.push('Data;Tipo;Categoria;Descricao;Forma Pagamento;Valor Bruto (R$);Taxa Cartao (%);Valor Liquido (R$);Status');
    lines.push('01/11/2026;Entrada;Servico;Manutencao / Consultoria Cliente A;Pix Direto;250,00;0,0%;250,00;Recebido');
    lines.push('02/11/2026;Entrada;Produto;Venda de Mercadoria Loja;Cartao Credito 1x;180,00;3,5%;173,70;Recebido');
    lines.push('03/11/2026;Entrada;Servico;Atendimento em Domicilio;Cartao Debito;120,00;1,5%;118,20;Recebido');
    lines.push('04/11/2026;Saida;Insumos;Compra de Materiais e Embalagens;Pix Direto;95,00;0,0%;95,00;Pago');
    lines.push('05/11/2026;Entrada;Servico;Instalacao Cliente B;Cartao Credito 3x;350,00;6,5%;327,25;Recebido');
    lines.push('10/11/2026;Saida;Operacional;Conta de Internet / Celular PJ;Boleto;89,90;0,0%;89,90;Pago');
    lines.push('20/11/2026;Saida;Tributos;Boleto DAS Simples Nacional;Pix DAS;75,60;0,0%;75,60;Pago');
    lines.push(';;;;;;;');

    // ABA 3
    lines.push('=== ABA 3: DEMONSTRATIVO DE RESULTADO (DRE MENSAL) ===;;;;;;;');
    lines.push('Linha do Demonstrativo;Janeiro;Fevereiro;Marco;Abril;Maio;Junho;Total Semestre');
    lines.push('(+) FATURAMENTO BRUTO TOTAL;4.200,00;4.800,00;5.100,00;4.950,00;5.400,00;5.800,00;30.250,00');
    lines.push('(-) Custos Diretos com Insumos / Mercadorias;1.100,00;1.250,00;1.300,00;1.200,00;1.400,00;1.500,00;7.750,00');
    lines.push('(-) Despesas com Taxas de Maquininha e Cartao;126,00;144,00;153,00;148,50;162,00;174,00;907,50');
    lines.push('(=) MARGEM BRUTA DA EMPRESA;2.974,00;3.406,00;3.647,00;3.601,50;3.838,00;4.126,00;21.592,50');
    lines.push('(-) Custos Fixos Operacionais (Luz, Tel, Desloc);380,00;380,00;390,00;385,00;410,00;420,00;2.365,00');
    lines.push('(-) Boleto DAS Simples Nacional;75,60;75,60;75,60;75,60;75,60;75,60;453,60');
    lines.push('(=) LUCRO LIQUIDO REAL NO BOLSO;2.518,40;2.950,40;3.181,40;3.140,90;3.352,40;3.630,40;18.773,90');
    lines.push('(-) Retirada de Pro-Labore (Pessoa Fisica);2.000,00;2.200,00;2.400,00;2.400,00;2.500,00;2.600,00;14.100,00');
    lines.push('(=) Saldo Retido no Caixa PJ (Reserva);518,40;750,40;781,40;740,90;852,40;1.030,40;4.673,90');
    lines.push(';;;;;;;');

    // ABA 4
    lines.push('=== ABA 4: DASHBOARD VISUAL E INDICADORES CHAVE ===;;;;;;;');
    lines.push('Indicador Estrategico;Valor Real;Meta / Teto Seguro;Diagnostico;;;;');
    lines.push('Faturamento Acumulado no Ano;R$ 30.250,00;R$ 81.000,00;Dentro do limite seguro (37% do teto);;;;');
    lines.push('Folga Restante ate o Teto MEI;R$ 50.750,00;Limite Anual;Sem risco de desenquadramento imediato;;;;');
    lines.push('Media de Faturamento Mensal;R$ 5.041,66;R$ 6.750,00;Ritmo de crescimento sustentavel;;;;');
    lines.push('Margem Liquida Media Real;62,0%;Acima de 40%;Negocio altamente rentavel;;;;');
    lines.push('Total Pago em Taxas de Maquininha;R$ 907,50;Acompanhamento;Reduzir estimulando pagamento no Pix;;;;');
    lines.push('Reserva Atual de Emergencia PJ;R$ 4.673,90;R$ 7.500,00;62% da meta de protecao construida;;;;');
    lines.push(';;;;;;;');

    // ABA 5
    lines.push('=== ABA 5: CONTROLE ANUAL DO BOLETO DAS E DECLARACAO DASN ===;;;;;;;');
    lines.push('Mes Competencia;Vencimento;Valor DAS (R$);Vendas com NF;Vendas sem NF;Total Faturado no Mes;Situacao DAS;Data Pagamento');
    lines.push('Janeiro;20/02/2026;75,60;1.800,00;2.400,00;4.200,00;Quitado;18/02/2026');
    lines.push('Fevereiro;20/03/2026;75,60;2.100,00;2.700,00;4.800,00;Quitado;19/03/2026');
    lines.push('Marco;20/04/2026;75,60;2.400,00;2.700,00;5.100,00;Quitado;17/04/2026');
    lines.push('Abril;20/05/2026;75,60;2.200,00;2.750,00;4.950,00;Quitado;19/05/2026');
    lines.push('Maio;20/06/2026;75,60;2.500,00;2.900,00;5.400,00;Quitado;18/06/2026');
    lines.push('Junho;20/07/2026;75,60;2.800,00;3.000,00;5.800,00;Quitado;19/07/2026');
    lines.push('Julho;20/08/2026;75,60;0,00;0,00;0,00;A Vencer;-');
    lines.push('Agosto;20/09/2026;75,60;0,00;0,00;0,00;A Vencer;-');
    lines.push('Setembro;20/10/2026;75,60;0,00;0,00;0,00;A Vencer;-');
    lines.push('Outubro;20/11/2026;75,60;0,00;0,00;0,00;A Vencer;-');
    lines.push('Novembro;20/12/2026;75,60;0,00;0,00;0,00;A Vencer;-');
    lines.push('Dezembro;20/01/2027;75,60;0,00;0,00;0,00;A Vencer;-');

    if (includeBump) {
      lines.push(';;;;;;;');
      lines.push('=== ABA BONUS: CALCULADORA DE PRECIFICACAO & TAXAS DE MAQUININHA ===;;;;;;;');
      lines.push('Modalidade de Pagamento;Taxa Media Mercado;Desconto em R$ 100;Preco Ajustado para Sobrar R$ 100 Liquidos;Margem Recomendada');
      lines.push('Pix Direto na Conta PJ;0,00%;R$ 0,00;R$ 100,00;50% a 70%');
      lines.push('Cartao de Debito;1,49%;R$ 1,49;R$ 101,51;45% a 65%');
      lines.push('Cartao de Credito 1x (A Vista);3,49%;R$ 3,49;R$ 103,62;40% a 60%');
      lines.push('Cartao de Credito 2x;5,49%;R$ 5,49;R$ 105,81;35% a 55%');
      lines.push('Cartao de Credito 3x;6,99%;R$ 6,99;R$ 107,52;35% a 55%');
      lines.push('Cartao de Credito 6x;10,99%;R$ 10,99;R$ 112,35;30% a 50%');
      lines.push('Cartao de Credito 12x;16,49%;R$ 16,49;R$ 119,75;30% a 45%');
      lines.push(';;;;;');
      lines.push('FORMULA DE REPASSE JUSTO: Preco Final = (Custo + Margem Desejada) / (1 - Taxa Percentual da Maquininha);;;;;');
    }

    return "\uFEFF" + lines.join("\r\n");
  }

  function buildDeliverableTxt(includeBump) {
    var txt = [
      "=======================================================================",
      "GUIA PRATICO MEI LUCRATIVO: 5 PASSOS PARA SEPARAR A CONTA FISICA DA PJ",
      "=======================================================================",
      "",
      "1. A REGRA DE OURO DAS 2 CONTAS BANCARIAS",
      "Nunca receba dinheiro de clientes na sua conta bancaria pessoal (PF).",
      "Abra hoje mesmo uma conta digital PJ gratuita (Nubank PJ, Inter PJ, C6 PJ,",
      "Mercado Pago ou Cora). Toda e qualquer entrada de servico ou venda deve",
      "cair exclusivamente nessa conta PJ.",
      "",
      "2. DEFINA UM PRO-LABORE MENSAL FIXO",
      "A empresa nao e o seu caixa eletronico pessoal. Defina uma data fixa no mes",
      "(por exemplo, dia 05 ou dia 10) e transfira um valor fixo da conta PJ para",
      "a sua conta PF a titulo de Pro-Labore. Se sobrar dinheiro na PJ, deixe la",
      "como Reserva de Emergencia da empresa.",
      "",
      "3. PAGUE AS CONTAS PESSOAIS APENAS COM O PRO-LABORE",
      "Aluguel de casa, compras de supermercado, lazer e escola dos filhos devem",
      "ser pagos 100% de dentro da sua conta fisica. Se a conta fisica acabar,",
      "nao 'assalte' a conta da empresa: reduza gastos pessoais.",
      "",
      "4. RESERVE O BOLETO DAS ANTES DE GASTAR",
      "Todo dia 20 vence o boleto DAS do Simples Nacional. O valor e fixo e garante",
      "sua aposentadoria por idade, auxilio-doenca e salario-maternidade pelo INSS.",
      "Reserve os ~R$ 75,00 logo nos primeiros dias do mes.",
      "",
      "5. DECLARACAO ANUAL (DASN-SIMEI) SEM MEDO",
      "Com a Aba 5 da sua Planilha devidamente preenchida, em janeiro basta somar",
      "o faturamento com nota fiscal e o faturamento sem nota fiscal e digitar no",
      "portal do Empreendedor em menos de 5 minutos, sem risco de cair na malha fina."
    ].join("\n");

    if (includeBump) {
      txt += "\n\n" + [
        "=======================================================================",
        "BONUS: MANUAL DE REPASSE DE TAXAS DE MAQUININHA SEM ESPANTAR CLIENTES",
        "=======================================================================",
        "",
        "- REGRA 1: Sempre ofereca desconto no Pix antes que o cliente puxe o cartao.",
        "  Exemplo: 'No cartao fica R$ 150, mas se fizer no Pix direto tem 5% de desconto e sai por R$ 142'.",
        "- REGRA 2: No parcelamento em 6x a 12x, nunca absorva a taxa de 10% a 16% sozinho.",
        "  Explique que a maquininha cobra juros de parcelamento da operadora e apresente",
        "  as duas opcoes com total transparencia para o cliente escolher.",
        "- REGRA 3: Use a formula de precificacao da Aba Bonus da sua planilha para",
        "  saber de antemao o valor minimo que voce pode aceitar em cada numero de parcelas."
      ].join("\n");
    }

    return txt;
  }

  // --- Modal & Pix Logic ---
  var modal = document.getElementById("pix-modal");
  var modalClose = document.getElementById("modal-close");
  var orderBumpEl = document.getElementById("order-bump");
  var modalTotalEl = document.getElementById("modal-total");
  var qrContainer = document.getElementById("qr-container");
  var copyBrBtn = document.getElementById("copy-brcode");
  var copyKeyBtn = document.getElementById("copy-pixkey");
  var btnDownloadCsv = document.getElementById("btn-download-csv");
  var btnDownloadTxt = document.getElementById("btn-download-txt");

  var currentBrCode = "";

  function refreshPixState() {
    var isBump = Boolean(orderBumpEl && orderBumpEl.checked);
    var total = BASE_PRICE + (isBump ? BUMP_PRICE : 0);
    if (modalTotalEl) {
      modalTotalEl.textContent = formatMoney(total);
    }
    currentBrCode = buildBrCode(total);
    if (qrContainer) {
      renderQRSvg(qrContainer, currentBrCode);
    }
  }

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

  if (btnDownloadCsv) {
    btnDownloadCsv.addEventListener("click", function () {
      var isBump = Boolean(orderBumpEl && orderBumpEl.checked);
      var csvContent = buildDeliverableCsv(isBump);
      triggerDownload("kit-mei-fluxo-de-caixa-5-abas.csv", csvContent, "text/csv;charset=utf-8;");
    });
  }

  if (btnDownloadTxt) {
    btnDownloadTxt.addEventListener("click", function () {
      var isBump = Boolean(orderBumpEl && orderBumpEl.checked);
      var txtContent = buildDeliverableTxt(isBump);
      triggerDownload("guia-pratico-mei-lucrativo.txt", txtContent, "text/plain;charset=utf-8;");
    });
  }

})();
