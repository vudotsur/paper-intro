(function () {
  "use strict";

  const PIX_KEY = "vudotsur@gmail.com";
  const MERCHANT_NAME = "VUDOTSUR";
  const MERCHANT_CITY = "SAO PAULO";
  const TXID = "LT01";
  const BASE_PRICE = 9.90;
  const BUMP_PRICE = 7.90;
  const SVG_NS = "http://www.w3.org/2000/svg";

  // --- EMVCo Pix BR Code Generator ---
  function formatTlv(id, value) {
    const str = String(value);
    const len = String(str.length).padStart(2, "0");
    return id + len + str;
  }

  function computeCrc16Ccitt(payload) {
    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i) << 8;
      for (let bit = 0; bit < 8; bit++) {
        if ((crc & 0x8000) !== 0) {
          crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
        } else {
          crc = (crc << 1) & 0xFFFF;
        }
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
  }

  function generatePixBrCode(pixKey, amount, merchantName, merchantCity, txid) {
    const name = String(merchantName || MERCHANT_NAME).toUpperCase().replace(/[^A-Z0-9 .\-/]/g, "").slice(0, 25) || MERCHANT_NAME;
    const city = String(merchantCity || MERCHANT_CITY).toUpperCase().replace(/[^A-Z0-9 .\-/]/g, "").slice(0, 15) || MERCHANT_CITY;
    const cleanTxid = String(txid || TXID).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 25) || "***";

    const gui = formatTlv("00", "br.gov.bcb.pix");
    const key = formatTlv("01", pixKey);
    const merchantAccount = formatTlv("26", gui + key);
    const txidTlv = formatTlv("62", formatTlv("05", cleanTxid));
    const amountFormatted = Number(amount).toFixed(2);

    const body =
      formatTlv("00", "01") +
      merchantAccount +
      formatTlv("52", "0000") +
      formatTlv("53", "986") +
      formatTlv("54", amountFormatted) +
      formatTlv("58", "BR") +
      formatTlv("59", name) +
      formatTlv("60", city) +
      txidTlv +
      "6304";

    return body + computeCrc16Ccitt(body);
  }

  // --- Pure-JS QR Code Generator (Byte-Mode, Versions 4-8, ECC-L, SVG Path) ---
  const GF_EXP = new Uint8Array(512);
  const GF_LOG = new Uint8Array(256);
  (function initGaloisField() {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      GF_EXP[i] = x;
      GF_LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return GF_EXP[GF_LOG[a] + GF_LOG[b]];
  }

  function rsGeneratorPoly(ecCount) {
    let poly = [1];
    for (let i = 0; i < ecCount; i++) {
      const next = new Array(poly.length + 1).fill(0);
      const factor = GF_EXP[i];
      for (let j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMul(poly[j], factor);
      }
      poly = next;
    }
    return poly;
  }

  function rsComputeRemainder(data, ecCount) {
    const gen = rsGeneratorPoly(ecCount);
    const res = new Uint8Array(data.length + ecCount);
    res.set(data, 0);
    for (let i = 0; i < data.length; i++) {
      const coef = res[i];
      if (coef !== 0) {
        for (let j = 0; j < gen.length; j++) res[i + j] ^= gfMul(gen[j], coef);
      }
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
      if (totalNeededBits <= QR_VERSIONS[i].blocks * QR_VERSIONS[i].dataPerBlock * 8) {
        spec = QR_VERSIONS[i];
        break;
      }
    }
    const totalDataBytes = spec.blocks * spec.dataPerBlock;
    const bits = [];
    function pushBits(val, len) {
      for (let b = len - 1; b >= 0; b--) bits.push((val >>> b) & 1);
    }
    pushBits(0b0100, 4);
    pushBits(utf8.length, 8);
    for (let i = 0; i < utf8.length; i++) pushBits(utf8[i], 8);
    const maxBits = totalDataBytes * 8;
    pushBits(0, Math.min(4, maxBits - bits.length));
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

    const dataBlocks = [];
    const ecBlocks = [];
    for (let b = 0; b < spec.blocks; b++) {
      const start = b * spec.dataPerBlock;
      const block = new Uint8Array(dataBytes.slice(start, start + spec.dataPerBlock));
      dataBlocks.push(block);
      ecBlocks.push(rsComputeRemainder(block, spec.ecPerBlock));
    }

    const codewords = [];
    for (let i = 0; i < spec.dataPerBlock; i++) {
      for (let b = 0; b < spec.blocks; b++) codewords.push(dataBlocks[b][i]);
    }
    for (let i = 0; i < spec.ecPerBlock; i++) {
      for (let b = 0; b < spec.blocks; b++) codewords.push(ecBlocks[b][i]);
    }

    const bitStream = [];
    for (let i = 0; i < codewords.length; i++) {
      for (let bit = 7; bit >= 0; bit--) bitStream.push((codewords[i] >>> bit) & 1);
    }
    for (let r = 0; r < spec.remBits; r++) bitStream.push(0);
    return { spec: spec, bitStream: bitStream };
  }

  function buildQrMatrix(text) {
    const encoded = encodeQrBytes(text);
    const spec = encoded.spec;
    const size = spec.size;
    const modules = Array.from({ length: size }, function () { return new Int8Array(size); });
    const isFunc = Array.from({ length: size }, function () { return new Uint8Array(size); });

    function setFunc(r, c, dark) {
      if (r >= 0 && r < size && c >= 0 && c < size) {
        modules[r][c] = dark ? 1 : -1;
        isFunc[r][c] = 1;
      }
    }

    function drawFinder(top, left) {
      for (let r = -1; r <= 7; r++) {
        for (let c = -1; c <= 7; c++) {
          const rr = top + r;
          const cc = left + c;
          if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
          const inBox = r >= 0 && r <= 6 && c >= 0 && c <= 6;
          const border = r === 0 || r === 6 || c === 0 || c === 6;
          const center = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          setFunc(rr, cc, inBox && (border || center));
        }
      }
    }

    function drawAlignment(cr, cc) {
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          setFunc(cr + r, cc + c, Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0));
        }
      }
    }

    drawFinder(0, 0);
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);

    for (let i = 0; i < spec.align.length; i++) {
      for (let j = 0; j < spec.align.length; j++) {
        const r = spec.align[i];
        const c = spec.align[j];
        if ((r === 6 && c === 6) || (r === 6 && c === size - 7) || (r === size - 7 && c === 6)) continue;
        drawAlignment(r, c);
      }
    }

    for (let i = 8; i < size - 8; i++) {
      const dark = i % 2 === 0;
      if (!isFunc[6][i]) setFunc(6, i, dark);
      if (!isFunc[i][6]) setFunc(i, 6, dark);
    }
    setFunc(size - 8, 8, true);

    for (let i = 0; i < 9; i++) {
      if (i !== 6) { isFunc[8][i] = 1; isFunc[i][8] = 1; }
    }
    for (let i = 0; i < 8; i++) {
      isFunc[8][size - 1 - i] = 1;
      isFunc[size - 1 - i][8] = 1;
    }

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
    let bitIdx = 0;
    let upward = true;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let step = 0; step < size; step++) {
        const r = upward ? size - 1 - step : step;
        for (let dx = 0; dx < 2; dx++) {
          const c = right - dx;
          if (!isFunc[r][c]) {
            const bit = bitIdx < stream.length ? stream[bitIdx++] : 0;
            modules[r][c] = bit ? 1 : -1;
          }
        }
      }
      upward = !upward;
    }

    function maskCond(pattern, r, c) {
      switch (pattern) {
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

    function applyMaskAndScore(pattern) {
      const grid = modules.map(function (row, r) {
        return row.map(function (val, c) {
          if (isFunc[r][c]) return val === 1;
          return maskCond(pattern, r, c) ? val !== 1 : val === 1;
        });
      });
      let penalty = 0;
      for (let r = 0; r < size; r++) {
        let run = 1;
        for (let c = 1; c < size; c++) {
          if (grid[r][c] === grid[r][c - 1]) { run++; if (run === 5) penalty += 3; else if (run > 5) penalty += 1; }
          else run = 1;
        }
      }
      for (let c = 0; c < size; c++) {
        let run = 1;
        for (let r = 1; r < size; r++) {
          if (grid[r][c] === grid[r - 1][c]) { run++; if (run === 5) penalty += 3; else if (run > 5) penalty += 1; }
          else run = 1;
        }
      }
      for (let r = 0; r < size - 1; r++) {
        for (let c = 0; c < size - 1; c++) {
          const v = grid[r][c];
          if (v === grid[r][c + 1] && v === grid[r + 1][c] && v === grid[r + 1][c + 1]) penalty += 3;
        }
      }
      return { grid: grid, penalty: penalty };
    }

    let bestPattern = 0;
    let bestResult = applyMaskAndScore(0);
    for (let p = 1; p < 8; p++) {
      const candidate = applyMaskAndScore(p);
      if (candidate.penalty < bestResult.penalty) { bestPattern = p; bestResult = candidate; }
    }

    const formatData = (0b01 << 3) | bestPattern;
    let rem = formatData;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const formatBits = ((formatData << 10) | rem) ^ 0x5412;

    const finalGrid = bestResult.grid;
    for (let i = 0; i < 15; i++) {
      const dark = ((formatBits >>> i) & 1) === 1;
      if (i < 6) finalGrid[8][i] = dark;
      else if (i < 8) finalGrid[8][i + 1] = dark;
      else finalGrid[8][size - 15 + i] = dark;

      if (i < 8) finalGrid[size - 1 - i][8] = dark;
      else if (i < 9) finalGrid[15 - i][8] = dark;
      else finalGrid[14 - i][8] = dark;
    }
    return finalGrid;
  }

  function renderQrSvg(text) {
    const grid = buildQrMatrix(text);
    const size = grid.length;
    const quiet = 4;
    const total = size + quiet * 2;
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + total + " " + total);
    svg.setAttribute("class", "w-full h-full");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "QR Code Pix");

    const bg = document.createElementNS(SVG_NS, "rect");
    bg.setAttribute("width", String(total));
    bg.setAttribute("height", String(total));
    bg.setAttribute("fill", "#ffffff");
    svg.appendChild(bg);

    const pathParts = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c]) pathParts.push("M" + (c + quiet) + "," + (r + quiet) + "h1v1h-1z");
      }
    }
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", pathParts.join(""));
    path.setAttribute("fill", "#09090b");
    svg.appendChild(path);
    return svg;
  }

  // --- Interactive Grocery Simulator ---
  const SWAPS = [
    { oldItem: "Queijo prato fatiado (bandeja 150g)", newItem: "Peça inteira ou muçarela a granel", save: "-28%" },
    { oldItem: "Molho de tomate pronto em sachê", newItem: "Passata ou tomate pelado + alho/cebola", save: "-24%" },
    { oldItem: "Iogurte saborizado individual", newItem: "Iogurte natural 1kg + fruta da estação", save: "-35%" },
    { oldItem: "Bife de contrafilé embalado", newItem: "Acém ou músculo na panela de pressão / patinho moído", save: "-31%" }
  ];

  function formatBrl(val) {
    return "R$ " + Number(val).toFixed(2).replace(".", ",");
  }

  function renderSwapPreview() {
    const tbody = document.getElementById("swap-preview-body");
    if (!tbody) return;
    tbody.replaceChildren();
    SWAPS.forEach(function (row) {
      const tr = document.createElement("tr");
      const td1 = document.createElement("td");
      td1.className = "py-2.5 px-3 text-slate-600";
      td1.textContent = row.oldItem;

      const td2 = document.createElement("td");
      td2.className = "py-2.5 px-3 font-medium text-slate-900";
      td2.textContent = row.newItem;

      const td3 = document.createElement("td");
      td3.className = "py-2.5 px-3 text-right font-bold text-emerald-700";
      td3.textContent = row.save;

      tr.appendChild(td1);
      tr.appendChild(td2);
      tr.appendChild(td3);
      tbody.appendChild(tr);
    });
  }

  function updateCalculator() {
    const spendEl = document.getElementById("grocery-spend");
    const peopleEl = document.getElementById("household-size");
    const freqEl = document.getElementById("impulse-freq");
    const monthlyOut = document.getElementById("calc-monthly-save");
    const yearlyOut = document.getElementById("calc-yearly-save");
    const perPersonOut = document.getElementById("calc-per-person");
    if (!spendEl || !peopleEl || !freqEl) return;

    const spend = Math.max(100, Number(spendEl.value) || 0);
    const people = Math.max(1, Number(peopleEl.value) || 1);
    const rate = Number(freqEl.value) || 0.22;

    const monthlySave = spend * rate;
    const yearlySave = monthlySave * 12;
    const perPerson = monthlySave / people;

    if (monthlyOut) monthlyOut.textContent = formatBrl(monthlySave);
    if (yearlyOut) yearlyOut.textContent = formatBrl(yearlySave);
    if (perPersonOut) perPersonOut.textContent = formatBrl(perPerson) + " economizados por pessoa";
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

  function openModal() {
    if (!modal) return;
    refreshPixPayment();
    modal.classList.remove("hidden");
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.add("hidden");
  }

  function copyText(text, btn, defaultLabel) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        btn.textContent = "Copiado!";
        setTimeout(function () { btn.textContent = defaultLabel; }, 2000);
      });
    } else if (brcodeInput) {
      brcodeInput.select();
      document.execCommand("copy");
      btn.textContent = "Copiado!";
      setTimeout(function () { btn.textContent = defaultLabel; }, 2000);
    }
  }

  function triggerDownload(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function downloadCsvPlanner() {
    const csv = [
      "\uFEFFCategoria;Item;Quantidade;Unidade;Preco_Maximo_Meta_R$;Preco_Pago_R$;Economia_R$",
      "Acougue;Patinho moido ou Acem;2;kg;34.90;;",
      "Acougue;Sobrecoxa de frango;2;kg;14.90;;",
      "Acougue;Ovos brancos (bandeja 30);1;un;19.90;;",
      "Hortifruti;Banana prata;1.5;kg;5.99;;",
      "Hortifruti;Tomate italiano;1.5;kg;7.99;;",
      "Hortifruti;Cebola e Alho;1;kg;6.90;;",
      "Mercearia;Arroz tipo 1 (5kg);1;pct;26.90;;",
      "Mercearia;Feijao carioca (1kg);2;pct;7.50;;",
      "Mercearia;Cafe torrado e moido (500g);1;pct;18.90;;",
      "Laticinios;Leite integral (caixa);12;L;4.79;;",
      "Limpeza;Detergente liquido neutro;4;un;2.49;;",
      "Limpeza;Agua sanitaria (2L);1;un;6.90;;"
    ].join("\n");
    triggerDownload("planilha_anti_inflacao_supermercado.csv", csv, "text/csv;charset=utf-8;");
  }

  function downloadTxtGuide() {
    const withBump = Boolean(bumpCheckbox && bumpCheckbox.checked);
    let txt = [
      "GUIA ANTI-INFLACAO NO SUPERMERCADO",
      "==================================",
      "",
      "1. REGRA DOS 5 PASSOS ANTES DE SAIR DE CASA",
      "- Passo 1: Tire foto da geladeira e da despensa para nunca comprar item repetido.",
      "- Passo 2: Defina um teto em R$ antes de entrar e divida em 4 envelopes mentais (Acougue, Hortifruti, Mercearia, Limpeza).",
      "- Passo 3: Compare sempre o PRECO POR QUILO ou LITRO na etiqueta pequena da prateleira.",
      "- Passo 4: Fuja das pontas de gondolas (produtos na altura dos olhos tem margem ate 35% maior).",
      "- Passo 5: Nunca va ao mercado com fome ou sem lista fechada.",
      "",
      "2. TABELA DE TROCAS INTELIGENTES",
      "- Queijo fatiado -> Peca inteira ou mucarela a granel (-28%)",
      "- Molho pronto -> Passata/tomate pelado + tempero natural (-24%)",
      "- Cortes caros -> Cortes de segunda macios na pressao (-31%)",
      "- Produtos de limpeza de marca lider -> Refil ou marca propria certificada (-35%)"
    ].join("\n");

    if (withBump) {
      txt += "\n\n" + [
        "BONUS: CARDAPIO ECONOMICO 30 DIAS (RESUMO SEMANAL)",
        "=================================================",
        "Semana 1: Frango assado com batatas | Carne moida com abobrinha | Omelete de legumes | Feijao tropeiro economico",
        "Semana 2: Panela de acem com mandioca | Sobrecoxa desfiada | Arroz de forno com sobras | Sopa cremosa de legumes",
        "Semana 3: Frango xadrez economico | Macarrao ao sugo caseiro | Bife de panela acebolado | Torta salgada de liquidificador",
        "Semana 4: Reaproveitamento inteligente + preparo em lote (congelamento de 5 marmitas base)."
      ].join("\n");
    }

    triggerDownload("guia_anti_inflacao_supermercado.txt", txt, "text/plain;charset=utf-8;");
  }

  // Event wiring
  document.querySelectorAll("[data-open-pix]").forEach(function (btn) {
    btn.addEventListener("click", openModal);
  });
  const closeBtn = document.getElementById("close-pix-modal");
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeModal();
    });
  }
  if (bumpCheckbox) bumpCheckbox.addEventListener("change", refreshPixPayment);

  const btnCopyKey = document.getElementById("btn-copy-key");
  if (btnCopyKey) btnCopyKey.addEventListener("click", function () { copyText(PIX_KEY, btnCopyKey, "Copiar Chave"); });

  const btnCopyBrcode = document.getElementById("btn-copy-brcode");
  if (btnCopyBrcode) {
    btnCopyBrcode.addEventListener("click", function () {
      copyText(brcodeInput ? brcodeInput.value : "", btnCopyBrcode, "Copiar Código");
    });
  }

  const btnCsv = document.getElementById("btn-download-csv");
  if (btnCsv) btnCsv.addEventListener("click", downloadCsvPlanner);
  const btnTxt = document.getElementById("btn-download-txt");
  if (btnTxt) btnTxt.addEventListener("click", downloadTxtGuide);

  ["grocery-spend", "household-size", "impulse-freq"].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", updateCalculator);
    if (el) el.addEventListener("change", updateCalculator);
  });

  renderSwapPreview();
  updateCalculator();
})();
