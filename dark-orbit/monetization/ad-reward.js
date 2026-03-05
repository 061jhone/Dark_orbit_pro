// ==================== ad-reward.js ====================
// Watch Ad → Unlock Weapon for 5 Waves + Bonus Ability
// Load order: LAST (after game.js)
// ──────────────────────────────────────────────────────

(function () {

  // ══════════════════════════════════════════════════════════
  //  WEAPON DEFINITIONS (shown in ad offer panel)
  // ══════════════════════════════════════════════════════════
  const AD_WEAPONS = [
    {
      id:       0,
      name:     'LASER OVERDRIVE',
      icon:     '🔵',
      color:    '#00ffb4',
      desc:     'Laser damage +2000% • Rapid triple burst',
      effect:   { dmgMult: 3.0, fireRateMult: 0.4, spread: 2 },
      bonusAbility: { id: 1, name: 'NUKE READY', icon: '💣', action: () => { if(typeof abilityCD!=='undefined') abilityCD[1]=0; } }
    },
    {
      id:       1,
      name:     'PLASMA NOVA',
      icon:     '🔥',
      color:    '#ff6600',
      desc:     'Plasma fires 4-way spread • +1500% splash',
      effect:   { dmgMult: 2.5, fireRateMult: 0.5, spread: 4 },
      bonusAbility: { id: 2, name: 'TIME FREEZE', icon: '⏱️', action: () => { if(typeof timeFreeze!=='undefined') timeFreeze=300; } }
    },
    {
      id:       2,
      name:     'RAILGUN MAX',
      icon:     '💥',
      color:    '#ff0044',
      desc:     'Rail cannon pierce all • One-shot most enemies',
      effect:   { dmgMult: 4.0, fireRateMult: 0.6, pierce: true },
      bonusAbility: { id: 0, name: 'FULL SHIELD', icon: '🛡️', action: () => { if(typeof shieldTime!=='undefined') shieldTime=600; } }
    },
    {
      id:       3,
      name:     'THUNDER CHAIN',
      icon:     '⚡',
      color:    '#aa00ff',
      desc:     'Lightning chains 8 enemies • AOE damage',
      effect:   { dmgMult: 2.0, fireRateMult: 0.45, chain: 8 },
      bonusAbility: { id: 1, name: 'MEGA NUKE', icon: '☢️', action: () => {
        if(typeof aliens!=='undefined') aliens.forEach(a=>{a.hp-=500;if(a.hp<=0)a.dead=true;});
        if(typeof showFloatingText==='function') showFloatingText('☢️ MEGA NUKE!', EX(), EY()-70,'#ff4400');
      }}
    }
  ];

  // ══════════════════════════════════════════════════════════
  //  STATE
  // ══════════════════════════════════════════════════════════
  let adRewardActive   = false;   // is reward currently active?
  let adRewardWeapon   = null;    // which weapon is boosted
  let adRewardWaveEnd  = 0;       // wave number when reward expires
  let adRewardUsedThisSession = false;  // track per session uses
  let _offerShownThisWave = false;      // only offer once per wave group
  let _lastOfferWave = -99;

  // ── Saved original weapon config backup ──
  let _origWeaponsConfig = null;

  // ══════════════════════════════════════════════════════════
  //  PUBLIC API
  // ══════════════════════════════════════════════════════════
  window.AD_REWARD = {
    isActive:   () => adRewardActive,
    activeWeapon: () => adRewardWeapon,
    wavesLeft:  () => adRewardActive ? Math.max(0, adRewardWaveEnd - (typeof wave!=='undefined'?wave:1)) : 0,
    checkOffer: _checkAndOfferAd,
    openPanel:  _openOfferPanel,
    apply:      _applyReward
  };

  // ══════════════════════════════════════════════════════════
  //  AUTO-OFFER — call this from wave start / game loop
  //  Offers panel every 5 waves automatically
  // ══════════════════════════════════════════════════════════
  function _checkAndOfferAd() {
    if (typeof wave === 'undefined' || typeof running === 'undefined') return;
    if (!running || (typeof paused !== 'undefined' && paused)) return;
    if (adRewardActive) {
      _checkExpiry();
      return;
    }

    // Offer every 5 waves: wave 5, 10, 15, 20...
    if (wave > 0 && wave % 5 === 0 && wave !== _lastOfferWave && !adRewardActive) {
      _lastOfferWave = wave;
      // Small delay after wave starts
      setTimeout(_openOfferPanel, 1800);
    }
  }

  // ── Check if reward has expired ──
  function _checkExpiry() {
    if (!adRewardActive) return;
    const waveNow = typeof wave !== 'undefined' ? wave : 1;
    if (waveNow >= adRewardWaveEnd) {
      _removeReward();
    } else {
      _updateHudBadge();
    }
  }

  // ══════════════════════════════════════════════════════════
  //  BUILD + OPEN OFFER PANEL
  // ══════════════════════════════════════════════════════════
  function _openOfferPanel() {
    if (!running || (typeof paused !== 'undefined' && paused)) return;
    _pauseGameSoft(true);

    if (!document.getElementById('ad-reward-panel')) {
      _buildPanel();
    }

    const panel = document.getElementById('ad-reward-panel');
    if (panel) {
      panel.style.display = 'flex';
      // Reset selections
      _selectedAdWeapon = null;
      document.querySelectorAll('.arw-card').forEach(c => c.classList.remove('selected'));
      document.getElementById('arw-confirm-btn').style.opacity = '0.3';
      document.getElementById('arw-confirm-btn').style.pointerEvents = 'none';
    }
  }

  let _selectedAdWeapon = null;

  function _buildPanel() {
    const panel = document.createElement('div');
    panel.id = 'ad-reward-panel';
    panel.style.cssText = [
      'display:none;position:fixed;inset:0;z-index:480',
      'background:rgba(0,0,10,0.94)',
      'flex-direction:column;align-items:center;justify-content:center',
      'font-family:Orbitron,monospace;padding:16px',
      'overflow-y:auto;-webkit-overflow-scrolling:touch'
    ].join(';');

    panel.innerHTML = `
      <div style="max-width:380px;width:100%">

        <!-- Header -->
        <div style="text-align:center;margin-bottom:16px">
          <div style="font-size:28px;margin-bottom:6px">📺⚡</div>
          <div style="font-size:14px;font-weight:900;color:#ffd700;letter-spacing:3px;margin-bottom:4px">
            WAVE ${typeof wave !== 'undefined' ? wave : ''} REWARD!
          </div>
          <div style="font-size:9px;color:rgba(255,255,255,0.5);letter-spacing:2px">
            WATCH A SHORT AD — CHOOSE YOUR WEAPON BOOST
          </div>
          <div style="
            display:inline-block;margin-top:8px;
            background:rgba(0,255,180,0.1);
            border:1px solid rgba(0,255,180,0.3);
            border-radius:6px;padding:4px 12px;
            font-size:8px;color:#00ffb4;letter-spacing:2px
          ">BOOST LASTS 5 WAVES + 1 BONUS ABILITY</div>
        </div>

        <!-- Weapon Cards -->
        <div id="arw-cards-grid" style="
          display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px
        "></div>

        <!-- Watch Ad Button -->
        <button id="arw-confirm-btn" onclick="AD_REWARD._watchAndApply()" style="
          width:100%;padding:15px;
          background:linear-gradient(135deg,rgba(255,200,0,0.25),rgba(200,120,0,0.15));
          border:2px solid #ffd700;color:#ffd700;
          font-family:Orbitron,monospace;font-size:12px;
          font-weight:900;letter-spacing:3px;
          border-radius:12px;cursor:pointer;
          opacity:0.3;pointer-events:none;
          box-shadow:0 0 20px rgba(255,215,0,0.2);
          margin-bottom:10px
        ">📺 WATCH AD TO UNLOCK</button>

        <!-- Skip -->
        <div onclick="AD_REWARD._skipOffer()" style="
          text-align:center;cursor:pointer;
          font-size:8px;color:rgba(255,255,255,0.25);
          letter-spacing:2px;text-decoration:underline
        ">No thanks — continue without boost</div>

      </div>
    `;

    document.body.appendChild(panel);

    // Add weapon cards
    _buildWeaponCards();

    // Expose internal for button
    window.AD_REWARD._watchAndApply = _watchAndApply;
    window.AD_REWARD._skipOffer     = _skipOffer;
  }

  function _buildWeaponCards() {
    const grid = document.getElementById('arw-cards-grid');
    if (!grid) return;
    grid.innerHTML = '';

    AD_WEAPONS.forEach(w => {
      const card = document.createElement('div');
      card.className = 'arw-card';
      card.dataset.wid = w.id;
      card.style.cssText = [
        'background:rgba(0,0,0,0.6)',
        'border:2px solid rgba(255,255,255,0.1)',
        'border-radius:12px;padding:12px 8px;text-align:center;cursor:pointer',
        'transition:border-color 0.2s,box-shadow 0.2s,transform 0.15s'
      ].join(';');

      card.innerHTML = `
        <div style="font-size:28px;margin-bottom:6px">${w.icon}</div>
        <div style="font-size:8px;font-weight:900;color:${w.color};letter-spacing:1.5px;margin-bottom:4px">${w.name}</div>
        <div style="font-size:7px;color:rgba(255,255,255,0.5);line-height:1.5;margin-bottom:8px">${w.desc}</div>
        <div style="
          background:${w.bonusAbility.icon === '💣' ? 'rgba(255,100,0,0.1)' : 'rgba(0,200,255,0.1)'};
          border:1px solid ${w.color}44;border-radius:6px;padding:4px;
          font-size:7px;color:${w.color}
        ">${w.bonusAbility.icon} BONUS: ${w.bonusAbility.name}</div>
      `;

      card.addEventListener('pointerdown', () => { card.style.transform = 'scale(0.96)'; });
      card.addEventListener('pointerup', () => { card.style.transform = 'scale(1)'; });
      card.onclick = () => _selectWeaponCard(w.id);
      grid.appendChild(card);
    });
  }

  function _selectWeaponCard(wid) {
    _selectedAdWeapon = AD_WEAPONS.find(w => w.id === wid);

    document.querySelectorAll('.arw-card').forEach(c => {
      const isThis = parseInt(c.dataset.wid) === wid;
      const w = AD_WEAPONS.find(w => w.id === parseInt(c.dataset.wid));
      c.classList.toggle('selected', isThis);
      c.style.borderColor   = isThis ? w.color : 'rgba(255,255,255,0.1)';
      c.style.boxShadow     = isThis ? '0 0 16px ' + w.color + '66' : 'none';
    });

    const btn = document.getElementById('arw-confirm-btn');
    if (btn && _selectedAdWeapon) {
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
      btn.style.borderColor = _selectedAdWeapon.color;
      btn.style.color = _selectedAdWeapon.color;
      btn.textContent = `📺 WATCH AD — UNLOCK ${_selectedAdWeapon.name}`;
    }
  }

  // ══════════════════════════════════════════════════════════
  //  WATCH AD THEN APPLY
  // ══════════════════════════════════════════════════════════
  async function _watchAndApply() {
    if (!_selectedAdWeapon) return;

    const panel = document.getElementById('ad-reward-panel');
    if (panel) panel.style.display = 'none';

    // Show ad (uses ADMOB if available, else simulator)
    let watched = false;

    if (window.ADMOB && typeof window.ADMOB.showRewardedAd === 'function') {
      watched = await window.ADMOB.showRewardedAd();
    } else {
      watched = await _simulateAd();
    }

    if (watched) {
      _applyReward(_selectedAdWeapon);
    } else {
      // Ad failed or skipped — give half reward anyway (good UX)
      _applyReward(_selectedAdWeapon, true);
    }

    _pauseGameSoft(false);
  }

  function _skipOffer() {
    const panel = document.getElementById('ad-reward-panel');
    if (panel) panel.style.display = 'none';
    _pauseGameSoft(false);
  }

  // ── Simulate ad (browser mode) ──────────────────────────
  function _simulateAd() {
    return new Promise(resolve => {
      const ov = document.createElement('div');
      ov.style.cssText = [
        'position:fixed;inset:0;z-index:9000',
        'background:linear-gradient(135deg,#000,#001122)',
        'display:flex;flex-direction:column;align-items:center;justify-content:center',
        'font-family:Orbitron,monospace'
      ].join(';');

      let cd = 5;
      ov.innerHTML = `
        <div style="font-size:10px;color:#ffd700;letter-spacing:3px;margin-bottom:20px">📺 AD PLAYING — TEST MODE</div>
        <div style="font-size:64px;font-weight:900;color:#ffffff" id="ad-cd-num">${cd}</div>
        <div style="font-size:8px;color:rgba(255,255,255,0.3);margin-top:16px;letter-spacing:2px">PLEASE WATCH THE FULL AD</div>
        <div style="
          position:absolute;bottom:20px;right:20px;
          background:rgba(0,0,0,0.7);border:1px solid rgba(255,255,255,0.1);
          color:rgba(255,255,255,0.2);font-size:8px;padding:5px 10px;border-radius:4px
        ">Ad closes in <span id="ad-cd-small">${cd}</span>s</div>
      `;
      document.body.appendChild(ov);

      // Animated progress bar
      const prog = document.createElement('div');
      prog.style.cssText = 'width:200px;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;margin-top:16px;overflow:hidden';
      const fill = document.createElement('div');
      fill.style.cssText = 'height:100%;background:#ffd700;width:0%;transition:width 1s linear';
      prog.appendChild(fill); ov.insertBefore(prog, ov.children[3]);
      setTimeout(() => { fill.style.width = '100%'; }, 50);

      const timer = setInterval(() => {
        cd--;
        const el  = document.getElementById('ad-cd-num');
        const el2 = document.getElementById('ad-cd-small');
        if (el)  el.textContent  = cd;
        if (el2) el2.textContent = cd;
        if (cd <= 0) {
          clearInterval(timer);
          ov.style.transition = 'opacity 0.4s';
          ov.style.opacity = '0';
          setTimeout(() => { ov.remove(); resolve(true); }, 400);
        }
      }, 1000);
    });
  }

  // ══════════════════════════════════════════════════════════
  //  APPLY REWARD TO GAME
  // ══════════════════════════════════════════════════════════
  function _applyReward(adWeapon, halfReward) {
    adRewardActive  = true;
    adRewardWeapon  = adWeapon;
    const waveNow   = typeof wave !== 'undefined' ? wave : 1;
    adRewardWaveEnd = waveNow + 5;

    // ── Backup & patch CONFIG.WEAPONS_DMG ──────────────────
    if (!_origWeaponsConfig) {
      _origWeaponsConfig = JSON.parse(JSON.stringify(CONFIG.WEAPONS_DMG));
    }

    const ef = adWeapon.effect;
    const w  = CONFIG.WEAPONS_DMG[adWeapon.id];

    if (ef.dmgMult)     w.dmg      = Math.round(_origWeaponsConfig[adWeapon.id].dmg * ef.dmgMult);
    if (ef.fireRateMult) CONFIG.FIRE_RATE[adWeapon.id] = Math.round(_origWeaponsConfig[adWeapon.id] ? 8 * ef.fireRateMult : 8);
    if (ef.spread)      w.spread   = ef.spread;
    if (ef.pierce)      w.pierce   = true;
    if (ef.chain)       w.chain    = ef.chain;

    // Switch to boosted weapon
    if (typeof currentWeapon !== 'undefined') {
      currentWeapon = adWeapon.id;
      if (typeof updateWeaponDisplay === 'function') updateWeaponDisplay();
    }

    // ── Apply bonus ability immediately ───────────────────
    if (!halfReward && adWeapon.bonusAbility && adWeapon.bonusAbility.action) {
      adWeapon.bonusAbility.action();
    }

    // Refill ammo for this weapon
    if (typeof ammo !== 'undefined') {
      ammo[adWeapon.id] = CONFIG.MAX_AMMO[adWeapon.id];
    }

    // ── Show HUD badge ────────────────────────────────────
    _showHudBadge(adWeapon, adRewardWaveEnd);

    // ── Fanfare ───────────────────────────────────────────
    _playRewardFanfare(adWeapon.color);

    if (typeof showFloatingText === 'function') {
      showFloatingText(
        adWeapon.icon + ' ' + adWeapon.name + ' ACTIVATED!',
        EX(), EY() - 80, adWeapon.color
      );
      setTimeout(() => {
        if (!halfReward && typeof showFloatingText === 'function') {
          showFloatingText(
            adWeapon.bonusAbility.icon + ' ' + adWeapon.bonusAbility.name + '!',
            EX(), EY() - 60, '#ffd700'
          );
        }
      }, 1000);
    }

    if (typeof cmdSpeak === 'function') {
      cmdSpeak({ text: 'Weapon upgrade active! ' + adWeapon.name + ' online!', pitch: 1.4, rate: 1.2, vol: 0.9 });
    }
  }

  // ── Remove reward when waves expire ──
  function _removeReward() {
    if (!adRewardActive || !adRewardWeapon) return;
    adRewardActive = false;

    // Restore CONFIG
    if (_origWeaponsConfig) {
      _origWeaponsConfig.forEach((orig, i) => {
        CONFIG.WEAPONS_DMG[i].dmg    = orig.dmg;
        CONFIG.WEAPONS_DMG[i].spread = orig.spread;
        if (!orig.pierce) delete CONFIG.WEAPONS_DMG[i].pierce;
        if (!orig.chain)  CONFIG.WEAPONS_DMG[i].chain = orig.chain;
      });
      // Restore fire rates
      [0,1,2,3].forEach(i => {
        if (_origFireRates) CONFIG.FIRE_RATE[i] = _origFireRates[i];
      });
    }

    // Remove HUD badge
    const badge = document.getElementById('ad-reward-badge');
    if (badge) {
      badge.style.animation = 'adBadgeFadeOut 0.5s forwards';
      setTimeout(() => badge.remove(), 500);
    }

    if (typeof showFloatingText === 'function') {
      showFloatingText('⏰ WEAPON BOOST EXPIRED', EX(), EY() - 70, '#ff8800');
    }

    adRewardWeapon = null;
    if (typeof updateWeaponDisplay === 'function') updateWeaponDisplay();
  }

  // Store original fire rates
  let _origFireRates = null;
  setTimeout(() => {
    if (typeof CONFIG !== 'undefined' && CONFIG.FIRE_RATE) {
      _origFireRates = CONFIG.FIRE_RATE.slice();
    }
  }, 500);

  // ══════════════════════════════════════════════════════════
  //  HUD BADGE
  // ══════════════════════════════════════════════════════════
  function _showHudBadge(adWeapon, endWave) {
    let badge = document.getElementById('ad-reward-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'ad-reward-badge';
      badge.style.cssText = [
        'position:fixed;top:50%;left:50%;z-index:100',
        'transform:translate(-50%,-50%)',
        'background:rgba(0,0,10,0.92)',
        'border-radius:12px;padding:10px 16px;text-align:center',
        'pointer-events:none;',
        'animation:adBadgeIn 0.5s ease-out both',
        'font-family:Orbitron,monospace'
      ].join(';');
      document.body.appendChild(badge);

      if (!document.getElementById('ad-badge-styles')) {
        const st = document.createElement('style');
        st.id = 'ad-badge-styles';
        st.textContent = `
          @keyframes adBadgeIn {
            from { opacity:0; transform:translate(-50%,-50%) scale(0.7); }
            to   { opacity:1; transform:translate(-50%,-50%) scale(1); }
          }
          @keyframes adBadgeFadeOut {
            to { opacity:0; transform:translate(-50%,-50%) scale(0.8); }
          }
          @keyframes adBadgePulse {
            0%,100% { box-shadow: 0 0 16px var(--badge-glow); }
            50%      { box-shadow: 0 0 32px var(--badge-glow); }
          }
        `;
        document.head.appendChild(st);
      }

      // Auto-move to corner after 3s
      setTimeout(() => {
        const b = document.getElementById('ad-reward-badge');
        if (b) {
          b.style.transition = 'all 0.5s ease';
          b.style.top        = 'auto';
          b.style.left       = 'auto';
          b.style.bottom     = '140px';
          b.style.right      = '10px';
          b.style.transform  = 'none';
          b.style.padding    = '6px 10px';
        }
      }, 3000);
    }

    badge.style.setProperty('--badge-glow', adWeapon.color + '88');
    badge.style.border     = '2px solid ' + adWeapon.color;
    badge.style.boxShadow  = '0 0 16px ' + adWeapon.color + '88';
    badge.style.animation  = 'adBadgeIn 0.5s ease-out both, adBadgePulse 2s 0.5s ease-in-out infinite';

    badge.innerHTML = `
      <div style="font-size:16px;margin-bottom:2px">${adWeapon.icon}</div>
      <div style="font-size:8px;font-weight:900;color:${adWeapon.color};letter-spacing:1.5px">${adWeapon.name}</div>
      <div id="arb-waves" style="font-size:7px;color:rgba(255,255,255,0.5);margin-top:2px;letter-spacing:1px">
        ⚡ ACTIVE • ENDS WAVE ${endWave}
      </div>
      <div style="margin-top:4px;height:3px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden">
        <div id="arb-prog" style="height:100%;background:${adWeapon.color};width:100%;transition:width 1s"></div>
      </div>
    `;
  }

  function _updateHudBadge() {
    if (!adRewardActive || !adRewardWeapon) return;
    const waveNow = typeof wave !== 'undefined' ? wave : 1;
    const remaining = Math.max(0, adRewardWaveEnd - waveNow);
    const el = document.getElementById('arb-waves');
    if (el) el.textContent = '⚡ ' + remaining + ' WAVE' + (remaining !== 1 ? 'S' : '') + ' REMAINING';
    const prog = document.getElementById('arb-prog');
    if (prog) prog.style.width = ((remaining / 5) * 100) + '%';
  }

  // ══════════════════════════════════════════════════════════
  //  SOFT PAUSE (freeze game without showing pause menu)
  // ══════════════════════════════════════════════════════════
  function _pauseGameSoft(pause) {
    if (typeof paused !== 'undefined') {
      paused = pause;
    }
  }

  // ══════════════════════════════════════════════════════════
  //  REWARD FANFARE
  // ══════════════════════════════════════════════════════════
  function _playRewardFanfare(color) {
    // Screen flash
    if (typeof flash !== 'undefined') flash = 0.5;
    if (typeof shk   !== 'undefined') shk = 8;

    // Screen color tint flash
    const overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed;inset:0;z-index:300;pointer-events:none',
      'background:' + color + '22',
      'animation:adFlash 0.6s ease-out forwards'
    ].join(';');
    if (!document.getElementById('ad-flash-style')) {
      const st = document.createElement('style');
      st.id = 'ad-flash-style';
      st.textContent = '@keyframes adFlash { from{opacity:1} to{opacity:0} }';
      document.head.appendChild(st);
    }
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 700);

    // Audio fanfare
    try {
      if (typeof isMuted !== 'undefined' && isMuted) return;
      if (typeof audioCtx === 'undefined' || !audioCtx) return;
      const notes = [440, 554, 659, 880, 1108];
      notes.forEach((f, i) => {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.connect(g); g.connect(audioCtx.destination);
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.15, audioCtx.currentTime + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.1 + 0.3);
        o.start(audioCtx.currentTime + i * 0.1);
        o.stop(audioCtx.currentTime + i * 0.1 + 0.35);
      });
    } catch (e) {}
  }

  // ══════════════════════════════════════════════════════════
  //  INJECT "WATCH AD" QUICK BUTTON IN GAMEPLAY HUD
  // ══════════════════════════════════════════════════════════
  function _injectHudButton() {
    if (document.getElementById('ad-reward-hud-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'ad-reward-hud-btn';
    btn.innerHTML = '📺<br><span style="font-size:6px;letter-spacing:1px">BOOST</span>';
    btn.style.cssText = [
      'position:fixed;bottom:140px;left:10px;z-index:50',
      'width:44px;height:44px;border-radius:10px',
      'background:rgba(0,0,0,0.7)',
      'border:1.5px solid rgba(255,215,0,0.4)',
      'color:#ffd700;font-size:16px;',
      'font-family:Orbitron,monospace;',
      'cursor:pointer;display:none;',
      'box-shadow:0 0 10px rgba(255,215,0,0.2)',
      'line-height:1.2;padding:4px'
    ].join(';');

    btn.onclick = () => {
      if (typeof running !== 'undefined' && running && !(typeof paused !== 'undefined' && paused)) {
        _openOfferPanel();
      }
    };

    document.body.appendChild(btn);
  }

  // Show/hide the quick boost button based on game state
  function _tickHudButton() {
    const btn = document.getElementById('ad-reward-hud-btn');
    if (!btn) return;
    const shouldShow = typeof running !== 'undefined' && running &&
                       !(typeof paused !== 'undefined' && paused) &&
                       !adRewardActive;
    btn.style.display = shouldShow ? 'block' : 'none';
  }

  // ══════════════════════════════════════════════════════════
  //  HOOK INTO GAME LOOP — passive tick
  // ══════════════════════════════════════════════════════════
  // We use a setInterval instead of modifying game.js loop
  // Runs every 2 seconds — lightweight
  setInterval(() => {
    if (typeof running === 'undefined' || !running) return;
    _checkAndOfferAd();
    _checkExpiry();
    _tickHudButton();
  }, 2000);

  // ══════════════════════════════════════════════════════════
  //  ALSO EXPOSE: hook into wave changes via wave variable watch
  // ══════════════════════════════════════════════════════════
  let _prevWave = -1;
  setInterval(() => {
    if (typeof wave === 'undefined') return;
    if (wave !== _prevWave) {
      _prevWave = wave;
      if (adRewardActive) _checkExpiry();
      _checkAndOfferAd();
    }
  }, 500);

  // ══════════════════════════════════════════════════════════
  //  INIT
  // ══════════════════════════════════════════════════════════
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _injectHudButton);
  } else {
    setTimeout(_injectHudButton, 200);
  }

})();
