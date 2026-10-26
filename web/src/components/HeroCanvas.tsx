"use client";

import { useEffect, useRef } from "react";

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

/* Domain-warped noise flowing left to right: ember on the Mezo side, tide on the Base side,
   bright currents where the flow folds, a soft vignette and fine grain. The pointer bends it. */
const FRAG = `
precision highp float;
uniform vec2 r; uniform float t; uniform vec2 m;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(h(i), h(i+vec2(1,0)), u.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a*n(p); p = p*2.03 + 7.1; a *= 0.5; } return v; }
void main(){
  vec2 p = (gl_FragCoord.xy - 0.5*r) / r.y;
  float s = t * 0.05;
  vec2 mm = (m - 0.5) * vec2(r.x/r.y, 1.0);
  float pull = exp(-2.2 * length(p - mm));
  vec2 q = vec2(fbm(p*1.3 + vec2(-s*2.0, s)), fbm(p*1.3 + vec2(3.1, -s)));
  vec2 w = p + (q - 0.5) * 1.35 + (p - mm) * pull * 0.18;
  float f = fbm(w*1.8 + vec2(-s*4.0, 0.0));
  float g = fbm(w*3.4 - vec2(s*6.0, s));
  float current = pow(smoothstep(0.35, 0.95, f), 2.0);
  float ribs = smoothstep(0.92, 1.0, sin(w.y*9.0 + f*10.0 - s*14.0)) * smoothstep(0.4, 0.8, f);
  vec3 ember = vec3(1.0, 0.36, 0.12);
  vec3 tide = vec3(0.24, 0.39, 1.0);
  vec3 col = mix(ember, tide, smoothstep(-0.55, 0.65, p.x + (g - 0.5) * 0.9));
  vec3 c = vec3(0.016, 0.018, 0.026);
  c += col * current * 1.15;
  c += col * ribs * 0.35;
  c += mix(ember, tide, 0.5) * pull * 0.06;
  c *= smoothstep(1.55, 0.25, length(p * vec2(0.75, 1.15)));
  c = c / (1.0 + c * 0.35);
  c += (h(gl_FragCoord.xy + fract(t)) - 0.5) * 0.035;
  gl_FragColor = vec4(c, 1.0);
}`;

export function HeroCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const gl = canvas?.getContext("webgl", { antialias: false, premultipliedAlpha: false });
    if (!canvas || !gl) return;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uR = gl.getUniformLocation(prog, "r");
    const uT = gl.getUniformLocation(prog, "t");
    const uM = gl.getUniformLocation(prog, "m");

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0;
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      w = Math.floor(canvas.clientWidth * dpr * 0.75);
      h = Math.floor(canvas.clientHeight * dpr * 0.75);
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let mx = 0.62, my = 0.45, tx = mx, ty = my;
    const onMove = (e: PointerEvent) => {
      const b = canvas.getBoundingClientRect();
      tx = (e.clientX - b.left) / b.width;
      ty = 1 - (e.clientY - b.top) / b.height;
    };
    addEventListener("pointermove", onMove, { passive: true });

    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);

    const t0 = performance.now();
    let raf = 0;
    const draw = (now: number) => {
      mx += (tx - mx) * 0.04;
      my += (ty - my) * 0.04;
      gl.uniform2f(uR, w, h);
      gl.uniform1f(uT, reduce ? 40 : (now - t0) / 1000 + 40);
      gl.uniform2f(uM, mx, my);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const loop = (now: number) => {
      if (visible) draw(now);
      raf = requestAnimationFrame(loop);
    };
    if (reduce) draw(performance.now());
    else raf = requestAnimationFrame(loop);
    canvas.classList.add("is-live");

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      removeEventListener("pointermove", onMove);
    };
  }, []);

  return <canvas ref={ref} className="hero__canvas" aria-hidden="true" />;
}
