(function () {
  "use strict";

  const PIX_KEY = "vudotsur@gmail.com";
  const MERCHANT_NAME = "VUDOTSUR";
  const MERCHANT_CITY = "SAO PAULO";
  const TXID = "LT03";
  const BASE_PRICE = 19.90;
  const BUMP_PRICE = 9.90;
  const SVG_NS = "http://www.w3.org/2000/svg";

  function formatTlv(id, value) {
    const str = String(value);
    return id + String(str.length).padStart(2, "0") + str;
  }

  function computeCrc16Ccitt(payload) {
    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i) << 8;
      for (let bit = 0; bit < 8; bit++) {
        crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
  }

  function generatePixBrCode(pixKey, amount, merchantName, merchantCity, txid) {
    const name = String(merchantName || MERCHANT_NAME).toUpperCase().replace(/[^A-Z0-9 .\-/]/g, "").slice(0, 25) || MERCHANT_NAME;
    const city = String(merchantCity || MERCHANT_CITY).toUpperCase().replace(/[^A-Z0-9 .\-/]/g, "").slice(0, 15) || MERCHANT_CITY;
    const cleanTxid = String(txid || TXID).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 25) || "***";
    const merchantAccount = formatTlv("26", formatTlv("00", "br.gov.bcb.pix") + formatTlv("01", pixKey));
    const txidTlv = formatTlv("62", formatTlv("05", cleanTxid));
    const body =
      formatTlv("00", "01") + merchantAccount + formatTlv("52", "0000") +
      formatTlv("53", "986") + formatTlv("54", Number(amount).toFixed(2)) +
      formatTlv("58", "BR") + formatTlv("59", name) + formatTlv("60", city) + txidTlv + "6304";
    return body + computeCrc16Ccitt(body);
  }

  const GF_EXP = new Uint8Array(512);
  const GF_LOG = new Uint8Array(256);
  (function () {
    let x = 1;
    for (let i = 0; i < 255; i++) { GF_EXP[i] = x; GF_LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
    for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
  })();

  function gfMul(a, b) { return a === 0 || b === 0 ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]]; }

  function rsComputeRemainder(data, ecCount) {
    let poly = [1];
    for (let i = 0; i < ecCount; i++) {
      const next = new Array(poly.length + 1).fill(0);
      for (let j = 0; j < poly.length; j++) { next[j] ^= poly[j]; next[j + 1] ^= gfMul(poly[j], GF_EXP[i]); }
      poly = next;
    }
    const res = new Uint8Array(data.length + ecCount);
    res.set(data, 0);
    for (let i = 0; i < data.length; i++) {
      const coef = res[i];
      if (coef !== 0) for (let j = 0; j < poly.length; j++) res[i + j] ^= gfMul(poly[j], coef);
    }
    return res.slice(data.length);
  }

  const QR_VERSIONS = [
    { version: 4, size: 33, align: [6, 26], blocks: 1, dataPerBlock: 80, ecPerBlock: 20, remBits: 7 },
    { version: 5, size: 37, align: [6, 30], blocks: 1, dataPerBlock: 108, ecPerBlock: 26, remBits: 7 },
    { version: 6, size: 41, align: [6, 34], blocks: 2, dataPerBlock: 68, ecPerBlock: 18, remBits: 7 },
    { version: 7, size: 45, align: [6, 22, 38], blocks: 2, dataPerBlock: 78, ecPerBlock: 20, remBits: 0 },
    { version: 8, size: 49, align: [6, 24, 42], blocks: 2, dataPerBlock: 97, ecPerBlock: 24, remBits: 0 }
  ];

  function encodeQrBytes(text) {
    const utf8 = new TextEncoder().encode(text);
    const totalNeededBits = 4 + 8 + utf8.length * 8 + 4;
    let spec = QR_VERSIONS[QR_VERSIONS.length - 1];
    for (let i = 0; i < QR_VERSIONS.length; i++) {
      if (totalNeededBits <= QR_VERSIONS[i].blocks * QR_VERSIONS[i].dataPerBlock * 8) { spec = QR_VERSIONS[i]; break; }
    }
    const totalDataBytes = spec.blocks * spec.dataPerBlock;
    const bits = [];
    function pushBits(val, len) { for (let b = len - 1; b >= 0; b--) bits.push((val >>> b) & 1); }
    pushBits(0b0100, 4);
    pushBits(utf8.length, 8);
    for (let i = 0; i < utf8.length; i++) pushBits(utf8[i], 8);
    pushBits(0, Math.min(4, totalDataBytes * 8 - bits.length));
    while (bits.length % 8 !== 0) bits.push(0);

    const dataBytes = [];
    for (let i = 0; i < bits.length; i += 8) {
      let byteVal = 0;
      for (let j = 0; j < 8; j++) byteVal = (byteVal << 1) | bits[i + j];
      dataBytes.push(byteVal);
    }
    const padBytes = [0xEC, 0x11];
    let padIdx = 0;
    while (dataBytes.length < totalDataBytes) dataBytes.push(padBytes[padIdx++ % 2]);

    const dataBlocks = [], ecBlocks = [];
    for (let b = 0; b < spec.blocks; b++) {
      const block = new Uint8Array(dataBytes.slice(b * spec.dataPerBlock, (b + 1) * spec.dataPerBlock));
      dataBlocks.push(block);
      ecBlocks.push(rsComputeRemainder(block, spec.ecPerBlock));
    }
    const codewords = [];
    for (let i = 0; i < spec.dataPerBlock; i++) for (let b = 0; b < spec.blocks; b++) codewords.push(dataBlocks[b][i]);
    for (let i = 0; i < spec.ecPerBlock; i++) for (let b = 0; b < spec.blocks; b++) codewords.push(ecBlocks[b][i]);

    const bitStream = [];
    for (let i = 0; i < codewords.length; i++) for (let bit = 7; bit >= 0; bit--) bitStream.push((codewords[i] >>> bit) & 1);
    for (let r = 0; r < spec.remBits; r++) bitStream.push(0);
    return { spec: spec, bitStream: bitStream };
  }

  function buildQrMatrix(text) {
    const encoded = encodeQrBytes(text), spec = encoded.spec, size = spec.size;
    const modules = Array.from({ length: size }, function () { return new Int8Array(size); });
    const isFunc = Array.from({ length: size }, function () { return new Uint8Array(size); });
    function setFunc(r, c, dark) { if (r >= 0 && r < size && c >= 0 && c < size) { modules[r][c] = dark ? 1 : -1; isFunc[r][c] = 1; } }
    function drawFinder(top, left) {
      for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) {
        const rr = top + r, cc = left + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        const inBox = r >= 0 && r <= 6 && c >= 0 && c <= 6;
        setFunc(rr, cc, inBox && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)));
      }
    }
    drawFinder(0, 0); drawFinder(0, size - 7); drawFinder(size - 7, 0);
    for (let i = 0; i < spec.align.length; i++) for (let j = 0; j < spec.align.length; j++) {
      const r = spec.align[i], c = spec.align[j];
      if ((r === 6 && c === 6) || (r === 6 && c === size - 7) || (r === size - 7 && c === 6)) continue;
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) setFunc(r + dr, c + dc, Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0));
    }
    for (let i = 8; i < size - 8; i++) { if (!isFunc[6][i]) setFunc(6, i, i % 2 === 0); if (!isFunc[i][6]) setFunc(i, 6, i % 2 === 0); }
    setFunc(size - 8, 8, true);
    for (let i = 0; i < 9; i++) if (i !== 6) { isFunc[8][i] = 1; isFunc[i][8] = 1; }
    for (let i = 0; i < 8; i++) { isFunc[8][size - 1 - i] = 1; isFunc[size - 1 - i][8] = 1; }
    if (spec.version >= 7) {
      let rem = spec.version;
      for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
      const verBits = (spec.version << 12) | rem;
      for (let i = 0; i < 18; i++) {
        const dark = ((verBits >>> i) & 1) === 1;
        setFunc(Math.floor(i / 3), size - 11 + (i % 3), dark);
        setFunc(size - 11 + (i % 3), Math.floor(i / 3), dark);
      }
    }
    const stream = encoded.bitStream;
    let bitIdx = 0, upward = true;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let step = 0; step < size; step++) {
        const r = upward ? size - 1 - step : step;
        for (let dx = 0; dx < 2; dx++) {
          const c = right - dx;
          if (!isFunc[r][c]) modules[r][c] = (bitIdx < stream.length ? stream[bitIdx++] : 0) ? 1 : -1;
        }
      }
      upward = !upward;
    }
    function maskCond(p, r, c) {
      switch (p) {
        case 0: return (r + c) % 2 === 0;
        case 1: return r % 2 === 0;
        case 2: return c % 3 === 0;
        case 3: return (r + c) % 3 === 0;
        case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
        case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
        case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
        default: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
      }
    }
    function applyMask(p) {
      const grid = modules.map(function (row, r) {
        return row.map(function (val, c) { return isFunc[r][c] ? val === 1 : (maskCond(p, r, c) ? val !== 1 : val === 1); });
      });
      let penalty = 0;
      for (let r = 0; r < size; r++) {
        let run = 1;
        for (let c = 1; c < size; c++) { if (grid[r][c] === grid[r][c - 1]) { run++; if (run === 5) penalty += 3; else if (run > 5) penalty += 1; } else run = 1; }
      }
      for (let c = 0; c < size; c++) {
        let run = 1;
        for (let r = 1; r < size; r++) { if (grid[r][c] === grid[r - 1][c]) { run++; if (run === 5) penalty += 3; else if (run > 5) penalty += 1; } else run = 1; }
      }
      for (let r = 0; r < size - 1; r++) for (let c = 0; c < size - 1; c++) {
        const v = grid[r][c];
        if (v === grid[r][c + 1] && v === grid[r + 1][c] && v === grid[r + 1][c + 1]) penalty += 3;
      }
      return { grid: grid, penalty: penalty };
    }
    let bestPattern = 0, bestResult = applyMask(0);
    for (let p = 1; p < 8; p++) { const cand = applyMask(p); if (cand.penalty < bestResult.penalty) { bestPattern = p; bestResult = cand; } }
    const formatData = (0b01 << 3) | bestPattern;
    let rem = formatData;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const formatBits = ((formatData << 10) | rem) ^ 0x5412;
    const finalGrid = bestResult.grid;
    for (let i = 0; i < 15; i++) {
      const dark = ((formatBits >>> i) & 1) === 1;
      if (i < 6) finalGrid[8][i] = dark; else if (i < 8) finalGrid[8][i + 1] = dark; else finalGrid[8][size - 15 + i] = dark;
      if (i < 8) finalGrid[size - 1 - i][8] = dark; else if (i < 9) finalGrid[15 - i][8] = dark; else finalGrid[14 - i][8] = dark;
    }
    return finalGrid;
  }

  function renderQrSvg(text) {
    const grid = buildQrMatrix(text), size = grid.length, quiet = 4, total = size + quiet * 2;
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + total + " " + total);
    svg.setAttribute("class", "w-full h-full");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "QR Code Pix");
    const bg = document.createElementNS(SVG_NS, "rect");
    bg.setAttribute("width", String(total)); bg.setAttribute("height", String(total)); bg.setAttribute("fill", "#ffffff");
    svg.appendChild(bg);
    const parts = [];
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (grid[r][c]) parts.push("M" + (c + quiet) + "," + (r + quiet) + "h1v1h-1z");
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", parts.join("")); path.setAttribute("fill", "#09090b");
    svg.appendChild(path);
    return svg;
  }

  // --- CLT vs PJ Calculator ---
  function formatBrl(val) {
    return "R$ " + Number(val).toFixed(2).replace(".", ",");
  }

  function estimateCltNet(gross) {
    const inss = Math.min(gross * 0.11, 908.85);
    const baseIrrf = Math.max(0, gross - inss);
    let irrf = 0;
    if (baseIrrf > 4664.68) irrf = baseIrrf * 0.275 - 896.00;
    else if (baseIrrf > 3751.05) irrf = baseIrrf * 0.225 - 662.77;
    else if (baseIrrf > 2826.65) irrf = baseIrrf * 0.15 - 381.44;
    else if (baseIrrf > 2259.20) irrf = baseIrrf * 0.075 - 169.44;
    return Math.max(0, gross - inss - Math.max(0, irrf));
  }

  function updateCltPj() {
    const cltGrossEl = document.getElementById("clt-gross");
    const cltBenEl = document.getElementById("clt-benefits");
    const pjGrossEl = document.getElementById("pj-gross");
    const pjRateEl = document.getElementById("pj-tax-rate");
    if (!cltGrossEl || !pjGrossEl) return;

    const cltGross = Math.max(0, Number(cltGrossEl.value) || 0);
    const cltBen = Math.max(0, Number(cltBenEl ? cltBenEl.value : 0) || 0);
    const pjGross = Math.max(0, Number(pjGrossEl.value) || 0);
    const pjTaxRate = Number(pjRateEl ? pjRateEl.value : 0.06) || 0.06;

    const cltNet = estimateCltNet(cltGross);
    const cltFgts = cltGross * 0.08;
    const clt13AndFerias = (cltNet * (1 + 1 / 3)) / 12;
    const cltRealTotal = cltNet + cltFgts + clt13AndFerias + cltBen;

    const pjTax = pjGross * pjTaxRate;
    const pjInssProLabore = 166.98;
    const pjAccountant = 250.00;
    const pjRealTotal = Math.max(0, pjGross - pjTax - pjInssProLabore - pjAccountant);

    const breakEvenPj = (cltRealTotal + pjInssProLabore + pjAccountant) / (1 - pjTaxRate);

    const cltOut = document.getElementById("clt-real-total");
    const pjOut = document.getElementById("pj-real-total");
    const verdictOut = document.getElementById("clt-pj-verdict");

    if (cltOut) cltOut.textContent = formatBrl(cltRealTotal);
    if (pjOut) pjOut.textContent = formatBrl(pjRealTotal);

    if (verdictOut) {
      const diff = pjRealTotal - cltRealTotal;
      if (diff >= 0) {
        verdictOut.textContent = "Veredito: PJ compensa (+" + formatBrl(diff) + "/mês). Mínimo para empatar: " + formatBrl(breakEvenPj) + ".";
      } else {
        verdictOut.textContent = "Veredito: CLT ainda ganha (" + formatBrl(Math.abs(diff)) + "/mês a mais). Peça pelo menos " + formatBrl(breakEvenPj) + " no PJ.";
      }
    }
  }

  // --- Pix Modal & Downloads ---
  const modal = document.getElementById("pix-modal");
  const bumpCheckbox = document.getElementById("order-bump-checkbox");
  const totalPriceEl = document.getElementById("modal-total-price");
  const qrContainer = document.getElementById("qr-svg-container");
  const brcodeInput = document.getElementById("pix-brcode-input");

  function refreshPixPayment() {
    const withBump = Boolean(bumpCheckbox && bumpCheckbox.checked);
    const total = withBump ? BASE_PRICE + BUMP_PRICE : BASE_PRICE;
    if (totalPriceEl) totalPriceEl.textContent = formatBrl(total);
    const brcode = generatePixBrCode(PIX_KEY, total, MERCHANT_NAME, MERCHANT_CITY, TXID);
    if (brcodeInput) brcodeInput.value = brcode;
    if (qrContainer) {
      qrContainer.replaceChildren();
      qrContainer.appendChild(renderQrSvg(brcode));
    }
  }

  function openModal() { if (modal) { refreshPixPayment(); modal.classList.remove("hidden"); } }
  function closeModal() { if (modal) modal.classList.add("hidden"); }

  function copyText(text, btn, defaultLabel) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        btn.textContent = "Copiado!";
        setTimeout(function () { btn.textContent = defaultLabel; }, 2000);
      });
    }
  }

  function downloadCsvSheet() {
    const withBump = Boolean(bumpCheckbox && bumpCheckbox.checked);
    const rows = [
      "\uFEFFCenario;Bruto_Mensal_R$;Imposto_Simples_ou_INSS_IRRF_R$;Contador_R$;Beneficios_ou_FGTS_R$;Reserva_13_Ferias_R$;Liquido_Real_Mensal_R$",
      "CLT_Base;6000.00;1185.00;0.00;1430.00;535.00;6780.00",
      "PJ_Anexo_III_6pct;9000.00;706.98;250.00;0.00;0.00;8043.02",
      "PJ_Anexo_V_15_5pct;9000.00;1561.98;250.00;0.00;0.00;7188.02",
      "",
      "CHECKLIST_CONTRATO_PJ;ITEM;STATUS;OBSERVACAO",
      "1;Clausula de aviso previo reciproco (30 dias);Verificar;Evita desligamento no mesmo dia sem reserva",
      "2;Multa de exclusividade abusiva;Remover;PJ nao pode ter subordinacao nem exclusividade total",
      "3;Recesso anual remunerado (15 a 30 dias);Negociar;Garantir descanso sem corte de faturamento",
      "4;Data fixa de pagamento + multa por atraso;Exigir;Evita atrasos de caixa da contratante"
    ];
    if (withBump) {
      rows.push("", "BONUS_RESERVA_PJ;Mes;Guardar_Ferias_10pct;Guardar_13o_8_33pct;Total_Reserva_Mensal");
      rows.push("Exemplo_9000;Mes_1;900.00;750.00;1650.00");
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kit_decisao_clt_vs_pj_2026.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  document.querySelectorAll("[data-open-pix]").forEach(function (btn) { btn.addEventListener("click", openModal); });
  const closeBtn = document.getElementById("close-pix-modal");
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (modal) modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
  if (bumpCheckbox) bumpCheckbox.addEventListener("change", refreshPixPayment);

  const btnCopyKey = document.getElementById("btn-copy-key");
  if (btnCopyKey) btnCopyKey.addEventListener("click", function () { copyText(PIX_KEY, btnCopyKey, "Copiar Chave"); });

  const btnCopyBrcode = document.getElementById("btn-copy-brcode");
  if (btnCopyBrcode) btnCopyBrcode.addEventListener("click", function () { copyText(brcodeInput ? brcodeInput.value : "", btnCopyBrcode, "Copiar Código"); });

  const btnCsv = document.getElementById("btn-download-csv");
  if (btnCsv) btnCsv.addEventListener("click", downloadCsvSheet);

  ["clt-gross", "clt-benefits", "pj-gross", "pj-tax-rate"].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) { el.addEventListener("input", updateCltPj); el.addEventListener("change", updateCltPj); }
  });

  updateCltPj();
})();
