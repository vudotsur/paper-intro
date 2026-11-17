/**
 * portfolio/poc_2_lupa_cidade/app.js
 * Lupa da Cidade & Concursos (Londrina/PR & Municípios — Querido Diário + SICONFI)
 * Strict DOM manipulation: ZERO raw HTML string assignments.
 */
(function () {
  "use strict";

  const PIX_KEY = "vudotsur@gmail.com";

  const CHECKOUT_CONFIG = {
    pixKey: PIX_KEY,
    pixPriceBrl: 14.90,
    merchantName: "VUDOTSUR",
    merchantCity: "LONDRINA",
    defaultTxid: "POC02",
    polarCheckoutUrl: "",
    pixReceiverEndpoint: "/api/pix/webhook"
  };

  function formatTlv(tag, value) {
    const str = String(value);
    const len = str.length < 10 ? "0" + str.length : String(str.length);
    return tag + len + str;
  }

  function computeCrc16Ccitt(payload) {
    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
      crc ^= (payload.charCodeAt(i) << 8) & 0xFFFF;
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
    const key = String(pixKey || PIX_KEY).trim();
    const amtStr = Number(amount || 14.90).toFixed(2);
    const name = String(merchantName || "VUDOTSUR").toUpperCase().replace(/[^A-Z0-9 .\-/]/g, "").slice(0, 25) || "VUDOTSUR";
    const city = String(merchantCity || "LONDRINA").toUpperCase().replace(/[^A-Z0-9 .\-/]/g, "").slice(0, 15) || "LONDRINA";
    const cleanTxid = String(txid || "POC02").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 25) || "***";

    const guiTlv = formatTlv("00", "br.gov.bcb.pix");
    const keyTlv = formatTlv("01", key);
    const acctTlv = formatTlv("26", guiTlv + keyTlv);
    const txidTlv = formatTlv("62", formatTlv("05", cleanTxid));

    const body =
      formatTlv("00", "01") +
      acctTlv +
      formatTlv("52", "0000") +
      formatTlv("53", "986") +
      formatTlv("54", amtStr) +
      formatTlv("58", "BR") +
      formatTlv("59", name) +
      formatTlv("60", city) +
      txidTlv +
      "6304";

    return body + computeCrc16Ccitt(body);
  }

  const CITY_META = {
    londrina: { name: "Londrina / PR", ibge: "4113700", siconfiRcl: "47,8% RCL" },
    maringa: { name: "Maringá / PR", ibge: "4115200", siconfiRcl: "45,2% RCL" },
    curitiba: { name: "Curitiba / PR", ibge: "4106902", siconfiRcl: "44,1% RCL" },
    cambe: { name: "Cambé / PR", ibge: "4103701", siconfiRcl: "48,6% RCL" }
  };

  const GAZETTE_ACTS = [
    {
      id: "ATO-LDN-5412",
      city: "londrina",
      category: "concursos",
      categoryLabel: "Concursos & Nomeações",
      date: "15/11/2026",
      edition: "JOM Ed. nº 5.342",
      title: "Convocação de 68 Aprovados — Professor da Educação Básica, Técnico de Enfermagem e Agente de Saúde",
      org: "Secretaria Municipal de Recursos Humanos / Saúde e Educação",
      cnpjOrRef: "Edital nº 142/2026-SMRH",
      valueBrl: 0,
      anomalyFlag: false,
      anomalyReason: "Prazo de 10 dias úteis para entrega de exames admissionais.",
      summary: "Convoca candidatos aprovados nos concursos públicos vigentes para posse imediata na rede municipal de Londrina."
    },
    {
      id: "ATO-LDN-5413",
      city: "londrina",
      category: "dispensa",
      categoryLabel: "Dispensa de Licitação",
      date: "14/11/2026",
      edition: "JOM Ed. nº 5.341",
      title: "Dispensa Emergencial nº 089/2026 — Insumos Hospitalares e Manutenção de Unidades de Pronto Atendimento",
      org: "Fundo Municipal de Saúde de Londrina",
      cnpjOrRef: "CNPJ 45.812.900/0001-74",
      valueBrl: 3480000,
      anomalyFlag: true,
      anomalyReason: "ALERTA SICONFI/TCE: Valor 214% acima da mediana histórica do subelemento de despesa sem pregão eletrônico.",
      summary: "Contratação emergencial por 180 dias com cláusula de dispensa de licitação art. 75 da Lei 14.133/2021."
    },
    {
      id: "ATO-LDN-5414",
      city: "londrina",
      category: "obras",
      categoryLabel: "Obras Públicas & Aditivos",
      date: "13/11/2026",
      edition: "JOM Ed. nº 5.340",
      title: "3º Termo Aditivo de Valor e Prazo — Recapeamento Asfáltico e Drenagem Zona Norte / Região Cinco Conjuntos",
      org: "Secretaria Municipal de Obras e Pavimentação (SMOP)",
      cnpjOrRef: "Contrato SMOP nº 211/2025 • CNPJ 11.409.332/0001-18",
      valueBrl: 6920000,
      anomalyFlag: true,
      anomalyReason: "ALERTA DE ADITIVO: Acréscimo acumulado de 24,8% sobre o valor original licitado (limite legal de 25%).",
      summary: "Adita cronograma físico-financeiro em +120 dias e reajusta planilha de insumos betuminosos."
    },
    {
      id: "ATO-LDN-5415",
      city: "londrina",
      category: "licitacoes",
      categoryLabel: "Licitações & Contratos",
      date: "12/11/2026",
      edition: "JOM Ed. nº 5.339",
      title: "Abertura de Pregão Eletrônico nº 310/2026 — Merenda Escolar e Agricultura Familiar",
      org: "Secretaria Municipal de Gestão Pública",
      cnpjOrRef: "Processo SEI 19.008.114209/2026",
      valueBrl: 8050000,
      anomalyFlag: false,
      anomalyReason: "Edital aberto a cooperativas locais e ME/EPP da Região Metropolitana de Londrina.",
      summary: "Registro de preços para fornecimento parcelado de gêneros alimentícios para 120 unidades escolares."
    },
    {
      id: "ATO-MGA-2101",
      city: "maringa",
      category: "concursos",
      categoryLabel: "Concursos & Nomeações",
      date: "15/11/2026",
      edition: "DOM-Maringá nº 4.198",
      title: "Edital de Abertura — Concurso Público Guarda Civil Municipal e Analista de TI",
      org: "Prefeitura do Município de Maringá",
      cnpjOrRef: "Edital nº 054/2026-SEGEP",
      valueBrl: 0,
      anomalyFlag: false,
      anomalyReason: "Inscrições abertas por 30 dias; remuneração inicial de R$ 4.890 a R$ 8.420.",
      summary: "Abertura de 45 vagas imediatas mais cadastro de reserva para nível médio e superior."
    },
    {
      id: "ATO-CWB-8801",
      city: "curitiba",
      category: "dispensa",
      categoryLabel: "Dispensa de Licitação",
      date: "14/11/2026",
      edition: "DOM-Curitiba nº 221",
      title: "Reconhecimento de Dívida e Dispensa — Locação de Licenças Corporativas e Telemetria",
      org: "Secretaria Municipal de Administração e TI",
      cnpjOrRef: "CNPJ 29.118.440/0001-09",
      valueBrl: 4120000,
      anomalyFlag: true,
      anomalyReason: "ALERTA DE CONCENTRAÇÃO: Fornecedor recebeu 3 dispensas consecutivas no mesmo exercício fiscal.",
      summary: "Termo de ajuste financeiro sem cobertura contratual prévia para manutenção de infraestrutura."
    },
    {
      id: "ATO-CMB-1104",
      city: "cambe",
      category: "obras",
      categoryLabel: "Obras Públicas & Aditivos",
      date: "13/11/2026",
      edition: "JOM-Cambé nº 912",
      title: "Ordem de Serviço nº 019/2026 — Reforma de UBS e Iluminação LED",
      org: "Prefeitura Municipal de Cambé",
      cnpjOrRef: "Concorrência nº 008/2026",
      valueBrl: 2190000,
      anomalyFlag: false,
      anomalyReason: "Prazo de execução de 180 dias com recursos vinculados SICONFI.",
      summary: "Autoriza início imediato das obras de modernização da Unidade Básica de Saúde."
    }
  ];

  const selectCity = document.getElementById("select-city");
  const selectCategory = document.getElementById("select-category");
  const inputKeyword = document.getElementById("input-keyword");
  const hdrIbge = document.getElementById("hdr-ibge");

  const statCount = document.getElementById("stat-count");
  const statVolume = document.getElementById("stat-volume");
  const statAnomalies = document.getElementById("stat-anomalies");
  const statSiconfi = document.getElementById("stat-siconfi");

  const actsList = document.getElementById("acts-list");
  const pautaPreviewBox = document.getElementById("pauta-preview-box");
  const btnWhatsappShare = document.getElementById("btn-whatsapp-share");
  const btnCopyPauta = document.getElementById("btn-copy-pauta");
  const copyFeedback = document.getElementById("copy-feedback");

  const checkoutModal = document.getElementById("checkout-modal");
  const btnOpenPixTop = document.getElementByById("btn-open-pix-top");
  const btnOpenPixCard = document.getElementById("btn-open-pix-card");
  const btnCloseModal = document.getElementById("btn-close-modal");
  const btnCopyPix = document.getElementById("btn-copy-pix");
  const btnCopyPixKey = document.getElementById("btn-copy-pix-key");
  const btnUnlockPro = document.getElementById("btn-unlock-pro");
  const pixKeyInput = document.getElementById("pix-key-input");
  const pixBrcodeInput = document.getElementById("pix-brcode-input");
  const pixCopiedMsg = document.getElementById("pix-copied-msg");
  const modalTxid = document.getElementById("modal-txid");

  let selectedAct = GAZETTE_ACTS[0];

  function clearChildren(node) {
    while (node && node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function formatBrlCompact(val) {
    if (!val || val <= 0) {
      return "Edital / Sem desembolso direto";
    }
    if (val >= 1000000) {
      return "R$ " + (val / 1000000).toFixed(2).replace(".", ",") + " mi";
    }
    return "R$ " + val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function buildPressPitch(act) {
    const cityInfo = CITY_META[act.city] || CITY_META.londrina;
    const statusLine = act.anomalyFlag
      ? "🚨 *ALERTA DE ANOMALIA / ATENÇÃO CÍVICA*"
      : "📢 *UTILIDADE PÚBLICA — DIÁRIO OFICIAL*";

    const lines = [
      statusLine,
      "🏛️ *Município:* " + cityInfo.name + " (" + act.edition + " - " + act.date + ")",
      "📌 *Ato:* " + act.title,
      "🏢 *Órgão:* " + act.org,
      "🧾 *Ref/CNPJ:* " + act.cnpjOrRef,
      "💰 *Valor Envolvido:* " + formatBrlCompact(act.valueBrl),
      "",
      "🔍 *Por que importa:* " + act.summary,
      "⚠️ *Observação Técnica:* " + act.anomalyReason,
      "",
      "🔗 Fonte: Querido Diário (OKBR) + Tesouro Nacional SICONFI"
    ];
    return lines.join("\n");
  }

  function updatePautaPreview(act) {
    selectedAct = act;
    const pitch = buildPressPitch(act);
    if (pautaPreviewBox) {
      pautaPreviewBox.textContent = pitch;
    }
    if (btnWhatsappShare) {
      btnWhatsappShare.setAttribute("href", "https://wa.me/?text=" + encodeURIComponent(pitch));
    }
  }

  function filterActs() {
    const cityVal = selectCity ? selectCity.value : "londrina";
    const catVal = selectCategory ? selectCategory.value : "all";
    const kw = inputKeyword ? inputKeyword.value.trim().toLowerCase() : "";

    const cityInfo = CITY_META[cityVal] || CITY_META.londrina;
    if (hdrIbge) {
      hdrIbge.textContent = cityInfo.ibge + " (" + cityInfo.name + ")";
    }
    if (statSiconfi) {
      statSiconfi.textContent = cityInfo.siconfiRcl;
    }

    const filtered = GAZETTE_ACTS.filter(function (item) {
      const matchCity = item.city === cityVal || kw.length > 0;
      const matchCat = catVal === "all" || item.category === catVal;
      const haystack = (item.title + " " + item.org + " " + item.cnpjOrRef + " " + item.summary).toLowerCase();
      const matchKw = kw.length === 0 || haystack.indexOf(kw) !== -1;
      return matchCity && matchCat && matchKw;
    });

    const displayList = filtered.length > 0 ? filtered : GAZETTE_ACTS;
    let totalVol = 0;
    let anomalyCount = 0;
    displayList.forEach(function (a) {
      totalVol += a.valueBrl;
      if (a.anomalyFlag) anomalyCount += 1;
    });

    if (statCount) statCount.textContent = displayList.length + " atos";
    if (statVolume) statVolume.textContent = formatBrlCompact(totalVol);
    if (statAnomalies) statAnomalies.textContent = anomalyCount + (anomalyCount === 1 ? " alerta" : " alertas");

    renderActsList(displayList);
    updatePautaPreview(displayList[0]);
  }

  function renderActsList(acts) {
    if (!actsList) return;
    clearChildren(actsList);

    acts.forEach(function (act) {
      const card = document.createElement("article");
      card.className = act.anomalyFlag
        ? "bg-slate-900 border border-amber-500/50 rounded-xl p-4 space-y-2.5 transition hover:border-amber-400"
        : "bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2.5 transition hover:border-slate-700";

      const topRow = document.createElement("div");
      topRow.className = "flex flex-wrap items-center justify-between gap-2";

      const badgeGroup = document.createElement("div");
      badgeGroup.className = "flex items-center gap-2";

      const catBadge = document.createElement("span");
      catBadge.className = "text-[11px] font-mono-code font-semibold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300";
      catBadge.textContent = act.categoryLabel;
      badgeGroup.appendChild(catBadge);

      if (act.anomalyFlag) {
        const anomBadge = document.createElement("span");
        anomBadge.className = "text-[11px] font-mono-code font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300";
        anomBadge.textContent = "⚠ ALERTA FISCAL";
        badgeGroup.appendChild(anomBadge);
      }

      const dateSpan = document.createElement("span");
      dateSpan.className = "text-xs font-mono-code text-slate-400";
      dateSpan.textContent = act.edition + " • " + act.date;

      topRow.appendChild(badgeGroup);
      topRow.appendChild(dateSpan);

      const titleEl = document.createElement("h3");
      titleEl.className = "text-sm sm:text-base font-bold text-white";
      titleEl.textContent = act.title;

      const summaryEl = document.createElement("p");
      summaryEl.className = "text-xs text-slate-300 leading-relaxed";
      summaryEl.textContent = act.summary;

      const reasonEl = document.createElement("div");
      reasonEl.className = act.anomalyFlag
        ? "text-xs font-mono-code text-amber-300 bg-amber-950/30 border border-amber-500/30 rounded-lg p-2"
        : "text-xs font-mono-code text-slate-400 bg-slate-950 rounded-lg p-2";
      reasonEl.textContent = act.anomalyReason;

      const bottomRow = document.createElement("div");
      bottomRow.className = "pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2";

      const metaSpan = document.createElement("span");
      metaSpan.className = "text-xs font-mono-code text-slate-300";
      metaSpan.textContent = act.cnpjOrRef + " • " + formatBrlCompact(act.valueBrl);

      const btnSelect = document.createElement("button");
      btnSelect.type = "button";
      btnSelect.className = "bg-sky-500/20 hover:bg-sky-500 hover:text-slate-950 text-sky-300 font-mono-code font-bold text-xs px-3 py-1.5 rounded-lg transition";
      btnSelect.textContent = "Gerar Pauta / WhatsApp";
      btnSelect.addEventListener("click", function () {
        updatePautaPreview(act);
      });

      bottomRow.appendChild(metaSpan);
      bottomRow.appendChild(btnSelect);

      card.appendChild(topRow);
      card.appendChild(titleEl);
      card.appendChild(summaryEl);
      card.appendChild(reasonEl);
      card.appendChild(bottomRow);
      actsList.appendChild(card);
    });
  }

  function openCheckoutModal() {
    if (CHECKOUT_CONFIG.polarCheckoutUrl && CHECKOUT_CONFIG.polarCheckoutUrl.indexOf("https://") === 0) {
      window.open(CHECKOUT_CONFIG.polarCheckoutUrl, "_blank", "noopener,noreferrer");
      return;
    }
    const txid = CHECKOUT_CONFIG.defaultTxid;
    const brcode = generatePixBrCode("vudotsur@gmail.com", CHECKOUT_CONFIG.pixPriceBrl, "VUDOTSUR", "LONDRINA", txid);
    if (modalTxid) {
      modalTxid.textContent = txid;
    }
    if (pixKeyInput) {
      pixKeyInput.value = PIX_KEY;
    }
    if (pixBrcodeInput) {
      pixBrcodeInput.value = brcode;
    }
    if (checkoutModal) {
      checkoutModal.classList.remove("hidden");
      checkoutModal.classList.add("flex");
    }
  }

  function closeCheckoutModal() {
    if (checkoutModal) {
      checkoutModal.classList.add("hidden");
      checkoutModal.classList.remove("flex");
    }
    if (pixCopiedMsg) {
      pixCopiedMsg.classList.add("hidden");
    }
  }

  function downloadGazetteCsv() {
    const header = "id,municipio,categoria,data,edicao,titulo,orgao,ref_cnpj,valor_brl,alerta_anomalia\n";
    const rows = GAZETTE_ACTS.map(function (a) {
      return [
        a.id,
        a.city,
        a.category,
        a.date,
        "\"" + a.edition + "\"",
        "\"" + a.title + "\"",
        "\"" + a.org + "\"",
        "\"" + a.cnpjOrRef + "\"",
        a.valueBrl,
        a.anomalyFlag ? "SIM" : "NAO"
      ].join(",");
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "relatorio_lupa_cidade_2026.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  [selectCity, selectCategory, inputKeyword].forEach(function (el) {
    if (el) {
      el.addEventListener("input", filterActs);
      el.addEventListener("change", filterActs);
    }
  });

  if (btnCopyPauta) {
    btnCopyPauta.addEventListener("click", function () {
      const text = pautaPreviewBox ? pautaPreviewBox.textContent : "";
      if (navigator.clipboard && text) {
        navigator.clipboard.writeText(text).catch(function () {});
      }
      if (copyFeedback) {
        copyFeedback.classList.remove("hidden");
        setTimeout(function () {
          copyFeedback.classList.add("hidden");
        }, 2000);
      }
    });
  }

  if (btnOpenPixTop) btnOpenPixTop.addEventListener("click", openCheckoutModal);
  if (btnOpenPixCard) btnOpenPixCard.addEventListener("click", openCheckoutModal);
  if (btnCloseModal) btnCloseModal.addEventListener("click", closeCheckoutModal);

  if (btnCopyPixKey) {
    btnCopyPixKey.addEventListener("click", function () {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(PIX_KEY).catch(function () {});
      }
      if (pixCopiedMsg) {
        pixCopiedMsg.textContent = "Chave Pix copiada: " + PIX_KEY;
        pixCopiedMsg.classList.remove("hidden");
      }
    });
  }

  if (btnCopyPix) {
    btnCopyPix.addEventListener("click", function () {
      const code = pixBrcodeInput ? pixBrcodeInput.value : generatePixBrCode("vudotsur@gmail.com", CHECKOUT_CONFIG.pixPriceBrl, "VUDOTSUR", "LONDRINA", CHECKOUT_CONFIG.defaultTxid);
      if (navigator.clipboard && code) {
        navigator.clipboard.writeText(code).catch(function () {});
      }
      if (pixCopiedMsg) {
        pixCopiedMsg.textContent = "Código Pix Copia e Cola copiado! Chave: " + PIX_KEY;
        pixCopiedMsg.classList.remove("hidden");
      }
    });
  }

  if (btnUnlockPro) {
    btnUnlockPro.addEventListener("click", downloadGazetteCsv);
  }

  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") closeCheckoutModal();
  });

  filterActs();
})();
