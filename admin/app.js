(function () {
  const API_BASE = "https://api.emlakasistani.me/admin";

  const state = {
    selectedUser: null,
    aiEnabled: null,
  };

  const els = {
    searchForm: document.getElementById("userSearchForm"),
    clearSelectionBtn: document.getElementById("clearSelectionBtn"),
    selectedUserEmpty: document.getElementById("selectedUserEmpty"),
    selectedUserCard: document.getElementById("selectedUserCard"),
    userStateBadge: document.getElementById("userStateBadge"),
    subscriptionForm: document.getElementById("subscriptionForm"),
    passwordResetForm: document.getElementById("passwordResetForm"),
    issueTokenBtn: document.getElementById("issueTokenBtn"),
    copyTokenBtn: document.getElementById("copyTokenBtn"),
    tokenOutput: document.getElementById("tokenOutput"),
    refreshAiBtn: document.getElementById("refreshAiBtn"),
    toggleAiBtn: document.getElementById("toggleAiBtn"),
    aiEnabledValue: document.getElementById("aiEnabledValue"),
    aiStateBadge: document.getElementById("aiStateBadge"),
    statusBox: document.getElementById("statusBox"),
  };

  const userValueIds = {
    id: document.getElementById("userIdValue"),
    email: document.getElementById("userEmailValue"),
    fullName: document.getElementById("userFullNameValue"),
    phone: document.getElementById("userPhoneValue"),
    plan: document.getElementById("userPlanValue"),
    planStatus: document.getElementById("userPlanStatusValue"),
    endsAt: document.getElementById("userEndsAtValue"),
    remainingDays: document.getElementById("userRemainingDaysValue"),
  };

  function setStatus(message, tone) {
    if (!els.statusBox) return;
    els.statusBox.textContent = message;
    els.statusBox.className = "admin-status";
    if (tone === "success") els.statusBox.classList.add("admin-status-success");
    else if (tone === "error") els.statusBox.classList.add("admin-status-error");
    else els.statusBox.classList.add("admin-status-neutral");
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
    if (!secret) {
      setStatus("Admin Secret gerekli.", "error");
      return null;
    }
    return secret;
  }

  async function apiRequest(path, options) {
    const secret = ensureAdminSecret();
    if (!secret) throw new Error("ADMIN_SECRET_REQUIRED");

    const response = await fetch(`${API_BASE}${path}`, {
      method: options && options.method ? options.method : "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Secret": secret,
        ...(options && options.headers ? options.headers : {}),
      },
      body: options && options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await response.json().catch(() => ({ ok: false, error: "Invalid server response" }));
    if (!response.ok || data.ok === false) {
      throw new Error(data && data.error ? data.error : `HTTP_${response.status}`);
    }
    return data;
  }

  async function findUser(params) {
    const query = new URLSearchParams(params);
    return apiRequest(`/users/find?${query.toString()}`);
  }

  async function refreshUserById(userId) {
    return apiRequest(`/users/${encodeURIComponent(userId)}`);
  }

  async function updateSubscription(payload) {
    return apiRequest("/subscriptions/set", { method: "POST", body: payload });
  }

  async function issueToken(payload) {
    return apiRequest("/tokens/issue", { method: "POST", body: payload });
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

  function renderSelectedUser() {
    const user = state.selectedUser;
    const hasUser = !!user;

    if (els.selectedUserEmpty) els.selectedUserEmpty.hidden = hasUser;
    if (els.selectedUserCard) els.selectedUserCard.hidden = !hasUser;
    if (els.userStateBadge) {
      els.userStateBadge.textContent = hasUser ? "Secili" : "Hazir";
      els.userStateBadge.className = hasUser ? "admin-badge" : "admin-badge admin-badge-muted";
    }
    if (!hasUser) return;

    userValueIds.id.textContent = user.id || "-";
    userValueIds.email.textContent = user.email || "-";
    userValueIds.fullName.textContent = user.fullName || "-";
    userValueIds.phone.textContent = user.phone || "-";
    userValueIds.plan.textContent = user.plan || "-";
    userValueIds.planStatus.textContent = user.planStatus || "-";
    userValueIds.endsAt.textContent = user.endsAt || "-";
    userValueIds.remainingDays.textContent = user.remainingDays == null ? "-" : String(user.remainingDays);
  }

  function renderAiState() {
    const val = state.aiEnabled;
    if (els.aiEnabledValue) {
      if (val === null) els.aiEnabledValue.textContent = "Kontrol edilmedi";
      else els.aiEnabledValue.textContent = val ? "Acik" : "Kapali";
    }
    if (els.aiStateBadge) {
      els.aiStateBadge.textContent = val === null ? "Bilinmiyor" : (val ? "Acik" : "Kapali");
      els.aiStateBadge.className = val === null ? "admin-badge admin-badge-muted" : "admin-badge";
    }
  }

  function bindEvents() {
    if (els.searchForm) {
      els.searchForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const email = String(data.get("searchEmail") || "").trim();
        const userId = String(data.get("searchUserId") || "").trim();
        if (!email && !userId) {
          setStatus("Email veya User ID girin.", "error");
          return;
        }
        if (email && userId) {
          setStatus("Ayni anda sadece email veya userId kullanin.", "error");
          return;
        }

        setStatus("Kullanici aranıyor...", "neutral");
        try {
          const result = await findUser(userId ? { userId } : { email });
          state.selectedUser = result.user || null;
          renderSelectedUser();
          setStatus("Kullanici bulundu.", "success");
        } catch (error) {
          state.selectedUser = null;
          renderSelectedUser();
          setStatus(error instanceof Error ? error.message : "Kullanici aramasi basarisiz.", "error");
        }
      });
    }

    if (els.clearSelectionBtn) {
      els.clearSelectionBtn.addEventListener("click", () => {
        state.selectedUser = null;
        renderSelectedUser();
        setStatus("Secili kullanici temizlendi.", "neutral");
      });
    }

    if (els.subscriptionForm) {
      els.subscriptionForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!state.selectedUser) {
          setStatus("Abonelik islemi icin once kullanici secin.", "error");
          return;
        }
        const data = new FormData(event.currentTarget);
        const durationValue = String(data.get("durationDays") || "").trim();
        const payload = {
          userId: state.selectedUser.id,
          plan: String(data.get("plan") || ""),
          status: String(data.get("status") || ""),
          ...(durationValue ? { durationDays: Number(durationValue) } : {}),
        };

        setStatus("Abonelik guncelleniyor...", "neutral");
        try {
          const result = await updateSubscription(payload);
          state.selectedUser = result.user || state.selectedUser;
          renderSelectedUser();
          setStatus("Abonelik guncellendi.", "success");
        } catch (error) {
          setStatus(error instanceof Error ? error.message : "Abonelik guncellenemedi.", "error");
        }
      });
    }

    if (els.issueTokenBtn) {
      els.issueTokenBtn.addEventListener("click", async () => {
        if (!state.selectedUser) {
          setStatus("Token uretmek icin once kullanici secin.", "error");
          return;
        }
        setStatus("Token uretiliyor...", "neutral");
        try {
          const result = await issueToken({ userId: state.selectedUser.id });
          if (els.tokenOutput) {
            els.tokenOutput.value = result.token || "";
          }
          state.selectedUser = result.user || state.selectedUser;
          renderSelectedUser();
          setStatus("Yeni token uretildi.", "success");
        } catch (error) {
          setStatus(error instanceof Error ? error.message : "Token uretilemedi.", "error");
        }
      });
    }

    if (els.passwordResetForm) {
      els.passwordResetForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!state.selectedUser) {
          setStatus("Sifre sifirlama icin once kullanici secin.", "error");
          return;
        }

        const data = new FormData(event.currentTarget);
        const password = String(data.get("newPassword") || "");
        if (password.length < 8) {
          setStatus("Yeni sifre en az 8 karakter olmali.", "error");
          return;
        }

        setStatus("Kullanici sifresi guncelleniyor...", "neutral");
        try {
          const result = await resetPassword({ userId: state.selectedUser.id, password });
          state.selectedUser = result.user || state.selectedUser;
          renderSelectedUser();
          event.currentTarget.reset();
          setStatus("Kullanici sifresi guncellendi.", "success");
        } catch (error) {
          setStatus(error instanceof Error ? error.message : "Sifre guncellenemedi.", "error");
        }
      });
    }

    if (els.copyTokenBtn) {
      els.copyTokenBtn.addEventListener("click", async () => {
        const value = els.tokenOutput && els.tokenOutput.value;
        if (!value) {
          setStatus("Kopyalanacak token yok.", "error");
          return;
        }
        try {
          await navigator.clipboard.writeText(value);
          setStatus("Token panoya kopyalandi.", "success");
        } catch {
          setStatus("Panoya kopyalama basarisiz.", "error");
        }
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
  }

  renderSelectedUser();
  renderAiState();
  hydrateAdminSecret();
  bindEvents();

  if (state.selectedUser && state.selectedUser.id) {
    refreshUserById(state.selectedUser.id).catch(() => {});
  }
})();
