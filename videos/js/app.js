var ROOT_FOLDER = '1kjdJkyJuB9V5XnZtZpxrrQHNliUYFv5j';
var W = window.innerWidth, H = window.innerHeight;

var VIDEO_SCALE = 6.0;
var PULL_DIST   = 200;

// Frame thumbnails are grabbed at these fractions of the video's duration
// (must match the positions used in setup_thumbs.py)
var FRAME_SEEK = [0.10, 0.30, 0.60, 0.85];

// ── scene ─────────────────────────────────────────────────────────
var scene, camera, renderer, raycaster;
var mouse = new THREE.Vector2();

// ── graph ─────────────────────────────────────────────────────────
var nodes        = [];
var links        = [];
var clickables   = [];
var meshNode     = {};
var _rootNode    = null;
var _folderNodes = [];

// ── force params ──────────────────────────────────────────────────
var DAMPING   = 0.80;
var REPULSION = 12000;
var FOCUS_REP = 120000;
var DIST_CUT  = 600;
var DIST_CUT2 = DIST_CUT * DIST_CUT;
var CELL_SIZE = DIST_CUT;
var MAX_VEL   = 25;

// ── GPU compute constants ─────────────────────────────────────────
var TEX_W       = 64;   // position texture side — fits up to 4096 non-frame nodes
var MAX_SPRINGS = 32;   // max springs per node stored in GPU texture

var SPRING = { // len=rest length (world units), k=spring constant
  'root-folder':   { len: 550, k: 0.014 },
  'folder-folder': { len: 170, k: 0.05  },
  'folder-video':  { len: 160, k: 0.07  },
  'folder-image':  { len: 160, k: 0.07  },
  'video-frame':   { len: 100, k: 0.10  }
};

// ── camera pan / zoom ─────────────────────────────────────────────
var panCur  = { x: 0, y: 0 };
var panDest = { x: 0, y: 0 };
// Orthographic zoom: world units visible across the viewport width.
// Smaller = more zoomed in. camera.zoom = W / zoomCur.
var zoomCur  = 5000;
var zoomDest = 5000;

var _mouseDown       = false;
var _hasDragged      = false;
var _dragOriginMouse = { x: 0, y: 0 };
var _dragOriginPan   = { x: 0, y: 0 };
var _mouseClientX    = 0;
var _mouseClientY    = 0;
var _mouseMoved      = false;

// ── state ─────────────────────────────────────────────────────────
var hoveredNode      = null;
var selectedNode     = null;   // folder, video, or frame
var _highlightFolder = null;   // folder node currently highlighted (or null)
var _highlightChain  = null;   // Set of nodes in hovered ancestor chain (or null)
var _activeFrame          = null;   // frame whose link to video is highlighted
var _activeFrameLockedByClick = false; // true when set by click (not just hover)
var _simEnergy = Infinity;     // kinetic energy tracker for sim cooldown

// vertical column to the right of the video.
// x = half video width (288) + 20 gap + half thumb (48) = 356
// y spacing: 54 (thumb height) + 12 gap = 66 per slot; 4 thumbs centered at 0
var FRAME_OFFSETS = [
  { x: 356, y:  99 },
  { x: 356, y:  33 },
  { x: 356, y: -33 },
  { x: 356, y: -99 }
];

// ── bubble-in ────────────────────────────────────────────────────
var _bubbleCount   = 0;
var _bubbleT0      = null;
var _thumbImgCache = {};
var _thumbManifest = null;  // Set<id> of locally available thumbnails

fetch('thumbs/manifest.json')
  .then(function(r) { return r.json(); })
  .then(function(ids) { _thumbManifest = new Set(ids); })
  .catch(function() { _thumbManifest = new Set(); });

// result passed to cb: { img, isComposite, isTiny }
// cb may be called twice: first with isTiny=true (64×36 placeholder), then isTiny=false (full)
// isComposite=true  → 2×2 tile, crop by quadrant
// isComposite=false → single image, draw whole
var _tinyImgCache = {};

function getThumbImg(videoId, fallbackUrl, cb) {
  var hasLocal = !_thumbManifest || _thumbManifest.has(videoId);

  // --- full-size loader (called after tiny, or directly if no tiny) ---
  function loadFull() {
    if (videoId in _thumbImgCache) { cb(_thumbImgCache[videoId]); return; }
    function tryFallback() {
      if (fallbackUrl) {
        var img2 = new Image();
        img2.crossOrigin = 'anonymous';
        img2.onload  = function() { _thumbImgCache[videoId] = { img: img2, isComposite: false }; cb(_thumbImgCache[videoId]); };
        img2.onerror = function() { _thumbImgCache[videoId] = null; cb(null); };
        img2.src = fallbackUrl;
      } else {
        _thumbImgCache[videoId] = null; cb(null);
      }
    }
    if (!hasLocal) { tryFallback(); return; }
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = function() {
      var isComp = img.naturalWidth <= 450 && img.naturalHeight <= 250;
      _thumbImgCache[videoId] = { img: img, isComposite: isComp };
      cb(_thumbImgCache[videoId]);
    };
    img.onerror = function() { tryFallback(); };
    img.src = 'thumbs/' + videoId + '.jpg';
  }

  // --- tiny placeholder (64×36) first ---
  if (!hasLocal) { loadFull(); return; }

  if (videoId in _tinyImgCache) {
    if (_tinyImgCache[videoId]) cb(_tinyImgCache[videoId]);
    loadFull();
    return;
  }

  var tiny = new Image();
  tiny.crossOrigin = 'anonymous';
  tiny.onload = function() {
    _tinyImgCache[videoId] = { img: tiny, isComposite: false, isTiny: true };
    cb(_tinyImgCache[videoId]);
    loadFull();
  };
  tiny.onerror = function() {
    _tinyImgCache[videoId] = null;
    loadFull();
  };
  tiny.src = 'thumbs/tiny/' + videoId + '.jpg';
}

function bubbleIn(nd) {
  if (_bubbleT0 === null) _bubbleT0 = Date.now();
  var slot  = _bubbleCount++;
  var delay = Math.max(0, slot * 6 - (Date.now() - _bubbleT0));
  setTimeout(function() {
    if (nd === selectedNode) return;
    nd.targetScale = 1.0;
    for (var i = 0; i < nodes.length; i++) {
      var o = nodes[i];
      if (o === nd || o.fixed || o.targetScale === 0) continue;
      var dx = o.x - nd.x, dy = o.y - nd.y;
      var d2 = dx*dx + dy*dy;
      if (d2 < 0.01 || d2 > 320*320) continue;
      var d = Math.sqrt(d2), f = 3500 / d2;
      o.vx += dx/d*f; o.vy += dy/d*f;
    }
    nd.vx += (Math.random()-0.5)*2;
    nd.vy += (Math.random()-0.5)*2;
  }, delay);
}

// ── GPU physics + picking ─────────────────────────────────────────

var _gpuDirty   = true;
var _gpuReady   = false;

// ── flipbook sprite-sheet shader (1 texture upload, UV offset per frame) ──
var FLIPBOOK_VERT = [
  'varying vec2 vUv;',
  'void main(){',
  '  vUv = uv;',
  '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);',
  '}'
].join('\n');

var FLIPBOOK_FRAG = [
  'uniform sampler2D map;',
  'uniform float hasMap;',    // 0=placeholder, 1=texture ready
  'uniform float composite;', // 1=2×2 sprite sheet, 0=single image
  'uniform float time;',      // seconds, updated each frame
  'uniform float opacity;',
  'varying vec2 vUv;',
  'void main(){',
  '  vec2 uv;',
  '  if(composite > 0.5){',
  '    float fi = mod(floor(time * 2.0), 4.0);', // 2 flips per second
  '    float col = mod(fi, 2.0);',
  '    float row = floor(fi / 2.0);',
  '    uv = vUv * 0.5 + vec2(col * 0.5, (1.0 - row) * 0.5);',
  '  } else {',
  '    uv = vUv;',
  '  }',
  '  if(hasMap < 0.5){',
  '    gl_FragColor = vec4(0.1, 0.1, 0.1, opacity);',
  '  } else {',
  '    gl_FragColor = vec4(texture2D(map, uv).rgb, opacity);',
  '  }',
  '}'
].join('\n');

// physics ping-pong
var _physRtA = null, _physRtB = null;
var _physMat = null, _physScene = null, _physCam = null, _physQuad = null;
var _physReadback  = new Float32Array(TEX_W * TEX_W * 4);
var _physNodeList  = [];  // ordered non-frame nodes in GPU sim
var _physNodeIndex = null; // Map<node, gpuIndex>

// picking
var _pickRT  = null;
var _pickMat = null;
var _pickBuf = new Uint8Array(4);

