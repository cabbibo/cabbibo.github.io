// Shared three.js helpers: one ticker for every stage, a procedural
// "night city" material (windows from world position, no textures), and
// small geometry builders used across chapters.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export { THREE, mergeGeometries };

export const C = {
  ink: 0x0b0d10,
  ink2: 0x14181d,
  street: 0x1a1e24,
  paper: 0xe8e2d4,
  brass: 0xc8a35a,
  amber: 0xf0a43a,
  sapphire: 0x5b8cff,
  soul: 0x7ff0e0,
  blood: 0xd0463b,
  stone: 0x3a3a3f,
};

export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------- ticker
const stages = new Set();
let last = performance.now();
function runFrame(dt, force = false) {
  for (const s of stages) {
    if (!s.visible && !force) continue;
    s.t += dt;
    for (const f of s.frame) f(dt, s.t);
    s.renderer.render(s.scene, s.camera);
  }
}
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  runFrame(dt);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
// Debug: advance every on-screen stage by `secs` without waiting for frames.
window.__advance = (secs, fps = 30) => { for (let i = 0; i < secs * fps; i++) runFrame(1 / fps); };

/**
 * Create a WebGL stage inside `el`. Renders only while on screen.
 * Returns { renderer, scene, camera, frame:[], pointer, raycast(objs) ... }.
 */
export function stage(el, opts = {}) {
  const {
    fov = 38, near = 0.5, far = 4000, bg = C.ink,
    fog = null, pixelRatio = 2, ortho = false,
  } = opts;
  const canvas = document.createElement('canvas');
  canvas.className = 'gl';
  el.prepend(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, pixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(bg, 1);
  const scene = new THREE.Scene();
  if (fog) scene.fog = new THREE.Fog(bg, fog[0], fog[1]);
  const camera = ortho
    ? new THREE.OrthographicCamera(-1, 1, 1, -1, near, far)
    : new THREE.PerspectiveCamera(fov, 1, near, far);

  const s = {
    el, canvas, renderer, scene, camera, frame: [], t: 0, visible: false,
    pointer: new THREE.Vector2(-9, -9), pointerDown: false,
    width: 1, height: 1, orthoSize: opts.orthoSize || 100,
    fogUniforms: {
      fogColor: { value: new THREE.Color(bg) },
      fogNear: { value: fog ? fog[0] : 1e5 },
      fogFar: { value: fog ? fog[1] : 2e5 },
    },
  };

  function resize() {
    const w = Math.max(1, el.clientWidth), h = Math.max(1, el.clientHeight);
    s.width = w; s.height = h;
    renderer.setSize(w, h, false);
    if (ortho) {
      const a = w / h, z = s.orthoSize;
      camera.left = -z * a; camera.right = z * a; camera.top = z; camera.bottom = -z;
    } else camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (s.onResize) s.onResize(w, h);
  }
  new ResizeObserver(resize).observe(el);
  resize();
  s.resize = resize;

  new IntersectionObserver(([e]) => {
    s.visible = e.isIntersecting;
    if (s.visible) renderer.render(scene, camera);
  }, { rootMargin: '120px' }).observe(el);

  const setPointer = (e) => {
    const r = canvas.getBoundingClientRect();
    s.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  };
  canvas.addEventListener('pointermove', setPointer);
  canvas.addEventListener('pointerdown', (e) => { setPointer(e); s.pointerDown = true; });
  window.addEventListener('pointerup', () => { s.pointerDown = false; });
  canvas.addEventListener('pointerleave', () => s.pointer.set(-9, -9));

  const ray = new THREE.Raycaster();
  s.raycast = (objs) => { ray.setFromCamera(s.pointer, camera); return ray.intersectObjects(objs, true); };
  s.groundPoint = (y = 0) => {
    ray.setFromCamera(s.pointer, camera);
    const p = new THREE.Vector3();
    return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), p) ? p : null;
  };
  // Re-render once for still frames (thumbnails, reduced motion).
  s.renderOnce = () => renderer.render(scene, camera);

  stages.add(s);
  return s;
}

