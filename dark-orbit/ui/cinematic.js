// ==================== cinematic.js ====================
// Cinematic Opening — Earth → Atmosphere → Space → Nebula → Boss
// 10-second canvas animation — NO video files needed
// Load: after config.js, before alien.js
// Replace / works alongside intro.js (this is the VIDEO part)

(function () {

  // ══════════════════════════════════════════════════════
  //  PUBLIC API
  // ══════════════════════════════════════════════════════
  window.CINEMATIC = {
    shouldPlay: function () {
      return !SAVE.get('cinematicSeen');
    },
    play: _play,
    replay: function () { SAVE.set('cinematicSeen', true); _play(); }
  };

  // ══════════════════════════════════════════════════════
  //  CONSTANTS
  // ══════════════════════════════════════════════════════
  const TOTAL_DURATION = 9500;  // ms — total cinematic length
  const FPS_TARGET     = 60;

  // Scene timing (ms)
  const SCENES = [
    { start: 0,    end: 1800,  name: 'EARTH'     },   // 0–1.8s  : Earth from space
    { start: 1600, end: 3400,  name: 'LAUNCH'    },   // 1.6–3.4s: Satellite launches
    { start: 3200, end: 5000,  name: 'ASTEROID'  },   // 3.2–5s  : Asteroid belt rush
    { start: 4800, end: 6800,  name: 'NEBULA'    },   // 4.8–6.8s: Nebula / deep space
    { start: 6600, end: 8400,  name: 'BOSS'      },   // 6.6–8.4s: Boss mothership reveal
    { start: 8200, end: 9500,  name: 'TITLE'     },   // 8.2–9.5s: Game title + TAP
  ];

  // Subtitle captions
  const CAPTIONS = [
    { t: 200,  text: 'YEAR 2247 — EARTH ORBIT',          color: '#aaddff' },
    { t: 1700, text: 'SATELLITE GUARDIAN — DEPLOYED',    color: '#00ffb4' },
    { t: 3300, text: 'CROSSING THE ASTEROID BELT...',    color: '#ffaa44' },
    { t: 5000, text: 'DEEP SPACE — ZARAK HIVE TERRITORY',color: '#ff4488' },
    { t: 6700, text: '⚠ MOTHERSHIP DETECTED',            color: '#ff2200' },
    { t: 8200, text: 'THE LAST GUARDIAN',                color: '#ffffff' },
  ];

  // ══════════════════════════════════════════════════════
  //  STATE
  // ══════════════════════════════════════════════════════
  let _cv, _ctx, _wrap;
  let _startTime = 0;
  let _raf = null;
  let _done = false;
  let _stars = [];
  let _asteroids = [];
  let _nebParts = [];
  let _particles = [];
  let _captionIdx = 0;
  let _currentCaption = null;
  let _captionAlpha = 0;
  let _W, _H;

  // ══════════════════════════════════════════════════════
  //  ENTRY
  // ══════════════════════════════════════════════════════
  function _play() {
    _done = false;
    _captionIdx = 0;
    _currentCaption = null;
    _buildDOM();
    _buildData();
    _startTime = performance.now();
    _raf = requestAnimationFrame(_loop);
  }

  // ══════════════════════════════════════════════════════
  //  DOM
  // ══════════════════════════════════════════════════════
  function _buildDOM() {
    _wrap = document.getElementById('cinematic-wrap');
    if (_wrap) _wrap.remove();

    _wrap = document.createElement('div');
    _wrap.id = 'cinematic-wrap';
    _wrap.style.cssText = [
      'position:fixed;inset:0;z-index:9999',
      'background:#000;overflow:hidden;cursor:pointer'
    ].join(';');

    _cv = document.createElement('canvas');
    _cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
    _wrap.appendChild(_cv);

    // Letterbox bars
    const barStyle = 'position:absolute;left:0;right:0;background:#000;z-index:2;pointer-events:none';
    const barH = 'clamp(20px,7vh,55px)';
    const topBar = document.createElement('div');
    topBar.style.cssText = barStyle + ';top:0;height:' + barH;
    const botBar = document.createElement('div');
    botBar.style.cssText = barStyle + ';bottom:0;height:' + barH;
    _wrap.appendChild(topBar);
    _wrap.appendChild(botBar);

    // Caption element
    const cap = document.createElement('div');
    cap.id = 'cin-caption';
    cap.style.cssText = [
      'position:absolute;bottom:clamp(28px,9vh,60px);left:0;right:0',
      'text-align:center;font-family:Orbitron,monospace',
      'font-size:clamp(10px,2.5vw,16px);letter-spacing:4px',
      'color:#fff;text-shadow:0 0 16px #00ffb4',
      'z-index:3;pointer-events:none;transition:opacity 0.4s',
      'opacity:0'
    ].join(';');
    _wrap.appendChild(cap);

    // Skip button
    const skip = document.createElement('button');
    skip.textContent = 'SKIP ›';
    skip.style.cssText = [
      'position:absolute;top:clamp(28px,6vh,45px);right:20px;z-index:10',
      'background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.2)',
      'color:rgba(255,255,255,0.5);font-family:Orbitron,monospace',
      'font-size:10px;letter-spacing:2px;padding:6px 14px',
      'border-radius:5px;cursor:pointer;transition:color 0.3s'
    ].join(';');
    skip.onmouseover = () => skip.style.color = '#fff';
    skip.onmouseleave = () => skip.style.color = 'rgba(255,255,255,0.5)';
    skip.onclick = (e) => { e.stopPropagation(); _finish(); };
    _wrap.appendChild(skip);

    // Tap anywhere to skip (after 2s)
    setTimeout(() => {
      _wrap.addEventListener('pointerdown', _finish);
    }, 2000);

    document.body.appendChild(_wrap);
    _resize();
    window.addEventListener('resize', _resize);
  }

  function _resize() {
    if (!_cv) return;
    _W = _cv.width  = window.innerWidth;
    _H = _cv.height = window.innerHeight;
    _ctx = _cv.getContext('2d');
  }

  // ══════════════════════════════════════════════════════
  //  DATA GENERATION
  // ══════════════════════════════════════════════════════
  function _buildData() {
    _W = window.innerWidth;
    _H = window.innerHeight;

    // Stars — 3 depth layers
    _stars = [];
    for (let i = 0; i < 280; i++) {
      _stars.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 1.8 + 0.3,
        layer: Math.floor(Math.random() * 3),        // 0=far,1=mid,2=near
        twinkleOff: Math.random() * Math.PI * 2,
        col: Math.random() < 0.12 ? '#aaddff' : (Math.random() < 0.08 ? '#ffddaa' : '#ffffff')
      });
    }

    // Asteroids
    _asteroids = [];
    for (let i = 0; i < 18; i++) {
      _asteroids.push({
        x: Math.random(),
        y: -0.1 - Math.random() * 0.3,
        size: Math.random() * 14 + 5,
        rot: Math.random() * Math.PI * 2,
        rotSpd: (Math.random() - 0.5) * 0.04,
        spd: Math.random() * 0.004 + 0.003,
        vx: (Math.random() - 0.5) * 0.002,
        col: `hsl(${25 + Math.random() * 20},${15 + Math.random() * 20}%,${25 + Math.random() * 15}%)`
      });
    }

    // Nebula clouds
    _nebParts = [];
    const nebColors = [
      'rgba(80,0,200,', 'rgba(200,0,80,', 'rgba(0,100,220,',
      'rgba(180,80,0,',  'rgba(0,180,100,'
    ];
    for (let i = 0; i < 8; i++) {
      _nebParts.push({
        x: Math.random(),
        y: Math.random() * 0.8 + 0.1,
        r: Math.random() * 0.35 + 0.15,
        alpha: Math.random() * 0.12 + 0.04,
        col: nebColors[i % nebColors.length],
        drift: (Math.random() - 0.5) * 0.00008
      });
    }
  }

  // ══════════════════════════════════════════════════════
  //  MAIN LOOP
  // ══════════════════════════════════════════════════════
  function _loop(now) {
    if (_done) return;
    const elapsed = now - _startTime;
    const t = elapsed; // ms

    if (t >= TOTAL_DURATION) {
      _finish();
      return;
    }

    _render(t);
    _updateCaption(t);
    _raf = requestAnimationFrame(_loop);
  }

  // ══════════════════════════════════════════════════════
  //  MASTER RENDERER
  // ══════════════════════════════════════════════════════
  function _render(t) {
    const ctx = _ctx;
    const W = _W, H = _H;
    if (!ctx) return;

    // Scene blend weights (0→1)
    const earth    = _sceneBlend(t, 0,    1800);
    const launch   = _sceneBlend(t, 1600, 3400);
    const asteroid = _sceneBlend(t, 3200, 5000);
    const nebula   = _sceneBlend(t, 4800, 6800);
    const boss     = _sceneBlend(t, 6600, 8400);
    const title    = _sceneBlend(t, 8200, 9500);

    // ── Background ───────────────────────────────────────
    ctx.fillStyle = '#000008';
    ctx.fillRect(0, 0, W, H);

    // ── Nebula clouds (blend in from scene 4) ───────────
    if (nebula > 0 || boss > 0) {
      const na = Math.max(nebula, boss) * 0.7;
      _drawNebulaLayer(ctx, W, H, na, t);
    }

    // ── Parallax stars ──────────────────────────────────
    const starSpeed = 0.5 + asteroid * 4 + boss * 1.5;
    _drawStarsParallax(ctx, W, H, t, starSpeed);

    // ── SCENE: EARTH ─────────────────────────────────────
    if (earth > 0) {
      ctx.globalAlpha = earth;
      _drawEarth(ctx, W, H, t, earth);
      ctx.globalAlpha = 1;
    }

    // ── SCENE: LAUNCH ────────────────────────────────────
    if (launch > 0) {
      ctx.globalAlpha = launch;
      _drawLaunchTrail(ctx, W, H, t, launch);
      ctx.globalAlpha = 1;
    }

    // ── SCENE: ASTEROID BELT ─────────────────────────────
    if (asteroid > 0) {
      ctx.globalAlpha = asteroid;
      _drawAsteroids(ctx, W, H, t, asteroid);
      ctx.globalAlpha = 1;
    }

    // ── SCENE: BOSS MOTHERSHIP ───────────────────────────
    if (boss > 0) {
      _drawBossReveal(ctx, W, H, t, boss);
    }

    // ── SCENE: TITLE ─────────────────────────────────────
    if (title > 0) {
      _drawTitleCard(ctx, W, H, title, t);
    }

    // ── Vignette ─────────────────────────────────────────
    const vig = ctx.createRadialGradient(W/2, H/2, H*0.3, W/2, H/2, H*0.85);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.65)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Scene blend: eased 0→1 within window ──────────────
  function _sceneBlend(t, start, end) {
    if (t < start || t > end) return 0;
    const raw = (t - start) / (end - start);
    // Ease in+out
    const fadeIn  = Math.min(1, (t - start) / 400);
    const fadeOut = Math.min(1, (end - t) / 400);
    return Math.min(fadeIn, fadeOut);
  }

  // ══════════════════════════════════════════════════════
  //  STAR PARALLAX
  // ══════════════════════════════════════════════════════
  function _drawStarsParallax(ctx, W, H, t, speedMult) {
    const elapsed = t / 1000;
    const speeds  = [0.012, 0.025, 0.055]; // far, mid, near
    _stars.forEach(s => {
      const spd = speeds[s.layer] * speedMult;
      const y = ((s.y + elapsed * spd) % 1 + 1) % 1;
      const twinkle = 0.5 + 0.5 * Math.sin(elapsed * 2 + s.twinkleOff);
      const alpha = (0.3 + s.layer * 0.25) * (0.6 + twinkle * 0.4);
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.fillStyle = s.col;
      ctx.beginPath();
      ctx.arc(s.x * W, y * H, s.size * (0.5 + s.layer * 0.3), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  // ══════════════════════════════════════════════════════
  //  NEBULA LAYER
  // ══════════════════════════════════════════════════════
  function _drawNebulaLayer(ctx, W, H, alpha, t) {
    const elapsed = t / 1000;
    _nebParts.forEach(n => {
      const x = ((n.x + elapsed * n.drift) % 1 + 1) % 1;
      const r = n.r * Math.max(W, H);
      const g = ctx.createRadialGradient(x * W, n.y * H, 0, x * W, n.y * H, r);
      g.addColorStop(0,   n.col + (n.alpha * alpha * 1.5).toFixed(2) + ')');
      g.addColorStop(0.5, n.col + (n.alpha * alpha * 0.6).toFixed(2) + ')');
      g.addColorStop(1,   n.col + '0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    });
  }

  // ══════════════════════════════════════════════════════
  //  SCENE 1: EARTH
  // ══════════════════════════════════════════════════════
  function _drawEarth(ctx, W, H, t, alpha) {
    const cx = W * 0.5;
    const cy = H * 0.58 + Math.sin(t / 4000) * H * 0.015;
    const r  = Math.min(W, H) * 0.28;

    // Atmospheric glow
    for (let i = 4; i >= 1; i--) {
      const gr = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * (1 + i * 0.18));
      gr.addColorStop(0, `rgba(30,120,255,${0.06 * alpha})`);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(cx, cy, r * (1 + i * 0.18), 0, Math.PI * 2); ctx.fill();
    }

    // Ocean base
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    const ocean = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
    ocean.addColorStop(0, '#2266dd');
    ocean.addColorStop(0.5, '#114499');
    ocean.addColorStop(1, '#061830');
    ctx.fillStyle = ocean; ctx.fill();

    // Continent masses
    ctx.clip();
    const continents = [
      { x: -0.28, y: -0.22, rx: 0.3, ry: 0.38, rot: 0.3 },  // Americas
      { x:  0.15, y: -0.18, rx: 0.26, ry: 0.34, rot: -0.2 }, // Eurasia
      { x:  0.15, y:  0.15, rx: 0.18, ry: 0.22, rot: 0.1 },  // Africa
      { x:  0.35, y:  0.08, rx: 0.12, ry: 0.18, rot: 0.4 },  // Australia
    ];
    continents.forEach(c => {
      ctx.fillStyle = `rgba(40,130,40,${0.85 * alpha})`;
      ctx.beginPath();
      ctx.ellipse(cx + c.x * r, cy + c.y * r, c.rx * r, c.ry * r, c.rot, 0, Math.PI * 2);
      ctx.fill();
    });

    // Desert patches
    [{ x: 0.18, y: -0.05 }, { x: -0.08, y: 0.12 }].forEach(d => {
      ctx.fillStyle = `rgba(200,160,60,${0.4 * alpha})`;
      ctx.beginPath();
      ctx.ellipse(cx + d.x * r, cy + d.y * r, r * 0.1, r * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // Cloud layer
    const cloudOff = (t / 25000) * Math.PI * 2;
    for (let ci = 0; ci < 6; ci++) {
      const ca = cloudOff + ci * Math.PI / 3;
      const ccx = cx + Math.cos(ca) * r * 0.55;
      const ccy = cy + Math.sin(ca) * r * 0.4;
      ctx.fillStyle = `rgba(255,255,255,${0.15 * alpha})`;
      ctx.beginPath();
      ctx.ellipse(ccx, ccy, r * 0.22, r * 0.07, ca, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ice caps
    ctx.fillStyle = `rgba(220,240,255,${0.7 * alpha})`;
    ctx.beginPath(); ctx.ellipse(cx, cy - r * 0.92, r * 0.38, r * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.92, r * 0.3, r * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Rim light
    const rim = ctx.createRadialGradient(cx + r * 0.6, cy - r * 0.5, r * 0.3, cx, cy, r);
    rim.addColorStop(0, 'rgba(255,255,255,0)');
    rim.addColorStop(0.7, 'rgba(60,140,255,0.06)');
    rim.addColorStop(1, `rgba(40,100,255,${0.35 * alpha})`);
    ctx.fillStyle = rim;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

    // Thin atmosphere rim
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(80,180,255,${0.6 * alpha})`;
    ctx.lineWidth = r * 0.025; ctx.stroke();

    // CITY LIGHTS on dark side (lower half)
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    for (let li = 0; li < 20; li++) {
      const la = Math.random() * Math.PI + 0.2;
      const lr = r * (0.3 + Math.random() * 0.65);
      const lx = cx + Math.cos(la) * lr;
      const ly = cy + r * 0.1 + Math.sin(la) * lr * 0.5;
      ctx.fillStyle = `rgba(255,220,100,${0.25 * alpha * Math.sin(t / 800 + li) * 0.5 + 0.5})`;
      ctx.beginPath(); ctx.arc(lx, ly, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // Moon in top-right
    const mx = W * 0.78 + Math.cos(t / 8000) * W * 0.04;
    const my = H * 0.18 + Math.sin(t / 8000) * H * 0.03;
    const mr = Math.min(W, H) * 0.04;
    const moonG = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, 0, mx, my, mr);
    moonG.addColorStop(0, '#dde8f0');
    moonG.addColorStop(0.7, '#aabbcc');
    moonG.addColorStop(1, '#556677');
    ctx.fillStyle = moonG;
    ctx.globalAlpha = alpha * 0.8;
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // ══════════════════════════════════════════════════════
  //  SCENE 2: SATELLITE LAUNCH
  // ══════════════════════════════════════════════════════
  function _drawLaunchTrail(ctx, W, H, t, alpha) {
    // Satellite travels from bottom-center upward
    const prog  = Math.min(1, Math.max(0, (t - 1600) / 1800));
    const sx    = W * 0.5 + Math.sin(prog * Math.PI * 3) * W * 0.12;
    const sy    = H * (0.85 - prog * 0.75);

    // Thruster trail (fading gradient line)
    for (let ti = 0; ti < 20; ti++) {
      const tp = prog - ti * 0.025;
      if (tp < 0) break;
      const tx = W * 0.5 + Math.sin(tp * Math.PI * 3) * W * 0.12;
      const ty = H * (0.85 - tp * 0.75);
      const ta = (1 - ti / 20) * 0.5 * alpha;
      ctx.beginPath(); ctx.arc(tx, ty, (5 - ti * 0.2) * alpha, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,200,255,${Math.min(1, Math.max(0, ta))})`;
      ctx.fill();
    }

    // Exhaust glow
    ctx.beginPath(); ctx.arc(sx, sy + 15, 10 * alpha, 0, Math.PI * 2);
    const eg = ctx.createRadialGradient(sx, sy + 15, 0, sx, sy + 15, 14);
    eg.addColorStop(0, `rgba(0,200,255,${0.8 * alpha})`);
    eg.addColorStop(1, 'rgba(0,50,200,0)');
    ctx.fillStyle = eg; ctx.fill();

    // Satellite body
    ctx.save();
    ctx.translate(sx, sy);

    // Solar panels
    ctx.fillStyle = `rgba(20,60,120,${alpha})`;
    ctx.strokeStyle = `rgba(0,200,255,${alpha})`;
    ctx.lineWidth = 1;
    [[-24, 0, 18, 8], [6, 0, 18, 8]].forEach(([px, py, pw, ph]) => {
      ctx.fillRect(px, py - ph/2, pw, ph);
      ctx.strokeRect(px, py - ph/2, pw, ph);
      // Solar cells
      for (let ci = 1; ci < 4; ci++) {
        ctx.beginPath();
        ctx.moveTo(px + ci * pw/4, py - ph/2);
        ctx.lineTo(px + ci * pw/4, py + ph/2);
        ctx.strokeStyle = `rgba(0,150,255,${0.5 * alpha})`;
        ctx.stroke();
      }
    });

    // Core hex body
    ctx.beginPath();
    for (let hi = 0; hi < 6; hi++) {
      const ha = hi * Math.PI / 3;
      hi === 0 ? ctx.moveTo(Math.cos(ha) * 9, Math.sin(ha) * 9)
               : ctx.lineTo(Math.cos(ha) * 9, Math.sin(ha) * 9);
    }
    ctx.closePath();
    ctx.fillStyle = `rgba(10,30,60,${alpha})`; ctx.fill();
    ctx.strokeStyle = `rgba(0,255,180,${alpha})`; ctx.lineWidth = 1.5; ctx.stroke();

    // Core glow
    const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, 6);
    cg.addColorStop(0, `rgba(255,255,255,${alpha})`);
    cg.addColorStop(0.5, `rgba(0,255,255,${0.8 * alpha})`);
    cg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ══════════════════════════════════════════════════════
  //  SCENE 3: ASTEROID BELT
  // ══════════════════════════════════════════════════════
  function _drawAsteroids(ctx, W, H, t, alpha) {
    const elapsed = (t - 3200) / 1000;

    _asteroids.forEach((a, i) => {
      const y = ((a.y + elapsed * a.spd) % 1.4 + 1.4) % 1.4;
      const x = ((a.x + elapsed * a.vx) % 1 + 1) % 1;
      const rot = a.rot + elapsed * a.rotSpd;
      const depth = 0.4 + (i % 3) * 0.3; // parallax depth

      ctx.save();
      ctx.globalAlpha = depth * alpha;
      ctx.translate(x * W, y * H);
      ctx.rotate(rot);

      const s = a.size * depth;

      // Asteroid body — irregular polygon
      ctx.beginPath();
      for (let v = 0; v < 8; v++) {
        const va = v * Math.PI / 4;
        const vr = s * (0.7 + Math.sin(v * 2.3 + i) * 0.3);
        v === 0 ? ctx.moveTo(Math.cos(va) * vr, Math.sin(va) * vr)
                : ctx.lineTo(Math.cos(va) * vr, Math.sin(va) * vr);
      }
      ctx.closePath();
      ctx.fillStyle = a.col;
      ctx.fill();

      // Surface cracks
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-s * 0.3, -s * 0.1);
      ctx.lineTo(s * 0.1, s * 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.2, -s * 0.4);
      ctx.lineTo(-s * 0.1, s * 0.1);
      ctx.stroke();

      // Highlight
      ctx.fillStyle = `rgba(255,255,255,${0.12 * depth * alpha})`;
      ctx.beginPath(); ctx.arc(-s * 0.2, -s * 0.25, s * 0.22, 0, Math.PI * 2); ctx.fill();

      // Speed streak (motion blur)
      ctx.strokeStyle = `rgba(200,180,160,${0.15 * alpha})`;
      ctx.lineWidth = s * 0.4;
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(0, -s * 2.5);
      ctx.stroke();

      ctx.restore();
    });
  }

  // ══════════════════════════════════════════════════════
  //  SCENE 5: BOSS REVEAL
  // ══════════════════════════════════════════════════════
  function _drawBossReveal(ctx, W, H, t, alpha) {
    const prog = Math.min(1, Math.max(0, (t - 6600) / 1800));
    const bx   = W * 0.5;
    const by   = H * (0.35 - prog * 0.02);

    // Doom atmosphere — red fog fills from top
    const fog = ctx.createRadialGradient(bx, H * 0.1, 0, bx, H * 0.3, H * 0.6);
    fog.addColorStop(0, `rgba(200,0,0,${0.18 * alpha * prog})`);
    fog.addColorStop(0.5, `rgba(100,0,20,${0.1 * alpha * prog})`);
    fog.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, W, H);

    // Boss arrives scale from 0
    const bScale = Math.min(1, prog * 1.4);
    const bSize  = Math.min(W, H) * 0.18 * bScale;

    ctx.save();
    ctx.translate(bx, by);

    // Warning rings — expanding outward
    for (let ri = 0; ri < 4; ri++) {
      const rp = (prog * 1.5 - ri * 0.25) % 1;
      if (rp <= 0) continue;
      ctx.beginPath();
      ctx.arc(0, 0, bSize * (1.5 + rp * 2.5), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,${Math.floor(80 * (1 - rp))},0,${Math.min(1, (1 - rp) * 0.5 * alpha)})`;
      ctx.lineWidth = 2 - rp;
      ctx.stroke();
    }

    // Outer corona
    const corona = ctx.createRadialGradient(0, 0, bSize * 0.6, 0, 0, bSize * 2.2);
    corona.addColorStop(0, `rgba(255,50,0,${0.25 * alpha})`);
    corona.addColorStop(0.6, `rgba(150,0,0,${0.1 * alpha})`);
    corona.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = corona;
    ctx.beginPath(); ctx.arc(0, 0, bSize * 2.2, 0, Math.PI * 2); ctx.fill();

    // Spinning orbit rings
    for (let ri = 0; ri < 3; ri++) {
      const rr = bSize * (1.2 + ri * 0.35);
      const ra = t * (0.0004 + ri * 0.0002) * (ri % 2 === 0 ? 1 : -1);
      ctx.beginPath();
      ctx.arc(0, 0, rr, ra, ra + Math.PI * (1.2 + ri * 0.2));
      ctx.strokeStyle = `rgba(255,${60 + ri * 20},0,${0.5 * alpha})`;
      ctx.lineWidth = 1.5 - ri * 0.3;
      ctx.stroke();

      // Nodes on ring
      for (let ni = 0; ni < 3 + ri; ni++) {
        const na = ra + ni * (Math.PI * 2 / (3 + ri));
        const np = Math.sin(t / 300 + ni * 2) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(Math.cos(na) * rr, Math.sin(na) * rr, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,120,0,${np * alpha})`;
        ctx.fill();
      }
    }

    // Hull — octagon segments
    for (let seg = 0; seg < 8; seg++) {
      const a1 = seg * Math.PI / 4 - Math.PI / 8;
      const a2 = (seg + 1) * Math.PI / 4 - Math.PI / 8;
      const shade = seg % 2 === 0 ? 0.7 : 0.45;
      const r = 60, g = 10, b = 10;
      ctx.fillStyle = `rgba(${Math.round(r*shade)},${Math.round(g*shade)},${Math.round(b*shade)},${0.95 * alpha})`;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a1) * bSize, Math.sin(a1) * bSize);
      ctx.lineTo(Math.cos(a2) * bSize, Math.sin(a2) * bSize);
      ctx.closePath(); ctx.fill();
    }

    // Hull outline
    ctx.beginPath();
    for (let hv = 0; hv < 8; hv++) {
      const ha = hv * Math.PI / 4 - Math.PI / 8;
      hv === 0 ? ctx.moveTo(Math.cos(ha) * bSize, Math.sin(ha) * bSize)
               : ctx.lineTo(Math.cos(ha) * bSize, Math.sin(ha) * bSize);
    }
    ctx.closePath();
    ctx.strokeStyle = `rgba(255,80,0,${alpha})`;
    ctx.lineWidth = 3 * alpha; ctx.stroke();

    // Core reactor — pulsing
    const pulse = 0.7 + Math.sin(t / 150) * 0.3;
    const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, bSize * 0.45);
    cg.addColorStop(0, `rgba(255,255,255,${pulse * alpha})`);
    cg.addColorStop(0.3, `rgba(255,100,0,${pulse * 0.9 * alpha})`);
    cg.addColorStop(0.7, `rgba(200,0,0,${0.5 * alpha})`);
    cg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(0, 0, bSize * 0.45, 0, Math.PI * 2); ctx.fill();

    // Warning eyes — two glowing red orbs
    [[-bSize * 0.28, -bSize * 0.1], [bSize * 0.28, -bSize * 0.1]].forEach(([ex, ey]) => {
      const eyeG = ctx.createRadialGradient(ex, ey, 0, ex, ey, bSize * 0.12);
      eyeG.addColorStop(0, '#ffffff');
      eyeG.addColorStop(0.3, `rgba(255,0,0,${alpha})`);
      eyeG.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = eyeG;
      ctx.beginPath(); ctx.arc(ex, ey, bSize * 0.12, 0, Math.PI * 2); ctx.fill();
    });

    // "MOTHERSHIP" label (fades in late)
    if (prog > 0.6) {
      const la = Math.min(1, (prog - 0.6) / 0.4) * alpha;
      ctx.font = `bold clamp(9px,1.8vw,14px) Orbitron,monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(255,80,0,${la})`;
      ctx.fillText('ZARAK MOTHERSHIP', 0, bSize * 1.4);
      ctx.font = `clamp(7px,1.4vw,11px) Orbitron,monospace`;
      ctx.fillStyle = `rgba(255,150,100,${la * 0.7})`;
      ctx.fillText('THREAT LEVEL: OMEGA', 0, bSize * 1.6);
    }

    ctx.restore();
  }

  // ══════════════════════════════════════════════════════
  //  SCENE 6: TITLE CARD
  // ══════════════════════════════════════════════════════
  function _drawTitleCard(ctx, W, H, alpha, t) {
    const cy = H * 0.42;

    // Satellite icon
    ctx.font = `${Math.min(W, H) * 0.08}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.globalAlpha = alpha;
    ctx.fillText('🛰️', W * 0.5, cy - Math.min(W, H) * 0.1);

    // Title glow
    ctx.shadowBlur = 30 * alpha;
    ctx.shadowColor = '#00ffb4';

    ctx.font = `bold clamp(22px,6vw,54px) Orbitron,monospace`;
    ctx.fillStyle = `rgba(0,255,180,${alpha})`;
    ctx.fillText('DARK ORBIT PRO', W * 0.5, cy);

    ctx.shadowBlur = 0;

    ctx.font = `clamp(8px,1.8vw,13px) Orbitron,monospace`;
    ctx.fillStyle = `rgba(180,220,255,${alpha * 0.7})`;
    ctx.fillText('ELITE COMMANDER EDITION', W * 0.5, cy + Math.min(W, H) * 0.06);

    // Divider
    const dw = Math.min(W * 0.4, 280) * alpha;
    const dg = ctx.createLinearGradient(W * 0.5 - dw, 0, W * 0.5 + dw, 0);
    dg.addColorStop(0, 'rgba(0,255,180,0)');
    dg.addColorStop(0.5, `rgba(0,255,180,${alpha * 0.6})`);
    dg.addColorStop(1, 'rgba(0,255,180,0)');
    ctx.fillStyle = dg;
    ctx.fillRect(W * 0.5 - dw, cy + Math.min(W, H) * 0.08, dw * 2, 1);

    // Tap prompt — blinks
    if (alpha > 0.7) {
      const blink = 0.5 + 0.5 * Math.sin(t / 400);
      ctx.font = `clamp(9px,1.6vw,12px) Orbitron,monospace`;
      ctx.fillStyle = `rgba(0,255,180,${blink * alpha})`;
      ctx.fillText('[ TAP TO BEGIN ]', W * 0.5, cy + Math.min(W, H) * 0.16);
    }

    ctx.globalAlpha = 1;
  }

  // ══════════════════════════════════════════════════════
  //  CAPTIONS
  // ══════════════════════════════════════════════════════
  function _updateCaption(t) {
    // Find current caption
    while (_captionIdx < CAPTIONS.length && CAPTIONS[_captionIdx].t <= t) {
      _currentCaption = CAPTIONS[_captionIdx];
      _captionAlpha = 0;
      _captionIdx++;
    }
    if (!_currentCaption) return;

    const el = document.getElementById('cin-caption');
    if (!el) return;

    _captionAlpha = Math.min(1, _captionAlpha + 0.05);
    el.textContent = _currentCaption.text;
    el.style.color = _currentCaption.color;
    el.style.textShadow = `0 0 20px ${_currentCaption.color}`;
    el.style.opacity = _captionAlpha;
  }

  // ══════════════════════════════════════════════════════
  //  FINISH
  // ══════════════════════════════════════════════════════
  function _finish() {
    if (_done) return;
    _done = true;
    if (_raf) cancelAnimationFrame(_raf);
    window.removeEventListener('resize', _resize);
    SAVE.set('cinematicSeen', true);

    // Fade out
    if (_wrap) {
      _wrap.style.transition = 'opacity 0.7s';
      _wrap.style.opacity = '0';
      _wrap.style.pointerEvents = 'none';
      setTimeout(() => {
        if (_wrap) _wrap.remove();
        // Show main menu
        const menu = document.getElementById('menu');
        if (menu) {
          menu.classList.remove('off');
          menu.style.opacity = '0';
          menu.style.transition = 'opacity 0.5s';
          requestAnimationFrame(() => requestAnimationFrame(() => {
            menu.style.opacity = '1';
          }));
        }
        // Daily reward
        if (typeof claimDaily === 'function') setTimeout(claimDaily, 600);
      }, 750);
    }
  }

  // ══════════════════════════════════════════════════════
  //  AUTO-START
  // ══════════════════════════════════════════════════════
  function _autoInit() {
    if (!window.CINEMATIC.shouldPlay()) return;
    const menu = document.getElementById('menu');
    if (menu) menu.classList.add('off');
    window.CINEMATIC.play();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _autoInit);
  } else {
    setTimeout(_autoInit, 0);
  }

})();