function initGPU() {
  if (!renderer.capabilities.isWebGL2) {
    console.warn('[GPU] WebGL2 unavailable — CPU fallback');
    return;
  }

  // ── picking render target (half res is plenty) ────────────────
  _pickRT = new THREE.WebGLRenderTarget(
    Math.floor(W / 2), Math.floor(H / 2),
    { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
      type: THREE.UnsignedByteType, format: THREE.RGBAFormat,
      depthBuffer: true, stencilBuffer: false }
  );
  _pickMat = new THREE.ShaderMaterial({
    vertexShader: [
      'attribute vec3 pickColor;',
      'varying vec3 vPick;',
      'void main(){',
      '  vPick = pickColor;',
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);',
      '}'
    ].join('\n'),
    fragmentShader: [
      'varying vec3 vPick;',
      'void main(){ gl_FragColor = vec4(vPick,1.0); }'
    ].join('\n'),
  });

  // ── physics render targets (float RGBA) ───────────────────────
  var rtOpts = {
    minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
    type: THREE.FloatType, format: THREE.RGBAFormat,
    depthBuffer: false, stencilBuffer: false
  };
  _physRtA = new THREE.WebGLRenderTarget(TEX_W, TEX_W, rtOpts);
  _physRtB = new THREE.WebGLRenderTarget(TEX_W, TEX_W, rtOpts);

  _physCam   = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  _physScene = new THREE.Scene();
  _physQuad  = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
  _physScene.add(_physQuad);

  _physMat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: {
      posTex:    { value: null },
      springTex: { value: null },
      nodeCount: { value: 0 },
      texW:      { value: TEX_W },
      maxSpr:    { value: MAX_SPRINGS },
      repulsion: { value: REPULSION },
      distCut2:  { value: DIST_CUT2 },
      damping:   { value: DAMPING },
      maxVel:    { value: MAX_VEL },
    },
    vertexShader: `
      out vec2 vUv;
      void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }
    `,
    fragmentShader: `
      precision highp float;
      precision highp sampler2D;
      uniform sampler2D posTex;
      uniform sampler2D springTex;
      uniform int  nodeCount, texW, maxSpr;
      uniform float repulsion, distCut2, damping, maxVel;
      in vec2 vUv;
      out vec4 outColor;
      void main(){
        ivec2 coord = ivec2(gl_FragCoord.xy);
        int idx = coord.y * texW + coord.x;
        if(idx >= nodeCount){ outColor=vec4(0.0); return; }
        vec4 cur = texelFetch(posTex, coord, 0);
        vec2 pos=cur.xy, vel=cur.zw;
        if(cur.w > 9998.0){ outColor=cur; return; }   // fixed sentinel
        vec2 acc=vec2(0.0);
        // all-pairs repulsion (runs in parallel per node on GPU)
        for(int i=0;i<nodeCount;i++){
          if(i==idx) continue;
          vec2 op = texelFetch(posTex, ivec2(i%texW, i/texW), 0).xy;
          vec2 d  = pos-op;
          float d2=dot(d,d);
          if(d2<0.01||d2>distCut2) continue;
          acc += (d/sqrt(d2))*(repulsion/d2);
        }
        // springs stored in springTex: col=springSlot, row=nodeIdx
        for(int s=0;s<maxSpr;s++){
          vec4 sp = texelFetch(springTex, ivec2(s,idx), 0);
          if(sp.x<0.0) break;
          int ni=int(sp.x+0.5);
          vec2 np = texelFetch(posTex, ivec2(ni%texW,ni/texW), 0).xy;
          vec2 d  = np-pos;
          float dn=length(d);
          if(dn<0.001) continue;
          acc += (d/dn)*((dn-sp.y)*sp.z);
        }
        vel=(vel+acc)*damping;
        float spd=length(vel);
        if(spd>maxVel) vel=normalize(vel)*maxVel;
        outColor=vec4(pos+vel,vel);
      }
    `,
    depthTest: false, depthWrite: false,
  });
  _physQuad.material = _physMat;
  _gpuReady = true;
}

function rebuildGPU() {
  _gpuDirty = false;
  if (!_gpuReady) return;

  // non-frame nodes only — frames are handled by CPU orbit spring
  _physNodeList  = nodes.filter(function(n){ return n.type !== 'frame'; });
  _physNodeIndex = new Map();
  _physNodeList.forEach(function(n, i){ _physNodeIndex.set(n, i); });
  var N = _physNodeList.length;
  _physMat.uniforms.nodeCount.value = N;

  // position + velocity texture (R=x, G=y, B=vx, A=vy; vy=9999 = fixed)
  var posData = new Float32Array(TEX_W * TEX_W * 4);
  _physNodeList.forEach(function(n, i){
    posData[i*4]   = n.x;
    posData[i*4+1] = n.y;
    posData[i*4+2] = n.fixed ? 0    : n.vx;
    posData[i*4+3] = n.fixed ? 9999 : n.vy;
  });
  var initTex = new THREE.DataTexture(posData, TEX_W, TEX_W, THREE.RGBAFormat, THREE.FloatType);
  initTex.minFilter = initTex.magFilter = THREE.NearestFilter;
  initTex.needsUpdate = true;
  if (_physMat.uniforms.posTex.value && _physMat.uniforms.posTex.value.isDataTexture) {
    _physMat.uniforms.posTex.value.dispose();
  }
  _physMat.uniforms.posTex.value = initTex;

  // spring texture: col=springSlot (0..MAX_SPRINGS-1), row=nodeIdx
  // Each texel: (neighborIdx, restLen, k, 0); -1 in R = end of list
  var spData = new Float32Array(MAX_SPRINGS * N * 4);
  for (var i = 0; i < spData.length; i += 4) spData[i] = -1;
  var spCount = new Int32Array(N);
  links.forEach(function(lk){
    var si = _physNodeIndex.get(lk.source);
    var ti = _physNodeIndex.get(lk.target);
    if (si === undefined || ti === undefined) return; // frame endpoint
    var sp = SPRING[lk.type];
    function push(from, to){
      var c = spCount[from]; if(c >= MAX_SPRINGS) return;
      var b = (from * MAX_SPRINGS + c) * 4;
      spData[b]=to; spData[b+1]=sp.len; spData[b+2]=sp.k; spData[b+3]=0;
      spCount[from]++;
    }
    push(si, ti); push(ti, si);
  });
  var springTex = new THREE.DataTexture(spData, MAX_SPRINGS, N, THREE.RGBAFormat, THREE.FloatType);
  springTex.minFilter = springTex.magFilter = THREE.NearestFilter;
  springTex.needsUpdate = true;
  if (_physMat.uniforms.springTex.value) _physMat.uniforms.springTex.value.dispose();
  _physMat.uniforms.springTex.value = springTex;
}

function gpuPhysicsStep() {
  if (!_gpuReady || _physMat.uniforms.nodeCount.value === 0) return;
  // run one physics pass: read from current posTex, write to _physRtA
  renderer.setRenderTarget(_physRtA);
  renderer.render(_physScene, _physCam);
  renderer.setRenderTarget(null);
  // swap ping-pong
  var tmp = _physRtA; _physRtA = _physRtB; _physRtB = tmp;
  _physMat.uniforms.posTex.value = _physRtB.texture;
  // readback positions → update JS node positions (1-frame lag is fine)
  renderer.readRenderTargetPixels(_physRtB, 0, 0, TEX_W, TEX_W, _physReadback);
  var N = _physNodeList.length;
  for (var i = 0; i < N; i++) {
    var nd = _physNodeList[i];
    if (nd.fixed) continue;
    nd.x  = _physReadback[i*4];
    nd.y  = _physReadback[i*4+1];
    nd.vx = _physReadback[i*4+2];
    nd.vy = _physReadback[i*4+3];
  }
}

function cpuFrameStep() {
  // orbit: pull active video's frame nodes into the side column
  if (selectedNode && selectedNode.type === 'video') {
    var _as = selectedNode.aspectScale || 1;
    var _ts = selectedNode.targetScale || VIDEO_SCALE;
    var _halfW = (THUMB_W * _ts / 2) * _as;
    var _colX  = _halfW + 20 + THUMB_W / 2;
    for (var j = 0; j < selectedNode.children.length; j++) {
      var b = selectedNode.children[j];
      if (b.type !== 'frame') continue;
      var dx = (selectedNode.x + _colX) - b.x;
      var dy = selectedNode.y - b.y;
      b.vx = (b.vx + dx * 0.3) * 0.6;
      b.vy = (b.vy + dy * 0.3) * 0.6;
      b.x += b.vx; b.y += b.vy;
    }
  }
  // pull non-selected frame nodes to sit on top of their parent video
  for (var i = 0; i < nodes.length; i++) {
    var nd = nodes[i];
    if (nd.type !== 'frame' || nd.fixed) continue;
    if (selectedNode && nd.parentNode === selectedNode) continue;
    var p = nd.parentNode;
    if (p) {
      nd.vx = (nd.vx + (p.x - nd.x) * 0.06) * 0.72;
      nd.vy = (nd.vy + (p.y - nd.y) * 0.06) * 0.72;
      nd.x += nd.vx; nd.y += nd.vy;
    }
  }
}

