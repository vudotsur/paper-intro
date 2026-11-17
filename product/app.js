/**
 * ============================================================================
 * TOKEN ECONOMICS KIT - CLIENT ENGINE (ZERO LOOSE ENDS)
 * Interactive Token & APC Calculator, Fallback Checkout Gateway, Lean Copying
 * ============================================================================
 */

(function () {
  "use strict";

  // --- CONFIGURATION CONSTANTS (CONFIGURABLE ZERO-LOOSE-ENDS GATEWAY) ---
  // Leave empty or placeholder to test graceful fallback modal.
  // Set valid https:// links when deploying live to Polar.sh or LemonSqueezy.
  const PIX_KEY = "vudotsur@gmail.com";

  const POLAR_CHECKOUT_URL = {
    core: "", // e.g., "https://polar.sh/your-org/products/token-kit-core"
    pro:  ""  // e.g., "https://polar.sh/your-org/products/token-kit-pro"
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
    const amtStr = Number(amount || 147.00).toFixed(2);
    const name = String(merchantName || "VUDOTSUR").toUpperCase().replace(/[^A-Z0-9 .\-/]/g, "").slice(0, 25) || "VUDOTSUR";
    const city = String(merchantCity || "LONDRINA").toUpperCase().replace(/[^A-Z0-9 .\-/]/g, "").slice(0, 15) || "LONDRINA";
    const cleanTxid = String(txid || "TOKENKIT").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 25) || "***";

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

  const LEMON_CHECKOUT_URL = {
    core: "",
    pro:  ""
  };

  // Blended API pricing per 1M tokens ($ USD) - benchmarked 2025/2026
  const PRICING_PRO_PER_M   = 4.00; // Orchestrator Pro tier (Gemini 1.5 Pro / Claude 3.5 / GPT-4o)
  const PRICING_FLASH_PER_M = 0.25; // Worker Flash tier (Gemini 1.5 Flash / Haiku / GPT-4o-mini)
  const IEEE_ACCESS_APC     = 2160; // Academic APC benchmark (USD)
  const PLOS_ONE_APC        = 2477; // Multidisciplinary benchmark (USD)

  // Workload Presets
  const PRESETS = {
    solo: {
      tasks: 50,
      tokens: 4000,
      flash: 75,
      compression: 35
    },
    agency: {
      tasks: 150,
      tokens: 8000,
      flash: 85,
      compression: 45
    },
    enterprise: {
      tasks: 1000,
      tokens: 12000,
      flash: 92,
      compression: 55
    }
  };

  // Lean Template for Clipboard
  const LEAN_TEMPLATE = `[HARNESS_DIRECTIVES]
MODE: LEAN_PROMPTING_STRICT
TARGET: <target_path>

[TASK]
ACTION: <REFACTOR | IMPLEMENT | AUDIT | TEST>
SCOPE: <module_or_function>

[RULES]
1. TELEGRAPHIC: Zero filler, zero pleasantries, min tokens.
2. COMPLEXITY: Enforce O(N) where feasible; preserve public interfaces.
3. OUTPUT: Emit raw code block or unified diff only; zero discursive commentary.

[INPUT]
<paste_code_here>`;

  // --- DOM ELEMENTS ---
  const sliderTasks       = document.getElementById("slider-tasks");
  const sliderTokens      = document.getElementById("slider-tokens");
  const sliderFlash       = document.getElementById("slider-flash");
  const sliderCompression = document.getElementById("slider-compression");

  const valTasks       = document.getElementById("val-tasks");
  const valTokens      = document.getElementById("val-tokens");
  const valFlash       = document.getElementById("val-flash");
  const valCompression = document.getElementById("val-compression");

  const outUsdMonthly    = document.getElementById("out-usd-monthly");
  const outPctSaved      = document.getElementById("out-pct-saved");
  const outTokensMonthly = document.getElementById("out-tokens-monthly");
  const outPayback       = document.getElementById("out-payback");
  const outApcText       = document.getElementById("out-apc-text");

  const btnCopyTemplate = document.getElementById("btn-copy-template");
  const copyBtnText     = document.getElementById("copy-btn-text");
  const toast           = document.getElementById("toast");

  const checkoutModal   = document.getElementById("checkout-modal");
  const btnCloseModal   = document.getElementById("btn-close-modal");
  const modalTierName   = document.getElementById("modal-tier-name");
  const checkoutButtons = document.querySelectorAll(".checkout-btn");
  const presetButtons   = document.querySelectorAll("[data-preset]");

  // --- HELPER FUNCTIONS ---
  function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  }

  function formatCurrency(num) {
    return "$" + num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatTokens(num) {
    if (num >= 1e9) {
      return (num / 1e9).toFixed(2) + " B";
    }
    if (num >= 1e6) {
      return (num / 1e6).toFixed(1) + " M";
    }
    if (num >= 1e3) {
      return (num / 1e3).toFixed(0) + " k";
    }
    return num.toLocaleString();
  }

  // --- CALCULATION ENGINE ---
  function recalculate() {
    // 1. Sanitize & clamp inputs
    const tasks = clamp(parseInt(sliderTasks.value, 10) || 150, 10, 2000);
    const tokensPerTask = clamp(parseInt(sliderTokens.value, 10) || 8000, 1000, 40000);
    const flashRatio = clamp(parseInt(sliderFlash.value, 10) || 85, 0, 100) / 100;
    const compressionRatio = clamp(parseInt(sliderCompression.value, 10) || 45, 0, 70) / 100;

    // Update displayed badge values
    valTasks.textContent = tasks.toLocaleString();
    valTokens.textContent = tokensPerTask.toLocaleString();
    valFlash.textContent = (flashRatio * 100).toFixed(0);
    valCompression.textContent = (compressionRatio * 100).toFixed(0);

    // 2. Compute token volumes
    const monthlyRawTokens = tasks * tokensPerTask * 30;
    const monthlyCompressedTokens = monthlyRawTokens * (1 - compressionRatio);
    const monthlyTokensTrimmed = monthlyRawTokens - monthlyCompressedTokens;

    // 3. Compute baseline cost (100% Pro, 0% compression)
    const baselineMonthlyUsd = (monthlyRawTokens / 1000000) * PRICING_PRO_PER_M;

    // 4. Compute optimized cost (Flash delegation + Lean Prompting compression)
    const flashTokens = monthlyCompressedTokens * flashRatio;
    const proTokens   = monthlyCompressedTokens * (1 - flashRatio);

    const flashCost = (flashTokens / 1000000) * PRICING_FLASH_PER_M;
    const proCost   = (proTokens / 1000000) * PRICING_PRO_PER_M;
    const optimizedMonthlyUsd = flashCost + proCost;

    // 5. Compute Deltas
    const monthlySavedUsd = Math.max(0, baselineMonthlyUsd - optimizedMonthlyUsd);
    const pctSaved = baselineMonthlyUsd > 0 ? (monthlySavedUsd / baselineMonthlyUsd) * 100 : 0;

    // 6. Compute Payback Period (Pro Pack $79 benchmark)
    const proKitPrice = 79.0;
    const dailySavingsUsd = monthlySavedUsd / 30;
    let paybackString = "Instant";
    if (dailySavingsUsd > 0) {
      const hoursToPayback = (proKitPrice / dailySavingsUsd) * 24;
      if (hoursToPayback < 24) {
        paybackString = hoursToPayback.toFixed(1) + " hrs";
      } else {
        const daysToPayback = hoursToPayback / 24;
        paybackString = daysToPayback.toFixed(1) + " days";
      }
    }

    // 7. Academic APC Equivalency
    const annualSavings = monthlySavedUsd * 12;
    const ieeeEquiv = (annualSavings / IEEE_ACCESS_APC).toFixed(1);
    const plosEquiv = (annualSavings / PLOS_ONE_APC).toFixed(1);

    // Render results into DOM
    outUsdMonthly.textContent = formatCurrency(monthlySavedUsd);
    outPctSaved.textContent = pctSaved.toFixed(1) + "%";
    outTokensMonthly.textContent = formatTokens(monthlyTokensTrimmed);
    outPayback.textContent = paybackString;

    if (outApcText) {
      outApcText.textContent = "";
      outApcText.appendChild(document.createTextNode("Your monthly savings ($" + monthlySavedUsd.toFixed(0) + "/mo) equals "));
      const strongIeee = document.createElement("strong");
      strongIeee.textContent = ieeeEquiv + "x IEEE Access Gold OA Publications";
      outApcText.appendChild(strongIeee);
      outApcText.appendChild(document.createTextNode(" ($2,160/ea) or "));
      const strongPlos = document.createElement("strong");
      strongPlos.textContent = plosEquiv + "x PLOS ONE papers";
      outApcText.appendChild(strongPlos);
      outApcText.appendChild(document.createTextNode(" funded annually via token arbitrage."));
    }
  }

  // --- EVENT LISTENERS FOR CONTROLS ---
  [sliderTasks, sliderTokens, sliderFlash, sliderCompression].forEach(function (slider) {
    slider.addEventListener("input", recalculate);
  });

  // Preset Buttons
  presetButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      const presetKey = btn.getAttribute("data-preset");
      const config = PRESETS[presetKey];
      if (!config) return;

      sliderTasks.value = config.tasks;
      sliderTokens.value = config.tokens;
      sliderFlash.value = config.flash;
      sliderCompression.value = config.compression;

      presetButtons.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");

      recalculate();
    });
  });

  // --- COPY TO CLIPBOARD ---
  let toastTimeout = null;
  function showToast(msg) {
    toast.textContent = msg;
    toast.hidden = false;
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(function () {
      toast.hidden = true;
    }, 2800);
  }

  if (btnCopyTemplate) {
    btnCopyTemplate.addEventListener("click", function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(LEAN_TEMPLATE)
          .then(function () {
            showToast("Lean Template copied to clipboard!");
            copyBtnText.textContent = "Copied to Clipboard!";
            setTimeout(function () {
              copyBtnText.textContent = "Copy Production Lean Template";
            }, 2000);
          })
          .catch(function () {
            fallbackCopy(LEAN_TEMPLATE);
          });
      } else {
        fallbackCopy(LEAN_TEMPLATE);
      }
    });
  }

  function fallbackCopy(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
      showToast("Lean Template copied to clipboard!");
    } catch (err) {
      showToast("Unable to auto-copy. Please select and copy manually.");
    }
    document.body.removeChild(textArea);
  }

  // --- CHECKOUT ROUTING & PIX EMVCO MODAL ---
  const pixKeyInput = document.getElementById("pix-key-input");
  const pixBrcodeInput = document.getElementById("pix-brcode-input");
  const btnCopyPixKey = document.getElementById("btn-copy-pix-key");
  const btnCopyPixBrcode = document.getElementById("btn-copy-pix-brcode");
  const btnUnlockKit = document.getElementById("btn-unlock-kit");
  const pixCopiedMsg = document.getElementById("pix-copied-msg");

  function openFallbackModal(tierKey) {
    const isPro = tierKey === "pro";
    const tierDisplay = isPro
      ? "Pro + Decision Graph Pack ($79 / R$ 397)"
      : "Core Kit ($29 / R$ 147)";
    const amountBrl = isPro ? 397.00 : 147.00;
    const txid = isPro ? "TOKENKITPRO" : "TOKENKITCORE";
    const brcode = generatePixBrCode("vudotsur@gmail.com", amountBrl, "VUDOTSUR", "LONDRINA", txid);

    modalTierName.textContent = tierDisplay;
    if (pixKeyInput) pixKeyInput.value = PIX_KEY;
    if (pixBrcodeInput) pixBrcodeInput.value = brcode;
    if (pixCopiedMsg) pixCopiedMsg.hidden = true;
    checkoutModal.hidden = false;
    btnCloseModal.focus();
  }

  function closeModal() {
    checkoutModal.hidden = true;
  }

  if (btnCopyPixKey) {
    btnCopyPixKey.addEventListener("click", function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(PIX_KEY).catch(function () {});
      } else {
        fallbackCopy(PIX_KEY);
      }
      if (pixCopiedMsg) {
        pixCopiedMsg.textContent = "Chave Pix copiada: " + PIX_KEY;
        pixCopiedMsg.hidden = false;
      }
      showToast("Chave Pix vudotsur@gmail.com copiada!");
    });
  }

  if (btnCopyPixBrcode) {
    btnCopyPixBrcode.addEventListener("click", function () {
      const code = pixBrcodeInput ? pixBrcodeInput.value : generatePixBrCode("vudotsur@gmail.com", 147.00, "VUDOTSUR", "LONDRINA", "TOKENKITCORE");
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).catch(function () {});
      } else {
        fallbackCopy(code);
      }
      if (pixCopiedMsg) {
        pixCopiedMsg.textContent = "Código Pix Copia e Cola copiado!";
        pixCopiedMsg.hidden = false;
      }
      showToast("Código Pix Copia e Cola copiado!");
    });
  }

  if (btnUnlockKit) {
    btnUnlockKit.addEventListener("click", function () {
      const blob = new Blob([LEAN_TEMPLATE], { type: "text/plain;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.setAttribute("href", url);
      a.setAttribute("download", "token_economics_pro_kit_2026.txt");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Kit desbloqueado e baixado!");
    });
  }

  if (btnCloseModal) {
    btnCloseModal.addEventListener("click", closeModal);
  }

  if (checkoutModal) {
    checkoutModal.addEventListener("click", function (e) {
      if (e.target === checkoutModal) {
        closeModal();
      }
    });
  }

  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !checkoutModal.hidden) {
      closeModal();
    }
  });

  checkoutButtons.forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      const tier = btn.getAttribute("data-tier");
      const configuredUrl = POLAR_CHECKOUT_URL[tier] || LEMON_CHECKOUT_URL[tier];

      // If valid HTTPS link is configured, redirect
      if (configuredUrl && configuredUrl.startsWith("https://")) {
        window.location.href = configuredUrl;
      } else {
        // Zero-loose-ends fallback modal
        openFallbackModal(tier);
      }
    });
  });

  // Initial calculation run on load
  recalculate();
})();
