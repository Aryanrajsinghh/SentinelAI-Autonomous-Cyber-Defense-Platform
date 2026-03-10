(() => {
  function initTimelineControls() {
    const app = window.SentinelDashboard;
    if (!app) return;
    const play = document.getElementById("timelinePlay");
    const pause = document.getElementById("timelinePause");
    const speed = document.getElementById("timelineSpeed");
    const slider = document.getElementById("timelineSlider");
    play?.addEventListener("click", () => app.bus.dispatchEvent(new CustomEvent("timeline:command", { detail: { type: "play" } })));
    pause?.addEventListener("click", () => app.bus.dispatchEvent(new CustomEvent("timeline:command", { detail: { type: "pause" } })));
    speed?.addEventListener("change", () => app.bus.dispatchEvent(new CustomEvent("timeline:command", { detail: { type: "speed", value: Number(speed.value) || 1 } })));
    slider?.addEventListener("input", () => app.bus.dispatchEvent(new CustomEvent("timeline:command", { detail: { type: "seek", value: Number(slider.value) || 0 } })));
  }

  document.addEventListener("DOMContentLoaded", initTimelineControls);
})();