function gpuPick(clientX, clientY) {
  if (!_gpuReady || !_pickRT) return null;
  var savedClear = new THREE.Color();
  var savedA = renderer.getClearAlpha();
  renderer.getClearColor(savedClear);
  renderer.setRenderTarget(_pickRT);
  renderer.setClearColor(0x000000, 1);
  renderer.clear();
  renderer.overrideMaterial = _pickMat;
  renderer.render(scene, camera);
  renderer.overrideMaterial = null;
  renderer.setRenderTarget(null);
  renderer.setClearColor(savedClear, savedA);
  // read 1 pixel (RT is half-res, so divide coords by 2)
  var px = Math.max(0, Math.min(_pickRT.width  - 1, Math.floor(clientX / 2)));
  var py = Math.max(0, Math.min(_pickRT.height - 1, Math.floor((H - clientY) / 2)));
  renderer.readRenderTargetPixels(_pickRT, px, py, 1, 1, _pickBuf);
  var id = (_pickBuf[0] << 16) | (_pickBuf[1] << 8) | _pickBuf[2];
  return id > 0 ? nodes[id - 1] : null;
}

function raycasterPick(clientX, clientY) {
  mouse.x =  (clientX / W) * 2 - 1;
  mouse.y = -(clientY / H) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  var hits = raycaster.intersectObjects(clickables);
  return hits.length ? meshNode[hits[0].object.uuid] : null;
}

// ─────────────────────────────────────────────────────────────────
function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080808);

  camera = new THREE.OrthographicCamera(-W/2, W/2, H/2, -H/2, 1, 20000);
  camera.position.set(0, 0, 1000);
  camera.lookAt(0, 0, 0);
  camera.zoom = W / zoomCur;
  camera.updateProjectionMatrix();

  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(W, H);
  initGPU();

  raycaster = new THREE.Raycaster();

  window.addEventListener('resize',   onResize);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mouseup',   onMouseUp);
  document.addEventListener('wheel',     onWheel, { passive: true });
  renderer.domElement.addEventListener('click', onClick);
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') goUpOne();
  });

  initScrub();
  loadGraph();
}

// ── scrub bar ─────────────────────────────────────────────────────
var _scrubEl = null, _scrubFillEl = null, _scrubTimeEl = null, _scrubDurEl = null, _scrubPlayEl = null;
var _scrubDragging = false;

function _fmtTime(t) {
  var m = Math.floor(t / 60), s = Math.floor(t % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
}

function initScrub() {
  _scrubEl     = document.getElementById('scrub');
  _scrubFillEl = document.getElementById('scrub-fill');
  _scrubTimeEl = document.getElementById('scrub-time');
  _scrubDurEl  = document.getElementById('scrub-dur');
  _scrubPlayEl = document.getElementById('scrub-play');
  if (!_scrubEl) return;

  var track   = document.getElementById('scrub-track');
  var vidEl   = document.getElementById('vid');
  var overlay = document.getElementById('vid-overlay');

  function doSeek(cx) {
    if (!vidEl || !isFinite(vidEl.duration)) return;
    var rect = track.getBoundingClientRect();
    var pct  = Math.max(0, Math.min(1, (cx - rect.left) / rect.width));
    vidEl.currentTime = vidEl.duration * pct;
  }

  track.addEventListener('mousedown', function(e) { e.stopPropagation(); _scrubDragging = true; doSeek(e.clientX); });
  window.addEventListener('mousemove', function(e) { if (_scrubDragging) doSeek(e.clientX); });
  window.addEventListener('mouseup',   function()  { _scrubDragging = false; });
  track.addEventListener('touchstart', function(e) { e.stopPropagation(); _scrubDragging = true; doSeek(e.touches[0].clientX); }, { passive: true });
  window.addEventListener('touchmove', function(e) { if (_scrubDragging) doSeek(e.touches[0].clientX); }, { passive: true });
  window.addEventListener('touchend',  function()  { _scrubDragging = false; });

  _scrubPlayEl.addEventListener('click', function(e) {
    e.stopPropagation();
    if (!vidEl) return;
    if (vidEl.paused) vidEl.play().catch(function() {});
    else vidEl.pause();
  });

  document.getElementById('scrub-fs').addEventListener('click', function(e) {
    e.stopPropagation();
    if (vidEl && vidEl.requestFullscreen) vidEl.requestFullscreen();
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
    else if (document.documentElement.webkitRequestFullscreen) document.documentElement.webkitRequestFullscreen();
  });

  // Close button and overlay background both deselect
  document.getElementById('vid-close').addEventListener('click', function(e) {
    e.stopPropagation();
    deselect();
  });
  if (overlay) {
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) deselect();
    });
  }

  // Stop clicks on video/scrub from bubbling to overlay background
  if (vidEl) vidEl.addEventListener('click', function(e) { e.stopPropagation(); });
  _scrubEl.addEventListener('click', function(e) { e.stopPropagation(); });

  vidEl.addEventListener('play',  function() { if (_scrubPlayEl) _scrubPlayEl.textContent = '⏸'; });
  vidEl.addEventListener('pause', function() { if (_scrubPlayEl) _scrubPlayEl.textContent = '▶'; });
}

function updateScrub() {
  if (!_scrubEl || !_scrubFillEl) return;
  var vidEl = document.getElementById('vid');
  if (!vidEl || !isFinite(vidEl.duration) || vidEl.duration === 0) return;
  var pct = vidEl.currentTime / vidEl.duration;
  _scrubFillEl.style.width = (pct * 100) + '%';
  _scrubTimeEl.textContent = _fmtTime(vidEl.currentTime);
  _scrubDurEl.textContent  = _fmtTime(vidEl.duration);
  _scrubPlayEl.textContent = vidEl.paused ? '▶' : '⏸';
}

// ── graph loading ─────────────────────────────────────────────────

function loadGraph() {
  setStatus('loading…');

  _rootNode = mkNode({ id:'root', type:'root', name:'', x:0, y:0, fixed:true });
  buildNodeMesh(_rootNode);
  setBreadcrumb(null);

  document.getElementById('now-playing').addEventListener('click', function(e) {
    e.stopPropagation();
    if (selectedNode) selectNode(selectedNode);
  });

  animate();

  listFolder(ROOT_FOLDER, function(items) {
    var topFolders = items.filter(function(f) {
      return f.mimeType === 'application/vnd.google-apps.folder';
    });
    var N = topFolders.length;

    topFolders.forEach(function(f, i) {
      var angle = (2 * Math.PI * i) / N;
      var r = 500;
      var fn = mkNode({
        id: 'folder_' + f.id, type: 'folder', name: f.name, folderId: f.id,
        children: [],
        x: r * Math.cos(angle),
        y: r * Math.sin(angle)
      });
      _folderNodes.push(fn);
      buildNodeMesh(fn);
      addLink(_rootNode, fn, 'root-folder');
      populateFolder(f.id, fn);
    });
  });
}

// ── folder-fetch queue (max 3 concurrent to avoid Drive API 429) ──
var _folderQueue   = [];
var _folderActive  = 0;
var MAX_FOLDER_REQ = 3;

function enqueueFolder(driveId, parentNode) {
  _folderQueue.push({ driveId: driveId, parentNode: parentNode });
  _drainFolderQueue();
}

function _drainFolderQueue() {
  while (_folderActive < MAX_FOLDER_REQ && _folderQueue.length > 0) {
    var job = _folderQueue.shift();
    _folderActive++;
    setStatus('loading… (' + (_folderActive + _folderQueue.length) + ' remaining)');
    _doPopulateFolder(job.driveId, job.parentNode);
  }
}

var HIDDEN_NAMES = ['iceswamp', 'posy'];

