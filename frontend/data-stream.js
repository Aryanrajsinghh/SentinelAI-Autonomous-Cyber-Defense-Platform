(() => {
  function initStream() {
    const app = window.SentinelDashboard;
    const canvas = document.getElementById("stream-canvas");
    if (!app || !canvas) return;
    const ctx = canvas.getContext("2d");
    const nodes = [0.12, 0.39, 0.66, 0.9];
    const particles = Array.from({ length: 32 }, (_, index) => ({ t: (index / 32) * 4, speed: 0.0028 + Math.random() * 0.0024 }));

    function resize() {
      canvas.width = canvas.clientWidth * devicePixelRatio;
      canvas.height = canvas.clientHeight * devicePixelRatio;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    }

    function draw() {
      requestAnimationFrame(draw);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.16)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width * nodes[0], height * 0.5);
      ctx.bezierCurveTo(width * 0.24, height * 0.28, width * 0.3, height * 0.72, width * nodes[1], height * 0.5);
      ctx.bezierCurveTo(width * 0.5, height * 0.28, width * 0.56, height * 0.72, width * nodes[2], height * 0.5);
      ctx.bezierCurveTo(width * 0.78, height * 0.28, width * 0.82, height * 0.72, width * nodes[3], height * 0.5);
      ctx.stroke();

      nodes.forEach((x) => {
        ctx.beginPath();
        ctx.fillStyle = "rgba(56, 189, 248, 0.9)";
        ctx.shadowBlur = 18;
        ctx.shadowColor = "rgba(56, 189, 248, 0.45)";
        ctx.arc(width * x, height * 0.5, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      particles.forEach((particle) => {
        particle.t = (particle.t + particle.speed) % 1;
        const x = width * (0.12 + particle.t * 0.78);
        const y = height * (0.5 + Math.sin((particle.t * Math.PI * 6) + Date.now() * 0.002) * 0.14);
        ctx.beginPath();
        ctx.fillStyle = particle.t > 0.68 ? "rgba(255, 77, 109, 0.9)" : "rgba(110, 231, 255, 0.9)";
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    resize();
    window.addEventListener("resize", resize);
    draw();
  }

  document.addEventListener("DOMContentLoaded", initStream);
})();
