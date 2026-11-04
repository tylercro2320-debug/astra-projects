/* The DreamCorp logo in Three.js: a lilac film reel (extruded, with five
   sprocket holes) and a crescent moon in front of it with a marigold spark.

   Motion: on load the reel spins in and turns to face you; after that it keeps
   turning slowly like a projector running, and a hover or tap spins it up.
   Reduced motion skips the intro and the spin-up but keeps the slow turn.

   Cost: one tiny canvas, two lights, no shadows. The loop stops when the logo
   is off screen or the tab is hidden. */

import type * as THREE_NS from "three";

type Three = typeof THREE_NS;

function crescentPoints(THREE: Three, r = 0.5, cx = 0.2, cy = 0.13, ri = 0.44) {
  const outer: THREE_NS.Vector2[] = [];
  const inner: THREE_NS.Vector2[] = [];
  const N = 120;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const p = new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r);
    if (Math.hypot(p.x - cx, p.y - cy) > ri) outer.push(p);
  }
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const p = new THREE.Vector2(cx + Math.cos(a) * ri, cy + Math.sin(a) * ri);
    if (Math.hypot(p.x, p.y) < r) inner.push(p);
  }
  // Rotate each arc so it starts right after its gap, then join outer + reversed inner.
  const rotate = (arr: THREE_NS.Vector2[], gapTest: (a: THREE_NS.Vector2, b: THREE_NS.Vector2) => boolean) => {
    let cut = 0;
    for (let i = 1; i < arr.length; i++) if (gapTest(arr[i - 1]!, arr[i]!)) cut = i;
    return [...arr.slice(cut), ...arr.slice(0, cut)];
  };
  const far = (a: THREE_NS.Vector2, b: THREE_NS.Vector2) => a.distanceTo(b) > 0.08;
  const o = rotate(outer, far);
  const n = rotate(inner, far).reverse();
  return [...o, ...n];
}

export function mountLogo3D(THREE: Three, canvas: HTMLCanvasElement, options: { intro: boolean }) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, 5.2);

  const key = new THREE.DirectionalLight(0xffe2b0, 3);
  key.position.set(2, 3, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xb9a8ff, 2);
  rim.position.set(-3, -1, 2);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xd9d0ff, 0x15113a, 0.8));

  // Reel: a disc with a hub hole and five sprocket holes, extruded with a bevel.
  const reelShape = new THREE.Shape();
  reelShape.absarc(0, 0, 1, 0, Math.PI * 2, false);
  const hub = new THREE.Path();
  hub.absarc(0, 0, 0.16, 0, Math.PI * 2, true);
  reelShape.holes.push(hub);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + Math.PI / 2;
    const hole = new THREE.Path();
    hole.absarc(Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0.22, 0, Math.PI * 2, true);
    reelShape.holes.push(hole);
  }
  const reelGeo = new THREE.ExtrudeGeometry(reelShape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 3,
    curveSegments: 40,
  });
  reelGeo.center();
  const reelMat = new THREE.MeshStandardMaterial({ color: 0x9d8af0, metalness: 0.7, roughness: 0.32 });
  const reel = new THREE.Mesh(reelGeo, reelMat);

  // Crescent moon, in front of the reel.
  const moonShape = new THREE.Shape(crescentPoints(THREE));
  const moonGeo = new THREE.ExtrudeGeometry(moonShape, {
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.03,
    bevelSegments: 3,
  });
  moonGeo.center();
  const moonMat = new THREE.MeshStandardMaterial({
    color: 0xf7f4ff,
    emissive: 0x3a2f7a,
    emissiveIntensity: 0.35,
    metalness: 0.1,
    roughness: 0.4,
  });
  const moon = new THREE.Mesh(moonGeo, moonMat);
  moon.position.set(-0.05, 0, 0.22);
  moon.scale.setScalar(1.25);

  // Marigold spark.
  const sparkGeo = new THREE.OctahedronGeometry(0.12, 0);
  const sparkMat = new THREE.MeshStandardMaterial({ color: 0xffc857, emissive: 0xffb020, emissiveIntensity: 1.2 });
  const spark = new THREE.Mesh(sparkGeo, sparkMat);
  spark.position.set(0.42, 0.42, 0.36);

  const logo = new THREE.Group();
  logo.add(reel, moon, spark);
  scene.add(logo);

  const resize = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();

  // Motion state.
  const start = performance.now();
  const introMs = options.intro && !reduce ? 1500 : 0;
  let spinBoost = 0;
  let reelAngle = 0;
  let last = start;
  const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

  const render = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = (now - start) / 1000;
    const p = introMs ? Math.min(1, (now - start) / introMs) : 1;
    const e = easeOut(p);

    // Projector turn: slow and steady, faster while boosted.
    spinBoost *= Math.pow(0.04, dt);
    reelAngle -= dt * (reduce ? 0.35 : 0.9 + spinBoost * 9);
    reel.rotation.z = reelAngle - (1 - e) * Math.PI * 3;
    logo.rotation.y = (1 - e) * (Math.PI / 2) + (reduce ? 0 : Math.sin(t * 0.8) * 0.18);
    logo.rotation.x = reduce ? 0 : Math.sin(t * 0.6) * 0.06;
    logo.scale.setScalar(0.55 + 0.45 * e);
    spark.rotation.y = t * 2;
    spark.scale.setScalar(1 + (reduce ? 0 : Math.sin(t * 3) * 0.15));
    renderer.render(scene, camera);
  };

  let raf = 0;
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    render(now);
  };
  const play = () => {
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
  };
  const pause = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };
  render(performance.now());
  play();

  const io = new IntersectionObserver(([entry]) => (entry?.isIntersecting && !document.hidden ? play() : pause()));
  io.observe(canvas);
  const onVis = () => (document.hidden ? pause() : play());
  document.addEventListener("visibilitychange", onVis);
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  return {
    boost() {
      if (!reduce) spinBoost = 1;
    },
    dispose() {
      pause();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      [reelGeo, moonGeo, sparkGeo].forEach((g) => g.dispose());
      [reelMat, moonMat, sparkMat].forEach((m) => m.dispose());
      renderer.dispose();
    },
  };
}
