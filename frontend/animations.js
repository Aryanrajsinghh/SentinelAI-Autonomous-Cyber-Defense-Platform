(() => {
  const counterFrames = new Map();

  function animateCounter(id, target) {
    const node = document.getElementById(id);
    if (!node) return;
    const start = Number(node.textContent.replace(/[^\d.-]/g, "")) || 0;
    const duration = 700;
    const startTime = performance.now();
    const frame = counterFrames.get(id);
    if (frame) cancelAnimationFrame(frame);

    function step(now) {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = String(Math.round(start + (target - start) * eased));
      if (progress < 1) {
        counterFrames.set(id, requestAnimationFrame(step));
      }
    }

    counterFrames.set(id, requestAnimationFrame(step));
  }

  function setGauge(value, label) {
    const needle = document.getElementById("riskGaugeNeedle");
    const valueNode = document.getElementById("riskGaugeValue");
    const labelNode = document.getElementById("riskGaugeLabel");
    const normalized = Math.max(0, Math.min(100, value));
    const angle = -120 + (normalized / 100) * 240;
    if (needle) needle.style.transform = `rotate(${angle}deg)`;
    if (valueNode) valueNode.textContent = String(Math.round(normalized));
    if (labelNode) labelNode.textContent = label;
  }

  function showToast({ title, message }) {
    const stack = document.getElementById("toastStack");
    if (!stack) return;
    const toast = document.createElement("article");
    toast.className = "toast";
    toast.innerHTML = `<strong>${title}</strong><span>${message}</span>`;
    stack.appendChild(toast);
    window.setTimeout(() => toast.remove(), 4600);
  }

  function revealCards() {
    const cards = [...document.querySelectorAll(".reveal")];
    cards.forEach((card, index) => {
      window.setTimeout(() => card.classList.add("visible"), 80 * index);
    });
  }

  function drawBackgroundGrid() {
    const canvas = document.getElementById("bg-grid");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const particles = Array.from({ length: 70 }, () => ({
      x: Math.random(),
      y: Math.random(),
      speed: 0.0006 + Math.random() * 0.0015,
      size: 1 + Math.random() * 2,
    }));

    function resize() {
      canvas.width = window.innerWidth * devicePixelRatio;
      canvas.height = window.innerHeight * devicePixelRatio;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    }

    function render() {
      requestAnimationFrame(render);
      const width = window.innerWidth;
      const height = window.innerHeight;
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.06)";
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 72) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 72) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      particles.forEach((particle) => {
        particle.y += particle.speed;
        if (particle.y > 1.05) particle.y = -0.05;
        ctx.beginPath();
        ctx.fillStyle = "rgba(56, 189, 248, 0.45)";
        ctx.arc(particle.x * width, particle.y * height, particle.size, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    resize();
    window.addEventListener("resize", resize);
    render();
  }

  function init() {
    window.SentinelAnimations = { animateCounter, setGauge, showToast };
    drawBackgroundGrid();
    revealCards();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
