// ==================== intro.js ====================
// Cinematic Story Intro — DARK ORBIT PRO
// Load order: AFTER config.js, BEFORE alien.js
// In index.html: <script src="intro.js"></script> right after config.js

(function () {

  // ── STORY TEXT (typewriter) ─────────────────────────────────────────────────
  const STORY_LINES = [
    { text: "YEAR 2247.", delay: 0, color: "#ff4444", big: true },
    { text: "The Galactic Union is silent.", delay: 1200, color: "#aaddff", big: false },
    { text: "One by one, our colonies fell.", delay: 2600, color: "#aaddff", big: false },
    { text: "The ZARAK HIVE is coming.", delay: 4000, color: "#ff8800", big: false },
    { text: "They have destroyed everything…", delay: 5400, color: "#aaddff", big: false },
    { text: "…except you.", delay: 6800, color: "#00ffb4", big: false },
    { text: "You are the last satellite guardian.", delay: 8000, color: "#aaddff", big: false },
    { text: "Earth's fate rests in your hands.", delay: 9400, color: "#ffffff", big: false },
  ];

  // ── PHASE CONSTANTS ─────────────────────────────────────────────────────────
  const TOTAL_STORY_MS = 11000;  // when "TAP TO ENTER" appears
  const SKIP_ALLOW_MS = 1500;   // skip button appears after 1.5s
  const SHOW_EVERY_LAUNCH = false; // true = show every launch | false = only first time

  // ── STATE ───────────────────────────────────────────────────────────────────
  let introCanvas, introCtx;
  let introRunning = false;
  let introRAF = null;
  let introStars = [];
  let introFrame = 0;
  let showTap = false;
  let tapPulse = 0;
  let introDone = false;
  let skipAllowed = false;
  let nebulaParts = [];

  // ── ENTRY POINT ─────────────────────────────────────────────────────────────
  window.INTRO = {
    shouldShow: function () {
      if (SHOW_EVERY_LAUNCH) return true;
      return !SAVE.get('introDone');
    },
    start: function () {
      _buildDOM();
      _buildStars();
      _buildNebula();
      introRunning = true;
      introFrame = 0;
      _scheduleLines();
      _loop();
      // Allow skip after SKIP_ALLOW_MS
      setTimeout(function () { skipAllowed = true; _showSkipBtn(); }, SKIP_ALLOW_MS);
      // Show "tap to enter" after story is done
      setTimeout(function () { showTap = true; }, TOTAL_STORY_MS);
    },
    finish: _finish
  };

  // ── DOM BUILD ───────────────────────────────────────────────────────────────
  function _buildDOM() {
    const wrap = document.createElement('div');
    wrap.id = 'intro-screen';
    wrap.style.cssText = [
      'position:fixed;inset:0;z-index:9999',
      'background:#000008',
      'display:flex;flex-direction:column',
      'align-items:center;justify-content:center',
      'overflow:hidden',
      'cursor:pointer',
      'font-family:Orbitron,monospace'
    ].join(';');

    // Canvas layer (stars + nebula)
    introCanvas = document.createElement('canvas');
    introCanvas.id = 'intro-canvas';
    introCanvas.style.cssText = 'position:absolute;inset:0;z-index:0';
    wrap.appendChild(introCanvas);

    // Scanline overlay
    const scan = document.createElement('div');
    scan.style.cssText = [
      'position:absolute;inset:0;z-index:1;pointer-events:none',
      'background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.07) 3px,rgba(0,0,0,0.07) 4px)'
    ].join(';');
    wrap.appendChild(scan);

    // Logo container
    const logoWrap = document.createElement('div');
    logoWrap.id = 'intro-logo-wrap';
    logoWrap.style.cssText = [
      'position:relative;z-index:2;text-align:center',
      'animation:introLogoIn 1.2s ease-out both'
    ].join(';');

    const logoIcon = document.createElement('div');
    logoIcon.textContent = '🛰️';
    logoIcon.style.cssText = [
      'font-size:clamp(48px,10vw,80px)',
      'filter:drop-shadow(0 0 20px #00ffb4) drop-shadow(0 0 40px #006644)',
      'animation:introOrbit 6s linear infinite'
    ].join(';');
    logoWrap.appendChild(logoIcon);

    const logoTitle = document.createElement('div');
    logoTitle.textContent = 'DARK ORBIT PRO';
    logoTitle.style.cssText = [
      'font-size:clamp(22px,6vw,52px)',
      'font-weight:900;letter-spacing:6px',
      'color:#00ffb4',
      'text-shadow:0 0 20px #00ffb4,0 0 40px #006644,0 0 80px rgba(0,255,180,0.3)',
      'margin-top:8px'
    ].join(';');
    logoWrap.appendChild(logoTitle);

    const logoSub = document.createElement('div');
    logoSub.textContent = 'ELITE COMMANDER EDITION';
    logoSub.style.cssText = [
      'font-size:clamp(8px,2vw,13px)',
      'letter-spacing:5px',
      'color:rgba(0,200,140,0.6)',
      'margin-top:4px'
    ].join(';');
    logoWrap.appendChild(logoSub);

    // Divider line
    const divider = document.createElement('div');
    divider.style.cssText = [
      'width:clamp(160px,40vw,320px);height:1px',
      'background:linear-gradient(90deg,transparent,#00ffb4,transparent)',
      'margin:18px auto 0',
      'animation:introDividerExpand 1s 0.8s ease-out both'
    ].join(';');
    logoWrap.appendChild(divider);
    wrap.appendChild(logoWrap);

    // Story text box
    const storyBox = document.createElement('div');
    storyBox.id = 'intro-story-box';
    storyBox.style.cssText = [
      'position:relative;z-index:2',
      'margin-top:28px',
      'min-height:160px',
      'text-align:center',
      'max-width:min(88vw,440px)',
      'padding:0 16px'
    ].join(';');
    wrap.appendChild(storyBox);

    // TAP TO ENTER
    const tapBtn = document.createElement('div');
    tapBtn.id = 'intro-tap';
    tapBtn.textContent = '[ TAP ANYWHERE TO ENTER ]';
    tapBtn.style.cssText = [
      'position:relative;z-index:2',
      'margin-top:32px',
      'font-size:clamp(10px,3vw,14px)',
      'letter-spacing:3px',
      'color:#00ffb4',
      'opacity:0',
      'transition:opacity 0.8s',
      'animation:introTapPulse 1.5s ease-in-out infinite'
    ].join(';');
    wrap.appendChild(tapBtn);

    // Skip button
    const skipBtn = document.createElement('button');
    skipBtn.id = 'intro-skip-btn';
    skipBtn.textContent = 'SKIP ›';
    skipBtn.style.cssText = [
      'position:absolute;bottom:22px;right:22px',
      'z-index:10',
      'background:rgba(0,0,0,0)',
      'border:1px solid rgba(0,255,180,0.25)',
      'color:rgba(0,255,180,0.4)',
      'font-family:Orbitron,monospace',
      'font-size:10px;letter-spacing:2px',
      'padding:6px 14px;border-radius:5px',
      'cursor:pointer;opacity:0;transition:opacity 0.5s',
      'pointer-events:none'
    ].join(';');
    skipBtn.onclick = function (e) { e.stopPropagation(); _finish(); };
    wrap.appendChild(skipBtn);

    // CSS keyframes (injected once)
    if (!document.getElementById('intro-keyframes')) {
      const style = document.createElement('style');
      style.id = 'intro-keyframes';
      style.textContent = `
        @keyframes introLogoIn {
          from { opacity:0; transform:translateY(-30px) scale(0.85); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes introOrbit {
          from { transform:rotate(0deg) translateX(4px) rotate(0deg); }
          to   { transform:rotate(360deg) translateX(4px) rotate(-360deg); }
        }
        @keyframes introDividerExpand {
          from { opacity:0; transform:scaleX(0); }
          to   { opacity:1; transform:scaleX(1); }
        }
        @keyframes introTapPulse {
          0%,100% { opacity:1; }
          50%      { opacity:0.3; }
        }
        @keyframes introLineIn {
          from { opacity:0; transform:translateX(-12px); }
          to   { opacity:1; transform:translateX(0); }
        }
        @keyframes introFadeOut {
          from { opacity:1; }
          to   { opacity:0; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(wrap);

    // Tap anywhere to finish
    wrap.addEventListener('pointerdown', function () {
      if (skipAllowed) _finish();
    });

    // Resize canvas
    _onResize();
    window.addEventListener('resize', _onResize);

    introCtx = introCanvas.getContext('2d');
  }

  // ── STARS ────────────────────────────────────────────────────────────────────
  function _buildStars() {
    introStars = [];
    const N = Math.min(220, Math.floor(window.innerWidth * window.innerHeight / 4000));
    for (let i = 0; i < N; i++) {
      introStars.push({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 1.6 + 0.2,
        spd: Math.random() * 0.00015 + 0.00005,
        bright: Math.random() * 0.6 + 0.4,
        color: Math.random() < 0.15 ? '#aaddff' : (Math.random() < 0.1 ? '#ffddaa' : '#ffffff')
      });
    }
  }

  // ── NEBULA PARTICLES ────────────────────────────────────────────────────────
  function _buildNebula() {
    nebulaParts = [];
    const colors = ['rgba(0,100,255,', 'rgba(80,0,160,', 'rgba(0,180,100,', 'rgba(180,0,80,'];
    for (let i = 0; i < 6; i++) {
      const c = colors[i % colors.length];
      nebulaParts.push({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 0.25 + 0.08,
        alpha: Math.random() * 0.06 + 0.02,
        color: c,
        drift: (Math.random() - 0.5) * 0.00003
      });
    }
  }

  // ── CANVAS LOOP ──────────────────────────────────────────────────────────────
  function _loop() {
    if (!introRunning) return;
    introFrame++;
    const W = introCanvas.width, H = introCanvas.height;
    const ctx = introCtx;

    // BG
    ctx.fillStyle = '#000008';
    ctx.fillRect(0, 0, W, H);

    // Nebula blobs
    nebulaParts.forEach(function (n) {
      n.x += n.drift;
      if (n.x < -0.3) n.x = 1.3;
      if (n.x > 1.3) n.x = -0.3;
      const gx = n.x * W, gy = n.y * H, gr = n.r * Math.max(W, H);
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      g.addColorStop(0, n.color + n.alpha + ')');
      g.addColorStop(1, n.color + '0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    });

    // Stars (parallax scroll downward — gives "flying through space" feel)
    introStars.forEach(function (s) {
      s.y += s.spd;
      if (s.y > 1) { s.y = 0; s.x = Math.random(); }
      const twinkle = 0.5 + 0.5 * Math.sin(introFrame * 0.04 + s.x * 99);
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.globalAlpha = s.bright * twinkle;
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Subtle horizontal scan glow line
    const scanY = ((introFrame * 0.8) % H);
    const sg = ctx.createLinearGradient(0, scanY - 2, 0, scanY + 2);
    sg.addColorStop(0, 'rgba(0,255,180,0)');
    sg.addColorStop(0.5, 'rgba(0,255,180,0.04)');
    sg.addColorStop(1, 'rgba(0,255,180,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, scanY - 2, W, 4);

    introRAF = requestAnimationFrame(_loop);
  }

  // ── SCHEDULE STORY LINES ────────────────────────────────────────────────────
  function _scheduleLines() {
    const box = document.getElementById('intro-story-box');
    if (!box) return;

    STORY_LINES.forEach(function (line) {
      setTimeout(function () {
        if (introDone) return;
        const el = document.createElement('div');
        el.style.cssText = [
          'font-size:' + (line.big ? 'clamp(14px,4vw,22px)' : 'clamp(10px,2.8vw,15px)'),
          'color:' + line.color,
          'letter-spacing:' + (line.big ? '4px' : '2px'),
          'font-weight:' + (line.big ? '900' : '400'),
          'margin:6px 0',
          'animation:introLineIn 0.5s ease-out both',
          'text-shadow:' + (line.big ? '0 0 12px ' + line.color : 'none')
        ].join(';');
        el.textContent = line.text;
        box.appendChild(el);

        // Auto-remove oldest lines to keep box clean (max 5 visible)
        while (box.children.length > 5) {
          box.removeChild(box.firstChild);
        }
      }, line.delay);
    });

    // Show TAP hint
    setTimeout(function () {
      if (introDone) return;
      const tap = document.getElementById('intro-tap');
      if (tap) tap.style.opacity = '1';
    }, TOTAL_STORY_MS);
  }

  // ── SKIP BUTTON ──────────────────────────────────────────────────────────────
  function _showSkipBtn() {
    const btn = document.getElementById('intro-skip-btn');
    if (btn) {
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    }
  }

  // ── FINISH — fade out and show main menu ─────────────────────────────────────
  function _finish() {
    if (introDone) return;
    introDone = true;
    introRunning = false;

    // Mark as seen
    SAVE.set('introDone', true);

    const wrap = document.getElementById('intro-screen');
    if (wrap) {
      wrap.style.animation = 'introFadeOut 0.8s ease-out forwards';
      wrap.style.pointerEvents = 'none';
      setTimeout(function () {
        if (introRAF) cancelAnimationFrame(introRAF);
        wrap.remove();

        // Remove resize listener (avoid leak)
        window.removeEventListener('resize', _onResize);

        // Reveal main game — remove 'off' from menu if present
        const menu = document.getElementById('menu');
        if (menu) {
          menu.classList.remove('off');
          menu.style.opacity = '0';
          menu.style.transition = 'opacity 0.6s';
          // micro-delay to trigger CSS transition
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              menu.style.opacity = '1';
            });
          });
        }

        // Trigger daily reward check
        if (typeof claimDaily === 'function') {
          setTimeout(claimDaily, 700);
        }

      }, 850);
    }
  }

  function _onResize() {
    if (introCanvas) {
      introCanvas.width = window.innerWidth;
      introCanvas.height = window.innerHeight;
    }
  }

  // ── AUTO-START ───────────────────────────────────────────────────────────────
  // Called once DOM is ready.  Hides menu, shows intro instead.
  function _autoInit() {
    if (!window.INTRO.shouldShow()) return; // skip if already seen

    // Hide the main menu before intro plays
    const menu = document.getElementById('menu');
    if (menu) menu.classList.add('off');

    window.INTRO.start();
  }

  // Wait for DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _autoInit);
  } else {
    // Already loaded (script is deferred or at bottom)
    setTimeout(_autoInit, 0);
  }

})();
