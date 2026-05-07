(function () {
  const canvas = document.getElementById("globe-canvas");
  if (!canvas) return;

  const W = canvas.offsetWidth || window.innerWidth;
  const H = canvas.offsetHeight || window.innerHeight;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 1000);
  camera.position.z = 2.8;

  const PRIMARY = 0x278acc;
  const NAVY    = 0x001e72;
  const WHITE   = 0xffffff;

  /* ── Particle Globe ── */
  const POINT_COUNT = 3000;
  const RADIUS = 1.0;
  const positions = new Float32Array(POINT_COUNT * 3);
  const colors    = new Float32Array(POINT_COUNT * 3);
  const c1 = new THREE.Color(PRIMARY);
  const c2 = new THREE.Color(WHITE);

  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < POINT_COUNT; i++) {
    const y   = 1 - (i / (POINT_COUNT - 1)) * 2;
    const r   = Math.sqrt(1 - y * y);
    const phi = golden * i;
    positions[i * 3]     = Math.cos(phi) * r * RADIUS;
    positions[i * 3 + 1] = y * RADIUS;
    positions[i * 3 + 2] = Math.sin(phi) * r * RADIUS;
    const t = i / POINT_COUNT;
    const mix = new THREE.Color().lerpColors(c1, c2, t * 0.4);
    colors[i * 3]     = mix.r;
    colors[i * 3 + 1] = mix.g;
    colors[i * 3 + 2] = mix.b;
  }

  const dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  dotGeo.setAttribute("color",    new THREE.BufferAttribute(colors, 3));
  const dotMat = new THREE.PointsMaterial({
    size: 0.012,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
  });
  const globe = new THREE.Points(dotGeo, dotMat);
  scene.add(globe);

  /* ── Orbiting Arcs (favicon loader shape) ── */
  // Each arc is ~21% of a full circle, matching the favicon stroke-dasharray proportion
  function makeArc(radius, tube, tilt, arcFraction, opacity) {
    const arcAngle = Math.PI * 2 * arcFraction;
    const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, arcAngle, false, 0);
    const pts   = curve.getPoints(100);
    const path  = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p.x, p.y, 0)));
    const geo   = new THREE.TubeGeometry(path, 100, tube, 10, false);
    const mat   = new THREE.MeshBasicMaterial({ color: PRIMARY, transparent: true, opacity });
    const mesh  = new THREE.Mesh(geo, mat);
    mesh.rotation.x = tilt;
    return mesh;
  }

  const ring1 = makeArc(1.25, 0.0055, Math.PI / 2,   0.21, 0.85);
  const ring2 = makeArc(1.38, 0.004,  Math.PI / 6,   0.21, 0.55);
  const ring3 = makeArc(1.15, 0.004,  -Math.PI / 4,  0.21, 0.65);
  scene.add(ring1, ring2, ring3);

  /* ── Ambient glow ── */
  const ambient = new THREE.AmbientLight(0x334466, 2.5);
  scene.add(ambient);

  /* ── Mouse drag rotation ── */
  let isDragging = false;
  let prevMouse  = { x: 0, y: 0 };
  let rotX = 0, rotY = 0;
  let velX = 0, velY = 0;

  canvas.addEventListener("mousedown",  e => { isDragging = true; prevMouse = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener("touchstart", e => { isDragging = true; prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
  window.addEventListener("mouseup",  () => { isDragging = false; });
  window.addEventListener("touchend", () => { isDragging = false; });

  window.addEventListener("mousemove", e => {
    if (!isDragging) return;
    velY = (e.clientX - prevMouse.x) * 0.004;
    velX = (e.clientY - prevMouse.y) * 0.004;
    prevMouse = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener("touchmove", e => {
    if (!isDragging) return;
    velY = (e.touches[0].clientX - prevMouse.x) * 0.004;
    velX = (e.touches[0].clientY - prevMouse.y) * 0.004;
    prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });

  /* ── Resize ── */
  window.addEventListener("resize", () => {
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });

  /* ── Animation loop ── */
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    if (!isDragging) {
      velX *= 0.92;
      velY *= 0.92;
      globe.rotation.y += 0.0015 + velY;
      globe.rotation.x += velX;
    } else {
      globe.rotation.y += velY;
      globe.rotation.x += velX;
      velX *= 0.8;
      velY *= 0.8;
    }

    ring1.rotation.z = t * 0.55;
    ring2.rotation.z = -t * 0.38;
    ring3.rotation.y = t * 0.65;

    renderer.render(scene, camera);
  }
  animate();
})();