// --------------------------------------------- simple drag-orbit camera rig
export function orbitRig(s, { target = new THREE.Vector3(), radius = 300, theta = 0.6, phi = 0.9,
  minPhi = 0.25, maxPhi = 1.35, minR = 60, maxR = 900, auto = 0.0, zoom = true } = {}) {
  const rig = { target, radius, theta, phi, auto, dragging: false, tTheta: theta, tPhi: phi, tR: radius };
  let px = 0, py = 0;
  const c = s.canvas;
  c.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    rig.dragging = true; px = e.clientX; py = e.clientY; rig.moved = 0;
  });
  window.addEventListener('pointermove', (e) => {
    if (!rig.dragging) return;
    const dx = e.clientX - px, dy = e.clientY - py; px = e.clientX; py = e.clientY;
    rig.moved += Math.abs(dx) + Math.abs(dy);
    rig.tTheta -= dx * 0.006;
    rig.tPhi = Math.min(maxPhi, Math.max(minPhi, rig.tPhi - dy * 0.005));
  });
  window.addEventListener('pointerup', () => { rig.dragging = false; });
  if (zoom) c.addEventListener('wheel', (e) => {
    if (!e.ctrlKey && !e.metaKey && !e.altKey && !c.matches(':focus-within, .zoomable')) return; // page scroll wins
    e.preventDefault();
    rig.tR = Math.min(maxR, Math.max(minR, rig.tR * (1 + Math.sign(e.deltaY) * 0.1)));
  }, { passive: false });
  s.frame.push((dt) => {
    if (!rig.dragging && !reduceMotion) rig.tTheta += rig.auto * dt;
    const k = 1 - Math.pow(0.0015, dt);
    rig.theta += (rig.tTheta - rig.theta) * k;
    rig.phi += (rig.tPhi - rig.phi) * k;
    rig.radius += (rig.tR - rig.radius) * k;
    const sp = Math.sin(rig.phi);
    s.camera.position.set(
      rig.target.x + rig.radius * sp * Math.sin(rig.theta),
      rig.target.y + rig.radius * Math.cos(rig.phi),
      rig.target.z + rig.radius * sp * Math.cos(rig.theta));
    s.camera.lookAt(rig.target);
  });
  return rig;
}

