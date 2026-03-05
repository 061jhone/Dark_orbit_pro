// ==================== char-ability-btn.js ====================
// Character Special Ability — 4th Button in Ability Bar
// Load: AFTER characters.js and game.js
//
// Kya karta hai:
//   Ability bar mein [R] button add karta hai
//   Har character ka alag icon aur cooldown hota hai
//   Cooldown complete hone par button glow karta hai
// ─────────────────────────────────────────────────────────────

(function () {

  // ── Cooldown config per character (frames at 60fps) ─────────
  const CHAR_COOLDOWNS = {
    kid:        480,   // 8 seconds  — Turbo Dash
    youngman:   600,   // 10 seconds — Focus Mode
    oldman:     900,   // 15 seconds — Iron Wall
    younggirl:  540,   // 9 seconds  — Rapid Fire
    woman:      360,   // 6 seconds  — Heal Aura
    littlegirl: 480,   // 8 seconds  — Lucky Storm
  };

  // ── State ────────────────────────────────────────────────────
  let charAbilityCD   = 0;   // frames remaining
  let charAbilityMax  = 480; // current max cd
  let _btnBuilt       = false;

  // ── Build the 4th ability button ────────────────────────────
  function _buildButton() {
    if (_btnBuilt) return;
    if (!document.getElementById('ability-bar')) return;

    const bar = document.getElementById('ability-bar');

    const slot = document.createElement('div');
    slot.className = 'ability-slot';
    slot.id        = 'ability-char';
    slot.title     = 'Character Special Ability [R]';
    slot.onclick   = useCharacterAbility;

    slot.innerHTML = `
      <div class="ability-icon" id="char-ability-icon">⭐</div>
      <div class="ability-key">[R]</div>
      <div class="ability-cd"  id="char-ability-cd-bar" style="width:0%"></div>
    `;

    bar.appendChild(slot);
    _btnBuilt = true;
    _refreshIcon();
  }

  // ── Refresh icon when character changes ─────────────────────
  function _refreshIcon() {
    const btn = document.getElementById('ability-char');
    if (!btn) return;

    const c = (typeof CHAR !== 'undefined') ? CHAR.active() : null;
    if (!c) return;

    const ICONS = {
      kid:        '⚡',
      youngman:   '🎯',
      oldman:     '🛡️',
      younggirl:  '🔥',
      woman:      '💚',
      littlegirl: '🍀',
    };
    const NAMES = {
      kid:        'TURBO DASH',
      youngman:   'FOCUS MODE',
      oldman:     'IRON WALL',
      younggirl:  'RAPID FIRE',
      woman:      'HEAL AURA',
      littlegirl: 'LUCKY STORM',
    };

    const iconEl = document.getElementById('char-ability-icon');
    if (iconEl) iconEl.textContent = ICONS[c.id] || '⭐';

    // Border color match character
    btn.style.borderColor = c.color + '99';
    btn.style.boxShadow   = charAbilityCD <= 0
      ? '0 0 14px ' + c.color + '88'
      : 'none';

    // Tooltip
    btn.title = (NAMES[c.id] || 'Special') + ' [R]';

    // Update cooldown max
    charAbilityMax = CHAR_COOLDOWNS[c.id] || 480;
  }

  // ══════════════════════════════════════════════════════════
  //  MAIN ABILITY FUNCTION — triggered by button click or [R]
  // ══════════════════════════════════════════════════════════
  window.useCharacterAbility = function () {
    if (typeof running === 'undefined' || !running) return;
    if (typeof paused  !== 'undefined' && paused)   return;
    if (charAbilityCD > 0) return;  // still on cooldown

    const c = (typeof CHAR !== 'undefined') ? CHAR.active() : null;
    if (!c) return;

    // Set cooldown
    charAbilityMax = CHAR_COOLDOWNS[c.id] || 480;
    charAbilityCD  = charAbilityMax;

    // ── Execute ability ────────────────────────────────────
    switch (c.id) {

      case 'kid':
        // ⚡ TURBO DASH — 2x speed for 8 seconds
        window.CHAR_SPEED_MULT = 2.0;
        setTimeout(() => {
          window.CHAR_SPEED_MULT = c.bonus.speedMult || 1.5;
        }, 8000);
        if (typeof showFloatingText === 'function')
          showFloatingText('⚡ TURBO DASH!', EX(), EY()-70, c.color);
        if (typeof cmdSpeak === 'function')
          cmdSpeak({ text: 'Turbo dash activated!', pitch: 1.6, rate: 1.4, vol: 0.85 });
        break;

      case 'youngman':
        // 🎯 FOCUS MODE — +50% damage for 10 seconds
        window.CHAR_DMG_MULT = (c.bonus.damageMult || 1.0) * 1.5;
        setTimeout(() => {
          window.CHAR_DMG_MULT = c.bonus.damageMult || 1.0;
        }, 10000);
        if (typeof showFloatingText === 'function')
          showFloatingText('🎯 FOCUS MODE!', EX(), EY()-70, c.color);
        if (typeof flash !== 'undefined') flash = 0.3;
        break;

      case 'oldman':
        // 🛡️ IRON WALL — massive shield for 15 seconds
        if (typeof shieldTime !== 'undefined') shieldTime = 900;
        if (typeof showFloatingText === 'function')
          showFloatingText('🛡️ IRON WALL!', EX(), EY()-70, c.color);
        if (typeof playTone === 'function') playTone(800, 0.5, 'sine', 0.3);
        break;

      case 'younggirl':
        // 🔥 RAPID FIRE — 3x fire rate for 6 seconds
        if (typeof activeSpaceItem !== 'undefined') {
          activeSpaceItem = {
            type: 'rapid_fire',
            label: 'RAPID FIRE',
            color: c.color,
            timer: 360
          };
          if (typeof showSpaceItemHUD === 'function')
            showSpaceItemHUD('RAPID FIRE', c.color, 360);
        }
        if (typeof showFloatingText === 'function')
          showFloatingText('🔥 RAPID FIRE!', EX(), EY()-70, c.color);
        break;

      case 'woman':
        // 💚 HEAL AURA — restore 3 HP instantly
        if (typeof hp !== 'undefined' && typeof maxHp !== 'undefined') {
          hp = Math.min(hp + 3, maxHp);
          if (typeof updateHP === 'function') updateHP();
        }
        // Screen green flash
        if (typeof flash !== 'undefined') flash = 0.25;
        _greenFlash();
        if (typeof showFloatingText === 'function')
          showFloatingText('💚 +3 HEAL!', EX(), EY()-70, c.color);
        if (typeof playTone === 'function') playTone(660, 0.4, 'sine', 0.25);
        break;

      case 'littlegirl':
        // 🍀 LUCKY STORM — 5 powerups drop
        if (typeof triggerLuckyStorm === 'function') triggerLuckyStorm();
        if (typeof showFloatingText === 'function')
          showFloatingText('🍀 LUCKY STORM!', EX(), EY()-70, c.color);
        if (typeof shk !== 'undefined') shk = 6;
        break;
    }

    // Flash the button
    _flashButton(c.color);
    _updateCdBar();
  };

  // ── Green screen flash for heal ─────────────────────────────
  function _greenFlash() {
    const ov = document.createElement('div');
    ov.style.cssText = [
      'position:fixed;inset:0;z-index:200;pointer-events:none',
      'background:rgba(50,255,100,0.18)',
      'animation:charHealFlash 0.6s ease-out forwards'
    ].join(';');
    if (!document.getElementById('char-flash-style')) {
      const st = document.createElement('style');
      st.id = 'char-flash-style';
      st.textContent = `
        @keyframes charHealFlash { from{opacity:1} to{opacity:0} }
        @keyframes charBtnFlash  {
          0%  { transform:scale(1.35); }
          60% { transform:scale(0.92); }
          100%{ transform:scale(1);   }
        }
        @keyframes charCdSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(st);
    }
    document.body.appendChild(ov);
    setTimeout(() => ov.remove(), 700);
  }

  // ── Button press flash animation ────────────────────────────
  function _flashButton(color) {
    const btn = document.getElementById('ability-char');
    if (!btn) return;
    btn.style.animation = 'none';
    requestAnimationFrame(() => {
      btn.style.background = color + '55';
      btn.style.animation  = 'charBtnFlash 0.4s ease-out';
      setTimeout(() => {
        btn.style.background = '';
        btn.style.animation  = '';
      }, 400);
    });
  }

  // ── Update cooldown bar each frame ──────────────────────────
  function _updateCdBar() {
    const btn   = document.getElementById('ability-char');
    const cdBar = document.getElementById('char-ability-cd-bar');
    if (!btn || !cdBar) return;

    const c = (typeof CHAR !== 'undefined') ? CHAR.active() : null;

    if (charAbilityCD > 0) {
      charAbilityCD--;
      const pct = (charAbilityCD / charAbilityMax) * 100;
      cdBar.style.width = pct + '%';
      btn.classList.remove('ready');
      btn.classList.add('cooldown');
      btn.style.opacity = '0.55';
      btn.style.boxShadow = 'none';
    } else {
      cdBar.style.width = '0%';
      btn.classList.add('ready');
      btn.classList.remove('cooldown');
      btn.style.opacity = '1';
      if (c) btn.style.boxShadow = '0 0 14px ' + c.color + '88';
    }
  }

  // ── Keyboard shortcut [R] ────────────────────────────────────
  document.addEventListener('keydown', function (e) {
    if (e.key === 'r' || e.key === 'R') {
      window.useCharacterAbility();
    }
  });

  // ── Override CHAR.select to refresh button icon ──────────────
  const _origCharSelect = window.CHAR ? window.CHAR.select : null;
 function hookCharSelect(){
  if (!window.CHAR || !window.CHAR.select) return;

  const _orig = window.CHAR.select;

  window.CHAR.select = function(id){
    _orig(id);
    charAbilityCD = 0;
    setTimeout(_refreshIcon, 50);
  };
}

setTimeout(hookCharSelect, 500);


  // ── Main tick — called every frame from game loop ─────────────
  window.tickCharAbilityBtn = function () {
    if (!_btnBuilt) _buildButton();
    if (typeof running !== 'undefined' && running) {
      _updateCdBar();
    }
  };

  // ── Fallback: setInterval if game loop hook not added ─────────
  setInterval(function () {
    if (!_btnBuilt) _buildButton();
  }, 500);

  // ── Wait for DOM + build ──────────────────────────────────────
  function _init() {
    setTimeout(() => {
      _buildButton();
      _refreshIcon();
    }, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

})();