function _doPopulateFolder(driveId, parentNode) {
  listFolder(driveId, function(items) {
    _folderActive--;

    items = items.filter(function(f) {
      return HIDDEN_NAMES.indexOf(f.name.toLowerCase()) === -1;
    });

    var subFolders = items.filter(function(f) {
      return f.mimeType === 'application/vnd.google-apps.folder';
    });
    var vids = items.filter(function(f) {
      return f.mimeType && f.mimeType.indexOf('video') !== -1;
    });
    var imgs = items.filter(function(f) {
      return f.mimeType && f.mimeType.indexOf('image/') === 0;
    });

    subFolders.forEach(function(sf) {
      var sfn = mkNode({
        id: 'folder_' + sf.id, type: 'folder', name: sf.name, folderId: sf.id,
        parentNode: parentNode, children: [],
        x: parentNode.x + (Math.random()-0.5)*10,
        y: parentNode.y + (Math.random()-0.5)*10
      });
      parentNode.children.push(sfn);
      buildNodeMesh(sfn);
      addLink(parentNode, sfn, 'folder-folder');
      enqueueFolder(sf.id, sfn);
    });

    vids.forEach(function(v) {
      var vn = mkNode({
        id: 'video_' + v.id, type: 'video',
        name: v.name.replace(/\.[^.]+$/, ''),
        videoId: v.id, thumbFallback: v.thumbnailLink || null,
        parentNode: parentNode, children: [],
        x: parentNode.x + (Math.random()-0.5)*5,
        y: parentNode.y + (Math.random()-0.5)*5
      });
      parentNode.children.push(vn);
      buildNodeMesh(vn);
      addLink(parentNode, vn, 'folder-video');

      var frn = mkNode({
        id: 'frame_' + v.id, type: 'frame',
        name: vn.name, videoId: v.id, parentNode: vn,
        children: [],
        x: vn.x, y: vn.y
      });
      vn.children.push(frn);
      buildNodeMesh(frn);
      addLink(vn, frn, 'video-frame');
    });

    var imageOnlyFolder = imgs.length > 0 && vids.length === 0 && subFolders.length === 0;
    if (imageOnlyFolder) {
      // One slideshow node cycles through all images
      var ssn = mkNode({
        id: 'slideshow_' + driveId, type: 'slideshow',
        name: parentNode.name,
        parentNode: parentNode, children: [],
        x: parentNode.x + (Math.random()-0.5)*5,
        y: parentNode.y + (Math.random()-0.5)*5,
        _ssImages: imgs, _ssIndex: 0
      });
      parentNode.children.push(ssn);
      buildNodeMesh(ssn);
      addLink(parentNode, ssn, 'folder-image');
    } else {
      imgs.forEach(function(img) {
        var imgn = mkNode({
          id: 'image_' + img.id, type: 'image',
          name: img.name.replace(/\.[^.]+$/, ''),
          fileId: img.id, thumbFallback: img.thumbnailLink || null,
          parentNode: parentNode, children: [],
          x: parentNode.x + (Math.random()-0.5)*5,
          y: parentNode.y + (Math.random()-0.5)*5
        });
        parentNode.children.push(imgn);
        buildNodeMesh(imgn);
        addLink(parentNode, imgn, 'folder-image');
      });
    }

    if (_folderActive === 0 && _folderQueue.length === 0) {
      setStatus('');
    } else {
      _drainFolderQueue();
    }
  });
}

function populateFolder(driveId, parentNode) {
  enqueueFolder(driveId, parentNode);
}

// ── node / link helpers ───────────────────────────────────────────

function mkNode(props) {
  var n = Object.assign({ vx:0, vy:0, targetScale:1.0, z:0 }, props);
  n._pickId = nodes.length + 1; // 1-based; 0 = no node in picking buffer
  nodes.push(n);
  return n;
}

function addLink(src, tgt, type) {
  var lk = { source: src, target: tgt, type: type, line: null };
  links.push(lk);
  buildLinkLine(lk);
  _gpuDirty = true;
}

// returns the folder ancestor of a node, or null
// Returns the topmost (root-level) folder ancestor of node
function ancestorFolder(node) {
  var n = node;
  var last = null;
  while (n) {
    if (n.type === 'folder') last = n;
    n = n.parentNode;
  }
  return last;
}

// Returns true if node is node itself or any descendant of folder
function inFolder(node, folder) {
  var n = node;
  while (n) {
    if (n === folder) return true;
    n = n.parentNode;
  }
  return false;
}

// Bounding box of all visible descendant nodes (excludes frames, includes direct children)
function folderBBox(folderNode) {
  var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  function visit(n) {
    for (var i = 0; i < (n.children || []).length; i++) {
      var c = n.children[i];
      if (c.type !== 'frame' && c.targetScale > 0) {
        minX = Math.min(minX, c.x); maxX = Math.max(maxX, c.x);
        minY = Math.min(minY, c.y); maxY = Math.max(maxY, c.y);
      }
      visit(c);
    }
  }
  visit(folderNode);
  return isFinite(minX) ? { minX: minX, maxX: maxX, minY: minY, maxY: maxY } : null;
}

// ── mesh building ─────────────────────────────────────────────────

var THUMB_W = 96, THUMB_H = 54;

// Area-normalised AR scale factors so all thumbs have similar visual weight.
// Reference area = THUMB_W * THUMB_H.  For 16:9 both = 1.0.
function thumbScales(ar) {
  var area = THUMB_W * THUMB_H;
  return {
    x: Math.sqrt(area * ar) / THUMB_W,
    y: Math.sqrt(area / ar) / THUMB_H
  };
}

// Draw img into a canvas whose dimensions match the image AR (no black bars).
function imgToCanvas(img) {
  var iw = img.naturalWidth  || img.width  || 1;
  var ih = img.naturalHeight || img.height || 1;
  var ar = iw / ih;
  var refArea = 192 * 108;
  var cw = Math.max(1, Math.round(Math.sqrt(refArea * ar)));
  var ch = Math.max(1, Math.round(Math.sqrt(refArea / ar)));
  var c  = document.createElement('canvas');
  c.width = cw; c.height = ch;
  c.getContext('2d').drawImage(img, 0, 0, iw, ih, 0, 0, cw, ch);
  return { canvas: c, ar: ar };
}

function makeOutline(w, h) {
  var pts = new Float32Array([-w/2,-h/2,0.1, w/2,-h/2,0.1, w/2,h/2,0.1, -w/2,h/2,0.1]);
  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  var mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
  var line = new THREE.LineLoop(geo, mat);
  line.renderOrder = 5;
  line.visible = false;
  scene.add(line);
  return line;
}

function buildNodeMesh(n) {
  var mesh, mat;

  if (n.type === 'root') {
    mat  = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1.0 });
    mesh = new THREE.Mesh(new THREE.CircleGeometry(18, 32), mat);
    n._baseOpacity = 1.0;

  } else if (n.type === 'folder') {
    var _fd = nodeDepth(n);
    var _fs = folderMeshScale(_fd);
    var _fw = 220 * _fs, _fh = 55 * _fs;
    mat  = new THREE.MeshBasicMaterial({ map: folderTex(n.name, false, _fd), transparent: true, opacity: 1.0 });
    mesh = new THREE.Mesh(new THREE.PlaneGeometry(_fw, _fh), mat);
    n.mat = mat;
    n._baseOpacity = 1.0;
    n._folderDepth = _fd;
    n.outlineLine = makeOutline(_fw, _fh);

  } else if (n.type === 'video') {
    // same 16:9 plane as frames — acts as center tile + video playback surface
    mat  = new THREE.MeshBasicMaterial({ map: videoLabelTex(n.name), transparent: true, opacity: 0.85 });
    mesh = new THREE.Mesh(new THREE.PlaneGeometry(THUMB_W, THUMB_H), mat);
    n.mat = mat;
    n._baseOpacity = 0.85;
    n.outlineLine = makeOutline(THUMB_W, THUMB_H);

  } else if (n.type === 'image') {
    mat  = new THREE.MeshBasicMaterial({ color: 0x181818, transparent: true, opacity: 0.9 });
    mesh = new THREE.Mesh(new THREE.PlaneGeometry(THUMB_W, THUMB_H), mat);
    n.mat = mat;
    n._baseOpacity = 0.9;
    n.outlineLine = makeOutline(THUMB_W, THUMB_H);

    (function(nd, m) {
      getThumbImg(nd.fileId, nd.thumbFallback, function(result) {
        if (!result) return;
        var ci = imgToCanvas(result.img);
        if (!result.isTiny) {
          var sc = thumbScales(ci.ar);
          nd.thumbScaleX = sc.x; nd.thumbScaleY = sc.y;
        }
        m.map = new THREE.CanvasTexture(ci.canvas);
        m.color.set(0xffffff);
        m.needsUpdate = true;
      });
    })(n, mat);

  } else if (n.type === 'slideshow') {
    mat  = new THREE.MeshBasicMaterial({ color: 0x181818, transparent: true, opacity: 0.9 });
    mesh = new THREE.Mesh(new THREE.PlaneGeometry(THUMB_W * 1.8, THUMB_H * 1.8), mat);
    n.mat = mat;
    n._baseOpacity = 0.9;
    n.targetScale = 1;
    n.outlineLine = makeOutline(THUMB_W * 1.8, THUMB_H * 1.8);

    (function(nd, m) {
      var imgs = nd._ssImages;
      var textures = [];
      var loaded = 0;
      function tryAdvance() {
        if (textures.length === 0) return;
        var idx = nd._ssIndex % textures.length;
        if (textures[idx]) {
          m.map = textures[idx];
          m.color.set(0xffffff);
          m.needsUpdate = true;
        }
        nd._ssIndex++;
        nd._ssTimer = setTimeout(tryAdvance, 2500);
      }
      imgs.forEach(function(img, i) {
        getThumbImg(img.id, img.thumbnailLink || null, function(result) {
          if (result && !result.isTiny) {
            var ci = imgToCanvas(result.img);
            if (!nd.thumbScaleX) {
              var sc = thumbScales(ci.ar);
              nd.thumbScaleX = sc.x; nd.thumbScaleY = sc.y;
            }
            var tex = new THREE.CanvasTexture(ci.canvas);
            tex.generateMipmaps = false;
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter;
            textures.push(tex);
          }
          if (result && !result.isTiny) loaded++;
          if (loaded === imgs.length && !nd._ssTimer) tryAdvance();
        });
      });
      nd._ssTextures = textures;
    })(n, mat);

  } else { // frame — GPU flipbook sprite-sheet, one texture upload, shader animates UV
    mat = new THREE.ShaderMaterial({
      uniforms: {
        map:       { value: null  },
        hasMap:    { value: 0.0  },
        composite: { value: 0.0  },
        time:      { value: 0.0  },
        opacity:   { value: 0.9  }
      },
      vertexShader:   FLIPBOOK_VERT,
      fragmentShader: FLIPBOOK_FRAG,
      transparent: true
    });
    mesh = new THREE.Mesh(new THREE.PlaneGeometry(THUMB_W, THUMB_H), mat);
    n.mat = mat;
    n._baseOpacity = 0.9;
    n.isFlipbook = true;
    n.targetScale = 1;

    (function(nd, m) {
      var _fallback = nd.parentNode ? nd.parentNode.thumbFallback : null;
      getThumbImg(nd.videoId, _fallback, function(result) {
        if (!result) return;
        var tex = new THREE.CanvasTexture(result.img);
        tex.generateMipmaps = false;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        m.uniforms.map.value       = tex;
        m.uniforms.hasMap.value    = 1.0;
        m.uniforms.composite.value = result.isComposite ? 1.0 : 0.0;
        if (!result.isTiny) {
          var iw = result.img.naturalWidth || result.img.width || 1;
          var ih = result.img.naturalHeight || result.img.height || 1;
          // For composite 2×2: each quadrant AR = full image AR
          var sc = thumbScales(iw / ih);
          nd.thumbScaleX = sc.x; nd.thumbScaleY = sc.y;
        }
      });
    })(n, mat);
  }

  mesh.position.set(n.x, n.y, 0);
  n.mesh = mesh;
  scene.add(mesh);
  // bake pick color into geometry (0,0,0 for root = no pick)
  if (n.type !== 'root') {
    var pid = n._pickId;
    var pr = ((pid >> 16) & 0xff) / 255;
    var pg = ((pid >>  8) & 0xff) / 255;
    var pb = ( pid        & 0xff) / 255;
    var nv = mesh.geometry.attributes.position.count;
    var pc = new Float32Array(nv * 3);
    for (var vi = 0; vi < nv; vi++) { pc[vi*3]=pr; pc[vi*3+1]=pg; pc[vi*3+2]=pb; }
    mesh.geometry.setAttribute('pickColor', new THREE.BufferAttribute(pc, 3));
  }
  _gpuDirty = true;
  // all types except root are clickable
  clickables.push(mesh);
  meshNode[mesh.uuid] = n;
}

