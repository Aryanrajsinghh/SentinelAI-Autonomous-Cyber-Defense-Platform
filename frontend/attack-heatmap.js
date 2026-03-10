(() => {
  let heatLayer;
  let enabled = false;

  function updateHeatmap(items) {
    if (!window.sentinelAttackMap || typeof L === "undefined" || typeof L.heatLayer !== "function") return;
    if (!heatLayer) {
      heatLayer = L.heatLayer([], {
        radius: 32,
        blur: 20,
        maxZoom: 4,
        gradient: {
          0.2: "#22c55e",
          0.5: "#f59e0b",
          0.8: "#ef4444",
        },
      });
    }
    const points = items.map((item) => [item.lat, item.lon, Math.max(0.15, item.risk_score / 100)]);
    heatLayer.setLatLngs(points);
    if (enabled && !window.sentinelAttackMap.hasLayer(heatLayer)) {
      heatLayer.addTo(window.sentinelAttackMap);
    }
  }

  function bindToggle() {
    const button = document.getElementById("toggleHeatmap");
    if (!button) return;
    button.addEventListener("click", () => {
      enabled = !enabled;
      button.textContent = enabled ? "Hide Heatmap" : "Show Heatmap";
      if (!heatLayer || !window.sentinelAttackMap) return;
      if (enabled) {
        heatLayer.addTo(window.sentinelAttackMap);
      } else {
        window.sentinelAttackMap.removeLayer(heatLayer);
      }
    });
  }

  window.addEventListener("sentinel:attacks-updated", (event) => {
    updateHeatmap(event.detail || []);
  });

  document.addEventListener("DOMContentLoaded", bindToggle);
})();
