/* low_ticket_10/app.js - Unified 10-Page Hub & Honest Profit Telemetry (ZERO innerHTML) */
(function () {
  "use strict";

  const PIX_KEY = "vudotsur@gmail.com";
  const FIXED_MONTHLY_COST = 0.0;
  const ORDER_BUMP_AVG_CONTRIBUTION = 4.90 * 0.30; // +R$ 4,90 em ~30% dos pedidos

  const PAGES = [
    {
      txid: "LT01",
      title: "Guia + Planilha Anti-Inflação no Supermercado",
      audience: "Famílias e quem quer cortar até 28% da conta do mercado",
      price: 9.90,
      path: "lt_01_mercado_economia/index.html",
      pitch: "Planilha e guia prático para economizar no supermercado sem passar vontade:"
    },
    {
      txid: "LT02",
      title: "Kit Defesa do Consumidor: Modelos Procon & Cobrança Indevida",
      audience: "Consumidores resolvendo cobrança indevida e negativação sem advogado",
      price: 19.90,
      path: "lt_02_limpa_nome_procon/index.html",
      pitch: "Modelos prontos para resolver cobrança indevida no Procon e Consumidor.gov.br:"
    },
    {
      txid: "LT03",
      title: "Calculadora Real CLT vs PJ & Imposto no Centavo",
      audience: "Profissionais CLT, PJ e freelancers comparando propostas",
      price: 19.90,
      path: "lt_03_clt_pj_calculadora/index.html",
      pitch: "Descubra quanto sobra líquido no CLT vs PJ antes de aceitar proposta:"
    },
    {
      txid: "LT04",
      title: "Currículo Anti-Robô (ATS) & 25 Respostas de Entrevista",
      audience: "Profissionais buscando recolocação rápida e entrevistas",
      price: 14.90,
      path: "lt_04_curriculo_ats_entrevista/index.html",
      pitch: "Passe pelos filtros automáticos de RH e vá preparado para a entrevista:"
    },
    {
      txid: "LT05",
      title: "Planilha Orçamento Dívidas Zero (Método Bola de Neve)",
      audience: "Pessoas quitando dívidas e organizando o orçamento no Pix",
      price: 12.90,
      path: "lt_05_orcamento_dividas_zero/index.html",
      pitch: "Simule a quitação das suas dívidas e organize o mês sem aperto:"
    },
    {
      txid: "LT06",
      title: "Corretor & Guia Anti-Erro de Referências ABNT",
      audience: "Universitários fazendo TCC, monografia e artigos científicos",
      price: 14.90,
      path: "lt_06_tcc_abnt_sem_erro/index.html",
      pitch: "Blinde as referências ABNT do seu TCC antes de entregar:"
    },
    {
      txid: "LT07",
      title: "Edital Verticalizado & Ciclo de Revisão Ebbinghaus para Concursos",
      audience: "Concurseiros organizando matérias e revisões",
      price: 19.90,
      path: "lt_07_cronograma_concursos/index.html",
      pitch: "Edital verticalizado com ciclo automático de revisão para concursos:"
    },
    {
      txid: "LT08",
      title: "50 Mensagens Prontas de WhatsApp para Lojas e Autônomos Venderem Mais",
      audience: "Lojas, autônomos e vendedores fechando pedidos no WhatsApp",
      price: 19.90,
      path: "lt_08_whatsapp_vendas_loja/index.html",
      pitch: "50 mensagens prontas de WhatsApp para copiar, colar e vender mais:"
    },
    {
      txid: "LT09",
      title: "Pacote 40 Prompts Prontos de Negócios & Produtividade",
      audience: "Profissionais de escritório, marketing e vendas",
      price: 19.90,
      path: "lt_09_prompts_negocios_ia/index.html",
      pitch: "Ganhe horas na semana com modelos e comandos prontos:"
    },
    {
      txid: "LT10",
      title: "Radar Prático de Editais & Licitações (Londrina & Cidades)",
      audience: "MEIs, fornecedores locais e prestadores de serviço",
      price: 18.90,
      path: "lt_10_editais_londrina_cidades/index.html",
      pitch: "Acompanhe editais e licitações municipais sem perder prazos:"
    },
    {
      txid: "LT11",
      title: "Kit MEI Lucrativo: Planilha 5 Abas de Fluxo de Caixa & DAS",
      audience: "Microempreendedores individuais (MEIs) e autônomos organizando caixa e separando PF de PJ",
      price: 37.00,
      path: "lt_11_kit_mei_fluxo_caixa/index.html",
      pitch: "Descubra seu lucro real e organize o fluxo de caixa do seu MEI em 15 minutos:"
    }
  ];

  function formatBRL(value) {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  let toastTimer = null;
  function showToast(message) {
    const toast = document.getElementById("hub-toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove("hidden");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.add("hidden");
    }, 2800);
  }

  function copyText(text, okMessage) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(text).then(
        function () {
          showToast(okMessage);
        },
        function () {
          fallbackCopy(text, okMessage);
        }
      );
      return;
    }
    fallbackCopy(text, okMessage);
  }

  function fallbackCopy(text, okMessage) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showToast(okMessage);
    } catch (_err) {
      showToast("Copie manualmente: " + text);
    }
    document.body.removeChild(ta);
  }

  function buildWhatsAppShareUrl(page) {
    const resolvedUrl = new URL(page.path, window.location.href).href;
    const message = page.pitch + " " + resolvedUrl;
    return "https://wa.me/?text=" + encodeURIComponent(message);
  }

  function createPageCard(page) {
    const card = document.createElement("article");
    card.className = "bento-card p-5 sm:p-6 flex flex-col justify-between gap-4";

    const top = document.createElement("div");
    top.className = "space-y-2.5";

    const metaRow = document.createElement("div");
    metaRow.className = "flex items-center justify-between gap-2";

    const txBadge = document.createElement("span");
    txBadge.className = "px-2.5 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-800 text-xs font-mono-code font-semibold";
    txBadge.textContent = page.txid;

    const priceBadge = document.createElement("span");
    priceBadge.className = "text-lg font-extrabold text-zinc-950 tabular-price";
    priceBadge.textContent = formatBRL(page.price);

    metaRow.appendChild(txBadge);
    metaRow.appendChild(priceBadge);

    const titleEl = document.createElement("h3");
    titleEl.className = "text-base sm:text-lg font-bold text-zinc-950 leading-snug";
    titleEl.textContent = page.title;

    const audienceEl = document.createElement("p");
    audienceEl.className = "text-xs sm:text-sm text-zinc-600 leading-relaxed";
    audienceEl.textContent = "Público-alvo: " + page.audience;

    top.appendChild(metaRow);
    top.appendChild(titleEl);
    top.appendChild(audienceEl);

    const actions = document.createElement("div");
    actions.className = "pt-3 border-t border-zinc-200 flex flex-wrap items-center gap-2.5";

    const openLink = document.createElement("a");
    openLink.href = page.path;
    openLink.className = "flex-1 min-w-[160px] text-center px-3.5 py-2.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-xs sm:text-sm font-semibold transition";
    openLink.textContent = "Abrir Página de Venda";

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "px-3.5 py-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs sm:text-sm font-semibold transition";
    copyBtn.textContent = "Copiar Link WhatsApp";
    copyBtn.addEventListener("click", function () {
      const waUrl = buildWhatsAppShareUrl(page);
      copyText(waUrl, "Link WhatsApp (" + page.txid + ") copiado!");
    });

    actions.appendChild(openLink);
    actions.appendChild(copyBtn);

    card.appendChild(top);
    card.appendChild(actions);
    return card;
  }

  function renderCatalog(filterQuery) {
    const grid = document.getElementById("pages-grid");
    if (!grid) return;

    const q = (filterQuery || "").trim().toLowerCase();
    const filtered = PAGES.filter(function (p) {
      if (!q) return true;
      return (
        p.txid.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.audience.toLowerCase().includes(q) ||
        p.path.toLowerCase().includes(q)
      );
    });

    grid.replaceChildren();
    if (filtered.length === 0) {
      const empty = document.createElement("p");
      empty.className = "text-sm text-zinc-500 col-span-full py-6 text-center";
      empty.textContent = "Nenhuma página encontrada para esse filtro.";
      grid.appendChild(empty);
      return;
    }

    filtered.forEach(function (page) {
      grid.appendChild(createPageCard(page));
    });
  }

  function updateSimulator() {
    const visitsEl = document.getElementById("sim-visits");
    const convEl = document.getElementById("sim-conv");
    const ticketEl = document.getElementById("sim-ticket");
    const bumpEl = document.getElementById("sim-order-bump");

    if (!visitsEl || !convEl || !ticketEl || !bumpEl) return;

    const visitsPerPage = Number(visitsEl.value) || 50;
    const convPct = Number(convEl.value) || 2.0;
    const baseTicket = Number(ticketEl.value) || 16.30;
    const includeBump = Boolean(bumpEl.checked);

    const totalDailyVisits = visitsPerPage * PAGES.length;
    const dailySales = totalDailyVisits * (convPct / 100);
    const effectiveTicket = baseTicket + (includeBump ? ORDER_BUMP_AVG_CONTRIBUTION : 0);
    const dailyProfit = Math.max(0, dailySales * effectiveTicket - FIXED_MONTHLY_COST / 30);
    const monthlyProfit = Math.max(0, dailyProfit * 30 - FIXED_MONTHLY_COST);

    const visitsVal = document.getElementById("sim-visits-val");
    const convVal = document.getElementById("sim-conv-val");
    const ticketVal = document.getElementById("sim-ticket-val");
    const dailySalesOut = document.getElementById("sim-daily-sales");
    const dailyProfitOut = document.getElementById("sim-daily-profit");
    const monthlyProfitOut = document.getElementById("sim-monthly-profit");

    if (visitsVal) {
      visitsVal.textContent = visitsPerPage + " / pág (" + totalDailyVisits + "/dia)";
    }
    if (convVal) {
      convVal.textContent = convPct.toFixed(1).replace(".", ",") + "%";
    }
    if (ticketVal) {
      ticketVal.textContent = formatBRL(baseTicket);
    }
    if (dailySalesOut) {
      dailySalesOut.textContent = dailySales.toFixed(1).replace(".", ",") + " vendas";
    }
    if (dailyProfitOut) {
      dailyProfitOut.textContent = formatBRL(dailyProfit);
    }
    if (monthlyProfitOut) {
      monthlyProfitOut.textContent = formatBRL(monthlyProfit);
    }
  }

  function init() {
    renderCatalog("");
    updateSimulator();

    const searchInput = document.getElementById("hub-search");
    if (searchInput) {
      searchInput.addEventListener("input", function (ev) {
        renderCatalog(ev.target.value);
      });
    }

    ["sim-visits", "sim-conv", "sim-ticket", "sim-order-bump"].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("input", updateSimulator);
        el.addEventListener("change", updateSimulator);
      }
    });

    const copyPixBtn = document.getElementById("btn-copy-pix-key");
    if (copyPixBtn) {
      copyPixBtn.addEventListener("click", function () {
        copyText(PIX_KEY, "Chave Pix copiada: " + PIX_KEY);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
