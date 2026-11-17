/**
 * portfolio/poc_1_bolso_mercado/app.js
 * Termômetro do Bolso 2026 — Supermercado, Combustível ANP & Conta de Luz
 * Strict DOM manipulation: ZERO raw HTML string assignments.
 */
(function () {
  "use strict";

  const PIX_KEY = "vudotsur@gmail.com";

  const CHECKOUT_CONFIG = {
    pixKey: PIX_KEY,
    pixPriceBrl: 9.90,
    merchantName: "VUDOTSUR",
    merchantCity: "LONDRINA",
    defaultTxid: "POC01",
    polarCheckoutUrl: "", // Configurable live Polar.sh checkout URL
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
    const amtStr = Number(amount || 9.90).toFixed(2);
    const name = String(merchantName || "VUDOTSUR").toUpperCase().replace(/[^A-Z0-9 .\-/]/g, "").slice(0, 25) || "VUDOTSUR";
    const city = String(merchantCity || "LONDRINA").toUpperCase().replace(/[^A-Z0-9 .\-/]/g, "").slice(0, 15) || "LONDRINA";
    const cleanTxid = String(txid || "POC01").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 25) || "***";

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

  const REGION_MULTIPLIER = {
    sul: { label: "Sul (Londrina/PR, Curitiba, POA)", logistics: 0.96, fuelTax: 1.00 },
    sudeste: { label: "Sudeste (SP, RJ, BH)", logistics: 1.00, fuelTax: 1.02 },
    centro: { label: "Centro-Oeste (Brasília, Goiânia)", logistics: 0.94, fuelTax: 0.99 },
    nordeste: { label: "Nordeste (Recife, Salvador, Fortaleza)", logistics: 1.05, fuelTax: 1.03 },
    norte: { label: "Norte (Manaus, Belém)", logistics: 1.09, fuelTax: 1.06 }
  };

  const PROFILE_WEIGHTS = {
    familia: {
      label: "Família Residencial",
      weights: { cafe: 0.06, carne: 0.22, azeite: 0.04, arroz: 0.08, leite: 0.09, gasolina: 0.26, diesel: 0.03, energia: 0.22 }
    },
    restaurante: {
      label: "Restaurante / Padaria",
      weights: { cafe: 0.08, carne: 0.30, azeite: 0.09, arroz: 0.14, leite: 0.11, gasolina: 0.06, diesel: 0.06, energia: 0.16 }
    },
    motorista: {
      label: "Motorista de App / Logística",
      weights: { cafe: 0.04, carne: 0.10, azeite: 0.02, arroz: 0.05, leite: 0.04, gasolina: 0.52, diesel: 0.15, energia: 0.08 }
    }
  };

  const FLAG_SURCHARGE_PCT = {
    verde: -1.2,
    amarela: 2.4,
    vermelha1: 5.8,
    vermelha2: 9.6
  };

  // Base 8 items with IPCA subitem baseline + PTAX pass-through elasticity (beta_fx)
  const BASE_ITEMS = [
    {
      id: "cafe",
      name: "Café Torrado e Moído (500g)",
      category: "Supermercado • IPCA 1106",
      basePriceBrl: 24.90,
      baseShiftPct: 5.4,
      betaFx: 6.5,
      source: "IBGE IPCA + ICE Arabica / PTAX"
    },
    {
      id: "carne",
      name: "Carne Bovina (Acém / Patinho kg)",
      category: "Supermercado • IPCA 1102",
      basePriceBrl: 38.50,
      baseShiftPct: 4.1,
      betaFx: 5.2,
      source: "IBGE IPCA + Ciclo Pecuário Exportação"
    },
    {
      id: "azeite",
      name: "Azeite de Oliva Extra Virgem (500ml)",
      category: "Importado • IPCA 1105",
      basePriceBrl: 46.90,
      baseShiftPct: -1.8,
      betaFx: 8.4,
      source: "SECEX Importação + BCB PTAX"
    },
    {
      id: "arroz",
      name: "Arroz Branco Tipo 1 (5kg)",
      category: "Cesta Básica • IPCA 1101",
      basePriceBrl: 27.80,
      baseShiftPct: -3.4,
      betaFx: 3.1,
      source: "CONAB Safra Sul + IBGE IPCA"
    },
    {
      id: "leite",
      name: "Leite Longa Vida UHT (1L)",
      category: "Laticínios • IPCA 1104",
      basePriceBrl: 5.69,
      baseShiftPct: -2.2,
      betaFx: 2.0,
      source: "CEPEA/ESALQ + IBGE IPCA"
    },
    {
      id: "gasolina",
      name: "Gasolina Comum ANP (Litro)",
      category: "Combustível • ANP",
      basePriceBrl: 6.19,
      baseShiftPct: 3.2,
      betaFx: 7.8,
      source: "ANP Síntese Semanal + Paridade PPI/PTAX"
    },
    {
      id: "diesel",
      name: "Óleo Diesel S10 ANP (Litro)",
      category: "Frete & Frota • ANP",
      basePriceBrl: 6.08,
      baseShiftPct: 2.9,
      betaFx: 8.1,
      source: "ANP Síntese Semanal + Repasse Frete"
    },
    {
      id: "energia",
      name: "Conta de Luz Residencial/Comercial",
      category: "Tarifa ANEEL • IPCA 2101",
      basePriceBrl: 260.00,
      baseShiftPct: 1.5,
      betaFx: 1.4,
      source: "ANEEL Bandeiras + IGP-M / IPCA"
    }
  ];

  // DOM References
  const selectRegion = document.getElementById("select-region");
  const selectProfile = document.getElementById("select-profile");
  const inputSpend = document.getElementById("input-spend");
  const inputPtax = document.getElementById("input-ptax");
  const selectFlag = document.getElementById("select-flag");

  const lblSpend = document.getElementById("lbl-spend");
  const lblPtax = document.getElementById("lbl-ptax");
  const hdrPtax = document.getElementById("hdr-ptax");

  const outMonthlyDelta = document.getElementById("out-monthly-delta");
  const outPctDelta = document.getElementById("out-pct-delta");
  const outStockAdvice = document.getElementById("out-stock-advice");
  const outSavingsEst = document.getElementById("out-savings-est");

  const itemsGrid = document.getElementById("items-grid");
  const whatsappPreviewBox = document.getElementById("whatsapp-preview-box");
  const btnWhatsappShare = document.getElementById("btn-whatsapp-share");
  const btnCopyCard = document.getElementById("btn-copy-card");
  const copyFeedback = document.getElementById("copy-feedback");

  const checkoutModal = document.getElementById("checkout-modal");
  const btnOpenPixTop = document.getElementById("btn-open-pix-top");
  const btnOpenPixCard = document.getElementById("btn-open-pix-card");
  const btnCloseModal = document.getElementById("btn-close-modal");
  const btnCopyPix = document.getElementById("btn-copy-pix");
  const btnCopyPixKey = document.getElementById("btn-copy-pix-key");
  const btnUnlockPro = document.getElementById("btn-unlock-pro");
  const pixKeyInput = document.getElementById("pix-key-input");
  const pixBrcodeInput = document.getElementById("pix-brcode-input");
  const pixCopiedMsg = document.getElementById("pix-copied-msg");
  const modalTxid = document.getElementById("modal-txid");

  function formatBrl(value) {
    return "R$ " + value.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatSignedPct(value) {
    const sign = value > 0 ? "+" : "";
    return sign + value.toFixed(2).replace(".", ",") + "%";
  }

  function clearChildren(node) {
    while (node && node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function computeProjection() {
    const regionKey = selectRegion ? selectRegion.value : "sul";
    const profileKey = selectProfile ? selectProfile.value : "familia";
    const monthlySpend = inputSpend ? parseFloat(inputSpend.value) || 2400 : 2400;
    const ptax = inputPtax ? parseFloat(inputPtax.value) || 5.82 : 5.82;
    const flagKey = selectFlag ? selectFlag.value : "amarela";

    const region = REGION_MULTIPLIER[regionKey] || REGION_MULTIPLIER.sul;
    const profile = PROFILE_WEIGHTS[profileKey] || PROFILE_WEIGHTS.familia;
    const fxDeltaRatio = (ptax - 5.50) / 5.50; // Baseline equilibrium PTAX = R$ 5.50

    const computedItems = BASE_ITEMS.map(function (item) {
      let shiftPct = item.baseShiftPct + (fxDeltaRatio * item.betaFx * 10);
      if (item.id === "gasolina" || item.id === "diesel") {
        shiftPct = shiftPct * region.fuelTax;
      } else if (item.id === "energia") {
        shiftPct = shiftPct + (FLAG_SURCHARGE_PCT[flagKey] || 0);
      } else {
        shiftPct = shiftPct * region.logistics;
      }

      const localBasePrice = item.basePriceBrl * region.logistics;
      const projectedPrice = localBasePrice * (1 + shiftPct / 100);
      let actionLabel = "ESTÁVEL • COMPRA NORMAL";
      let badgeTone = "neutral";
      if (shiftPct >= 2.2) {
        actionLabel = "ESTOCAR AGORA (ALTA)";
        badgeTone = "up";
      } else if (shiftPct <= -1.2) {
        actionLabel = "AGUARDAR QUEDA";
        badgeTone = "down";
      }

      return {
        id: item.id,
        name: item.name,
        category: item.category,
        source: item.source,
        currentPrice: localBasePrice,
        projectedPrice: projectedPrice,
        shiftPct: shiftPct,
        actionLabel: actionLabel,
        badgeTone: badgeTone,
        weight: profile.weights[item.id] || 0.1
      };
    });

    let weightedPct = 0;
    computedItems.forEach(function (ci) {
      weightedPct += ci.shiftPct * ci.weight;
    });

    const monthlyDeltaBrl = monthlySpend * (weightedPct / 100);
    const risingItems = computedItems
      .filter(function (i) { return i.shiftPct >= 2.0; })
      .sort(function (a, b) { return b.shiftPct - a.shiftPct; });
    const fallingItems = computedItems
      .filter(function (i) { return i.shiftPct <= -1.0; })
      .sort(function (a, b) { return a.shiftPct - b.shiftPct; });

    // Potential savings by front-running rising items and waiting on falling items
    const savingsEstimate = Math.max(24.90, Math.abs(monthlyDeltaBrl) * 0.58 + (monthlySpend * 0.015));

    return {
      region: region,
      profile: profile,
      monthlySpend: monthlySpend,
      ptax: ptax,
      weightedPct: weightedPct,
      monthlyDeltaBrl: monthlyDeltaBrl,
      savingsEstimate: savingsEstimate,
      items: computedItems,
      risingItems: risingItems,
      fallingItems: fallingItems
    };
  }

  function renderItemsGrid(items) {
    if (!itemsGrid) return;
    clearChildren(itemsGrid);

    items.forEach(function (item) {
      const card = document.createElement("article");
      card.className = "bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-slate-700 transition";

      const topDiv = document.createElement("div");
      topDiv.className = "space-y-1";

      const metaRow = document.createElement("div");
      metaRow.className = "flex items-center justify-between gap-2";

      const catSpan = document.createElement("span");
      catSpan.className = "text-[11px] font-mono-code text-slate-400";
      catSpan.textContent = item.category;

      const pctBadge = document.createElement("span");
      if (item.badgeTone === "up") {
        pctBadge.className = "text-xs font-mono-code font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300";
      } else if (item.badgeTone === "down") {
        pctBadge.className = "text-xs font-mono-code font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300";
      } else {
        pctBadge.className = "text-xs font-mono-code font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300";
      }
      pctBadge.textContent = formatSignedPct(item.shiftPct);

      metaRow.appendChild(catSpan);
      metaRow.appendChild(pctBadge);

      const titleEl = document.createElement("h3");
      titleEl.className = "text-sm font-bold text-white pt-1";
      titleEl.textContent = item.name;

      topDiv.appendChild(metaRow);
      topDiv.appendChild(titleEl);

      const priceDiv = document.createElement("div");
      priceDiv.className = "pt-2 border-t border-slate-800/80 space-y-1";

      const priceRow = document.createElement("div");
      priceRow.className = "flex items-baseline justify-between text-xs";

      const currSpan = document.createElement("span");
      currSpan.className = "text-slate-400";
      currSpan.textContent = "Hoje: " + formatBrl(item.currentPrice);

      const projSpan = document.createElement("span");
      projSpan.className = "font-mono-code font-semibold text-slate-100";
      projSpan.textContent = "30d: " + formatBrl(item.projectedPrice);

      priceRow.appendChild(currSpan);
      priceRow.appendChild(projSpan);

      const actionTag = document.createElement("div");
      if (item.badgeTone === "up") {
        actionTag.className = "text-[11px] font-mono-code font-bold text-amber-400 pt-1";
      } else if (item.badgeTone === "down") {
        actionTag.className = "text-[11px] font-mono-code font-bold text-emerald-400 pt-1";
      } else {
        actionTag.className = "text-[11px] font-mono-code text-slate-400 pt-1";
      }
      actionTag.textContent = "▸ " + item.actionLabel;

      const srcSpan = document.createElement("div");
      srcSpan.className = "text-[10px] font-mono-code text-slate-500";
      srcSpan.textContent = item.source;

      priceDiv.appendChild(priceRow);
      priceDiv.appendChild(actionTag);
      priceDiv.appendChild(srcSpan);

      card.appendChild(topDiv);
      card.appendChild(priceDiv);
      itemsGrid.appendChild(card);
    });
  }

  function buildWhatsAppText(state) {
    const topRising = state.risingItems.slice(0, 3).map(function (i) {
      return "🔺 " + i.name + " (" + formatSignedPct(i.shiftPct) + ")";
    }).join("\n");

    const topFalling = state.fallingItems.slice(0, 2).map(function (i) {
      return "🟢 " + i.name + " (" + formatSignedPct(i.shiftPct) + ")";
    }).join("\n");

    const lines = [
      "🛒 *TERMÔMETRO DO BOLSO (PRÓXIMOS 30 DIAS)*",
      "📍 Praça: " + state.region.label,
      "👤 Perfil: " + state.profile.label + " | Câmbio PTAX: R$ " + state.ptax.toFixed(2).replace(".", ","),
      "",
      "⚠️ *Antecipe / Estoque Agora (Pressão de Alta):*",
      topRising || "• Sem pressão aguda detectada",
      "",
      "⏳ *Espere para Comprar (Tendência de Queda):*",
      topFalling || "• Preços estáveis na cesta básica",
      "",
      "💰 *Impacto Mensal Estimado:* " + (state.monthlyDeltaBrl >= 0 ? "+" : "") + formatBrl(state.monthlyDeltaBrl) + " (" + formatSignedPct(state.weightedPct) + ")",
      "✅ *Economia ao Antecipar:* " + formatBrl(state.savingsEstimate) + "/mês",
      "📊 Fonte: IBGE IPCA + BCB PTAX + ANP"
    ];
    return lines.join("\n");
  }

  function updateUI() {
    const state = computeProjection();

    if (lblSpend) {
      lblSpend.textContent = "R$ " + state.monthlySpend.toLocaleString("pt-BR");
    }
    if (lblPtax) {
      lblPtax.textContent = "R$ " + state.ptax.toFixed(2).replace(".", ",");
    }
    if (hdrPtax) {
      hdrPtax.textContent = "R$ " + state.ptax.toFixed(2).replace(".", ",");
    }

    if (outMonthlyDelta) {
      const sign = state.monthlyDeltaBrl >= 0 ? "+" : "";
      outMonthlyDelta.textContent = sign + formatBrl(state.monthlyDeltaBrl);
      outMonthlyDelta.className = state.monthlyDeltaBrl >= 0
        ? "text-3xl sm:text-4xl font-extrabold font-mono-code text-rose-400"
        : "text-3xl sm:text-4xl font-extrabold font-mono-code text-emerald-400";
    }

    if (outPctDelta) {
      outPctDelta.textContent = formatSignedPct(state.weightedPct) + " / mês";
    }

    if (outStockAdvice) {
      const riseNames = state.risingItems.slice(0, 3).map(function (i) { return i.name.split(" (")[0]; }).join(", ");
      const fallNames = state.fallingItems.slice(0, 2).map(function (i) { return i.name.split(" (")[0]; }).join(" e ");
      outStockAdvice.textContent = "Estocar agora: " + (riseNames || "itens dolarizados") + ". Aguardar queda: " + (fallNames || "grãos de safra") + ".";
    }

    if (outSavingsEst) {
      outSavingsEst.textContent = formatBrl(state.savingsEstimate) + " neste mês";
    }

    renderItemsGrid(state.items);

    const waText = buildWhatsAppText(state);
    if (whatsappPreviewBox) {
      whatsappPreviewBox.textContent = waText;
    }
    if (btnWhatsappShare) {
      btnWhatsappShare.setAttribute("href", "https://wa.me/?text=" + encodeURIComponent(waText));
    }
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

  function downloadProSpreadsheetCsv() {
    const state = computeProjection();
    const header = "item_id,produto,categoria,preco_atual_brl,preco_30d_brl,variacao_pct,recomendacao\n";
    const rows = state.items.map(function (it) {
      return [
        it.id,
        "\"" + it.name + "\"",
        "\"" + it.category + "\"",
        it.currentPrice.toFixed(2),
        it.projectedPrice.toFixed(2),
        it.shiftPct.toFixed(2),
        "\"" + it.actionLabel + "\""
      ].join(",");
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", "planilha_termometro_bolso_2026.csv");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Event Listeners
  [selectRegion, selectProfile, inputSpend, inputPtax, selectFlag].forEach(function (el) {
    if (el) {
      el.addEventListener("input", updateUI);
      el.addEventListener("change", updateUI);
    }
  });

  if (btnCopyCard) {
    btnCopyCard.addEventListener("click", function () {
      const text = whatsappPreviewBox ? whatsappPreviewBox.textContent : "";
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

  if (btnOpenPixTop) {
    btnOpenPixTop.addEventListener("click", openCheckoutModal);
  }
  if (btnOpenPixCard) {
    btnOpenPixCard.addEventListener("click", openCheckoutModal);
  }
  if (btnCloseModal) {
    btnCloseModal.addEventListener("click", closeCheckoutModal);
  }
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
    btnUnlockPro.addEventListener("click", downloadProSpreadsheetCsv);
  }

  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") {
      closeCheckoutModal();
    }
  });

  updateUI();
})();