// ------------------------------------------------------- night city shader
// Lambert-ish shading + procedural lit windows derived from world position.
// Works on Mesh and InstancedMesh (per-instance color via instanceColor).
const cityVert = /* glsl */`
  varying vec3 vW; varying vec3 vN; varying vec3 vCol;
  void main(){
    vec4 p = vec4(position,1.0);
    vec3 n = normal;
    #ifdef USE_INSTANCING
      p = instanceMatrix * p;
      n = mat3(instanceMatrix) * n;
    #endif
    vCol = vec3(1.0);
    #ifdef USE_INSTANCING_COLOR
      vCol = instanceColor;
    #endif
    vec4 w = modelMatrix * p;
    vW = w.xyz;
    vN = normalize(mat3(modelMatrix) * n);
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;
const cityFrag = /* glsl */`
  uniform vec3 base; uniform vec3 win; uniform float lit; uniform float floorH; uniform float winW;
  uniform float time; uniform vec3 fogColor; uniform float fogNear; uniform float fogFar;
  uniform vec3 sun; uniform float windows; uniform vec3 rim;
  varying vec3 vW; varying vec3 vN; varying vec3 vCol;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  void main(){
    vec3 n = normalize(vN);
    float diff = max(dot(n, normalize(sun)), 0.0);
    float sky = 0.5 + 0.5 * n.y;
    vec3 col = base * vCol * (0.35 + 0.55 * diff + 0.25 * sky);
    // windows on vertical faces only
    float vert = 1.0 - abs(n.y);
    if (windows > 0.5 && vert > 0.5) {
      float u = abs(n.x) > abs(n.z) ? vW.z : vW.x;
      vec2 cell = vec2(floor(u / winW), floor(vW.y / floorH));
      vec2 f = vec2(fract(u / winW), fract(vW.y / floorH));
      float pane = step(0.22, f.x) * step(f.x, 0.78) * step(0.3, f.y) * step(f.y, 0.8);
      float r = h(cell + floor(vW.xz / 37.0));
      float on = step(1.0 - lit, r);
      float flick = 0.85 + 0.15 * sin(time * (0.5 + r * 2.0) + r * 40.0);
      col += win * pane * on * flick * (0.6 + 0.8 * h(cell * 1.7));
      col *= mix(1.0, 0.82, pane * (1.0 - on));
    }
    // cool rim from below-horizon sky
    col += rim * pow(1.0 - max(dot(n, normalize(cameraPosition - vW)), 0.0), 3.0) * 0.35;
    float d = length(cameraPosition - vW);
    float fogF = smoothstep(fogNear, fogFar, d);
    gl_FragColor = vec4(mix(col, fogColor, fogF), 1.0);
    #include <colorspace_fragment>
  }`;

export function cityMaterial(s, {
  base = 0x2b2e35, win = 0xffc77a, lit = 0.28, floorH = 4, winW = 3.2, windows = true,
  sun = [0.4, 0.8, 0.3], rim = 0x334466,
} = {}) {
  const m = new THREE.ShaderMaterial({
    vertexShader: cityVert,
    fragmentShader: cityFrag,
    uniforms: {
      base: { value: new THREE.Color(base) },
      win: { value: new THREE.Color(win) },
      lit: { value: lit }, floorH: { value: floorH }, winW: { value: winW },
      windows: { value: windows ? 1 : 0 },
      time: { value: 0 }, sun: { value: new THREE.Vector3(...sun) },
      rim: { value: new THREE.Color(rim) },
      ...s.fogUniforms,
    },
  });
  s.frame.push((dt, t) => { m.uniforms.time.value = t; });
  return m;
}

// Emissive unlit material that still fogs.
export function glowMaterial(color, opts = {}) {
  return new THREE.MeshBasicMaterial({ color, transparent: !!opts.opacity, opacity: opts.opacity ?? 1,
    depthWrite: opts.depthWrite ?? !opts.opacity, blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    fog: opts.fog ?? true, side: opts.side ?? THREE.FrontSide });
}

// ------------------------------------------------------------- geometry
/** A 1916-zoning "wedding cake" tower: stacked setback boxes + optional spire. */
export function setbackTower({ w = 20, d = 20, h = 80, tiers = 4, shrink = 0.72, spire = 0, crown = false } = {}) {
  const parts = [];
  let y = 0, cw = w, cd = d;
  const heights = [];
  let rem = h;
  for (let i = 0; i < tiers; i++) {
    const th = i === tiers - 1 ? rem : rem * (i === 0 ? 0.5 : 0.45);
    heights.push(th); rem -= th;
  }
  for (let i = 0; i < tiers; i++) {
    const g = new THREE.BoxGeometry(cw, heights[i], cd);
    g.translate(0, y + heights[i] / 2, 0);
    parts.push(g);
    y += heights[i]; cw *= shrink; cd *= shrink;
  }
  if (crown) {
    for (let k = 0; k < 3; k++) {
      const g = new THREE.CylinderGeometry(cw * (0.55 - k * 0.15), cw * (0.6 - k * 0.15), cw * 0.35, 4, 1);
      g.rotateY(Math.PI / 4); g.translate(0, y + cw * 0.175, 0); parts.push(g); y += cw * 0.3;
    }
  }
  if (spire) {
    const g = new THREE.ConeGeometry(Math.max(0.6, cw * 0.18), spire, 4);
    g.rotateY(Math.PI / 4); g.translate(0, y + spire / 2, 0); parts.push(g);
  }
  return mergeGeometries(parts.map((g) => g.toNonIndexed()));
}

/** Seeded PRNG so procedural cities are stable between loads. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Soft radial sprite texture for glows/souls. */
let _glowTex;
export function glowTexture() {
  if (_glowTex) return _glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  _glowTex = new THREE.CanvasTexture(c);
  return _glowTex;
}

export function glowSprite(color, size = 10, opacity = 1) {
  const m = new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false });
  const sp = new THREE.Sprite(m); sp.scale.setScalar(size); return sp;
}

/** Points cloud of additive glows (cheap many-sprite system). */
export function glowPoints(count, size = 6, color = 0xffffff) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3).fill(1), 3));
  const mat = new THREE.PointsMaterial({ size, map: glowTexture(), vertexColors: true, color,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const p = new THREE.Points(geo, mat);
  p.frustumCulled = false;
  return p;
}

/** Draw a flat polyline ribbon on the ground (for lanes / paths). */
export function ribbon(points, width = 6, y = 0.2) {
  const pos = [], idx = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i], a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
    const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz) || 1;
    const nx = -dz / L * width / 2, nz = dx / L * width / 2;
    pos.push(p.x + nx, y, p.z + nz, p.x - nx, y, p.z - nz);
    if (i < points.length - 1) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Sample a smooth path through control points (Catmull-Rom) as evenly spaced points. */
export function pathPoints(ctrl, n = 200) {
  const curve = new THREE.CatmullRomCurve3(ctrl.map((p) => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal');
  return { curve, pts: curve.getSpacedPoints(n) };
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = (t) => t * t * (3 - 2 * t);
