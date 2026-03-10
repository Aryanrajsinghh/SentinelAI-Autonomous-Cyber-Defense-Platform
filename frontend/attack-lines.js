(() => {
  const SERVER_LAT = 28.6139;
  const SERVER_LON = 77.209;
  const activeLines = new Map();
  let layer;

  function lineColor(score) {
    if (score > 80) return "#ef4444";
    if (score >= 50) return "#f59e0b";
    return "#22c55e";
  }

  function ensureLayer() {
    if (!window.sentinelAttackMap || typeof L === "undefined") return null;
    if (!layer) {
      layer = L.layerGroup().addTo(window.sentinelAttackMap);
      L.circleMarker([SERVER_LAT, SERVER_LON], {
        radius: 7,
        color: "#38bdf8",
        fillColor: "#38bdf8",
        fillOpacity: 0.9,
      }).bindPopup("Protected Server: New Delhi").addTo(layer);
    }
    return layer;
  }

  function animateLine(attack) {
    const mapLayer = ensureLayer();
    if (!mapLayer) return;
    const key = `${attack.ip}-${attack.timestamp}`;
    if (activeLines.has(key)) return;

    const polyline = L.polyline(
      [
        [attack.lat, attack.lon],
        [SERVER_LAT, SERVER_LON],
      ],
      {
        color: lineColor(attack.risk_score),
        weight: 2.5,
        opacity: 0.9,
        dashArray: "10 12",
        dashOffset: "0",
      }
    ).addTo(mapLayer);

    let offset = 0;
    const timer = setInterval(() => {
      offset -= 1;
      polyline.setStyle({ dashOffset: `${offset}` });
    }, 120);

    const cleanup = setTimeout(() => {
      clearInterval(timer);
      mapLayer.removeLayer(polyline);
      activeLines.delete(key);
    }, 5000);

    activeLines.set(key, { timer, cleanup });
  }

  window.addEventListener("sentinel:attacks-updated", (event) => {
    const items = event.detail || [];
    const latest = items.slice(0, 8);
    latest.forEach(animateLine);
  });
})();
