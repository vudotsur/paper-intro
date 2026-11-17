/* tiktok_shop_pipeline/review_queue/app.js - Human-in-the-Loop Review Dashboard
 * Strict Rust-Grade Rigor: Pure DOM API (document.createElement, textContent, replaceChildren).
 * ZERO Forbidden Sinks: Pure DOM manipulation only, zero string-based HTML sinks.
 */

(function () {
  "use strict";

  var STORAGE_DECISIONS_KEY = "tiktok_review_decisions";
  var currentFilter = "all";
  var loadedJobs = [];

  // Fallback initial jobs in case of file:// CORS block
  var FALLBACK_JOBS = [
    {
      job_id: "job_3ae39c12_20261117_002946",
      record_id: "3ae39c12-f9a8-523b-a48c-26eca8fa1e3c",
      status: "PENDING_REVIEW",
      product_id: "BIO-PIX-LT11",
      niche_name: "Gestão Financeira MEI & Pequenos Negócios (Bio Pix D+0)",
      monetization_track: "BIO_PIX_FALLBACK",
      commission_rate: 1.0,
      duration_sec: 26.0,
      resolution: "1080x1920",
      aigc_labeled: true,
      preview_image: "job_3ae39c12_20261117_002946/preview_frame.png",
      video_path: "job_3ae39c12_20261117_002946/video.mp4",
      audio_path: "job_3ae39c12_20261117_002946/narration.wav",
      script_path: "job_3ae39c12_20261117_002946/script_pas.txt",
      created_at_utc: "2026-11-17T00:29:56Z",
      notes: "Aguardando validação do operador.",
      reference_video_url: "https://www.tiktok.com/@gestao_mei_lucrativo/video/7356789012345678901",
      competitor_hook_text: "VOCÊ SABE SE O SEU MEI ESTÁ DANDO LUCRO OU SE VOCÊ ESTÁ PAGANDO PRA TRABALHAR?",
      target_audience_pain: "Desorganização financeira no MEI, mistura de contas e falta de controle do lucro real e do DAS",
      pacing_cut_intervals: [0.0, 3.0, 9.0, 20.0, 26.0],
      script_structure_pas: {
        hook: "VOCÊ SABE SE O SEU MEI ESTÁ DANDO LUCRO OU SE VOCÊ ESTÁ PAGANDO PRA TRABALHAR?",
        agitation: "O dinheiro entra na sua conta, você paga os fornecedores e no final do mês não sobra nada pro seu bolso.",
        solution: "Essa planilha inteligente faz o cálculo automático das suas contas, do DAS e do seu lucro real em menos de 5 minutos por dia.",
        cta: "Apenas R$ 37,00 no Pix com entrega imediata. Clique no link da bio e organize sua empresa hoje!"
      }
    },
    {
      job_id: "job_6ccd48cf_20261117_002936",
      record_id: "6ccd48cf-bddf-5955-922c-72377265c482",
      status: "PENDING_REVIEW",
      product_id: "BIO-PIX-LT02",
      niche_name: "Finanças & Auto-Defesa do Consumidor (Bio Pix D+0)",
      monetization_track: "BIO_PIX_FALLBACK",
      commission_rate: 1.0,
      duration_sec: 26.0,
      resolution: "1080x1920",
      aigc_labeled: true,
      preview_image: "job_6ccd48cf_20261117_002936/preview_frame.png",
      video_path: "job_6ccd48cf_20261117_002936/video.mp4",
      audio_path: "job_6ccd48cf_20261117_002936/narration.wav",
      script_path: "job_6ccd48cf_20261117_002936/script_pas.txt",
      created_at_utc: "2026-11-17T00:29:46Z",
      notes: "Aguardando validação do operador.",
      reference_video_url: "https://www.tiktok.com/@direitos_consumidor_facil/video/7345678912345678910",
      competitor_hook_text: "O BANCO COBROU TAXA QUE VOCÊ NÃO CONTRATOU? NÃO PAGUE!",
      target_audience_pain: "Cobranças indevidas de bancos e receio de gastar com advogado",
      pacing_cut_intervals: [0.0, 2.0, 4.0, 6.2, 8.5, 11.0, 13.5],
      script_structure_pas: {
        hook: "O BANCO COBROU TAXA QUE VOCÊ NÃO CONTRATOU? NÃO PAGUE!",
        agitation: "Bancos e operadoras lucram milhões cobrando tarifas indevidas mês a mês porque sabem que quase ninguém reclama.",
        solution: "Com os modelos prontos do Kit Defesa do Consumidor você protocola no Consumidor.gov.br em 5 minutos e pede o dobro de volta.",
        cta: "Acesse o link direto no meu perfil da bio — liberação imediata no Pix D+0 por R$ 19,90."
      }
    },
    {
      job_id: "job_ceb49f53_20261117_002924",
      record_id: "ceb49f53-7a2a-5d1f-bbb1-ed328cf731d3",
      status: "PENDING_REVIEW",
      product_id: "TK-SHOP-BR-4419",
      niche_name: "Organização Pessoal & Escritório / Home Office",
      monetization_track: "TIKTOK_SHOP_AFFILIATE",
      commission_rate: 0.15,
      duration_sec: 26.0,
      resolution: "1080x1920",
      aigc_labeled: true,
      preview_image: "job_ceb49f53_20261117_002924/preview_frame.png",
      video_path: "job_ceb49f53_20261117_002924/video.mp4",
      audio_path: "job_ceb49f53_20261117_002924/narration.wav",
      script_path: "job_ceb49f53_20261117_002924/script_pas.txt",
      created_at_utc: "2026-11-17T00:29:36Z",
      notes: "Aguardando validação do operador.",
      reference_video_url: "https://www.tiktok.com/@setup_produtivo_br/video/7334512984102941923",
      competitor_hook_text: "SE VOCÊ TRABALHA NO NOTEBOOK E SENTE DOR NO PESCOÇO, OLHA ISSO!",
      target_audience_pain: "Dores posturais no home office e superaquecimento de laptop",
      pacing_cut_intervals: [0.0, 1.5, 3.2, 5.0, 7.0, 9.2, 11.5],
      script_structure_pas: {
        hook: "SE VOCÊ TRABALHA NO NOTEBOOK E SENTE DOR NO PESCOÇO, OLHA ISSO!",
        agitation: "Passar 8 horas olhando para baixo destrói sua postura cervical e faz o laptop esquentar até travar.",
        solution: "Esse suporte ergonômico articulado eleva a tela na altura certa dos olhos e deixa o ar circular livremente.",
        cta: "Aproveite o preço de lançamento na sacolinha do TikTok Shop aqui no vídeo."
      }
    },
    {
      job_id: "job_57360aed_20261117_002914",
      record_id: "57360aed-0242-5eef-b87f-7e4d9e5f3848",
      status: "PENDING_REVIEW",
      product_id: "TK-SHOP-BR-8821",
      niche_name: "Cozinha Inteligente & Praticidade Doméstica",
      monetization_track: "TIKTOK_SHOP_AFFILIATE",
      commission_rate: 0.18,
      duration_sec: 26.0,
      resolution: "1080x1920",
      aigc_labeled: true,
      preview_image: "job_57360aed_20261117_002914/preview_frame.png",
      video_path: "job_57360aed_20261117_002914/video.mp4",
      audio_path: "job_57360aed_20261117_002914/narration.wav",
      script_path: "job_57360aed_20261117_002914/script_pas.txt",
      created_at_utc: "2026-11-17T00:29:24Z",
      notes: "Aguardando validação do operador.",
      reference_video_url: "https://www.tiktok.com/@achadinhos_cozinha_br/video/7321984210984128912",
      competitor_hook_text: "PARE DE JOGAR COMIDA FORA POR CAUSA DE SACO ABERTO!",
      target_audience_pain: "Desperdício de alimentos e pacotes abertos murchando na despensa",
      pacing_cut_intervals: [0.0, 1.8, 3.6, 5.4, 7.5, 9.8, 12.0],
      script_structure_pas: {
        hook: "PARE DE JOGAR COMIDA FORA POR CAUSA DE PACOTE ABERTO!",
        agitation: "Você abre batata ou biscoito e no dia seguinte já tá tudo murcho e sem crocância no armário.",
        solution: "Essa mini seladora térmica portátil fecha qualquer embalagem em 2 segundos usando calor focal.",
        cta: "Clica na sacolinha amarela aqui embaixo antes que acabe o estoque com frete grátis."
      }
    }
  ];

  // LocalStorage Helpers
  function getStoredDecisions() {
    try {
      var raw = localStorage.getItem(STORAGE_DECISIONS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveDecision(jobId, status, notes) {
    try {
      var decisions = getStoredDecisions();
      decisions[jobId] = {
        status: status,
        notes: notes,
        updated_at_utc: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_DECISIONS_KEY, JSON.stringify(decisions));
    } catch (e) {
      console.warn("Could not save to localStorage", e);
    }
  }

  // Toast Helper
  function showToast(message, type) {
    var container = document.getElementById("toast-container");
    if (!container) return;

    var toast = document.createElement("div");
    toast.className =
      "py-2.5 px-4 rounded-lg text-xs font-semibold shadow-lg border transition transform duration-300 pointer-events-auto " +
      (type === "error"
        ? "bg-rose-900/90 text-rose-200 border-rose-700"
        : "bg-slate-900/95 text-white border-slate-700");
    toast.textContent = message;

    container.appendChild(toast);
    setTimeout(function () {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3200);
  }

  // Update KPI counters
  function updateKPIs(jobs) {
    var stored = getStoredDecisions();
    var total = jobs.length;
    var pending = 0;
    var approved = 0;
    var rejected = 0;

    jobs.forEach(function (j) {
      var decision = stored[j.job_id];
      var effectiveStatus = decision ? decision.status : j.status;
      if (effectiveStatus === "APPROVED") {
        approved++;
      } else if (effectiveStatus === "REJECTED") {
        rejected++;
      } else {
        pending++;
      }
    });

    var elTotal = document.getElementById("kpi-total-jobs");
    var elPending = document.getElementById("kpi-pending-jobs");
    var elApproved = document.getElementById("kpi-approved-jobs");
    var elRejected = document.getElementById("kpi-rejected-jobs");

    if (elTotal) elTotal.textContent = String(total);
    if (elPending) elPending.textContent = String(pending);
    if (elApproved) elApproved.textContent = String(approved);
    if (elRejected) elRejected.textContent = String(rejected);
  }

  // Render Single Review Card
  function renderCard(job) {
    var stored = getStoredDecisions();
    var decision = stored[job.job_id];
    var effectiveStatus = decision ? decision.status : job.status;
    var currentNotes = decision ? decision.notes : (job.notes || "");

    var card = document.createElement("article");
    card.className =
      "p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6 transition hover:border-slate-700";

    // Card Header
    var header = document.createElement("div");
    header.className =
      "flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800";

    var headerLeft = document.createElement("div");
    headerLeft.className = "space-y-1";

    var tagRow = document.createElement("div");
    tagRow.className = "flex items-center gap-2 flex-wrap";

    var productTag = document.createElement("span");
    productTag.className =
      "px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30";
    productTag.textContent = job.product_id;

    var nicheTag = document.createElement("span");
    nicheTag.className =
      "px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700";
    nicheTag.textContent = job.niche_name || "Nicho de Mercado";

    var trackTag = document.createElement("span");
    trackTag.className =
      job.monetization_track === "TIKTOK_SHOP_AFFILIATE"
        ? "px-2.5 py-0.5 rounded-md text-xs font-bold bg-yellow-400/20 text-yellow-300 border border-yellow-400/30"
        : "px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
    trackTag.textContent =
      job.monetization_track === "TIKTOK_SHOP_AFFILIATE"
        ? "TIKTOK SHOP AFILIADO"
        : "BIO PIX D+0 FALLBACK";

    tagRow.appendChild(productTag);
    tagRow.appendChild(nicheTag);
    tagRow.appendChild(trackTag);

    var jobTitle = document.createElement("h3");
    jobTitle.className = "text-base font-bold text-white tracking-tight";
    jobTitle.textContent = "Job: " + job.job_id;

    headerLeft.appendChild(tagRow);
    headerLeft.appendChild(jobTitle);

    var headerRight = document.createElement("div");
    headerRight.className = "flex items-center gap-2";

    var statusBadge = document.createElement("span");
    if (effectiveStatus === "APPROVED") {
      statusBadge.className =
        "px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
      statusBadge.textContent = "✓ APROVADO";
    } else if (effectiveStatus === "REJECTED") {
      statusBadge.className =
        "px-3 py-1 rounded-full text-xs font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/30";
      statusBadge.textContent = "✗ REJEITADO";
    } else {
      statusBadge.className =
        "px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30";
      statusBadge.textContent = "● PENDENTE DE REVISÃO";
    }

    headerRight.appendChild(statusBadge);

    header.appendChild(headerLeft);
    header.appendChild(headerRight);
    card.appendChild(header);

    // Side-by-Side Comparison Grid
    var grid = document.createElement("div");
    grid.className = "grid grid-cols-1 lg:grid-cols-2 gap-6";

    // -------------------------------------------------------------
    // LEFT COLUMN: Referência Original Salva (Concorrente)
    // -------------------------------------------------------------
    var leftCol = document.createElement("div");
    leftCol.className =
      "p-5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-4 flex flex-col justify-between";

    var leftTop = document.createElement("div");
    leftTop.className = "space-y-4";

    var leftTitleRow = document.createElement("div");
    leftTitleRow.className = "flex items-center justify-between";

    var leftTitle = document.createElement("h4");
    leftTitle.className =
      "text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2";
    leftTitle.textContent = "1. Referência Original Salva (Concorrente)";

    var leftOriginBadge = document.createElement("span");
    leftOriginBadge.className =
      "text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700";
    leftOriginBadge.textContent = "PROVENIÊNCIA EXTERNA";

    leftTitleRow.appendChild(leftTitle);
    leftTitleRow.appendChild(leftOriginBadge);
    leftTop.appendChild(leftTitleRow);

    // Competitor Hook Quote
    var hookBox = document.createElement("div");
    hookBox.className =
      "p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1";

    var hookLabel = document.createElement("span");
    hookLabel.className = "text-[11px] font-bold text-amber-400 uppercase tracking-wider block";
    hookLabel.textContent = "Hook Original do Concorrente (0-3s):";

    var hookQuote = document.createElement("p");
    hookQuote.className = "text-sm font-semibold text-slate-200 italic leading-snug";
    hookQuote.textContent = '"' + job.competitor_hook_text + '"';

    hookBox.appendChild(hookLabel);
    hookBox.appendChild(hookQuote);
    leftTop.appendChild(hookBox);

    // Target Audience Pain
    var painBox = document.createElement("div");
    painBox.className = "space-y-1 text-xs";

    var painLabel = document.createElement("span");
    painLabel.className = "font-bold text-slate-400 uppercase tracking-wider block";
    painLabel.textContent = "Dor Central da Audiência:";

    var painText = document.createElement("p");
    painText.className = "text-slate-300";
    painText.textContent = job.target_audience_pain;

    painBox.appendChild(painLabel);
    painBox.appendChild(painText);
    leftTop.appendChild(painBox);

    // Commission & Pacing Cuts
    var metricsRow = document.createElement("div");
    metricsRow.className = "grid grid-cols-2 gap-3 text-xs";

    var commBox = document.createElement("div");
    commBox.className = "p-2.5 rounded-lg bg-slate-900 border border-slate-800";
    var commLbl = document.createElement("span");
    commLbl.className = "text-slate-400 block text-[11px]";
    commLbl.textContent = "Comissão Homologada:";
    var commVal = document.createElement("span");
    commVal.className = "text-emerald-400 font-extrabold text-sm block mt-0.5";
    commVal.textContent = Math.round((job.commission_rate || 0) * 100) + "%";
    commBox.appendChild(commLbl);
    commBox.appendChild(commVal);

    var pacingBox = document.createElement("div");
    pacingBox.className = "p-2.5 rounded-lg bg-slate-900 border border-slate-800";
    var pacingLbl = document.createElement("span");
    pacingLbl.className = "text-slate-400 block text-[11px]";
    pacingLbl.textContent = "Cortes (Benchmarking):";
    var pacingVal = document.createElement("span");
    pacingVal.className = "text-indigo-400 font-mono font-semibold text-xs block mt-0.5";
    pacingVal.textContent = (job.pacing_cut_intervals || []).slice(0, 5).join("s, ") + "s...";
    pacingBox.appendChild(pacingLbl);
    pacingBox.appendChild(pacingVal);

    metricsRow.appendChild(commBox);
    metricsRow.appendChild(pacingBox);
    leftTop.appendChild(metricsRow);

    leftCol.appendChild(leftTop);

    // Reference URL Link
    var urlDiv = document.createElement("div");
    urlDiv.className = "pt-3 border-t border-slate-800/80";

    var urlLink = document.createElement("a");
    urlLink.href = job.reference_video_url;
    urlLink.target = "_blank";
    urlLink.rel = "noopener noreferrer";
    urlLink.className =
      "text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline inline-flex items-center gap-1.5 break-all";
    urlLink.textContent = "Ver Vídeo de Referência no TikTok ↗";

    urlDiv.appendChild(urlLink);
    leftCol.appendChild(urlDiv);

    // -------------------------------------------------------------
    // RIGHT COLUMN: Novo Conteúdo 100% Original Gerado
    // -------------------------------------------------------------
    var rightCol = document.createElement("div");
    rightCol.className =
      "p-5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-4";

    var rightTitleRow = document.createElement("div");
    rightTitleRow.className = "flex items-center justify-between";

    var rightTitle = document.createElement("h4");
    rightTitle.className =
      "text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2";
    rightTitle.textContent = "2. Novo Conteúdo 100% Original Gerado";

    var aigcBadge = document.createElement("span");
    aigcBadge.className =
      "text-[10px] font-black px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30";
    aigcBadge.textContent = "● AIGC ROTULADO";

    rightTitleRow.appendChild(rightTitle);
    rightTitleRow.appendChild(aigcBadge);
    rightCol.appendChild(rightTitleRow);

    // Content Display: Visual Preview + Structured PAS Script
    var contentRow = document.createElement("div");
    contentRow.className = "flex flex-col sm:flex-row gap-4 items-start";

    // Visual Preview Column (9:16)
    var visualBox = document.createElement("div");
    visualBox.className = "flex-shrink-0 space-y-2";

    var previewImg = document.createElement("img");
    previewImg.src = job.preview_image;
    previewImg.alt = "Preview Cinético 9:16 (Safe Zone y:220-1580px)";
    previewImg.className =
      "w-36 h-64 object-cover rounded-xl border border-slate-700 shadow-lg bg-slate-900";
    previewImg.loading = "lazy";

    visualBox.appendChild(previewImg);

    if (job.video_path) {
      var videoLink = document.createElement("a");
      videoLink.href = job.video_path;
      videoLink.target = "_blank";
      videoLink.rel = "noopener noreferrer";
      videoLink.className =
        "block text-center py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold border border-slate-700 transition";
      videoLink.textContent = "Abrir MP4 (1080p)";
      visualBox.appendChild(videoLink);
    }

    if (job.audio_path) {
      var audioLink = document.createElement("a");
      audioLink.href = job.audio_path;
      audioLink.target = "_blank";
      audioLink.rel = "noopener noreferrer";
      audioLink.className =
        "block text-center py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-400 text-[11px] font-bold border border-emerald-500/30 transition";
      audioLink.textContent = "Ouvir Narração WAV (SAPI pt-BR)";
      visualBox.appendChild(audioLink);
    }

    contentRow.appendChild(visualBox);

    // Structured PAS Script Column
    var pas = job.script_structure_pas || {};
    var scriptBox = document.createElement("div");
    scriptBox.className = "flex-1 space-y-2.5 text-xs";

    var pasSections = [
      { label: "HOOK (0-3s)", text: pas.hook, col: "text-yellow-400" },
      { label: "AGITAÇÃO (3-9s)", text: pas.agitation, col: "text-orange-400" },
      { label: "SOLUÇÃO & DEMO (9-20s)", text: pas.solution, col: "text-emerald-400" },
      { label: "CTA (20-26s)", text: pas.cta, col: "text-yellow-300 font-bold" }
    ];

    pasSections.forEach(function (sec) {
      var blk = document.createElement("div");
      blk.className = "p-2 rounded bg-slate-900/90 border border-slate-800/80";

      var blkHeader = document.createElement("span");
      blkHeader.className =
        "text-[10px] font-bold uppercase tracking-wider block " + sec.col;
      blkHeader.textContent = sec.label;

      var blkTxt = document.createElement("p");
      blkTxt.className = "text-slate-200 leading-snug mt-0.5";
      blkTxt.textContent = sec.text || "";

      blk.appendChild(blkHeader);
      blk.appendChild(blkTxt);
      scriptBox.appendChild(blk);
    });

    contentRow.appendChild(scriptBox);
    rightCol.appendChild(contentRow);

    // Technical Spec Strip
    var specStrip = document.createElement("div");
    specStrip.className =
      "p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400";

    var specText1 = document.createElement("span");
    specText1.textContent = "Safe Zone: y_min=220px, y_max=1580px, dir=190px";

    var specText2 = document.createElement("span");
    specText2.textContent = "1080x1920 @ 30fps (H.264 / AAC + SAPI pt-BR)";

    specStrip.appendChild(specText1);
    specStrip.appendChild(specText2);
    rightCol.appendChild(specStrip);

    grid.appendChild(leftCol);
    grid.appendChild(rightCol);
    card.appendChild(grid);

    // Operator Action Footer
    var footer = document.createElement("div");
    footer.className =
      "pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4";

    var notesDiv = document.createElement("div");
    notesDiv.className = "flex-1";

    var notesInput = document.createElement("input");
    notesInput.type = "text";
    notesInput.placeholder = "Notas do operador (ex: gancho aprovado, testar variação de cor)...";
    notesInput.value = currentNotes;
    notesInput.className =
      "w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition";

    notesDiv.appendChild(notesInput);
    footer.appendChild(notesDiv);

    var btnsDiv = document.createElement("div");
    btnsDiv.className = "flex items-center gap-2 flex-shrink-0";

    var btnApprove = document.createElement("button");
    btnApprove.type = "button";
    btnApprove.className =
      "px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5";
    btnApprove.textContent = "Aprovar Vídeo";
    btnApprove.addEventListener("click", function () {
      saveDecision(job.job_id, "APPROVED", notesInput.value.trim());
      showToast("Job " + job.job_id + " APROVADO com sucesso!", "success");
      renderQueue();
    });

    var btnReject = document.createElement("button");
    btnReject.type = "button";
    btnReject.className =
      "px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5";
    btnReject.textContent = "Rejeitar";
    btnReject.addEventListener("click", function () {
      saveDecision(job.job_id, "REJECTED", notesInput.value.trim());
      showToast("Job " + job.job_id + " marcado como REJEITADO.", "error");
      renderQueue();
    });

    btnsDiv.appendChild(btnApprove);
    btnsDiv.appendChild(btnReject);
    footer.appendChild(btnsDiv);

    card.appendChild(footer);
    return card;
  }

  // Render Full Review Queue
  function renderQueue() {
    var container = document.getElementById("review-queue-container");
    if (!container) return;

    container.replaceChildren();

    var stored = getStoredDecisions();
    var filtered = loadedJobs.filter(function (j) {
      var decision = stored[j.job_id];
      var effectiveStatus = decision ? decision.status : j.status;
      if (currentFilter === "pending") return effectiveStatus === "PENDING_REVIEW";
      if (currentFilter === "approved") return effectiveStatus === "APPROVED";
      if (currentFilter === "rejected") return effectiveStatus === "REJECTED";
      return true;
    });

    updateKPIs(loadedJobs);

    if (filtered.length === 0) {
      var emptyBox = document.createElement("div");
      emptyBox.className =
        "p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 space-y-2";
      var emptyTitle = document.createElement("p");
      emptyTitle.className = "text-base font-bold text-slate-300";
      emptyTitle.textContent = "Nenhum vídeo nesta categoria.";
      var emptySubtitle = document.createElement("p");
      emptySubtitle.className = "text-xs text-slate-500";
      emptySubtitle.textContent =
        "Execute 'python -m tiktok_shop_pipeline --render-all' para gerar novos vídeos.";
      emptyBox.appendChild(emptyTitle);
      emptyBox.appendChild(emptySubtitle);
      container.appendChild(emptyBox);
      return;
    }

    filtered.forEach(function (job) {
      container.appendChild(renderCard(job));
    });
  }

  // Load review_queue_index.json
  function loadIndex() {
    fetch("review_queue_index.json")
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (Array.isArray(data) && data.length > 0) {
          loadedJobs = data;
        } else {
          loadedJobs = FALLBACK_JOBS;
        }
        renderQueue();
      })
      .catch(function () {
        // Fallback for file:// or offline
        loadedJobs = FALLBACK_JOBS;
        renderQueue();
      });
  }

  // Bind Filter Buttons
  function bindFilters() {
    var buttons = {
      all: document.getElementById("filter-all"),
      pending: document.getElementById("filter-pending"),
      approved: document.getElementById("filter-approved"),
      rejected: document.getElementById("filter-rejected")
    };

    function updateActiveState(activeKey) {
      Object.keys(buttons).forEach(function (key) {
        var btn = buttons[key];
        if (!btn) return;
        if (key === activeKey) {
          btn.className =
            "filter-tab px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white transition";
        } else {
          btn.className =
            "filter-tab px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition";
        }
      });
    }

    Object.keys(buttons).forEach(function (key) {
      var btn = buttons[key];
      if (!btn) return;
      btn.addEventListener("click", function () {
        currentFilter = key;
        updateActiveState(key);
        renderQueue();
      });
    });

    var btnReset = document.getElementById("btn-reset-filters");
    if (btnReset) {
      btnReset.addEventListener("click", function () {
        loadIndex();
        showToast("Fila recarregada.", "info");
      });
    }

    var btnExport = document.getElementById("btn-export-decisions");
    if (btnExport) {
      btnExport.addEventListener("click", function () {
        var decisions = getStoredDecisions();
        var blob = new Blob([JSON.stringify(decisions, null, 2)], {
          type: "application/json"
        });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "tiktok_review_decisions.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("Arquivo de decisões exportado com sucesso!", "success");
      });
    }
  }

  // Initialization
  document.addEventListener("DOMContentLoaded", function () {
    bindFilters();
    loadIndex();
  });
})();