function setHighlight(folderNode)  { _highlightFolder = folderNode; }
function clearHighlight()          { _highlightFolder = null; }
function setHighlightChain(node)   {
  _highlightChain = new Set();
  var n = node;
  while (n) {
    _highlightChain.add(n);
    // also highlight all siblings at this level (same parent's children)
    if (n.parentNode && n.parentNode.children) {
      for (var ci = 0; ci < n.parentNode.children.length; ci++) {
        _highlightChain.add(n.parentNode.children[ci]);
      }
    }
    n = n.parentNode;
  }
}
function clearHighlightChain()     { _highlightChain = null; }

function getBreadcrumb(node) {
  var parts = [], n = node;
  while (n) { if (n.name) parts.unshift({ name: n.name, id: n.id }); n = n.parentNode; }
  return parts;
}

function nodeById(id) {
  for (var i = 0; i < nodes.length; i++) if (nodes[i].id === id) return nodes[i];
  return null;
}

function escHtml(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

var _folderTreeEl   = null;
var _folderTreeTick = 0;
var _vidLoadingEl   = null;

function updateFolderTree() {
  if (++_folderTreeTick % 12 !== 0) return; // ~5 fps at 60fps
  if (!_folderTreeEl) _folderTreeEl = document.getElementById('folder-tree');
  if (!_folderTreeEl) return;

  // viewport bounds in world space
  var hw = zoomCur / 2, hh = zoomCur * (H / W) / 2;
  var vl = panCur.x - hw, vr = panCur.x + hw;
  var vb = panCur.y - hh, vt = panCur.y + hh;

  var visible = [];
  for (var i = 0; i < nodes.length; i++) {
    var nd = nodes[i];
    if (nd.type !== 'folder') continue;
    if (nd.x < vl || nd.x > vr || nd.y < vb || nd.y > vt) continue;
    visible.push(nd);
  }

  visible.sort(function(a, b) {
    var da = a._folderDepth || nodeDepth(a);
    var db = b._folderDepth || nodeDepth(b);
    return da !== db ? da - db : (a.name < b.name ? -1 : 1);
  });

  // depth colours matching folderTex
  var depthCols = ['#aaa', '#666', '#3a3a3a'];
  var html = '';
  for (var j = 0; j < visible.length; j++) {
    var fn = visible[j];
    var d  = (fn._folderDepth || nodeDepth(fn));
    var col = depthCols[Math.min(d - 1, depthCols.length - 1)];
    var indent = (d - 1) * 10;
    html += '<div class="ft-item ft-clickable" data-nid="' + escHtml(fn.id) + '"'
          + ' style="padding-left:' + indent + 'px;color:' + col + '">'
          + escHtml(fn.name) + '</div>';
  }
  _folderTreeEl.innerHTML = html;

  _folderTreeEl.querySelectorAll('.ft-clickable').forEach(function(item) {
    item.addEventListener('click', function(e) {
      e.stopPropagation();
      var nd = nodeById(item.getAttribute('data-nid'));
      if (nd) selectNode(nd);
    });
  });
}

function updateHierarchyPanel(node) {
  // panel removed — breadcrumb now handled by updateBreadcrumb
}

function goUpOne() {
  if (!selectedNode) return;
  // From a frame preview, skip the parent video and go directly to folder
  if (selectedNode.type === 'frame') {
    var folder = selectedNode.parentNode && selectedNode.parentNode.parentNode;
    if (folder) selectNode(folder); else deselect();
    return;
  }
  if (selectedNode.parentNode) {
    selectNode(selectedNode.parentNode);
  } else {
    deselect();
  }
}

// Hierarchy level colors: red → green → blue → purple → orange → cyan → pink → yellow …
var LINK_COLORS = [
  0xff4444, // 0  root→folder      red
  0x44ff88, // 1  folder→*         green
  0x4488ff, // 2  subfolder→*      blue
  0xcc44ff, // 3  depth 3          purple
  0xff8844, // 4  depth 4          orange
  0x44ffee, // 5  depth 5          cyan
  0xff44aa, // 6  depth 6          pink
  0xffff44, // 7  depth 7          yellow
];

function linkDepth(lk) {
  var n = lk.source, d = 0;
  while (n.parentNode) { d++; n = n.parentNode; }
  return d;
}

function buildLinkLine(lk) {
  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  var depth = linkDepth(lk);
  var col = LINK_COLORS[depth % LINK_COLORS.length];
  var opc = lk.type === 'root-folder'                    ? 0.75
          : lk.type === 'folder-folder'                  ? 0.6
          : (lk.type === 'folder-video' ||
             lk.type === 'folder-image')                 ? 0.45
          : 0.25; // video-frame
  lk._hierarchyColor = col;
  lk._baseOpacity    = opc;
  lk.line = new THREE.Line(geo, new THREE.LineBasicMaterial({
    color: col, transparent: true, opacity: opc
  }));
  scene.add(lk.line);
}

function nodeDepth(n) {
  var d = 0, cur = n.parentNode;
  while (cur) { d++; cur = cur.parentNode; }
  return d;
}

// depth 1 = top-level (biggest), deeper = smaller
function folderFontSize(depth) {
  if (depth <= 1) return 54;
  if (depth === 2) return 36;
  return 22;
}

function folderMeshScale(depth) {
  if (depth <= 1) return 1.8;
  if (depth === 2) return 1.25;
  return 1.0;
}

function folderTex(name, active, depth) {
  depth = depth || 1;
  var fontSize = folderFontSize(depth);
  var cw = 512, ch = 128, cv = document.createElement('canvas');
  cv.width = cw; cv.height = ch;
  var ctx = cv.getContext('2d');
  var bgCol     = active ? '#1c1c1c' : (depth <= 1 ? '#1a1a1a' : depth === 2 ? '#131313' : '#0d0d0d');
  var borderCol = active ? '#888'    : (depth <= 1 ? '#444'    : depth === 2 ? '#2a2a2a' : '#1a1a1a');
  ctx.fillStyle = bgCol;
  ctx.fillRect(0, 0, cw, ch);
  ctx.strokeStyle = borderCol;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, cw - 2, ch - 2);
  var textCol = active ? '#eee' : (depth <= 1 ? '#ccc' : depth === 2 ? '#777' : '#3a3a3a');
  ctx.fillStyle = textCol;
  ctx.font = 'bold ' + fontSize + 'px Ubuntu Mono, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name.toUpperCase(), cw / 2, ch / 2);
  return new THREE.CanvasTexture(cv);
}

