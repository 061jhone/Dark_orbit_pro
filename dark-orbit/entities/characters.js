// ==================== characters.js ====================
// 6 Character Selection System — Dark Orbit Pro
// Load order: after config.js, before alien.js
// ─────────────────────────────────────────────────────────

(function () {

  // ══════════════════════════════════════════════════════════
  //  CHARACTER DEFINITIONS
  // ══════════════════════════════════════════════════════════
  const CHARACTERS = [
    {
      id:        'kid',
      name:      'LITTLE COMMANDER',
      urdu:      'چھوٹا بچہ',
      emoji:     '👦',
      age:       '8 yrs',
      color:     '#00ccff',
      glow:      'rgba(0,200,255,0.35)',
      desc:      'Fastest pilot in the fleet. Tiny ship, big heart!',
      stats:     { speed: 5, damage: 2, shield: 2, luck: 4, regen: 3 },
      ability:   { name: '⚡ TURBO DASH', desc: 'Ship moves 2× faster for 8 seconds', color: '#00ccff' },
      bonus:     { startAmmo: [120, 35, 18, 25], regenMult: 1.3, speedMult: 1.5, damageMult: 0.75 },
      shipColor: '#00ccff',
      starship:  true,   // has mini starship escort
      unlocked:  true
    },
    {
      id:        'youngman',
      name:      'ELITE CADET',
      urdu:      'جوان لڑکا',
      emoji:     '🧑',
      age:       '20 yrs',
      color:     '#00ffb4',
      glow:      'rgba(0,255,180,0.35)',
      desc:      'Balanced warrior. Master of all weapons.',
      stats:     { speed: 3, damage: 3, shield: 3, luck: 3, regen: 3 },
      ability:   { name: '🎯 FOCUS MODE', desc: 'All weapons deal +50% dmg for 10 seconds', color: '#00ffb4' },
      bonus:     { startAmmo: [100, 30, 15, 20], regenMult: 1.0, speedMult: 1.0, damageMult: 1.0 },
      shipColor: '#00ffb4',
      starship:  true,
      unlocked:  true    // default character
    },
    {
      id:        'oldman',
      name:      'VETERAN ADMIRAL',
      urdu:      'بزرگ کمانڈر',
      emoji:     '👴',
      age:       '65 yrs',
      color:     '#ffd700',
      glow:      'rgba(255,215,0,0.35)',
      desc:      'Battle-hardened. His shield is legendary.',
      stats:     { speed: 1, damage: 3, shield: 5, luck: 2, regen: 4 },
      ability:   { name: '🛡️ IRON WALL', desc: 'Shield lasts 3× longer, absorbs all damage', color: '#ffd700' },
      bonus:     { startAmmo: [100, 30, 15, 20], regenMult: 1.4, speedMult: 0.75, damageMult: 1.1, shieldMult: 3 },
      shipColor: '#ffd700',
      starship:  false,
      unlocked:  true
    },
    {
      id:        'younggirl',
      name:      'RAPID STRIKER',
      urdu:      'جوان لڑکی',
      emoji:     '👩',
      age:       '22 yrs',
      color:     '#ff44cc',
      glow:      'rgba(255,68,200,0.35)',
      desc:      'Fastest trigger finger in the galaxy!',
      stats:     { speed: 4, damage: 4, shield: 2, luck: 3, regen: 2 },
      ability:   { name: '🔥 RAPID FIRE', desc: 'Fire rate 3× for 6 seconds', color: '#ff44cc' },
      bonus:     { startAmmo: [100, 30, 15, 20], regenMult: 0.9, speedMult: 1.2, damageMult: 1.25, fireRateMult: 0.35 },
      shipColor: '#ff44cc',
      starship:  true,
      unlocked:  true
    },
    {
      id:        'woman',
      name:      'HEALER CAPTAIN',
      urdu:      'خاتون کمانڈر',
      emoji:     '👩‍🚀',
      age:       '35 yrs',
      color:     '#44ff88',
      glow:      'rgba(68,255,136,0.35)',
      desc:      'Her healing aura keeps the crew alive.',
      stats:     { speed: 3, damage: 2, shield: 4, luck: 3, regen: 5 },
      ability:   { name: '💚 HEALING AURA', desc: 'Restore 2 HP every 5 seconds for 20s', color: '#44ff88' },
      bonus:     { startAmmo: [100, 30, 15, 20], regenMult: 1.6, speedMult: 1.0, damageMult: 0.9, healAura: true },
      shipColor: '#44ff88',
      starship:  false,
      unlocked:  true
    },
    {
      id:        'littlegirl',
      name:      'LUCKY STAR',
      urdu:      'چھوٹی لڑکی',
      emoji:     '👧',
      age:       '10 yrs',
      color:     '#ff8800',
      glow:      'rgba(255,136,0,0.35)',
      desc:      'Unbelievable luck — powerups rain for her!',
      stats:     { speed: 4, damage: 2, shield: 2, luck: 5, regen: 3 },
      ability:   { name: '🍀 LUCKY STORM', desc: '5 random powerups drop instantly!', color: '#ff8800' },
      bonus:     { startAmmo: [100, 30, 15, 20], regenMult: 1.1, speedMult: 1.3, damageMult: 0.8, luckMult: 3 },
      shipColor: '#ff8800',
      starship:  true,
      unlocked:  true
    }
  ];

  // ══════════════════════════════════════════════════════════
  //  ACTIVE CHARACTER STATE
  // ══════════════════════════════════════════════════════════
  let selectedId   = SAVE.get('selectedChar') || 'youngman';
  let activeChar   = CHARACTERS.find(c => c.id === selectedId) || CHARACTERS[1];

  // ── PUBLIC API ──────────────────────────────────────────
  window.CHAR = {
    all:       CHARACTERS,
    active:    () => activeChar,
    select:    _selectChar,
    openScreen: _openCharScreen,
    closeScreen: _closeCharScreen,
    applyBonuses: _applyBonuses,
    drawMiniPortrait: _drawMiniPortrait
  };

  // ══════════════════════════════════════════════════════════
  //  SELECT CHARACTER
  // ══════════════════════════════════════════════════════════
  function _selectChar(id) {
    const c = CHARACTERS.find(ch => ch.id === id);
    if (!c) return;
    activeChar = c;
    selectedId = id;
    SAVE.set('selectedChar', id);
    _refreshCards();
    _updatePreviewPanel(c);
  }

  // ══════════════════════════════════════════════════════════
  //  APPLY CHARACTER BONUSES to game state (call in startGame)
  // ══════════════════════════════════════════════════════════
  function _applyBonuses() {
    const b = activeChar.bonus;
    if (!b) return;

    // Ammo
    if (b.startAmmo && typeof ammo !== 'undefined') {
      ammo = b.startAmmo.slice();
    }

    // Speed stored globally so drawPlayerShip / movement can read it
    window.CHAR_SPEED_MULT  = b.speedMult  || 1.0;
    window.CHAR_DMG_MULT    = b.damageMult || 1.0;
    window.CHAR_REGEN_MULT  = b.regenMult  || 1.0;
    window.CHAR_LUCK_MULT   = b.luckMult   || 1.0;
    window.CHAR_FIRE_MULT   = b.fireRateMult || 1.0;
    window.CHAR_SHIELD_MULT = b.shieldMult || 1.0;
    window.CHAR_HEAL_AURA   = b.healAura   || false;
    window.CHAR_HAS_STARSHIP = activeChar.starship;
    window.CHAR_COLOR       = activeChar.shipColor;
  }

  // ══════════════════════════════════════════════════════════
  //  CHARACTER SCREEN DOM
  // ══════════════════════════════════════════════════════════
  function _openCharScreen() {
    _buildCharScreen();
    const scr = document.getElementById('char-screen');
    if (scr) {
      scr.style.display = 'flex';
      // Staggered card entrance
      document.querySelectorAll('.char-card').forEach((c, i) => {
        c.style.opacity = '0';
        c.style.transform = 'translateY(30px)';
        setTimeout(() => {
          c.style.transition = 'opacity 0.4s, transform 0.4s';
          c.style.opacity = '1';
          c.style.transform = 'translateY(0)';
        }, i * 80);
      });
    }
  }

  function _closeCharScreen() {
    const scr = document.getElementById('char-screen');
    if (scr) scr.style.display = 'none';
  }

  function _buildCharScreen() {
    if (document.getElementById('char-screen')) {
      _refreshCards();
      _updatePreviewPanel(activeChar);
      return;
    }

    const scr = document.createElement('div');
    scr.id = 'char-screen';
    scr.style.cssText = [
      'display:none;position:fixed;inset:0;z-index:400',
      'background:rgba(0,0,12,0.97)',
      'flex-direction:column;align-items:center',
      'overflow-y:auto;-webkit-overflow-scrolling:touch',
      'padding:16px 10px 32px',
      'font-family:Orbitron,monospace'
    ].join(';');

    // ── Header ──
    scr.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;width:100%;max-width:460px;margin-bottom:14px">
        <div>
          <div style="font-size:14px;font-weight:900;color:#00ffb4;letter-spacing:3px">SELECT COMMANDER</div>
          <div style="font-size:8px;color:rgba(0,255,180,0.4);letter-spacing:2px;margin-top:2px">EACH HAS UNIQUE ABILITIES & BONUSES</div>
        </div>
        <button id="char-close-btn" style="
          background:none;border:1px solid rgba(255,255,255,0.2);
          color:#aaa;border-radius:6px;padding:5px 12px;
          font-family:Orbitron,monospace;font-size:10px;cursor:pointer
        ">✕ CLOSE</button>
      </div>

      <!-- Character grid -->
      <div id="char-grid" style="
        display:grid;
        grid-template-columns:repeat(3,1fr);
        gap:8px;
        width:100%;max-width:460px;
        margin-bottom:14px
      "></div>

      <!-- Preview panel -->
      <div id="char-preview" style="
        width:100%;max-width:460px;
        background:rgba(0,0,0,0.6);
        border-radius:14px;
        padding:14px 16px;
        border:1.5px solid rgba(0,255,180,0.2);
        margin-bottom:14px
      "></div>

      <!-- Play button -->
      <button id="char-play-btn" style="
        width:100%;max-width:460px;
        padding:15px;
        background:linear-gradient(135deg,rgba(0,180,100,0.3),rgba(0,100,60,0.15));
        border:2px solid #00ffb4;color:#00ffb4;
        font-family:Orbitron,monospace;font-size:13px;
        font-weight:900;letter-spacing:4px;
        border-radius:12px;cursor:pointer;
        box-shadow:0 0 20px rgba(0,255,180,0.2)
      ">▶ DEPLOY COMMANDER</button>
    `;

    document.body.appendChild(scr);

    // Events
    document.getElementById('char-close-btn').onclick = _closeCharScreen;
    document.getElementById('char-play-btn').onclick = function () {
      _closeCharScreen();
      if (typeof checkTutorial === 'function') checkTutorial();
    };

    _buildCards();
    _updatePreviewPanel(activeChar);

    // Inject card styles
    if (!document.getElementById('char-styles')) {
      const st = document.createElement('style');
      st.id = 'char-styles';
      st.textContent = `
        .char-card {
          background: rgba(0,0,0,0.5);
          border: 1.5px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 10px 6px;
          text-align: center;
          cursor: pointer;
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
          position: relative;
          overflow: hidden;
        }
        .char-card:active { transform: scale(0.95); }
        .char-card.selected {
          border-width: 2px;
        }
        .char-card .stat-bar-wrap { margin: 3px 0; }
        .char-card .stat-bar-bg {
          width: 100%; height: 3px;
          background: rgba(255,255,255,0.08);
          border-radius: 2px; overflow: hidden;
        }
        .char-card .stat-bar-fill { height: 100%; border-radius: 2px; }
        @keyframes charPulse {
          0%,100% { box-shadow: 0 0 12px var(--char-glow); }
          50%      { box-shadow: 0 0 24px var(--char-glow); }
        }
      `;
      document.head.appendChild(st);
    }
  }

  function _buildCards() {
    const grid = document.getElementById('char-grid');
    if (!grid) return;
    grid.innerHTML = '';
    CHARACTERS.forEach(c => {
      const card = document.createElement('div');
      card.className = 'char-card' + (c.id === selectedId ? ' selected' : '');
      card.id = 'charcard-' + c.id;
      card.style.setProperty('--char-glow', c.glow);
      if (c.id === selectedId) {
        card.style.borderColor = c.color;
        card.style.boxShadow = '0 0 16px ' + c.glow;
        card.style.animation = 'charPulse 2s ease-in-out infinite';
      }

      // Mini canvas portrait
      const cv = document.createElement('canvas');
      cv.width = 64; cv.height = 72;
      cv.style.cssText = 'display:block;margin:0 auto 6px;';
      _drawCharPortrait(cv.getContext('2d'), c, 32, 38, 28);
      card.appendChild(cv);

      const nameEl = document.createElement('div');
      nameEl.style.cssText = `font-size:7px;font-weight:900;color:${c.color};letter-spacing:1.5px;margin-bottom:2px;line-height:1.3`;
      nameEl.textContent = c.name;
      card.appendChild(nameEl);

      const urduEl = document.createElement('div');
      urduEl.style.cssText = 'font-size:9px;color:rgba(255,255,255,0.5);margin-bottom:5px;font-family:sans-serif';
      urduEl.textContent = c.urdu;
      card.appendChild(urduEl);

      // Stats mini bars
      const statKeys = ['speed','damage','shield','luck'];
      const statColors = ['#00ccff','#ff4444','#00ffb4','#ffd700'];
      statKeys.forEach((k, i) => {
        const wrap = document.createElement('div');
        wrap.className = 'stat-bar-wrap';
        const bg = document.createElement('div');
        bg.className = 'stat-bar-bg';
        const fill = document.createElement('div');
        fill.className = 'stat-bar-fill';
        fill.style.cssText = `width:${(c.stats[k]/5)*100}%;background:${statColors[i]}`;
        bg.appendChild(fill);
        wrap.appendChild(bg);
        card.appendChild(wrap);
      });

      // Selected badge
      if (c.id === selectedId) {
        const badge = document.createElement('div');
        badge.style.cssText = `
          position:absolute;top:5px;right:5px;
          background:${c.color};color:#000;
          font-size:6px;font-weight:900;letter-spacing:1px;
          padding:2px 5px;border-radius:4px
        `;
        badge.textContent = '✓ ACTIVE';
        card.appendChild(badge);
      }

      card.onclick = () => _selectChar(c.id);
      grid.appendChild(card);
    });
  }

  function _refreshCards() {
    CHARACTERS.forEach(c => {
      const card = document.getElementById('charcard-' + c.id);
      if (!card) return;
      const isSelected = c.id === selectedId;
      card.classList.toggle('selected', isSelected);
      card.style.borderColor = isSelected ? c.color : 'rgba(255,255,255,0.1)';
      card.style.boxShadow   = isSelected ? '0 0 16px ' + c.glow : 'none';
      card.style.animation   = isSelected ? 'charPulse 2s ease-in-out infinite' : 'none';
      // Update badge
      const existing = card.querySelector('.active-badge');
      if (existing) existing.remove();
      if (isSelected) {
        const badge = document.createElement('div');
        badge.className = 'active-badge';
        badge.style.cssText = `
          position:absolute;top:5px;right:5px;
          background:${c.color};color:#000;
          font-size:6px;font-weight:900;letter-spacing:1px;
          padding:2px 5px;border-radius:4px
        `;
        badge.textContent = '✓ ACTIVE';
        card.appendChild(badge);
      }
    });
  }

  function _updatePreviewPanel(c) {
    const panel = document.getElementById('char-preview');
    if (!panel) return;

    // Big canvas portrait
    const cvSize = Math.min(window.innerWidth * 0.25, 100);

    panel.innerHTML = `
      <div style="display:flex;gap:14px;align-items:flex-start">
        <div style="flex-shrink:0">
          <canvas id="char-preview-canvas" width="${cvSize}" height="${cvSize + 16}"
            style="border-radius:12px;background:rgba(0,0,0,0.4);border:1.5px solid ${c.color}44"></canvas>
          <div style="text-align:center;font-size:7px;color:${c.color};letter-spacing:1px;margin-top:4px">${c.age}</div>
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:900;color:${c.color};letter-spacing:3px;margin-bottom:2px">${c.name}</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.4);font-family:sans-serif;margin-bottom:8px">${c.urdu}</div>
          <div style="font-size:8px;color:rgba(255,255,255,0.65);line-height:1.6;margin-bottom:8px">${c.desc}</div>
          <!-- Special ability box -->
          <div style="
            background:${c.color}18;border:1px solid ${c.color}55;
            border-radius:8px;padding:8px 10px
          ">
            <div style="font-size:8px;color:${c.color};font-weight:900;letter-spacing:2px;margin-bottom:3px">${c.ability.name}</div>
            <div style="font-size:7px;color:rgba(255,255,255,0.55)">${c.ability.desc}</div>
          </div>
        </div>
      </div>

      <!-- Full stats row -->
      <div style="display:flex;gap:6px;margin-top:12px">
        ${['speed','damage','shield','luck','regen'].map((k, i) => `
          <div style="flex:1;text-align:center">
            <div style="font-size:6px;color:rgba(255,255,255,0.4);letter-spacing:1px;margin-bottom:3px">${k.toUpperCase()}</div>
            <div style="height:${c.stats[k] * 5}px;min-height:4px;border-radius:3px;
              background:${'#00ccff,#ff4444,#00ffb4,#ffd700,#ff88ff'.split(',')[i]};
              box-shadow:0 0 6px ${'#00ccff,#ff4444,#00ffb4,#ffd700,#ff88ff'.split(',')[i]}88">
            </div>
            <div style="font-size:8px;color:#fff;font-weight:900;margin-top:3px">${c.stats[k]}/5</div>
          </div>
        `).join('')}
      </div>

      <!-- Ship bonus tags -->
      <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:10px">
        ${c.starship ? `<span style="font-size:7px;background:rgba(0,200,255,0.15);border:1px solid rgba(0,200,255,0.3);color:#00ccff;padding:3px 7px;border-radius:5px;letter-spacing:1px">🚀 ESCORT STARSHIP</span>` : ''}
        ${c.bonus.speedMult > 1   ? `<span style="font-size:7px;background:rgba(0,255,180,0.1);border:1px solid rgba(0,255,180,0.25);color:#00ffb4;padding:3px 7px;border-radius:5px">⚡ SPEED +${Math.round((c.bonus.speedMult-1)*100)}%</span>` : ''}
        ${c.bonus.damageMult > 1  ? `<span style="font-size:7px;background:rgba(255,68,68,0.1);border:1px solid rgba(255,68,68,0.25);color:#ff4444;padding:3px 7px;border-radius:5px">⚔️ DMG +${Math.round((c.bonus.damageMult-1)*100)}%</span>` : ''}
        ${c.bonus.regenMult > 1.1 ? `<span style="font-size:7px;background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.25);color:#ffd700;padding:3px 7px;border-radius:5px">🔋 REGEN +${Math.round((c.bonus.regenMult-1)*100)}%</span>` : ''}
        ${c.bonus.healAura        ? `<span style="font-size:7px;background:rgba(68,255,136,0.1);border:1px solid rgba(68,255,136,0.25);color:#44ff88;padding:3px 7px;border-radius:5px">💚 HEAL AURA</span>` : ''}
        ${c.bonus.luckMult > 1    ? `<span style="font-size:7px;background:rgba(255,136,0,0.1);border:1px solid rgba(255,136,0,0.25);color:#ff8800;padding:3px 7px;border-radius:5px">🍀 LUCK ×${c.bonus.luckMult}</span>` : ''}
      </div>
    `;

    // Draw big portrait
    const cv = document.getElementById('char-preview-canvas');
    if (cv) {
      const ctx = cv.getContext('2d');
      _drawCharPortrait(ctx, c, cvSize / 2, cvSize / 2 + 4, cvSize * 0.4);
    }
  }

  // ══════════════════════════════════════════════════════════
  //  CANVAS CHARACTER PORTRAIT DRAWING
  //  Each character is drawn procedurally — no images needed
  // ══════════════════════════════════════════════════════════
  function _drawCharPortrait(ctx, char, cx, cy, radius) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const r = radius;
    const col = char.color;

    // Glow bg circle
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.1);
    grd.addColorStop(0, char.glow);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.1, 0, Math.PI * 2);
    ctx.fill();

    // Draw character based on id
    switch (char.id) {
      case 'kid':       _drawKid(ctx, cx, cy, r, col);       break;
      case 'youngman':  _drawYoungMan(ctx, cx, cy, r, col);  break;
      case 'oldman':    _drawOldMan(ctx, cx, cy, r, col);    break;
      case 'younggirl': _drawYoungGirl(ctx, cx, cy, r, col); break;
      case 'woman':     _drawWoman(ctx, cx, cy, r, col);     break;
      case 'littlegirl':_drawLittleGirl(ctx, cx, cy, r, col);break;
    }

    // Satellite badge below each character
    _drawMinisatellite(ctx, cx, cy + r * 0.72, r * 0.28, col);
  }

  // ─── Individual character drawings ────────────────────────
  function _drawKid(ctx, cx, cy, r, col) {
    // Small, round head, big eyes, helmet
    const hy = cy - r * 0.1;
    // Helmet
    ctx.beginPath(); ctx.arc(cx, hy, r * 0.38, 0, Math.PI * 2);
    ctx.fillStyle = col + '33'; ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.stroke();
    // Visor
    ctx.beginPath(); ctx.arc(cx, hy + r * 0.04, r * 0.22, Math.PI * 0.15, Math.PI * 0.85);
    ctx.fillStyle = 'rgba(0,200,255,0.25)'; ctx.fill();
    ctx.strokeStyle = col + 'aa'; ctx.lineWidth = 1; ctx.stroke();
    // Eyes (big and cute)
    [cx - r*0.11, cx + r*0.11].forEach(ex => {
      ctx.beginPath(); ctx.arc(ex, hy - r*0.02, r*0.07, 0, Math.PI*2);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.beginPath(); ctx.arc(ex + r*0.01, hy - r*0.01, r*0.04, 0, Math.PI*2);
      ctx.fillStyle = '#001122'; ctx.fill();
    });
    // Body (small)
    ctx.beginPath();
    ctx.roundRect(cx - r*0.22, hy + r*0.38, r*0.44, r*0.35, 4);
    ctx.fillStyle = col + '44'; ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.stroke();
    // Antenna
    ctx.beginPath(); ctx.moveTo(cx, hy - r*0.38); ctx.lineTo(cx, hy - r*0.52);
    ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, hy - r*0.54, r*0.04, 0, Math.PI*2);
    ctx.fillStyle = '#fff'; ctx.fill();
  }

  function _drawYoungMan(ctx, cx, cy, r, col) {
    const hy = cy - r * 0.08;
    // Helmet
    ctx.beginPath(); ctx.arc(cx, hy, r * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = col + '22'; ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
    // Visor — rectangular
    ctx.beginPath();
    ctx.roundRect(cx - r*0.2, hy - r*0.1, r*0.4, r*0.2, 3);
    ctx.fillStyle = 'rgba(0,255,180,0.2)'; ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.stroke();
    // Body — broader
    ctx.beginPath();
    ctx.roundRect(cx - r*0.26, hy + r*0.35, r*0.52, r*0.4, 5);
    ctx.fillStyle = col + '33'; ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
    // Chest badge
    ctx.beginPath(); ctx.arc(cx, hy + r*0.52, r*0.07, 0, Math.PI*2);
    ctx.fillStyle = col; ctx.fill();
    // Shoulder pads
    [-1, 1].forEach(s => {
      ctx.beginPath(); ctx.arc(cx + s*r*0.3, hy + r*0.42, r*0.08, 0, Math.PI*2);
      ctx.fillStyle = col + '66'; ctx.fill();
    });
  }

  function _drawOldMan(ctx, cx, cy, r, col) {
    const hy = cy - r * 0.05;
    // Big shield aura
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.85, 0, Math.PI * 2);
    ctx.strokeStyle = col + '44'; ctx.lineWidth = 3; ctx.setLineDash([4,3]);
    ctx.stroke(); ctx.setLineDash([]);
    // Heavy helmet
    ctx.beginPath(); ctx.arc(cx, hy, r * 0.36, 0, Math.PI * 2);
    ctx.fillStyle = col + '22'; ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.stroke();
    // Thick visor
    ctx.beginPath();
    ctx.roundRect(cx - r*0.18, hy - r*0.08, r*0.36, r*0.16, 2);
    ctx.fillStyle = col + '44'; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
    // Beard hint (small lines)
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo(cx + i*r*0.06, hy + r*0.28);
      ctx.lineTo(cx + i*r*0.06, hy + r*0.34);
      ctx.strokeStyle = col + '88'; ctx.lineWidth = 1; ctx.stroke();
    }
    // Bulky body
    ctx.beginPath();
    ctx.roundRect(cx - r*0.28, hy + r*0.36, r*0.56, r*0.42, 6);
    ctx.fillStyle = col + '44'; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
    // Medal
    ctx.beginPath(); ctx.arc(cx - r*0.1, hy + r*0.48, r*0.05, 0, Math.PI*2);
    ctx.fillStyle = '#ffd700'; ctx.fill();
  }

  function _drawYoungGirl(ctx, cx, cy, r, col) {
    const hy = cy - r * 0.1;
    // Sleek helmet
    ctx.beginPath(); ctx.arc(cx, hy, r * 0.33, 0, Math.PI * 2);
    ctx.fillStyle = col + '22'; ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.stroke();
    // Ponytail
    ctx.beginPath();
    ctx.moveTo(cx + r*0.28, hy - r*0.1);
    ctx.quadraticCurveTo(cx + r*0.5, hy, cx + r*0.4, hy + r*0.2);
    ctx.strokeStyle = col + 'aa'; ctx.lineWidth = 4; ctx.stroke();
    // Visor
    ctx.beginPath();
    ctx.roundRect(cx - r*0.18, hy - r*0.06, r*0.36, r*0.14, 3);
    ctx.fillStyle = col + '33'; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.stroke();
    // Eyes visible through visor
    [cx - r*0.09, cx + r*0.09].forEach(ex => {
      ctx.beginPath(); ctx.arc(ex, hy, r*0.05, 0, Math.PI*2);
      ctx.fillStyle = col; ctx.fill();
    });
    // Slim body
    ctx.beginPath();
    ctx.roundRect(cx - r*0.2, hy + r*0.33, r*0.4, r*0.38, 5);
    ctx.fillStyle = col + '33'; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
    // Speed lines
    [-r*0.45, -r*0.35].forEach(ly => {
      ctx.beginPath(); ctx.moveTo(cx - r*0.5, cy + ly); ctx.lineTo(cx - r*0.25, cy + ly);
      ctx.strokeStyle = col + '66'; ctx.lineWidth = 1; ctx.stroke();
    });
  }

  function _drawWoman(ctx, cx, cy, r, col) {
    const hy = cy - r * 0.08;
    // Healing aura rings
    for (let ri = 1; ri <= 3; ri++) {
      ctx.beginPath(); ctx.arc(cx, cy, r * (0.5 + ri * 0.12), 0, Math.PI * 2);
      ctx.strokeStyle = col + Math.floor(ri === 2 ? 0x55 : 0x22).toString(16).padStart(2,'0');
      ctx.lineWidth = 1; ctx.setLineDash([3, 4]); ctx.stroke();
    }
    ctx.setLineDash([]);
    // Helmet
    ctx.beginPath(); ctx.arc(cx, hy, r * 0.34, 0, Math.PI * 2);
    ctx.fillStyle = col + '22'; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.stroke();
    // Visor with cross
    ctx.beginPath();
    ctx.roundRect(cx - r*0.17, hy - r*0.07, r*0.34, r*0.14, 3);
    ctx.fillStyle = col + '33'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx, hy - r*0.06); ctx.lineTo(cx, hy + r*0.06);
    ctx.moveTo(cx - r*0.07, hy); ctx.lineTo(cx + r*0.07, hy);
    ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
    // Body
    ctx.beginPath();
    ctx.roundRect(cx - r*0.22, hy + r*0.34, r*0.44, r*0.4, 6);
    ctx.fillStyle = col + '33'; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
    // Heart symbol on chest
    ctx.font = `${r*0.2}px sans-serif`; ctx.textAlign = 'center';
    ctx.fillStyle = col; ctx.fillText('💚', cx, hy + r*0.6);
  }

  function _drawLittleGirl(ctx, cx, cy, r, col) {
    const hy = cy - r * 0.12;
    // Lucky star sparkles
    const sparkAngles = [0, 72, 144, 216, 288];
    sparkAngles.forEach(a => {
      const rad = a * Math.PI / 180;
      const sx = cx + Math.cos(rad) * r * 0.75;
      const sy = cy + Math.sin(rad) * r * 0.6;
      ctx.beginPath(); ctx.arc(sx, sy, r * 0.04, 0, Math.PI * 2);
      ctx.fillStyle = col; ctx.shadowBlur = 6; ctx.shadowColor = col; ctx.fill();
    });
    ctx.shadowBlur = 0;
    // Small head
    ctx.beginPath(); ctx.arc(cx, hy, r * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = col + '22'; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.stroke();
    // Pigtails
    [-1, 1].forEach(s => {
      ctx.beginPath();
      ctx.arc(cx + s * r * 0.36, hy - r * 0.15, r * 0.1, 0, Math.PI * 2);
      ctx.fillStyle = col + '88'; ctx.fill();
    });
    // Cute visor
    ctx.beginPath(); ctx.arc(cx, hy + r*0.04, r*0.18, Math.PI*0.1, Math.PI*0.9);
    ctx.fillStyle = col + '33'; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.stroke();
    // Small eyes
    [cx - r*0.09, cx + r*0.09].forEach(ex => {
      ctx.beginPath(); ctx.arc(ex, hy - r*0.02, r*0.06, 0, Math.PI*2);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.beginPath(); ctx.arc(ex + r*0.01, hy - r*0.01, r*0.035, 0, Math.PI*2);
      ctx.fillStyle = '#222'; ctx.fill();
    });
    // Small body
    ctx.beginPath();
    ctx.roundRect(cx - r*0.2, hy + r*0.3, r*0.4, r*0.32, 5);
    ctx.fillStyle = col + '44'; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.stroke();
    // Lucky 4-leaf
    ctx.font = `${r*0.22}px sans-serif`; ctx.textAlign = 'center';
    ctx.fillText('🍀', cx, hy + r*0.55);
  }

  // Mini satellite icon drawn below each portrait
  function _drawMinisatellite(ctx, cx, cy, r, col) {
    // Panel left
    ctx.fillStyle = '#1a3a5a';
    ctx.strokeStyle = col + '88'; ctx.lineWidth = 0.8;
    ctx.fillRect(cx - r*2, cy - r*0.4, r*1.4, r*0.8);
    ctx.strokeRect(cx - r*2, cy - r*0.4, r*1.4, r*0.8);
    // Panel right
    ctx.fillRect(cx + r*0.6, cy - r*0.4, r*1.4, r*0.8);
    ctx.strokeRect(cx + r*0.6, cy - r*0.4, r*1.4, r*0.8);
    // Core body
    ctx.beginPath(); ctx.arc(cx, cy, r*0.5, 0, Math.PI*2);
    ctx.fillStyle = col + '55'; ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.stroke();
    // Connector
    ctx.beginPath(); ctx.moveTo(cx - r*0.5, cy); ctx.lineTo(cx - r*0.6, cy);
    ctx.moveTo(cx + r*0.5, cy); ctx.lineTo(cx + r*0.6, cy);
    ctx.strokeStyle = col + 'aa'; ctx.lineWidth = 1.5; ctx.stroke();
    // Glow dot center
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r*0.28);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r*0.28, 0, Math.PI*2); ctx.fill();
  }

  // Public: draw mini portrait on any canvas (used by game HUD)
  function _drawMiniPortrait(ctx, cx, cy, radius) {
    _drawCharPortrait(ctx, activeChar, cx, cy, radius);
  }

  // ══════════════════════════════════════════════════════════
  //  INJECT "CHANGE PILOT" BUTTON INTO MAIN MENU
  // ══════════════════════════════════════════════════════════
  function _injectMenuButton() {
    const menu = document.getElementById('menu');
    if (!menu) return;

    // Look for the PLAY button area
    const playBtn = menu.querySelector('.gbtn');

    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:8px;margin-bottom:10px;width:100%';

    // Character preview strip
    const strip = document.createElement('div');
    strip.id = 'menu-char-strip';
    strip.style.cssText = [
      'display:flex;align-items:center;gap:10px',
      'background:rgba(0,0,0,0.5)',
      'border:1.5px solid ' + activeChar.color + '44',
      'border-radius:12px;padding:8px 14px',
      'cursor:pointer;max-width:260px',
      'transition:border-color 0.3s'
    ].join(';');

    const stripCanvas = document.createElement('canvas');
    stripCanvas.id = 'menu-char-canvas';
    stripCanvas.width = 44; stripCanvas.height = 50;
    strip.appendChild(stripCanvas);

    const stripText = document.createElement('div');
    stripText.innerHTML = `
      <div id="menu-char-name" style="font-family:Orbitron,monospace;font-size:8px;font-weight:900;color:${activeChar.color};letter-spacing:2px">${activeChar.name}</div>
      <div id="menu-char-urdu" style="font-size:9px;color:rgba(255,255,255,0.4);font-family:sans-serif;margin-top:2px">${activeChar.urdu}</div>
      <div style="font-family:Orbitron,monospace;font-size:7px;color:rgba(255,255,255,0.3);letter-spacing:1px;margin-top:3px">TAP TO CHANGE PILOT</div>
    `;
    strip.appendChild(stripText);
    strip.onclick = _openCharScreen;
    wrap.appendChild(strip);

    if (playBtn && playBtn.parentNode) {
      playBtn.parentNode.insertBefore(wrap, playBtn);
    } else {
      menu.appendChild(wrap);
    }

    // Draw initial portrait
    const cv = document.getElementById('menu-char-canvas');
    if (cv) _drawCharPortrait(cv.getContext('2d'), activeChar, 22, 26, 18);
  }

  function _refreshMenuStrip() {
    const c = activeChar;
    const name = document.getElementById('menu-char-name');
    const urdu = document.getElementById('menu-char-urdu');
    const strip = document.getElementById('menu-char-strip');
    const cv    = document.getElementById('menu-char-canvas');
    if (name)  { name.textContent = c.name; name.style.color = c.color; }
    if (urdu)  urdu.textContent = c.urdu;
    if (strip) strip.style.borderColor = c.color + '44';
    if (cv)    _drawCharPortrait(cv.getContext('2d'), c, 22, 26, 18);
  }

  // Override _selectChar to also refresh menu strip
  window.CHAR.select = function(id){
  _selectChar(id);
  _refreshMenuStrip();
};


  // ══════════════════════════════════════════════════════════
  //  HEALING AURA TICK (call from game loop for Healer char)
  // ══════════════════════════════════════════════════════════
  window.tickCharAbilities = function () {
    if (!window.CHAR_HEAL_AURA) return;
    // Heal 2 HP every 5 seconds (300 frames at 60fps)
    if (typeof F !== 'undefined' && F % 300 === 0 && typeof hp !== 'undefined') {
      if (hp < maxHp) {
        hp = Math.min(hp + 2, maxHp);
        if (typeof updateHP === 'function') updateHP();
        if (typeof showFloatingText === 'function')
          showFloatingText('💚 +2 HEAL', EX(), EY() - 50, '#44ff88');
      }
    }
  };

  // ══════════════════════════════════════════════════════════
  //  LUCKY STORM ABILITY (Little Girl)
  // ══════════════════════════════════════════════════════════
  window.triggerLuckyStorm = function () {
    if (typeof powerups === 'undefined' || typeof W === 'undefined') return;
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        if (typeof spawnPowerup === 'function')
          spawnPowerup(W * 0.2 + Math.random() * W * 0.6, H * 0.3 + Math.random() * H * 0.3);
      }, i * 200);
    }
    if (typeof showFloatingText === 'function')
      showFloatingText('🍀 LUCKY STORM!', EX(), EY() - 70, '#ff8800');
  };

  // ══════════════════════════════════════════════════════════
  //  AUTO-INJECT WHEN DOM IS READY
  // ══════════════════════════════════════════════════════════
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _injectMenuButton);
  } else {
    setTimeout(_injectMenuButton, 100);
  }

})();
