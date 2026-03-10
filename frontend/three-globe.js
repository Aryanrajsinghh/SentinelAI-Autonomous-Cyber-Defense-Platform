(() => {
  function latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
  }

  function createEarthTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#041323");
    gradient.addColorStop(0.5, "#0a2f4c");
    gradient.addColorStop(1, "#041323");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(56, 189, 248, 0.18)";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 128) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 128) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    const shapes = [
      [[170, 210], [350, 160], [420, 260], [330, 360], [220, 320]],
      [[520, 190], [760, 160], [860, 260], [820, 360], [640, 330], [540, 260]],
      [[980, 180], [1200, 220], [1280, 360], [1180, 480], [980, 420], [920, 300]],
      [[1360, 160], [1510, 120], [1680, 240], [1600, 360], [1420, 340]],
      [[1480, 520], [1640, 540], [1700, 680], [1560, 760], [1440, 690]],
    ];

    ctx.fillStyle = "rgba(110, 255, 218, 0.42)";
    ctx.strokeStyle = "rgba(56, 189, 248, 0.45)";
    ctx.lineWidth = 3;
    for (const polygon of shapes) {
      ctx.beginPath();
      polygon.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point[0], point[1]);
        else ctx.lineTo(point[0], point[1]);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    for (let i = 0; i < 180; i += 1) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const alpha = 0.03 + Math.random() * 0.08;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(x, y, 2, 2);
    }

    return new THREE.CanvasTexture(canvas);
  }

  function riskColor(score) {
    if (score >= 90) return 0xff4d6d;
    if (score >= 70) return 0xff9f43;
    return 0x38bdf8;
  }

  function initGlobe() {
    const app = window.SentinelDashboard;
    const container = document.getElementById("globe-container");
    if (!app || !container || typeof THREE === "undefined") return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 13);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const texture = createEarthTexture();
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(4, 64, 64),
      new THREE.MeshPhongMaterial({ map: texture, emissive: 0x0b4f73, emissiveIntensity: 0.32, shininess: 14 })
    );
    globeGroup.add(globe);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(4.25, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.12, side: THREE.BackSide })
    );
    globeGroup.add(atmosphere);

    const grid = new THREE.Mesh(
      new THREE.SphereGeometry(4.08, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.08 })
    );
    globeGroup.add(grid);

    scene.add(new THREE.AmbientLight(0x6fbfff, 0.7));
    const light = new THREE.DirectionalLight(0xffffff, 1.2);
    light.position.set(12, 7, 12);
    scene.add(light);

    const arcGroup = new THREE.Group();
    const heatGroup = new THREE.Group();
    scene.add(arcGroup);
    scene.add(heatGroup);

    let heatEnabled = true;
    const activeArcKeys = new Set();
    const heatSprites = new Map();

    function clearHeat() {
      heatGroup.children.slice().forEach((child) => heatGroup.remove(child));
      heatSprites.clear();
    }

    function renderHeat(attacks) {
      clearHeat();
      if (!heatEnabled) return;
      const counts = new Map();
      for (const attack of attacks) {
        const key = `${attack.lat.toFixed(2)}:${attack.lon.toFixed(2)}`;
        const current = counts.get(key) || { lat: attack.lat, lon: attack.lon, weight: 0 };
        current.weight += attack.risk_score / 100;
        counts.set(key, current);
      }
      counts.forEach((point) => {
        const spriteMaterial = new THREE.SpriteMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: Math.min(0.8, 0.15 + point.weight / 8),
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.copy(latLonToVector3(point.lat, point.lon, 4.15));
        const scale = Math.min(1.6, 0.3 + point.weight * 0.16);
        sprite.scale.set(scale, scale, scale);
        heatGroup.add(sprite);
      });
    }

    function createArc(attack) {
      const key = `${attack.ip}-${attack.timestamp}`;
      if (activeArcKeys.has(key)) return;
      activeArcKeys.add(key);

      const start = latLonToVector3(attack.lat, attack.lon, 4.04);
      const end = latLonToVector3(app.server.lat, app.server.lon, 4.04);
      const control = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(6.3);
      const curve = new THREE.QuadraticBezierCurve3(start, control, end);
      const points = curve.getPoints(72);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ color: riskColor(attack.risk_score), transparent: true, opacity: 0.8 });
      const line = new THREE.Line(geometry, material);
      arcGroup.add(line);

      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 10, 10),
        new THREE.MeshBasicMaterial({ color: riskColor(attack.risk_score) })
      );
      scene.add(particle);

      let progress = 0;
      const life = { value: 1 };
      const animateParticle = () => {
        if (life.value <= 0) return;
        progress += 0.012;
        const point = curve.getPoint(Math.min(progress, 1));
        particle.position.copy(point);
        material.opacity = Math.max(0.15, 1 - progress * 0.85);
        if (progress < 1) {
          requestAnimationFrame(animateParticle);
        } else {
          life.value = 0;
          scene.remove(particle);
          arcGroup.remove(line);
          activeArcKeys.delete(key);
        }
      };
      animateParticle();
    }

    function renderData(detail) {
      renderHeat(detail.attacks || []);
    }

    function handleNew(detail) {
      detail.forEach(createArc);
    }

    const heatButton = document.getElementById("toggleHeatmap");
    heatButton?.addEventListener("click", () => {
      heatEnabled = !heatEnabled;
      heatButton.textContent = heatEnabled ? "Heatmap On" : "Heatmap Off";
      renderHeat(app.state.attacks || []);
    });

    app.bus.addEventListener("data", (event) => renderData(event.detail));
    app.bus.addEventListener("new-attacks", (event) => handleNew(event.detail));

    function resize() {
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }

    window.addEventListener("resize", resize);

    function animate() {
      requestAnimationFrame(animate);
      globeGroup.rotation.y += 0.0014;
      globeGroup.rotation.x = Math.sin(Date.now() * 0.00015) * 0.04;
      renderer.render(scene, camera);
    }

    animate();
  }

  document.addEventListener("DOMContentLoaded", initGlobe);
})();
