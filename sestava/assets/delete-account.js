/**
 * Sestava web account deletion client (24.3e.2).
 * CONTRACT: supabase/functions/delete-account/CONTRACT.md
 * - No user_id in Edge body
 * - No service_role
 * - Never log passwords / JWT
 * - Server is authority
 *
 * Mock UI lives outside this repo: Sestava/tools/mmoa-web-local/mock/
 * (never under the GitHub Pages publish tree).
 */
(function (global) {
  'use strict';

  var busy = false;
  var supabase = null;
  var lastEmail = '';
  var preflight = null;
  var reauthed = false;

  var els = {};

  function $(id) {
    return document.getElementById(id);
  }

  function show(el, on) {
    if (!el) return;
    el.classList.toggle('hidden', !on);
  }

  function setBanner(el, text, kind) {
    if (!el) return;
    if (!text) {
      el.hidden = true;
      el.textContent = '';
      return;
    }
    el.hidden = false;
    el.textContent = text;
    el.className = 'banner banner--' + (kind || 'info');
  }

  function clearError() {
    setBanner(els.error, '', 'error');
  }

  function setError(msg) {
    setBanner(els.error, msg, 'error');
  }

  function setStatus(msg) {
    setBanner(els.status, msg, 'info');
  }

  function setBusy(on) {
    busy = on;
    document.body.classList.toggle('busy', on);
    [
      'btn-login',
      'btn-refresh-preflight',
      'btn-continue',
      'btn-reauth',
      'btn-confirm-delete',
      'btn-retry',
    ].forEach(function (id) {
      var b = $(id);
      if (b) b.disabled = on;
    });
  }

  function showStep(name) {
    ['login', 'preflight', 'reauth', 'confirm', 'result'].forEach(function (s) {
      show($('step-' + s), s === name);
    });
  }

  function configOk() {
    var cfg = global.SESTAVA_WEB_CONFIG || {};
    if (cfg.productionEnabled === true) {
      setError('Produkční backend na tomto webu není povolen.');
      return null;
    }
    if (cfg.deletionEnabled !== true) {
      setError(
        'Mazání účtu přes web je vypnuté. Pro lokální staging použijte config.local.js (viz dokumentace).'
      );
      return null;
    }
    if (cfg.environment !== 'staging') {
      setError('Povoleno je pouze staging prostředí (fail-closed).');
      return null;
    }
    if (!cfg.supabaseUrl || !cfg.supabasePublishableKey) {
      setError('Chybí konfigurace Supabase (URL / publishable key).');
      return null;
    }
    var ref = cfg.expectedProjectRef || '';
    if (!ref || cfg.supabaseUrl.indexOf(ref) === -1) {
      setError('URL neodpovídá očekávanému staging projektu.');
      return null;
    }
    return cfg;
  }

  function mapEdgeError(status, payload) {
    var code = payload && payload.error ? String(payload.error) : '';
    var message = payload && payload.message ? String(payload.message) : '';
    if (status >= 200 && status < 300 && payload && payload.status === 'completed') {
      return { kind: 'completed', message: message || 'Účet byl smazán.', retryable: false };
    }
    if (status === 401 && code === 'reauth_required') {
      return { kind: 'reauth_required', message: message || 'Je vyžadováno opětovné přihlášení heslem.', retryable: false };
    }
    if (status === 401 || code === 'unauthorized') {
      return { kind: 'unauthorized', message: 'Relace vypršela. Přihlaste se znovu.', retryable: false };
    }
    if (status === 403 || code === 'forbidden') {
      return { kind: 'forbidden', message: message || 'Operace byla odmítnuta.', retryable: false };
    }
    if (status === 409 && code === 'blocked_ownership') {
      return {
        kind: 'blocked_ownership',
        message: message || 'Nejdřív vyřešte vlastnictví týmů.',
        blocked: payload.blocked_ownership || [],
        dissolve: payload.dissolve_eligible || [],
        retryable: false,
      };
    }
    if (status === 409 && code === 'failed_terminal') {
      return { kind: 'failed_terminal', message: message || 'Požadavek nelze dokončit.', retryable: false };
    }
    if (status === 429 || code === 'rate_limited') {
      return { kind: 'rate_limited', message: message || 'Příliš mnoho pokusů. Zkuste to později.', retryable: true };
    }
    if (code === 'completion_pending') {
      return { kind: 'completion_pending', message: message || 'Dokončení probíhá — zkuste znovu.', retryable: true };
    }
    if (
      status === 502 ||
      code === 'auth_delete_failed' ||
      code === 'auth_unavailable' ||
      code === 'prepare_failed' ||
      code === 'preflight_failed' ||
      code === 'request_failed' ||
      (payload && payload.retryable === true)
    ) {
      return { kind: 'retryable', message: message || 'Dočasná chyba. Zkuste znovu.', retryable: true };
    }
    return { kind: 'error', message: message || ('Chyba serveru (' + status + ').'), retryable: false };
  }

  /** Exported for unit tests */
  function mapEdgeResult(status, payload) {
    return mapEdgeError(status, payload);
  }

  async function ensureClient() {
    if (supabase) return supabase;
    var cfg = configOk();
    if (!cfg) return null;
    if (!global.supabase || !global.supabase.createClient) {
      setError('Knihovna Supabase není načtená.');
      return null;
    }
    supabase = global.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
    return supabase;
  }

  async function loadPreflight() {
    clearError();
    setStatus('Kontroluji stav účtu…');
    var client = await ensureClient();
    if (!client) return;
    var res = await client.rpc('account_deletion_preflight');
    if (res.error) {
      setError(res.error.message || 'Stav účtu se nepodařilo načíst.');
      setStatus('');
      return;
    }
    preflight = res.data || {};
    setStatus('');
    renderPreflight();
    showStep('preflight');
  }

  async function loadTransferCandidates(teamId) {
    var client = await ensureClient();
    var session = (await client.auth.getSession()).data.session;
    var selfId = session && session.user ? session.user.id : null;
    var membersRes = await client
      .from('team_members')
      .select('id, user_id, display_name')
      .eq('team_id', teamId);
    if (membersRes.error) throw membersRes.error;
    var periodsRes = await client
      .from('team_membership_periods')
      .select('member_id, ended_at')
      .eq('team_id', teamId)
      .is('ended_at', null);
    if (periodsRes.error) throw periodsRes.error;
    var active = {};
    (periodsRes.data || []).forEach(function (p) {
      active[p.member_id] = true;
    });
    return (membersRes.data || [])
      .filter(function (m) {
        return (
          active[m.id] &&
          m.user_id &&
          m.user_id !== selfId &&
          String(m.user_id).length > 0
        );
      })
      .map(function (m) {
        return {
          memberId: m.id,
          displayName: m.display_name || 'Člen',
          userId: m.user_id,
        };
      });
  }

  function renderPreflight() {
    var blocked = (preflight && preflight.blocked_ownership) || [];
    var dissolve = (preflight && preflight.dissolve_eligible) || [];
    var canPrepare = preflight && preflight.can_prepare === true;
    var box = els.blockers;
    box.innerHTML = '';

    if (canPrepare && blocked.length === 0 && dissolve.length === 0) {
      els.preflightSummary.textContent =
        'Účet je připraven ke smazání. Pokračujte ověřením hesla.';
      els.btnContinue.hidden = false;
      return;
    }

    els.btnContinue.hidden = true;
    els.preflightSummary.textContent =
      'Nejdřív vyřešte vlastnictví týmů. Dokud vlastníte tým s dalšími členy nebo máte tým ke zrušení, účet nelze smazat.';

    blocked.forEach(function (b) {
      var card = document.createElement('div');
      card.className = 'card';
      card.style.marginBottom = '0';
      var title = document.createElement('h3');
      title.textContent = b.team_name || b.team_id;
      card.appendChild(title);
      var hint = document.createElement('p');
      hint.className = 'muted';
      hint.textContent =
        (b.other_active_members != null ? b.other_active_members + ' ' : '') +
        'další aktivní členové — vyberte nástupce.';
      card.appendChild(hint);
      var list = document.createElement('div');
      list.className = 'stack';
      list.textContent = 'Načítám kandidáty…';
      card.appendChild(list);
      box.appendChild(card);
      loadTransferCandidates(b.team_id)
        .then(function (cands) {
          list.innerHTML = '';
          if (!cands.length) {
            list.textContent = 'Žádný vhodný člen k předání.';
            return;
          }
          cands.forEach(function (c) {
            var row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center';
            row.style.gap = '12px';
            var name = document.createElement('span');
            name.textContent = c.displayName;
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-filled';
            btn.textContent = 'Předat vlastnictví';
            btn.addEventListener('click', function () {
              transferOwnership(b.team_id, c.memberId);
            });
            row.appendChild(name);
            row.appendChild(btn);
            list.appendChild(row);
          });
        })
        .catch(function () {
          list.textContent = 'Kandidáty se nepodařilo načíst.';
        });
    });

    dissolve.forEach(function (b) {
      var card = document.createElement('div');
      card.className = 'card';
      card.style.marginBottom = '0';
      var title = document.createElement('h3');
      title.textContent = b.team_name || b.team_id;
      card.appendChild(title);
      var body = document.createElement('p');
      body.className = 'muted';
      body.textContent =
        'Tým bude zrušen. Historie událostí zůstane bez vazby na váš účet (obecné jméno). Tuto akci nelze vrátit.';
      card.appendChild(body);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-danger';
      btn.textContent = 'Zrušit tým';
      btn.addEventListener('click', function () {
        dissolveTeam(b.team_id, b.team_name || 'tým');
      });
      card.appendChild(btn);
      box.appendChild(card);
    });
  }

  async function transferOwnership(teamId, newOwnerMemberId) {
    if (busy) return;
    clearError();
    setBusy(true);
    try {
      var client = await ensureClient();
      var res = await client.rpc('transfer_team_ownership', {
        p_team_id: teamId,
        p_new_owner_member_id: newOwnerMemberId,
      });
      if (res.error) {
        setError(res.error.message || 'Předání vlastnictví se nezdařilo.');
        return;
      }
      setStatus('Vlastnictví bylo předáno.');
      await loadPreflight();
    } finally {
      setBusy(false);
    }
  }

  async function dissolveTeam(teamId, teamName) {
    if (busy) return;
    if (
      !global.confirm(
        'Zrušit tým „' + teamName + '“? Tuto akci nelze vrátit.'
      )
    ) {
      return;
    }
    clearError();
    setBusy(true);
    try {
      var client = await ensureClient();
      var res = await client.rpc('dissolve_team', { p_team_id: teamId });
      if (res.error) {
        setError(res.error.message || 'Zrušení týmu se nezdařilo.');
        return;
      }
      setStatus('Tým byl zrušen.');
      await loadPreflight();
    } finally {
      setBusy(false);
    }
  }

  async function signIn(email, password) {
    if (busy) return;
    clearError();
    setBusy(true);
    try {
      lastEmail = email;
      var client = await ensureClient();
      if (!client) return;
      var res = await client.auth.signInWithPassword({ email: email, password: password });
      if (res.error) {
        setError('Přihlášení se nezdařilo. Zkontrolujte e-mail a heslo.');
        return;
      }
      reauthed = false;
      await loadPreflight();
    } finally {
      setBusy(false);
    }
  }

  async function reauth(password) {
    if (busy) return;
    clearError();
    setBusy(true);
    try {
      var client = await ensureClient();
      if (!client) return;
      var email = lastEmail;
      if (!email) {
        var user = (await client.auth.getUser()).data.user;
        email = user && user.email;
      }
      if (!email) {
        setError('Chybí e-mail pro ověření.');
        return;
      }
      var res = await client.auth.signInWithPassword({ email: email, password: password });
      if (res.error) {
        setError('Heslo není správné.');
        return;
      }
      reauthed = true;
      setStatus('Heslo ověřeno.');
      showStep('confirm');
    } finally {
      setBusy(false);
    }
  }

  async function invokeDeleteAccount() {
    if (busy) return;
    if (!reauthed) {
      setError('Nejdřív ověřte heslo.');
      showStep('reauth');
      return;
    }
    clearError();
    setBusy(true);
    setStatus('Mažu účet…');
    try {
      var client = await ensureClient();
      if (!client) return;
      var session = (await client.auth.getSession()).data.session;
      if (!session || !session.access_token) {
        setError('Chybí aktivní relace.');
        showStep('login');
        return;
      }
      // Body per CONTRACT — confirm only. Never send user_id.
      var fn = await client.functions.invoke('delete-account', {
        body: { confirm: true },
      });
      var status = 200;
      var payload = fn.data;
      if (fn.error) {
        // functions.invoke may put status on error.context
        status =
          (fn.error.context && fn.error.context.status) ||
          fn.error.status ||
          500;
        try {
          if (typeof fn.error.context === 'object' && fn.error.context.json) {
            payload = await fn.error.context.json();
          } else if (fn.data) {
            payload = fn.data;
          } else {
            payload = { error: 'request_failed', message: fn.error.message };
          }
        } catch (_) {
          payload = { error: 'request_failed', message: fn.error.message };
        }
      }
      var mapped = mapEdgeError(status, payload || {});
      if (mapped.kind === 'completed') {
        await safeSignOut();
        showResult(mapped.message, false);
        return;
      }
      if (mapped.kind === 'blocked_ownership') {
        preflight = {
          can_prepare: false,
          blocked_ownership: mapped.blocked || [],
          dissolve_eligible: mapped.dissolve || [],
        };
        setError(mapped.message);
        renderPreflight();
        showStep('preflight');
        return;
      }
      if (mapped.kind === 'reauth_required') {
        reauthed = false;
        setError(mapped.message);
        showStep('reauth');
        return;
      }
      if (mapped.kind === 'unauthorized') {
        await safeSignOut();
        setError(mapped.message);
        showStep('login');
        return;
      }
      showResult(mapped.message, mapped.retryable);
    } finally {
      setBusy(false);
      setStatus('');
    }
  }

  async function safeSignOut() {
    try {
      if (!supabase) return;
      await supabase.auth.signOut({ scope: 'local' });
    } catch (_) {
      /* best-effort */
    }
  }

  function showResult(message, retryable) {
    showStep('result');
    els.resultMessage.textContent = message;
    els.btnRetry.hidden = !retryable;
    setBanner(els.status, '', 'info');
  }

  function wire() {
    els.error = $('error');
    els.status = $('status');
    els.envBanner = $('env-banner');
    els.blockers = $('blockers');
    els.preflightSummary = $('preflight-summary');
    els.btnContinue = $('btn-continue');
    els.btnRetry = $('btn-retry');
    els.resultMessage = $('result-message');

    $('form-login').addEventListener('submit', function (e) {
      e.preventDefault();
      var email = $('email').value.trim();
      var password = $('password').value;
      if (!email || !password) {
        setError('Vyplňte e-mail i heslo.');
        return;
      }
      signIn(email, password);
    });

    $('btn-refresh-preflight').addEventListener('click', function () {
      loadPreflight();
    });
    $('btn-continue').addEventListener('click', function () {
      clearError();
      showStep('reauth');
    });
    $('btn-signout').addEventListener('click', async function () {
      await safeSignOut();
      showStep('login');
      setStatus('Odhlášeno.');
    });

    $('form-reauth').addEventListener('submit', function (e) {
      e.preventDefault();
      var password = $('reauth-password').value;
      if (!password) {
        setError('Zadejte heslo.');
        return;
      }
      reauth(password);
    });
    $('btn-reauth-back').addEventListener('click', function () {
      showStep('preflight');
    });

    $('btn-confirm-delete').addEventListener('click', function () {
      invokeDeleteAccount();
    });
    $('btn-confirm-cancel').addEventListener('click', function () {
      reauthed = false;
      showStep('preflight');
    });
    $('btn-retry').addEventListener('click', function () {
      invokeDeleteAccount();
    });
  }

  function boot() {
    wire();
    var cfg = global.SESTAVA_WEB_CONFIG || {};
    var envText =
      'Prostředí: ' +
      (cfg.environment || '?') +
      ' · produkce vypnuta · pouze public publishable key';
    setBanner(els.envBanner, envText, 'warn');
    els.envBanner.hidden = false;

    var ok = configOk();
    if (!ok) {
      showStep('login');
      return;
    }
    showStep('login');
  }

  global.SestavaDeleteAccount = {
    boot: boot,
    mapEdgeResult: mapEdgeResult,
    _test: {
      mapEdgeError: mapEdgeError,
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
