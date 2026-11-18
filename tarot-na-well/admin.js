/* Tarot na Well — Tablet Operator Console (Safe DOM Only / Zero eval / Zero innerHTML / CORS Preflight-Free) */

const ADMIN_STORAGE_KEYS = {
  theme: 'tarot_well_theme',
  apiBase: 'tarot_well_api_base_v1',
  sessionToken: 'tarot_well_admin_session_v1',
  operatorPin: 'tarot_well_admin_pin_v1',
  localState: 'tarot_well_admin_state_v1'
};

const DEFAULT_SPOT_HINT = 'Mesa de madeira próxima ao café central — caderno capa preta';

const consoleState = {
  apiBase: '',
  operatorPin: '',
  sessionToken: '',
  authenticated: false,
  presenceState: 'OFFLINE_LIMITED',
  macroZoneId: 'Z1',
  exactSpotHint: DEFAULT_SPOT_HINT,
  heartbeatExpiresAtMs: 0,
  bookings: [],
  heartbeatTimerId: null,
  wakeLockSentinel: null
};

function readMetaContent(name) {
  const el = document.querySelector(`meta[name="${name}"]`);
  return el ? (el.getAttribute('content') || '').trim() : '';
}

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
    saved = localStorage.getItem(ADMIN_STORAGE_KEYS.theme) || '';
  } catch {
    saved = '';
  }
  applyTheme(saved);

  const btn = document.getElementById('btn-theme-toggle');
  if (btn) {
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = current === 'dark' || (!current && prefersDark);
      const next = isDark ? 'light' : 'dark';
      try {
        localStorage.setItem(ADMIN_STORAGE_KEYS.theme, next);
      } catch {
        // Ignore storage failure
      }
      applyTheme(next);
    });
  }
}

/* ---------- Local Storage Fallback State (when backend URL is empty) ---------- */
function loadLocalAdminData() {
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEYS.localState);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.presence) {
        return parsed;
      }
    }
  } catch {
    // Ignore storage read error
  }
  return {
    presence: {
      state: 'OFFLINE_LIMITED',
      macro_zone_id: 'Z1',
      exact_spot_hint: DEFAULT_SPOT_HINT,
      heartbeat_expires_at_ms: 0,
      lease_expires_at_ms: 0,
      paused_until_ms: null,
      updated_at_ms: Date.now()
    },
    bookings: []
  };
}

function saveLocalAdminData(data) {
  try {
    localStorage.setItem(ADMIN_STORAGE_KEYS.localState, JSON.stringify(data));
  } catch {
    // Ignore storage write error
  }
}

/* ---------- CORS-Preflight-Free Transport (POST text/plain;charset=utf-8) ---------- */
function isGoogleAppsScriptUrl(url) {
  return /script\.google\.com|script\.googleusercontent\.com/i.test(url);
}

