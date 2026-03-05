// ==================== graphics-plus.js ====================
// Enhanced Graphics: Parallax Space + Boss Entrance Cinematic
// Load: AFTER game.js  (patches drawStars + drawBoss in-place)
// ─────────────────────────────────────────────────────────────

(function () {

  // ══════════════════════════════════════════════════════
  //  1. PARALLAX STAR FIELD  (replaces flat drawStars)
  // ══════════════════════════════════════════════════════

  // 3-layer star data — generated once on first call
  let _starLayers = null;
  let _shootingStars = [];
  let _nextShootingStar = 0;

  function _buildStarLayers() {
    _starLayers = [
      // Layer 0 — far (tiny, slow, blue-ish)
      Array.from({ length: 90 }, () => ({
        x: Math.random(), y: Math.random(),
        size: Math.random() * 0.8 + 0.2,
        twinkle: Math.random() * Math.PI * 2,
        col: Math.random() < 0.2 ? '#aaccff' : '#ffffff'
      })),
      // Layer 1 — mid
      Array.from({ length: 60 }, () => ({
        x: Math.random(), y: Math.random(),
        size: Math.random() * 1.3 + 0.4,
        twinkle: Math.random() * Math.PI * 2,
        col: Math.random() < 0.15 ? '#ffddaa' : (Math.random() < 0.1 ? '#ffaaaa' : '#ffffff')
      })),
      // Layer 2 — near (large, fast)
      Array.from({ length: 30 }, () => ({
        x: Math.random(), y: Math.random(),
        size: Math.random() * 2 + 0.8,
        twinkle: Math.random() * Math.PI * 2,
        col: '#ffffff'
      }))
    ];
  }

  // Parallax speeds per layer (pixels/frame at base)
  const LAYER_SPEED = [0.15, 0.35, 0.75];

  // Patch global drawStars
  window.drawStars = function (alpha, speedMult) {
    if (!_starLayers) _buildStarLayers();

    const freeze = (typeof timeFreeze !== 'undefined' && timeFreeze > 0) ? 0.05 : 1;
    const sm = (speedMult || 1) * freeze;

    LAYER_SPEED.forEach((baseSpd, li) => {
      const layer = _starLayers[li];
      const spd = baseSpd * sm;

      layer.forEach(s => {
        // Move
        s.y += spd / (typeof H !== 'undefined' ? H : 600);
        if (s.y > 1) { s.y = 0; s.x = Math.random(); }

        // Twinkle
        s.twinkle += 0.03 + li * 0.01;
        const tw = 0.55 + 0.45 * Math.sin(s.twinkle);

        const baseAlpha = (0.35 + li * 0.22) * tw;
        ctx.globalAlpha = Math.min(1, alpha * baseAlpha);
        ctx.fillStyle = s.col;

        // Near stars get a subtle glow cross
        if (li === 2 && s.size > 1.5) {
          ctx.shadowBlur = 4;
          ctx.shadowColor = s.col;
        }

        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H, s.size * (0.5 + li * 0.25), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    });

    ctx.globalAlpha = 1;

    // Shooting stars
    _tickShootingStars(sm);
  };

  function _tickShootingStars(sm) {
    if (typeof F === 'undefined') return;

    // Spawn new one occasionally
    _nextShootingStar--;
    if (_nextShootingStar <= 0 && Math.random() < 0.35) {
      _nextShootingStar = 180 + Math.random() * 240;
      _shootingStars.push({
        x: Math.random(),
        y: Math.random() * 0.4,
        vx: (0.004 + Math.random() * 0.006) * (Math.random() < 0.5 ? 1 : -1),
        vy: 0.003 + Math.random() * 0.004,
        life: 1.0,
        len: 0.06 + Math.random() * 0.08
      });
    }

    for (let i = _shootingStars.length - 1; i >= 0; i--) {
      const s = _shootingStars[i];
      s.x += s.vx * sm;
      s.y += s.vy * sm;
      s.life -= 0.018 * sm;
      if (s.life <= 0 || s.y > 1) { _shootingStars.splice(i, 1); continue; }

      const ex = (s.x - s.vx * s.len * 18) * W;
      const ey = (s.y - s.vy * s.len * 18) * H;
      const x2 = s.x * W, y2 = s.y * H;

      const grad = ctx.createLinearGradient(ex, ey, x2, y2);
      grad.addColorStop(0, `rgba(255,255,255,0)`);
      grad.addColorStop(1, `rgba(255,255,255,${Math.min(1, s.life * 0.9)})`);

      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5 * s.life;
      ctx.stroke();

      // Head sparkle
      ctx.beginPath(); ctx.arc(x2, y2, 2 * s.life, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${Math.min(1, s.life)})`;
      ctx.fill();
    }
  }

  // ══════════════════════════════════════════════════════
  //  2. DEEP SPACE NEBULA BACKGROUND
  //     Call this before drawStars in your render loop
  // ══════════════════════════════════════════════════════
  const _NEBULA_LAYERS = [
    { cx: 0.20, cy: 0.25, rx: 0.35, ry: 0.28, col: 'rgba(0,80,200,',   a: 0.055 },
    { cx: 0.75, cy: 0.45, rx: 0.30, ry: 0.22, col: 'rgba(120,0,180,',  a: 0.050 },
    { cx: 0.50, cy: 0.70, rx: 0.40, ry: 0.30, col: 'rgba(180,40,0,',   a: 0.045 },
    { cx: 0.15, cy: 0.65, rx: 0.25, ry: 0.20, col: 'rgba(0,140,80,',   a: 0.040 },
    { cx: 0.85, cy: 0.20, rx: 0.22, ry: 0.18, col: 'rgba(200,100,0,',  a: 0.038 },
  ];

  window.drawNebula = function () {
    if (typeof W === 'undefined') return;
    const drift = typeof F !== 'undefined' ? F * 0.00003 : 0;
    _NEBULA_LAYERS.forEach((n, i) => {
      const nx = (n.cx + drift * (i % 2 === 0 ? 1 : -1)) * W;
      const ny = n.cy * H;
      const rx = n.rx * Math.max(W, H);
      const ry = n.ry * Math.max(W, H);
      const g  = ctx.createRadialGradient(nx, ny, 0, nx, ny, rx);
      g.addColorStop(0,   n.col + (n.a * 1.4).toFixed(3) + ')');
      g.addColorStop(0.5, n.col + n.a.toFixed(3) + ')');
      g.addColorStop(1,   n.col + '0)');
      ctx.save();
      ctx.scale(1, ry / rx);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H * rx / ry);
      ctx.restore();
    });
  };

  // ══════════════════════════════════════════════════════
  //  3. BOSS ENTRANCE CINEMATIC
  //     Triggered when boss fight starts — dramatic reveal
  // ══════════════════════════════════════════════════════
  let _bossEntranceActive = false;
  let _bossEntranceFrame  = 0;
  const BOSS_ENTRANCE_FRAMES = 180; // 3 seconds at 60fps

  // Store original showBossWarning
  const _origBossWarning = window.showBossWarning;

  window.showBossWarning = function () {
    _triggerBossEntrance();
    if (_origBossWarning) _origBossWarning();
  };

  function _triggerBossEntrance() {
    _bossEntranceActive = true;
    _bossEntranceFrame  = 0;

    // Screen shake + red flash
    if (typeof shk   !== 'undefined') shk   = 30;
    if (typeof flash !== 'undefined') flash = 0.6;

    // Create dramatic overlay
    const ov = document.createElement('div');
    ov.id = 'boss-entrance-overlay';
    ov.style.cssText = [
      'position:fixed;inset:0;z-index:300;pointer-events:none',
      'display:flex;flex-direction:column;align-items:center;justify-content:center',
      'font-family:Orbitron,monospace'
    ].join(';');

    ov.innerHTML = `
      <div id="beo-bg" style="
        position:absolute;inset:0;
        background:radial-gradient(ellipse at 50% 30%, rgba(200,0,0,0.35), rgba(0,0,0,0) 70%);
        animation:beoFadeIn 0.3s ease-out
      "></div>
      <div id="beo-warning" style="
        position:relative;z-index:1;text-align:center;
        animation:beoSlam 0.4s cubic-bezier(0.3,-0.3,0.7,1.3) both
      ">
        <div style="font-size:clamp(28px,8vw,64px);line-height:1;
          color:#ff2200;text-shadow:0 0 40px #ff0000,0 0 80px #aa0000;
          letter-spacing:8px;font-weight:900">
          ⚠ WARNING ⚠
        </div>
        <div style="font-size:clamp(12px,3vw,22px);color:#ffaa00;
          letter-spacing:4px;margin-top:8px;
          text-shadow:0 0 20px #ff6600">
          MOTHERSHIP DETECTED
        </div>
        <div id="beo-rank" style="font-size:clamp(8px,2vw,14px);
          color:rgba(255,180,100,0.7);letter-spacing:3px;margin-top:6px">
          PREPARING BATTLE STATIONS...
        </div>
      </div>
    `;

    if (!document.getElementById('beo-styles')) {
      const st = document.createElement('style');
      st.id = 'beo-styles';
      st.textContent = `
        @keyframes beoFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes beoSlam {
          0%  { transform:scale(2.5) translateY(-40px); opacity:0; }
          60% { transform:scale(0.92) translateY(4px);  opacity:1; }
          100%{ transform:scale(1) translateY(0);       opacity:1; }
        }
        @keyframes beoPulse {
          0%,100%{ text-shadow:0 0 40px #ff0000,0 0 80px #aa0000; }
          50%    { text-shadow:0 0 60px #ff4400,0 0 120px #ff2200; }
        }
        @keyframes beoFadeOut { to{opacity:0;transform:scale(1.1)} }
      `;
      document.head.appendChild(st);
    }

    document.body.appendChild(ov);

    // Update rank display
    const rankEl = document.getElementById('beo-rank');
    if (rankEl && typeof bossRank !== 'undefined') {
      const rankNames = ['DESTROYER','ANNIHILATOR','DREADNOUGHT','OBLITERATOR',
                         'VOID BRINGER','DEATH STAR','DARK EMPEROR','SHADOW TITAN',
                         'ABYSS LORD','OMEGA PRIME'];
      const rn = rankNames[Math.min((bossRank || 1) - 1, 9)];
      rankEl.textContent = 'RANK ' + (bossRank || 1) + ': ' + rn;
      rankEl.style.color = '#ff4400';
    }

    // Pulse warning text
    const warnEl = ov.querySelector('div[style*="WARNING"]');
    if (warnEl) {
      setTimeout(() => {
        if (warnEl.style) warnEl.style.animation += ',beoPulse 0.5s ease-in-out infinite';
      }, 400);
    }

    // Remove after 2.4s
    setTimeout(() => {
      ov.style.animation = 'beoFadeOut 0.5s ease-out forwards';
      setTimeout(() => ov.remove(), 500);
    }, 2000);
  }

  // ══════════════════════════════════════════════════════
  //  4. ENHANCED BOSS PHASE TRANSITION
  // ══════════════════════════════════════════════════════
  window.showBossPhaseTransition = function (phase) {
    const colors  = ['', '#ff8800', '#ff2200'];
    const labels  = ['', 'PHASE 2 — SIEGE MODE', 'PHASE 3 — ENRAGE !!!'];
    const col     = colors[Math.min(phase, 2)];
    const label   = labels[Math.min(phase, 2)];
    if (!col) return;

    // Screen flash
    if (typeof flash !== 'undefined') flash = 0.8;
    if (typeof shk   !== 'undefined') shk   = 20;

    // Phase banner
    const banner = document.createElement('div');
    banner.style.cssText = [
      'position:fixed;top:50%;left:50%;z-index:350;pointer-events:none',
      'transform:translate(-50%,-50%)',
      'font-family:Orbitron,monospace;text-align:center',
      'animation:beoSlam 0.5s cubic-bezier(0.3,-0.3,0.7,1.3) both'
    ].join(';');
    banner.innerHTML = `
      <div style="font-size:clamp(14px,4vw,32px);font-weight:900;
        color:${col};text-shadow:0 0 30px ${col};letter-spacing:5px">
        ${label}
      </div>
      <div style="font-size:clamp(8px,2vw,14px);color:rgba(255,200,100,0.7);
        letter-spacing:3px;margin-top:5px">
        NEW ATTACK PATTERN UNLOCKED
      </div>
    `;
    document.body.appendChild(banner);
    setTimeout(() => {
      banner.style.transition = 'opacity 0.5s';
      banner.style.opacity = '0';
      setTimeout(() => banner.remove(), 500);
    }, 2000);

    // Ring explosion effect on canvas
    if (typeof bossX !== 'undefined' && typeof pushParticle !== 'undefined') {
      for (let i = 0; i < 24; i++) {
        const a = i * Math.PI / 12;
        pushParticle({
          x: bossX, y: bossY,
          vx: Math.cos(a) * (8 + Math.random() * 6),
          vy: Math.sin(a) * (8 + Math.random() * 6),
          life: 50, maxLife: 55,
          color: col, size: 5 + Math.random() * 6,
          funny: false, rotation: 0, rotSpeed: 0.1
        });
      }
    }
  };

  // ══════════════════════════════════════════════════════
  //  5. ENHANCED PLANET DRAWING (stronger glow + rings)
  // ══════════════════════════════════════════════════════
  const _origDrawPlanet = window.drawPlanet;
  window.drawPlanet = function (cx, cy, r, gradStops, continentColor, desertColor, atmColor, shadowOffX, hasClouds) {
    if (_origDrawPlanet) _origDrawPlanet(cx, cy, r, gradStops, continentColor, desertColor, atmColor, shadowOffX, hasClouds);

    // Extra: outer lens flare
    if (typeof W !== 'undefined') {
      const lensX = W * 0.75, lensY = H * 0.22;
      const dist  = Math.hypot(lensX - cx, lensY - cy);
      if (dist < W * 0.6) {
        const lg = ctx.createRadialGradient(lensX, lensY, 0, lensX, lensY, r * 0.5);
        lg.addColorStop(0, 'rgba(255,255,255,0.06)');
        lg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = lg;
        ctx.beginPath(); ctx.arc(lensX, lensY, r * 0.5, 0, Math.PI * 2); ctx.fill();
      }
    }
  };

  // ══════════════════════════════════════════════════════
  //  6. SPACE DUST PARTICLES (always drifting)
  // ══════════════════════════════════════════════════════
  let _dustParticles = null;

  function _buildDust() {
    _dustParticles = Array.from({ length: 40 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0003,
      vy: Math.random() * 0.0004 + 0.0001,
      size: Math.random() * 1.2 + 0.3,
      alpha: Math.random() * 0.15 + 0.04
    }));
  }

  window.drawSpaceDust = function () {
    if (!_dustParticles) _buildDust();
    if (typeof W === 'undefined') return;
    const freeze = (typeof timeFreeze !== 'undefined' && timeFreeze > 0) ? 0.05 : 1;

    _dustParticles.forEach(d => {
      d.x += d.vx * freeze;
      d.y += d.vy * freeze;
      if (d.y > 1) { d.y = 0; d.x = Math.random(); }
      if (d.x < 0) d.x = 1;
      if (d.x > 1) d.x = 0;

      ctx.globalAlpha = d.alpha;
      ctx.fillStyle = '#8899cc';
      ctx.beginPath();
      ctx.arc(d.x * W, d.y * H, d.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  };

  // ══════════════════════════════════════════════════════
  //  7. HOOK drawNebula + drawSpaceDust into render loop
  //     We patch the background drawing section of game.js
  //     by hooking the initStars / drawStars calls
  // ══════════════════════════════════════════════════════
  // The game calls drawStars(alpha, speedMult) each frame.
  // We've already overridden that above.
  // Now also call drawNebula + drawSpaceDust before stars:

  const _patchedDrawStars = window.drawStars;
  window.drawStars = function (alpha, speedMult) {
    // Nebula first (behind stars)
    if (typeof drawNebula === 'function') drawNebula();
    // Space dust
    if (typeof drawSpaceDust === 'function') drawSpaceDust();
    // Stars (parallax, with shooting stars)
    _patchedDrawStars(alpha, speedMult);
  };

  console.log('[graphics-plus] Parallax stars, nebula, boss entrance — active');

})();
