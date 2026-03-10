(() => {
  const SERVER = [28.6139, 77.2090];
  let map;
  let markerLayer;
  let liveArcLayer;
  let replayLayer;
  let activeAnimations = [];

  function markerColor(score) {
    if (score >= 90) return "#ff4d5e";
    if (score >= 50) return "#ff9a3d";
    return "#35d9ff";
  }

  function buildMarker(score) {
    const color = markerColor(score);
    return L.divIcon({
      className: "sentinel-marker-shell",
      html: `<span class="sentinel-marker" style="color:${color};background:${color}"></span>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
  }

  function popupHtml(attack) {
    return `
      <div class="map-popup">
        <div><strong>IP:</strong> ${attack.ip}</div>
        <div><strong>Attack:</strong> ${attack.attack_type}</div>
        <div><strong>Risk Score:</strong> ${attack.risk_score}</div>
        <div><strong>Country:</strong> ${attack.country}</div>
        <div><strong>Timestamp:</strong> ${new Date(attack.timestamp).toLocaleString()}</div>
      </div>
    `;
  }

  function interpolate(start, end, progress) {
    return [start[0] + (end[0] - start[0]) * progress, start[1] + (end[1] - start[1]) * progress];
  }

  function stopAnimations() {
    activeAnimations.forEach((cancel) => cancel());
    activeAnimations = [];
  }

  function animateBeam(start, end, color, targetLayer, duration = 2200) {
    const path = L.polyline([start, end], {
      color,
      weight: 2,
      opacity: 0.55,
      dashArray: "8 10",
    }).addTo(targetLayer);
    const pulse = L.circleMarker(start, {
      radius: 5,
      color,
      weight: 1,
      fillColor: color,
      fillOpacity: 1,
      opacity: 0.9,
    }).addTo(targetLayer);
    const startTime = performance.now();
    let frameId = 0;
    let cancelled = false;

    function step(now) {
      if (cancelled) return;
      const progress = Math.min(1, (now - startTime) / duration);
      const point = interpolate(start, end, progress);
      pulse.setLatLng(point);
      path.setStyle({ opacity: 0.2 + (1 - progress) * 0.5 });
      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        targetLayer.removeLayer(pulse);
        window.setTimeout(() => targetLayer.removeLayer(path), 700);
      }
    }

    frameId = requestAnimationFrame(step);
    const cancel = () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      if (targetLayer.hasLayer(path)) targetLayer.removeLayer(path);
      if (targetLayer.hasLayer(pulse)) targetLayer.removeLayer(pulse);
    };
    activeAnimations.push(cancel);
  }

  function renderMarkers(items) {
    if (!markerLayer) return;
    markerLayer.clearLayers();
    items.forEach((attack) => {
      const lat = Number(attack.lat);
      const lon = Number(attack.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
      const marker = L.marker([lat, lon], { icon: buildMarker(attack.risk_score) });
      marker.bindPopup(popupHtml(attack));
      marker.addTo(markerLayer);
    });
    L.circleMarker(SERVER, {
      radius: 7,
      color: "#23d18b",
      fillColor: "#23d18b",
      fillOpacity: 0.95,
      weight: 2,
    }).bindPopup("Protected Server - New Delhi").addTo(markerLayer);
  }

  function renderLiveArcs(items) {
    if (!liveArcLayer) return;
    liveArcLayer.clearLayers();
    items.slice(0, 20).forEach((attack) => {
      const lat = Number(attack.lat);
      const lon = Number(attack.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
      L.polyline([[lat, lon], SERVER], {
        color: markerColor(attack.risk_score),
        weight: attack.risk_score >= 90 ? 3 : 2,
        opacity: 0.18,
      }).addTo(liveArcLayer);
    });
  }

  function refreshMap(detail) {
    const attacks = detail.filteredAttacks?.length ? detail.filteredAttacks : detail.attacks || [];
    renderMarkers(attacks);
    renderLiveArcs(attacks);
    window.setTimeout(() => map?.invalidateSize(), 100);
  }

  function replayAttack(attack) {
    if (!replayLayer || !attack) return;
    replayLayer.clearLayers();
    const lat = Number(attack.lat);
    const lon = Number(attack.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    const marker = L.marker([lat, lon], { icon: buildMarker(attack.risk_score) }).addTo(replayLayer);
    marker.bindPopup(popupHtml(attack));
    animateBeam([lat, lon], SERVER, markerColor(attack.risk_score), replayLayer, 1800);
  }

  function initMap() {
    const node = document.getElementById("attack-map");
    if (!node || typeof L === "undefined") return;
    map = L.map(node, { zoomControl: true, worldCopyJump: true, preferCanvas: true }).setView([20, 0], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);
    markerLayer = L.layerGroup().addTo(map);
    liveArcLayer = L.layerGroup().addTo(map);
    replayLayer = L.layerGroup().addTo(map);
    window.addEventListener("resize", () => map.invalidateSize());
    window.addEventListener("sentinel:layout-change", () => map.invalidateSize());
    map.whenReady(() => map.invalidateSize());
  }

  function bindDashboardBus() {
    const app = window.SentinelDashboard;
    if (!app) return;
    app.bus.addEventListener("data", (event) => refreshMap(event.detail));
    app.bus.addEventListener("new-attacks", (event) => {
      event.detail.slice(0, 3).forEach((attack) => {
        animateBeam([attack.lat, attack.lon], SERVER, markerColor(attack.risk_score), replayLayer, 2400);
      });
    });
    app.bus.addEventListener("timeline-frame", (event) => replayAttack(event.detail.attack));
  }

  function init() {
    initMap();
    bindDashboardBus();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
