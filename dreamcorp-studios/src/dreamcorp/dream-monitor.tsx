"use client";

import { useEffect, useRef, useState } from "react";

/* The hero's "picture to moving thing" moment, drawn live in one WebGL
   fragment shader (no images to download). Each shot plays the product's own
   loop: the prompt types out, the frame renders top to bottom as a still,
   then the still starts to move, then the edit cuts to the next shot.

   Cost control: one full-screen triangle, DPR capped at 1.5, the loop pauses
   when the monitor is off screen or the tab is hidden, phones render at lower
   resolution and about 30fps, and reduced motion slows it and drops the cut flash. */

type Shot = {
  prompt: string;
  label: string;
  top: [number, number, number];
  bottom: [number, number, number];
  glow: [number, number, number];
  moon: [number, number];
  water: number;
  clouds: number;
};

const SHOTS: Shot[] = [
  {
    prompt: "Moonrise over a salt flat, mirror-still water, violet hour, 35mm",
    label: "Salt flat",
    top: [0.07, 0.05, 0.2],
    bottom: [0.62, 0.42, 0.78],
    glow: [1.0, 0.86, 0.55],
    moon: [0.68, 0.7],
    water: 1,
    clouds: 0.35,
  },
  {
    prompt: "Desert dunes at blue hour, long shadows, a single star overhead",
    label: "Dunes",
    top: [0.03, 0.06, 0.18],
    bottom: [0.96, 0.62, 0.38],
    glow: [1.0, 0.78, 0.4],
    moon: [0.28, 0.76],
    water: 0,
    clouds: 0.15,
  },
  {
    prompt: "Storm clouds parting over black mountains, marigold rim light",
    label: "Storm break",
    top: [0.1, 0.08, 0.24],
    bottom: [0.38, 0.26, 0.55],
    glow: [1.0, 0.8, 0.34],
    moon: [0.52, 0.62],
    water: 0,
    clouds: 0.85,
  },
  {
    prompt: "Pink lagoon at dawn, low fog, reflections, medium format film",
    label: "Lagoon",
    top: [0.2, 0.13, 0.36],
    bottom: [1.0, 0.6, 0.74],
    glow: [1.0, 0.92, 0.75],
    moon: [0.8, 0.58],
    water: 1,
    clouds: 0.55,
  },
];

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime, uMotion, uReveal, uWater, uClouds, uFlash;
uniform vec3 uTop, uBottom, uGlow;
uniform vec2 uMoon;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), u.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