function videoLabelTex(name) {
  var cw = 400, ch = 225, cv = document.createElement('canvas');
  cv.width = cw; cv.height = ch;
  var ctx = cv.getContext('2d');
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, cw, ch);
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, cw - 1, ch - 1);
  ctx.fillStyle = '#444';
  ctx.font = '14px Ubuntu Mono, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  var display = name.length > 28 ? name.slice(0, 27) + '…' : name;
  ctx.fillText(display, cw / 2, ch / 2);
  return new THREE.CanvasTexture(cv);
}

function refreshFolderTex(node, active) {
  if (!node.mat) return;
  node.mat.map = folderTex(node.name, active, node._folderDepth || nodeDepth(node));
  node.mat.needsUpdate = true;
}

// ── 2D spatial hash grid ──────────────────────────────────────────

function buildGrid() {
  var grid = Object.create(null);
  for (var i = 0; i < nodes.length; i++) {
    var nd = nodes[i];
    if (nd.targetScale === 0) continue;
    var key = Math.floor(nd.x / CELL_SIZE) + '|' + Math.floor(nd.y / CELL_SIZE);
    if (!grid[key]) grid[key] = [];
    grid[key].push(i);
  }
  return grid;
}

// ── 2D force simulation ───────────────────────────────────────────

function simStep() {
  var i, j, k, a, b, dx, dy, d2, d, f, fx, fy, li, sp;

  // spring forces
  for (li = 0; li < links.length; li++) {
    a = links[li].source; b = links[li].target;
    if (b.targetScale === 0) continue;
    dx = b.x-a.x; dy = b.y-a.y;
    d  = Math.sqrt(dx*dx + dy*dy) || 1;
    sp = SPRING[links[li].type];
    f  = (d - sp.len) * sp.k;
    fx = dx/d*f; fy = dy/d*f;
    if (!a.fixed) { a.vx += fx; a.vy += fy; }
    if (!b.fixed) { b.vx -= fx; b.vy -= fy; }
  }

  // repulsion — 2D spatial grid
  var grid = buildGrid();
  for (i = 0; i < nodes.length; i++) {
    a = nodes[i];
    if (a.targetScale === 0) continue;
    var cx = Math.floor(a.x / CELL_SIZE);
    var cy = Math.floor(a.y / CELL_SIZE);
    for (var nx = cx - 1; nx <= cx + 1; nx++) {
      for (var ny = cy - 1; ny <= cy + 1; ny++) {
        var cell = grid[nx + '|' + ny];
        if (!cell) continue;
        for (k = 0; k < cell.length; k++) {
          j = cell[k];
          if (j <= i) continue;
          b = nodes[j];
          dx = b.x-a.x; dy = b.y-a.y;
          d2 = dx*dx + dy*dy;
          if (d2 < 0.01 || d2 > DIST_CUT2) continue;
          d  = Math.sqrt(d2);
          f  = REPULSION / d2;
          fx = dx/d*f; fy = dy/d*f;
          if (!a.fixed) { a.vx -= fx; a.vy -= fy; }
          if (!b.fixed) { b.vx += fx; b.vy += fy; }
        }
      }
    }
  }

  // focus repulsion — push everything not in the selected subtree away
  if (selectedNode && (selectedNode.type === 'folder' || selectedNode.type === 'video')) {
    var selFolder = ancestorFolder(selectedNode);
    for (j = 0; j < nodes.length; j++) {
      b = nodes[j];
      if (b.fixed || b.targetScale === 0) continue;
      var bFolder = ancestorFolder(b);

      if (selectedNode.type === 'folder') {
        // push every node outside this folder subtree away from the folder center
        if (inFolder(b, selectedNode)) continue;
      } else {
        // video selected: push every node in the same folder that isn't this video or its frames
        if (bFolder !== selFolder) continue;
        if (b === selectedNode) continue;
        if (b.parentNode === selectedNode) continue; // own frames
      }

      dx = b.x - selectedNode.x; dy = b.y - selectedNode.y;
      d2 = dx*dx + dy*dy;
      if (d2 < 0.01) continue;
      d = Math.sqrt(d2);
      f = FOCUS_REP / d2;
      b.vx += dx/d*f; b.vy += dy/d*f;
    }
  }

  // hover repulsion
  if (hoveredNode) {
    var hCut2 = 300 * 300;
    for (j = 0; j < nodes.length; j++) {
      b = nodes[j];
      if (b === hoveredNode || b.fixed || b.targetScale === 0) continue;
      dx = b.x-hoveredNode.x; dy = b.y-hoveredNode.y;
      d2 = dx*dx + dy*dy;
      if (d2 < 0.01 || d2 > hCut2) continue;
      d = Math.sqrt(d2);
      f = 18000 / d2;
      b.vx += dx/d*f; b.vy += dy/d*f;
    }
  }

  // frame orbit — spring frame child to right of selected video
  if (selectedNode && selectedNode.type === 'video') {
    var _as = selectedNode.aspectScale || 1;
    var _ts = selectedNode.targetScale || VIDEO_SCALE;
    var _halfW = (THUMB_W * _ts / 2) * _as;
    var _colX  = _halfW + 20 + THUMB_W / 2;
    for (j = 0; j < selectedNode.children.length; j++) {
      b = selectedNode.children[j];
      if (b.type !== 'frame') continue;
      dx = (selectedNode.x + _colX) - b.x;
      dy = selectedNode.y - b.y;
      b.vx = (b.vx + dx * 0.3) * 0.6;
      b.vy = (b.vy + dy * 0.3) * 0.6;
    }
  }

  // integrate + measure kinetic energy
  var e = 0;
  for (i = 0; i < nodes.length; i++) {
    var nd = nodes[i];
    if (nd.fixed) continue;
    nd.vx *= DAMPING; nd.vy *= DAMPING;
    var spd = Math.sqrt(nd.vx * nd.vx + nd.vy * nd.vy);
    if (spd > MAX_VEL) { nd.vx = nd.vx / spd * MAX_VEL; nd.vy = nd.vy / spd * MAX_VEL; }
    nd.x  += nd.vx;   nd.y  += nd.vy;
    e += nd.vx * nd.vx + nd.vy * nd.vy;
  }
  _simEnergy = e;
}

function syncMeshes() {
  var i, li, nd, lk, opc;

  for (i = 0; i < nodes.length; i++) {
    nd = nodes[i];
    if (!nd.mesh) continue;
    var isPlayingVideo = nd === selectedNode && nd.type === 'video';
    nd.mesh.position.set(nd.x, nd.y, isPlayingVideo ? 4 : 0);
    nd.mesh.renderOrder = isPlayingVideo ? 10 : 0;

    // highlight state for this node
    var highlighted = _highlightChain ? _highlightChain.has(nd)
                    : _highlightFolder ? inFolder(nd, _highlightFolder)
                    : false;
    var anyHighlight = _highlightChain || _highlightFolder;

    // node opacity: dim non-highlighted harder when folder is selected vs just hovered
    var _folderSel = selectedNode && selectedNode.type === 'folder' && selectedNode === _highlightFolder;
    var _dimAmt = _folderSel ? 0.15 : 0.12;
    var nodeOpc = anyHighlight ? (highlighted ? nd._baseOpacity : _dimAmt) : nd._baseOpacity;
    if (nd.isFlipbook) {
      nd.mat.uniforms.opacity.value = nodeOpc;
    } else {
      nd.mesh.material.opacity = nodeOpc;
    }

    // outline: visible only on highlighted nodes
    if (nd.outlineLine) {
      var show = highlighted && nd.mesh.scale.x > 0.01;
      nd.outlineLine.visible = show;
      if (show) {
        nd.outlineLine.position.set(nd.x, nd.y, isPlayingVideo ? 4.1 : 0.1);
        nd.outlineLine.scale.set(nd.mesh.scale.x * 1.04, nd.mesh.scale.y * 1.04, 1);
        nd.outlineLine.material.opacity = 0.75;
      }
    }
  }

  for (li = 0; li < links.length; li++) {
    lk = links[li];
    if (!lk.line) continue;

    // link highlight state
    var lkHighlighted;
    if (_highlightChain) {
      lkHighlighted = _highlightChain.has(lk.source) && _highlightChain.has(lk.target);
    } else if (_highlightFolder) {
      lkHighlighted = lk.type === 'video-frame'
        ? inFolder(lk.source, _highlightFolder)
        : (inFolder(lk.source, _highlightFolder) || inFolder(lk.target, _highlightFolder));
    } else {
      lkHighlighted = false;
    }
    var anyHighlight = _highlightChain || _highlightFolder;
    var isActiveLink = lk.type === 'video-frame' && _activeFrame && lk.target === _activeFrame;

    if (isActiveLink) {
      opc = 0.95;
      lk.line.material.color.set(0xffffff);
    } else if (anyHighlight && lkHighlighted) {
      var _folderSelected = selectedNode && selectedNode.type === 'folder' && selectedNode === _highlightFolder;
      opc = _folderSelected ? Math.min(1.0, lk._baseOpacity * 4.0) : Math.min(1.0, lk._baseOpacity * 1.8);
      lk.line.material.color.set(lk._hierarchyColor);
    } else if (anyHighlight) {
      opc = 0.015;
      lk.line.material.color.set(lk._hierarchyColor);
    } else {
      opc = lk._baseOpacity;
      lk.line.material.color.set(lk._hierarchyColor);
    }
    lk.line.material.opacity = opc;
    lk.line.visible = opc > 0;

    var pos = lk.line.geometry.attributes.position.array;
    pos[0] = lk.source.x; pos[1] = lk.source.y; pos[2] = 0;
    pos[3] = lk.target.x; pos[4] = lk.target.y; pos[5] = 0;
    lk.line.geometry.attributes.position.needsUpdate = true;
  }
}

