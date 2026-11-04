"use client";

import { useEffect, useRef } from "react";

/* The footer's Three.js scene: a cratered moon with a slow ring of film frames
   orbiting it, over a field of stars. Imperative Three.js (no React Three
   Fiber) keeps it to one small lazy chunk.

   Budget: Three.js is only imported once the footer is near the viewport.
   Two lights, no shadows, DPR capped at 1.5, the loop stops off screen and in
   hidden tabs, and reduced motion renders a single frame. Everything is
   disposed on unmount. */

export function FooterScene() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let dispose = () => {};
    let started = false;

    const boot = async () => {
      started = true;
      const THREE = await import("three");
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
      camera.position.set(0, 0.4, 9);

      // Lights: warm marigold key from the upper right, lilac/indigo sky fill.
      const key = new THREE.DirectionalLight(0xffd38a, 2.6);
      key.position.set(4, 3, 5);
      scene.add(key);
      scene.add(new THREE.HemisphereLight(0xb9a8ff, 0x15113a, 0.7));

      // Moon: crater texture painted once on a canvas.
      const tex = (() => {
        const c = document.createElement("canvas");
        c.width = 512;
        c.height = 256;
        const g = c.getContext("2d")!;
        g.fillStyle = "#cfc8ee";
        g.fillRect(0, 0, 512, 256);
        let seed = 7;
        const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
        for (let i = 0; i < 260; i++) {
          const x = rnd() * 512, y = rnd() * 256, r = 2 + rnd() ** 3 * 26;
          const grad = g.createRadialGradient(x, y, r * 0.2, x, y, r);
          grad.addColorStop(0, "rgba(70,60,120,0.35)");
          grad.addColorStop(0.8, "rgba(90,80,150,0.15)");
          grad.addColorStop(1, "rgba(255,255,255,0.12)");
          g.fillStyle = grad;
          g.beginPath();
          g.arc(x, y, r, 0, Math.PI * 2);
          g.fill();
        }
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        return t;
      })();
      const moonGeo = new THREE.SphereGeometry(1.6, 64, 32);
      const moonMat = new THREE.MeshStandardMaterial({ map: tex, bumpMap: tex, bumpScale: 0.04, roughness: 0.95, metalness: 0 });
      const moon = new THREE.Mesh(moonGeo, moonMat);
      scene.add(moon);

      // Ring of film frames: one shared geometry, two shared materials.
      const ring = new THREE.Group();
      const frameGeo = new THREE.PlaneGeometry(0.62, 0.42);
      const edgeGeo = new THREE.EdgesGeometry(frameGeo);
      const fillMats = [
        new THREE.MeshBasicMaterial({ color: 0xffc857, transparent: true, opacity: 0.18, side: THREE.DoubleSide }),
        new THREE.MeshBasicMaterial({ color: 0xb9a8ff, transparent: true, opacity: 0.16, side: THREE.DoubleSide }),
      ];
      const edgeMat = new THREE.LineBasicMaterial({ color: 0xffe2a8, transparent: true, opacity: 0.7 });
      const COUNT = 14;
      for (let i = 0; i < COUNT; i++) {
        const a = (i / COUNT) * Math.PI * 2;
        const frame = new THREE.Group();
        frame.add(new THREE.Mesh(frameGeo, fillMats[i % 2]!));
        frame.add(new THREE.LineSegments(edgeGeo, edgeMat));
        frame.position.set(Math.cos(a) * 2.9, Math.sin(a * 2) * 0.18, Math.sin(a) * 2.9);
        frame.lookAt(0, 0, 0);
        ring.add(frame);
      }
      ring.rotation.x = 0.32;
      ring.rotation.z = -0.12;
      scene.add(ring);

      // Stars.
      const starCount = 900;
      const pos = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 40;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 18;
        pos[i * 3 + 2] = -6 - Math.random() * 20;
      }
      const starGeo = new THREE.BufferGeometry();
      starGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const starMat = new THREE.PointsMaterial({ color: 0xf6f3ff, size: 0.05, sizeAttenuation: true, transparent: true, opacity: 0.85 });
      scene.add(new THREE.Points(starGeo, starMat));

      const pointer = { x: 0, y: 0 };
      const onPointer = (e: PointerEvent) => {
        const r = host.getBoundingClientRect();
        pointer.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
        pointer.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
      };
      host.addEventListener("pointermove", onPointer);

      const target = new THREE.Vector3();
      // Desktop: moon low and right, clear of the links. Phone: its own block, centered.
      const aim = () => (camera.aspect < 1.4 ? target.set(0, 0, 0) : target.set(-2.6, 1.6, 0));
      const resize = () => {
        const w = host.clientWidth, h = host.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / Math.max(1, h);
        // Keep the whole ring in frame on narrow screens.
        camera.position.z = camera.aspect < 1.4 ? 11 : 9;
        camera.updateProjectionMatrix();
        aim();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(host);

      const clock = new THREE.Clock();
      let raf = 0;
      const frame = () => {
        const t = clock.getElapsedTime();
        // Reduced motion keeps the slow turn but drops the parallax.
        moon.rotation.y = t * (reduce ? 0.03 : 0.06);
        ring.rotation.y = t * (reduce ? 0.05 : 0.12);
        if (!reduce) {
          camera.position.x += (pointer.x * 0.6 - camera.position.x) * 0.04;
          camera.position.y += (0.4 - pointer.y * 0.3 - camera.position.y) * 0.04;
        }
        // Aim above and left of the moon so it sits low and right, clear of the footer links.
        camera.lookAt(target);
        renderer.render(scene, camera);
      };
      const loop = () => {
        raf = requestAnimationFrame(loop);
        frame();
      };
      const play = () => {
        if (!raf) raf = requestAnimationFrame(loop);
      };
      const pause = () => {
        cancelAnimationFrame(raf);
        raf = 0;
      };
      frame();

      const io = new IntersectionObserver(([entry]) => (entry?.isIntersecting && !document.hidden ? play() : pause()));
      io.observe(host);
      const onVis = () => (document.hidden ? pause() : play());
      document.addEventListener("visibilitychange", onVis);

      dispose = () => {
        pause();
        io.disconnect();
        ro.disconnect();
        document.removeEventListener("visibilitychange", onVis);
        host.removeEventListener("pointermove", onPointer);
        [moonGeo, frameGeo, edgeGeo, starGeo].forEach((g) => g.dispose());
        [moonMat, edgeMat, starMat, ...fillMats].forEach((m) => m.dispose());
        tex.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    };

    // Load Three.js only when the footer is about to scroll into view.
    const near = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !started) {
          near.disconnect();
          void boot();
        }
      },
      { rootMargin: "400px 0px" },
    );
    near.observe(host);
    return () => {
      near.disconnect();
      dispose();
    };
  }, []);

  return <div ref={hostRef} className="dc-footer-scene" aria-hidden />;
}
