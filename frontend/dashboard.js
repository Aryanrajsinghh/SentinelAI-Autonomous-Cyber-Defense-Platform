(() => {
  const API_BASE = "http://127.0.0.1:8000";
  const SERVER = { lat: 28.6139, lon: 77.2090 };
  const state = {
    alerts: [],
    attacks: [],
    responses: [],
    filteredAlerts: [],
    selectedAlertId: null,
    filters: { risk: "ALL", attack: "ALL", ip: "" },
    seenAttackKeys: new Set(),
  };
  const bus = new EventTarget();

  function formatAttackType(value) {
    return String(value || "unknown").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function riskLabel(score) {
    if (score >= 90) return "CRITICAL";
    if (score >= 70) return "HIGH";
    if (score >= 40) return "MEDIUM";
    return "LOW";
  }

  function riskClass(score) {
    return riskLabel(score).toLowerCase();
  }

  function nowText() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  function animateMetric(id, value) {
    if (window.SentinelAnimations?.animateCounter) {
      window.SentinelAnimations.animateCounter(id, value);
      return;
    }
    const node = document.getElementById(id);
    if (node) node.textContent = String(value);
  }

  function syncFilterState() {
    state.filters.risk = document.getElementById("riskFilter")?.value || "ALL";
    state.filters.attack = document.getElementById("attackFilter")?.value || "ALL";
    state.filters.ip = document.getElementById("ipFilter")?.value.trim().toLowerCase() || "";
  }

  function filteredAttackMap() {
    const ids = new Set(state.filteredAlerts.map((item) => item.id));
    return state.attacks.filter((item) => ids.has(item.id));
  }

  function applyFilters() {
    syncFilterState();
    state.filteredAlerts = state.alerts.filter((item) => {
      if (state.filters.risk !== "ALL" && riskLabel(item.risk_score) !== state.filters.risk) return false;
      if (state.filters.attack !== "ALL" && item.attack_type !== state.filters.attack) return false;
      if (state.filters.ip && !String(item.src_ip).toLowerCase().includes(state.filters.ip)) return false;
      return true;
    });
  }

  function updateAttackFilterOptions() {
    const select = document.getElementById("attackFilter");
    if (!select) return;
    const current = select.value || "ALL";
    const types = [...new Set(state.alerts.map((item) => item.attack_type))].sort();
    select.innerHTML = ["<option value=\"ALL\">All</option>", ...types.map((type) => `<option value="${type}">${formatAttackType(type)}</option>`)].join("");
    select.value = types.includes(current) ? current : "ALL";
  }

  function updateTopbar() {
    animateMetric("liveThreatCounter", state.filteredAlerts.length);
    const highest = state.filteredAlerts.reduce((max, item) => Math.max(max, item.risk_score), 0);
    const riskNode = document.getElementById("globalRiskLevel");
    if (riskNode) {
      riskNode.textContent = riskLabel(highest);
      riskNode.className = riskClass(highest);
    }
    const timeNode = document.getElementById("currentTime");
    if (timeNode) timeNode.textContent = nowText();
  }

  function updateStatCards() {
    animateMetric("totalAlerts", state.filteredAlerts.length);
    animateMetric("criticalAlerts", state.filteredAlerts.filter((item) => item.risk_score >= 90).length);
    const topThreatNode = document.getElementById("topThreat");
    const counts = new Map();
    state.filteredAlerts.forEach((item) => counts.set(item.attack_type, (counts.get(item.attack_type) || 0) + 1));
    const topThreat = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topThreatNode) topThreatNode.textContent = topThreat ? formatAttackType(topThreat[0]) : "-";
    const countryCount = new Set(filteredAttackMap().map((item) => item.country)).size;
    animateMetric("activeCountries", countryCount);
  }

  function updateGauge() {
    const highest = state.filteredAlerts.reduce((max, item) => Math.max(max, item.risk_score), 0);
    if (window.SentinelAnimations?.setGauge) {
      window.SentinelAnimations.setGauge(highest, riskLabel(highest));
    }
  }

  function renderResponses() {
    const container = document.getElementById("responseList");
    if (!container) return;
    if (!state.responses.length) {
      container.innerHTML = '<div class="empty-state">No automated responses have been executed yet.</div>';
      return;
    }
    container.innerHTML = state.responses.slice(0, 12).map((item) => `
      <article class="response-item">
        <strong>${item.ip}</strong>
        <p>${item.reason}</p>
        <span>${new Date(item.timestamp).toLocaleString()}</span>
      </article>
    `).join("");
  }

  function renderFeed() {
    const container = document.getElementById("attackFeed");
    if (!container) return;
    const attackById = new Map(state.attacks.map((item) => [item.id, item]));
    container.innerHTML = state.filteredAlerts.slice(0, 25).map((item) => {
      const attack = attackById.get(item.id);
      const level = riskLabel(item.risk_score);
      const classes = ["feed-item", state.selectedAlertId === item.id ? "active" : "", item._isNew ? "new" : "", item._shake ? "shake" : "", level === "CRITICAL" ? "critical" : ""].filter(Boolean).join(" ");
      return `
        <article class="${classes}" data-alert-id="${item.id}">
          <div class="feed-top">
            <strong>${item.src_ip}</strong>
            <span class="feed-risk ${level.toLowerCase()}">${level} ${item.risk_score}</span>
          </div>
          <div>${formatAttackType(item.attack_type)}</div>
          <div class="feed-meta">
            <span>${attack?.country || "Unknown"}</span>
            <span>${new Date(item.created_at).toLocaleString()}</span>
          </div>
        </article>
      `;
    }).join("");
    container.querySelectorAll(".feed-item").forEach((node) => {
      node.addEventListener("click", () => selectAlert(Number(node.dataset.alertId)));
    });
  }

  function showToasts(newAttacks) {
    if (!window.SentinelAnimations?.showToast) return;
    newAttacks.filter((item) => item.risk_score >= 90).slice(0, 2).forEach((item) => {
      window.SentinelAnimations.showToast({
        title: "Critical attack detected",
        message: `${item.attack_type} from ${item.country} (${item.ip}) scored ${item.risk_score}.`,
      });
    });
  }

  function markNewAlerts(newAttacks) {
    const keys = new Set(newAttacks.map((item) => `${item.ip}-${item.timestamp}`));
    state.alerts = state.alerts.map((alert) => {
      const key = `${alert.src_ip}-${new Date(alert.created_at).toISOString()}`;
      return {
        ...alert,
        _isNew: keys.has(key),
        _shake: keys.has(key) && riskLabel(alert.risk_score) === "CRITICAL",
      };
    });
    window.setTimeout(() => {
      state.alerts = state.alerts.map((alert) => ({ ...alert, _isNew: false, _shake: false }));
      applyFilters();
      renderFeed();
    }, 1500);
  }

  function collectNewAttacks() {
    const fresh = [];
    state.attacks.forEach((attack) => {
      const key = `${attack.ip}-${attack.timestamp}`;
      if (!state.seenAttackKeys.has(key)) {
        state.seenAttackKeys.add(key);
        fresh.push(attack);
      }
    });
    return fresh;
  }

  async function fetchJson(path) {
    const response = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Request failed: ${path}`);
    return response.json();
  }

  async function selectAlert(alertId) {
    if (!alertId) return;
    state.selectedAlertId = alertId;
    renderFeed();
    const container = document.getElementById("investigationContent");
    if (!container) return;
    container.innerHTML = '<div class="empty-state">Loading investigation report...</div>';
    try {
      const report = await fetchJson(`/investigation/${alertId}`);
      container.innerHTML = `
        <section class="summary-grid">
          <dl class="summary-list">
            <div><dt>Attack Type</dt><dd>${report.attack_type}</dd></div>
            <div><dt>Source IP</dt><dd>${report.source_ip}</dd></div>
            <div><dt>Country</dt><dd>${report.country}</dd></div>
            <div><dt>Risk Score</dt><dd>${report.risk_score}</dd></div>
          </dl>
          <div class="response-status">
            <div><strong>Automated Response</strong><p>${report.response_status.blocked ? "Blocked IP and incident logged." : "Monitoring only."}</p></div>
            <div><strong>Status Detail</strong><p>${report.response_status.reason}</p></div>
          </div>
        </section>
        <section>
          <p class="eyebrow">Attack Summary</p>
          <div class="timeline-summary">${report.summary.details}</div>
        </section>
        <section>
          <p class="eyebrow">Threat Analysis</p>
          <ul class="analysis-list">${report.analysis.map((item) => `<li>${item}</li>`).join("")}</ul>
        </section>
        <section>
          <p class="eyebrow">Recommended Actions</p>
          <ul class="action-list">${report.recommended_actions.map((item) => `<li>${item}</li>`).join("")}</ul>
        </section>
      `;
    } catch (error) {
      container.innerHTML = '<div class="empty-state">Investigation report unavailable.</div>';
    }
  }

  function emitData(newAttacks) {
    bus.dispatchEvent(new CustomEvent("data", {
      detail: {
        alerts: state.alerts,
        attacks: state.attacks,
        filteredAlerts: state.filteredAlerts,
        filteredAttacks: filteredAttackMap(),
        responses: state.responses,
        server: SERVER,
      },
    }));
    if (newAttacks.length) {
      bus.dispatchEvent(new CustomEvent("new-attacks", { detail: newAttacks }));
    }
  }

  async function refreshData() {
    try {
      const [alertsResp, attacksResp, responsesResp] = await Promise.all([
        fetchJson("/alerts?limit=500"),
        fetchJson("/api/attacks?limit=200"),
        fetchJson("/responses?limit=100"),
      ]);
      state.alerts = (alertsResp.items || []).map((item) => ({ ...item, _isNew: false, _shake: false }));
      state.attacks = Array.isArray(attacksResp) ? attacksResp : [];
      state.responses = responsesResp.items || [];
      const freshAttacks = collectNewAttacks();
      markNewAlerts(freshAttacks);
      updateAttackFilterOptions();
      applyFilters();
      updateTopbar();
      updateStatCards();
      updateGauge();
      renderFeed();
      renderResponses();
      emitData(freshAttacks);
      showToasts(freshAttacks);
      if (!state.selectedAlertId && state.filteredAlerts.length) {
        selectAlert(state.filteredAlerts[0].id);
      } else if (state.selectedAlertId && !state.filteredAlerts.some((item) => item.id === state.selectedAlertId) && state.filteredAlerts.length) {
        selectAlert(state.filteredAlerts[0].id);
      }
    } catch (error) {
      console.error("Dashboard refresh failed", error);
    }
  }

  function handleFilterChange() {
    applyFilters();
    updateTopbar();
    updateStatCards();
    updateGauge();
    renderFeed();
    emitData([]);
  }

  function bindFilters() {
    document.getElementById("riskFilter")?.addEventListener("change", handleFilterChange);
    document.getElementById("attackFilter")?.addEventListener("change", handleFilterChange);
    document.getElementById("ipFilter")?.addEventListener("input", handleFilterChange);
    document.getElementById("clearFilters")?.addEventListener("click", () => {
      document.getElementById("riskFilter").value = "ALL";
      document.getElementById("attackFilter").value = "ALL";
      document.getElementById("ipFilter").value = "";
      handleFilterChange();
    });
  }

  function init() {
    window.SentinelDashboard = {
      apiBase: API_BASE,
      bus,
      state,
      server: SERVER,
      formatAttackType,
      riskLabel,
      riskClass,
    };
    bindFilters();
    updateTopbar();
    refreshData();
    window.setInterval(() => {
      const timeNode = document.getElementById("currentTime");
      if (timeNode) timeNode.textContent = nowText();
    }, 1000);
    window.setInterval(refreshData, 5000);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
