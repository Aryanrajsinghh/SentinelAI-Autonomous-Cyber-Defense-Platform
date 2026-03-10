(() => {
  let attackTypeChart;
  let countryChart;
  let riskTrendChart;

  function sharedOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 650 },
      plugins: {
        legend: { labels: { color: "#e8f2ff" } },
      },
      scales: {
        x: {
          ticks: { color: "#8ba0be" },
          grid: { color: "rgba(139, 160, 190, 0.08)" },
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#8ba0be" },
          grid: { color: "rgba(139, 160, 190, 0.08)" },
        },
      },
    };
  }

  function countBy(items, key) {
    const counts = new Map();
    items.forEach((item) => counts.set(item[key] || "Unknown", (counts.get(item[key] || "Unknown") || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }

  function initCharts() {
    const typeCtx = document.getElementById("attackTypeChart");
    const countryCtx = document.getElementById("countryChart");
    const trendCtx = document.getElementById("riskTrendChart");
    if (!typeCtx || !countryCtx || !trendCtx || typeof Chart === "undefined") return;

    attackTypeChart = new Chart(typeCtx, {
      type: "doughnut",
      data: { labels: [], datasets: [{ data: [], backgroundColor: ["#35d9ff", "#3b82f6", "#ff9a3d", "#ff4d5e", "#23d18b"] }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "64%",
        radius: "82%",
        animation: { duration: 650 },
        plugins: { legend: { labels: { color: "#e8f2ff" } } },
      },
    });

    countryChart = new Chart(countryCtx, {
      type: "bar",
      data: { labels: [], datasets: [{ label: "Attacks", data: [], backgroundColor: "rgba(53, 217, 255, 0.4)", borderColor: "#35d9ff", borderWidth: 1.2 }] },
      options: sharedOptions(),
    });

    riskTrendChart = new Chart(trendCtx, {
      type: "line",
      data: { labels: [], datasets: [{ label: "Risk Score", data: [], borderColor: "#ff4d5e", backgroundColor: "rgba(255, 77, 94, 0.14)", fill: true, tension: 0.35 }] },
      options: sharedOptions(),
    });

    const app = window.SentinelDashboard;
    app.bus.addEventListener("data", (event) => {
      const alerts = event.detail.filteredAlerts || [];
      const attacks = event.detail.filteredAttacks?.length ? event.detail.filteredAttacks : event.detail.attacks || [];

      const typeCounts = countBy(alerts, "attack_type").slice(0, 5);
      attackTypeChart.data.labels = typeCounts.map(([label]) => app.formatAttackType(label));
      attackTypeChart.data.datasets[0].data = typeCounts.map(([, count]) => count);
      attackTypeChart.update();

      const countryCounts = countBy(attacks, "country").slice(0, 6);
      countryChart.data.labels = countryCounts.map(([label]) => label);
      countryChart.data.datasets[0].data = countryCounts.map(([, count]) => count);
      countryChart.update();

      const trend = alerts.slice(0, 12).reverse();
      riskTrendChart.data.labels = trend.map((item) => new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      riskTrendChart.data.datasets[0].data = trend.map((item) => item.risk_score);
      riskTrendChart.update();
    });
  }

  document.addEventListener("DOMContentLoaded", initCharts);
})();