// ── animate ───────────────────────────────────────────────────────

function animate() {
  requestAnimationFrame(animate);

  // rebuild GPU state whenever topology changes (new nodes/links)
  if (_gpuDirty) rebuildGPU();

  if (_gpuReady) {
    gpuPhysicsStep();
    cpuFrameStep();
  } else {
    simStep();
    if (_simEnergy > 200) simStep();
  }

  // Continuously track the bounding box of selected folder so zoom fits all contents
  if (selectedNode && selectedNode.type === 'folder') {
    var _bb = folderBBox(selectedNode);
    if (_bb) {
      var _pad = 300;
      var _bw = (_bb.maxX - _bb.minX + _pad) * 1.25;
      var _bh = (_bb.maxY - _bb.minY + _pad) * 1.25;
      panDest.x += ((_bb.minX + _bb.maxX) / 2 - panDest.x) * 0.04;
      panDest.y += ((_bb.minY + _bb.maxY) / 2 - panDest.y) * 0.04;
      zoomDest  += (Math.max(_bw, _bh * (W / H), 600) - zoomDest) * 0.04;
    }
  }

  panCur.x += (panDest.x - panCur.x) * 0.16;
  panCur.y += (panDest.y - panCur.y) * 0.16;
  zoomCur  += (zoomDest  - zoomCur)  * 0.28;
  camera.position.set(panCur.x, panCur.y, 1000);
  camera.lookAt(panCur.x, panCur.y, 0);
  camera.zoom = W / zoomCur;
  camera.updateProjectionMatrix();

  // video now plays in #vid-overlay — no VideoTexture needed

  // advance flipbook time uniform (float uniform = no GPU upload, just overwrites a register)
  var _flipTime = performance.now() / 1000;
  for (var _fi = 0; _fi < nodes.length; _fi++) {
    if (nodes[_fi].isFlipbook) nodes[_fi].mat.uniforms.time.value = _flipTime;
  }

  if (selectedNode && selectedNode.loading && selectedNode.loadCtx) {
    var lctx = selectedNode.loadCtx;
    var lw   = selectedNode.loadCanvas.width;
    var lh   = selectedNode.loadCanvas.height;
    var t    = (Date.now() - selectedNode.loadStart) / 1000;
    lctx.clearRect(0, 0, lw, lh);
    if (selectedNode.thumbCanvas) {
      lctx.globalAlpha = 0.35;
      lctx.drawImage(selectedNode.thumbCanvas, 0, 0, lw, lh);
      lctx.globalAlpha = 1.0;
    } else {
      lctx.fillStyle = '#111';
      lctx.fillRect(0, 0, lw, lh);
    }
    lctx.save();
    lctx.translate(lw / 2, lh / 2);
    lctx.rotate(t * Math.PI * 2.2);
    lctx.beginPath();
    lctx.arc(0, 0, 18, 0, Math.PI * 1.6);
    lctx.strokeStyle = 'rgba(255,255,255,0.9)';
    lctx.lineWidth = 2.5;
    lctx.lineCap = 'round';
    lctx.stroke();
    lctx.restore();
    selectedNode.loadTex.needsUpdate = true;
  }

  syncMeshes();

  for (var i = 0; i < nodes.length; i++) {
    var nd = nodes[i];
    if (!nd.mesh) continue;
    var _tsy = nd.thumbScaleY || 1;
    var _tsx = nd.thumbScaleX || 1;
    var sy = nd.mesh.scale.y + (nd.targetScale * _tsy - nd.mesh.scale.y) * 0.20;
    var targetSX = nd.targetScale * (nd.type === 'video' ? (nd.aspectScale || 1) : _tsx);
    var sx = nd.mesh.scale.x + (targetSX - nd.mesh.scale.x) * 0.20;
    nd.mesh.scale.set(sx, sy, 1);
  }

  // GPU pick once per frame when mouse moved (replaces per-event JS raycasting)
  if (_mouseMoved && !_mouseDown) {
    _mouseMoved = false;
    var hit = _gpuReady ? gpuPick(_mouseClientX, _mouseClientY)
                        : raycasterPick(_mouseClientX, _mouseClientY);
    updateHover(hit);
  }

  renderer.render(scene, camera);

  // ── UI updates ──
  updateFolderTree();
  updateScrub();

  if (!_vidLoadingEl) _vidLoadingEl = document.getElementById('vid-loading');
  if (_vidLoadingEl) {
    if (selectedNode && selectedNode.loading) _vidLoadingEl.classList.add('active');
    else _vidLoadingEl.classList.remove('active');
  }
}

// ── camera helpers ────────────────────────────────────────────────

function worldUnitsPerPx() {
  return zoomCur / W; // ortho: zoomCur world units fit across W pixels
}

function centeredPanX(worldX, targetZoom) {
  return worldX;
}

// ── interaction ───────────────────────────────────────────────────

function onMouseDown(e) {
  if (e.button !== 0) return;
  _mouseDown       = true;
  _hasDragged      = false;
  _dragOriginMouse = { x: e.clientX, y: e.clientY };
  _dragOriginPan   = { x: panDest.x, y: panDest.y };
}

function onMouseUp() { _mouseDown = false; }

function onWheel(e) {
  // ortho: larger zoomDest = more world units = more zoomed out
  zoomDest = Math.max(200, Math.min(14000, zoomDest * (1 + e.deltaY * 0.0018)));
}

function onMouseMove(e) {
  _mouseClientX = e.clientX;
  _mouseClientY = e.clientY;
  if (_mouseDown) {
    var dx = e.clientX - _dragOriginMouse.x;
    var dy = e.clientY - _dragOriginMouse.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) _hasDragged = true;
    if (_hasDragged) {
      var scale = worldUnitsPerPx();
      panDest.x = _dragOriginPan.x - dx * scale;
      panDest.y = _dragOriginPan.y + dy * scale;
      panCur.x  = panDest.x;
      panCur.y  = panDest.y;
      return;
    }
  }
  _mouseMoved = true;
}

function updateHover(hit) {
  if (hit === hoveredNode) return;

  // un-hover previous
  if (hoveredNode && hoveredNode !== selectedNode) {
    hoveredNode.targetScale = 1.0;
    if (hoveredNode.type === 'folder') refreshFolderTex(hoveredNode, false);
  }
  if (_highlightFolder && _highlightFolder !== selectedNode) clearHighlight();
  clearHighlightChain();
  if (hoveredNode && hoveredNode.type === 'frame' && hoveredNode !== _activeFrame) {
    if (!_activeFrameLockedByClick) _activeFrame = null;
  }

  hoveredNode = hit;

  if (hoveredNode && hoveredNode !== selectedNode) {
    hoveredNode.targetScale = 1.2;
    if (hoveredNode.type === 'folder') {
      refreshFolderTex(hoveredNode, true);
      setHighlight(hoveredNode);
    } else {
      setHighlightChain(hoveredNode);
    }
  }

  if (hoveredNode && hoveredNode.type === 'frame' &&
      hoveredNode.parentNode === selectedNode && selectedNode && selectedNode.type === 'video') {
    if (!_activeFrameLockedByClick) _activeFrame = hoveredNode;
  }

  if (hoveredNode) {
    setBreadcrumb(getBreadcrumb(hoveredNode));
  } else {
    setBreadcrumb(selectedNode ? getBreadcrumb(selectedNode) : null);
    setStatus(selectedNode ? selectedNode.name : '');
  }
}

