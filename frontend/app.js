const API_BASE = "http://127.0.0.1:8000";
let chart;
let allAlerts = [];
let lastAlertsKey = "";

function riskClass(level) {
  if (!level) return "low";
  return level.toLowerCase();
}

function getFilterState() {
  return {
    risk: document.getElementById("riskFilter").value,
    attack: document.getElementById("attackFilter").value,
    ip: document.getElementById("ipFilter").value.trim().toLowerCase(),
  };
}

function applyFilters(items) {
  const f = getFilterState();
  return items.filter((item) => {
    if (f.risk !== "ALL" && item.risk_level !== f.risk) return false;
    if (f.attack !== "ALL" && item.attack_type !== f.attack) return false;
    if (f.ip && !String(item.src_ip).toLowerCase().includes(f.ip)) return false;
    return true;
  });
}

function buildAttackCounts(items) {
  const map = new Map();
  for (const item of items) {
    const k = item.attack_type || "unknown";
    map.set(k, (map.get(k) || 0) + 1);
  }
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
}

function upsertChart(labels, data) {
  const ctx = document.getElementById("threatChart");
  if (!chart) {
    chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Alert Count",
            data,
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        animation: false,
        scales: {
          y: { beginAtZero: true },
        },
      },
    });
    return;
  }
  chart.data.labels = labels;
  chart.data.datasets[0].data = data;
  chart.update("none");
}

function renderAttackFilterOptions(items) {
  const select = document.getElementById("attackFilter");
  const current = select.value;
  const unique = Array.from(new Set(items.map((x) => x.attack_type))).sort();
  const options = ["<option value=\"ALL\">All</option>"];
  for (const t of unique) {
    options.push(`<option value="${t}">${t}</option>`);
  }
  const html = options.join("");
  if (select.innerHTML !== html) {
    select.innerHTML = html;
    if (unique.includes(current)) {
      select.value = current;
    } else {
      select.value = "ALL";
    }
  }
}

function renderDashboard(items) {
  document.getElementById("totalAlerts").textContent = items.length;
  document.getElementById("highRiskAlerts").textContent = items.filter((x) => x.risk_level === "HIGH").length;

  const attackCounts = buildAttackCounts(items);
  document.getElementById("topThreat").textContent = attackCounts.length ? attackCounts[0][0] : "-";
  upsertChart(
    attackCounts.map((x) => x[0]),
    attackCounts.map((x) => x[1])
  );

  const tbody = document.getElementById("alertsBody");
  const html = items
    .map(
      (item) => `
      <tr>
        <td>${new Date(item.created_at).toLocaleString()}</td>
        <td>${item.src_ip}</td>
        <td>${item.attack_type}</td>
        <td><span class="risk ${riskClass(item.risk_level)}">${item.risk_level} (${item.risk_score})</span></td>
        <td>${item.explanation}</td>
      </tr>
    `
    )
    .join("");

  if (tbody.innerHTML !== html) {
    tbody.innerHTML = html;
  }
}

function refreshFromState() {
  renderAttackFilterOptions(allAlerts);
  const filtered = applyFilters(allAlerts);
  renderDashboard(filtered);
}

async function loadAlerts() {
  const resp = await fetch(`${API_BASE}/alerts?limit=500`, { cache: "no-store" });
  const data = await resp.json();
  const items = data.items || [];
  const key = JSON.stringify(items.map((x) => [x.id, x.attack_type, x.risk_level, x.risk_score, x.src_ip]));

  if (key !== lastAlertsKey) {
    allAlerts = items;
    lastAlertsKey = key;
    refreshFromState();
  }
}

async function refresh() {
  try {
    await loadAlerts();
  } catch (err) {
    console.error("Dashboard refresh failed:", err);
  }
}

function bindFilters() {
  document.getElementById("riskFilter").addEventListener("change", refreshFromState);
  document.getElementById("attackFilter").addEventListener("change", refreshFromState);
  document.getElementById("ipFilter").addEventListener("input", refreshFromState);
  document.getElementById("clearFilters").addEventListener("click", () => {
    document.getElementById("riskFilter").value = "ALL";
    document.getElementById("attackFilter").value = "ALL";
    document.getElementById("ipFilter").value = "";
    refreshFromState();
  });
}

bindFilters();
refresh();
setInterval(refresh, 5000);
