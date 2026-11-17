/**
 * portfolio/poc_3_hora_certa_comprar/app.js
 * Comprar Agora ou Esperar? (Detector de Desconto Real vs "Black Fraude")
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
    defaultTxid: "POC03",
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
    const amtStr = Number(amount || 9.90).toFixed(2);
    const name = String(merchantName || "VUDOTSUR").toUpperCase().replace(/[^A-Z0-9 .\-/]/g, "").slice(0, 25) || "VUDOTSUR";
    const city = String(merchantCity || "LONDRINA").toUpperCase().replace(/[^A-Z0-9 .\-/]/g, "").slice(0, 15) || "LONDRINA";
    const cleanTxid = String(txid || "POC03").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 25) || "***";

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

  // Net monthly CDI rate after IR (Selic 14.25% a.a. -> ~0.94% net monthly)
  const NET_MONTHLY_CDI = 0.0094;

  const CATEGORY_PROFILES = {
    smartphone: {
      label: "Smartphone / Celular",
      fxPassThrough: 0.75,
      targetDiscountFromRef: 0.12,
      waitDaysDefault: 18
    },
    notebook: {
      label: "Notebook / Hardware / GPU",
      fxPassThrough: 0.85,
      targetDiscountFromRef: 0.10,
      waitDaysDefault: 21
    },
    tv: {
      label: "Smart TV 4K / Áudio",
      fxPassThrough: 0.55,
      targetDiscountFromRef: 0.15,
      waitDaysDefault: 14
    },
    eletro: {
      label: "Geladeira / Lavadora / Ar-Condicionado",
      fxPassThrough: 0.40,
      targetDiscountFromRef: 0.11,
      waitDaysDefault: 16
    },
    passagem: {
      label: "Passagem Aérea Nacional / Internacional",
      fxPassThrough: 0.68,
      targetDiscountFromRef: 0.18,
      waitDaysDefault: 24
    }
  };

  const BENCHMARK_PRESETS = [
    {
      name: "Smartphone 256GB 5G (Pré-Promo Inflado)",
      category: "smartphone",
      window: "pre_promo",
      priceNow: 3199,
      priceRef: 2899,
      priceCard: 3499,
      ptaxShock: 1.8,
      tag: "DESCONTO INFLADO (+10,3%)"
    },
    {
      name: "Smart TV 55\" 4K OLED (Queima de Estoque Real)",
      category: "tv",
      window: "pos_lancamento",
      priceNow: 3690,
      priceRef: 4390,
      priceCard: 3890,
      ptaxShock: 0.4,
      tag: "COMPRAR AGORA (-15,9%)"
    },
    {
      name: "Notebook Core i7 16GB SSD (Aguardar Queda)",
      category: "notebook",
      window: "pre_promo",
      priceNow: 4750,
      priceRef: 4790,
      priceCard: 5190,
      ptaxShock: -1.6,
      tag: "AGUARDAR 21 DIAS"
    }
  ];

  const selectCategory = document.getElementById("select-category");
  const selectWindow = document.getElementById("select-window");
  const inputPriceNow = document.getElementById("input-price-now");
  const inputPriceRef = document.getElementById("input-price-ref");
  const inputPriceCard = document.getElementById("input-price-card");
  const inputPtaxShock = document.getElementById("input-ptax-shock");
  const lblPtaxShock = document.getElementById("lbl-ptax-shock");

  const verdictBadge = document.getElementById("verdict-badge");
  const outTargetPrice = document.getElementById("out-target-price");
  const outVerdictReason = document.getElementById("out-verdict-reason");
  const outPaymentVerdict = document.getElementById("out-payment-verdict");

  const presetsGrid = document.getElementById("presets-grid");
  const whatsappPreviewBox = document.getElementById("whatsapp-preview-box");
  const btnWhatsappShare = document.getElementById("btn-whatsapp-share");
  const btnCopyVerdict = document.getElementById("btn-copy-verdict");
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

  function clearChildren(node) {
    while (node && node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function formatBrl(val) {
    return "R$ " + val.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function computePresentValue10x(totalCardPrice) {
    const installment = totalCardPrice / 10;
    let pv = 0;
    for (let m = 1; m <= 10; m++) {
      pv += installment / Math.pow(1 + NET_MONTHLY_CDI, m);
    }
    return pv;
  }

  function evaluateOffer() {
    const catKey = selectCategory ? selectCategory.value : "smartphone";
    const winKey = selectWindow ? selectWindow.value : "pre_promo";
    const priceNow = Math.max(50, parseFloat(inputPriceNow ? inputPriceNow.value : 3199) || 3199);
    const priceRef = Math.max(50, parseFloat(inputPriceRef ? inputPriceRef.value : 2899) || 2899);
    const priceCard = Math.max(priceNow, parseFloat(inputPriceCard ? inputPriceCard.value : priceNow) || priceNow);
    const ptaxShock = parseFloat(inputPtaxShock ? inputPtaxShock.value : 1.8) || 0;

    const cat = CATEGORY_PROFILES[catKey] || CATEGORY_PROFILES.smartphone;
    const diffPct = ((priceNow - priceRef) / priceRef) * 100;

    // FX adjustment on fair target price
    const fxAdjustment = (ptaxShock / 100) * cat.fxPassThrough * 0.5;
    const targetFairPrice = priceRef * (1 - cat.targetDiscountFromRef + fxAdjustment);

    let verdictCode = "AGUARDAR";
    let verdictLabel = "AGUARDAR " + cat.waitDaysDefault + " DIAS";
    let badgeClass = "inline-block px-3 py-1 rounded-lg font-mono-code font-extrabold text-sm bg-amber-500/20 text-amber-300 border border-amber-500/40";
    let reasonText = "";

    if (diffPct >= 3.0 || (winKey === "pre_promo" && diffPct > -2.0)) {
      verdictCode = "DESCONTO INFLADO";
      verdictLabel = "DESCONTO INFLADO • AGUARDAR " + cat.waitDaysDefault + " DIAS";
      badgeClass = "inline-block px-3 py-1 rounded-lg font-mono-code font-extrabold text-sm bg-rose-500/20 text-rose-300 border border-rose-500/40";
      reasonText = "Alerta de 'Metade do Dobro': o preço atual (" + formatBrl(priceNow) + ") está " +
        (diffPct >= 0 ? "+" : "") + diffPct.toFixed(1).replace(".", ",") +
        "% em relação à mediana de 90 dias (" + formatBrl(priceRef) + "). Espere cair abaixo de " + formatBrl(targetFairPrice) + ".";
    } else if (priceNow <= targetFairPrice || diffPct <= -10.0 || (ptaxShock >= 4.5 && diffPct <= -4.0)) {
      verdictCode = "COMPRAR AGORA";
      verdictLabel = "COMPRAR AGORA • DESCONTO REAL VERIFICADO";
      badgeClass = "inline-block px-3 py-1 rounded-lg font-mono-code font-extrabold text-sm bg-emerald-500/20 text-emerald-300 border border-emerald-500/40";
      reasonText = "Oportunidade real: o preço está " + Math.abs(diffPct).toFixed(1).replace(".", ",") +
        "% abaixo da média de 90 dias e protegido contra repasse cambial do Dólar PTAX.";
    } else {
      verdictCode = "AGUARDAR";
      verdictLabel = "AGUARDAR " + cat.waitDaysDefault + " DIAS • PREÇO MORNO";
      reasonText = "Desconto tímido (" + diffPct.toFixed(1).replace(".", ",") +
        "% vs. média de 90 dias). A curva sazonal indica queda até " + formatBrl(targetFairPrice) + " nos próximos " + cat.waitDaysDefault + " dias.";
    }

    // Pix vs 10x Installments Present Value
    const pv10x = computePresentValue10x(priceCard);
    const pixDiscountPct = ((priceCard - priceNow) / priceCard) * 100;
    let paymentAdvice = "";
    if (priceNow <= pv10x) {
      const realAdvantage = pv10x - priceNow;
      paymentAdvice = "PAGUE NO PIX À VISTA: o desconto de " + pixDiscountPct.toFixed(1).replace(".", ",") +
        "% supera o rendimento líquido do CDI em 10x (ganho real de " + formatBrl(realAdvantage) + ").";
    } else {
      const cardAdvantage = priceNow - pv10x;
      paymentAdvice = "PARCELE EM 10X E DEIXE NO CDI: o desconto no Pix (" + pixDiscountPct.toFixed(1).replace(".", ",") +
        "%) é menor que o rendimento da Selic/CDI líquido (vantagem de " + formatBrl(cardAdvantage) + " ao parcelar).";
    }

    return {
      cat: cat,
      priceNow: priceNow,
      priceRef: priceRef,
      priceCard: priceCard,
      ptaxShock: ptaxShock,
      diffPct: diffPct,
      targetFairPrice: targetFairPrice,
      verdictCode: verdictCode,
      verdictLabel: verdictLabel,
      badgeClass: badgeClass,
      reasonText: reasonText,
      paymentAdvice: paymentAdvice
    };
  }

  function buildWhatsAppText(state) {
    const lines = [
      "🕵️‍♂️ *DETECTOR DE DESCONTO REAL vs. BLACK FRAUDE*",
      "📦 Categoria: " + state.cat.label,
      "💵 Preço Hoje (Pix): " + formatBrl(state.priceNow) + " | Média 90d: " + formatBrl(state.priceRef),
      "",
      "⚖️ *VEREDITO:* *" + state.verdictLabel + "*",
      "🎯 *Preço-Alvo Justo:* " + formatBrl(state.targetFairPrice),
      "",
      "📊 *Análise:* " + state.reasonText,
      "🏦 *Pix vs. 10x (Selic/CDI):* " + state.paymentAdvice
    ];
    return lines.join("\n");
  }

  function renderPresets() {
    if (!presetsGrid) return;
    clearChildren(presetsGrid);

    BENCHMARK_PRESETS.forEach(function (preset) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "text-left bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-violet-500/50 rounded-xl p-4 space-y-2 transition";

      const tagSpan = document.createElement("span");
      tagSpan.className = "inline-block text-[11px] font-mono-code font-bold px-2 py-0.5 rounded bg-violet-500/20 text-violet-300";
      tagSpan.textContent = preset.tag;

      const titleEl = document.createElement("div");
      titleEl.className = "text-sm font-bold text-white";
      titleEl.textContent = preset.name;

      const metaEl = document.createElement("div");
      metaEl.className = "text-xs font-mono-code text-slate-400";
      metaEl.textContent = "Hoje: " + formatBrl(preset.priceNow) + " | Média 90d: " + formatBrl(preset.priceRef);

      btn.appendChild(tagSpan);
      btn.appendChild(titleEl);
      btn.appendChild(metaEl);

      btn.addEventListener("click", function () {
        if (selectCategory) selectCategory.value = preset.category;
        if (selectWindow) selectWindow.value = preset.window;
        if (inputPriceNow) inputPriceNow.value = String(preset.priceNow);
        if (inputPriceRef) inputPriceRef.value = String(preset.priceRef);
        if (inputPriceCard) inputPriceCard.value = String(preset.priceCard);
        if (inputPtaxShock) inputPtaxShock.value = String(preset.ptaxShock);
        updateUI();
      });

      presetsGrid.appendChild(btn);
    });
  }

  function updateUI() {
    const state = evaluateOffer();

    if (lblPtaxShock) {
      const sign = state.ptaxShock > 0 ? "+" : "";
      lblPtaxShock.textContent = sign + state.ptaxShock.toFixed(1).replace(".", ",") + "%";
    }

    if (verdictBadge) {
      verdictBadge.className = state.badgeClass;
      verdictBadge.textContent = state.verdictLabel;
    }

    if (outTargetPrice) {
      outTargetPrice.textContent = formatBrl(state.targetFairPrice);
    }

    if (outVerdictReason) {
      outVerdictReason.textContent = state.reasonText;
    }

    if (outPaymentVerdict) {
      outPaymentVerdict.textContent = state.paymentAdvice;
    }

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

  function downloadTargetPriceCsv() {
    const state = evaluateOffer();
    const csv = [
      "categoria,preco_pix_hoje_brl,preco_medio_90d_brl,preco_10x_brl,preco_alvo_justo_brl,veredito",
      [
        "\"" + state.cat.label + "\"",
        state.priceNow.toFixed(2),
        state.priceRef.toFixed(2),
        state.priceCard.toFixed(2),
        state.targetFairPrice.toFixed(2),
        "\"" + state.verdictLabel + "\""
      ].join(",")
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "auditoria_preco_alvo_2026.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  [selectCategory, selectWindow, inputPriceNow, inputPriceRef, inputPriceCard, inputPtaxShock].forEach(function (el) {
    if (el) {
      el.addEventListener("input", updateUI);
      el.addEventListener("change", updateUI);
    }
  });

  if (btnCopyVerdict) {
    btnCopyVerdict.addEventListener("click", function () {
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
    btnUnlockPro.addEventListener("click", downloadTargetPriceCsv);
  }

  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") closeCheckoutModal();
  });

  renderPresets();
  updateUI();
})();