vec3 scene(vec2 uv, float t){
  float aspect = uRes.x / uRes.y;
  vec2 q = vec2(uv.x * aspect, uv.y);
  float horizon = 0.36;
  vec3 col = mix(uBottom, uTop, smoothstep(horizon - 0.05, 1.0, uv.y));

  // stars
  vec2 sg = floor(q * 140.0);
  float star = step(0.9965, hash(sg)) * smoothstep(horizon + 0.1, 1.0, uv.y);
  col += star * (0.6 + 0.4 * sin(t * 3.0 + hash(sg) * 30.0));

  // moon with crescent bite and glow
  vec2 m = vec2(uMoon.x * aspect, uMoon.y);
  float d = length(q - m);
  float disc = smoothstep(0.075, 0.07, d);
  float bite = smoothstep(0.07, 0.065, length(q - m - vec2(0.03, 0.018)));
  col += uGlow * (disc * (1.0 - bite) * 1.4 + 0.22 * exp(-d * 9.0));

  // drifting clouds
  float c = fbm(vec2(q.x * 2.2 + t * 0.05, q.y * 5.0 - t * 0.01));
  float cloud = smoothstep(1.0 - uClouds * 0.75, 1.0, c) * smoothstep(horizon, horizon + 0.25, uv.y);
  col = mix(col, mix(uTop * 1.6, uGlow, 0.25 * exp(-d * 4.0)), cloud * 0.75);

  // ridge line
  float ridge = horizon + 0.06 * fbm(vec2(q.x * 3.0, 1.0)) + 0.03 * fbm(vec2(q.x * 9.0, 4.0)) - 0.02;
  float land = smoothstep(ridge + 0.002, ridge - 0.002, uv.y);
  vec3 landCol = mix(uTop * 0.35, uBottom * 0.25, 0.4);
  col = mix(col, landCol, land);

  // water: reflect the sky below the horizon, rippling once it moves
  if (uWater > 0.5 && uv.y < horizon - 0.01) {
    float ry = 2.0 * (horizon - 0.01) - uv.y;
    float ripple = sin(uv.y * 220.0 - t * 2.4) * 0.004 * (horizon - uv.y) * 6.0;
    vec2 ruv = vec2(uv.x + ripple, ry);
    vec3 r = mix(uBottom, uTop, smoothstep(horizon - 0.05, 1.0, ruv.y));
    vec2 rq = vec2(ruv.x * aspect, ruv.y);
    float rd = length(rq - m);
    r += uGlow * (smoothstep(0.075, 0.06, rd) * 0.9 + 0.2 * exp(-rd * 9.0));
    col = mix(col, r * 0.75, 0.9);
  }
  return col;
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float t = uTime * uMotion;
  vec3 col = scene(uv, t);

  // render reveal: above the scanline is finished, below is the wireframe pass
  float line = 1.0 - uReveal;
  if (uv.y < line) {
    vec2 g = fract(uv * vec2(uRes.x / uRes.y, 1.0) * 18.0);
    float grid = step(0.96, g.x) + step(0.96, g.y);
    col = col * 0.12 + vec3(0.72, 0.66, 1.0) * grid * 0.18;
  }
  col += vec3(1.0, 0.85, 0.5) * smoothstep(0.012, 0.0, abs(uv.y - line)) * step(0.001, uReveal) * step(uReveal, 0.999);

  // vignette, grain, cut flash
  vec2 v = uv - 0.5;
  col *= 1.0 - dot(v, v) * 0.9;
  col += (hash(uv * uRes + uTime) - 0.5) * 0.05;
  col = mix(col, vec3(1.0), uFlash);
  gl_FragColor = vec4(col, 1.0);
}
`;

export function DreamMonitor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shot, setShot] = useState(0);
  const [typed, setTyped] = useState(SHOTS[0]!.prompt);
  const [phase, setPhase] = useState<"typing" | "render" | "still" | "motion">("motion");
  // The timecode updates every few frames; it writes straight to the DOM to skip React renders.
  const tcRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, powerPreference: "low-power" });
    if (!gl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (name: string) => gl.getUniformLocation(prog, name);
    const U = {
      res: u("uRes"), time: u("uTime"), motion: u("uMotion"), reveal: u("uReveal"), water: u("uWater"),
      clouds: u("uClouds"), flash: u("uFlash"), top: u("uTop"), bottom: u("uBottom"), glow: u("uGlow"), moon: u("uMoon"),
    };

    const state = { shot: 0, motion: 1, reveal: 1, flash: 0, time: 0 };
    const applyShot = (i: number) => {
      const s = SHOTS[i]!;
      gl.uniform3fv(U.top, s.top);
      gl.uniform3fv(U.bottom, s.bottom);
      gl.uniform3fv(U.glow, s.glow);
      gl.uniform2fv(U.moon, s.moon);
      gl.uniform1f(U.water, s.water);
      gl.uniform1f(U.clouds, s.clouds);
    };

    const resize = () => {
      // Phones render the shader at a lower resolution; it's soft imagery, so it holds up.
      const small = window.matchMedia("(max-width: 760px)").matches;
      const dpr = small ? 0.75 : Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(U.res, canvas.width, canvas.height);
    };
    const draw = () => {
      gl.uniform1f(U.time, state.time);
      gl.uniform1f(U.motion, state.motion);
      gl.uniform1f(U.reveal, state.reveal);
      gl.uniform1f(U.flash, state.flash);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    applyShot(0);
    resize();
    draw();
    const ro = new ResizeObserver(() => {
      resize();
      draw();
    });
    ro.observe(canvas);

    const lowPower = window.matchMedia("(max-width: 760px)").matches;
    let raf = 0;
    let visible = true;
    let last = performance.now();
    let frames = 0;
    let tl: { pause(): void; resume(): void; kill(): void } | null = null;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      state.time += dt * (reduce ? 0.4 : 1);
      frames++;
      // Phones draw every other frame (about 30fps) to save battery.
      if (lowPower && frames % 2) return;
      if (frames % 3 === 0) {
        const total = Math.floor(state.time * 24);
        const f = total % 24, s = Math.floor(total / 24) % 60, m = Math.floor(total / 1440) % 60;
        if (tcRef.current) {
          tcRef.current.textContent = `00:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}:${String(f).padStart(2, "0")}`;
        }
      }
      draw();
    };
    const start = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
      tl?.resume();
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      tl?.pause();
    };

    let alive = true;
    void import("gsap").then(({ gsap }) => {
      if (!alive) return;
      const timeline = gsap.timeline({ repeat: -1 });
      SHOTS.forEach((s, i) => {
        const chars = { n: 0 };
        timeline
          .call(() => {
            applyShot(i);
            state.shot = i;
            setShot(i);
            setPhase("typing");
            setTyped("");
          })
          .to(state, { flash: reduce ? 0 : 0.85, duration: 0.04 })
          .set(state, { motion: 0, reveal: 0 })
          .to(state, { flash: 0, duration: 0.18 })
          .to(chars, {
            n: s.prompt.length,
            duration: s.prompt.length * 0.028,
            ease: "none",
            onUpdate: () => setTyped(s.prompt.slice(0, Math.round(chars.n))),
          })
          .call(() => setPhase("render"))
          .to(state, { reveal: 1, duration: 1.1, ease: "power2.inOut" })
          .call(() => setPhase("still"))
          .to({}, { duration: 0.7 })
          .call(() => setPhase("motion"))
          .to(state, { motion: 1, duration: 0.8, ease: "power2.in" })
          .to({}, { duration: 2.4 });
      });
      tl = timeline;
      if (!visible || document.hidden) timeline.pause();
    });

    const io = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible && !document.hidden) start();
      else stop();
    });
    io.observe(canvas);
    const onVis = () => (document.hidden || !visible ? stop() : start());
    document.addEventListener("visibilitychange", onVis);

    return () => {
      alive = false;
      stop();
      tl?.kill();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  const s = SHOTS[shot]!;
  return (
    <figure className="dc-monitor" aria-label="Animated example: a prompt becomes a picture, then the picture starts to move">
      <div className="dc-monitor-frame">
        <canvas ref={canvasRef} className="dc-monitor-canvas" />
        <div className="dc-monitor-hud" aria-hidden>
          <span className="dc-hud-rec" data-on={phase === "motion"}>
            {phase === "motion" ? "Moving" : phase === "still" ? "Still" : phase === "render" ? "Rendering" : "Prompt"}
          </span>
          <span className="dc-hud-tc" ref={tcRef}>00:00:00:00</span>
          <span className="dc-hud-shot">
            Shot {shot + 1} of {SHOTS.length} · {s.label}
          </span>
        </div>
        <span className="dc-corner dc-corner--tl" aria-hidden />
        <span className="dc-corner dc-corner--tr" aria-hidden />
        <span className="dc-corner dc-corner--bl" aria-hidden />
        <span className="dc-corner dc-corner--br" aria-hidden />
      </div>
      <figcaption className="dc-monitor-prompt">
        <span className="dc-monitor-caret-label">Prompt</span>
        <span className="dc-monitor-text">
          {typed}
          <span className="dc-caret" data-on={phase === "typing"} aria-hidden />
        </span>
      </figcaption>
    </figure>
  );
}
