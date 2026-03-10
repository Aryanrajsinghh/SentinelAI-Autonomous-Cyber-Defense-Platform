(() => {
  let timeline = [];
  let index = 0;
  let playing = false;
  let speed = 1;
  let timer = null;

  function updateUi() {
    const slider = document.getElementById("timelineSlider");
    const position = document.getElementById("timelinePosition");
    const timestamp = document.getElementById("timelineTimestamp");
    const summary = document.getElementById("timelineSummary");
    if (slider) {
      slider.max = Math.max(0, timeline.length - 1);
      slider.value = String(Math.min(index, Math.max(0, timeline.length - 1)));
    }
    if (position) position.textContent = `${timeline.length ? index + 1 : 0} / ${timeline.length}`;
    const attack = timeline[index];
    if (timestamp) timestamp.textContent = attack ? new Date(attack.timestamp).toLocaleString() : "Awaiting replay data";
    if (summary) {
      summary.textContent = attack
        ? `${attack.attack_type} from ${attack.country} (${attack.ip}) is being replayed toward the protected server.`
        : "Replay will stream attack events onto the live map.";
    }
  }

  function emitFrame() {
    const app = window.SentinelDashboard;
    if (!app || !timeline[index]) return;
    app.bus.dispatchEvent(new CustomEvent("timeline-frame", { detail: { attack: timeline[index], index, total: timeline.length } }));
  }

  function stopTimer() {
    if (timer) {
      window.clearTimeout(timer);
      timer = null;
    }
  }

  function scheduleNext() {
    stopTimer();
    if (!playing || timeline.length <= 1) return;
    timer = window.setTimeout(() => {
      index = index >= timeline.length - 1 ? 0 : index + 1;
      updateUi();
      emitFrame();
      scheduleNext();
    }, Math.max(300, 1800 / speed));
  }

  function applyCommand(command) {
    if (command.type === "play") {
      playing = true;
      scheduleNext();
      return;
    }
    if (command.type === "pause") {
      playing = false;
      stopTimer();
      return;
    }
    if (command.type === "speed") {
      speed = command.value || 1;
      if (playing) scheduleNext();
      return;
    }
    if (command.type === "seek") {
      index = Math.max(0, Math.min(command.value || 0, Math.max(0, timeline.length - 1)));
      updateUi();
      emitFrame();
    }
  }

  function initTimeline() {
    const app = window.SentinelDashboard;
    if (!app) return;
    app.bus.addEventListener("data", (event) => {
      timeline = [...(event.detail.attacks || [])].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      index = Math.min(index, Math.max(0, timeline.length - 1));
      updateUi();
      if (timeline.length && !playing) emitFrame();
    });
    app.bus.addEventListener("timeline:command", (event) => applyCommand(event.detail));
  }

  document.addEventListener("DOMContentLoaded", initTimeline);
})();
