(function () {
  const API_BASE = "https://api.emlakasistani.me/admin";
  const PRO_PRESETS = [7, 30, 90, 365];

  const state = {
    isAuthenticated: false,
    users: [],
    selectedUser: null,
    aiEnabled: null,
    modal: null,
    filters: {
      query: "",
      plan: "all",
      status: "all",
    },
  };

  const els = {
    authGate: document.getElementById("authGate"),
    adminShell: document.getElementById("adminShell"),
    authForm: document.getElementById("authForm"),
    authStatus: document.getElementById("authStatus"),
    authSubmitBtn: document.getElementById("authSubmitBtn"),
    lockPanelBtn: document.getElementById("lockPanelBtn"),
    searchForm: document.getElementById("searchForm"),
    refreshUsersBtn: document.getElementById("refreshUsersBtn"),
    userList: document.getElementById("userList"),
    userListEmpty: document.getElementById("userListEmpty"),
    userCountBadge: document.getElementById("userCountBadge"),
    selectedPlanBadge: document.getElementById("selectedPlanBadge"),
    detailEmpty: document.getElementById("detailEmpty"),
    detailCard: document.getElementById("detailCard"),
    detailName: document.getElementById("detailName"),
    detailEmail: document.getElementById("detailEmail"),
    detailUserId: document.getElementById("detailUserId"),
    detailPhone: document.getElementById("detailPhone"),
    detailPlan: document.getElementById("detailPlan"),
    detailStatus: document.getElementById("detailStatus"),
    detailEndsAt: document.getElementById("detailEndsAt"),
    detailRemainingDays: document.getElementById("detailRemainingDays"),
    detailLastLogin: document.getElementById("detailLastLogin"),
    detailCreatedAt: document.getElementById("detailCreatedAt"),
    detailProBtn: document.getElementById("detailProBtn"),
    detailEnterpriseBtn: document.getElementById("detailEnterpriseBtn"),
    detailFreeBtn: document.getElementById("detailFreeBtn"),
    detailPasswordBtn: document.getElementById("detailPasswordBtn"),
    refreshAiBtn: document.getElementById("refreshAiBtn"),
    toggleAiBtn: document.getElementById("toggleAiBtn"),
    aiEnabledValue: document.getElementById("aiEnabledValue"),
    aiStateBadge: document.getElementById("aiStateBadge"),
    statusBox: document.getElementById("statusBox"),
    modalBackdrop: document.getElementById("modalBackdrop"),
    modalKicker: document.getElementById("modalKicker"),
    modalTitle: document.getElementById("modalTitle"),
    modalDescription: document.getElementById("modalDescription"),
    modalFields: document.getElementById("modalFields"),
    modalForm: document.getElementById("modalForm"),
    modalCancelBtn: document.getElementById("modalCancelBtn"),
    modalCloseBtn: document.getElementById("modalCloseBtn"),
    modalSubmitBtn: document.getElementById("modalSubmitBtn"),
  };

  function setStatus(message, tone) {
    if (!els.statusBox) return;
    els.statusBox.textContent = message;
    els.statusBox.className = "status-box";
    if (tone === "success") els.statusBox.classList.add("status-success");
    else if (tone === "error") els.statusBox.classList.add("status-error");
    else els.statusBox.classList.add("status-neutral");
  }

  function setAuthStatus(message, tone) {
    if (!els.authStatus) return;
    els.authStatus.textContent = message;
    els.authStatus.className = "gate-status";
    if (tone === "success") els.authStatus.classList.add("status-success");
    else if (tone === "error") els.authStatus.classList.add("status-error");
    else els.authStatus.classList.add("status-neutral");
  }

  function getAdminSecret() {
    const input = document.getElementById("adminSecret");
    const value = input ? String(input.value || "").trim() : "";
    if (value) {
      try {
        sessionStorage.setItem("ea_admin_secret", value);
      } catch {}
      return value;
    }
    try {
      return sessionStorage.getItem("ea_admin_secret") || "";
    } catch {
      return "";
    }
  }

  function setAdminSecret(secret) {
    try {
      if (secret) sessionStorage.setItem("ea_admin_secret", secret);
      else sessionStorage.removeItem("ea_admin_secret");
    } catch {}
  }

  function hydrateAdminSecret() {
    const input = document.getElementById("adminSecret");
    if (!input) return;
    try {
      const stored = sessionStorage.getItem("ea_admin_secret") || "";
      if (stored && !input.value) input.value = stored;
    } catch {}
  }

  function ensureAdminSecret() {
    const secret = getAdminSecret();
    if (!secret) throw new Error("ADMIN_SECRET_REQUIRED");
    return secret;
  }

  async function apiRequest(path, options = {}) {
    const secret = ensureAdminSecret();
    const response = await fetch(`${API_BASE}${path}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Secret": secret,
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await response.json().catch(() => ({ ok: false, error: "Invalid server response" }));
    if (!response.ok || data.ok === false) {
      throw new Error(data && data.error ? data.error : `HTTP_${response.status}`);
    }
    return data;
  }

  async function verifySecret() {
    return apiRequest("/features/ai");
  }

  async function listUsers() {
    const params = new URLSearchParams();
    if (state.filters.query) params.set("q", state.filters.query);
    if (state.filters.plan && state.filters.plan !== "all") params.set("plan", state.filters.plan);
    if (state.filters.status && state.filters.status !== "all") params.set("status", state.filters.status);
    params.set("limit", "50");
    return apiRequest(`/users?${params.toString()}`);
  }

  async function refreshUserById(userId) {
    return apiRequest(`/users/${encodeURIComponent(userId)}`);
  }

  async function updateSubscription(payload) {
    return apiRequest("/subscriptions/set", { method: "POST", body: payload });
  }

  async function resetPassword(payload) {
    return apiRequest("/users/reset-password", { method: "POST", body: payload });
  }

  async function getAiState() {
    return apiRequest("/features/ai");
  }

  async function setAiState(enabled) {
    return apiRequest("/features/ai", { method: "POST", body: { enabled } });
  }

  function formatDate(value) {
    if (!value) return "Yok";
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return String(value);
    return new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(dt);
  }

  function getPlanPillClass(user) {
    if (!user) return "plan-pill plan-pill-muted";
    if (user.plan === "enterprise") return "plan-pill plan-pill-enterprise";
    if (user.plan === "pro") return "plan-pill plan-pill-pro";
    return "plan-pill plan-pill-free";
  }

  function getPlanText(user) {
    if (!user) return "Hazir";
    if (user.plan === "enterprise") return "ENTERPRISE · suresiz";
    if (user.plan === "pro") {
      const days = Number(user.remainingDays);
      return Number.isFinite(days) ? `PRO · ${days} gun` : "PRO";
    }
    return "FREE";
  }

  function syncSelectedUser(nextUser) {
    if (!nextUser) return;
    state.selectedUser = nextUser;
    state.users = state.users.map((item) => item.id === nextUser.id ? nextUser : item);
  }

  function renderShell() {
    if (els.authGate) els.authGate.hidden = state.isAuthenticated;
    if (els.adminShell) els.adminShell.hidden = !state.isAuthenticated;
  }

  function renderAiState() {
    const val = state.aiEnabled;
    if (els.aiEnabledValue) {
      els.aiEnabledValue.textContent = val === null ? "Kontrol edilmedi" : (val ? "Acik" : "Kapali");
    }
    if (els.aiStateBadge) {
      els.aiStateBadge.textContent = val === null ? "Bilinmiyor" : (val ? "Acik" : "Kapali");
      els.aiStateBadge.className = val === null ? "plan-pill plan-pill-muted" : `plan-pill ${val ? "plan-pill-pro" : "plan-pill-free"}`;
    }
  }

  function renderSelectedUser() {
    const user = state.selectedUser;
    const hasUser = !!user;
    if (els.detailEmpty) els.detailEmpty.hidden = hasUser;
    if (els.detailCard) els.detailCard.hidden = !hasUser;
    if (els.selectedPlanBadge) {
      els.selectedPlanBadge.className = hasUser ? getPlanPillClass(user) : "plan-pill plan-pill-muted";
      els.selectedPlanBadge.textContent = hasUser ? getPlanText(user) : "Hazir";
    }
    if (!hasUser) return;

    els.detailName.textContent = user.fullName || "Adsiz kullanici";
    els.detailEmail.textContent = user.email || "-";
    els.detailUserId.textContent = user.id || "-";
    els.detailPhone.textContent = user.phone || "Yok";
    els.detailPlan.textContent = String(user.plan || "-").toUpperCase();
    els.detailStatus.textContent = user.planStatus || "-";
    els.detailEndsAt.textContent = user.plan === "enterprise" ? "Suresiz" : formatDate(user.endsAt);
    els.detailRemainingDays.textContent = user.plan === "enterprise" ? "Suresiz" : (user.remainingDays == null ? "-" : `${user.remainingDays} gun`);
    els.detailLastLogin.textContent = formatDate(user.lastLoginAt);
    els.detailCreatedAt.textContent = formatDate(user.createdAt);
  }

  function createUserRow(user) {
    const row = document.createElement("article");
    row.className = `user-row${state.selectedUser?.id === user.id ? " active" : ""}`;

    const main = document.createElement("div");
    main.className = "user-main";
    main.innerHTML = `
      <strong>${escapeHtml(user.fullName || "Adsiz kullanici")}</strong>
      <span>${escapeHtml(user.email || "-")}</span>
    `;

    const meta = document.createElement("div");
    meta.className = "user-meta";
    meta.innerHTML = `
      <strong>${escapeHtml(user.id)}</strong>
      <span>Son giris: ${escapeHtml(formatDate(user.lastLoginAt))}</span>
    `;

    const plan = document.createElement("div");
    plan.className = "user-plan-stack";
    plan.innerHTML = `
      <span class="${getPlanPillClass(user)}">${escapeHtml(getPlanText(user))}</span>
      <span class="muted-line">${escapeHtml(user.planStatus)}${user.plan === "pro" && user.endsAt ? ` · ${escapeHtml(formatDate(user.endsAt))}` : ""}</span>
    `;

    const actions = document.createElement("div");
    actions.className = "user-actions";
    actions.append(
      makeActionButton("Detay", "", () => {
        state.selectedUser = user;
        renderUsers();
        renderSelectedUser();
        setStatus(`${user.email} secildi.`, "neutral");
      }),
      makeActionButton("Pro Ver", "mini-btn-accent", () => openPlanModal("pro", user)),
      makeActionButton("Enterprise", "mini-btn-gold", () => openPlanModal("enterprise", user)),
      makeActionButton("Free Yap", "mini-btn-danger", () => openPlanModal("free", user)),
      makeActionButton("Sifre", "", () => openPasswordModal(user))
    );

    row.append(main, meta, plan, actions);
    return row;
  }

  function renderUsers() {
    const items = Array.isArray(state.users) ? state.users : [];
    if (els.userCountBadge) {
      els.userCountBadge.textContent = `${items.length} kullanici`;
    }
    if (els.userListEmpty) {
      els.userListEmpty.hidden = items.length > 0;
      if (!items.length) {
        els.userListEmpty.textContent = state.isAuthenticated
          ? "Bu filtrede kullanici bulunamadi. Yeni bir arama deneyin."
          : "Secret dogrulamasindan sonra kullanici listesi burada gorunecek.";
      }
    }
    if (!els.userList) return;
    els.userList.hidden = items.length === 0;
    els.userList.innerHTML = "";
    items.forEach((user) => els.userList.appendChild(createUserRow(user)));
  }

  function renderModal() {
    const modal = state.modal;
    if (!els.modalBackdrop) return;
    els.modalBackdrop.hidden = !modal;
    if (!modal) return;

    els.modalKicker.textContent = modal.kicker;
    els.modalTitle.textContent = modal.title;
    els.modalDescription.textContent = modal.description || "";
    els.modalSubmitBtn.textContent = modal.submitLabel || "Kaydet";
    els.modalFields.innerHTML = modal.fieldsHtml || "";
  }

  function closeModal() {
    state.modal = null;
    renderModal();
  }

  function openPlanModal(plan, user) {
    const isPro = plan === "pro";
    const isEnterprise = plan === "enterprise";
    const isFree = plan === "free";

    let fieldsHtml = "";
    if (isPro) {
      fieldsHtml = `
        <div class="gate-field">
          <span>Hazir sureler</span>
          <div class="detail-actions">
            ${PRO_PRESETS.map((day) => `<button class="ghost-btn" type="button" data-day-preset="${day}">${day} gun</button>`).join("")}
          </div>
        </div>
        <label class="gate-field">
          <span>Gun sayisi</span>
          <input id="modalDurationDays" name="durationDays" type="number" min="1" value="30" placeholder="30">
        </label>
      `;
    }

    state.modal = {
      type: "plan",
      plan,
      userId: user.id,
      kicker: isPro ? "Timed Premium" : isEnterprise ? "Permanent Premium" : "Downgrade",
      title: isPro ? "Pro Ver" : isEnterprise ? "Enterprise Ver" : "Free Yap",
      description: isPro
        ? `${user.email} icin sureli premium uyelik ata.`
        : isEnterprise
          ? `${user.email} icin suresiz premium uyelik ata.`
          : `${user.email} kullanicisini free plana dusur.`,
      submitLabel: isPro ? "Pro Olarak Kaydet" : isEnterprise ? "Enterprise Olarak Kaydet" : "Free Olarak Kaydet",
      fieldsHtml,
      onSubmit: async (form) => {
        const durationDays = Number(form.get("durationDays") || 30);
        const payload = {
          userId: user.id,
          plan,
          status: "active",
          ...(isPro ? { durationDays } : {}),
        };
        const result = await updateSubscription(payload);
        syncSelectedUser(result.user || user);
        renderUsers();
        renderSelectedUser();
        setStatus(`${user.email} icin plan guncellendi.`, "success");
        closeModal();
      },
    };
    renderModal();
  }

  function openPasswordModal(user) {
    state.modal = {
      type: "password",
      userId: user.id,
      kicker: "Support",
      title: "Sifre Sifirla",
      description: `${user.email} icin yeni sifre ata. Mevcut sifre goruntulenemez.`,
      submitLabel: "Sifreyi Guncelle",
      fieldsHtml: `
        <label class="gate-field">
          <span>Yeni sifre</span>
          <input id="modalPassword" name="password" type="password" minlength="8" placeholder="En az 8 karakter" autocomplete="new-password">
        </label>
      `,
      onSubmit: async (form) => {
        const password = String(form.get("password") || "");
        if (password.length < 8) {
          throw new Error("Yeni sifre en az 8 karakter olmali.");
        }
        const result = await resetPassword({ userId: user.id, password });
        syncSelectedUser(result.user || user);
        renderUsers();
        renderSelectedUser();
        setStatus(`${user.email} icin sifre guncellendi.`, "success");
        closeModal();
      },
    };
    renderModal();
  }

  function makeActionButton(label, extraClass, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `mini-btn ${extraClass || ""}`.trim();
    btn.textContent = label;
    btn.addEventListener("click", onClick);
    return btn;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  async function loadUsers() {
    setStatus("Kullanici listesi yukleniyor...", "neutral");
    const result = await listUsers();
    state.users = Array.isArray(result.items) ? result.items : [];
    if (state.selectedUser?.id) {
      state.selectedUser = state.users.find((item) => item.id === state.selectedUser.id) || state.selectedUser;
      if (state.selectedUser?.id) {
        const fresh = await refreshUserById(state.selectedUser.id).catch(() => null);
        if (fresh?.user) syncSelectedUser(fresh.user);
      }
    }
    renderUsers();
    renderSelectedUser();
    setStatus("Kullanici listesi guncellendi.", "success");
  }

  async function unlockPanel() {
    if (els.authSubmitBtn) {
      els.authSubmitBtn.disabled = true;
      els.authSubmitBtn.textContent = "Dogrulaniyor...";
    }
    setAuthStatus("Admin Secret dogrulaniyor...", "neutral");
    try {
      const ai = await verifySecret();
      state.aiEnabled = !!ai.enabled;
      state.isAuthenticated = true;
      renderShell();
      renderAiState();
      setStatus("Panel acildi. Kullanici listesi yukleniyor...", "success");
      await loadUsers();
      setAuthStatus("Dogrulama basarili.", "success");
    } catch (error) {
      state.isAuthenticated = false;
      renderShell();
      setAuthStatus(error instanceof Error ? error.message : "Secret dogrulanamadi.", "error");
    } finally {
      if (els.authSubmitBtn) {
        els.authSubmitBtn.disabled = false;
        els.authSubmitBtn.textContent = "Dogrula ve Panele Gir";
      }
    }
  }

  function lockPanel() {
    state.isAuthenticated = false;
    state.users = [];
    state.selectedUser = null;
    setAdminSecret("");
    const input = document.getElementById("adminSecret");
    if (input) input.value = "";
    renderShell();
    renderUsers();
    renderSelectedUser();
    closeModal();
    setAuthStatus("Panel kilitlendi. Devam etmek icin yeniden secret girin.", "neutral");
  }

  function bindEvents() {
    if (els.authForm) {
      els.authForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        await unlockPanel();
      });
    }

    if (els.lockPanelBtn) {
      els.lockPanelBtn.addEventListener("click", lockPanel);
    }

    if (els.searchForm) {
      els.searchForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        state.filters.query = String(form.get("searchQuery") || "").trim();
        state.filters.plan = String(form.get("planFilter") || "all");
        state.filters.status = String(form.get("statusFilter") || "all");
        await loadUsers();
      });
    }

    if (els.refreshUsersBtn) {
      els.refreshUsersBtn.addEventListener("click", async () => {
        await loadUsers();
      });
    }

    if (els.refreshAiBtn) {
      els.refreshAiBtn.addEventListener("click", async () => {
        setStatus("AI durumu okunuyor...", "neutral");
        try {
          const result = await getAiState();
          state.aiEnabled = !!result.enabled;
          renderAiState();
          setStatus("AI durumu guncellendi.", "success");
        } catch (error) {
          setStatus(error instanceof Error ? error.message : "AI durumu okunamadi.", "error");
        }
      });
    }

    if (els.toggleAiBtn) {
      els.toggleAiBtn.addEventListener("click", async () => {
        const current = !!state.aiEnabled;
        setStatus("AI durumu degistiriliyor...", "neutral");
        try {
          const result = await setAiState(!current);
          state.aiEnabled = !!result.enabled;
          renderAiState();
          setStatus("AI durumu degistirildi.", "success");
        } catch (error) {
          setStatus(error instanceof Error ? error.message : "AI durumu degistirilemedi.", "error");
        }
      });
    }

    if (els.detailProBtn) els.detailProBtn.addEventListener("click", () => state.selectedUser && openPlanModal("pro", state.selectedUser));
    if (els.detailEnterpriseBtn) els.detailEnterpriseBtn.addEventListener("click", () => state.selectedUser && openPlanModal("enterprise", state.selectedUser));
    if (els.detailFreeBtn) els.detailFreeBtn.addEventListener("click", () => state.selectedUser && openPlanModal("free", state.selectedUser));
    if (els.detailPasswordBtn) els.detailPasswordBtn.addEventListener("click", () => state.selectedUser && openPasswordModal(state.selectedUser));

    if (els.modalCancelBtn) els.modalCancelBtn.addEventListener("click", closeModal);
    if (els.modalCloseBtn) els.modalCloseBtn.addEventListener("click", closeModal);
    if (els.modalBackdrop) {
      els.modalBackdrop.addEventListener("click", (event) => {
        if (event.target === els.modalBackdrop) closeModal();
      });
    }

    if (els.modalFields) {
      els.modalFields.addEventListener("click", (event) => {
        const btn = event.target.closest("[data-day-preset]");
        if (!btn) return;
        const day = btn.getAttribute("data-day-preset");
        const input = document.getElementById("modalDurationDays");
        if (input) input.value = day || "30";
      });
    }

    if (els.modalForm) {
      els.modalForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!state.modal?.onSubmit) return;
        const form = new FormData(event.currentTarget);
        try {
          els.modalSubmitBtn.disabled = true;
          await state.modal.onSubmit(form);
        } catch (error) {
          setStatus(error instanceof Error ? error.message : "Islem tamamlanamadi.", "error");
        } finally {
          els.modalSubmitBtn.disabled = false;
        }
      });
    }
  }

  function init() {
    hydrateAdminSecret();
    renderShell();
    renderUsers();
    renderSelectedUser();
    renderAiState();
    renderModal();
    bindEvents();
  }

  init();
})();
