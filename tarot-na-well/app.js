/* Tarot na Well — Modular ES6 Frontend (Safe DOM Only / Zero eval / Sandbox-Ready) */

const STORAGE_KEYS = {
  theme: 'tarot_well_theme',
  confirmedBooking: 'tarot_well_confirmed_booking_v1',
  installDismissed: 'tarot_well_install_dismissed',
  apiBase: 'tarot_well_api_base_v1',
  adminLocalState: 'tarot_well_admin_state_v1'
};

export const DEFAULT_PIX_KEY = 'vudotsur@gmail.com';
export const DEFAULT_MERCHANT_NAME = 'VUDOTSUR';
export const DEFAULT_MERCHANT_CITY = 'LONDRINA';

const PACKAGES = {
  '15m': {
    id: '15m',
    label: 'Tiragem Direta',
    durationMin: 15,
    amountCents: 2000,
    priceText: 'R$ 20,00',
    summary: 'Tiragem Direta (15 min) — 3 Cartas, foco em 1 pergunta objetiva'
  },
  '30m': {
    id: '30m',
    label: 'Leitura Profunda',
    durationMin: 30,
    amountCents: 5000,
    priceText: 'R$ 50,00',
    summary: 'Leitura Profunda (30 min) — Panorama + Plano de Ação + Resumo por E-mail'
  }
};

const MACRO_ZONES = {
  online: 'Entorno Central do Campus — próximo aos cafés e papelarias (área ampla >= 150 m)',
  offline: 'Pontos públicos homologados na região do campus (área ampla >= 150 m)'
};

const state = {
  apiBase: '',
  turnstileSiteKey: '',
  isDemoMode: true,
  demoPresence: 'LIVE_ON_CAMPUS',
  presenceState: 'LIVE_ON_CAMPUS',
  selectedPackageId: '15m',
  slots: [],
  selectedSlot: null,
  hold: null,
  countdownTimerId: null,
  pollTimerId: null,
  deferredInstallPrompt: null,
  turnstileToken: ''
};

function readMeta(name) {
  const el = document.querySelector(`meta[name="${name}"]`);
  return el ? el.getAttribute('content').trim() : '';
}

function getUtmSource() {
  try {
    const params = new URLSearchParams(window.location.search);
    const src = params.get('src') || params.get('utm_source') || '';
    return src.slice(0, 64);
  } catch {
    return '';
  }
}

/* ---------- Safe DOM Helpers ---------- */
function clearElement(el) {
  if (el) {
    el.replaceChildren();
  }
}

function createTextEl(tag, text, className) {
  const el = document.createElement(tag);
  if (className) {
    el.className = className;
  }
  el.textContent = text;
  return el;
}

/* ---------- Date & Currency Formatting ---------- */
function formatSlotDay(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const todayKey = now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const tomorrow = new Date(now.getTime() + 86400000);
  const tomorrowKey = tomorrow.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const targetKey = date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const weekday = date.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Sao_Paulo'
  });

  if (targetKey === todayKey) {
    return `Hoje (${weekday})`;
  }
  if (targetKey === tomorrowKey) {
    return `Amanhã (${weekday})`;
  }
  return weekday;
}

function formatSlotTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  });
}

function formatCountdown(secondsLeft) {
  const safe = Math.max(0, Math.floor(secondsLeft));
  const mins = String(Math.floor(safe / 60)).padStart(2, '0');
  const secs = String(safe % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

function toIcsUtc(isoString) {
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, '0');
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

/* ---------- Theme Switcher ---------- */
function applyTheme(theme) {
  const root = document.documentElement;
  const btn = document.getElementById('btn-theme-toggle');
  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark');
    if (btn) {
      btn.textContent = 'Tema Claro';
      btn.setAttribute('aria-pressed', 'true');
    }
  } else if (theme === 'light') {
    root.setAttribute('data-theme', 'light');
    if (btn) {
      btn.textContent = 'Tema Escuro';
      btn.setAttribute('aria-pressed', 'false');
    }
  } else {
    root.removeAttribute('data-theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (btn) {
      btn.textContent = prefersDark ? 'Tema Claro' : 'Tema Escuro';
      btn.setAttribute('aria-pressed', prefersDark ? 'true' : 'false');
    }
  }
}

function initTheme() {
  let saved = '';
  try {
    saved = localStorage.getItem(STORAGE_KEYS.theme) || '';
  } catch {
    saved = '';
  }
  applyTheme(saved);

  const btn = document.getElementById('btn-theme-toggle');
  if (btn) {
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isCurrentlyDark = current === 'dark' || (!current && prefersDark);
      const next = isCurrentlyDark ? 'light' : 'dark';
      try {
        localStorage.setItem(STORAGE_KEYS.theme, next);
      } catch {
        // Ignore storage restriction
      }
      applyTheme(next);
    });
  }
}

/* ---------- Platform & PWA Install Detection ---------- */
function isStandaloneMode() {
  return (
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true
  );
}

function detectPlatformEnvironment() {
  const ua = navigator.userAgent || '';
  const isInAppWebView = /Instagram|FBAN|FBAV|BytedanceWebview|musical_ly|TikTok|Line\/|MicroMessenger/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isIOSSafari = isIOS && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
  return { isInAppWebView, isIOS, isIOSSafari };
}

function updateInstallVisibility() {
  const standalone = isStandaloneMode();
  const banner = document.getElementById('pwa-install-banner');
  const headerBtn = document.getElementById('btn-header-install');
  const footerBtn = document.getElementById('btn-footer-install');
  const confirmedBtn = document.getElementById('btn-confirmed-install');

  let dismissed = false;
  try {
    dismissed = sessionStorage.getItem(STORAGE_KEYS.installDismissed) === '1';
  } catch {
    dismissed = false;
  }

  if (banner) {
    banner.hidden = standalone || dismissed;
  }
  if (headerBtn) {
    headerBtn.hidden = standalone;
  }
  if (footerBtn) {
    footerBtn.hidden = standalone;
  }
  if (confirmedBtn) {
    confirmedBtn.hidden = standalone;
  }

  const hintEl = document.getElementById('install-banner-hint');
  if (hintEl && !standalone) {
    const env = detectPlatformEnvironment();
    if (env.isInAppWebView) {
      hintEl.textContent = 'abra no Chrome ou Safari para conseguir salvar o atalho na tela inicial.';
    } else if (env.isIOS) {
      hintEl.textContent = 'no iPhone/iPad, toque em Compartilhar e depois em "Adicionar à Tela de Início".';
    } else {
      hintEl.textContent = 'acesse horários e seu comprovante em 1 toque, mesmo sem internet.';
    }
  }
}

