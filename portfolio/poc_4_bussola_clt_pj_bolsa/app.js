/**
 * portfolio/poc_4_bussola_clt_pj_bolsa/app.js
 * Bússola Líquida 2026: CLT vs PJ (SLU Fator-R 28% Anexo III) vs Bolsa Acadêmica (CAPES/CNPq)
 * Exact cent-precision calculation + ZERO raw HTML string assignments.
 */
(function () {
  "use strict";

  const PIX_KEY = "vudotsur@gmail.com";

  const CHECKOUT_CONFIG = {
    pixKey: PIX_KEY,
    pixPriceBrl: 19.90,
    merchantName: "VUDOTSUR",
    merchantCity: "LONDRINA",
    defaultTxid: "POC04",
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
    const amtStr = Number(amount || 19.90).toFixed(2);
    const name = String(merchantName || "VUDOTSUR").toUpperCase().replace(/[^A-Z0-9 .\-/]/g, "").slice(0, 25) || "VUDOTSUR";
    const city = String(merchantCity || "LONDRINA").toUpperCase().replace(/[^A-Z0-9 .\-/]/g, "").slice(0, 15) || "LONDRINA";
    const cleanTxid = String(txid || "POC04").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 25) || "***";

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

  // Progressive 2026 INSS Brackets (Employee CLT)
  const INSS_BRACKETS = [
    { limit: 1518.00, rate: 0.075 },
    { limit: 2793.88, rate: 0.090 },
    { limit: 4190.83, rate: 0.120 },
    { limit: 8157.41, rate: 0.140 }
  ];

  // Progressive IRPF Monthly Brackets (with simplified discount floor)
  const IRPF_BRACKETS = [
    { limit: 2259.20, rate: 0.000, deduction: 0.00 },
    { limit: 2826.65, rate: 0.075, deduction: 169.44 },
    { limit: 3751.05, rate: 0.150, deduction: 381.44 },
    { limit: 4664.68, rate: 0.225, deduction: 662.77 },
    { limit: Infinity, rate: 0.275, deduction: 896.00 }
  ];

  const SIMPLIFIED_DISCOUNT = 564.80;

  const inputCltGross = document.getElementById("input-clt-gross");
  const inputCltBenefits = document.getElementById("input-clt-benefits");
  const inputPjGross = document.getElementById("input-pj-gross");
  const selectPjMode = document.getElementById("select-pj-mode");
  const selectBolsaTier = document.getElementById("select-bolsa-tier");
  const inputBolsaExtra = document.getElementById("input-bolsa-extra");

  const outWinnerBadge = document.getElementById("out-winner-badge");
  const outBreakevenPj = document.getElementById("out-breakeven-pj");
  const outFatorRTip = document.getElementById("out-fator-r-tip");
  const outAnnualTaxSaved = document.getElementById("out-annual-tax-saved");

  const comparisonCards = document.getElementById("comparison-cards");
  const whatsappPreviewBox = document.getElementById("whatsapp-preview-box");
  const btnWhatsappShare = document.getElementById("btn-whatsapp-share");
  const btnCopySummary = document.getElementById("btn-copy-summary");
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

  function roundCents(val) {
    return Math.round(val * 100) / 100;
  }

  function formatBrl(val) {
    return "R$ " + roundCents(val).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function clearChildren(node) {
    while (node && node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function computeInssClt(grossSalary) {
    let totalInss = 0;
    let prevLimit = 0;
    for (let i = 0; i < INSS_BRACKETS.length; i++) {
      const b = INSS_BRACKETS[i];
      if (grossSalary > prevLimit) {
        const taxableSlice = Math.min(grossSalary, b.limit) - prevLimit;
        totalInss += taxableSlice * b.rate;
        prevLimit = b.limit;
      } else {
        break;
      }
    }
    return roundCents(totalInss);
  }

  function computeIrpf(grossIncome, inssContribution) {
    // Taxpayer gets whichever deduction is larger: legal INSS or simplified R$ 564.80
    const deductionUsed = Math.max(inssContribution, SIMPLIFIED_DISCOUNT);
    const base = Math.max(0, grossIncome - deductionUsed);
    let tax = 0;
    for (let i = 0; i < IRPF_BRACKETS.length; i++) {
      const b = IRPF_BRACKETS[i];
      if (base <= b.limit) {
        tax = Math.max(0, base * b.rate - b.deduction);
        break;
      }
    }
    return roundCents(tax);
  }

  function calculateCltPackage(grossSalary, benefitsMonthly) {
    const inss = computeInssClt(grossSalary);
    const irpf = computeIrpf(grossSalary, inss);
    const monthlyCashNet = roundCents(grossSalary - inss - irpf);

    // Annualized provisions: 13th salary (1/12 net), 1/3 vacation bonus (1/36 net), FGTS (8% gross)
    const thirteenthMonthly = roundCents(monthlyCashNet / 12);
    const vacationBonusMonthly = roundCents((grossSalary / 3) / 12 * 0.85);
    const fgtsMonthly = roundCents(grossSalary * 0.08);
    const totalEffectiveMonthly = roundCents(
      monthlyCashNet + benefitsMonthly + thirteenthMonthly + vacationBonusMonthly + fgtsMonthly
    );

    return {
      gross: grossSalary,
      inss: inss,
      irpf: irpf,
      monthlyCashNet: monthlyCashNet,
      provisionsAndFgts: roundCents(thirteenthMonthly + vacationBonusMonthly + fgtsMonthly),
      benefits: benefitsMonthly,
      totalEffectiveMonthly: totalEffectiveMonthly
    };
  }

  function calculatePjPackage(grossRevenue, mode) {
    const accountingFee = 249.00;
    let dasRate = 0.06; // Anexo III via Fator-R >= 28%
    let proLaboreShare = 0.28;
    let modeLabel = "Simples Anexo III (Fator-R 28%)";

    if (mode === "anexo_v") {
      dasRate = 0.155;
      proLaboreShare = 0.132; // Min wage pro-labore
      modeLabel = "Simples Anexo V (15,5% s/ Fator-R)";
    } else if (mode === "export_usd") {
      dasRate = 0.0305; // Export of services: PIS/COFINS/ISS immune (LC 116/2003)
      proLaboreShare = 0.28;
      modeLabel = "Exportação USD Polar.sh (~3,05%)";
    }

    const dasTax = roundCents(grossRevenue * dasRate);
    const proLaboreGross = roundCents(Math.max(1518.00, grossRevenue * proLaboreShare));
    // Pro-labore INSS is 11% capped at INSS ceiling (R$ 8,157.41 * 11% = R$ 897.32)
    const inssProLabore = roundCents(Math.min(proLaboreGross, 8157.41) * 0.11);
    const irpfProLabore = computeIrpf(proLaboreGross, inssProLabore);

    const totalTaxesAndCosts = roundCents(dasTax + inssProLabore + irpfProLabore + accountingFee);
    const netMonthly = roundCents(grossRevenue - totalTaxesAndCosts);
    const effectiveTaxPct = grossRevenue > 0 ? roundCents((totalTaxesAndCosts / grossRevenue) * 100) : 0;

    return {
      gross: grossRevenue,
      modeLabel: modeLabel,
      dasRatePct: roundCents(dasRate * 100),
      dasTax: dasTax,
      proLaboreGross: proLaboreGross,
      inssProLabore: inssProLabore,
      irpfProLabore: irpfProLabore,
      accountingFee: accountingFee,
      totalTaxesAndCosts: totalTaxesAndCosts,
      effectiveTaxPct: effectiveTaxPct,
      netMonthly: netMonthly
    };
  }

  function calculateBolsaPackage(bolsaAmount, extraGross) {
    // Academic scholarship (CAPES/CNPq) is 100% exempt from IRPF/INSS (Law 9.250/95 art. 26)
    // Extra project/freelance income via MEI/Simples or autonomous
    const extraTax = roundCents(extraGross * 0.06);
    const netTotal = roundCents(bolsaAmount + extraGross - extraTax);
    return {
      bolsaAmount: bolsaAmount,
      extraGross: extraGross,
      extraTax: extraTax,
      netTotal: netTotal
    };
  }

  function renderComparisonCards(clt, pj, bolsa) {
    if (!comparisonCards) return;
    clearChildren(comparisonCards);

    const columns = [
      {
        badge: "REGIME CLT 2026",
        title: "Salário + Pacote CLT",
        primaryLabel: "Pacote Real Mensalizado (c/ FGTS+13º+Benef.)",
        primaryValue: formatBrl(clt.totalEffectiveMonthly),
        secondaryLabel: "Líquido em Conta Todo Mês: " + formatBrl(clt.monthlyCashNet),
        rows: [
          ["Salário Bruto", formatBrl(clt.gross)],
          ["(-) INSS Progressivo", "- " + formatBrl(clt.inss)],
          ["(-) IRPF Retido", "- " + formatBrl(clt.irpf)],
          ["(+) FGTS + 13º + 1/3 Férias", "+ " + formatBrl(clt.provisionsAndFgts)],
          ["(+) Benefícios (VR/Saúde)", "+ " + formatBrl(clt.benefits)]
        ]
      },
      {
        badge: pj.modeLabel.toUpperCase(),
        title: "PJ (SLU Simples Nacional)",
        primaryLabel: "Lucro + Pró-Labore Líquido no Bolso",
        primaryValue: formatBrl(pj.netMonthly),
        secondaryLabel: "Carga Total (Impostos + Contador): " + pj.effectiveTaxPct.toFixed(2).replace(".", ",") + "%",
        rows: [
          ["Faturamento Bruto NF", formatBrl(pj.gross)],
          ["(-) DAS Simples (" + pj.dasRatePct.toFixed(2).replace(".", ",") + "%)", "- " + formatBrl(pj.dasTax)],
          ["(-) INSS Pró-Labore (11%)", "- " + formatBrl(pj.inssProLabore)],
          ["(-) IRPF s/ Pró-Labore", "- " + formatBrl(pj.irpfProLabore)],
          ["(-) Contabilidade Digital", "- " + formatBrl(pj.accountingFee)]
        ]
      },
      {
        badge: "ACADEMIA + PROJETOS (PORTARIA 133)",
        title: "Bolsa CAPES/CNPq + Extra",
        primaryLabel: "Renda Líquida Combinada Mensal",
        primaryValue: formatBrl(bolsa.netTotal),
        secondaryLabel: "Bolsa 100% Isenta de IRPF (Lei 9.250/95)",
        rows: [
          ["Bolsa CAPES/CNPq Isenta", formatBrl(bolsa.bolsaAmount)],
          ["(+) Projeto / Docência Extra", "+ " + formatBrl(bolsa.extraGross)],
          ["(-) Tributos s/ Renda Extra", "- " + formatBrl(bolsa.extraTax)],
          ["Status Legal Acúmulo", "Permitido (Portaria CAPES 133)"],
          ["Retenção na Fonte Bolsa", "R$ 0,00 (Isento)"]
        ]
      }
    ];

    columns.forEach(function (col) {
      const card = document.createElement("article");
      card.className = "bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4";

      const headDiv = document.createElement("div");
      headDiv.className = "space-y-1";

      const badgeEl = document.createElement("span");
      badgeEl.className = "text-[11px] font-mono-code font-bold text-teal-400 uppercase";
      badgeEl.textContent = col.badge;

      const titleEl = document.createElement("h3");
      titleEl.className = "text-base font-bold text-white";
      titleEl.textContent = col.title;

      const valLabel = document.createElement("div");
      valLabel.className = "text-xs text-slate-400 pt-2";
      valLabel.textContent = col.primaryLabel;

      const valBig = document.createElement("div");
      valBig.className = "text-2xl font-extrabold font-mono-code text-white";
      valBig.textContent = col.primaryValue;

      const subEl = document.createElement("div");
      subEl.className = "text-xs font-mono-code text-teal-300";
      subEl.textContent = col.secondaryLabel;

      headDiv.appendChild(badgeEl);
      headDiv.appendChild(titleEl);
      headDiv.appendChild(valLabel);
      headDiv.appendChild(valBig);
      headDiv.appendChild(subEl);

      const listDiv = document.createElement("div");
      listDiv.className = "pt-3 border-t border-slate-800 space-y-1.5";

      col.rows.forEach(function (pair) {
        const r = document.createElement("div");
        r.className = "flex justify-between text-xs font-mono-code";

        const k = document.createElement("span");
        k.className = "text-slate-400";
        k.textContent = pair[0];

        const v = document.createElement("span");
        v.className = "text-slate-200 font-semibold";
        v.textContent = pair[1];

        r.appendChild(k);
        r.appendChild(v);
        listDiv.appendChild(r);
      });

      card.appendChild(headDiv);
      card.appendChild(listDiv);
      comparisonCards.appendChild(card);
    });
  }

  function buildWhatsAppText(clt, pj, bolsa, breakevenPj, annualFatorRSavings) {
    const diffPjClt = roundCents(pj.netMonthly - clt.totalEffectiveMonthly);
    const winnerText = diffPjClt >= 0
      ? "PJ supera pacote CLT completo em +" + formatBrl(diffPjClt) + "/mês"
      : "Pacote CLT completo supera PJ atual em +" + formatBrl(Math.abs(diffPjClt)) + "/mês";

    const lines = [
      "🧭 *BÚSSOLA LÍQUIDA 2026: CLT vs. PJ vs. BOLSA*",
      "",
      "💼 *1. Pacote CLT (Bruto " + formatBrl(clt.gross) + "):*",
      "• Líquido em conta/mês: " + formatBrl(clt.monthlyCashNet),
      "• Pacote Real c/ FGTS + 13º + Benefícios: *" + formatBrl(clt.totalEffectiveMonthly) + "*",
      "",
      "🏢 *2. PJ " + pj.modeLabel + " (NF " + formatBrl(pj.gross) + "):*",
      "• Líquido livre no bolso: *" + formatBrl(pj.netMonthly) + "/mês*",
      "• Carga total efetiva: " + pj.effectiveTaxPct.toFixed(2).replace(".", ",") + "%",
      "",
      "🎓 *3. Bolsa CAPES/CNPq + Renda Extra:*",
      "• Líquido Combinado: *" + formatBrl(bolsa.netTotal) + "/mês*",
      "",
      "⚖️ *Veredito:* " + winnerText,
      "🎯 *Ponto de Equilíbrio PJ vs CLT:* " + formatBrl(breakevenPj) + "/mês",
      "💡 *Economia Anual Fator-R 28% (Anexo III vs V):* " + formatBrl(annualFatorRSavings) + "/ano"
    ];
    return lines.join("\n");
  }

  function updateUI() {
    const cltGross = Math.max(1518, parseFloat(inputCltGross ? inputCltGross.value : 7500) || 7500);
    const cltBenefits = Math.max(0, parseFloat(inputCltBenefits ? inputCltBenefits.value : 1250) || 0);
    const pjGross = Math.max(1518, parseFloat(inputPjGross ? inputPjGross.value : 11500) || 11500);
    const pjMode = selectPjMode ? selectPjMode.value : "fator_r";
    const bolsaTier = Math.max(0, parseFloat(selectBolsaTier ? selectBolsaTier.value : 3100) || 3100);
    const bolsaExtra = Math.max(0, parseFloat(inputBolsaExtra ? inputBolsaExtra.value : 3500) || 0);

    const clt = calculateCltPackage(cltGross, cltBenefits);
    const pj = calculatePjPackage(pjGross, pjMode);
    const bolsa = calculateBolsaPackage(bolsaTier, bolsaExtra);

    // Compare Anexo III (Fator R) vs Anexo V to show annual savings
    const pjAnexoIII = calculatePjPackage(pjGross, "fator_r");
    const pjAnexoV = calculatePjPackage(pjGross, "anexo_v");
    const annualFatorRSavings = roundCents(Math.max(0, (pjAnexoIII.netMonthly - pjAnexoV.netMonthly) * 12));

    // Estimate PJ gross revenue required to match CLT total effective monthly package
    const netRatio = pj.gross > 0 ? (pj.netMonthly / pj.gross) : 0.88;
    const breakevenPj = roundCents(clt.totalEffectiveMonthly / Math.max(0.70, netRatio));

    const diffPjClt = roundCents(pj.netMonthly - clt.totalEffectiveMonthly);
    if (outWinnerBadge) {
      if (diffPjClt >= 0) {
        outWinnerBadge.textContent = "PJ VENCE PACOTE CLT POR +" + formatBrl(diffPjClt) + "/MÊS";
        outWinnerBadge.className = "inline-block px-3 py-1 rounded-lg font-mono-code font-extrabold text-xs sm:text-sm bg-teal-500/20 text-teal-300 border border-teal-500/40";
      } else {
        outWinnerBadge.textContent = "PACOTE CLT VENCE PJ POR +" + formatBrl(Math.abs(diffPjClt)) + "/MÊS";
        outWinnerBadge.className = "inline-block px-3 py-1 rounded-lg font-mono-code font-extrabold text-xs sm:text-sm bg-amber-500/20 text-amber-300 border border-amber-500/40";
      }
    }

    if (outBreakevenPj) {
      outBreakevenPj.textContent = formatBrl(breakevenPj);
    }

    if (outFatorRTip) {
      outFatorRTip.textContent = "Pró-Labore sugerido Fator-R (28%): " + formatBrl(pjAnexoIII.proLaboreGross) +
        "/mês. Reduz o DAS do Simples de 15,50% para 6,00%.";
    }

    if (outAnnualTaxSaved) {
      outAnnualTaxSaved.textContent = formatBrl(annualFatorRSavings) + " / ano";
    }

    renderComparisonCards(clt, pj, bolsa);

    const waText = buildWhatsAppText(clt, pj, bolsa, breakevenPj, annualFatorRSavings);
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

  function downloadTaxKitCsv() {
    const text = whatsappPreviewBox ? whatsappPreviewBox.textContent : "Kit Planejamento Fiscal Fator-R 28%";
    const blob = new Blob([text], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "kit_planejamento_fiscal_fator_r_2026.txt");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  [inputCltGross, inputCltBenefits, inputPjGross, selectPjMode, selectBolsaTier, inputBolsaExtra].forEach(function (el) {
    if (el) {
      el.addEventListener("input", updateUI);
      el.addEventListener("change", updateUI);
    }
  });

  if (btnCopySummary) {
    btnCopySummary.addEventListener("click", function () {
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
    btnUnlockPro.addEventListener("click", downloadTaxKitCsv);
  }

  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") closeCheckoutModal();
  });

  updateUI();
})();
