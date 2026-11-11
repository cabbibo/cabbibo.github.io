/* ============================================================
   LABMARKET — Clinical Trial Atlas
   lmviz.js — shared runtime: scene boot, orbit, GPGPU compute,
   UI kit, geo primitives, synthetic trial data, manifest.
   Depends on: vendor/three.min.js, js/land.js
   ============================================================ */
(function (global) {
  'use strict';

  var LM = {};
  global.LM = LM;

  /* ---------------------------------------------------------
     PALETTE
     --------------------------------------------------------- */
  LM.C = {
    bg: 0xf4f3f0,
    bgTop: 0xfdfdfc,
    ink: 0x0d161f,
    muted: 0x525c67,
    faint: 0x8d97a3,
    line: 0xd5dbe3,
    accent: 0xd82591,
    accentLt: 0xf86ab5,
    accentDk: 0x9c1468,
    slate: 0x698cb5,
    teal: 0x00a9b1,
    violet: 0x7d5be6,
    amber: 0xed9e2f,
    green: 0x3bb974,
    red: 0xe2503f,
    white: 0xffffff
  };
  LM.col = function (n) { return new THREE.Color(LM.C[n] !== undefined ? LM.C[n] : n); };
  LM.hex = function (n) { return '#' + (LM.C[n] !== undefined ? LM.C[n] : n).toString(16).padStart(6, '0'); };
  // ordered categorical ramp, used where a series needs distinct hues
  LM.SERIES = ['accent', 'slate', 'teal', 'amber', 'violet', 'green', 'accentDk', 'red'];
  LM.series = function (i) { return LM.C[LM.SERIES[i % LM.SERIES.length]]; };

  /* ---------------------------------------------------------
     MATH / RANDOM
     --------------------------------------------------------- */
  LM.rng = function (seed) {
    var s = (seed || 1) >>> 0;
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  LM.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  LM.lerp = function (a, b, t) { return a + (b - a) * t; };
  LM.smooth = function (e0, e1, x) { var t = LM.clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  LM.ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  // Box-Muller
  LM.gauss = function (rnd) {
    var u = 1 - rnd(), v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  LM.fmt = function (n, d) {
    if (n === undefined || n === null || isNaN(n)) return '—';
    if (d === undefined) d = 0;
    return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  };
  LM.pct = function (n, d) { return (n * 100).toFixed(d === undefined ? 1 : d) + '%'; };

  /* ---------------------------------------------------------
     GLSL CHUNKS
     --------------------------------------------------------- */
  LM.glsl = {};

  LM.glsl.hash = [
    'float hash11(float p){p=fract(p*.1031);p*=p+33.33;p*=p+p;return fract(p);}',
    'vec2 hash22(vec2 p){vec3 p3=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));',
    '  p3+=dot(p3,p3.yzx+33.33);return fract((p3.xx+p3.yz)*p3.zy);}',
    'vec3 hash33(vec3 p3){p3=fract(p3*vec3(.1031,.1030,.0973));',
    '  p3+=dot(p3,p3.yxz+33.33);return fract((p3.xxy+p3.yxx)*p3.zyx);}'
  ].join('\n');

  // Ashima simplex 3D
  LM.glsl.noise = [
    'vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}',
    'vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}',
    'vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}',
    'vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}',
    'float snoise(vec3 v){',
    '  const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);',
    '  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);',
    '  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);',
    '  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;',
    '  i=mod289(i);',
    '  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));',
    '  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;',
    '  vec4 j=p-49.*floor(p*ns.z*ns.z);',
    '  vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);',
    '  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);',
    '  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);',
    '  vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));',
    '  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;',
    '  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);',
    '  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));',
    '  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;',
    '  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;',
    '  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}',
    'float fbm(vec3 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*snoise(p);p*=2.02;a*=.5;}return v;}'
  ].join('\n');

  LM.glsl.geo = [
    'vec3 latLonToXYZ(float lat,float lon,float r){',
    '  float a=radians(90.-lat),b=radians(lon+90.);',
    '  return vec3(r*sin(a)*cos(b),r*cos(a),-r*sin(a)*sin(b));}'
  ].join('\n');

  // soft round sprite + subtle rim, used by most point clouds
  LM.glsl.dot = [
    'float lmDot(vec2 uv,float soft){',
    '  float d=length(uv-0.5)*2.0;',
    '  return 1.0-smoothstep(1.0-soft,1.0,d);}'
  ].join('\n');

  /* Physically-correct point sizing.
     lmSize(worldDiameter, mvPosition) -> gl_PointSize in device pixels.
     Requires a `uPix` uniform fed by LM.pixUniform(ctx). */
  LM.glsl.psize = [
    'uniform float uPix;',
    'float lmSize(float world,vec4 mv){',
    '  return world*projectionMatrix[1][1]*uPix/max(-mv.z,0.0001);}'
  ].join('\n');

  // uniform that tracks half the drawing-buffer height (keeps dots DPR-independent)
  LM.pixUniform = function (ctx) {
    var u = { value: 400 };
    function upd() { u.value = ctx.renderer.domElement.height * 0.5; }
    upd();
    ctx.resize.push(upd);
    LM._pixUniforms = LM._pixUniforms || [];
    LM._pixUniforms.push(u);
    return u;
  };

  /* ---------------------------------------------------------
     ORBIT CONTROLS (self-contained, no examples/ dependency)
     --------------------------------------------------------- */
  function Orbit(camera, dom, opt) {
    opt = opt || {};
    this.camera = camera; this.dom = dom;
    this.target = opt.target ? opt.target.clone() : new THREE.Vector3();
    this.enabled = opt.enabled !== false;
    this.enablePan = opt.pan !== false;
    this.enableZoom = opt.zoom !== false;
    this.minDist = opt.minDist || 1.2;
    this.maxDist = opt.maxDist || 400;
    this.minPolar = opt.minPolar !== undefined ? opt.minPolar : 0.02;
    this.maxPolar = opt.maxPolar !== undefined ? opt.maxPolar : Math.PI - 0.02;
    this.damping = opt.damping !== undefined ? opt.damping : 0.085;
    this.rotateSpeed = opt.rotateSpeed || 1;
    this.autoRotate = !!opt.autoRotate;
    this.autoRotateSpeed = opt.autoRotateSpeed || 0.28;
    this.idleResume = opt.idleResume !== undefined ? opt.idleResume : 2.6;

    var off = new THREE.Vector3().subVectors(camera.position, this.target);
    this.sph = new THREE.Spherical().setFromVector3(off);
    this.tSph = this.sph.clone();
    this.tTarget = this.target.clone();
    this._idle = 0; this._dragging = false; this._mode = 0;
    this._last = { x: 0, y: 0 };
    this._bind();
  }
  Orbit.prototype._bind = function () {
    var self = this, el = this.dom;
    function down(e) {
      if (!self.enabled) return;
      self._dragging = true; self._idle = 0;
      self._mode = (e.button === 2 || e.shiftKey) ? 1 : 0;
      self._last.x = e.clientX; self._last.y = e.clientY;
      el.style.cursor = 'grabbing';
    }
    function move(e) {
      if (!self._dragging || !self.enabled) return;
      var dx = e.clientX - self._last.x, dy = e.clientY - self._last.y;
      self._last.x = e.clientX; self._last.y = e.clientY;
      self._idle = 0;
      if (self._mode === 1 && self.enablePan) {
        var d = self.sph.radius * 0.0016;
        var m = self.camera.matrix.elements;
        var rx = new THREE.Vector3(m[0], m[1], m[2]).multiplyScalar(-dx * d);
        var ry = new THREE.Vector3(m[4], m[5], m[6]).multiplyScalar(dy * d);
        self.tTarget.add(rx).add(ry);
      } else {
        self.tSph.theta -= dx * 0.0052 * self.rotateSpeed;
        self.tSph.phi = LM.clamp(self.tSph.phi - dy * 0.0052 * self.rotateSpeed, self.minPolar, self.maxPolar);
      }
    }
    function up() { self._dragging = false; el.style.cursor = 'grab'; }
    function wheel(e) {
      if (!self.enabled || !self.enableZoom) return;
      e.preventDefault(); self._idle = 0;
      self.tSph.radius = LM.clamp(self.tSph.radius * (1 + Math.sign(e.deltaY) * 0.108), self.minDist, self.maxDist);
    }
    el.style.cursor = 'grab';
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    el.addEventListener('wheel', wheel, { passive: false });
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    // touch pinch
    var pts = {}, pd = 0;
    el.addEventListener('pointerdown', function (e) { pts[e.pointerId] = e; });
    window.addEventListener('pointerup', function (e) { delete pts[e.pointerId]; pd = 0; });
    window.addEventListener('pointermove', function (e) {
      if (!(e.pointerId in pts)) return;
      pts[e.pointerId] = e;
      var k = Object.keys(pts);
      if (k.length === 2) {
        var a = pts[k[0]], b = pts[k[1]];
        var d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        if (pd) self.tSph.radius = LM.clamp(self.tSph.radius * (pd / d), self.minDist, self.maxDist);
        pd = d; self._dragging = false;
      }
    });
  };
  Orbit.prototype.update = function (dt) {
    this._idle += dt;
    if (this.autoRotate && this._idle > this.idleResume && !this._dragging) {
      this.tSph.theta -= this.autoRotateSpeed * dt;
    }
    var k = 1 - Math.pow(1 - this.damping, dt * 60);
    this.sph.theta += (this.tSph.theta - this.sph.theta) * k;
    this.sph.phi += (this.tSph.phi - this.sph.phi) * k;
    this.sph.radius += (this.tSph.radius - this.sph.radius) * k;
    this.target.lerp(this.tTarget, k);
    this.camera.position.setFromSpherical(this.sph).add(this.target);
    this.camera.lookAt(this.target);
  };
  Orbit.prototype.setTarget = function (v) { this.tTarget.copy(v); };
  Orbit.prototype.dollyTo = function (r) { this.tSph.radius = LM.clamp(r, this.minDist, this.maxDist); };
  LM.Orbit = Orbit;

  /* ---------------------------------------------------------
     GPGPU PING-PONG COMPUTE
     --------------------------------------------------------- */
  var QUAD_VS = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';

  function GPGPU(renderer, w, h, frag, uniforms, initFn) {
    this.renderer = renderer; this.w = w; this.h = h;
    var type = THREE.FloatType;
    // half-float fallback where full float render targets are unsupported
    var gl = renderer.getContext();
    var isGL2 = renderer.capabilities.isWebGL2;
    if (isGL2) { if (!gl.getExtension('EXT_color_buffer_float')) type = THREE.HalfFloatType; }
    else if (!gl.getExtension('OES_texture_float')) type = THREE.HalfFloatType;
    this.type = type;

    var o = {
      wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping,
      minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat, type: type, depthBuffer: false, stencilBuffer: false
    };
    this.rt = [new THREE.WebGLRenderTarget(w, h, o), new THREE.WebGLRenderTarget(w, h, o)];
    this.cur = 0;

    // seed data
    var data = new Float32Array(w * h * 4);
    if (initFn) initFn(data, w, h);
    var seedType = THREE.FloatType;
    this.seed = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, seedType);
    this.seed.minFilter = this.seed.magFilter = THREE.NearestFilter;
    this.seed.needsUpdate = true;

    var u = uniforms || {};
    u.uPrev = { value: this.seed };
    u.uTexel = { value: new THREE.Vector2(1 / w, 1 / h) };
    if (!u.uTime) u.uTime = { value: 0 };
    if (!u.uDt) u.uDt = { value: 0 };
    this.uniforms = u;

    this.mat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: QUAD_VS, fragmentShader: frag, depthTest: false, depthWrite: false });
    this.scene = new THREE.Scene();
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat));

    // prime both buffers from the seed
    this._blit(this.seed, this.rt[0]);
    this._blit(this.seed, this.rt[1]);
  }
  GPGPU.prototype._blit = function (tex, target) {
    var m = new THREE.ShaderMaterial({
      uniforms: { t: { value: tex } }, vertexShader: QUAD_VS,
      fragmentShader: 'uniform sampler2D t;varying vec2 vUv;void main(){gl_FragColor=texture2D(t,vUv);}',
      depthTest: false, depthWrite: false
    });
    var s = new THREE.Scene();
    s.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m));
    var p = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(target);
    this.renderer.render(s, this.cam);
    this.renderer.setRenderTarget(p);
    m.dispose();
  };
  GPGPU.prototype.step = function (dt, t) {
    this.uniforms.uDt.value = dt;
    if (t !== undefined) this.uniforms.uTime.value = t;
    var src = this.rt[this.cur], dst = this.rt[1 - this.cur];
    this.uniforms.uPrev.value = src.texture;
    var p = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(dst);
    this.renderer.render(this.scene, this.cam);
    this.renderer.setRenderTarget(p);
    this.cur = 1 - this.cur;
    return this.rt[this.cur].texture;
  };
  GPGPU.prototype.reset = function () { this._blit(this.seed, this.rt[0]); this._blit(this.seed, this.rt[1]); this.cur = 0; };
  Object.defineProperty(GPGPU.prototype, 'texture', { get: function () { return this.rt[this.cur].texture; } });
  LM.GPGPU = GPGPU;

  // Build a Points geometry whose vertices index a w*h compute texture.
  LM.indexGeometry = function (w, h) {
    var n = w * h, pos = new Float32Array(n * 3), ref = new Float32Array(n * 2), idx = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      ref[i * 2] = ((i % w) + 0.5) / w;
      ref[i * 2 + 1] = (Math.floor(i / w) + 0.5) / h;
      idx[i] = i;
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aRef', new THREE.BufferAttribute(ref, 2));
    g.setAttribute('aIdx', new THREE.BufferAttribute(idx, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
    return g;
  };

  /* ---------------------------------------------------------
     BOOT
     --------------------------------------------------------- */
  LM.boot = function (opt) {
    opt = opt || {};
    var host = document.getElementById('stage') || document.body;
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: opt.antialias !== false,
        alpha: false,
        powerPreference: 'high-performance'
      });
    } catch (e) { renderer = null; }
    if (!renderer || !renderer.getContext()) {
      var f = document.createElement('div');
      f.className = 'fail';
      f.innerHTML = '<div><b>WebGL unavailable.</b><br>This visual needs hardware-accelerated graphics.<br>Try Chrome or Edge with GPU acceleration enabled.</div>';
      document.body.appendChild(f);
      return null;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opt.maxDpr || 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setClearColor(opt.bg !== undefined ? opt.bg : LM.C.bg, 1);
    if (opt.shadows) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }
    host.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    if (opt.fog) scene.fog = new THREE.Fog(opt.fogColor !== undefined ? opt.fogColor : LM.C.bg, opt.fog[0], opt.fog[1]);

    var camera;
    var aspect = window.innerWidth / window.innerHeight;
    if (opt.ortho) {
      var fr = opt.frustum || 10;
      camera = new THREE.OrthographicCamera(-fr * aspect, fr * aspect, fr, -fr, -500, 1000);
      camera.frustumSize = fr;
    } else {
      camera = new THREE.PerspectiveCamera(opt.fov || 42, aspect, opt.near || 0.08, opt.far || 2200);
    }
    var cp = opt.cam || [0, 4, 14];
    camera.position.set(cp[0], cp[1], cp[2]);
    var tgt = new THREE.Vector3().fromArray(opt.target || [0, 0, 0]);
    camera.lookAt(tgt);

    var controls = null;
    if (opt.orbit !== false) {
      var oo = Object.assign({ target: tgt }, typeof opt.orbit === 'object' ? opt.orbit : {});
      controls = new Orbit(camera, renderer.domElement, oo);
    }

    var clock = new THREE.Clock();
    var frameCbs = [];
    var ctx = {
      renderer: renderer, scene: scene, camera: camera, controls: controls, clock: clock,
      time: 0, dt: 0, frame: 0,
      add: function () { for (var i = 0; i < arguments.length; i++) scene.add(arguments[i]); return arguments[0]; },
      onFrame: function (fn) { frameCbs.push(fn); return fn; },
      resize: []
    };
    LM.ctx = ctx;

    /* Distance at which a sphere of `radius` is fully framed, accounting for
       BOTH axes — so a tall narrow window pulls the camera back instead of
       cropping. */
    ctx.fitDistance = function (radius, margin) {
      if (camera.isOrthographicCamera) return camera.position.length();
      var vf = camera.fov * Math.PI / 360;
      var hf = Math.atan(Math.tan(vf) * camera.aspect);
      return radius * (margin || 1) / Math.max(Math.tan(Math.min(vf, hf)), 1e-4);
    };

    var baseFit = 0;
    if (opt.fit && controls) {
      baseFit = ctx.fitDistance(opt.fit, opt.fitMargin || 1.18);
      controls.sph.radius = controls.tSph.radius = baseFit;
      controls.minDist = Math.min(controls.minDist, baseFit * 0.3);
      controls.maxDist = Math.max(controls.maxDist, baseFit * 3.2);
      camera.position.setFromSpherical(controls.sph).add(controls.target);
    }

    function onResize() {
      var w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h);
      if (camera.isOrthographicCamera) {
        var a = w / h, fr2 = camera.frustumSize;
        camera.left = -fr2 * a; camera.right = fr2 * a; camera.top = fr2; camera.bottom = -fr2;
      } else { camera.aspect = w / h; }
      camera.updateProjectionMatrix();
      if (opt.fit && controls && baseFit) {
        // preserve how zoomed-in the viewer currently is, re-fit the rest
        var k = controls.tSph.radius / baseFit;
        baseFit = ctx.fitDistance(opt.fit, opt.fitMargin || 1.18);
        controls.minDist = Math.min(controls.minDist, baseFit * 0.3);
        controls.maxDist = Math.max(controls.maxDist, baseFit * 3.2);
        controls.tSph.radius = baseFit * k;
      }
      for (var i = 0; i < ctx.resize.length; i++) ctx.resize[i](w, h);
    }
    window.addEventListener('resize', onResize);
    ctx.onResize = onResize;

    var running = true;
    document.addEventListener('visibilitychange', function () { running = !document.hidden; if (running) clock.getDelta(); });

    function loop() {
      requestAnimationFrame(loop);
      if (!running) return;
      var dt = Math.min(clock.getDelta(), 0.05);
      ctx.dt = dt; ctx.time += dt; ctx.frame++;
      if (controls) controls.update(dt);
      for (var i = 0; i < frameCbs.length; i++) frameCbs[i](dt, ctx.time, ctx);
      if (!ctx.customRender) renderer.render(scene, camera);
    }
    requestAnimationFrame(loop);

    // lift the boot veil once the first frames are on screen
    setTimeout(function () {
      var b = document.getElementById('boot');
      if (b) { b.classList.add('gone'); setTimeout(function () { b.remove(); }, 600); }
    }, opt.bootDelay || 420);

    return ctx;
  };

  /* ---------------------------------------------------------
     LIGHTING PRESET  (soft studio, matches the flat-light look)
     --------------------------------------------------------- */
  LM.studio = function (scene, opt) {
    opt = opt || {};
    var hemi = new THREE.HemisphereLight(0xffffff, 0xc9d2dc, opt.hemi || 0.92);
    hemi.position.set(0, 20, 0);
    var key = new THREE.DirectionalLight(0xffffff, opt.key || 0.78);
    key.position.set(6, 12, 8);
    var fill = new THREE.DirectionalLight(0xffd9ec, opt.fill || 0.30);
    fill.position.set(-8, 4, -6);
    var rim = new THREE.DirectionalLight(0xbcd4ff, opt.rim || 0.22);
    rim.position.set(0, -6, -10);
    scene.add(hemi, key, fill, rim);
    return { hemi: hemi, key: key, fill: fill, rim: rim };
  };

  /* ---------------------------------------------------------
     GEO
     --------------------------------------------------------- */
  LM.geo = {};
  LM.geo.toVec3 = function (lat, lon, r) {
    var a = (90 - lat) * Math.PI / 180, b = (lon + 90) * Math.PI / 180;
    return new THREE.Vector3(r * Math.sin(a) * Math.cos(b), r * Math.cos(a), -r * Math.sin(a) * Math.sin(b));
  };
  // flat equirectangular projection into the XZ plane (width = full 360)
  LM.geo.toFlat = function (lat, lon, width) {
    return new THREE.Vector3(lon / 360 * width, 0, -lat / 180 * (width / 2));
  };

  LM.geo.rings = function () { return global.LM_LAND || []; };

  // Continent outlines on a sphere
  LM.geo.landGlobe = function (r, opt) {
    opt = opt || {};
    var rings = LM.geo.rings(), pts = [];
    for (var i = 0; i < rings.length; i++) {
      var ring = rings[i];
      if (ring.length / 2 < (opt.minPts || 5)) continue;
      for (var j = 0; j < ring.length - 2; j += 2) {
        var a = LM.geo.toVec3(ring[j + 1], ring[j], r);
        var b = LM.geo.toVec3(ring[j + 3], ring[j + 2], r);
        pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    var m = new THREE.LineBasicMaterial({
      color: opt.color !== undefined ? opt.color : LM.C.ink,
      transparent: true, opacity: opt.opacity !== undefined ? opt.opacity : 0.30
    });
    return new THREE.LineSegments(g, m);
  };

  // Continent outlines, flat equirectangular
  LM.geo.landFlat = function (width, opt) {
    opt = opt || {};
    var rings = LM.geo.rings(), pts = [];
    for (var i = 0; i < rings.length; i++) {
      var ring = rings[i];
      for (var j = 0; j < ring.length - 2; j += 2) {
        var a = LM.geo.toFlat(ring[j + 1], ring[j], width);
        var b = LM.geo.toFlat(ring[j + 3], ring[j + 2], width);
        if (Math.abs(a.x - b.x) > width * 0.5) continue; // antimeridian wrap
        pts.push(a.x, 0, a.z, b.x, 0, b.z);
      }
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    var m = new THREE.LineBasicMaterial({
      color: opt.color !== undefined ? opt.color : LM.C.ink,
      transparent: true, opacity: opt.opacity !== undefined ? opt.opacity : 0.26
    });
    return new THREE.LineSegments(g, m);
  };

  // Rasterised land mask -> DataTexture (1 = land). Built from the vendored rings.
  LM.geo.landMask = function (w, h) {
    w = w || 512; h = h || 256;
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    var c = cv.getContext('2d');
    c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff';
    var rings = LM.geo.rings();
    for (var i = 0; i < rings.length; i++) {
      var ring = rings[i];
      c.beginPath();
      for (var j = 0; j < ring.length; j += 2) {
        var x = (ring[j] + 180) / 360 * w, y = (90 - ring[j + 1]) / 180 * h;
        if (j === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.closePath(); c.fill();
    }
    var img = c.getImageData(0, 0, w, h);
    var tex = new THREE.DataTexture(img.data, w, h, THREE.RGBAFormat);
    tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
    tex.wrapS = THREE.RepeatWrapping;
    tex.needsUpdate = true;
    tex.sampler = function (lat, lon) {
      var x = Math.floor((lon + 180) / 360 * w), y = Math.floor((90 - lat) / 180 * h);
      x = LM.clamp(x, 0, w - 1); y = LM.clamp(y, 0, h - 1);
      return img.data[(y * w + x) * 4] > 127;
    };
    return tex;
  };

  LM.geo.graticule = function (r, opt) {
    opt = opt || {};
    var step = opt.step || 20, seg = 96, pts = [];
    var i, j, a, b;
    for (i = -80; i <= 80; i += step) {
      for (j = 0; j < seg; j++) {
        a = LM.geo.toVec3(i, j / seg * 360 - 180, r);
        b = LM.geo.toVec3(i, (j + 1) / seg * 360 - 180, r);
        pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
    for (i = -180; i < 180; i += step) {
      for (j = 0; j < seg / 2; j++) {
        a = LM.geo.toVec3(j / (seg / 2) * 180 - 90, i, r);
        b = LM.geo.toVec3((j + 1) / (seg / 2) * 180 - 90, i, r);
        pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return new THREE.LineSegments(g, new THREE.LineBasicMaterial({
      color: opt.color !== undefined ? opt.color : LM.C.slate,
      transparent: true, opacity: opt.opacity !== undefined ? opt.opacity : 0.13
    }));
  };

  /* Complete styled planet: body, atmospheric rim, graticule, coastlines and
     the land dot-matrix. Returns the group plus its parts.
     Requires LM.pixUniform(ctx) to be passed as opt.pix. */
  LM.globe = function (ctx, R, opt) {
    opt = opt || {};
    var g = new THREE.Group();

    var body = new THREE.Mesh(
      new THREE.SphereGeometry(R * 0.995, 96, 64),
      new THREE.MeshLambertMaterial({ color: opt.bodyColor !== undefined ? opt.bodyColor : 0xfcfcfb })
    );
    g.add(body);

    var rim = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.05, 64, 48),
      new THREE.ShaderMaterial({
        transparent: true, side: THREE.BackSide, depthWrite: false,
        uniforms: { uCol: { value: new THREE.Color(opt.rimColor !== undefined ? opt.rimColor : LM.C.accent) },
                    uStr: { value: opt.rimStrength !== undefined ? opt.rimStrength : 0.26 } },
        vertexShader: 'varying vec3 vN;varying vec3 vP;void main(){vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vP=mv.xyz;gl_Position=projectionMatrix*mv;}',
        fragmentShader: 'uniform vec3 uCol;uniform float uStr;varying vec3 vN;varying vec3 vP;void main(){float f=pow(1.0-abs(dot(normalize(vN),normalize(-vP))),4.5);gl_FragColor=vec4(uCol,f*uStr);}'
      })
    );
    g.add(rim);

    var grat = LM.geo.graticule(R * 1.001, { opacity: opt.gratOpacity !== undefined ? opt.gratOpacity : 0.09 });
    g.add(grat);
    var coast = LM.geo.landGlobe(R * 1.003, { opacity: opt.coastOpacity !== undefined ? opt.coastOpacity : 0.38, color: LM.C.ink });
    g.add(coast);

    var dots = null, mask = LM.geo.landMask(700, 350);
    if (opt.dots !== false) {
      var pts = [], step = opt.dotStep || 1.35;
      for (var lat = -84; lat <= 84; lat += step) {
        var circ = Math.cos(lat * Math.PI / 180);
        var lonStep = step / Math.max(circ, 0.14);
        for (var lon = -180; lon < 180; lon += lonStep) {
          if (!mask.sampler(lat, lon)) continue;
          var p = LM.geo.toVec3(lat, lon, R * 1.004);
          pts.push(p.x, p.y, p.z);
        }
      }
      var dg = new THREE.BufferGeometry();
      dg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      var dm = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false,
        uniforms: {
          uCol: { value: new THREE.Color(opt.dotColor !== undefined ? opt.dotColor : 0x253341) },
          uSize: { value: opt.dotSize || 0.036 },
          uPix: opt.pix,
          uAlpha: { value: opt.dotAlpha !== undefined ? opt.dotAlpha : 0.88 }
        },
        vertexShader: [
          LM.glsl.psize,
          'uniform float uSize;varying float vF;',
          'void main(){vec4 mv=modelViewMatrix*vec4(position,1.);',
          ' vec3 n=normalize(normalMatrix*normalize(position));',
          ' vF=smoothstep(-0.08,0.42,dot(n,normalize(-mv.xyz)));',
          ' gl_PointSize=lmSize(uSize,mv);gl_Position=projectionMatrix*mv;}'
        ].join('\n'),
        fragmentShader: [
          'uniform vec3 uCol;uniform float uAlpha;varying float vF;',
          'void main(){float d=length(gl_PointCoord-0.5)*2.0;if(d>1.0)discard;',
          ' gl_FragColor=vec4(uCol,(1.0-smoothstep(0.55,1.0,d))*vF*uAlpha);}'
        ].join('\n')
      });
      dots = new THREE.Points(dg, dm);
      g.add(dots);
    }

    ctx.scene.add(g);
    return { group: g, body: body, rim: rim, graticule: grat, coast: coast, dots: dots, mask: mask, R: R };
  };

  // great-circle-ish arc between two points on a sphere
  LM.geo.arc = function (a, b, lift) {
    var mid = a.clone().add(b).multiplyScalar(0.5);
    var d = a.distanceTo(b);
    mid.normalize().multiplyScalar(a.length() + d * (lift === undefined ? 0.38 : lift));
    var q1 = a.clone().lerp(mid, 0.5).normalize().multiplyScalar(LM.lerp(a.length(), mid.length(), 0.6));
    var q2 = b.clone().lerp(mid, 0.5).normalize().multiplyScalar(LM.lerp(b.length(), mid.length(), 0.6));
    return new THREE.CatmullRomCurve3([a, q1, mid, q2, b]);
  };

  /* ---------------------------------------------------------
     LABEL SPRITES
     --------------------------------------------------------- */
  LM.label = function (text, opt) {
    opt = opt || {};
    var size = opt.size || 44, pad = 12;
    var weight = opt.weight || 600;
    var cv = document.createElement('canvas'), c = cv.getContext('2d');
    var font = weight + ' ' + size + 'px Archivo, Arial, sans-serif';
    c.font = font;
    var w = Math.ceil(c.measureText(text).width) + pad * 2;
    var h = Math.ceil(size * 1.5);
    cv.width = w; cv.height = h;
    c = cv.getContext('2d');
    c.font = font;
    c.textBaseline = 'middle';
    if (opt.bg) {
      c.fillStyle = opt.bg;
      var r = h * 0.3;
      c.beginPath();
      c.moveTo(r, 0); c.arcTo(w, 0, w, h, r); c.arcTo(w, h, 0, h, r);
      c.arcTo(0, h, 0, 0, r); c.arcTo(0, 0, w, 0, r); c.closePath(); c.fill();
    }
    c.fillStyle = opt.color || '#0d161f';
    c.fillText(text, pad, h / 2 + 1);
    var tex = new THREE.CanvasTexture(cv);
    tex.minFilter = THREE.LinearFilter;
    tex.anisotropy = 4;
    var mat = new THREE.SpriteMaterial({
      map: tex, transparent: true, depthTest: opt.depthTest !== false,
      depthWrite: false, opacity: opt.opacity !== undefined ? opt.opacity : 1
    });
    var s = new THREE.Sprite(mat);
    var scale = (opt.scale || 1) * 0.011;
    s.scale.set(w * scale, h * scale, 1);
    s.userData.aspect = w / h;
    return s;
  };

  /* ---------------------------------------------------------
     UI KIT
     --------------------------------------------------------- */
  LM.ui = {};
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  LM.ui.el = el;

  LM.ui.slider = function (parent, o) {
    var wrap = el('div', 'ctrl');
    var lab = el('label');
    var fmt = o.fmt || function (v) { return v; };
    lab.innerHTML = '<span>' + o.label + '</span><span class="val">' + fmt(o.value) + '</span>';
    var inp = el('input');
    inp.type = 'range';
    inp.min = o.min; inp.max = o.max; inp.step = o.step !== undefined ? o.step : 0.01;
    inp.value = o.value;
    inp.addEventListener('input', function () {
      var v = parseFloat(inp.value);
      lab.lastChild.textContent = fmt(v);
      if (o.on) o.on(v);
    });
    wrap.appendChild(lab); wrap.appendChild(inp);
    parent.appendChild(wrap);
    return {
      el: inp,
      set: function (v) { inp.value = v; lab.lastChild.textContent = fmt(v); if (o.on) o.on(v); },
      get: function () { return parseFloat(inp.value); }
    };
  };

  LM.ui.seg = function (parent, o) {
    var wrap = el('div', 'ctrl');
    if (o.label) wrap.appendChild(el('label', null, '<span>' + o.label + '</span>'));
    var box = el('div', 'seg');
    var btns = [];
    o.options.forEach(function (op, i) {
      var b = el('button', null, op.label !== undefined ? op.label : op);
      var val = op.value !== undefined ? op.value : (op.label !== undefined ? op.label : op);
      b.addEventListener('click', function () {
        btns.forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        if (o.on) o.on(val, i);
      });
      if (val === o.value || i === o.index) b.classList.add('on');
      btns.push(b); box.appendChild(b);
    });
    wrap.appendChild(box); parent.appendChild(wrap);
    return { el: box, btns: btns, select: function (i) { btns[i].click(); } };
  };

  LM.ui.check = function (parent, o) {
    var l = el('label', 'chk');
    var i = el('input'); i.type = 'checkbox'; i.checked = !!o.value;
    l.appendChild(i); l.appendChild(el('span', null, o.label));
    i.addEventListener('change', function () { if (o.on) o.on(i.checked); });
    parent.appendChild(l);
    return { el: i, get: function () { return i.checked; }, set: function (v) { i.checked = v; if (o.on) o.on(v); } };
  };

  LM.ui.button = function (parent, o) {
    var b = el('button', 'btn' + (o.solid ? ' solid' : ''), o.label);
    b.style.width = '100%';
    b.addEventListener('click', function () { if (o.on) o.on(); });
    parent.appendChild(b);
    return b;
  };

  // stats grid -> returns set(key, value, accentBool)
  LM.ui.stats = function (parent, defs) {
    var box = el('div', 'stats');
    var map = {};
    defs.forEach(function (d) {
      var s = el('div', 'stat');
      s.appendChild(el('div', 'k', d.k));
      var v = el('div', 'v' + (d.accent ? ' accent' : ''), d.v !== undefined ? d.v : '—');
      s.appendChild(v);
      box.appendChild(s);
      map[d.id] = v;
    });
    parent.appendChild(box);
    return function (id, val) { if (map[id]) map[id].innerHTML = val; };
  };

  LM.ui.legend = function (parent, rows) {
    var box = el('div', 'legend');
    rows.forEach(function (r) {
      var row = el('div', 'row');
      var sw = el('span', 'sw' + (r.round ? ' round' : ''));
      sw.style.background = r.color;
      if (r.ring) { sw.style.background = 'transparent'; sw.style.boxShadow = 'inset 0 0 0 2px ' + r.color; }
      row.appendChild(sw);
      row.appendChild(el('span', null, '<span class="lbl">' + r.label + '</span>' + (r.sub ? '<span class="sub">' + r.sub + '</span>' : '')));
      box.appendChild(row);
    });
    parent.appendChild(box);
    return box;
  };

  /* ---------------------------------------------------------
     TOOLTIP + PICKING
     --------------------------------------------------------- */
  LM.tip = {
    _el: null,
    node: function () {
      if (!this._el) {
        this._el = document.getElementById('tip');
        if (!this._el) { this._el = el('div'); this._el.id = 'tip'; document.body.appendChild(this._el); }
      }
      return this._el;
    },
    show: function (x, y, html) {
      var n = this.node();
      n.innerHTML = html;
      n.style.opacity = '1';
      var w = n.offsetWidth, h = n.offsetHeight;
      n.style.left = Math.min(x + 16, window.innerWidth - w - 10) + 'px';
      n.style.top = Math.max(10, y - h - 12) + 'px';
    },
    hide: function () { this.node().style.opacity = '0'; }
  };

  LM.pointer = function (dom, cb) {
    var v = new THREE.Vector2(-9, -9);
    dom.addEventListener('pointermove', function (e) {
      v.x = (e.clientX / window.innerWidth) * 2 - 1;
      v.y = -(e.clientY / window.innerHeight) * 2 + 1;
      if (cb) cb(v, e);
    });
    dom.addEventListener('pointerleave', function () { v.set(-9, -9); if (cb) cb(v, null); });
    return v;
  };

  /* ---------------------------------------------------------
     SYNTHETIC TRIAL DATA  (plausible, deterministic)
     --------------------------------------------------------- */
  var SITES = [
    // name, country, region, lat, lon, utc offset
    ['Boston, MA', 'United States', 'NA', 42.36, -71.06, -5],
    ['Durham, NC', 'United States', 'NA', 35.99, -78.90, -5],
    ['Houston, TX', 'United States', 'NA', 29.76, -95.37, -6],
    ['Rochester, MN', 'United States', 'NA', 44.02, -92.47, -6],
    ['Cleveland, OH', 'United States', 'NA', 41.50, -81.69, -5],
    ['New York, NY', 'United States', 'NA', 40.71, -74.01, -5],
    ['Chicago, IL', 'United States', 'NA', 41.88, -87.63, -6],
    ['Los Angeles, CA', 'United States', 'NA', 34.05, -118.24, -8],
    ['Seattle, WA', 'United States', 'NA', 47.61, -122.33, -8],
    ['Atlanta, GA', 'United States', 'NA', 33.75, -84.39, -5],
    ['Miami, FL', 'United States', 'NA', 25.76, -80.19, -5],
    ['Denver, CO', 'United States', 'NA', 39.74, -104.99, -7],
    ['Toronto', 'Canada', 'NA', 43.65, -79.38, -5],
    ['Montreal', 'Canada', 'NA', 45.50, -73.57, -5],
    ['Vancouver', 'Canada', 'NA', 49.28, -123.12, -8],
    ['Mexico City', 'Mexico', 'LATAM', 19.43, -99.13, -6],
    ['Sao Paulo', 'Brazil', 'LATAM', -23.55, -46.63, -3],
    ['Rio de Janeiro', 'Brazil', 'LATAM', -22.91, -43.17, -3],
    ['Porto Alegre', 'Brazil', 'LATAM', -30.03, -51.23, -3],
    ['Buenos Aires', 'Argentina', 'LATAM', -34.60, -58.38, -3],
    ['Santiago', 'Chile', 'LATAM', -33.45, -70.67, -4],
    ['Bogota', 'Colombia', 'LATAM', 4.71, -74.07, -5],
    ['Lima', 'Peru', 'LATAM', -12.05, -77.04, -5],
    ['London', 'United Kingdom', 'EU', 51.51, -0.13, 0],
    ['Manchester', 'United Kingdom', 'EU', 53.48, -2.24, 0],
    ['Edinburgh', 'United Kingdom', 'EU', 55.95, -3.19, 0],
    ['Dublin', 'Ireland', 'EU', 53.35, -6.26, 0],
    ['Paris', 'France', 'EU', 48.86, 2.35, 1],
    ['Lyon', 'France', 'EU', 45.76, 4.84, 1],
    ['Madrid', 'Spain', 'EU', 40.42, -3.70, 1],
    ['Barcelona', 'Spain', 'EU', 41.39, 2.17, 1],
    ['Milan', 'Italy', 'EU', 45.46, 9.19, 1],
    ['Rome', 'Italy', 'EU', 41.90, 12.50, 1],
    ['Berlin', 'Germany', 'EU', 52.52, 13.41, 1],
    ['Munich', 'Germany', 'EU', 48.14, 11.58, 1],
    ['Heidelberg', 'Germany', 'EU', 49.40, 8.67, 1],
    ['Amsterdam', 'Netherlands', 'EU', 52.37, 4.90, 1],
    ['Leuven', 'Belgium', 'EU', 50.88, 4.70, 1],
    ['Copenhagen', 'Denmark', 'EU', 55.68, 12.57, 1],
    ['Stockholm', 'Sweden', 'EU', 59.33, 18.07, 1],
    ['Oslo', 'Norway', 'EU', 59.91, 10.75, 1],
    ['Helsinki', 'Finland', 'EU', 60.17, 24.94, 2],
    ['Warsaw', 'Poland', 'EU', 52.23, 21.01, 1],
    ['Krakow', 'Poland', 'EU', 50.06, 19.94, 1],
    ['Prague', 'Czechia', 'EU', 50.08, 14.44, 1],
    ['Budapest', 'Hungary', 'EU', 47.50, 19.04, 1],
    ['Vienna', 'Austria', 'EU', 48.21, 16.37, 1],
    ['Zurich', 'Switzerland', 'EU', 47.38, 8.54, 1],
    ['Lisbon', 'Portugal', 'EU', 38.72, -9.14, 0],
    ['Athens', 'Greece', 'EU', 37.98, 23.73, 2],
    ['Bucharest', 'Romania', 'EU', 44.43, 26.10, 2],
    ['Istanbul', 'Turkey', 'EMEA', 41.01, 28.98, 3],
    ['Tel Aviv', 'Israel', 'EMEA', 32.08, 34.78, 2],
    ['Cairo', 'Egypt', 'EMEA', 30.04, 31.24, 2],
    ['Johannesburg', 'South Africa', 'EMEA', -26.20, 28.05, 2],
    ['Cape Town', 'South Africa', 'EMEA', -33.92, 18.42, 2],
    ['Nairobi', 'Kenya', 'EMEA', -1.29, 36.82, 3],
    ['Lagos', 'Nigeria', 'EMEA', 6.52, 3.38, 1],
    ['Dubai', 'UAE', 'EMEA', 25.20, 55.27, 4],
    ['Mumbai', 'India', 'APAC', 19.08, 72.88, 5.5],
    ['New Delhi', 'India', 'APAC', 28.61, 77.21, 5.5],
    ['Bengaluru', 'India', 'APAC', 12.97, 77.59, 5.5],
    ['Chennai', 'India', 'APAC', 13.08, 80.27, 5.5],
    ['Hyderabad', 'India', 'APAC', 17.39, 78.49, 5.5],
    ['Bangkok', 'Thailand', 'APAC', 13.76, 100.50, 7],
    ['Singapore', 'Singapore', 'APAC', 1.35, 103.82, 8],
    ['Kuala Lumpur', 'Malaysia', 'APAC', 3.14, 101.69, 8],
    ['Jakarta', 'Indonesia', 'APAC', -6.21, 106.85, 7],
    ['Manila', 'Philippines', 'APAC', 14.60, 120.98, 8],
    ['Ho Chi Minh City', 'Vietnam', 'APAC', 10.82, 106.63, 7],
    ['Hong Kong', 'Hong Kong', 'APAC', 22.32, 114.17, 8],
    ['Shanghai', 'China', 'APAC', 31.23, 121.47, 8],
    ['Beijing', 'China', 'APAC', 39.90, 116.41, 8],
    ['Guangzhou', 'China', 'APAC', 23.13, 113.26, 8],
    ['Chengdu', 'China', 'APAC', 30.57, 104.07, 8],
    ['Seoul', 'South Korea', 'APAC', 37.57, 126.98, 9],
    ['Tokyo', 'Japan', 'APAC', 35.68, 139.69, 9],
    ['Osaka', 'Japan', 'APAC', 34.69, 135.50, 9],
    ['Taipei', 'Taiwan', 'APAC', 25.03, 121.57, 8],
    ['Sydney', 'Australia', 'APAC', -33.87, 151.21, 10],
    ['Melbourne', 'Australia', 'APAC', -37.81, 144.96, 10],
    ['Brisbane', 'Australia', 'APAC', -27.47, 153.03, 10],
    ['Perth', 'Australia', 'APAC', -31.95, 115.86, 8],
    ['Auckland', 'New Zealand', 'APAC', -36.85, 174.76, 12]
  ];

  LM.REGIONS = {
    NA: { label: 'North America', color: LM.C.accent },
    LATAM: { label: 'Latin America', color: LM.C.amber },
    EU: { label: 'Europe', color: LM.C.slate },
    EMEA: { label: 'Middle East & Africa', color: LM.C.violet },
    APAC: { label: 'Asia-Pacific', color: LM.C.teal }
  };

  // Build the canonical synthetic study: 84 sites, ~2,400 planned patients.
  LM.study = (function () {
    var rnd = LM.rng(20260411);
    var sites = SITES.map(function (s, i) {
      var region = s[2];
      // activation staggered by region: NA/EU first, APAC later
      var regionLag = { NA: 0, EU: 28, LATAM: 62, EMEA: 88, APAC: 74 }[region];
      var activation = Math.round(regionLag + rnd() * 150);          // days from first-site-ready
      var target = 12 + Math.floor(rnd() * 34);                      // planned enrolment
      var rate = 0.35 + rnd() * 1.65;                                // patients / site / month
      var quality = 0.55 + rnd() * 0.45;                             // data quality index
      var screenFail = 0.18 + rnd() * 0.30;
      var dropout = 0.04 + rnd() * 0.16;
      return {
        id: 'S' + String(101 + i),
        name: s[0], country: s[1], region: region,
        lat: s[3], lon: s[4], tz: s[5],
        activation: activation,
        target: target,
        rate: rate,
        quality: quality,
        screenFail: screenFail,
        dropout: dropout,
        // derived risk signals
        deviations: Math.max(0, Math.round(LM.gauss(rnd) * 3.4 + (1 - quality) * 14)),
        queries: Math.max(0, Math.round(LM.gauss(rnd) * 8 + (1 - quality) * 46 + 9)),
        enrolled: 0, screened: 0
      };
    });
    // run a 24-month enrolment simulation so every page shares the same truth
    var MONTHS = 30;
    var curve = [];
    for (var m = 0; m < MONTHS; m++) {
      var day = m * 30.4, total = 0, active = 0;
      for (var i = 0; i < sites.length; i++) {
        var s = sites[i];
        if (day < s.activation) continue;
        active++;
        var monthsOpen = (day - s.activation) / 30.4;
        // logistic-ish ramp, capped at target
        var e = s.target * (1 - Math.exp(-s.rate * monthsOpen / Math.max(s.target * 0.22, 1)));
        total += Math.min(e, s.target);
        if (m === MONTHS - 1) { s.enrolled = Math.round(Math.min(e, s.target)); s.screened = Math.round(s.enrolled / (1 - s.screenFail)); }
      }
      curve.push({ month: m, enrolled: Math.round(total), activeSites: active });
    }
    var planned = sites.reduce(function (a, s) { return a + s.target; }, 0);
    return {
      protocol: 'LMK-204',
      title: 'A Phase III, Randomised, Double-Blind, Placebo-Controlled Study',
      indication: 'Metastatic Solid Tumours',
      sites: sites,
      regions: Object.keys(LM.REGIONS),
      months: MONTHS,
      curve: curve,
      planned: planned,
      enrolled: sites.reduce(function (a, s) { return a + s.enrolled; }, 0),
      arms: [
        { id: 'A', label: 'Investigational 200 mg', color: LM.C.accent, alloc: 0.4 },
        { id: 'B', label: 'Investigational 100 mg', color: LM.C.violet, alloc: 0.2 },
        { id: 'C', label: 'Placebo', color: LM.C.slate, alloc: 0.4 }
      ]
    };
  })();

  /* ---------------------------------------------------------
     MANIFEST — single source of truth for the gallery + nav
     --------------------------------------------------------- */
  LM.manifest = [
    { n: 1, slug: '01-trial-phases', t: 'The Phase Cascade', g: 'Design & Startup', d: 'Where a molecule loses 90% of its candidates — Phase I to IV attrition as a particle cascade.' },
    { n: 2, slug: '02-protocol-design', t: 'Protocol Lattice', g: 'Design & Startup', d: 'The schedule of assessments as a procedural lattice: visits, procedures and burden per arm.' },
    { n: 3, slug: '03-eligibility-sieve', t: 'The Eligibility Sieve', g: 'Design & Startup', d: 'Inclusion and exclusion criteria as stacked filters — watch a population narrow to the eligible few.' },
    { n: 4, slug: '04-site-feasibility', t: 'Site Feasibility Field', g: 'Design & Startup', d: 'Scoring 84 candidate sites on a globe: population access, past performance, startup drag.' },
    { n: 5, slug: '05-country-startup', t: 'Regulatory Runway', g: 'Design & Startup', d: 'Country-by-country startup: submission, approval, contract and first-patient-in as a 3D gantt.' },
    { n: 6, slug: '06-enrollment-globe', t: 'Enrollment Accretion', g: 'Global Operations', d: 'Thirty months of global enrolment accreting onto the planet, site by site.' },
    { n: 7, slug: '07-timezone-wave', t: 'Follow the Sun', g: 'Global Operations', d: 'A trial never sleeps: the 24-hour terminator sweeping across active sites and data capture.' },
    { n: 8, slug: '08-site-activation', t: 'Activation Cascade', g: 'Global Operations', d: 'Site activation ripples outward from first-site-ready — the shape of a startup curve.' },
    { n: 9, slug: '09-patient-journey', t: 'Patient Journeys', g: 'Global Operations', d: 'Every enrolled patient as a thread through screening, randomisation, visits and exit.' },
    { n: 10, slug: '10-supply-chain', t: 'Cold Chain', g: 'Global Operations', d: 'Investigational product moving from depot to site, with temperature excursions in flight.' },
    { n: 11, slug: '11-randomization', t: 'Randomisation & Blind', g: 'Conduct & Safety', d: 'A single stream of patients splitting into arms under stratified block randomisation.' },
    { n: 12, slug: '12-dose-escalation', t: 'Dose Escalation', g: 'Conduct & Safety', d: 'The 3+3 ladder: cohorts climbing until dose-limiting toxicity stops the ascent.' },
    { n: 13, slug: '13-retention', t: 'Retention Surface', g: 'Conduct & Safety', d: 'Kaplan-Meier survival rendered as a surface — where and when patients are lost.' },
    { n: 14, slug: '14-adverse-events', t: 'Safety Signal Space', g: 'Conduct & Safety', d: 'Adverse events by MedDRA system organ class, severity and arm imbalance.' },
    { n: 15, slug: '15-deviations', t: 'Deviation Lattice', g: 'Conduct & Safety', d: 'Protocol deviations and query burden per site, per month — the texture of trial quality.' },
    { n: 16, slug: '16-data-flow', t: 'Data Pipeline', g: 'Data & Evidence', d: 'Source to lock: capture, query, reconcile, freeze — a GPU particle pipeline.' },
    { n: 17, slug: '17-risk-monitoring', t: 'Risk Surface', g: 'Data & Evidence', d: 'Risk-based monitoring: key risk indicators as a deforming field over the site network.' },
    { n: 18, slug: '18-endpoint-analysis', t: 'Endpoint Readout', g: 'Data & Evidence', d: 'The primary endpoint: effect size, confidence, and the posterior you actually care about.' },
    { n: 19, slug: '19-evidence-graph', t: 'Evidence Graph', g: 'Data & Evidence', d: 'Literature, entities and trials resolved into one force-directed graph, computed on the GPU.' },
    { n: 20, slug: '20-digital-twin', t: 'The Digital Twin', g: 'Data & Evidence', d: 'Every layer at once — the live, geo-centric twin of a running global trial.' }
  ];
  LM.bySlug = function (s) { for (var i = 0; i < LM.manifest.length; i++) if (LM.manifest[i].slug === s) return LM.manifest[i]; return null; };

  /* ---------------------------------------------------------
     PAGE CHROME — brand + prev/next nav + tooltip node
     --------------------------------------------------------- */
  LM.chrome = function (slug) {
    var i = LM.manifest.findIndex(function (m) { return m.slug === slug; });
    var cur = LM.manifest[i] || { n: 0, t: '' };
    var prev = LM.manifest[(i - 1 + LM.manifest.length) % LM.manifest.length];
    var next = LM.manifest[(i + 1) % LM.manifest.length];

    var b = el('a', 'brand');
    b.href = '../index.html';
    b.innerHTML = '<span class="dot"></span><span><b>Labmarket</b> <span>Clinical Trial Atlas</span></span>';
    document.body.appendChild(b);

    var nav = el('div', 'nav');
    nav.innerHTML =
      '<a href="' + prev.slug + '.html" title="' + prev.t + '">&larr;</a>' +
      '<span class="idx">' + String(cur.n).padStart(2, '0') + ' / 20</span>' +
      '<a href="' + next.slug + '.html" title="' + next.t + '">&rarr;</a>' +
      '<a href="../index.html">All 20</a>';
    document.body.appendChild(nav);

    document.title = cur.t + ' — Labmarket Clinical Trial Atlas';

    window.addEventListener('keydown', function (e) {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft') location.href = prev.slug + '.html';
      if (e.key === 'ArrowRight') location.href = next.slug + '.html';
      if (e.key === 'Escape') location.href = '../index.html';
    });
    LM.tip.node();
    return cur;
  };

})(window);