function renderInstallModalBody() {
  const body = document.getElementById('install-modal-body');
  if (!body) {
    return;
  }
  clearElement(body);

  const env = detectPlatformEnvironment();

  if (env.isInAppWebView) {
    const warn = createTextEl(
      'div',
      'Você abriu este link dentro do navegador interno de um aplicativo (como Instagram ou TikTok). Esse navegador bloqueia a criação de ícones na tela inicial.',
      'install-callout'
    );
    body.appendChild(warn);

    const steps = document.createElement('ol');
    steps.className = 'install-steps';
    steps.appendChild(createTextEl('li', 'Toque no menu de opções no canto superior ou inferior (••• ou ⋮).'));
    steps.appendChild(createTextEl('li', 'Escolha "Abrir no navegador" (Chrome no Android ou Safari no iPhone).'));
    steps.appendChild(createTextEl('li', 'Na página aberta, toque novamente em "Salvar Ícone" para fixar o atalho.'));
    body.appendChild(steps);
    return;
  }

  if (env.isIOS) {
    const info = createTextEl(
      'p',
      'No iPhone ou iPad (Safari), siga estes 3 passos rápidos para fixar o Tarot na Well na sua Tela de Início:'
    );
    body.appendChild(info);

    const steps = document.createElement('ol');
    steps.className = 'install-steps';
    steps.appendChild(createTextEl('li', 'Toque no botão Compartilhar (ícone de quadrado com seta para cima ↑) na barra do Safari.'));
    steps.appendChild(createTextEl('li', 'Role as opções e toque em "Adicionar à Tela de Início".'));
    steps.appendChild(createTextEl('li', 'Confirme tocando em "Adicionar" no canto superior direito.'));
    body.appendChild(steps);
    return;
  }

  // Android / Desktop Chrome / Edge
  const intro = createTextEl(
    'p',
    'Salve o Tarot na Well como um aplicativo leve no seu celular ou computador. O comprovante com seu ponto de encontro fica disponível mesmo offline.'
  );
  body.appendChild(intro);

  if (state.deferredInstallPrompt) {
    const triggerBtn = createTextEl('button', 'Instalar Ícone Agora', 'btn btn-primary btn-lg btn-block');
    triggerBtn.type = 'button';
    triggerBtn.addEventListener('click', async () => {
      if (!state.deferredInstallPrompt) {
        return;
      }
      state.deferredInstallPrompt.prompt();
      try {
        await state.deferredInstallPrompt.userChoice;
      } catch {
        // Ignore user dismiss errors
      }
      state.deferredInstallPrompt = null;
      closeModal('install-modal');
      updateInstallVisibility();
    });
    body.appendChild(triggerBtn);
  } else {
    const manualBox = createTextEl(
      'div',
      'Se o botão automático não aparecer, clique no ícone de instalação na barra de endereço do navegador (⊕) ou abra o menu (⋮) e toque em "Instalar aplicativo" / "Adicionar à tela inicial".',
      'install-callout'
    );
    body.appendChild(manualBox);
  }
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) {
    return;
  }
  if (modalId === 'install-modal') {
    renderInstallModalBody();
  }
  modal.hidden = false;
  const closeBtn = modal.querySelector('button');
  if (closeBtn) {
    closeBtn.focus();
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.hidden = true;
  }
}

function initPwaAndModals() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    updateInstallVisibility();
  });

  window.addEventListener('appinstalled', () => {
    state.deferredInstallPrompt = null;
    closeModal('install-modal');
    updateInstallVisibility();
  });

  const openInstall = () => openModal('install-modal');
  document.getElementById('btn-open-install')?.addEventListener('click', openInstall);
  document.getElementById('btn-header-install')?.addEventListener('click', openInstall);
  document.getElementById('btn-footer-install')?.addEventListener('click', openInstall);
  document.getElementById('btn-confirmed-install')?.addEventListener('click', openInstall);

  document.getElementById('btn-dismiss-install')?.addEventListener('click', () => {
    try {
      sessionStorage.setItem(STORAGE_KEYS.installDismissed, '1');
    } catch {
      // Ignore storage failure
    }
    updateInstallVisibility();
  });

  document.getElementById('btn-close-install-modal')?.addEventListener('click', () => closeModal('install-modal'));
  document.getElementById('btn-open-privacy')?.addEventListener('click', () => openModal('privacy-modal'));
  document.getElementById('btn-close-privacy-modal')?.addEventListener('click', () => closeModal('privacy-modal'));

  document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) {
        backdrop.hidden = true;
      }
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeModal('install-modal');
      closeModal('privacy-modal');
    }
  });

  updateInstallVisibility();
}

/* ---------- Official Banco Central EMVCo BR Code (Pix Copia-e-Cola) ---------- */
function formatTlv(tag, value) {
  const str = String(value);
  return `${tag}${String(str.length).padStart(2, '0')}${str}`;
}