async function postAdminEndpoint(workerPath, actionName, payload = {}) {
  const bodyObj = {
    action: actionName,
    token: consoleState.operatorPin,
    session_token: consoleState.sessionToken,
    ...payload
  };

  if (!consoleState.apiBase) {
    return executeLocalAdminAction(actionName, bodyObj);
  }

  const endpoint = isGoogleAppsScriptUrl(consoleState.apiBase)
    ? consoleState.apiBase
    : `${consoleState.apiBase}${workerPath}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(bodyObj),
      signal: controller.signal,
      cache: 'no-store'
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data.ok !== false, status: res.status, data };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: { error: err.message || 'Falha de conexão com o backend.' }
    };
  } finally {
    clearTimeout(timeout);
  }
}

function executeLocalAdminAction(actionName, body) {
  const nowMs = Date.now();
  const store = loadLocalAdminData();

  if (actionName === 'admin_login') {
    if (!body.token || String(body.token).trim().length < 3) {
      return { ok: false, status: 401, data: { error: 'Informe um PIN/Token com pelo menos 3 caracteres.' } };
    }
    return {
      ok: true,
      status: 200,
      data: {
        ok: true,
        session_token: `local_sess_${nowMs}`,
        expires_at_ms: nowMs + 4 * 3600 * 1000
      }
    };
  }

  if (actionName === 'admin_state') {
    return {
      ok: true,
      status: 200,
      data: {
        presence: store.presence,
        bookings: store.bookings || []
      }
    };
  }

  if (actionName === 'admin_presence') {
    const nextState = body.state || 'OFFLINE_LIMITED';
    store.presence = {
      state: nextState,
      macro_zone_id: body.macro_zone_id || store.presence.macro_zone_id || 'Z1',
      exact_spot_hint: body.exact_spot_hint || store.presence.exact_spot_hint || DEFAULT_SPOT_HINT,
      heartbeat_expires_at_ms: nextState === 'LIVE_ON_CAMPUS' ? nowMs + 90000 : 0,
      lease_expires_at_ms: nextState === 'LIVE_ON_CAMPUS' ? nowMs + 4 * 3600 * 1000 : 0,
      paused_until_ms: nextState === 'FOCUS_PAUSED' ? nowMs + 30 * 60 * 1000 : null,
      updated_at_ms: nowMs
    };
    saveLocalAdminData(store);
    return { ok: true, status: 200, data: { presence: store.presence } };
  }

  if (actionName === 'admin_heartbeat') {
    if (store.presence.state === 'LIVE_ON_CAMPUS') {
      store.presence.heartbeat_expires_at_ms = nowMs + 90000;
      store.presence.updated_at_ms = nowMs;
      saveLocalAdminData(store);
    }
    return {
      ok: true,
      status: 200,
      data: {
        ok: true,
        state: store.presence.state,
        heartbeat_expires_at_ms: store.presence.heartbeat_expires_at_ms
      }
    };
  }

  if (actionName === 'admin_confirm_pix') {
    const target = (store.bookings || []).find((b) => b.id === body.booking_id);
    if (!target) {
      return { ok: false, status: 404, data: { error: 'Reserva não encontrada.' } };
    }
    target.status = 'CONFIRMED_PAID';
    saveLocalAdminData(store);
    return {
      ok: true,
      status: 200,
      data: { ok: true, booking_id: target.id, status: 'CONFIRMED_PAID', outcome: 'CONFIRMED' }
    };
  }

  if (actionName === 'admin_work_override') {
    const target = (store.bookings || []).find((b) => b.id === body.booking_id);
    if (!target) {
      return { ok: false, status: 404, data: { error: 'Reserva não encontrada.' } };
    }
    target.status = target.status === 'CONFIRMED_PAID' ? 'REFUNDED' : 'CANCELLED';
    saveLocalAdminData(store);
    return {
      ok: true,
      status: 200,
      data: { ok: true, booking_id: target.id, status: target.status }
    };
  }

  return { ok: true, status: 200, data: { ok: true } };
}

/* ---------- UI Rendering ---------- */
function setAdminFeedback(message, isError = false) {
  const el = document.getElementById('admin-feedback');
  if (!el) return;
  el.textContent = message;
  el.className = isError ? 'form-error' : 'copy-feedback';
}

function renderPresenceControls() {
  const badge = document.getElementById('admin-status-badge');
  const badgeText = document.getElementById('admin-status-badge-text');
  const hbText = document.getElementById('admin-heartbeat-status');
  const backendLabel = document.getElementById('admin-backend-label');

  const st = consoleState.presenceState;
  if (badge && badgeText) {
    badge.className = st === 'LIVE_ON_CAMPUS' ? 'status-pill status-online' : 'status-pill status-offline';
    badgeText.textContent =
      st === 'LIVE_ON_CAMPUS'
        ? 'LIVE_ON_CAMPUS · ONLINE'
        : st === 'FOCUS_PAUSED'
          ? 'FOCUS_PAUSED · MODO FOCO'
          : 'OFFLINE_LIMITED · AGENDA';
  }

  const btnLive = document.getElementById('btn-state-live');
  const btnFocus = document.getElementById('btn-state-focus');
  const btnOffline = document.getElementById('btn-state-offline');
  btnLive?.setAttribute('aria-pressed', st === 'LIVE_ON_CAMPUS' ? 'true' : 'false');
  btnFocus?.setAttribute('aria-pressed', st === 'FOCUS_PAUSED' ? 'true' : 'false');
  btnOffline?.setAttribute('aria-pressed', st === 'OFFLINE_LIMITED' ? 'true' : 'false');

  const zoneSelect = document.getElementById('admin-macro-zone');
  if (zoneSelect && consoleState.macroZoneId) {
    zoneSelect.value = consoleState.macroZoneId;
  }

  const spotInput = document.getElementById('admin-spot-hint');
  if (spotInput && document.activeElement !== spotInput) {
    spotInput.value = consoleState.exactSpotHint || DEFAULT_SPOT_HINT;
  }

  if (hbText) {
    if (st === 'LIVE_ON_CAMPUS' && consoleState.heartbeatExpiresAtMs > Date.now()) {
      const ttlSec = Math.max(0, Math.round((consoleState.heartbeatExpiresAtMs - Date.now()) / 1000));
      hbText.textContent = `Heartbeat automático (30s): ATIVO · Lease público válido por ${ttlSec}s`;
    } else if (st === 'FOCUS_PAUSED') {
      hbText.textContent = 'Modo Foco ativo: encaixes imediatos pausados; agenda programada segue aberta.';
    } else {
      hbText.textContent = 'Heartbeat pausado (modo Offline — apenas agendamentos com >= 2h de antecedência).';
    }
  }

  if (backendLabel) {
    backendLabel.textContent = consoleState.apiBase
      ? `Backend conectado: ${consoleState.apiBase}`
      : 'Modo de operação: Sincronização Local no Aparelho (sem URL externa configurada)';
  }
}

function renderBookingsList() {
  const listEl = document.getElementById('admin-bookings-list');
  if (!listEl) return;
  clearElement(listEl);

  if (!Array.isArray(consoleState.bookings) || consoleState.bookings.length === 0) {
    const empty = createTextEl(
      'p',
      'Nenhuma reserva pendente ou confirmada nas últimas 2 horas.',
      'empty-state'
    );
    listEl.appendChild(empty);
    return;
  }

  consoleState.bookings.forEach((bk) => {
    const row = document.createElement('article');
    row.className = 'admin-booking-row';

    const infoCol = document.createElement('div');
    infoCol.className = 'admin-booking-info';

    const priceBrl = ((Number(bk.price_cents) || 2000) / 100).toFixed(2).replace('.', ',');
    const headerLine = createTextEl(
      'strong',
      `${bk.local_date || ''} às ${bk.local_time || ''} · Pacote ${bk.package_code || '15M'} (R$ ${priceBrl})`,
      'admin-booking-title'
    );
    infoCol.appendChild(headerLine);

    const clientLine = createTextEl(
      'span',
      `Cliente: ${bk.client_name || 'Cliente'} · Zona: ${bk.macro_zone_id || 'Z1'} · Status: ${bk.status}`,
      'meta-text'
    );
    infoCol.appendChild(clientLine);

    row.appendChild(infoCol);

    const actionsCol = document.createElement('div');
    actionsCol.className = 'admin-booking-actions';

    if (bk.status === 'HELD_PIX' || bk.status === 'EXPIRED') {
      const confirmBtn = createTextEl(
        'button',
        'Confirmar Pix Agora',
        'btn btn-accent btn-sm'
      );
      confirmBtn.type = 'button';
      confirmBtn.addEventListener('click', async () => {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Confirmando Pix...';
        const res = await postAdminEndpoint('/admin/confirm-pix', 'admin_confirm_pix', {
          booking_id: bk.id
        });
        if (res.ok) {
          setAdminFeedback(
            `Pix confirmado manualmente para ${bk.client_name || bk.id}! Ponto exato liberado ao cliente.`,
            false
          );
          await refreshConsoleState();
        } else {
          setAdminFeedback((res.data && res.data.error) || 'Erro ao confirmar Pix.', true);
          confirmBtn.disabled = false;
          confirmBtn.textContent = 'Confirmar Pix Agora';
        }
      });
      actionsCol.appendChild(confirmBtn);
    }

    if (bk.status === 'CONFIRMED_PAID' || bk.status === 'HELD_PIX') {
      const cancelBtn = createTextEl(
        'button',
        'Work-Override / Cancelar',
        'btn btn-outline btn-sm'
      );
      cancelBtn.type = 'button';
      cancelBtn.addEventListener('click', async () => {
        cancelBtn.disabled = true;
        cancelBtn.textContent = 'Cancelando...';
        const res = await postAdminEndpoint('/admin/work-override', 'admin_work_override', {
          booking_id: bk.id
        });
        if (res.ok) {
          setAdminFeedback(
            `Work-Override aplicado na reserva de ${bk.client_name || bk.id} (status: ${res.data.status}).`,
            false
          );
          await refreshConsoleState();
        } else {
          setAdminFeedback((res.data && res.data.error) || 'Erro ao executar Work-Override.', true);
          cancelBtn.disabled = false;
          cancelBtn.textContent = 'Work-Override / Cancelar';
        }
      });
      actionsCol.appendChild(cancelBtn);
    }

    row.appendChild(actionsCol);
    listEl.appendChild(row);
  });
}

/* ---------- State Sync, Presence Updates & 30s Heartbeat ---------- */
async function refreshConsoleState() {
  const res = await postAdminEndpoint('/admin/state', 'admin_state');
  if (res.status === 401) {
    lockConsole();
    return;
  }
  if (!res.ok || !res.data) {
    setAdminFeedback((res.data && res.data.error) || 'Falha ao sincronizar estado.', true);
    return;
  }

  const p = res.data.presence || {};
  consoleState.presenceState = p.state || 'OFFLINE_LIMITED';
  consoleState.macroZoneId = p.macro_zone_id || 'Z1';
  consoleState.exactSpotHint = p.exact_spot_hint || DEFAULT_SPOT_HINT;
  consoleState.heartbeatExpiresAtMs = Number(p.heartbeat_expires_at_ms) || 0;
  consoleState.bookings = Array.isArray(res.data.bookings) ? res.data.bookings : [];

  renderPresenceControls();
  renderBookingsList();
}

async function applyOperatorPresence(targetState, pausePreset = null) {
  const zoneSelect = document.getElementById('admin-macro-zone');
  const spotInput = document.getElementById('admin-spot-hint');

  const macroZoneId = zoneSelect ? zoneSelect.value : consoleState.macroZoneId;
  const exactSpotHint =
    (spotInput && spotInput.value.trim()) || consoleState.exactSpotHint || DEFAULT_SPOT_HINT;

  const payload = {
    state: targetState,
    macro_zone_id: macroZoneId,
    exact_spot_hint: exactSpotHint
  };
  if (pausePreset !== null) {
    payload.pause_preset = pausePreset;
  }

  const res = await postAdminEndpoint('/admin/presence', 'admin_presence', payload);
  if (!res.ok) {
    setAdminFeedback((res.data && res.data.error) || 'Não foi possível atualizar a presença.', true);
    return;
  }

  setAdminFeedback(
    `Modo atualizado para ${targetState} (${macroZoneId}) — Ponto exato salvo com sucesso!`,
    false
  );
  await refreshConsoleState();
}

async function sendHeartbeatPulse() {
  if (!consoleState.authenticated || consoleState.presenceState !== 'LIVE_ON_CAMPUS') {
    return;
  }
  const res = await postAdminEndpoint('/admin/heartbeat', 'admin_heartbeat', {
    source: 'interval_30s'
  });
  if (res.status === 401) {
    lockConsole();
    return;
  }
  if (res.ok && res.data) {
    consoleState.heartbeatExpiresAtMs = Number(res.data.heartbeat_expires_at_ms) || 0;
    if (res.data.state && res.data.state !== consoleState.presenceState) {
      consoleState.presenceState = res.data.state;
    }
    renderPresenceControls();
  }
}

function startHeartbeatLoop() {
  if (consoleState.heartbeatTimerId) {
    clearInterval(consoleState.heartbeatTimerId);
  }
  consoleState.heartbeatTimerId = setInterval(() => {
    sendHeartbeatPulse();
  }, 30000);
}

function stopHeartbeatLoop() {
  if (consoleState.heartbeatTimerId) {
    clearInterval(consoleState.heartbeatTimerId);
    consoleState.heartbeatTimerId = null;
  }
}

/* ---------- Screen WakeLock ---------- */
async function toggleWakeLock() {
  const btn = document.getElementById('btn-wakelock');
  if (!('wakeLock' in navigator) || !navigator.wakeLock) {
    setAdminFeedback('WakeLock não disponível neste navegador.', true);
    return;
  }

  if (consoleState.wakeLockSentinel) {
    try {
      await consoleState.wakeLockSentinel.release();
    } catch {
      // Ignore release errors
    }
    consoleState.wakeLockSentinel = null;
    if (btn) {
      btn.textContent = 'Manter Tela Acesa (WakeLock): OFF';
      btn.setAttribute('aria-pressed', 'false');
    }
    return;
  }

  try {
    consoleState.wakeLockSentinel = await navigator.wakeLock.request('screen');
    if (btn) {
      btn.textContent = 'Manter Tela Acesa (WakeLock): ON';
      btn.setAttribute('aria-pressed', 'true');
    }
    consoleState.wakeLockSentinel.addEventListener('release', () => {
      consoleState.wakeLockSentinel = null;
      if (btn) {
        btn.textContent = 'Manter Tela Acesa (WakeLock): OFF';
        btn.setAttribute('aria-pressed', 'false');
      }
    });
  } catch {
    setAdminFeedback('Não foi possível travar a tela acesa (verifique se a aba está visível).', true);
  }
}

/* ---------- Auth & Console Unlock ---------- */
function unlockConsole() {
  consoleState.authenticated = true;
  document.getElementById('admin-login-section').hidden = true;
  document.getElementById('admin-console-section').hidden = false;
  startHeartbeatLoop();
  refreshConsoleState();
}

function lockConsole() {
  consoleState.authenticated = false;
  consoleState.sessionToken = '';
  stopHeartbeatLoop();
  try {
    sessionStorage.removeItem(ADMIN_STORAGE_KEYS.sessionToken);
    sessionStorage.removeItem(ADMIN_STORAGE_KEYS.operatorPin);
  } catch {
    // Ignore storage errors
  }
  document.getElementById('admin-login-section').hidden = false;
  document.getElementById('admin-console-section').hidden = true;
}

function seedDemoBooking() {
  const store = loadLocalAdminData();
  const now = new Date();
  const start = new Date(now.getTime() + 15 * 60 * 1000);
  const end = new Date(start.getTime() + 15 * 60 * 1000);
  const newBooking = {
    id: `bk_${Date.now()}`,
    refCode: `TNW${Math.floor(100000 + Math.random() * 900000)}`,
    package_code: '15M',
    price_cents: 2000,
    local_date: start.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }),
    local_time: start.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    }),
    start_ms: start.getTime(),
    end_ms: end.getTime(),
    macro_zone_id: consoleState.macroZoneId || 'Z1',
    client_name: 'Cliente Presencial (Teste)',
    status: 'HELD_PIX'
  };
  store.bookings = [newBooking, ...(store.bookings || [])].slice(0, 30);
  saveLocalAdminData(store);
  setAdminFeedback('Reserva HELD_PIX criada! Toque em "Confirmar Pix Agora" para testar.', false);
  refreshConsoleState();
}

function initAdminConsole() {
  initTheme();

  let savedApiBase = '';
  try {
    savedApiBase = localStorage.getItem(ADMIN_STORAGE_KEYS.apiBase) || '';
  } catch {
    savedApiBase = '';
  }
  const metaApiBase = readMetaContent('tarot-api-base');
  consoleState.apiBase = (metaApiBase || savedApiBase).replace(/\/+$/, '');

  const apiBaseInput = document.getElementById('admin-api-base-input');
  if (apiBaseInput) {
    apiBaseInput.value = consoleState.apiBase;
  }

  const loginForm = document.getElementById('admin-login-form');
  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const errEl = document.getElementById('admin-login-error');
    if (errEl) errEl.hidden = true;

    const rawUrl = apiBaseInput ? apiBaseInput.value.trim().replace(/\/+$/, '') : '';
    const pin = document.getElementById('admin-token-input')?.value.trim() || '';

    if (pin.length < 3) {
      if (errEl) {
        errEl.textContent = 'Informe seu PIN ou Token do Operador.';
        errEl.hidden = false;
      }
      return;
    }

    consoleState.apiBase = rawUrl;
    consoleState.operatorPin = pin;
    try {
      localStorage.setItem(ADMIN_STORAGE_KEYS.apiBase, rawUrl);
    } catch {
      // Ignore storage error
    }

    const res = await postAdminEndpoint('/admin/login', 'admin_login', { token: pin });
    if (!res.ok) {
      if (errEl) {
        errEl.textContent = (res.data && res.data.error) || 'Credencial administrativa inválida.';
        errEl.hidden = false;
      }
      return;
    }

    consoleState.sessionToken = (res.data && res.data.session_token) || '';
    try {
      sessionStorage.setItem(ADMIN_STORAGE_KEYS.sessionToken, consoleState.sessionToken);
      sessionStorage.setItem(ADMIN_STORAGE_KEYS.operatorPin, consoleState.operatorPin);
    } catch {
      // Ignore storage error
    }

    unlockConsole();
  });

  // 3-state tactile switch
  document.getElementById('btn-state-live')?.addEventListener('click', () => {
    applyOperatorPresence('LIVE_ON_CAMPUS');
  });

  document.getElementById('btn-state-focus')?.addEventListener('click', () => {
    applyOperatorPresence('FOCUS_PAUSED', 30);
  });

  document.getElementById('btn-state-offline')?.addEventListener('click', () => {
    applyOperatorPresence('OFFLINE_LIMITED');
  });

  document.querySelectorAll('.btn-focus-preset').forEach((btn) => {
    btn.addEventListener('click', () => {
      const preset = btn.getAttribute('data-pause') || '30';
      applyOperatorPresence('FOCUS_PAUSED', preset === 'rest_of_day' ? 'rest_of_day' : Number(preset));
    });
  });

  // Location & Exact Spot form
  document.getElementById('admin-location-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    applyOperatorPresence(consoleState.presenceState);
  });

  // WakeLock, Refresh, Logout, Seed Demo Booking
  document.getElementById('btn-wakelock')?.addEventListener('click', () => {
    toggleWakeLock();
  });

  document.getElementById('btn-refresh-state')?.addEventListener('click', () => {
    refreshConsoleState();
  });

  document.getElementById('btn-admin-logout')?.addEventListener('click', async () => {
    await postAdminEndpoint('/admin/logout', 'admin_logout');
    lockConsole();
  });

  document.getElementById('btn-seed-demo-booking')?.addEventListener('click', () => {
    seedDemoBooking();
  });

  document.addEventListener('visibilitychange', () => {
    if (!consoleState.authenticated || consoleState.presenceState !== 'LIVE_ON_CAMPUS') {
      return;
    }
    if (document.visibilityState === 'visible') {
      sendHeartbeatPulse();
    }
  });

  // Restore active session if already unlocked in this tab
  try {
    const savedPin = sessionStorage.getItem(ADMIN_STORAGE_KEYS.operatorPin) || '';
    const savedSess = sessionStorage.getItem(ADMIN_STORAGE_KEYS.sessionToken) || '';
    if (savedPin) {
      consoleState.operatorPin = savedPin;
      consoleState.sessionToken = savedSess;
      unlockConsole();
    }
  } catch {
    // Stay on login screen
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdminConsole);
} else {
  initAdminConsole();
}