function onClick(e) {
  if (_hasDragged) return;
  mouse.x =  (e.clientX / W) * 2 - 1;
  mouse.y = -(e.clientY / H) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  var hits = raycaster.intersectObjects(clickables);
  if (!hits.length) { goUpOne(); return; }

  var node = meshNode[hits[0].object.uuid];
  if (!node || node.type === 'root') return;
  if (node === selectedNode) { deselect(); return; }

  // Frame click while its parent video is playing → seek to currently displayed frame
  if (node.type === 'frame' && node.parentNode === selectedNode && selectedNode && selectedNode.type === 'video') {
    _activeFrame = node;
    _activeFrameLockedByClick = true;
    var vidEl = document.getElementById('vid');
    if (isFinite(vidEl.duration) && vidEl.duration > 0) {
      var _curFrame = Math.floor(Math.floor(performance.now() / 1000 * 0.5) % 4);
      vidEl.currentTime = vidEl.duration * FRAME_SEEK[_curFrame];
    }
    return;
  }

  selectNode(node);
}

function selectNode(node) {
  if (selectedNode && selectedNode !== node) deselect();
  selectedNode = node;
  node.fixed = true;

  if (node.type === 'folder') {
    refreshFolderTex(node, true);
    setHighlight(node);
    panDest.x = node.x;
    panDest.y = node.y;
    zoomDest  = 1100; // world units wide for folder view

  } else if (node.type === 'video') {
    _activeFrame = null; _activeFrameLockedByClick = false;
    node.targetScale = VIDEO_SCALE;

    // Compute initial targetScale — clamped for very wide videos (will refine on loadedmetadata)
    var _snapAs = node.aspectScale || 1;
    node.targetScale = VIDEO_SCALE * Math.min(1.0, 1.5 / _snapAs);
    var _ts = node.targetScale;

    var _snapHalf = (THUMB_W * _ts / 2) * _snapAs;
    var _snapColX = _snapHalf + 20 + THUMB_W / 2;
    for (var qi = 0; qi < node.children.length; qi++) {
      var fr = node.children[qi];
      if (fr.type !== 'frame') continue;
      fr.x = node.x + _snapColX;
      fr.y = node.y;
      fr.vx = 0; fr.vy = 0;
    }

    var _vidW = THUMB_W * _ts * _snapAs;
    var _vidH = THUMB_H * _ts;
    zoomDest = Math.max(_vidW, _vidH * (W / H)) * 1.15;
    panDest.x = centeredPanX(node.x, zoomDest);
    panDest.y = node.y;
    startVideoOnNode(node, null);

  } else if (node.type === 'image' || node.type === 'slideshow') {
    zoomDest  = 450;
    panDest.x = centeredPanX(node.x, zoomDest);
    panDest.y = node.y;

  } else if (node.type === 'frame') {
    node.targetScale = VIDEO_SCALE * 0.9;
    zoomDest  = THUMB_W * VIDEO_SCALE * 0.9 * 1.6;
    panDest.x = centeredPanX(node.x, zoomDest);
    panDest.y = node.y;
  }

  updateHierarchyPanel(selectedNode);
  setBreadcrumb(getBreadcrumb(node));
  setStatus(node.name);
}

// seekFraction: null = beginning, 0–1 = seek after loadedmetadata
function startVideoOnNode(node, seekFraction) {
  var vidEl = document.getElementById('vid');
  var overlay = document.getElementById('vid-overlay');

  function doLoad() {
    vidEl.removeAttribute('src');
    vidEl.load();
    vidEl.crossOrigin = 'anonymous';
    vidEl.src = mediaUrl(node.videoId);

    vidEl.addEventListener('loadedmetadata', function onMeta() {
      vidEl.removeEventListener('loadedmetadata', onMeta);
      if (isFinite(vidEl.duration) && vidEl.duration > 0) {
        var dur = vidEl.duration;
        var mm = Math.floor(dur / 60), ss = Math.floor(dur % 60);
        var res = vidEl.videoWidth ? (vidEl.videoWidth + '×' + vidEl.videoHeight) : '';
        if (node === selectedNode)
          setStatus(node.name + '  ' + mm + ':' + (ss < 10 ? '0' : '') + ss + (res ? '  ' + res : ''));
        if (seekFraction !== null) vidEl.currentTime = dur * seekFraction;
      }
    });

    vidEl.muted  = false;
    vidEl.volume = 1.0;
    vidEl.play().catch(function(e) { console.warn('video play blocked:', e); });
  }

  // Guard against AbortError: if a play() is in flight, pause it first and wait
  if (!vidEl.paused) {
    var p = vidEl.pause();
    if (p && typeof p.then === 'function') {
      p.then(doLoad).catch(doLoad);
    } else {
      doLoad();
    }
  } else {
    doLoad();
  }

  // Show video in overlay immediately
  if (overlay) overlay.classList.add('active');
  node.loading = true;

  function onVideoReady() {
    vidEl.removeEventListener('canplay', onVideoReady);
    vidEl.removeEventListener('error',   onVideoError);
    if (selectedNode !== node) return;
    node.loading = false;
  }

  function onVideoError() {
    vidEl.removeEventListener('canplay', onVideoReady);
    vidEl.removeEventListener('error',   onVideoError);
    if (selectedNode !== node) return;
    node.loading = false;
    setStatus(node.name + ' — unavailable');
  }

  vidEl.addEventListener('canplay', onVideoReady);
  vidEl.addEventListener('error',   onVideoError);
}

function stopVideo(node) {
  node.loading = false;
  if (node.loadTex) { node.loadTex.dispose(); node.loadTex = null; }
  node.loadCanvas = null; node.loadCtx = null;

  var vidEl = document.getElementById('vid');
  vidEl.pause(); vidEl.removeAttribute('src'); vidEl.load();
  node.videoEl = null;
  if (node.videoTex) { node.videoTex.dispose(); node.videoTex = null; }

  var overlay = document.getElementById('vid-overlay');
  if (overlay) overlay.classList.remove('active');

  prev_mat_reset(node);
}

function prev_mat_reset(node) {
  if (!node.mat) return;
  if (node.type === 'video') {
    node.mat.map = videoLabelTex(node.name);
    node.mat.color.set(0xffffff);
    node.mat.opacity = 0.85;
  } else {
    node.mat.map = node.thumbCanvas ? new THREE.CanvasTexture(node.thumbCanvas) : null;
    node.mat.color.set(node.thumbCanvas ? 0xffffff : 0x181818);
    node.mat.opacity = 0.9;
  }
  node.mat.needsUpdate = true;
}

function deselect() {
  if (!selectedNode) return;
  var prev = selectedNode;
  selectedNode = null;

  if (prev.type === 'video') {
    stopVideo(prev);
  }

  prev.targetScale = 1.0;
  if (prev.type !== 'root') prev.fixed = false;
  _activeFrame = null; _activeFrameLockedByClick = false;
  if (prev.type === 'folder') { refreshFolderTex(prev, false); clearHighlight(); }

  panDest.x = 0; panDest.y = 0; zoomDest = 5000;
  updateHierarchyPanel(null);
  setBreadcrumb(null);
  var _remaining = _folderActive + _folderQueue.length;
  setStatus(_remaining > 0 ? 'loading… (' + _remaining + ' remaining)' : '');
}

function setStatus(msg) {
  document.getElementById('now-playing').textContent = msg || '';
}

function setBreadcrumb(parts) {
  var el = document.getElementById('site-title');
  if (!el) return;
  var html = '<span class="bc-root bc-clickable">cabbibo</span>'
           + '<span class="bc-sep"> / </span>'
           + '<span class="bc-root bc-clickable">videos</span>';
  if (parts && parts.length) {
    for (var i = 0; i < parts.length; i++) {
      html += '<span class="bc-sep"> / </span>';
      var cls = (i === parts.length - 1) ? 'bc-leaf' : 'bc-part';
      html += '<span class="' + cls + ' bc-clickable" data-nid="' + escHtml(parts[i].id) + '">'
            + escHtml(parts[i].name) + '</span>';
    }
  }
  el.innerHTML = html;

  el.querySelectorAll('.bc-clickable').forEach(function(span) {
    span.addEventListener('click', function(e) {
      e.stopPropagation();
      var id = span.getAttribute('data-nid');
      if (!id) { deselect(); return; } // "cabbibo" or "videos" → zoom out
      var nd = nodeById(id);
      if (nd) selectNode(nd);
    });
  });
}

function onResize() {
  W = window.innerWidth; H = window.innerHeight;
  camera.left   = -W / 2;
  camera.right  =  W / 2;
  camera.top    =  H / 2;
  camera.bottom = -H / 2;
  camera.zoom   = W / zoomCur;
  camera.updateProjectionMatrix();
  renderer.setSize(W, H);
}

document.addEventListener('DOMContentLoaded', init);