function sanitizeAsciiUpper(text, maxLen) {
  const normalized = String(text || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const asciiOnly = normalized.replace(/[^\x20-\x7E]/g, '');
  const cleaned = asciiOnly.replace(/[^A-Za-z0-9 .\-/]/g, '').trim().toUpperCase();
  return cleaned.slice(0, maxLen);
}

export function computeCrc16Ccitt(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i += 1) {
    const byte = payload.charCodeAt(i) & 0xff;
    crc = (crc ^ (byte << 8)) & 0xffff;
    for (let bit = 0; bit < 8; bit += 1) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function generatePixBrCode(
  inputOrAmount = {},
  txidArg = 'TNW01',
  pixKeyArg = DEFAULT_PIX_KEY,
  merchantNameArg = DEFAULT_MERCHANT_NAME,
  merchantCityArg = DEFAULT_MERCHANT_CITY
) {
  let pixKey = DEFAULT_PIX_KEY;
  let merchantName = DEFAULT_MERCHANT_NAME;
  let merchantCity = DEFAULT_MERCHANT_CITY;
  let amount = 20.0;
  let rawTxid = 'TNW01';

  if (typeof inputOrAmount === 'number') {
    amount = (inputOrAmount === 2000 || inputOrAmount === 5000) ? inputOrAmount / 100 : inputOrAmount;
    if (txidArg) rawTxid = txidArg;
    if (pixKeyArg) pixKey = pixKeyArg;
    if (merchantNameArg) merchantName = merchantNameArg;
    if (merchantCityArg) merchantCity = merchantCityArg;
  } else if (inputOrAmount && typeof inputOrAmount === 'object') {
    if (inputOrAmount.pixKey) pixKey = String(inputOrAmount.pixKey).trim();
    if (inputOrAmount.merchantName) merchantName = String(inputOrAmount.merchantName).trim();
    if (inputOrAmount.merchantCity) merchantCity = String(inputOrAmount.merchantCity).trim();
    if (typeof inputOrAmount.amount === 'number' && Number.isFinite(inputOrAmount.amount)) {
      amount = (inputOrAmount.amount === 2000 || inputOrAmount.amount === 5000)
        ? inputOrAmount.amount / 100
        : inputOrAmount.amount;
    } else if (typeof inputOrAmount.amountCents === 'number' && Number.isFinite(inputOrAmount.amountCents)) {
      amount = inputOrAmount.amountCents / 100;
    }
    if (inputOrAmount.txid) rawTxid = String(inputOrAmount.txid).trim();
  }

  const cleanKey = pixKey.trim().slice(0, 77);
  const cleanName = sanitizeAsciiUpper(merchantName, 25) || DEFAULT_MERCHANT_NAME;
  const cleanCity = sanitizeAsciiUpper(merchantCity, 15) || DEFAULT_MERCHANT_CITY;

  const alnum = rawTxid.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const prefixedTxid = (alnum.startsWith('TNW') ? alnum : `TNW${alnum}`).slice(0, 25);
  const cleanTxid = prefixedTxid.length > 3 ? prefixedTxid : 'TNW01';

  const amountStr = Number(amount).toFixed(2);
  const guiTlv = formatTlv('00', 'br.gov.bcb.pix');
  const keyTlv = formatTlv('01', cleanKey);
  const merchantAccountTlv = formatTlv('26', `${guiTlv}${keyTlv}`);
  const txidTlv = formatTlv('62', formatTlv('05', cleanTxid));

  const bodyWithoutCrc = [
    formatTlv('00', '01'),
    merchantAccountTlv,
    formatTlv('52', '0000'),
    formatTlv('53', '986'),
    formatTlv('54', amountStr),
    formatTlv('58', 'BR'),
    formatTlv('59', cleanName),
    formatTlv('60', cleanCity),
    txidTlv,
    '6304'
  ].join('');

  const crcHex = computeCrc16Ccitt(bodyWithoutCrc);
  return `${bodyWithoutCrc}${crcHex}`;
}

/* ---------- Real Scannable ISO/IEC 18004 QR Code SVG Encoder (Pure JS) ---------- */
// ISO/IEC 18004 ECC Level L capacity table for Versions 1..10:
// [version, totalDataCodewords, ecCodewordsPerBlock, blockDataLengths]
const QR_LEVEL_L_SPECS = [
  null,
  [1, 19, 7, [19]],
  [2, 34, 10, [34]],
  [3, 55, 15, [55]],
  [4, 80, 20, [80]],
  [5, 108, 26, [108]],
  [6, 136, 18, [68, 68]],
  [7, 156, 20, [78, 78]],
  [8, 194, 24, [97, 97]],
  [9, 232, 30, [116, 116]],
  [10, 274, 18, [68, 68, 69, 69]]
];

const QR_ALIGNMENT_CENTERS = [
  null,
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50]
];

function gf256Mul(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i -= 1) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function buildReedSolomonDivisor(degree) {
  const result = new Uint8Array(degree);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < degree; j += 1) {
      result[j] = gf256Mul(result[j], root);
      if (j + 1 < degree) {
        result[j] ^= result[j + 1];
      }
    }
    root = gf256Mul(root, 0x02);
  }
  return result;
}

function computeReedSolomonRemainder(dataBytes, divisor) {
  const result = new Uint8Array(divisor.length);
  for (let i = 0; i < dataBytes.length; i += 1) {
    const factor = dataBytes[i] ^ result[0];
    result.copyWithin(0, 1);
    result[divisor.length - 1] = 0;
    for (let j = 0; j < divisor.length; j += 1) {
      result[j] ^= gf256Mul(divisor[j], factor);
    }
  }
  return result;
}

function appendBits(bitArray, val, len) {
  for (let i = len - 1; i >= 0; i -= 1) {
    bitArray.push((val >>> i) & 1);
  }
}

function evaluateQrMaskPenalty(modules, size) {
  let penalty = 0;
  // N1: 5+ consecutive same-colored modules in row/col
  for (let r = 0; r < size; r += 1) {
    let runColor = modules[r][0];
    let runLen = 1;
    for (let c = 1; c < size; c += 1) {
      if (modules[r][c] === runColor) {
        runLen += 1;
        if (runLen === 5) penalty += 3;
        else if (runLen > 5) penalty += 1;
      } else {
        runColor = modules[r][c];
        runLen = 1;
      }
    }
  }
  for (let c = 0; c < size; c += 1) {
    let runColor = modules[0][c];
    let runLen = 1;
    for (let r = 1; r < size; r += 1) {
      if (modules[r][c] === runColor) {
        runLen += 1;
        if (runLen === 5) penalty += 3;
        else if (runLen > 5) penalty += 1;
      } else {
        runColor = modules[r][c];
        runLen = 1;
      }
    }
  }
  // N2: 2x2 blocks
  for (let r = 0; r < size - 1; r += 1) {
    for (let c = 0; c < size - 1; c += 1) {
      const color = modules[r][c];
      if (
        color === modules[r][c + 1] &&
        color === modules[r + 1][c] &&
        color === modules[r + 1][c + 1]
      ) {
        penalty += 3;
      }
    }
  }
  // N4: dark module balance
  let darkCount = 0;
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (modules[r][c]) darkCount += 1;
    }
  }
  const total = size * size;
  const k = Math.ceil((Math.abs(darkCount * 20 - total * 10) + total - 1) / total) - 1;
  penalty += Math.max(0, k) * 10;
  return penalty;
}

function drawFormatBits(modules, isFunction, size, mask) {
  // ECC Level L = 0b01 = 1
  const data = (1 << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i += 1) {
    rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  }
  const bits = ((data << 10) | rem) ^ 0x5412;

  const setFormat = (r, c, bit) => {
    modules[r][c] = bit;
    isFunction[r][c] = true;
  };

  for (let i = 0; i <= 5; i += 1) setFormat(i, 8, ((bits >>> i) & 1) !== 0);
  setFormat(7, 8, ((bits >>> 6) & 1) !== 0);
  setFormat(8, 8, ((bits >>> 7) & 1) !== 0);
  setFormat(8, 7, ((bits >>> 8) & 1) !== 0);
  for (let i = 9; i < 15; i += 1) setFormat(8, 14 - i, ((bits >>> i) & 1) !== 0);

  for (let i = 0; i < 8; i += 1) setFormat(8, size - 1 - i, ((bits >>> i) & 1) !== 0);
  for (let i = 8; i < 15; i += 1) setFormat(size - 15 + i, 8, ((bits >>> i) & 1) !== 0);
  setFormat(size - 8, 8, true);
}

export function encodeQrMatrixIso18004(payload) {
  const bytes = new TextEncoder().encode(String(payload || 'TAROT-NA-WELL'));

  let spec = QR_LEVEL_L_SPECS[10];
  for (let v = 1; v <= 10; v += 1) {
    const candidate = QR_LEVEL_L_SPECS[v];
    const countBits = v <= 9 ? 8 : 16;
    const maxDataBytes = Math.floor((candidate[1] * 8 - 4 - countBits) / 8);
    if (bytes.length <= maxDataBytes) {
      spec = candidate;
      break;
    }
  }

  const [version, totalDataCodewords, ecPerBlock, blockLengths] = spec;
  const countBits = version <= 9 ? 8 : 16;
  const bitStream = [];

  // Mode indicator: Byte mode = 0b0100
  appendBits(bitStream, 0b0100, 4);
  appendBits(bitStream, bytes.length, countBits);
  for (let i = 0; i < bytes.length; i += 1) {
    appendBits(bitStream, bytes[i], 8);
  }

  const capacityBits = totalDataCodewords * 8;
  appendBits(bitStream, 0, Math.min(4, capacityBits - bitStream.length));
  appendBits(bitStream, 0, (8 - (bitStream.length % 8)) % 8);

  const dataCodewords = new Uint8Array(totalDataCodewords);
  for (let i = 0; i < bitStream.length / 8; i += 1) {
    let b = 0;
    for (let j = 0; j < 8; j += 1) {
      b = (b << 1) | bitStream[i * 8 + j];
    }
    dataCodewords[i] = b;
  }
  const padBytes = [0xec, 0x11];
  for (let i = bitStream.length / 8, p = 0; i < totalDataCodewords; i += 1, p += 1) {
    dataCodewords[i] = padBytes[p & 1];
  }

  // Split into blocks & compute Reed-Solomon EC codewords
  const rsDivisor = buildReedSolomonDivisor(ecPerBlock);
  const dataBlocks = [];
  const ecBlocks = [];
  let offset = 0;
  let maxBlockLen = 0;
  for (let b = 0; b < blockLengths.length; b += 1) {
    const len = blockLengths[b];
    if (len > maxBlockLen) maxBlockLen = len;
    const block = dataCodewords.subarray(offset, offset + len);
    offset += len;
    dataBlocks.push(block);
    ecBlocks.push(computeReedSolomonRemainder(block, rsDivisor));
  }

  const allCodewords = [];
  for (let i = 0; i < maxBlockLen; i += 1) {
    for (let b = 0; b < dataBlocks.length; b += 1) {
      if (i < dataBlocks[b].length) {
        allCodewords.push(dataBlocks[b][i]);
      }
    }
  }
  for (let i = 0; i < ecPerBlock; i += 1) {
    for (let b = 0; b < ecBlocks.length; b += 1) {
      allCodewords.push(ecBlocks[b][i]);
    }
  }

  const size = version * 4 + 17;
  const modules = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction = Array.from({ length: size }, () => Array(size).fill(false));

  const setFunctionModule = (r, c, isDark) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      modules[r][c] = isDark;
      isFunction[r][c] = true;
    }
  };

  // Timing patterns
  for (let i = 0; i < size; i += 1) {
    setFunctionModule(6, i, i % 2 === 0);
    setFunctionModule(i, 6, i % 2 === 0);
  }

  // 3 Finder patterns + 1-module white separator
  const drawFinder = (r0, c0) => {
    for (let dy = -1; dy <= 7; dy += 1) {
      for (let dx = -1; dx <= 7; dx += 1) {
        const inSquare = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6;
        const onOuter = dx === 0 || dx === 6 || dy === 0 || dy === 6;
        const inInner = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
        setFunctionModule(r0 + dy, c0 + dx, inSquare && (onOuter || inInner));
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Alignment patterns
  const alignCoords = QR_ALIGNMENT_CENTERS[version] || [];
  for (let i = 0; i < alignCoords.length; i += 1) {
    for (let j = 0; j < alignCoords.length; j += 1) {
      if (
        (i === 0 && j === 0) ||
        (i === 0 && j === alignCoords.length - 1) ||
        (i === alignCoords.length - 1 && j === 0)
      ) {
        continue;
      }
      const cr = alignCoords[i];
      const cc = alignCoords[j];
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          setFunctionModule(cr + dy, cc + dx, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    }
  }

  // Reserve Format Info slots
  drawFormatBits(modules, isFunction, size, 0);

  // Version Information (for Version >= 7)
  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i += 1) {
      rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    }
    const vBits = (version << 12) | rem;
    for (let i = 0; i < 18; i += 1) {
      const bit = ((vBits >>> i) & 1) !== 0;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      setFunctionModule(a, b, bit);
      setFunctionModule(b, a, bit);
    }
  }

  // Place data + EC bits in 2-column upward/downward zigzag
  let bitIndex = 0;
  const totalBits = allCodewords.length * 8;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert += 1) {
      for (let j = 0; j < 2; j += 1) {
        const c = right - j;
        const upward = ((right + 1) & 2) === 0;
        const r = upward ? size - 1 - vert : vert;
        if (!isFunction[r][c] && bitIndex < totalBits) {
          const byteVal = allCodewords[bitIndex >>> 3];
          const bit = ((byteVal >>> (7 - (bitIndex & 7))) & 1) !== 0;
          modules[r][c] = bit;
          bitIndex += 1;
        }
      }
    }
  }

  // Choose optimal mask (0..7)
  const maskFns = [
    (r, c) => (r + c) % 2 === 0,
    (r) => r % 2 === 0,
    (_r, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
    (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0
  ];

  let bestMask = 0;
  let bestPenalty = Infinity;
  for (let m = 0; m < 8; m += 1) {
    const fn = maskFns[m];
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        if (!isFunction[r][c] && fn(r, c)) {
          modules[r][c] = !modules[r][c];
        }
      }
    }
    drawFormatBits(modules, isFunction, size, m);
    const p = evaluateQrMaskPenalty(modules, size);
    if (p < bestPenalty) {
      bestPenalty = p;
      bestMask = m;
    }
    // Unmask for next iteration
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        if (!isFunction[r][c] && fn(r, c)) {
          modules[r][c] = !modules[r][c];
        }
      }
    }
  }

  const finalFn = maskFns[bestMask];
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (!isFunction[r][c] && finalFn(r, c)) {
        modules[r][c] = !modules[r][c];
      }
    }
  }
  drawFormatBits(modules, isFunction, size, bestMask);
  return modules;
}

function renderPixQrCode(mountEl, qrBase64, pixPayload) {
  clearElement(mountEl);

  // Only use qrBase64 if it is a real PNG image AND no EMVCo payload string is available
  if (!pixPayload && qrBase64 && /^iVBORw0KGgo[A-Za-z0-9+/=]+$/.test(qrBase64)) {
    const img = document.createElement('img');
    img.src = `data:image/png;base64,${qrBase64}`;
    img.alt = 'Código QR para pagamento Pix';
    mountEl.appendChild(img);
    return;
  }

  const emvString = pixPayload || generatePixBrCode({ amount: 20.0, txid: 'TNW01' });
  const matrix = encodeQrMatrixIso18004(emvString);
  const size = matrix.length;
  const quietZone = 4;
  const totalViewSize = size + quietZone * 2;
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${totalViewSize} ${totalViewSize}`);
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Código QR Pix Oficial Banco Central');

  const bg = document.createElementNS(svgNS, 'rect');
  bg.setAttribute('width', String(totalViewSize));
  bg.setAttribute('height', String(totalViewSize));
  bg.setAttribute('fill', '#FFFFFF');
  svg.appendChild(bg);

  let pathD = '';
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (!matrix[r][c]) {
        continue;
      }
      const x = c + quietZone;
      const y = r + quietZone;
      pathD += `M${x},${y}h1v1h-1z`;
    }
  }
  const path = document.createElementNS(svgNS, 'path');
  path.setAttribute('d', pathD);
  path.setAttribute('fill', '#111113');
  svg.appendChild(path);

  mountEl.appendChild(svg);
}

/* ---------- Demo Availability Generator ---------- */
function roundUpTo15Min(dateMs) {
  const step = 15 * 60 * 1000;
  return Math.ceil(dateMs / step) * step;
}

function buildDemoAvailability(presenceMode, durationMin) {
  const nowMs = Date.now();
  const slots = [];

  if (presenceMode === 'LIVE_ON_CAMPUS') {
    // Up to 4 immediate slots starting >= 15 min from now
    let cursor = roundUpTo15Min(nowMs + 15 * 60 * 1000);
    for (let i = 0; i < 4; i += 1) {
      const startMs = cursor;
      const endMs = startMs + durationMin * 60 * 1000;
      slots.push({
        id: `demo-live-${startMs}`,
        startIso: new Date(startMs).toISOString(),
        endIso: new Date(endMs).toISOString(),
        macroZone: MACRO_ZONES.online,
        modeLabel: 'Encaixe imediato hoje'
      });
      cursor = endMs + 10 * 60 * 1000;
    }
    return {
      presenceState: 'LIVE_ON_CAMPUS',
      macroZone: MACRO_ZONES.online,
      updatedAtIso: new Date(nowMs).toISOString(),
      slots
    };
  }

  // OFFLINE_LIMITED: >= 2h lead time, up to 48h horizon, max 4 readings/day
  const minStart = nowMs + 120 * 60 * 1000;
  const maxStart = nowMs + 48 * 60 * 60 * 1000;
  const candidateHours = [10, 12, 16, 18];

  for (let dayOffset = 0; dayOffset <= 2; dayOffset += 1) {
    const baseDate = new Date(nowMs + dayOffset * 86400000);
    for (const hour of candidateHours) {
      const slotDate = new Date(baseDate);
      slotDate.setHours(hour, 30, 0, 0);
      const startMs = slotDate.getTime();
      if (startMs < minStart || startMs > maxStart) {
        continue;
      }
      slots.push({
        id: `demo-off-${startMs}`,
        startIso: new Date(startMs).toISOString(),
        endIso: new Date(startMs + durationMin * 60 * 1000).toISOString(),
        macroZone: MACRO_ZONES.offline,
        modeLabel: 'Agendamento programado'
      });
      if (slots.length >= 8) {
        break;
      }
    }
    if (slots.length >= 8) {
      break;
    }
  }

  return {
    presenceState: 'OFFLINE_LIMITED',
    macroZone: MACRO_ZONES.offline,
    updatedAtIso: new Date(nowMs).toISOString(),
    slots
  };
}

/* ---------- Radar & Slots Rendering ---------- */
function renderRadar(availability) {
  const badge = document.getElementById('radar-badge');
  const badgeText = document.getElementById('radar-badge-text');
  const updatedEl = document.getElementById('radar-updated');
  const zoneText = document.getElementById('radar-zone-text');
  const svg = document.getElementById('radar-svg');
  const svgLabel = document.getElementById('radar-svg-label');

  const isOnline = availability.presenceState === 'LIVE_ON_CAMPUS';
  state.presenceState = availability.presenceState;

  if (badge && badgeText) {
    badge.className = isOnline ? 'status-pill status-online' : 'status-pill status-offline';
    badgeText.textContent = isOnline ? 'Disponível agora na região' : 'Agenda programada — Offline';
  }

  if (updatedEl && availability.updatedAtIso) {
    updatedEl.textContent = `Atualizado às ${formatSlotTime(availability.updatedAtIso)}`;
  }

  if (zoneText) {
    zoneText.textContent = isOnline
      ? `Região atual: ${availability.macroZone || MACRO_ZONES.online}`
      : 'Localização ao vivo oculta no momento. Você pode agendar horários para as próximas 48 horas.';
  }

  if (svg && svgLabel) {
    svg.classList.toggle('is-offline', !isOnline);
    svgLabel.textContent = isOnline ? 'Raio público >= 150 m' : 'Presença ao vivo oculta';
  }
}

function renderSlots() {
  const container = document.getElementById('slots-container');
  const emptyEl = document.getElementById('slots-empty');
  const subtitleEl = document.getElementById('slots-subtitle');
  if (!container || !emptyEl || !subtitleEl) {
    return;
  }

  const pkg = PACKAGES[state.selectedPackageId];
  const isOnline = state.presenceState === 'LIVE_ON_CAMPUS';
  subtitleEl.textContent = isOnline
    ? `Pacote selecionado: ${pkg.label} (${pkg.priceText}). Mostrando os próximos horários imediatos.`
    : `Pacote selecionado: ${pkg.label} (${pkg.priceText}). Mostrando janelas agendadas nas próximas 48 horas (mínimo 2h de antecedência).`;

  clearElement(container);

  const visibleSlots = isOnline ? state.slots.slice(0, 4) : state.slots;
  if (visibleSlots.length === 0) {
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;

  visibleSlots.forEach((slot) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'slot-btn';
    const isSelected = state.selectedSlot && state.selectedSlot.id === slot.id;
    btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');

    btn.appendChild(createTextEl('span', formatSlotTime(slot.startIso), 'slot-time'));
    btn.appendChild(createTextEl('span', formatSlotDay(slot.startIso), 'slot-day'));
    btn.appendChild(createTextEl('span', slot.modeLabel || (isOnline ? 'Encaixe hoje' : 'Agendado'), 'slot-zone'));

    btn.addEventListener('click', () => {
      state.selectedSlot = slot;
      renderSlots();
      openCheckoutStep1();
    });

    container.appendChild(btn);
  });
}

function readLocalAdminState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.adminLocalState);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function appendLocalAdminBooking(bookingRecord) {
  try {
    const current = readLocalAdminState() || {
      presence: {
        state: state.demoPresence || 'LIVE_ON_CAMPUS',
        macro_zone_id: 'Z1',
        exact_spot_hint: 'Mesa de madeira próxima ao café central — caderno capa preta',
        heartbeat_expires_at_ms: Date.now() + 90000
      },
      bookings: []
    };
    const list = Array.isArray(current.bookings) ? current.bookings : [];
    list.unshift(bookingRecord);
    current.bookings = list.slice(0, 30);
    localStorage.setItem(STORAGE_KEYS.adminLocalState, JSON.stringify(current));
  } catch {
    // Ignore storage quota issues
  }
}

async function loadAvailability() {
  const pkg = PACKAGES[state.selectedPackageId];
  const localAdmin = readLocalAdminState();
  if (localAdmin && localAdmin.presence && state.isDemoMode) {
    state.demoPresence = localAdmin.presence.state === 'LIVE_ON_CAMPUS' ? 'LIVE_ON_CAMPUS' : 'OFFLINE_LIMITED';
  }

  if (state.isDemoMode) {
    const data = buildDemoAvailability(state.demoPresence, pkg.durationMin);
    state.slots = data.slots;
    renderRadar(data);
    renderSlots();
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const pkgCode = pkg.id.toUpperCase();
    const url = `${state.apiBase}/api/availability?package=${encodeURIComponent(pkgCode)}&duration_min=${encodeURIComponent(pkg.durationMin)}`;
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    const rawSlots = Array.isArray(data.slots) ? data.slots : [];
    state.slots = rawSlots.map((s, idx) => ({
      id: s.id || `slot-${s.start_ms || idx}`,
      startIso: s.startIso || new Date(s.start_ms).toISOString(),
      endIso: s.endIso || new Date(s.end_ms).toISOString(),
      macroZone: (data.macro_zone && data.macro_zone.public_label) || s.macroZone || MACRO_ZONES.online,
      modeLabel: s.modeLabel || (s.mode === 'LIVE_ON_CAMPUS' ? 'Encaixe imediato hoje' : 'Agendamento programado')
    }));
    renderRadar({
      presenceState: data.presenceState || data.effective_state || 'OFFLINE_LIMITED',
      macroZone: (data.macro_zone && data.macro_zone.public_label) || data.macroZone || MACRO_ZONES.online,
      updatedAtIso: data.updatedAtIso || new Date().toISOString()
    });
    renderSlots();
  } catch {
    // Graceful fallback if worker unreachable
    const fallback = buildDemoAvailability('OFFLINE_LIMITED', pkg.durationMin);
    state.slots = fallback.slots;
    renderRadar(fallback);
    renderSlots();
  } finally {
    clearTimeout(timeout);
  }
}

/* ---------- Package Selection ---------- */
function selectPackage(packageId) {
  if (!PACKAGES[packageId]) {
    return;
  }
  state.selectedPackageId = packageId;
  state.selectedSlot = null;

  document.querySelectorAll('.package-card').forEach((card) => {
    const active = card.getAttribute('data-package-id') === packageId;
    card.classList.toggle('is-selected', active);
    const btn = card.querySelector('.select-package-btn');
    if (btn) {
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      btn.classList.toggle('btn-primary', active);
      btn.classList.toggle('btn-outline', !active);
    }
  });

  const checkoutSection = document.getElementById('checkout-section');
  if (checkoutSection && !state.hold) {
    checkoutSection.hidden = true;
  }

  loadAvailability();
}

/* ---------- Checkout Step 1 -> Step 2 -> Confirmed ---------- */
function stopTimers() {
  if (state.countdownTimerId) {
    clearInterval(state.countdownTimerId);
    state.countdownTimerId = null;
  }
  if (state.pollTimerId) {
    clearInterval(state.pollTimerId);
    state.pollTimerId = null;
  }
}

function renderSelectionSummary(el, slot, pkg) {
  if (!el || !slot || !pkg) {
    return;
  }
  clearElement(el);
  const line1 = createTextEl(
    'div',
    `${pkg.label} (${pkg.durationMin} min) — ${pkg.priceText}`
  );
  line1.style.fontWeight = '700';
  const line2 = createTextEl(
    'div',
    `Horário escolhido: ${formatSlotDay(slot.startIso)} às ${formatSlotTime(slot.startIso)} · ${slot.macroZone || MACRO_ZONES.online}`
  );
  el.appendChild(line1);
  el.appendChild(line2);
}

function openCheckoutStep1() {
  if (!state.selectedSlot) {
    return;
  }
  stopTimers();
  state.hold = null;

  const pkg = PACKAGES[state.selectedPackageId];
  const section = document.getElementById('checkout-section');
  const step1 = document.getElementById('checkout-step-1');
  const step2 = document.getElementById('checkout-step-2');
  const stepDone = document.getElementById('checkout-step-confirmed');
  const submitBtn = document.getElementById('btn-submit-booking');
  const errEl = document.getElementById('form-error');

  if (section) section.hidden = false;
  if (step1) step1.hidden = false;
  if (step2) step2.hidden = true;
  if (stepDone) stepDone.hidden = true;
  if (errEl) errEl.hidden = true;

  renderSelectionSummary(document.getElementById('checkout-summary-1'), state.selectedSlot, pkg);
  if (submitBtn) {
    submitBtn.textContent = `Gerar Pix para confirmar horário — ${pkg.priceText}`;
    submitBtn.disabled = false;
  }

  section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showFormError(message) {
  const errEl = document.getElementById('form-error');
  if (!errEl) {
    return;
  }
  errEl.textContent = message;
  errEl.hidden = false;
}

function generateDemoPixPayload(amountCents, ref) {
  const cleanAlnum = String(ref || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const txid = (cleanAlnum.startsWith('TNW') ? cleanAlnum : `TNW${cleanAlnum}`).slice(0, 25);
  return generatePixBrCode({
    pixKey: DEFAULT_PIX_KEY,
    merchantName: DEFAULT_MERCHANT_NAME,
    merchantCity: DEFAULT_MERCHANT_CITY,
    amount: amountCents / 100,
    txid
  });
}

function enterCheckoutStep2(holdData) {
  state.hold = holdData;
  const pkg = PACKAGES[state.selectedPackageId];

  document.getElementById('checkout-step-1').hidden = true;
  document.getElementById('checkout-step-2').hidden = false;
  document.getElementById('checkout-step-confirmed').hidden = true;
  document.getElementById('pix-expired-box').hidden = true;

  renderSelectionSummary(document.getElementById('checkout-summary-2'), state.selectedSlot, pkg);
  document.getElementById('pix-amount-text').textContent = pkg.priceText;
  document.getElementById('pix-copy-input').value = holdData.qrCode;
  document.getElementById('copy-feedback').textContent = '';
  document.getElementById('pix-poll-status').textContent = 'Aguardando confirmação automática do pagamento...';

  renderPixQrCode(document.getElementById('qr-code-mount'), holdData.qrCodeBase64, holdData.qrCode);

  const demoPixBox = document.getElementById('demo-pix-actions');
  if (demoPixBox) {
    demoPixBox.hidden = !state.isDemoMode;
  }

  // 05:00 countdown
  const countdownEl = document.getElementById('pix-countdown');
  const tickCountdown = () => {
    const remainingSec = Math.ceil((holdData.expiresAtMs - Date.now()) / 1000);
    if (countdownEl) {
      countdownEl.textContent = formatCountdown(remainingSec);
    }
    if (remainingSec <= 0) {
      stopTimers();
      document.getElementById('pix-expired-box').hidden = false;
      document.getElementById('pix-poll-status').textContent = 'Tempo expirado. Escolha outro horário.';
      if (demoPixBox) demoPixBox.hidden = true;
    }
  };
  tickCountdown();
  state.countdownTimerId = setInterval(tickCountdown, 1000);

  // 2.5s polling via opaque token (works in both live backend and local console sync)
  state.pollTimerId = setInterval(() => pollBookingStatus(holdData.opaqueToken), 2500);
}

async function pollBookingStatus(opaqueToken) {
  if (!opaqueToken) {
    return;
  }
  if (state.isDemoMode) {
    const localAdmin = readLocalAdminState();
    if (localAdmin && Array.isArray(localAdmin.bookings)) {
      const match = localAdmin.bookings.find(
        (b) => b.id === opaqueToken || b.refCode === (state.hold && state.hold.refCode)
      );
      if (match && match.status === 'CONFIRMED_PAID') {
        enterConfirmedState({
          status: 'CONFIRMED_PAID',
          refCode: match.refCode || (state.hold && state.hold.refCode),
          exactSpot:
            (localAdmin.presence && localAdmin.presence.exact_spot_hint) ||
            'Mesa de madeira próxima ao café central — caderno capa preta'
        });
      }
    }
    return;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(
      `${state.apiBase}/api/bookings/${encodeURIComponent(opaqueToken)}`,
      { signal: controller.signal, cache: 'no-store' }
    );
    if (!res.ok) {
      return;
    }
    const data = await res.json();
    if (data.status === 'CONFIRMED_PAID') {
      enterConfirmedState({
        ...data,
        exactSpot: data.exact_spot_hint || data.exactSpot
      });
    } else if (data.status === 'EXPIRED') {
      stopTimers();
      document.getElementById('pix-expired-box').hidden = false;
    }
  } catch {
    // Silent retry on next 2.5s interval
  } finally {
    clearTimeout(timeout);
  }
}

function saveConfirmedToLocalStorage(confirmed) {
  try {
    localStorage.setItem(STORAGE_KEYS.confirmedBooking, JSON.stringify(confirmed));
  } catch {
    // Ignore storage quota issues
  }
}

function loadConfirmedFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.confirmedBooking);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.startIso || !parsed.exactSpot) {
      return null;
    }
    // Keep visible up to 12h after session end
    const endMs = new Date(parsed.endIso).getTime();
    if (Number.isFinite(endMs) && Date.now() > endMs + 12 * 3600 * 1000) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function renderSavedBookingBanner() {
  const section = document.getElementById('saved-booking-section');
  const detailsEl = document.getElementById('saved-booking-details');
  if (!section || !detailsEl) {
    return;
  }

  const saved = loadConfirmedFromLocalStorage();
  if (!saved) {
    section.hidden = true;
    return;
  }

  clearElement(detailsEl);
  detailsEl.appendChild(
    createTextEl('p', `${saved.packageLabel} (${saved.priceText}) — ${formatSlotDay(saved.startIso)} às ${formatSlotTime(saved.startIso)}`)
  );
  detailsEl.appendChild(createTextEl('p', `Onde ir: ${saved.exactSpot}`));
  detailsEl.appendChild(createTextEl('p', `Como reconhecer a mesa: ${saved.visualCue}`));
  detailsEl.appendChild(createTextEl('p', `Código da reserva: ${saved.refCode}`));
  section.hidden = false;
}

function downloadIcsFile(booking) {
  const uid = `${booking.refCode || 'tarot'}@tarot-na-well`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tarot na Well//Agendamento//PT-BR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toIcsUtc(new Date().toISOString())}`,
    `DTSTART:${toIcsUtc(booking.startIso)}`,
    `DTEND:${toIcsUtc(booking.endIso)}`,
    `SUMMARY:Tarot na Well — ${booking.packageLabel}`,
    `LOCATION:${booking.exactSpot}`,
    `DESCRIPTION:Identificação visual: ${booking.visualCue}. Código: ${booking.refCode}. Tolerância de chegada: 10 minutos.`,
    'END:VEVENT',
    'END:VCALENDAR'
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tarot-na-well-${booking.refCode || 'sessao'}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function enterConfirmedState(serverPayload) {
  stopTimers();
  const pkg = PACKAGES[state.selectedPackageId];
  const slot = state.selectedSlot;

  const confirmed = {
    refCode: serverPayload.refCode || (state.hold ? state.hold.refCode : 'TW-CONFIRMED'),
    packageLabel: pkg.label,
    durationMin: pkg.durationMin,
    priceText: pkg.priceText,
    startIso: slot.startIso,
    endIso: slot.endIso,
    clientName: state.hold ? state.hold.clientName : '',
    exactSpot: serverPayload.exactSpot || 'Mesa externa coberta ao lado do Café Central da Travessa — nº 120 (Região do Campus)',
    visualCue: serverPayload.visualCue || 'Baralho em estojo terracota + caderno de capa linho sobre a mesa'
  };

  saveConfirmedToLocalStorage(confirmed);
  renderSavedBookingBanner();

  document.getElementById('checkout-step-1').hidden = true;
  document.getElementById('checkout-step-2').hidden = true;
  document.getElementById('checkout-step-confirmed').hidden = false;

  document.getElementById('confirmed-subtitle').textContent =
    `${confirmed.packageLabel} (${confirmed.priceText}) marcada para ${formatSlotDay(confirmed.startIso)} às ${formatSlotTime(confirmed.startIso)}.`;
  document.getElementById('confirmed-exact-spot').textContent = confirmed.exactSpot;
  document.getElementById('confirmed-visual-cue').textContent = confirmed.visualCue;
  document.getElementById('confirmed-ref-code').textContent = confirmed.refCode;
}

function initCheckoutHandlers() {
  const form = document.getElementById('booking-form');
  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      document.getElementById('form-error').hidden = true;

      if (!state.selectedSlot) {
        showFormError('Escolha um horário livre acima antes de continuar.');
        return;
      }

      const name = document.getElementById('input-name').value.trim();
      const email = document.getElementById('input-email').value.trim();
      const acceptedTerms = document.getElementById('check-terms').checked;
      const lgpdOptIn = document.getElementById('check-lgpd-optin').checked;

      if (name.length < 2) {
        showFormError('Informe seu nome ou apelido (mínimo de 2 letras).');
        document.getElementById('input-name').focus();
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showFormError('Informe um endereço de e-mail válido para receber a confirmação.');
        document.getElementById('input-email').focus();
        return;
      }
      if (!acceptedTerms) {
        showFormError('Marque a caixa obrigatória confirmando ter 18 anos ou mais e ciência das regras.');
        document.getElementById('check-terms').focus();
        return;
      }

      const pkg = PACKAGES[state.selectedPackageId];
      const submitBtn = document.getElementById('btn-submit-booking');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Gerando código Pix...';

      if (state.isDemoMode) {
        const refCode = `TNW${Math.floor(100000 + Math.random() * 900000)}`;
        const qrCode = generateDemoPixPayload(pkg.amountCents, refCode);
        const opaqueToken = `bk_${Date.now()}`;
        appendLocalAdminBooking({
          id: opaqueToken,
          refCode,
          package_code: pkg.id.toUpperCase(),
          price_cents: pkg.amountCents,
          local_date: new Date(state.selectedSlot.startIso).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }),
          local_time: formatSlotTime(state.selectedSlot.startIso),
          start_ms: new Date(state.selectedSlot.startIso).getTime(),
          end_ms: new Date(state.selectedSlot.endIso).getTime(),
          macro_zone_id: 'Z1',
          client_name: name,
          status: 'HELD_PIX'
        });
        enterCheckoutStep2({
          opaqueToken,
          refCode,
          clientName: name,
          qrCode,
          qrCodeBase64: '',
          expiresAtMs: Date.now() + 300 * 1000
        });
        submitBtn.disabled = false;
        return;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const startMs = new Date(state.selectedSlot.startIso).getTime();
        const res = await fetch(`${state.apiBase}/api/bookings`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          signal: controller.signal,
          body: JSON.stringify({
            package_code: pkg.id.toUpperCase(),
            start_ms: startMs,
            client_name: name,
            client_email: email,
            adult_terms_accepted: true,
            name,
            email,
            duration_min: pkg.durationMin,
            start_iso: state.selectedSlot.startIso,
            accepted_terms: true,
            lgpd_opt_in: lgpdOptIn,
            turnstile_token: state.turnstileToken,
            utm_source: getUtmSource()
          })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Não foi possível reservar este horário agora. Tente outro horário.');
        }
        const token = data.public_token || data.opaque_token || `TNW${Date.now()}`;
        const refCode = data.ref_code || `TNW${String(token).replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 12)}`;
        const qrCode =
          data.qr_code && String(data.qr_code).startsWith('000201')
            ? data.qr_code
            : generateDemoPixPayload(pkg.amountCents, refCode);
        enterCheckoutStep2({
          opaqueToken: token,
          refCode,
          clientName: name,
          qrCode,
          qrCodeBase64: data.qr_base64 || data.qr_code_base64 || '',
          expiresAtMs: data.hold_expires_at_ms || data.expires_at_ms || (Date.now() + 300 * 1000)
        });
      } catch (err) {
        showFormError(err.message || 'Erro de conexão ao gerar o Pix. Tente novamente.');
      } finally {
        clearTimeout(timeout);
        submitBtn.disabled = false;
        submitBtn.textContent = `Gerar Pix para confirmar horário — ${pkg.priceText}`;
      }
    });
  }

  document.getElementById('btn-change-slot')?.addEventListener('click', () => {
    document.getElementById('checkout-section').hidden = true;
    document.getElementById('agendar').scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('btn-cancel-hold')?.addEventListener('click', () => {
    stopTimers();
    state.hold = null;
    document.getElementById('checkout-section').hidden = true;
    document.getElementById('agendar').scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('btn-restart-expired')?.addEventListener('click', () => {
    stopTimers();
    state.hold = null;
    state.selectedSlot = null;
    document.getElementById('checkout-section').hidden = true;
    loadAvailability();
    document.getElementById('agendar').scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('btn-copy-pix')?.addEventListener('click', async () => {
    const input = document.getElementById('pix-copy-input');
    const feedback = document.getElementById('copy-feedback');
    if (!input || !input.value) {
      return;
    }
    try {
      await navigator.clipboard.writeText(input.value);
      if (feedback) feedback.textContent = 'Código Pix copiado! Abra o app do seu banco para pagar.';
    } catch {
      input.select();
      document.execCommand('copy');
      if (feedback) feedback.textContent = 'Código Pix selecionado e copiado!';
    }
  });

  document.getElementById('btn-demo-confirm-pix')?.addEventListener('click', () => {
    if (!state.isDemoMode) {
      return;
    }
    enterConfirmedState({
      status: 'CONFIRMED_PAID',
      refCode: state.hold ? state.hold.refCode : 'TW-DEMO',
      exactSpot: 'Mesa externa coberta ao lado do Café do Bosque — Travessa Central, nº 120 (região do campus)',
      visualCue: 'Baralho em estojo terracota + caderno de capa linho sobre a mesa'
    });
  });

  document.getElementById('btn-download-ics')?.addEventListener('click', () => {
    const saved = loadConfirmedFromLocalStorage();
    if (saved) {
      downloadIcsFile(saved);
    }
  });

  document.getElementById('btn-saved-ics')?.addEventListener('click', () => {
    const saved = loadConfirmedFromLocalStorage();
    if (saved) {
      downloadIcsFile(saved);
    }
  });

  document.getElementById('btn-clear-saved-booking')?.addEventListener('click', () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.confirmedBooking);
    } catch {
      // Ignore storage failure
    }
    renderSavedBookingBanner();
  });

  document.getElementById('btn-new-booking')?.addEventListener('click', () => {
    state.selectedSlot = null;
    state.hold = null;
    document.getElementById('checkout-section').hidden = true;
    loadAvailability();
    document.getElementById('pacotes').scrollIntoView({ behavior: 'smooth' });
  });
}

/* ---------- Demo Mode Controls & Service Worker ---------- */
function initDemoControls() {
  const bar = document.getElementById('demo-mode-bar');
  if (!bar) {
    return;
  }
  bar.hidden = !state.isDemoMode;
  if (!state.isDemoMode) {
    return;
  }

  const btnOn = document.getElementById('btn-demo-online');
  const btnOff = document.getElementById('btn-demo-offline');

  const syncButtons = () => {
    btnOn?.setAttribute('aria-pressed', state.demoPresence === 'LIVE_ON_CAMPUS' ? 'true' : 'false');
    btnOff?.setAttribute('aria-pressed', state.demoPresence === 'OFFLINE_LIMITED' ? 'true' : 'false');
  };

  btnOn?.addEventListener('click', () => {
    state.demoPresence = 'LIVE_ON_CAMPUS';
    state.selectedSlot = null;
    syncButtons();
    loadAvailability();
  });

  btnOff?.addEventListener('click', () => {
    state.demoPresence = 'OFFLINE_LIMITED';
    state.selectedSlot = null;
    syncButtons();
    loadAvailability();
  });
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Non-fatal in preview contexts without HTTPS
    });
  }
}

/* ---------- Boot ---------- */
function initApp() {
  let savedApiBase = '';
  try {
    savedApiBase = localStorage.getItem(STORAGE_KEYS.apiBase) || '';
  } catch {
    savedApiBase = '';
  }
  state.apiBase = (readMeta('tarot-api-base') || savedApiBase).trim().replace(/\/+$/, '');
  state.turnstileSiteKey = readMeta('tarot-turnstile-sitekey');
  state.isDemoMode = state.apiBase.length === 0;

  initTheme();
  initPwaAndModals();
  initDemoControls();
  initCheckoutHandlers();
  renderSavedBookingBanner();

  document.querySelectorAll('.select-package-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-package');
      if (id) {
        selectPackage(id);
        document.getElementById('agendar')?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  selectPackage('15m');
  registerServiceWorker();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
