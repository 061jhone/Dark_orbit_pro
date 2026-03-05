// ==================== game.js ====================
// Core game engine: main loop, UI, shop, audio, achievements, input
// ===== FORCE GLOBALS — real startGame defined below =====

// ==================== PERSISTENT DATA ====================

// ── Global game arrays — game shuru se pehle bhi safe rahein ──
var aliens = [];
var alienBullets = [];
var bullets = [];
var particles = [];
var powerups = [];
var asteroids = [];
// floatingTexts is declared in config.js

// ==================== EFFECT QUALITY SYSTEM ====================
let effectQuality = 'medium'; // 'low' | 'medium' | 'high' | 'ultra'
const EFFECT_QUALITY_SETTINGS = {
  low:    { particleMult: 0.5,  bombEffects: false, shockwaves: false },
  medium: { particleMult: 1.0,  bombEffects: true,  shockwaves: true },
  high:   { particleMult: 1.5,  bombEffects: true,  shockwaves: true },
  ultra:  { particleMult: 2.0,  bombEffects: true,  shockwaves: true, enhancedGlow: true, doubleParticles: true }
};
function setEffectQuality(q) {
  effectQuality = q;
  if (typeof SAVE !== 'undefined') SAVE.set('effectQuality', q);
}
// Load saved effect quality
if (typeof SAVE !== 'undefined') {
  const saved = SAVE.get('effectQuality');
  if (saved) effectQuality = saved;
}


// ==================== ACHIEVEMENTS ====================

function checkAchievements() {
  ACHIEVEMENTS_DEF.forEach(a => {
    if (!achievements[a.id] && a.check()) {
      achievements[a.id] = true;
      SAVE.set('achievements', achievements);
      showAchievement(a);
      earnCoins(25, true);
    }
  });
}

function showAchievement(a) {
  const pop = document.getElementById('achievement-popup');
  document.getElementById('ach-name').textContent = a.icon + ' ' + a.name;
  document.getElementById('ach-desc').textContent = a.desc;
  pop.classList.add('show');
  setTimeout(() => pop.classList.remove('show'), 3000);
}

// ==================== SHOP ====================
// SHOP ITEMS — max level 10, price scales with level

function buildShop() {
  const grid = document.getElementById('shop-grid');
  grid.innerHTML = '';

  // Standard upgrades
  SHOP_ITEMS.forEach(item => {
    const lvl = upgrades[item.id] || 0;
    const price = getUpgradePrice(item);
    const isMax = lvl >= item.max;
    const cantAfford = !isMax && totalCoins < price;
    const div = document.createElement('div');
    div.className = 'shop-item' + (isMax ? ' maxed' : cantAfford ? ' cant-afford' : '');
    div.innerHTML = `<div class="si-icon">${item.icon}</div><div class="si-text"><div class="si-name">${item.name}</div><div class="si-level">${isMax ? 'MAX Lv' + lvl : 'Lv ' + lvl + '/' + item.max}</div></div><div class="si-price">${isMax ? '✅' : '🪙' + price}</div>`;
    if (!isMax && !cantAfford) { div.onclick = () => buyUpgrade(item.id); }
    grid.appendChild(div);
  });

  // Heavy Weapons section header
  const header = document.createElement('div');
  header.className = 'shop-section-title';
  header.innerHTML = '☢️ HEAVY WEAPONS';
  grid.appendChild(header);

  const sub = document.createElement('div');
  sub.style.cssText = 'font-size:6px;color:rgba(255,200,0,.5);text-align:center;margin-bottom:4px;letter-spacing:.5px';
  sub.textContent = 'ONE-TIME USE  •  2% DROP FROM ENEMIES  •  OR BUY';
  grid.appendChild(sub);

  HEAVY_WEAPONS.forEach(hw => {
    const inInv = hwInventory[hw.id] || 0;
    const cantAfford = totalCoins < hw.price;
    const div = document.createElement('div');
    div.className = 'shop-item heavy' + (cantAfford && inInv === 0 ? ' cant-afford' : '');
    div.innerHTML = `
      <div class="si-icon">${hw.icon}</div>
      <div class="si-text">
        <div class="si-name">${hw.name}${inInv > 0 ? ` <span style="color:#00ff88">x${inInv}</span>` : ''}</div>
        <div class="si-level" style="color:rgba(255,200,80,.6)">${hw.desc}</div>
      </div>
      <div class="si-price heavy-price">${cantAfford ? '🪙' + hw.price.toLocaleString() : '🪙' + hw.price.toLocaleString()}</div>
    `;
    if (!cantAfford) {
      div.onclick = () => buyHeavyWeapon(hw.id);
    }
    grid.appendChild(div);
  });
}

function buyHeavyWeapon(id) {
  const hw = HEAVY_WEAPONS.find(h => h.id === id);
  if (!hw || totalCoins < hw.price) return;
  totalCoins -= hw.price;
  SAVE.set('coins', totalCoins);
  hwInventory[id] = (hwInventory[id] || 0) + 1;
  playTone(1000, .3, 'sine', .3);
  updateCoinsUI();
  buildShop();
  buildHeavyWeaponBar();
  showFloatingText('☢️ ' + hw.name + ' PURCHASED!', EX(), EY() - 60, '#ffe600');
}

function buyUpgrade(id) {
  const item = SHOP_ITEMS.find(i => i.id === id);
  const price = getUpgradePrice(item);
  if (totalCoins < price) return;
  totalCoins -= price;
  SAVE.set('coins', totalCoins);

  const lvl = (upgrades[id] || 0) + 1;
  upgrades[id] = lvl;
  SAVE.set('upgrades', upgrades);

  if (id === 'hp') { maxHp = 3 + (upgrades.hp || 0); hp = Math.min(hp + 1, maxHp); updateHP(); }
  if (id === 'rockets') rockets += 10;
  if (id === 'ammo_full') { for (let i = 0; i < 4; i++) ammo[i] = CONFIG.MAX_AMMO[i]; updateWeaponDisplay(); }

  playTone(800, .2, 'sine', .2);
  updateCoinsUI();
  buildShop();
  updateAggressionBar();
}

function toggleShop(e) {
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  if (!running) return; // do not allow opening shop in menu state
  if (paused) return;   // do not allow opening shop while paused

  shopOpen = !shopOpen;
  const panel = document.getElementById('shop-panel');
  if (!panel) return;

  if (shopOpen) {
    buildShop();
    const cv = document.getElementById('shop-coins-val');
    if (cv) cv.textContent = totalCoins;
    panel.classList.add('open');
  } else {
    panel.classList.remove('open');
  }
}

function openShop() {

  shopOpen = true;
  buildShop();
  document.getElementById('shop-coins-val').textContent = totalCoins;
  document.getElementById('shop-panel').classList.add('open');
}

function openShopMenu() {
  shopOpen = true;
  buildShop();
  document.getElementById('shop-coins-val').textContent = totalCoins;
  document.getElementById('shop-panel').classList.add('open');
}

function closeShop() {
  shopOpen = false;
  document.getElementById('shop-panel').classList.remove('open');
}

// 10 kills = 1 coin system
function onKillCoin() {
  killsForCoin++;
  const pct = (killsForCoin / 10) * 100;
  document.getElementById('kill-coin-fill').style.width = pct + '%';
  document.getElementById('kill-coin-val').textContent = killsForCoin + '/10';
  if (killsForCoin >= 10) {
    killsForCoin = 0;
    earnCoins(1);
    document.getElementById('kill-coin-fill').style.width = '0%';
    document.getElementById('kill-coin-val').textContent = '0/10';
    showFloatingText('🪙 +1 COIN!', EX(), EY() - 70, '#ffd700');
  }
}

function earnCoins(amount, silent) {
  silent = silent === undefined ? false : silent;
  totalCoins += amount;
  sessionCoins += amount;
  SAVE.set('coins', totalCoins);
  updateCoinsUI();
  if (!silent) showFloatingText('+' + amount + '🪙', EX(), EY() - 50, '#ffd700');
}

function updateCoinsUI() {
  document.getElementById('coins-val').textContent = totalCoins;
  document.getElementById('shop-coins-val').textContent = totalCoins;
}

// Aggression multiplier — scales with hearts + weapon upgrades + wave (capped at 3x)
function getAggressionMult() {
  const heartFactor = 1 + heartsCollected * 0.05;
  const weaponFactor = 1 + ((upgrades.dmg || 0) + (upgrades.fire || 0)) * 0.03;
  const waveFactor = 1 + (wave - 1) * 0.05;
  return Math.min(heartFactor * weaponFactor * waveFactor, 3.0);
}

function updateAggressionBar() {
  const mult = getAggressionMult();
  const maxMult = 3.0;
  const pct = Math.min(((mult - 1) / (maxMult - 1)) * 100, 100);
  document.getElementById('aggr-fill').style.width = pct + '%';
}

// ==================== DAILY REWARD ====================
function checkDaily() {
  const today = new Date().toDateString();
  const dbadge = document.getElementById('daily-badge');
  if (lastDaily === today) {
    dbadge.textContent = '🎁 DAILY REWARD — COLLECTED';
    dbadge.classList.add('collected');
  }
}

function claimDaily() {
  const today = new Date().toDateString();
  if (lastDaily === today) return;

  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (lastDaily === yesterday) {
    dailyStreak++;
  } else {
    dailyStreak = 1;
  }
  SAVE.set('streak', dailyStreak);

  const reward = Math.min(50 + dailyStreak * 20, 300);
  document.getElementById('daily-amount').textContent = '+' + reward;
  document.getElementById('daily-streak-text').textContent = 'Day ' + dailyStreak + ' Streak 🔥';
  document.getElementById('daily-popup').classList.add('show');
}

function confirmDaily() {
  const today = new Date().toDateString();
  const reward = Math.min(50 + dailyStreak * 20, 300);
  lastDaily = today;
  SAVE.set('lastDaily', lastDaily);

  totalCoins += reward;
  SAVE.set('coins', totalCoins);
  updateCoinsUI();

  document.getElementById('daily-popup').classList.remove('show');
  document.getElementById('daily-badge').textContent = '🎁 DAILY REWARD — COLLECTED';
  document.getElementById('daily-badge').classList.add('collected');
  playTone(600, .5, 'sine', .2);
}

// ==================== TUTORIAL ====================

window.checkTutorial = function () {
  if (!tutDone) {
    document.getElementById("tutorial").classList.remove("off");
    document.getElementById("menu").classList.add("off");
  } else {
    startGame();
  }
};


function nextTutorial() {
  tutStep++;
  if (tutStep >= TUT_STEPS.length) {
    document.getElementById('tutorial').classList.add('off');
    document.getElementById('menu').classList.remove('off');
    tutDone = true;
    SAVE.set('tutDone', true);
    startGame();
    return;
  }
  const s = TUT_STEPS[tutStep];
  document.getElementById('tut-content').innerHTML = `
    <div class="tut-icon">${s.icon}</div>
    <div class="tut-title">${s.title}</div>
    <div class="tut-text">${s.text}</div>
  `;
  document.querySelectorAll('.tut-dot').forEach((d, i) => d.classList.toggle('active', i === tutStep));
  if (tutStep === TUT_STEPS.length - 1) document.getElementById('tut-btn').textContent = 'PLAY NOW!';
}

// ==================== SHARE ====================
function shareScore() {
  const text = `🚀 I got ${kills} kills on Wave ${wave} in DARK ORBIT PRO! Can you beat me? #DarkOrbitPro`;
  if (navigator.share) {
    navigator.share({
      title: 'Dark Orbit Pro',
      text: text,
      url: window.location.href
    }).catch(() => { });
  } else {
    navigator.clipboard.writeText(text)
      .then(() => alert('Score copied to clipboard!'))
      .catch(() => { });
  }
}


/* ===== HUD SETTINGS PANEL ===== */
function toggleHudSettings(e) {
  if (e) { e.stopPropagation(); e.preventDefault(); }
  const panel = document.getElementById('hud-settings-panel');
  if (!panel) return;
  const isOpen = panel.classList.contains('show');
  // Close all other panels first
  const shopPanel = document.getElementById('shop-panel');
  if (shopPanel) shopPanel.classList.remove('open');
  if (isOpen) {
    panel.classList.remove('show');
  } else {
    panel.classList.add('show');
  }
}

// Close panel when tapping outside (both pointer and touch for mobile)
function _hudSettingsOutsideClose(e) {
  const panel = document.getElementById('hud-settings-panel');
  const btn = document.getElementById('hud-settings-btn');
  if (!panel || !btn || !panel.classList.contains('show')) return;

  const target = e.touches ? e.touches[0].target : e.target;

  // Don't close if tapping the toggle button or inside the panel
  if (btn.contains(target) || target === btn) return;
  if (panel.contains(target)) return;

  panel.classList.remove('show');
}
document.addEventListener('pointerdown', _hudSettingsOutsideClose);
document.addEventListener('touchstart', _hudSettingsOutsideClose, { passive: true });
function hudToggle(id, visible) {
  const el = document.getElementById(id);
  if (el) el.style.display = visible ? '' : 'none';
}
// Sync checkboxes between the two panels
function syncTog(id, checked) {
  const el = document.getElementById(id);
  if (el) el.checked = checked;
}
// Pause menu HUD settings toggle
function togglePauseHudSettings() {
  const panel = document.getElementById('pause-hud-panel');
  if (panel.style.display === 'none' || !panel.style.display) {
    panel.style.display = 'block';
    // Sync state from main toggles
    ['hp', 'score', 'coins', 'hs', 'hud', 'aggr', 'wep', 'combo'].forEach(k => {
      const main = document.getElementById('tog-' + k);
      const p = document.getElementById('ptog-' + k);
      if (main && p) p.checked = main.checked;
    });
  } else {
    panel.style.display = 'none';
  }
}

// ==================== 50 ALIEN TYPES ====================
// behavior: normal / zigzag / orbit / suicide / shooter / swarm / split
// shape: 0=UFO 1=fighter 2=bomber 3=diamond 4=hexagon 5=star 6=cross 7=spike 8=beetle 9=crescent

// Wave-based alien pool — harder aliens unlock at higher waves



// ==================== FLOATING TEXT ====================

function spawnPowerup(x, y) {
  const r = Math.random();
  let cumul = 0;
  for (var pti = 0; pti < POWERUP_TYPES.length; pti++) {
    var pt = POWERUP_TYPES[pti];
    cumul += pt.chance;
    if (r < cumul) {
      powerups.push({ x, y, type: pt.type, icon: pt.icon, color: pt.color, vy: 1.5, life: 320, r: 14, isSpaceItem: pt.isSpaceItem || false, label: pt.label || '', duration: pt.duration || 0 });
      break;
    }
  }
}

function collectPowerup(p) {
  if (p.type === 'health') {
    heartsCollected++;
    const capHp = 99;
    if (hp < maxHp) { hp = Math.min(hp + 1, maxHp); }
    else if (maxHp < capHp) { maxHp++; hp = maxHp; }
    updateHP();
    updateAggressionBar();
    playTone(800, .3, 'sine', .2);
    showFloatingText('❤️ HP: ' + hp + '/' + maxHp + ' (AGGR+)', p.x, p.y, '#ff4444');
  }
  else if (p.type === 'shield') { shieldTime = 300; playTone(600, .3, 'sine', .2); showFloatingText('🛡️ SHIELD!', p.x, p.y, '#00ffb4'); }
  else if (p.type === 'ammo') { for (let i = 0; i < 4; i++) ammo[i] = Math.min(ammo[i] + 15, CONFIG.MAX_AMMO[i]); showFloatingText('📦 AMMO REFILL!', p.x, p.y, '#ff8c00'); }
  else if (p.type === 'rocket') { rockets += 12; updateScoreboard(); showFloatingText('🚀 +12 ROCKETS', p.x, p.y, '#ff6600'); }
  else if (p.type === 'freeze') { timeFreeze = 240; playTone(1200, .3, 'square', .2); showFloatingText('❄️ FREEZE!', p.x, p.y, '#00ccff'); }
  else if (p.type === 'nuke') { abilityCD[1] = 0; showFloatingText('💣 NUKE READY!', p.x, p.y, '#ffaa00'); }
  // ── SPACE ITEMS ──
  else if (p.isSpaceItem) {
    activateSpaceItem(p.type, p.label, p.color, p.duration);
    showFloatingText(p.icon + ' ' + p.label + '!', p.x, p.y, p.color);
    playTone(900, .4, 'sine', .25);
  }
  // ── HEAVY WEAPON DROP ──
  else if (p.type === 'heavy_weapon') {
    hwInventory[p.hwId] = (hwInventory[p.hwId] || 0) + 1;
    const hw = HEAVY_WEAPONS.find(h => h.id === p.hwId);
    showFloatingText('💥 ' + hw.name + ' ACQUIRED!', p.x, p.y, '#ffe600');
    playTone(1200, .5, 'sine', .3);
    buildHeavyWeaponBar();
  }
  playTone(400, .1, 'sine', .1);
}

function useHeavyWeapon(id) {
  if (!hwInventory[id] || hwInventory[id] < 1) return;
  hwInventory[id]--;
  const hw = HEAVY_WEAPONS.find(h => h.id === id);
  if (!hw) return;
  executeHeavyWeapon(hw);
  buildHeavyWeaponBar();
}

function executeHeavyWeapon(hw) {
  playTone(200, .8, 'sawtooth', .4);
  playHeavyWeaponVoice();
  showFloatingText('☢️ ' + hw.name + '!', EX(), EY() - 80, '#ffe600');
  const cx = EX(), cy = EY();

  // Helper: burst of glowing debris
  function burstDebris(ox, oy, count, col1, col2, speed, life) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2, sp = speed * (0.4 + Math.random() * 0.8);
      pushParticle({
        x: ox + (Math.random() - .5) * 20, y: oy + (Math.random() - .5) * 20,
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        life: life, maxLife: life,
        color: Math.random() < 0.5 ? col1 : col2,
        size: Math.random() * 8 + 3, funny: true, rotation: Math.random() * Math.PI * 2, rotSpeed: .1
      });
    }
  }
  // Helper: shockwave ring
  function ring(ox, oy, col, maxSz, lifeT) {
    pushParticle({ x: ox, y: oy, vx: 0, vy: 0, life: lifeT, maxLife: lifeT, isRing: true, color: col, size: 0, maxSize: maxSz });
  }
  // Helper: directional sparks (like ion beams)
  function spark(ox, oy, col, count) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      pushParticle({
        x: ox, y: oy, vx: Math.cos(ang) * (4 + Math.random() * 10), vy: Math.sin(ang) * (4 + Math.random() * 10),
        life: 30 + Math.random() * 20, maxLife: 50, color: col, size: Math.random() * 5 + 2, funny: false, rotation: 0, rotSpeed: 0
      });
    }
  }

  switch (hw.effect) {

    // ── NUCLEAR BOMB / SUPERNOVA ─────────────────────────────────────────────
    case 'nuke_all':
    case 'supernova':
      aliens.forEach(a => { a.dead = true; });
      flash = 0.9;
      // 4 expanding rings — white → yellow → orange → red
      ring(cx, cy, '#ffffff', W * 1.4, 55);
      ring(cx, cy, '#ffffaa', W * 1.1, 45);
      ring(cx, cy, '#ff8800', W * 0.75, 38);
      ring(cx, cy, '#ff2200', W * 0.4, 30);
      // Mushroom debris
      burstDebris(cx, cy, 35, '#ffff00', '#ff4400', 14, 70);
      // Fallout sparks around screen
      for (let i = 0; i < 20; i++) pushParticle({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - .5) * 8, vy: (Math.random() - .5) * 8, life: 60, maxLife: 60,
        color: ['#ff4400', '#ffff00', '#ffffff', '#ff8800'][Math.floor(Math.random() * 4)],
        size: Math.random() * 12 + 5, funny: true, rotation: 0, rotSpeed: .1
      });
      playTone(80, 1.5, 'sawtooth', 0.5);
      setTimeout(() => playTone(60, 1, 'sine', 0.3), 500);
      break;

    // ── NEUTRON STAR / PLASMA NOVA ───────────────────────────────────────────
    case 'plasma_nova':
    case 'neutron_star':
      aliens.forEach(a => { if (a.r < 20) a.dead = true; else a.hp = Math.max(1, a.hp - 50); });
      flash = 0.55;
      ring(cx, cy, '#ff8800', W * 1.2, 60);
      ring(cx, cy, '#ffffff', W * 0.7, 45);
      ring(cx, cy, '#ffff00', W * 0.35, 30);
      burstDebris(cx, cy, 25, '#ff8800', '#ffff00', 12, 55);
      spark(cx, cy, '#ff8800', 20);
      playTone(300, .8, 'sawtooth', 0.35);
      break;

    // ── ION CANNON / ORBITAL STRIKE ──────────────────────────────────────────
    case 'ion_cannon':
    case 'orbital_strike':
      aliens.forEach(a => { a.hp = Math.max(0, a.hp - 200); if (a.hp <= 0) a.dead = true; });
      flash = 0.5;
      // Vertical laser beams from top on each alien
      const targets = aliens.filter(a => !a.dead).slice(0, 5);
      targets.forEach(t => {
        // Vertical beam particles
        for (let j = 0; j < 12; j++) pushParticle({
          x: t.x + (Math.random() - .5) * 10, y: j * (H / 12),
          vx: (Math.random() - .5) * 2, vy: 4 + Math.random() * 4,
          life: 35, maxLife: 35, color: j % 2 === 0 ? '#00ffff' : '#ffffff', size: 10 + Math.random() * 6,
          funny: false, rotation: 0, rotSpeed: 0
        });
        ring(t.x, t.y, '#00ffff', 80, 25);
        burstDebris(t.x, t.y, 10, '#00ffff', '#ffffff', 8, 30);
      });
      // Big ring at player
      ring(cx, cy, '#00ffff', W * .6, 40);
      playTone(800, .6, 'sine', 0.3);
      setTimeout(() => playTone(400, .4, 'sine', 0.2), 200);
      break;

    // ── EMP BLAST ────────────────────────────────────────────────────────────
    case 'emp_stun':
      timeFreeze = hw.duration || 480;
      flash = 0.3;
      // Electric pulse rings
      ring(cx, cy, '#aaffff', W * 1.3, 50);
      ring(cx, cy, '#00ffff', W * 0.8, 40);
      ring(cx, cy, '#ffffff', W * 0.3, 25);
      // Lightning sparks on every alien
      aliens.forEach(a => {
        for (let i = 0; i < 6; i++) pushParticle({
          x: a.x + (Math.random() - .5) * a.r * 2, y: a.y + (Math.random() - .5) * a.r * 2,
          vx: (Math.random() - .5) * 5, vy: (Math.random() - .5) * 5,
          life: 20, maxLife: 20, color: '#00ffff', size: 3 + Math.random() * 3, funny: false, rotation: 0, rotSpeed: 0
        });
      });
      playTone(440, 1, 'square', 0.3);
      break;

    // ── ANTIMATTER SHELL ─────────────────────────────────────────────────────
    case 'antimatter':
      activeSpaceItem = { type: 'antimatter', label: 'ANTIMATTER 4x DMG', color: '#ff00ff', timer: hw.duration || 600 };
      showSpaceItemHUD('ANTIMATTER 4x DMG', '#ff00ff', hw.duration || 600);
      flash = 0.4;
      ring(cx, cy, '#ff00ff', W * .5, 40);
      ring(cx, cy, '#ffffff', W * .25, 25);
      burstDebris(cx, cy, 20, '#ff00ff', '#aa00ff', 10, 45);
      spark(cx, cy, '#ff00ff', 15);
      playTone(600, .5, 'sine', 0.3);
      break;

    // ── SOLAR FLARE ──────────────────────────────────────────────────────────
    case 'solar_flare':
      activeSpaceItem = { type: 'rapid_fire', label: 'SOLAR FLARE 3x', color: '#ff8800', timer: hw.duration || 900 };
      showSpaceItemHUD('SOLAR FLARE 3x', '#ff8800', hw.duration || 900);
      flash = 0.5;
      ring(cx, cy, '#ffff00', W * 1.1, 55);
      ring(cx, cy, '#ff8800', W * 0.7, 42);
      ring(cx, cy, '#ffffff', W * 0.3, 25);
      burstDebris(cx, cy, 30, '#ffff00', '#ff4400', 11, 60);
      playTone(440, .8, 'sawtooth', 0.35);
      break;

    // ── BLACK HOLE / VORTEX / GRAVITY WELL ──────────────────────────────────
    case 'black_hole':
    case 'vortex_cannon':
    case 'gravity_well':
      aliens.forEach((a, idx) => { a.x += (cx - a.x) * .5; a.y += (cy - a.y) * .5; if (idx % 2 === 0) a.dead = true; });
      flash = 0.45;
      // Purple implosion rings (reverse — big to small feel via opacity)
      ring(cx, cy, '#aa00ff', W * .9, 50);
      ring(cx, cy, '#6600cc', W * .5, 38);
      ring(cx, cy, '#330099', W * .2, 22);
      burstDebris(cx, cy, 20, '#aa00ff', '#ff00ff', 10, 50);
      spark(cx, cy, '#aa00ff', 15);
      // Show a text label
      showFloatingText('🕳️ GRAVITY CRUSH!', cx, cy - 60, '#aa00ff');
      playTone(55, .8, 'sawtooth', 0.4);
      break;

    // ── DARK MATTER BURST ────────────────────────────────────────────────────
    case 'dark_matter':
      aliens.forEach(a => { a.shieldHp = 0; a.hp = Math.max(0, a.hp - 500); if (a.hp <= 0) a.dead = true; });
      flash = 0.5;
      ring(cx, cy, '#440088', W * .8, 45);
      ring(cx, cy, '#ff00ff', W * .5, 35);
      ring(cx, cy, '#ffffff', W * .2, 20);
      burstDebris(cx, cy, 25, '#ff00ff', '#8800ff', 12, 50);
      spark(cx, cy, '#ff00ff', 18);
      showFloatingText('💠 SHIELDS ANNIHILATED!', cx, cy - 60, '#ff00ff');
      playTone(200, .6, 'sawtooth', 0.3);
      break;

    // ── QUANTUM TORPEDO ──────────────────────────────────────────────────────
    case 'quantum_torpedo':
      let qcount = 0;
      aliens.forEach(a => { if (qcount < 10) { a.hp = Math.max(0, a.hp - a.maxHp); a.dead = (a.hp <= 0); qcount++; } });
      flash = 0.35;
      // Bounce effect — rings at first 5 targets
      aliens.slice(0, 5).forEach(a => {
        ring(a.x, a.y, '#00ccff', 120, 30);
        burstDebris(a.x, a.y, 8, '#00ccff', '#ffffff', 7, 25);
      });
      ring(cx, cy, '#00ccff', W * .4, 35);
      playTone(700, .5, 'sine', 0.25);
      break;

    // ── NANO VIRUS BOMB ──────────────────────────────────────────────────────
    case 'nano_virus':
      aliens.forEach(a => { a.virusTimer = hw.duration || 480; });
      flash = 0.3;
      ring(cx, cy, '#00ff88', W * .6, 40);
      ring(cx, cy, '#88ff44', W * .3, 25);
      // Spread particles to each alien
      aliens.slice(0, 15).forEach(a => {
        for (let i = 0; i < 5; i++) pushParticle({
          x: cx + (Math.random() - .5) * 20, y: cy + (Math.random() - .5) * 20,
          vx: (a.x - cx) / 30 + (Math.random() - .5) * 2, vy: (a.y - cy) / 30 + (Math.random() - .5) * 2,
          life: 40, maxLife: 40, color: '#00ff88', size: 3 + Math.random() * 3, funny: false, rotation: 0, rotSpeed: 0
        });
      });
      showFloatingText('🧬 NANO VIRUS DEPLOYED!', cx, cy - 60, '#00ff88');
      playTone(350, .6, 'sine', 0.25);
      break;
  }
  playExplosion(3, false);
}

function activateSpaceItem(type, label, color, duration) {
  activeSpaceItem = { type, label, color, timer: duration };
  // Show active item HUD
  showSpaceItemHUD(label, color, duration);
}

function tickSpaceItem() {
  if (!activeSpaceItem) return;
  activeSpaceItem.timer--;
  updateSpaceItemHUD();
  if (activeSpaceItem.timer <= 0) {
    activeSpaceItem = null;
    const el = document.getElementById('space-item-hud');
    if (el) el.style.display = 'none';
  }
}

// Space Item effect multipliers used in fireWeapon
function getSpaceItemFireMult() {
  if (!activeSpaceItem) return { rate: 1, dmg: 1, spread: 0, multi: 1 };
  switch (activeSpaceItem.type) {
    case 'rapid_fire': return { rate: 0.35, dmg: 1, spread: 0, multi: 1 };
    case 'rush_fire': return { rate: 0.2, dmg: 1.5, spread: 1, multi: 1 };
    case 'pierce_up': return { rate: 1, dmg: 2, spread: 0, multi: 1, force_pierce: true };
    case 'ghost_mode': return { rate: 0.5, dmg: 1, spread: 0, multi: 1, ghost: true };
    case 'overcharge': return { rate: 0.4, dmg: 3, spread: 0, multi: 1 };
    case 'multi_shot': return { rate: 0.8, dmg: 1, spread: 0, multi: 3 };
    default: return { rate: 1, dmg: 1, spread: 0, multi: 1 };
  }
}

// ==================== MISSION VICTORY ====================




function initOrbitMissiles() {
  orbitMissiles = [];
  for (let i = 0; i < ORBIT_COUNT; i++) {
    orbitMissiles.push({
      angle: (Math.PI * 2 / ORBIT_COUNT) * i,
      speed: 0.025,
      ready: true,
      cooldown: 0,
      firing: false,
      fireAng: 0,
      fireX: 0,
      fireY: 0,
      targetIdx: -1
    });
  }
  renderOrbitMissiles();
}

function renderOrbitMissiles() {
  const cont = document.getElementById('orbit-missiles');
  if (!cont) return;
  cont.innerHTML = '';
  orbitMissiles.forEach((m, i) => {
    const el = document.createElement('div');
    el.id = 'omissile-' + i;
    el.style.cssText = 'position:absolute;font-size:14px;pointer-events:none;transform:translate(-50%,-50%);transition:opacity .2s;filter:drop-shadow(0 0 4px #ff8800)';
    el.textContent = '🚀';
    cont.appendChild(el);
  });
}

function updateOrbitMissiles() {
  if (!running || paused) return;

  const ex = EX(), ey = EY();
  const orbitR = ER() * ORBIT_RADIUS_MULT + 30;

  // Global cooldown to prevent all orbit missiles firing same frame
  orbitCooldown = Math.max(0, orbitCooldown - 1);

  orbitMissiles.forEach((m, idx) => {
    // Rotate orbit continuously
    m.angle += m.speed * (timeFreeze > 0 ? 0.05 : 1);

    if (m.cooldown > 0) m.cooldown--;
    else m.ready = true;

    const mx = ex + Math.cos(m.angle) * orbitR;
    const my = ey + Math.sin(m.angle) * orbitR;

    const el = document.getElementById('omissile-' + idx);
    if (el) {
      el.style.left = mx + 'px';
      el.style.top = my + 'px';
      el.style.opacity = m.ready ? '1' : '0.25';
      el.style.transform = `translate(-50%,-50%) rotate(${m.angle * 180 / Math.PI + 90}deg)`;
    }

    // Classic behavior: orbit missiles auto-fire at nearest alien when ready
    if (m.ready && orbitCooldown <= 0) {
      let nearestA = null;
      let nearestD = Infinity;
      for (let i = 0; i < aliens.length; i++) {
        const a = aliens[i];
        if (!a || a.dead) continue;
        const d = Math.hypot(a.x - mx, a.y - my);
        if (d < nearestD) {
          nearestD = d;
          nearestA = a;
        }
      }
      // Only fire if an alien exists and is within a sane distance
      if (nearestA && nearestD < 900) {
        fireOrbitMissile(idx, nearestA.x, nearestA.y);
        orbitCooldown = 10;
      }
    }
  });
}

function fireOrbitMissile(mIdx, tx, ty) {
  const m = orbitMissiles[mIdx];
  if (!m || !m.ready) return;
  m.ready = false;
  m.cooldown = 240;

  const ex = EX(), ey = EY();
  const orbitR = ER() * ORBIT_RADIUS_MULT + 30;
  const mx = ex + Math.cos(m.angle) * orbitR;
  const my = ey + Math.sin(m.angle) * orbitR;

  // Create visual missile trail
  const trail = document.createElement('div');
  trail.style.cssText = `position:absolute;pointer-events:none;font-size:14px;transform:translate(-50%,-50%);z-index:19;filter:drop-shadow(0 0 6px #ff4400)`;
  trail.textContent = '🔥';
  document.getElementById('orbit-missiles').appendChild(trail);

  // Animate to target
  let prog = 0;
  const anim = setInterval(() => {
    prog += 0.08;
    const cx = mx + (tx - mx) * prog;
    const cy = my + (ty - my) * prog;
    trail.style.left = cx + 'px';
    trail.style.top = cy + 'px';
    if (prog >= 1) {
      clearInterval(anim);
      trail.remove();
      // Explode — deal damage
      for (let i = aliens.length - 1; i >= 0; i--) {
        if (Math.hypot(aliens[i].x - tx, aliens[i].y - ty) < 40) {
          aliens[i].hp -= 15;
          if (aliens[i].hp <= 0) aliens[i].dead = true;
        }
      }
      // Remove nearby alien bullets
      for (let i = alienBullets.length - 1; i >= 0; i--) {
        if (Math.hypot(alienBullets[i].x - tx, alienBullets[i].y - ty) < 35) alienBullets.splice(i, 1);
      }
      // Explosion particle
      for (let i = 0; i < 10; i++) {
        pushParticle({ x: tx, y: ty, vx: (Math.random() - .5) * 9, vy: (Math.random() - .5) * 9 - 2, life: 40, maxLife: 40, color: '#ff8800', size: Math.random() * 7 + 3, funny: true, rotation: 0, rotSpeed: .12 });
      }
      pushParticle({ x: tx, y: ty, vx: 0, vy: 0, life: 18, maxLife: 18, isRing: true, color: '#ff4400', size: 0, maxSize: 40 });
      playTone(300, .2, 'sawtooth', .15);
    }
  }, 16);
}

// ==================== VOICE SYSTEM — GIRL COMMANDER ====================

function showSpaceItemHUD(label, color, duration) {
  const el = document.getElementById('space-item-hud');
  if (!el) return;
  el.style.display = 'block';
  el.style.borderColor = color;
  document.getElementById('si-hud-name').textContent = label;
  document.getElementById('si-hud-name').style.color = color;
  document.getElementById('si-hud-fill').style.background = color;
  document.getElementById('si-hud-icon').textContent =
    ((POWERUP_TYPES.find(function (p) { return p.label === label; }) || {}).icon) || '⚡';
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 700);
}
function updateSpaceItemHUD() {
  if (!activeSpaceItem) return;
  const el = document.getElementById('space-item-hud');
  if (!el || el.style.display === 'none') return;
  const pt = POWERUP_TYPES.find(p => p.label === activeSpaceItem.label);
  const maxDur = pt ? pt.duration : 300;
  const pct = (activeSpaceItem.timer / maxDur) * 100;
  document.getElementById('si-hud-fill').style.width = pct + '%';
  document.getElementById('si-hud-timer').textContent = (activeSpaceItem.timer / 60).toFixed(1) + 's';
}

// ==================== TACTICAL HINT ====================

function checkTacticalHint() {
  // Space item hint
  if (activeSpaceItem && lastTacticalType !== activeSpaceItem.type) {
    showTacticalHint(TACTICAL_HINTS[activeSpaceItem.type] || null);
    lastTacticalType = activeSpaceItem.type;
    return;
  }
  if (!activeSpaceItem) lastTacticalType = '';
  // Enemy-based hint (every 4 seconds)
  if (F % 240 !== 0) return;
  // Find dominant enemy type
  const counts = { heavy: 0, swarm: 0, stealth: 0, electric: 0, healer: 0 };
  aliens.forEach(a => {
    const b = (a.def && a.def.beh) || 'normal';
    if (['crusher', 'titan', 'goliath', 'colossus'].includes((a.def && a.def.name && a.def.name.toLowerCase()) || '')) counts.heavy++;
    else if (b === 'swarm') counts.swarm++;
    else if (b === 'stealth') counts.stealth++;
    else if (b === 'electric') counts.electric++;
    else if (b === 'healer') counts.healer++;
  });
  const dom = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (dom && dom[1] >= 3 && TACTICAL_HINTS[dom[0]]) {
    showTacticalHint(TACTICAL_HINTS[dom[0]]);
  }
}

function showTacticalHint(hint) {
  if (!hint) return;
  const el = document.getElementById('tactical-hint');
  if (!el) return;
  el.textContent = hint.text;
  el.style.color = hint.color;
  el.style.borderColor = hint.color + '88';
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 3500);
}

// ==================== RELOAD BAR ====================
function updateReloadBar() {
  const rate = CONFIG.FIRE_RATE[currentWeapon];
  const gap = F - lastFire;
  const pct = Math.min(100, (gap / rate) * 100);
  const fill = document.getElementById('reload-fill');
  const label = document.getElementById('reload-label');
  const mult = getSpaceItemFireMult();
  if (fill) {
    fill.style.width = pct + '%';
    if (pct >= 100) {
      fill.style.background = 'linear-gradient(90deg,#00ffb4,#00ff66)';
      if (label) label.textContent = 'READY';
      if (label) label.style.color = '#00ffb4';
    } else {
      fill.style.background = 'linear-gradient(90deg,#ff8800,#ff4400)';
      const secsLeft = ((rate - gap) / 60).toFixed(1);
      if (label) { label.textContent = secsLeft + 's'; label.style.color = '#ff8800'; }
    }
  }
  // Space item glow on weapon display
  const wDisp = document.getElementById('weapon-display');
  if (wDisp) {
    if (activeSpaceItem) {
      wDisp.style.borderColor = activeSpaceItem.color;
      wDisp.style.boxShadow = '0 0 12px ' + activeSpaceItem.color + '88';
    } else {
      wDisp.style.borderColor = 'rgba(255,255,255,.22)';
      wDisp.style.boxShadow = 'none';
    }
  }
}

// ==================== COMBO ====================
function updateCombo() {
  const el = document.getElementById('combo-display');
  if (combo >= 2) {
    el.textContent = 'COMBO x' + combo;
    el.classList.add('show');
    setTimeout(() => { if (combo < 2) el.classList.remove('show') }, 100);
  } else {
    el.classList.remove('show');
  }
}

// ==================== INIT ====================
function initStars() {
  stars = [];
  const bgIdx = Math.min(Math.floor((wave - 1) / 10), CONFIG.BACKGROUNDS.length - 1);
  const bg = CONFIG.BACKGROUNDS[bgIdx];
  const count = 150 + wave * 5;
  for (let i = 0; i < Math.min(count, 500); i++) {
    stars.push({ x: Math.random(), y: Math.random(), size: Math.random() * 2 + .4, speed: Math.random() * .5 + .1, color: bg.starColor });
  }
}

// ==================== UI UPDATES ====================
function updateScoreboard() {
  document.getElementById('score-value').textContent = kills;
  document.getElementById('wave-val').textContent = wave;
  document.getElementById('time-val').textContent = Math.ceil(timeLeft);
  document.getElementById('rocket-val').textContent = rockets;
  document.getElementById('hs-val').textContent = bestKills;
  // Mission progress bar (600 kills for mission 1)
  const missionTarget = 1000;
  const mPct = Math.min((kills / missionTarget) * 100, 100);
  const mEl = document.getElementById('mission-fill');
  const mTxt = document.getElementById('mission-txt');
  if (mEl) { mEl.style.width = mPct + '%'; }
  if (mTxt) { mTxt.textContent = kills + '/' + missionTarget; }
  // Wave kill progress
  const waveTarget = 110;
  const wKills = kills - waveKillsStart;
  const wPct = Math.min((wKills / waveTarget) * 100, 100);
  const wEl = document.getElementById('wavekill-fill');
  const wTxt = document.getElementById('wavekill-txt');
  if (wEl) { wEl.style.width = wPct + '%'; }
  if (wTxt) { wTxt.textContent = wKills + '/' + waveTarget; }
}

function updateWeaponDisplay() {
  const w = CONFIG.WEAPONS[currentWeapon];
  document.getElementById('wep-icon').textContent = w.icon;
  document.getElementById('wep-icon').style.color = w.color;
  document.getElementById('wep-name').textContent = w.name;
  document.getElementById('wep-ammo').textContent = Math.floor(ammo[currentWeapon]) + '/' + CONFIG.MAX_AMMO[currentWeapon];
  for (let i = 0; i < 4; i++) {
    const box = document.getElementById('ammo-' + i);
    box.classList.toggle('active', i === currentWeapon);
    box.classList.toggle('empty', ammo[i] <= 0);
    document.getElementById('count-' + i).textContent = Math.floor(ammo[i]);
    document.getElementById('regen-' + i).style.width = (ammo[i] / CONFIG.MAX_AMMO[i] * 100) + '%';
  }
}

function updateAbilities() {
  for (let i = 0; i < 3; i++) {
    const slot = document.getElementById('ability-' + i);
    const cdBar = slot.querySelector('.ability-cd');
    if (abilityCD[i] > 0) {
      abilityCD[i]--;
      slot.classList.remove('ready'); slot.classList.add('cooldown');
      cdBar.style.width = (abilityCD[i] / CONFIG.ABILITY_COOLDOWN[i] * 100) + '%';
    } else {
      slot.classList.add('ready'); slot.classList.remove('cooldown');
      cdBar.style.width = '0%';
    }
  }
}


function showAutoSwitch() {
  const el = document.getElementById('auto-switch');
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2000);
}

function showLowAmmo() {
  const el = document.getElementById('low-ammo');
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1000);
}




// ==================== WAVE CLEAR ====================
// Wave clear popup removed — wave transitions are silent (floating text only)
function showWaveClear(w) { /* no popup */ }
function closeWaveClear() { /* no popup */ }

// ==================== MISSING FUNCTIONS — BUGFIX ====================

// FIX: closeAllOverlays — called 3x but never defined → game crashed on start/pause/menu
function closeAllOverlays(caller) {
  ['shop-panel','pause-menu','hud-settings-panel','mission-victory',
   'game-over','boss-warning','achievement-popup','daily-reward',
   'tutorial-overlay'].forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('show','open','active');
    if (id === 'shop-panel') shopOpen = false;
  });
  document.querySelectorAll('.tab-panel').forEach(function(p){ p.classList.remove('active'); });
}

// FIX: buildHeavyWeaponBar — called 3x but never defined → shop crashed on buy
function buildHeavyWeaponBar() {
  var bar = document.getElementById('hw-bar');
  if (!bar) return;
  bar.innerHTML = '';
  if (!hwInventory || typeof HEAVY_WEAPONS === 'undefined') return;
  Object.keys(hwInventory).forEach(function(id) {
    var count = hwInventory[id];
    if (!count || count <= 0) return;
    var hw = HEAVY_WEAPONS.find(function(h){ return h.id === id; });
    if (!hw) return;
    var btn = document.createElement('button');
    btn.className = 'hw-btn';
    btn.title = hw.name + ' (x' + count + ')';
    btn.innerHTML = (hw.icon||'☢️') + '<span class="hw-count">x' + count + '</span>';
    btn.onclick = function(){ useHeavyWeapon(id); };
    bar.appendChild(btn);
  });
}

// FIX: continueAfterVictory — called from victory screen button, never defined
function continueAfterVictory() {
  var v = document.getElementById('mission-victory');
  if (v) v.classList.remove('show');
  backToMenu();
}

// FIX: toggleMute — called from mute button, should be in audio.js but missing
function toggleMute() {
  if (typeof isMuted === 'undefined') window.isMuted = false;
  isMuted = !isMuted;
  var btn = document.getElementById('mute-btn');
  if (btn) btn.textContent = isMuted ? '🔇' : '🔊';
  try {
    if (typeof masterGain !== 'undefined' && masterGain)
      masterGain.gain.value = isMuted ? 0 : 1;
  } catch(e) {}
  if (typeof SAVE !== 'undefined') SAVE.set('muted', isMuted);
}

// ==================== END MISSING FUNCTIONS ====================

// ==================== GAME CONTROL ====================
function togglePause(e) {
  // prevent global pointer handlers from interfering
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  if (e && typeof e.preventDefault === 'function') e.preventDefault();

  if (!running) return;

  paused = !paused;

  // Always close overlays when toggling pause
  closeAllOverlays('togglePause');

  const menu = document.getElementById('menu');
  if (menu) menu.classList.add('off');

  const pauseMenu = document.getElementById('pause-menu');
  if (pauseMenu) pauseMenu.classList.toggle('show', paused);

  const pauseBtn = document.getElementById('pause-btn');
  if (pauseBtn) pauseBtn.textContent = paused ? '▶' : '⏸';
}

function backToMenu() {
  paused = false; running = false; bossActive = false;
  stopBossMusic();

  // Close all overlays/panels
  closeAllOverlays('backToMenu');

  const pm = document.getElementById('pause-menu');
  if (pm) pm.classList.remove('show');
  const go = document.getElementById('game-over');
  if (go) go.classList.remove('show');

  const menu = document.getElementById('menu');
  if (menu) menu.classList.remove('off');

  const bh = document.getElementById('boss-hp-container');
  if (bh) bh.style.display = 'none';

  updateMenuStats();
}

function updateMenuStats() {
  if (document.getElementById('menu-best')) document.getElementById('menu-best').textContent = bestKills;
  if (document.getElementById('menu-total')) document.getElementById('menu-total').textContent = totalCoins;
  if (document.getElementById('menu-ach')) document.getElementById('menu-ach').textContent = Object.keys(achievements).length + '/' + ACHIEVEMENTS_DEF.length;
  if (typeof buildAlienEncyclopedia === 'function') buildAlienEncyclopedia();
  if (typeof buildMissionList === 'function') buildMissionList();
  if (typeof buildLeaderboard === 'function') buildLeaderboard();
  if (typeof buildAchievementsScreen === 'function') buildAchievementsScreen();
}

// ==================== TAB SWITCHING ====================
function switchTab(tab, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.remove('hidden');
  if (btn) btn.classList.add('active');
  // Build content for new tab
  if (tab === 'leaderboard') buildLeaderboard();
  if (tab === 'achievements') buildAchievementsScreen();
  if (tab === 'aliens') buildAlienEncyclopedia();
  if (tab === 'missions') buildMissionList();
}

// ==================== ALIEN ENCYCLOPEDIA ====================


window.startGame = function () {

  // Ensure no UI overlay remains open when starting
  closeAllOverlays('startGame');

  document.getElementById('menu').classList.add('off');
  document.getElementById('game-over').classList.remove('show');

  document.getElementById('shop-panel').classList.remove('open');
  shopOpen = false;
  
  // Close HUD settings panel if open
  const hudPanel = document.getElementById('hud-settings-panel');
  if (hudPanel) hudPanel.classList.remove('show');

  running = true; paused = false;
  kills = 0; wave = 1; elapsed = 0;
  bgScrollY = 0; bgScrollX = 0; // reset scrolling background
  timeLeft = 60 + (upgrades.time || 0) * 10;
  maxHp = 3 + (upgrades.hp || 0);
  hp = maxHp;
  heartsCollected = 0;
  killsForCoin = 0;
  F = 0; shk = 0; flash = 0; lastFire = 0;
  isFiring = false; // Reset firing state
  manualTarget = null; // Reset target
  bullets = []; aliens = []; particles = []; powerups = []; alienBullets = []; floatingTexts = []; asteroids = [];
  activeSpaceItem = null; hwInventory = {};
  const siHud = document.getElementById('space-item-hud'); if (siHud) siHud.style.display = 'none';
  const thint = document.getElementById('tactical-hint'); if (thint) thint.classList.remove('show');
  const hwBar = document.getElementById('hw-bar'); if (hwBar) hwBar.innerHTML = '';
  const vScreen = document.getElementById('mission-victory'); if (vScreen) vScreen.classList.remove('show');
  currentWeapon = 0;
  ammo = CONFIG.MAX_AMMO.slice();
  rockets = 12;
  abilityCD = [0, 0, 0];
  shieldTime = 0; timeFreeze = 0;
  bossActive = false; bossHP = 0; bossRank = 1; bossCurrentPhase = 1; bossPhaseAnnounced = false;
  bossKills = 0; nukesUsed = 0; shieldsUsed = 0; maxCombo = 0;
  combo = 0; comboTimer = 0; sessionCoins = 0;
  waveClearPending = false;
  waveKillsStart = 0;
  missionComplete = false;
  nextBossTrigger = 1000;
  gameOverCalled = false;
  startMissionBossQueue(); // init mission boss sequence
  bgLabelTimer = 220; // show background name on start
  initRadar(); // init radar

  aimX = EX(); aimY = 50;
  initStars();
  initAudio(); setTimeout(() => cmdSpeak({
    text: "Commander! Welcome back! Weapons hot, shields up, let us show them who we are!",
    pitch: 1.55, rate: 1.0, vol: 1.0
  }), 1500);
  initVoice();
  initOrbitMissiles();
  satRotation = 0;
  if (SAVE.get('muted')) isMuted = true;
  // Init spaceman ally
  if (typeof resetSpacemanSystem === 'function') resetSpacemanSystem();
  // Reset UI
  document.getElementById('kill-coin-fill').style.width = '0%';
  document.getElementById('kill-coin-val').textContent = '0/10';
  updateScoreboard(); updateWeaponDisplay(); updateHP(); updateCoinsUI(); updateAggressionBar();
  requestAnimationFrame(loop); // start game loop
}

let gameOverCalled = false;
function gameOver() {
  if (gameOverCalled || !running) return; // prevent double-call
  gameOverCalled = true;
  running = false; bossActive = false; stopBossMusic();
  setTimeout(() => cmdSpeak({
    text: "Ship destroyed Commander! But we will be back, stronger than ever!",
    pitch: 1.3, rate: 0.95, vol: 1.0
  }), 600);
  playExplosion(5);

  // Save high score
  if (kills > bestKills) {
    bestKills = kills;
    SAVE.set('best', bestKills);
    document.getElementById('new-record').style.display = 'block';
  } else {
    document.getElementById('new-record').style.display = 'none';
  }

  // Save to leaderboard
  saveLeaderboardEntry(kills, wave, elapsed);

  totalTime += elapsed;
  SAVE.set('totalTime', totalTime);

  document.getElementById('final-kills').textContent = kills;
  document.getElementById('final-wave').textContent = wave;
  document.getElementById('final-time').textContent = Math.floor(elapsed) + 's';

  const coinsEarned = kills * 2 + wave * 10;
  earnCoins(coinsEarned, true);
  document.getElementById('coins-earned').textContent = '+' + coinsEarned + ' 🪙 COINS EARNED';

  document.getElementById('game-over').classList.add('show');
  document.getElementById('boss-hp-container').style.display = 'none';
  document.getElementById('boss-scanner').classList.remove('show');
  document.getElementById('new-enemy-alert').classList.remove('show');
  document.getElementById('radar-canvas').classList.remove('show');

  checkAchievements();
  if (typeof updateMenuStats === 'function') updateMenuStats();
}

function watchAdToRevive() {
  if (window.ADMOB && typeof window.ADMOB.showRewardedAd === 'function') {
    window.ADMOB.showRewardedAd().then(watched => {
      if (watched) executeRevive();
    });
  } else if (window.AD_REWARD && typeof window.AD_REWARD._simulateAd === 'function') {
    // If ad-reward.js loaded the simulator
    document.getElementById('game-over').classList.remove('show');
    window.AD_REWARD._simulateAd().then(() => executeRevive());
  } else {
    // Fallback immediate revive if no ad system
    executeRevive();
  }
}

function executeRevive() {
  document.getElementById('game-over').classList.remove('show');
  hp = maxHp;
  shieldTime = 300; // Provide temporary invincibility
  running = true;
  gameOverCalled = false;

  // Clear enemies that are too close to prevent instant re-death
  aliens.forEach(a => {
    if (Math.hypot(a.x - EX(), a.y - EY()) < 250) a.dead = true;
  });

  // Clean up bullets
  alienBullets = [];

  if (typeof cmdSpeak === 'function') {
    cmdSpeak({ text: "Emergency repairs complete! Back in the fight!", pitch: 1.2, rate: 1.1, vol: 1.0 });
  }
}

// Phase detection variables (declared alongside boss vars)

// ==================== TARGETING ====================
// manualTarget: null | {isBoss:true} | alien obj | {isBullet:true, bulletIdx:N}

function startFiring() {
  if (!running || paused) return;
  isFiring = true;
}

function stopFiring() {
  isFiring = false;
}

function selectTarget(tapX, tapY) {
  if (!running || paused) return;

  // 1. Check alien bullets FIRST
  let closestBullet = null, closestBDist = Infinity;
  alienBullets.forEach((b, idx) => {
    const d = Math.hypot(b.x - tapX, b.y - tapY);
    if (d < (b.size || 5) + 22 && d < closestBDist) {
      closestBDist = d; closestBullet = { isBullet: true, bulletRef: b };
    }
  });
  if (closestBullet) { manualTarget = closestBullet; playTone(1100, .06, 'sine', .12); return; }

  // 2. Check boss
  if (bossActive && Math.hypot(bossX - tapX, bossY - tapY) < 100) {
    manualTarget = { isBoss: true };
    playTone(800, .1, 'sine', .1);
    return;
  }

  // 3. Check asteroids
  let pickedAst = null, astDist = Infinity;
  asteroids.forEach(ast => {
    const d = Math.hypot(ast.x - tapX, ast.y - tapY);
    if (d < ast.size + 20 && d < astDist) { astDist = d; pickedAst = ast; }
  });
  if (pickedAst) {
    manualTarget = { isAsteroid: true, asteroidRef: pickedAst };
    playTone(500, .06, 'sine', .1);
    return;
  }

  // 4. Find tapped alien
  let picked = null, pickDist = Infinity;
  if (Array.isArray(aliens)) {          // ✅ crash se bachao
    aliens.forEach(a => {
      if (a.dead) return;
      const d = Math.hypot(a.x - tapX, a.y - tapY);
      if (d < (a.r || 20) + 30 && d < pickDist) { pickDist = d; picked = a; }
    });
  }
  manualTarget = picked;
  if (picked) {
    playTone(600, .08, 'sine', .1);
    // AUTO-FIRE: Start continuous fire when target selected
    isFiring = true;
  } else if (!closestBullet && !bossActive && !pickedAst) {
    // Stop firing when clicking empty space
    isFiring = false;
  }
}

function findTarget() {
  const ex = EX(), ey = EY();

  // Bullet interception target (manual only)
  if (manualTarget && manualTarget.isBullet) {
    const b = manualTarget.bulletRef;
    if (!alienBullets.includes(b)) { manualTarget = null; return null; }
    return { x: b.x, y: b.y, r: (b.size || 6) + 4, isBullet: true, bulletRef: b };
  }

  // Boss target (manual only)
  if (manualTarget && manualTarget.isBoss) {
    if (bossActive) return { x: bossX, y: bossY, r: 70, isBoss: true };
    manualTarget = null; return null;
  }

  // Asteroid target (manual only)
  if (manualTarget && manualTarget.isAsteroid) {
    const ast = manualTarget.asteroidRef;
    if (!asteroids.includes(ast)) { manualTarget = null; return null; }
    return { x: ast.x, y: ast.y, r: ast.size, isAsteroid: true };
  }

  // Alien target (manual selection)
  if (manualTarget) {
    if (manualTarget.dead) { manualTarget = null; return null; }
    const d = Math.hypot(manualTarget.x - ex, manualTarget.y - ey);
    if (d > CONFIG.FIRE_RANGE) { return null; }
    return manualTarget;
  }

  // Auto-target nearest alive alien (fix: otherwise player can never fire unless they manually tap)
  let nearest = null;
  let nearestD = Infinity;
  for (let i = 0; i < aliens.length; i++) {
    const a = aliens[i];
    if (!a || a.dead) continue;
    const d = Math.hypot(a.x - ex, a.y - ey);
    if (d < nearestD && d <= CONFIG.FIRE_RANGE) {
      nearestD = d;
      nearest = a;
    }
  }
  if (nearest) return nearest;

  // Auto-target boss if active
  if (bossActive) return { x: bossX, y: bossY, r: 70, isBoss: true };

  return null;
}

// ==================== RADAR SYSTEM ====================
function initRadar() {
  radarCanvas = document.getElementById('radar-canvas');
  if (!radarCanvas) return;
  const size = (RADAR_R + 4) * 2;
  radarCanvas.width = size;
  radarCanvas.height = size;
  radarCtx = radarCanvas.getContext('2d');
  seenAlienTypes.clear();
}

function checkNewAlienType(a) {
  if (!a || !a.def) return;
  const id = a.def.id;
  if (seenAlienTypes.has(id)) return;
  seenAlienTypes.add(id);
  showNewEnemyAlert(a.def);
}

function showNewEnemyAlert(def) {
  const beh = def.beh || 'normal';
  const info = BEH_ALERT[beh] || BEH_ALERT['normal'];
  const al = document.getElementById('new-enemy-alert');
  if (!al) return;
  document.getElementById('nea-icon').textContent = info.icon;
  document.getElementById('nea-name').textContent = def.name || 'UNKNOWN';
  document.getElementById('nea-ability').textContent = info.ability;
  const thrEl = document.getElementById('nea-threat');
  thrEl.textContent = '⚠ ' + info.threat;
  thrEl.style.color = info.tc;
  thrEl.style.background = info.tc + '22';
  thrEl.style.border = '1px solid ' + info.tc + '55';
  al.style.borderColor = info.tc;
  al.style.boxShadow = '0 0 30px ' + info.tc + '55';
  al.classList.add('show');
  neaTimer = NEA_DURATION;
}

function drawRadar() {
  const rc = radarCanvas;
  const rx = radarCtx;
  if (!rc || !rx) return;
  if (!running || paused) { rc.classList.remove('show'); return; }
  rc.classList.add('show');

  const cx = RADAR_R + 4;
  const cy = RADAR_R + 4;
  const R = RADAR_R;

  rx.clearRect(0, 0, rc.width, rc.height);

  // ── Background circle ──────────────────────────────────
  rx.save();
  rx.beginPath(); rx.arc(cx, cy, R, 0, Math.PI * 2);
  rx.fillStyle = 'rgba(0,0,0,0.38)'; rx.fill();
  rx.strokeStyle = 'rgba(0,255,180,0.5)'; rx.lineWidth = 1.5; rx.stroke();

  // ── Grid rings ─────────────────────────────────────────
  rx.strokeStyle = 'rgba(0,255,180,0.12)'; rx.lineWidth = 1;
  [0.33, 0.66, 1].forEach(f => {
    rx.beginPath(); rx.arc(cx, cy, R * f, 0, Math.PI * 2); rx.stroke();
  });
  // Crosshairs
  rx.strokeStyle = 'rgba(0,255,180,0.1)';
  rx.beginPath(); rx.moveTo(cx - R, cy); rx.lineTo(cx + R, cy); rx.stroke();
  rx.beginPath(); rx.moveTo(cx, cy - R); rx.lineTo(cx, cy + R); rx.stroke();

  // ── Rotating sweep line ────────────────────────────────
  const sweepAng = (F * 0.018) % (Math.PI * 2);
  const sweepGrad = rx.createConicalGradient
    ? null  // fallback below
    : null;
  rx.save();
  rx.beginPath(); rx.moveTo(cx, cy);
  rx.arc(cx, cy, R, sweepAng - 0.7, sweepAng);
  rx.closePath();
  rx.fillStyle = 'rgba(0,255,180,0.08)'; rx.fill();
  rx.restore();
  rx.strokeStyle = 'rgba(0,255,180,0.5)'; rx.lineWidth = 1.5;
  rx.beginPath();
  rx.moveTo(cx, cy);
  rx.lineTo(cx + Math.cos(sweepAng) * R, cy + Math.sin(sweepAng) * R);
  rx.stroke();

  // ── Clip to circle for dots ────────────────────────────
  rx.save();
  rx.beginPath(); rx.arc(cx, cy, R - 2, 0, Math.PI * 2); rx.clip();

  // World center = planet position
  const wx = EX(), wy = EY();

  // ── Draw aliens ────────────────────────────────────────
  aliens.forEach(a => {
    if (a.dead || !a.def) return;
    const dx = (a.x - wx) * RADAR_SCALE;
    const dy = (a.y - wy) * RADAR_SCALE;
    const dist = Math.hypot(dx, dy);
    const col = BEH_COLOR[a.def.beh] || '#ff4444';
    const isTarget = (manualTarget === a);

    if (dist <= R - 3) {
      // Inside radar — draw dot
      const rdx = cx + dx, rdy = cy + dy;
      rx.beginPath(); rx.arc(rdx, rdy, isTarget ? 4 : 2.5, 0, Math.PI * 2);
      rx.fillStyle = col;
      // Stealth: dimmer dot
      rx.globalAlpha = (a.def.beh === 'stealth' && a.stealthOn) ? 0.3 : 1;
      rx.fill();
      rx.globalAlpha = 1;
      // Target ring around selected alien
      if (isTarget) {
        rx.strokeStyle = '#ffffff'; rx.lineWidth = 1;
        rx.beginPath(); rx.arc(rdx, rdy, 6, 0, Math.PI * 2); rx.stroke();
      }
    } else {
      // Outside radar — draw edge arrow pointing inward
      const ang = Math.atan2(dy, dx);
      const ex2 = cx + Math.cos(ang) * (R - 5);
      const ey2 = cy + Math.sin(ang) * (R - 5);
      // Arrow triangle
      rx.save();
      rx.translate(ex2, ey2);
      rx.rotate(ang + Math.PI / 2);
      rx.beginPath();
      rx.moveTo(0, -5); rx.lineTo(3.5, 3); rx.lineTo(-3.5, 3); rx.closePath();
      rx.fillStyle = col;
      rx.globalAlpha = 0.85;
      rx.fill();
      rx.globalAlpha = 1;
      rx.restore();
    }
  });

  // ── Boss dot ───────────────────────────────────────────
  if (bossActive) {
    const dx = (bossX - wx) * RADAR_SCALE;
    const dy = (bossY - wy) * RADAR_SCALE;
    const dist = Math.hypot(dx, dy);
    if (dist <= R - 3) {
      const pulse = 0.6 + Math.sin(F * 0.15) * 0.4;
      rx.beginPath(); rx.arc(cx + dx, cy + dy, 6, 0, Math.PI * 2);
      rx.fillStyle = `rgba(255,0,0,${Math.min(1, Math.max(0, pulse))})`; rx.fill();
      rx.strokeStyle = '#ff6600'; rx.lineWidth = 1.5;
      rx.beginPath(); rx.arc(cx + dx, cy + dy, 8, 0, Math.PI * 2); rx.stroke();
    } else {
      // Boss always gets edge arrow — bigger & red
      const ang = Math.atan2(dy, dx);
      const ex2 = cx + Math.cos(ang) * (R - 4);
      const ey2 = cy + Math.sin(ang) * (R - 4);
      rx.save();
      rx.translate(ex2, ey2);
      rx.rotate(ang + Math.PI / 2);
      const pulse2 = 0.7 + Math.sin(F * 0.2) * 0.3;
      rx.beginPath();
      rx.moveTo(0, -8); rx.lineTo(5.5, 5); rx.lineTo(-5.5, 5); rx.closePath();
      rx.fillStyle = `rgba(255,50,0,${Math.min(1, Math.max(0, pulse2))})`; rx.fill();
      rx.restore();
    }
  }

  rx.restore(); // unclip

  // ── Planet dot (center) ────────────────────────────────
  const pp = 0.5 + Math.sin(F * 0.05) * 0.3;
  rx.beginPath(); rx.arc(cx, cy, 4, 0, Math.PI * 2);
  rx.fillStyle = `rgba(0,180,255,${Math.min(1, Math.max(0, pp))})`; rx.fill();
  rx.strokeStyle = '#00ffb4'; rx.lineWidth = 1;
  rx.beginPath(); rx.arc(cx, cy, 6, 0, Math.PI * 2); rx.stroke();

  // ── RADAR label ────────────────────────────────────────
  rx.font = 'bold 5px Orbitron,Arial';
  rx.fillStyle = 'rgba(0,255,180,0.5)';
  rx.textAlign = 'center';
  rx.fillText('RADAR', cx, cy - R + 9);

  // ── Alien count ────────────────────────────────────────
  const alive = aliens.filter(a => !a.dead).length;
  rx.font = 'bold 7px Orbitron,Arial';
  rx.fillStyle = alive > 0 ? '#ff4444' : '#44ff88';
  rx.fillText(alive + ' HOSTILES', cx, cy + R - 5);

  // ── New enemy alert timer ──────────────────────────────
  if (neaTimer > 0) {
    neaTimer--;
    if (neaTimer === 0) {
      document.getElementById('new-enemy-alert').classList.remove('show');
    }
  }
}


function getMissionBg() {
  const m = (SAVE.get('currentMission') || 1);
  if (m <= 2) return 1; // Earth
  if (m <= 4) return 2; // Mars
  if (m <= 5) return 3; // Saturn
  if (m <= 6) return 4; // Black Hole
  if (m <= 8) return 5; // Nebula
  if (m <= 9) return 6; // Alien World
  return 7;              // Omega Void (mission 10)
}

function drawStars(alpha, speedMult) {
  ctx.globalAlpha = alpha;
  stars.forEach(s => {
    s.y += s.speed * (timeFreeze > 0 ? 0.05 : 1) / 120 * speedMult;
    if (s.y > 1) s.y = 0;
    ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.size * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff'; ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawPlanet(cx, cy, r, gradStops, continentColor, desertColor, atmColor, shadowOffX, hasClouds) {
  // Glow
  const glow = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 1.35);
  glow.addColorStop(0, atmColor.replace('X', '0.18')); glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, r * 1.35, 0, Math.PI * 2); ctx.fill();
  // Base
  const base = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.25, 0, cx, cy, r);
  gradStops.forEach(s => base.addColorStop(s[0], s[1]));
  ctx.fillStyle = base; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  // Continents / surface features
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
  if (continentColor) {
    [{ x: cx - r * .28, y: cy - r * .28, rx: r * .28, ry: r * .32 }, { x: cx + r * .18, y: cy - r * .18, rx: r * .22, ry: r * .26 },
    { x: cx - r * .05, y: cy + r * .08, rx: r * .16, ry: r * .22 }, { x: cx + r * .35, y: cy + r * .2, rx: r * .12, ry: r * .16 }].forEach(c => {
      ctx.fillStyle = continentColor;
      ctx.beginPath(); ctx.ellipse(c.x, c.y, c.rx, c.ry, 0.4, 0, Math.PI * 2); ctx.fill();
      if (desertColor) { ctx.fillStyle = desertColor; ctx.beginPath(); ctx.ellipse(c.x + c.rx * .2, c.y - c.ry * .1, c.rx * .35, c.ry * .28, 0.5, 0, Math.PI * 2); ctx.fill(); }
    });
  }
  if (hasClouds) {
    ctx.globalAlpha = 0.38; ctx.fillStyle = '#e8f4ff';
    [{ x: cx - r * .1, y: cy - r * .4, r: r * .3 }, { x: cx + r * .3, y: cy - .05 * r, r: r * .2 }, { x: cx - r * .35, y: cy + r * .22, r: r * .19 }].forEach(cl => {
      ctx.beginPath(); ctx.arc(cl.x, cl.y, cl.r, 0, Math.PI * 2); ctx.fill();
    });
  }
  ctx.globalAlpha = 1;
  // Atmosphere
  const atm = ctx.createRadialGradient(cx, cy, r * 0.88, cx, cy, r);
  atm.addColorStop(0, atmColor.replace('X', '0'));
  atm.addColorStop(0.65, atmColor.replace('X', '0.1'));
  atm.addColorStop(1, atmColor.replace('X', '0.45'));
  ctx.fillStyle = atm; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  // Shadow
  const shad = ctx.createRadialGradient(cx + r * shadowOffX, cy + r * .3, 0, cx + r * (shadowOffX * .5), cy + r * .2, r * 1.1);
  shad.addColorStop(0, 'rgba(0,0,0,0)'); shad.addColorStop(0.5, 'rgba(0,0,0,0.22)'); shad.addColorStop(1, 'rgba(0,0,0,0.7)');
  ctx.fillStyle = shad; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // Rim
  const rimCol = atmColor.replace('X', '0.3');
  ctx.strokeStyle = rimCol; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
}

function drawMissionBackground() {
  // ── SCROLLING BACKGROUND SYSTEM ──────────────────────────────
  // Render the scrolling image behind all game elements.
  // bgScroll tracks the vertical offset; updated each frame.
  const mNum = Math.min(Math.max((SAVE.get('currentMission') || 1), 1), 10);
  const imgObj = BG_IMGS[mNum];

  // Base speed per mission (px per frame at 60fps)
  const missionSpeed = 0.4 + (mNum - 1) * 0.08; // 0.40 → 1.12 px/frame
  const scrollSpd = timeFreeze > 0 ? missionSpeed * 0.08 : missionSpeed;
  const driftX = 0.06 * mNum; // very subtle diagonal drift

  // Advance scroll offsets
  bgScrollY = (bgScrollY + scrollSpd) % BG_TILE_H;
  bgScrollX = (bgScrollX + driftX * 0.012) % W;

  // Fill black first (fallback)
  ctx.fillStyle = '#000008';
  ctx.fillRect(0, 0, W, H);

  if (imgObj && imgObj.complete && imgObj.naturalWidth > 0) {
    const iw = imgObj.naturalWidth;
    const ih = imgObj.naturalHeight;

    // Scale image to cover full canvas width
    const scale = W / iw;
    const dw = W;
    const dh = ih * scale;

    // BG_TILE_H is the drawn height in screen-pixels
    BG_TILE_H = dh;

    // Subtle horizontal drift clamped to ±20px
    const driftPx = Math.sin(bgScrollX * 0.08) * 20;

    ctx.save();
    ctx.globalAlpha = 1;

    // Draw two tiles vertically for seamless looping
    // Tile 1 (current position)
    const y1 = (bgScrollY % dh) - dh + driftPx * 0.1;
    ctx.drawImage(imgObj, driftPx, y1, dw, dh);
    // Tile 2 (directly below tile 1)
    ctx.drawImage(imgObj, driftPx, y1 + dh, dw, dh);
    // Tile 3 (if gap at bottom)
    if (y1 + dh * 2 < H) {
      ctx.drawImage(imgObj, driftPx, y1 + dh * 2, dw, dh);
    }

    // Dark overlay — keeps game elements visible, atmosphere preserved
    ctx.globalAlpha = 0.48;
    ctx.fillStyle = '#000010';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Minimal star overlay for depth (very light)
  drawStars(0.12, 1.0);
  
  // Draw corpses (behind aliens)
  if (typeof drawCorpses === 'function') {
    drawCorpses();
  }
  
  // Draw ambulances (behind aliens)
  if (typeof drawAmbulances === 'function') {
    drawAmbulances();
  }

  // Draw spaceman ally + alien space suit hunters
  if (typeof drawSpacemanSystem === 'function') {
    drawSpacemanSystem();
  }

  // Mission name label (fades in on mission change)
  if (bgLabelTimer > 0) {
    bgLabelTimer--;
    const alpha = Math.min(1, bgLabelTimer > 180
      ? (220 - bgLabelTimer) / 40
      : bgLabelTimer / 60);
    const lName = BG_NAMES[mNum - 1] || '';
    ctx.save();
    ctx.globalAlpha = alpha * 0.9;
    ctx.font = 'bold 20px Orbitron,Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 22;
    ctx.shadowColor = '#00ffb4';
    ctx.fillStyle = '#00ffb4';
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.lineWidth = 4;
    ctx.strokeText('\u{1F30C} ' + lName, W / 2, H * 0.14);
    ctx.fillText('\u{1F30C} ' + lName, W / 2, H * 0.14);
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}



function updateScannerBox() {
  const box = document.getElementById('scanner-box');
  if (!box) return;

  // Hide when game not running or paused
  if (!running || paused) { box.classList.remove('show'); return; }

  // Hide if no alien target
  if (!manualTarget || manualTarget.isBoss || manualTarget.isBullet || manualTarget.isAsteroid || manualTarget.dead) {
    box.classList.remove('show'); return;
  }

  const a = manualTarget;
  if (!a || !a.def) { box.classList.remove('show'); return; }
  box.classList.add('show');

  const def = a.def;
  const beh = def.beh || 'normal';
  const abilityInfo = BEH_ABILITY_MAP[beh] || BEH_ABILITY_MAP['normal'];

  // Name — blue if shielded
  const hasShield = (beh === 'shield_carrier') && a.shieldHp > 0;
  const nameEl = document.getElementById('scn-name');
  nameEl.textContent = def.name || 'UNKNOWN';
  nameEl.style.color = hasShield ? '#00ccff' : '#ffffff';

  // HP bar — show shield HP when shield active, NaN-safe
  let displayHp, displayMax, hpLabel;
  if (hasShield) {
    displayHp = Math.max(0, isFinite(a.shieldHp) ? Math.ceil(a.shieldHp) : 0);
    displayMax = (isFinite(a.maxShieldHp) && a.maxShieldHp > 0) ? a.maxShieldHp : Math.max(1, displayHp);
    hpLabel = 'SHIELD';
  } else {
    displayHp = Math.max(0, isFinite(a.hp) ? Math.ceil(a.hp) : 0);
    displayMax = (isFinite(a.maxHp) && a.maxHp > 0) ? a.maxHp : Math.max(1, displayHp);
    hpLabel = 'HULL INTEGRITY';
  }
  const hpLabelEl = document.getElementById('scn-hp-label');
  if (hpLabelEl) hpLabelEl.textContent = hpLabel;
  const hpPct = Math.max(0, Math.min(100, (displayMax > 0 ? displayHp / displayMax : 0) * 100));
  const hpFill = document.getElementById('scn-hp-fill');
  if (hpFill) {
    hpFill.style.width = hpPct + '%';
    hpFill.style.background = hasShield ? '#00ccff' : (hpPct > 60 ? '#00ff88' : hpPct > 30 ? '#ffaa00' : '#ff2200');
  }
  const hpNums = document.getElementById('scn-hp-nums');
  if (hpNums) hpNums.textContent = displayHp + ' / ' + displayMax;

  // Ability label — special case for stealth cloaked
  const abilEl = document.getElementById('scn-ability');
  if (abilEl) {
    if (beh === 'stealth' && a.stealthOn) {
      abilEl.textContent = 'CLOAKED!';
      abilEl.style.color = '#aaaaff';
    } else {
      abilEl.textContent = abilityInfo.icon + ' ' + abilityInfo.label;
      abilEl.style.color = abilityInfo.tColor;
    }
  }

  // Threat
  const threatEl = document.getElementById('scn-threat');
  if (threatEl) {
    threatEl.textContent = abilityInfo.threat;
    threatEl.style.color = abilityInfo.tColor;
    threatEl.style.background = abilityInfo.tColor + '18';
    threatEl.style.border = '1px solid ' + abilityInfo.tColor + '55';
  }

  // Box border + glow = threat color
  box.style.borderColor = abilityInfo.tColor;
  box.style.boxShadow = '0 0 14px ' + abilityInfo.tColor + '44';

  // Stealth: dim scanner when invisible
  box.style.opacity = (beh === 'stealth' && a.stealthOn) ? '0.4' : '1';
}


// ==================== LEADERBOARD ====================
const MAX_LB_ENTRIES = 10;

function saveLeaderboardEntry(kills, wave, time) {
  let lb = SAVE.get('leaderboard') || [];
  lb.push({ kills, wave, time: Math.floor(time), date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) });
  lb.sort((a, b) => b.kills - a.kills);
  lb = lb.slice(0, MAX_LB_ENTRIES);
  SAVE.set('leaderboard', lb);
}

function buildLeaderboard() {
  const el = document.getElementById('lb-list');
  if (!el) return;
  const lb = SAVE.get('leaderboard') || [];
  if (lb.length === 0) { el.innerHTML = '<div class="lb-empty">No scores yet. Play to set a record!</div>'; return; }
  const medals = ['🥇', '🥈', '🥉'];
  el.innerHTML = lb.map((e, i) => `
    <div class="lb-row${i === 0 ? ' lb-top' : ''}">
      <div class="lb-rank">${medals[i] || ('#' + (i + 1))}</div>
      <div class="lb-kills">${e.kills}</div>
      <div class="lb-wave">W${e.wave}</div>
      <div class="lb-date">${e.date || ''}</div>
    </div>`).join('');
}

// ==================== ACHIEVEMENTS SCREEN ====================
function buildAchievementsScreen() {
  const el = document.getElementById('ach-list');
  if (!el) return;
  let html = '';
  ACHIEVEMENTS_DEF.forEach(def => {
    const unlocked = achievements[def.id];
    html += `<div class="ach-item${unlocked ? '' : ' ach-locked'}">
      <div class="ach-item-icon">${def.icon || '🏅'}</div>
      <div class="ach-item-info">
        <div class="ach-item-name">${def.name}</div>
        <div class="ach-item-desc">${def.desc || ''}</div>
      </div>
      <div class="ach-item-status">${unlocked ? '✅' : '🔒'}</div>
    </div>`;
  });
  el.innerHTML = html || '<div class="lb-empty">No achievements defined yet.</div>';
}


// ==================== FIRING ====================



function drawPowerups() {
  const now = Date.now();
  powerups = powerups.filter(p => {
    p.y += p.vy; p.life--;
    if (p.life <= 0) return false;

    // Check collect
    const ex = EX(), ey = EY();
    if (Math.hypot(p.x - ex, p.y - ey) < ER() + p.r + 20) {
      collectPowerup(p);
      return false;
    }

    // Draw
    ctx.save();
    ctx.globalAlpha = Math.min(1, p.life / 30);
    ctx.font = `${p.r * 1.5}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowBlur = 12; ctx.shadowColor = p.color;
    ctx.fillText(p.icon, p.x, p.y);
    ctx.restore();
    return true;
  });
}

function drawFloatingTexts() {
  floatingTexts = floatingTexts.filter(function (t) {
    t.y += t.vy; t.life--;
    if (t.life <= 0) return false;
    var alpha = t.life / t.maxLife;
    var sz = t.size || 11;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha * 1.4);
    ctx.font = (t.bold ? 'bold ' : '') + sz + 'px Orbitron,Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // Shadow/outline for readability
    ctx.shadowBlur = t.bold ? 10 : 6;
    ctx.shadowColor = t.bold ? t.color : 'rgba(0,0,0,0.8)';
    // Dark stroke outline
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.lineWidth = t.bold ? 3 : 2;
    ctx.strokeText(t.text, t.x, t.y);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
    ctx.restore();
    return true;
  });
}

function createFunnyDeath(x, y, def) {
  // Effect quality check
  const settings = EFFECT_QUALITY_SETTINGS[effectQuality] || EFFECT_QUALITY_SETTINGS.medium;
  if (effectQuality === 'low' && Math.random() < 0.3) return; // Skip some effects on low
  
  // Only create death particles if below cap (skip on low FPS)
  if (particles.length > PARTICLE_CAP * 0.85) return;

  // Body wreckage — emoji pieces flying up then fading
  const shipEmojis = ['🛸', '👾', '💀', '🔴', '🟠', '🔶', '🔸'];
  const alienCol = (def && def.col) || '#ff4444';
  
  // Scale particle count based on effect quality
  let pieceCount = currentFPS > 40 ? 6 + Math.floor(Math.random() * 4) : 3;
  if (settings.doubleParticles) pieceCount = Math.ceil(pieceCount * 1.5);
  pieceCount = Math.ceil(pieceCount * settings.particleMult);

  // Debris body chunks
  for (let i = 0; i < pieceCount; i++) {
    const ang = (Math.PI * 2 / pieceCount) * i + (Math.random() - .5) * .5;
    const spd = 2 + Math.random() * 5;
    pushParticle({
      x, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - 2,
      life: 55 + Math.floor(Math.random() * 35),
      maxLife: 90,
      color: [alienCol, '#ff8800', '#ffff00', '#ff2200'][Math.floor(Math.random() * 4)],
      size: Math.random() * 9 + 4,
      funny: true,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - .5) * .25,
      isBody: true
    });
  }

  // Big glowing explosion ring — enhanced at higher quality
  let ringSize = (def && def.r) ? def.r * 3.5 : 55;
  if (settings.enhancedGlow) ringSize *= 1.3;
  pushParticle({ x, y, vx: 0, vy: 0, life: 22, maxLife: 22, isRing: true, color: alienCol, size: 0, maxSize: ringSize });

  // Floating emoji body part
  const bodyEmoji = shipEmojis[Math.floor(Math.random() * shipEmojis.length)];
  pushParticle({ x, y, vx: (Math.random() - .5) * 2.5, vy: -2.5 - Math.random() * 2, life: 70, maxLife: 70, isText: true, text: bodyEmoji, size: 20 + Math.floor(Math.random() * 10) });

  // BOOM text
  const texts = ['BOOM!', 'POW!', 'BAM!', 'DEAD!', 'BYE!'];
  pushParticle({ x, y: y - 30, vx: 0, vy: -1.2, life: 40, isText: true, text: texts[Math.floor(Math.random() * texts.length)], size: 16 });

  playExplosion(1, true);
}



function loop() {


  // ✅ Boss target safety
  if (manualTarget && manualTarget.isBoss && !bossActive) {
    manualTarget = null;
  }

  F++;
  tickFPS();

  try {
    const ex = EX(), ey = EY(), er = ER();

    if (running) {

      // ===== UPDATE SECTION =====
      autoRegenAmmo(); checkAutoSwitch(); updateAbilities();
      tickSpaceItem(); updateReloadBar(); checkTacticalHint();
      updateOrbitMissiles();
      
      // Update corpse and ambulance systems
      if (typeof updateCorpses === 'function') updateCorpses();
      if (typeof updateAmbulanceSystem === 'function') updateAmbulanceSystem();
      // Update spaceman ally + alien space suit hunters
      if (typeof updateSpacemanSystem === 'function') updateSpacemanSystem();
      
      // Update corpse count HUD
      if (typeof getCorpseCount === 'function') {
        const corpseCountEl = document.getElementById('corpse-count-val');
        const corpseHudEl = document.getElementById('corpse-count-hud');
        if (corpseCountEl && corpseHudEl) {
          const count = getCorpseCount();
          corpseCountEl.textContent = count;
          corpseHudEl.style.display = count > 0 ? 'block' : 'none';
        }
      }

      // ===== BOSS UPDATE & DRAW =====
      if (bossActive) {
        updateBoss();
        drawBoss();
      }
      if (shieldTime > 0) shieldTime--;
      if (timeFreeze > 0) timeFreeze--;
      if (comboTimer > 0) { comboTimer--; if (comboTimer <= 0) { combo = 0; updateCombo(); } }

      elapsed += 1 / 60; totalTime += 1 / 60;
      timeLeft -= 1 / 60;
      if (timeLeft <= 0) { gameOver(); }
      if (typeof tickCharAbilityBtn === 'function')
        tickCharAbilityBtn();


      // Wave kill target: 110 kills per wave
      const waveKillTarget = 110;
      const waveKillsThisWave = kills - waveKillsStart;
      if (running && waveKillsThisWave >= waveKillTarget && !bossActive && !waveClearPending) {
        waveClearPending = true;
        waveKillsStart += waveKillTarget;
        wave++;
        timeLeft = Math.min(120 + (upgrades.time || 0) * 10, 300);
        if ((wave - 1) % 10 === 0) initStars();
        for (let i = 0; i < 4; i++) ammo[i] = Math.min(ammo[i] + 10, CONFIG.MAX_AMMO[i]);
        playTone(600, .3, 'sine', .2);
        playWaveVoice();
        updateAggressionBar();
        showFloatingText('🌊 WAVE ' + wave + ' — TARGET: 110 KILLS', EX(), H * 0.45, '#00ffb4');
        updateScoreboard();
        // Mothership trigger at 1000 kills
        if (kills >= nextBossTrigger && !bossActive && !missionComplete) {
          missionComplete = true;
          showFloatingText('🏆 ' + nextBossTrigger + ' KILLS! MOTHERSHIP INCOMING!', EX(), H * 0.38, '#ffd700');
          earnCoins(200);
          setTimeout(() => checkBossWave(), 500);
        }
        waveClearPending = false;
      }

      // (Boss bullet hit detection moved to single block below — line ~2312)

      checkAchievements();
      if (F % 60 === 0) updateAggressionBar(); // update every second
    }

    // Targeting & firing
    const target = findTarget();
    const reticle = document.getElementById('target-reticle');
    const lockInd = document.getElementById('lock-indicator');
    if (reticle && lockInd) { // FIX: null guard — prevents crash if elements missing
      if (target) {
        reticle.style.left = target.x + 'px'; reticle.style.top = target.y + 'px';
        if (target.isBullet) {
          reticle.className = 'bullet-locked';
          lockInd.style.left = target.x + 'px'; lockInd.style.top = target.y + 'px';
          lockInd.classList.add('active');
        } else {
          reticle.classList.add('locked');
          reticle.classList.remove('bullet-locked');
          lockInd.style.left = target.x + 'px'; lockInd.style.top = target.y + 'px';
          lockInd.classList.add('active');
        }
      } else {
        reticle.style.left = aimX + 'px'; reticle.style.top = aimY + 'px';
        reticle.classList.remove('locked', 'bullet-locked'); lockInd.classList.remove('active');
      }
    }

    if (running && !paused && isFiring) {
      fireWeapon(target);
    }
    // Update scanner box every frame
    updateScannerBox();
    updateBossScanner();
    drawRadar();

    // Screen shake
    const ox = shk ? (Math.random() - .5) * shk : 0, oy = shk ? (Math.random() - .5) * shk : 0;
    shk *= .9;
    ctx.save(); ctx.translate(ox, oy);

    // Background — mission-based
    drawMissionBackground();

    if (!running) { ctx.restore(); return; }

    // ─── ALIEN SPAWN ───────────────────────────────────────────
    // Remove aliens that drifted far off-screen
    aliens = aliens.filter(a => {
      if (a.dead) return true;
      const margin = 250;
      return a.x > -margin && a.x < W + margin && a.y > -margin && a.y < H + margin;
    });

    const aliveCount = aliens.filter(a => !a.dead).length;

    // Cap alien bullets to prevent performance issues
    if (alienBullets.length > 200) alienBullets.splice(0, alienBullets.length - 180);
    if (particles.length > 1000) particles.splice(0, particles.length - 800);

    // Target count: starts at 20, adds 5 per wave, max 80
    const targetCount = Math.min(20 + (wave - 1) * 5, 80);
    const spawnRate = bossActive ? 9999 : Math.max(4, 25 - wave);

    if (!bossActive && running) {
      if (F % spawnRate === 0) {
        const toAdd = Math.max(1, Math.ceil((targetCount - aliveCount) / 4));
        for (let si = 0; si < Math.min(toAdd, 4); si++) {
          const a = spawnAlien(wave); a.showName = 50; aliens.push(a); checkNewAlienType(a);
        }
      }
      if (aliveCount === 0) {
        for (let si = 0; si < 8; si++) {
          const a = spawnAlien(wave); a.showName = 50; aliens.push(a); checkNewAlienType(a);
        }
      }
    }

    // ===== ASTEROIDS =====
    // Spawn asteroids periodically (more frequent at higher waves)
    const astSpawnRate = Math.max(180, 500 - wave * 20);
    if (running && F % astSpawnRate === 0) {
      const side = Math.random() < .5 ? 'left' : 'right';
      const ax = side === 'left' ? -40 : W + 40;
      const ay = Math.random() * (H * 0.6) + 50;
      const aspd = (0.8 + Math.random() * 1.5) * (side === 'left' ? 1 : -1);
      const asize = 18 + Math.random() * 28;
      asteroids.push({
        x: ax, y: ay, vx: aspd, vy: (Math.random() - .5) * 1.2,
        size: asize, hp: Math.ceil(asize / 6), maxHp: Math.ceil(asize / 6),
        rot: Math.random() * Math.PI * 2, rotSpd: (Math.random() - .5) * .03
      });
    }

    // Update and draw asteroids
    asteroids = asteroids.filter(ast => {
      ast.x += ast.vx * (timeFreeze > 0 ? 0.08 : 1);
      ast.y += ast.vy * (timeFreeze > 0 ? 0.08 : 1);
      ast.rot += ast.rotSpd;
      // Off-screen removal
      if (ast.x < -100 || ast.x > W + 100 || ast.y < -100 || ast.y > H + 100) return false;

      // Player bullets hit asteroid ONLY if player manually targeted it
      const asteroidIsTarget = manualTarget && manualTarget.isAsteroid && manualTarget.asteroidRef === ast;
      if (asteroidIsTarget) {
        for (let bi = bullets.length - 1; bi >= 0; bi--) {
          const b = bullets[bi];
          if (Math.hypot(b.x - ast.x, b.y - ast.y) < ast.size) {
            ast.hp -= b.dmg;
            if (!b.pierce) bullets.splice(bi, 1);
            // Hit particles
            for (let pi = 0; pi < 4; pi++) pushParticle({ x: ast.x + (Math.random() - .5) * ast.size, y: ast.y + (Math.random() - .5) * ast.size, vx: (Math.random() - .5) * 5, vy: (Math.random() - .5) * 5 - 2, life: 30, color: '#aa6633', size: 4, funny: false, rotation: 0, rotSpeed: 0 });
            if (ast.hp <= 0) {
              if (manualTarget && manualTarget.asteroidRef === ast) manualTarget = null;
              spawnPowerup(ast.x, ast.y);
              showFloatingText('💥 ASTEROID!', ast.x, ast.y - 20, '#ff8800');
              playExplosion(2, false);
              for (let pi = 0; pi < 10; pi++) pushParticle({ x: ast.x, y: ast.y, vx: (Math.random() - .5) * 9, vy: (Math.random() - .5) * 9 - 3, life: 45, color: '#aa6633', size: Math.random() * 7 + 3, funny: true, rotation: Math.random() * Math.PI * 2, rotSpeed: .1 });
              return false;
            }
            break;
          }
        }
      }

      // Asteroid hits planet
      if (Math.hypot(ast.x - ex, ast.y - ey) < er + ast.size) {
        if (shieldTime > 0) { playExplosion(2, false); return false; }
        hp -= 1; flash = .5; shk = 14; updateHP();
        showFloatingText('☄️ ASTEROID HIT!', ex, ey - 60, '#ff8800');
        playExplosion(3, false);
        if (hp <= 0) { gameOver(); return false; }
        return false;
      }

      // Draw asteroid
      ctx.save(); ctx.translate(ast.x, ast.y); ctx.rotate(ast.rot);
      const agr = ctx.createRadialGradient(0, 0, 0, 0, 0, ast.size);
      agr.addColorStop(0, '#886644'); agr.addColorStop(0.6, '#664422'); agr.addColorStop(1, '#332211');
      ctx.fillStyle = agr;
      ctx.beginPath();
      const sides = 8;
      for (let si = 0; si < sides; si++) {
        const ang2 = si * Math.PI * 2 / sides;
        const vary = ast.size * (0.75 + Math.sin(ang2 * 3 + ast.rot * 2) * 0.25);
        if (si === 0) ctx.moveTo(Math.cos(ang2) * vary, Math.sin(ang2) * vary);
        else ctx.lineTo(Math.cos(ang2) * vary, Math.sin(ang2) * vary);
      }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,200,100,0.3)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
      // HP bar under asteroid
      if (ast.hp < ast.maxHp) {
        ctx.fillStyle = '#333'; ctx.fillRect(ast.x - ast.size, ast.y + ast.size + 4, ast.size * 2, 4);
        ctx.fillStyle = '#ff6600'; ctx.fillRect(ast.x - ast.size, ast.y + ast.size + 4, ast.size * 2 * (ast.hp / ast.maxHp), 4);
      }
      return true;
    });

    // Planet
    const pg = ctx.createRadialGradient(ex, ey, 0, ex, ey, er * 2.5);
    pg.addColorStop(0, 'rgba(0,100,200,.3)'); pg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(ex, ey, er * 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex, ey, er, 0, Math.PI * 2);
    const og = ctx.createRadialGradient(ex - 12, ey - 12, 0, ex, ey, er);
    og.addColorStop(0, '#2a5a8a'); og.addColorStop(1, '#051020');
    ctx.fillStyle = og; ctx.fill();
    ctx.strokeStyle = '#00ffb4'; ctx.lineWidth = 3; ctx.stroke();

    // Shield visual now drawn inside drawPlayerShip (satellite)

    // Player ship
    drawPlayerShip(ex, ey);

    // Player Bullets — move and check alien bullet interception
    bullets = bullets.filter(b => {
      // ── HOMING ROCKET — steers toward nearest alive alien/boss ──
      if (b.isRocket) {
        let tX = null, tY = null, tDist = Infinity;
        // Prefer player's locked manual target
        if (manualTarget && !manualTarget.isBullet && !manualTarget.isAsteroid) {
          if (manualTarget.isBoss && bossActive) { tX = bossX; tY = bossY; tDist = 0; }
          else if (manualTarget && !manualTarget.dead) { tX = manualTarget.x; tY = manualTarget.y; tDist = 0; }
        }
        // Otherwise find nearest alien
        if (tX === null) {
          for (let ai = 0; ai < aliens.length; ai++) {
            const a = aliens[ai]; if (a.dead) continue;
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d < tDist) { tDist = d; tX = a.x; tY = a.y; }
          }
          if (bossActive) { const bd = Math.hypot(bossX - b.x, bossY - b.y); if (bd < tDist) { tX = bossX; tY = bossY; } }
        }
        if (tX !== null) {
          const speed = Math.hypot(b.vx, b.vy) || 8;
          const tAng = Math.atan2(tY - b.y, tX - b.x);
          const cAng = Math.atan2(b.vy, b.vx);
          let diff = tAng - cAng;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const nAng = cAng + Math.sign(diff) * Math.min(Math.abs(diff), 0.18);
          b.vx = Math.cos(nAng) * speed; b.vy = Math.sin(nAng) * speed;
        }
      }
      b.x += b.vx; b.y += b.vy; b.life--;
      // Intercept alien bullets — generous hit radius since bullets move fast
      if (!b.isRocket) {
        for (let ai = alienBullets.length - 1; ai >= 0; ai--) {
          const ab = alienBullets[ai];
          const hitR = (ab.size || 6) + 8; // bigger hit zone
          // Check current position AND previous position (sweep) to catch fast bullets
          const prevBX = b.x - b.vx, prevBY = b.y - b.vy;
          const curDist = Math.hypot(b.x - ab.x, b.y - ab.y);
          const prevDist = Math.hypot(prevBX - ab.x, prevBY - ab.y);
          if (curDist < hitR || prevDist < hitR) {
            alienBullets.splice(ai, 1);
            for (let pi = 0; pi < 6; pi++) {
              pushParticle({ x: ab.x, y: ab.y, vx: (Math.random() - .5) * 7, vy: (Math.random() - .5) * 7 - 2, life: 22, color: '#00ffff', size: 3, funny: false, rotation: 0, rotSpeed: 0 });
            }
            showFloatingText('💥 INTERCEPTED!', ab.x, ab.y - 12, '#00ffff');
            if (manualTarget && manualTarget.isBullet && manualTarget.bulletRef === ab) manualTarget = null;
            if (!b.pierce) { return false; }
            break;
          }
        }
      }
      return b.life > 0 && b.x > -60 && b.x < W + 60 && b.y > -60 && b.y < H + 60;
    });
    bullets.forEach(b => {
      if (b.isRocket) {
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx));
        // Outer glow
        ctx.shadowBlur = 30; ctx.shadowColor = '#ff6600';
        // Rocket body
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(-6, 8); ctx.lineTo(-11, 0); ctx.lineTo(-6, -8); ctx.closePath(); ctx.fill();
        // Nose white
        ctx.fillStyle = '#ffffff'; ctx.shadowBlur = 10; ctx.shadowColor = '#ffffff';
        ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(11, 4); ctx.lineTo(11, -4); ctx.closePath(); ctx.fill();
        // Side fins
        ctx.fillStyle = '#ff4400'; ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.moveTo(-4, 8); ctx.lineTo(-11, 18); ctx.lineTo(-12, 8); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-4, -8); ctx.lineTo(-11, -18); ctx.lineTo(-12, -8); ctx.closePath(); ctx.fill();
        // Engine flame — flicker
        const fl = 0.75 + Math.random() * 0.5;
        ctx.shadowBlur = 22; ctx.shadowColor = '#ff3300';
        ctx.fillStyle = '#ff4400';
        ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(-7, 6); ctx.lineTo(-26 * fl, 0); ctx.lineTo(-7, -6); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffaa00'; ctx.shadowColor = '#ffaa00';
        ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(-8, 3); ctx.lineTo(-18 * fl, 0); ctx.lineTo(-8, -3); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.shadowBlur = 8; ctx.shadowColor = '#ffffff';
        ctx.beginPath(); ctx.arc(-12, 0, 2.5, 0, Math.PI * 2); ctx.fill();
        // Smoke trail
        ctx.shadowBlur = 0;
        for (let t = 1; t <= 6; t++) {
          ctx.globalAlpha = (0.20 - t * 0.028);
          ctx.fillStyle = t < 3 ? '#ffaa44' : '#ff5500';
          const tr = 5.5 - t * 0.7;
          if (tr > 0) { ctx.beginPath(); ctx.arc(-14 - t * 7, 0, tr, 0, Math.PI * 2); ctx.fill(); }
        }
        ctx.globalAlpha = 1; ctx.restore();
      } else {
        const w = CONFIG.WEAPONS[b.weapon];
        ctx.save();
        if (w.effect === 'beam') {
          // LASER — triple layered glowing beam
          const bvAng = Math.atan2(b.vy, b.vx);
          ctx.translate(b.x, b.y); ctx.rotate(bvAng);
          // Wide outer glow
          ctx.shadowBlur = 24; ctx.shadowColor = '#00ffff';
          const lg = ctx.createLinearGradient(-18, 0, 18, 0);
          lg.addColorStop(0, 'rgba(0,255,180,0)'); lg.addColorStop(0.5, 'rgba(0,255,255,0.5)'); lg.addColorStop(1, 'rgba(0,255,180,0)');
          ctx.fillStyle = lg; ctx.fillRect(-18, -5, 36, 10);
          // Mid beam
          ctx.fillStyle = '#00ffff'; ctx.shadowBlur = 14;
          ctx.fillRect(-16, -2.5, 32, 5);
          // Bright core
          ctx.fillStyle = '#ffffff'; ctx.shadowBlur = 8; ctx.shadowColor = '#ffffff';
          ctx.fillRect(-15, -1.2, 30, 2.4);
          // Leading tip glow
          ctx.beginPath(); ctx.arc(15, 0, 4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,255,255,0.9)'; ctx.fill();
        } else if (w.effect === 'splash') {
          // PLASMA — pulsing fireball with outer corona
          const pr = 10 + Math.sin(F * 0.3) * 1.5;
          ctx.shadowBlur = 28; ctx.shadowColor = '#ff6600';
          // Corona ring
          ctx.strokeStyle = 'rgba(255,120,0,0.5)'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(b.x, b.y, pr + 5, 0, Math.PI * 2); ctx.stroke();
          // Outer fireball
          const pg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, pr);
          pg.addColorStop(0, '#ffffff'); pg.addColorStop(0.25, '#ffee00');
          pg.addColorStop(0.6, '#ff6600'); pg.addColorStop(1, 'rgba(255,40,0,0)');
          ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(b.x, b.y, pr, 0, Math.PI * 2); ctx.fill();
          // Sparks
          ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 1.5; ctx.shadowBlur = 6;
          for (let sp = 0; sp < 4; sp++) {
            const sa = (F * 0.25 + sp * 1.57) % (Math.PI * 2);
            const sl = pr + 3 + Math.sin(F * 0.5 + sp) * 3;
            ctx.beginPath(); ctx.moveTo(b.x + Math.cos(sa) * pr * 0.4, b.y + Math.sin(sa) * pr * 0.4);
            ctx.lineTo(b.x + Math.cos(sa) * sl, b.y + Math.sin(sa) * sl); ctx.stroke();
          }
        } else if (w.effect === 'pierce') {
          // CANNON — red energy lance
          const paAng = Math.atan2(b.vy, b.vx);
          ctx.translate(b.x, b.y); ctx.rotate(paAng);
          ctx.shadowBlur = 24; ctx.shadowColor = '#ff0022';
          // Outer glow halo
          const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, 12);
          cg.addColorStop(0, 'rgba(255,0,40,0.6)'); cg.addColorStop(1, 'rgba(255,0,40,0)');
          ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(0, 0, 22, 10, 0, 0, Math.PI * 2); ctx.fill();
          // Lance body
          ctx.fillStyle = '#ff0033';
          ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(2, 5); ctx.lineTo(-18, 0); ctx.lineTo(2, -5); ctx.closePath(); ctx.fill();
          // Inner hot core
          ctx.fillStyle = '#ff88aa'; ctx.shadowBlur = 10; ctx.shadowColor = '#ffffff';
          ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(2, 2.5); ctx.lineTo(-10, 0); ctx.lineTo(2, -2.5); ctx.closePath(); ctx.fill();
          // Bright tip
          ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.arc(19, 0, 2.5, 0, Math.PI * 2); ctx.fill();
          // Trailing energy ribbon
          ctx.shadowBlur = 0;
          for (let r = 1; r <= 4; r++) {
            ctx.globalAlpha = 0.15 - r * 0.03;
            ctx.fillStyle = '#ff4466';
            ctx.beginPath(); ctx.ellipse(-18 - r * 4, 0, 6 - r, 3 - r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
          }
          ctx.globalAlpha = 1;
        } else {
          // LIGHTNING — electric orb with rotating arcs
          ctx.shadowBlur = 22; ctx.shadowColor = '#aa00ff';
          const elg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 9);
          elg.addColorStop(0, '#ffffff'); elg.addColorStop(0.3, '#ee88ff');
          elg.addColorStop(0.7, '#8800ff'); elg.addColorStop(1, 'rgba(80,0,200,0)');
          ctx.fillStyle = elg; ctx.beginPath(); ctx.arc(b.x, b.y, 9, 0, Math.PI * 2); ctx.fill();
          // Rotating lightning arcs
          ctx.strokeStyle = '#cc66ff'; ctx.lineWidth = 1.8; ctx.shadowBlur = 10; ctx.shadowColor = '#cc44ff';
          for (let arc = 0; arc < 4; arc++) {
            const aAng = (F * 0.35 + arc * 1.57) % (Math.PI * 2);
            const aLen = 10 + Math.sin(F * 0.6 + arc) * 3;
            ctx.beginPath();
            ctx.moveTo(b.x + Math.cos(aAng) * 3, b.y + Math.sin(aAng) * 3);
            const midAng = aAng + 0.4;
            ctx.quadraticCurveTo(
              b.x + Math.cos(midAng) * aLen * 0.7, b.y + Math.sin(midAng) * aLen * 0.7,
              b.x + Math.cos(aAng) * aLen, b.y + Math.sin(aAng) * aLen
            );
            ctx.stroke();
          }
          // Core pulse
          ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
    });

    // Alien bullets — larger, visible, targetable
    alienBullets = alienBullets.filter(b => {
      b.x += b.vx; b.y += b.vy;
      if (Math.hypot(b.x - ex, b.y - ey) < er + 12) {
        if (shieldTime <= 0) {
          hp--; flash = .6; shk = 12; updateHP();
          showHitMessage(); playHitVoice();
          cmdSpeak('playerHit'); // commander hit reaction
          if (hp <= 0) { gameOver(); return false; }
        }
        return false;
      }
      return b.y < H + 50 && b.x > -50 && b.x < W + 50;
    });
    alienBullets.forEach(b => {
      const bSize = b.size || 5;
      const isTargeted = manualTarget && manualTarget.isBullet && manualTarget.bulletRef === b;
      ctx.save();

      if (b.isCryo) {
        // Cryo freeze bullet — icy blue
        ctx.shadowBlur = 14; ctx.shadowColor = '#00ccff';
        const gr = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, bSize * 2);
        gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.4, '#00ccff'); gr.addColorStop(1, 'rgba(0,100,255,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(b.x, b.y, bSize * 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#aaffff'; ctx.beginPath(); ctx.arc(b.x, b.y, bSize * .7, 0, Math.PI * 2); ctx.fill();
      } else if (b.isElec) {
        // Electric bullet — purple spark
        ctx.shadowBlur = 16; ctx.shadowColor = '#aa00ff';
        const gr = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, bSize * 1.8);
        gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, '#cc44ff'); gr.addColorStop(1, 'rgba(150,0,255,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(b.x, b.y, bSize * 1.8, 0, Math.PI * 2); ctx.fill();
        // Zap lines
        ctx.strokeStyle = '#ff88ff'; ctx.lineWidth = 1.5; ctx.globalAlpha = .7;
        for (let z = 0; z < 3; z++) {
          const za = Math.random() * Math.PI * 2;
          ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + Math.cos(za) * bSize * 2, b.y + Math.sin(za) * bSize * 2); ctx.stroke();
        }
      } else if (b.isBoss) {
        // Boss bullet — massive orange plasma ball with tail
        const tailLen = 18;
        const ang = Math.atan2(b.vy, b.vx);
        const tailGr = ctx.createLinearGradient(b.x, b.y, b.x - Math.cos(ang) * tailLen, b.y - Math.sin(ang) * tailLen);
        tailGr.addColorStop(0, 'rgba(255,140,0,.7)'); tailGr.addColorStop(1, 'rgba(255,60,0,0)');
        ctx.fillStyle = tailGr;
        ctx.beginPath(); ctx.ellipse(b.x - Math.cos(ang) * tailLen / 2, b.y - Math.sin(ang) * tailLen / 2, tailLen / 2, bSize * .6, ang, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 20; ctx.shadowColor = '#ff8800';
        const gr = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, bSize * 1.8);
        gr.addColorStop(0, '#ffffaa'); gr.addColorStop(0.4, '#ff8800'); gr.addColorStop(1, 'rgba(255,60,0,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(b.x, b.y, bSize * 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffe0aa'; ctx.beginPath(); ctx.arc(b.x, b.y, bSize * .7, 0, Math.PI * 2); ctx.fill();
      } else {
        // Regular alien bullet — red laser shot with tail
        const ang = Math.atan2(b.vy, b.vx);
        const tailLen = 12;
        ctx.strokeStyle = 'rgba(255,50,0,.5)'; ctx.lineWidth = bSize * .8; ctx.lineCap = 'round';
        ctx.shadowBlur = 8; ctx.shadowColor = '#ff2200';
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - Math.cos(ang) * tailLen, b.y - Math.sin(ang) * tailLen);
        ctx.stroke();
        // Head glow
        ctx.shadowBlur = 12; ctx.shadowColor = '#ff2200';
        const gr = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, bSize * 1.5);
        gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, '#ff4400'); gr.addColorStop(1, 'rgba(255,0,0,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(b.x, b.y, bSize * 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff2200'; ctx.beginPath(); ctx.arc(b.x, b.y, bSize * .7, 0, Math.PI * 2); ctx.fill();
      }

      if (isTargeted) {
        ctx.shadowBlur = 0; ctx.strokeStyle = '#ffff00'; ctx.lineWidth = 2; ctx.setLineDash([3, 2]);
        ctx.lineDashOffset = -F * 0.1;
        ctx.beginPath(); ctx.arc(b.x, b.y, bSize + 7, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    });


    // ===== BOSS BULLET HIT DETECTION — runs BEFORE alien loop so bullets reach boss first =====
    if (bossActive) {
      const bossHitR = 65 + (bossRank * 2);
      for (let bi = bullets.length - 1; bi >= 0; bi--) {
        const b = bullets[bi];
        if (!b) continue;
        if (Math.hypot(b.x - bossX, b.y - bossY) < bossHitR) {
          // Siege shield absorbs first
          if (bossType.id === 'siege' && bossShieldHp > 0) {
            bossShieldHp = Math.max(0, bossShieldHp - b.dmg);
            for (let pi = 0; pi < 4; pi++) pushParticle({ x: bossX + (Math.random() - .5) * 80, y: bossY + (Math.random() - .5) * 80, vx: (Math.random() - .5) * 6, vy: (Math.random() - .5) * 6, life: 18, color: '#00ccff', size: 4, funny: false, rotation: 0, rotSpeed: 0 });
            if (!b.pierce) { bullets.splice(bi, 1); continue; }
          } else {
            bossHP -= b.dmg;
            showDmgText(b.dmg, bossX + (Math.random() - .5) * 50, bossY - 40 + (Math.random() - .5) * 20);
            for (let pi = 0; pi < 5; pi++) pushParticle({ x: bossX + (Math.random() - .5) * 60, y: bossY + (Math.random() - .5) * 60, vx: (Math.random() - .5) * 8, vy: (Math.random() - .5) * 8 - 2, life: 22, color: BOSS_RANK_COLORS[Math.min(bossRank - 1, 9)], size: Math.random() * 6 + 3, funny: false, rotation: 0, rotSpeed: 0 });
            if (!b.pierce) bullets.splice(bi, 1);
          }
        }
      }
      if (bossHP <= 0) { endBossFight(); }
      else if (bossHP < bossMaxHP * 0.1 && !bossLowVoicePlayed) {
        bossLowVoicePlayed = true;
        playBossLowVoice();
        setTimeout(function () { if (typeof _cveBossLow === 'function') _cveBossLow(); }, 1400);
      }
      updateBossHP();
    }

    // Alien Chat System — update chat state each frame
    if (typeof updateAlienChats === 'function') updateAlienChats();

    // Aliens
    for (let i = aliens.length - 1; i >= 0; i--) {
      const a = aliens[i];
      if (a.dead) {
        kills++; combo++; comboTimer = 120; if (combo > maxCombo) maxCombo = combo;
        updateCombo(); updateScoreboard();
        onKillCoin();
        createFunnyDeath(a.x, a.y, a.def);
        spawnPowerup(a.x, a.y);
        spawnHeavyWeapon(a.x, a.y);
        
        // Spawn corpse for new corpse system
        if (typeof spawnCorpse === 'function') {
          spawnCorpse(a);
        }
        
        // Zombie infection mechanic
        if (a.def && a.def.beh === 'zombie' && a.def.infectChance && Math.random() < a.def.infectChance) {
          const infectRadius = a.def.infectRadius || 120;
          // Find nearby dead aliens to resurrect
          const nearbyDeadCount = corpses ? corpses.filter(c => 
            Math.hypot(c.x - a.x, c.y - a.y) < infectRadius
          ).length : 0;
          
          if (nearbyDeadCount > 0 && aliens.length < 50) {
            // Resurrect one zombie
            const zombie = spawnAlien(wave);
            zombie.x = a.x + (Math.random() - 0.5) * infectRadius;
            zombie.y = a.y + (Math.random() - 0.5) * infectRadius;
            zombie.hp = Math.ceil(zombie.maxHp * 0.4);
            zombie.maxHp = zombie.hp;
            // Make it a zombie type
            const zombieTypes = ALIEN_TYPES.filter(t => t.beh === 'zombie');
            if (zombieTypes.length > 0) {
              zombie.def = zombieTypes[Math.floor(Math.random() * zombieTypes.length)];
              zombie.tp = zombie.def.id;
            }
            aliens.push(zombie);
            showFloatingText('🧟 INFECTED!', a.x, a.y - 30, '#44ff44');
          }
        }
        
        if (kills % 10 === 0) playKillVoice(); // every kill voice plays
        if (kills > 0 && kills % 50 === 0) cmdSpeak('killMilestone'); // hype every 50 kills
        aliens.splice(i, 1); updateWeaponDisplay();
        continue;
      }

      const beh = a.def ? a.def.beh : 'normal';
      const aggrMult = getAggressionMult();

      // ── AI TRACKING: Update angle every frame toward player (planet) ──
      // Only orbit/suicide update their own angle — all others must track here
      if (beh !== 'orbit' && !a.suicideMode) {
        const targetAng = Math.atan2(ey - a.y, ex - a.x);
        // Smooth steering: turn toward player each frame (turn rate depends on wave)
        const turnRate = Math.min(0.04 + wave * 0.002, 0.12);
        let da = targetAng - a.ang;
        // Normalize angle diff to [-PI, PI]
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        a.ang += da * turnRate;
      }

      const distToPlanet = Math.hypot(a.x - ex, a.y - ey);
      // Removed aggressive slowdown — aliens now maintain speed near planet
      // Only slow slightly inside danger zone to prevent tunneling
      const nearFactor = distToPlanet < 80 ? 0.85 : 1.0;
      const spd2 = (timeFreeze > 0 ? a.spd * .08 : a.spd) * aggrMult * nearFactor;

      // Virus tick (Nano Virus Bomb) - only damage if actively infected
      if (a.virusTimer > 0) {
        a.virusTimer--;
        // Damage every 60 frames while infected, but only if timer is still active
        if (a.virusTimer > 0 && a.virusTimer % 60 === 0) { 
          a.hp -= 2;
          if (a.hp <= 0) a.dead = true; // FIX: was hp<=1 — killed aliens with 1hp
        }
      }
      if ((beh === 'suicide' || beh === 'suicide_shoot') && !a.suicideMode) {
        if (Math.hypot(a.x - ex, a.y - ey) < 200 + a.r) {
          a.suicideMode = true;
          a.suicideSpdMult = 3 + Math.random() * 2; // dash speed
          showFloatingText('⚠️ SUICIDE!', a.x, a.y - 20, '#ff0000');
        }
      }

      if (a.suicideMode) {
        const dang = Math.atan2(ey - a.y, ex - a.x);
        a.x += Math.cos(dang) * spd2 * a.suicideSpdMult;
        a.y += Math.sin(dang) * spd2 * a.suicideSpdMult;
        a.ang = dang - Math.PI;
      } else {
        switch (beh) {
          case 'zigzag': case 'suicide_shoot':
            // Zigzag: weave while advancing — hard to hit
            a.zt += 0.08;
            a.x += Math.cos(a.ang + Math.sin(a.zt) * 1.4) * spd2;
            a.y += Math.sin(a.ang + Math.sin(a.zt) * 1.4) * spd2;
            break;

          case 'orbit':
            a.orbitA += 0.025;
            a.orbitR = Math.min(Math.max(a.orbitR, 160), Math.min(W, H) * 0.35);
            a.x = ex + Math.cos(a.orbitA) * a.orbitR;
            a.y = ey + Math.sin(a.orbitA) * a.orbitR * 0.5;
            a.x = Math.max(a.r + 5, Math.min(W - a.r - 5, a.x));
            a.y = Math.max(a.r + 5, Math.min(H - a.r - 5, a.y));
            a.ang = Math.atan2(ey - a.y, ex - a.x) - Math.PI;
            // Orbit aliens periodically dive at player
            if (!a.diveCd) a.diveCd = Math.floor(280 + Math.random() * 280);
            a.diveCd--;
            if (a.diveCd <= 0) { a.diveCd = Math.floor(280 + Math.random() * 280); a.diveTimer = 55; }
            if (a.diveTimer > 0) {
              a.diveTimer--;
              const diveAng = Math.atan2(ey - a.y, ex - a.x);
              a.x += Math.cos(diveAng) * spd2 * 2.2;
              a.y += Math.sin(diveAng) * spd2 * 2.2;
            }
            break;

          case 'swarm':
            // Swarm: flock together AND advance — strength in numbers
            a.zt += 0.12;
            let fx = 0, fy = 0, fc = 0;
            aliens.forEach(b => {
              if (b === a || b.dead) return;
              const bd = Math.hypot(b.x - a.x, b.y - a.y);
              if (bd < 45 && bd > 0) { fx -= (b.x - a.x) / bd; fy -= (b.y - a.y) / bd; fc++; }
            });
            a.x += Math.cos(a.ang + Math.sin(a.zt) * 1.8) * spd2 + (fc > 0 ? fx * 0.25 : 0);
            a.y += Math.sin(a.ang + Math.sin(a.zt) * 1.8) * spd2 + (fc > 0 ? fy * 0.25 : 0);
            break;

          case 'stealth':
            // Invisible phase = move faster to close distance
            a.stealthTimer--;
            if (a.stealthTimer <= 0) {
              a.stealthOn = !a.stealthOn;
              a.stealthTimer = a.stealthOn ? 80 : 120;
            }
            a.x += Math.cos(a.ang) * (a.stealthOn ? spd2 * 1.7 : spd2);
            a.y += Math.sin(a.ang) * (a.stealthOn ? spd2 * 1.7 : spd2);
            break;
          
          case 'zombie':
            // Zombies are immune to time freeze and move erratically
            const zombieSpd = a.spd * aggrMult * nearFactor; // Ignore timeFreeze
            a.zt = (a.zt || 0) + 0.06;
            // Shambling movement with random direction changes
            a.x += Math.cos(a.ang + Math.sin(a.zt) * 2.0) * zombieSpd;
            a.y += Math.sin(a.ang + Math.sin(a.zt) * 2.0) * zombieSpd;
            break;

          case 'electric':
            // Spiral approach
            a.elecCd = (a.elecCd || 0) - 1;
            a.zt = (a.zt || 0) + 0.05;
            a.x += Math.cos(a.ang + Math.sin(a.zt) * 0.7) * spd2;
            a.y += Math.sin(a.ang + Math.sin(a.zt) * 0.7) * spd2;
            break;

          case 'shield_carrier':
            if (a.shieldHp < a.maxShieldHp) {
              a.shieldRegen++;
              if (a.shieldRegen >= 180) { a.shieldHp = Math.min(a.shieldHp + 1, a.maxShieldHp); a.shieldRegen = 0; }
            }
            // Slow but completely unstoppable advance
            a.x += Math.cos(a.ang) * spd2;
            a.y += Math.sin(a.ang) * spd2;
            break;

          case 'bomber':
            if (distToPlanet > 200) {
              // Far: charge in fast
              a.x += Math.cos(a.ang) * spd2 * 1.4;
              a.y += Math.sin(a.ang) * spd2 * 1.4;
            } else {
              // Close: strafe back-and-forth near player
              a.zt = (a.zt || 0) + 0.09;
              a.x += Math.cos(a.ang + Math.PI / 2) * Math.sin(a.zt) * spd2 * 1.5;
              a.y += Math.sin(a.ang) * spd2 * 0.4;
            }
            break;

          case 'healer':
            a.healCd--;
            if (a.healCd <= 0) {
              a.healCd = 120;
              let nearestWounded = null, nearD = Infinity;
              aliens.forEach(b => { if (b === a || b.dead) return; if (b.hp < b.maxHp) { const d = Math.hypot(b.x - a.x, b.y - a.y); if (d < 200 && d < nearD) { nearD = d; nearestWounded = b; } } });
              if (nearestWounded) {
                nearestWounded.hp = Math.min(nearestWounded.hp + 2, nearestWounded.maxHp);
                for (let pi = 0; pi < 5; pi++) pushParticle({ x: a.x, y: a.y, vx: (nearestWounded.x - a.x) / 20 + (Math.random() - .5) * 2, vy: (nearestWounded.y - a.y) / 20 + (Math.random() - .5) * 2, life: 25, color: '#00ff88', size: 3, funny: false, rotation: 0, rotSpeed: 0 });
                showFloatingText('💚 HEAL!', nearestWounded.x, nearestWounded.y - 16, '#00ff88');
              }
            }
            // Healer: stay at medium range, keep allies alive from behind
            if (distToPlanet > 230) {
              a.x += Math.cos(a.ang) * spd2;
              a.y += Math.sin(a.ang) * spd2;
            } else {
              a.zt = (a.zt || 0) + 0.04;
              a.x += Math.cos(a.ang + Math.sin(a.zt) * 0.8) * spd2 * 0.65;
              a.y += Math.sin(a.ang + Math.sin(a.zt) * 0.8) * spd2 * 0.65;
            }
            break;

          case 'splitter':
            a.x += Math.cos(a.ang) * spd2;
            a.y += Math.sin(a.ang) * spd2;
            break;

          case 'teleport':
            a.teleportCd--;
            a.x += Math.cos(a.ang) * spd2;
            a.y += Math.sin(a.ang) * spd2;
            break;

          default:
            // Normal: relentless straight advance toward player
            a.x += Math.cos(a.ang) * spd2;
            a.y += Math.sin(a.ang) * spd2;
        }
      }

      // Shooters fire only when VISIBLE on screen
      const onScreen = a.x > -a.r && a.x < W + a.r && a.y > -a.r && a.y < H + a.r;
      if (a.canFire && onScreen) {
        a.fireCooldown--;
        if (a.fireCooldown <= 0) {
          const aggrMult = getAggressionMult();
          const baseCd = a.suicideMode ? 9999 : 100;
          a.fireCooldown = Math.max(20, Math.floor((baseCd + Math.random() * 60) / aggrMult));
          if (!a.suicideMode) {
            const fang = Math.atan2(ey - a.y, ex - a.x);
            const bspd = 3 + wave * 0.1;
            const bsize = 6 + Math.floor(wave / 5);
            alienBullets.push({ x: a.x, y: a.y, vx: Math.cos(fang) * bspd, vy: Math.sin(fang) * bspd, dmg: 1, size: bsize, isBoss: false });
          }
        }
      }

      // Bullet hits
      for (let bi = bullets.length - 1; bi >= 0; bi--) {
        const b = bullets[bi];
        if (Math.hypot(b.x - a.x, b.y - a.y) < a.r + 5) {
          if (b.pierce) { if (b.hits.includes(i)) continue; b.hits.push(i); }
          else bullets.splice(bi, 1);

          // Shield carrier: absorb damage into shield first
          if (beh === 'shield_carrier' && a.shieldHp > 0) {
            a.shieldHp = Math.max(0, a.shieldHp - b.dmg);
            a.shieldRegen = 0;
            // Shield spark particles
            for (let pi = 0; pi < 4; pi++) pushParticle({ x: a.x + (Math.random() - .5) * a.r * 2, y: a.y + (Math.random() - .5) * a.r * 2, vx: (Math.random() - .5) * 5, vy: (Math.random() - .5) * 5 - 2, life: 18, color: '#00ccff', size: 3, funny: false, rotation: 0, rotSpeed: 0 });
            if (!b.pierce) break;
            continue;
          }

          // Teleport: when hit, blink to new position
          if (beh === 'teleport' && a.teleportCd <= 0) {
            a.teleportCd = 90;
            const newX = 60 + Math.random() * (W - 120);
            const newY = 60 + Math.random() * (H * 0.5);
            // Teleport flash
            for (let pi = 0; pi < 10; pi++) pushParticle({ x: a.x, y: a.y, vx: (Math.random() - .5) * 8, vy: (Math.random() - .5) * 8, life: 22, color: '#ff00ff', size: 4, funny: true, rotation: 0, rotSpeed: .15 });
            a.x = newX; a.y = newY;
            a.ang = Math.atan2(ey - a.y, ex - a.x);
            showFloatingText('⚡ BLINK!', a.x, a.y - 16, '#ff00ff');
          }

          a.hp -= b.dmg;
          
          // Zombie weakness to plasma (2x damage)
          if (beh === 'zombie' && b.weaponType === 1) { // weaponType 1 = plasma
            a.hp -= b.dmg; // Apply damage again for 2x total
            showFloatingText('WEAK!', a.x, a.y - 30, '#ff6600');
          }

          // Rocket direct hit — cinematic explosion
          if (b.isRocket) {
            // Shockwave rings
            pushParticle({ x: a.x, y: a.y, vx: 0, vy: 0, life: 35, maxLife: 35, isRing: true, color: '#ff8800', size: 0, maxSize: 160 });
            pushParticle({ x: a.x, y: a.y, vx: 0, vy: 0, life: 22, maxLife: 22, isRing: true, color: '#ffffff', size: 0, maxSize: 80 });
            // Debris
            for (let pi = 0; pi < 20; pi++) pushParticle({
              x: a.x, y: a.y,
              vx: (Math.random() - .5) * 14, vy: (Math.random() - .5) * 14 - 4,
              life: 45, maxLife: 45, color: pi < 10 ? '#ff4400' : '#ffff00',
              size: Math.random() * 8 + 3, funny: true, rotation: 0, rotSpeed: .1
            });
            // Splash damage
            aliens.forEach((a2, j) => { if (j !== i && !a2.dead && Math.hypot(a2.x - a.x, a2.y - a.y) < 80) { a2.hp -= 25; if (a2.hp <= 0) a2.dead = true; } });
            flash = 0.18;
            showFloatingText('🚀💥 DIRECT HIT!', a.x, a.y - 25, '#ff8800');
            playExplosion(2, false);
          }

          // Floating damage number
          showDmgText(b.dmg, a.x + (Math.random() - .5) * 18, a.y - a.r - 8);
          if (beh === 'electric') {
            let arcTarget = null, arcD = Infinity;
            aliens.forEach((a2, j) => { if (j !== i && !a2.dead) { const d = Math.hypot(a2.x - a.x, a2.y - a.y); if (d < 120 && d < arcD) { arcD = d; arcTarget = a2; } } });
            if (arcTarget) {
              ctx.save(); ctx.strokeStyle = '#ffff00'; ctx.lineWidth = 2; ctx.shadowBlur = 8; ctx.shadowColor = '#ffff00';
              ctx.setLineDash([4, 2]);
              ctx.beginPath(); ctx.moveTo(a.x, a.y);
              // Jagged lightning
              const mx = (a.x + arcTarget.x) / 2 + (Math.random() - .5) * 30;
              const my = (a.y + arcTarget.y) / 2 + (Math.random() - .5) * 30;
              ctx.lineTo(mx, my); ctx.lineTo(arcTarget.x, arcTarget.y);
              ctx.stroke(); ctx.setLineDash([]); ctx.restore();
              arcTarget.hp -= Math.ceil(b.dmg / 2);
              if (arcTarget.hp <= 0) arcTarget.dead = true;
            }
          }

          if (b.splash) aliens.forEach((a2, j) => { if (j !== i && !a2.dead && Math.hypot(a2.x - a.x, a2.y - a.y) < b.splash) { a2.hp -= Math.floor(b.dmg / 2); if (a2.hp <= 0) a2.dead = true; } });
          if (b.chain) { let ch = 0; aliens.forEach((a2, j) => { if (ch >= b.chain) return; if (j !== i && !a2.dead && Math.hypot(a2.x - a.x, a2.y - a.y) < 100) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a2.x, a2.y); ctx.strokeStyle = '#aa00ff'; ctx.lineWidth = 2; ctx.stroke(); a2.hp -= b.dmg; if (a2.hp <= 0) a2.dead = true; ch++; } }); }

          if (a.hp <= 0) {
            // Bomber: explode on death
            if (beh === 'bomber' && a.bombR > 0) {
              const bR = a.bombR;
              // Layer 1: Core debris burst
              for (let pi = 0; pi < 30; pi++) pushParticle({ x: a.x, y: a.y, vx: (Math.random() - .5) * 16, vy: (Math.random() - .5) * 16 - 4, life: 60, maxLife: 60, color: pi < 15 ? '#ff4400' : '#ffff00', size: Math.random() * 10 + 4, funny: true, rotation: 0, rotSpeed: .12 });
              // Layer 2: Shockwave rings (outer, inner)
              pushParticle({ x: a.x, y: a.y, vx: 0, vy: 0, life: 40, maxLife: 40, isRing: true, color: '#ff6600', size: 0, maxSize: bR * 2.2 });
              pushParticle({ x: a.x, y: a.y, vx: 0, vy: 0, life: 28, maxLife: 28, isRing: true, color: '#ffffff', size: 0, maxSize: bR });
              // Layer 3: Static radius visual
              ctx.save(); ctx.beginPath(); ctx.arc(a.x, a.y, bR, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(255,100,0,0.18)'; ctx.fill();
              ctx.strokeStyle = '#ff8800'; ctx.lineWidth = 4;
              ctx.shadowBlur = 20; ctx.shadowColor = '#ff4400';
              ctx.stroke(); ctx.restore();
              // Damage planet if close
              if (shieldTime <= 0 && Math.hypot(a.x - ex, a.y - ey) < bR + er) {
                hp -= 1; flash = .5; shk = 12; updateHP();
                showHitMessage(); playHitVoice();
                cmdSpeak('playerHit'); // commander hit reaction
                showFloatingText('💥 BOMB BLAST! -1HP', ex, ey - 60, '#ff4400');
              }
              playExplosion(3);
              showFloatingText('💥 BOOM!', a.x, a.y - 20, '#ff6600');
            }

            // Splitter: spawn smaller aliens on death
            if (beh === 'splitter' && !a.hasSplit && a.splitCount > 0) {
              a.hasSplit = true;
              const basePool = [ALIEN_TYPES[0], ALIEN_TYPES[2], ALIEN_TYPES[10]]; // basic small aliens
              for (let si = 0; si < a.splitCount; si++) {
                const tp2 = basePool[si % basePool.length];
                const ang2 = Math.random() * Math.PI * 2;
                const child = {
                  x: a.x + Math.cos(ang2) * a.r, y: a.y + Math.sin(ang2) * a.r,
                  def: tp2, tp: tp2.id, r: Math.max(6, a.r * 0.5),
                  hp: Math.max(1, Math.ceil(a.maxHp * 0.25)), maxHp: Math.max(1, Math.ceil(a.maxHp * 0.25)),
                  spd: tp2.spd * 1.5, ang: ang2, dead: false, zt: 0, orbitR: 80, orbitA: ang2,
                  suicideMode: false, fireCooldown: 60, canFire: false, dmgOnCrash: 1, flashT: 0,
                  stealthTimer: 0, stealthOn: false, shieldHp: 0, maxShieldHp: 0, shieldRegen: 0,
                  bombR: 0, splitCount: 0, hasSplit: true, teleportCd: 0, healCd: 0, elecCd: 0, showName: 30
                };
                aliens.push(child);
              }
              showFloatingText('🔀 SPLIT!', a.x, a.y - 20, '#ff88ff');
            }
            a.dead = true;
          }
          if (!b.pierce) break;
        }
      }

      // ===== REMOVE aliens that flew off screen (bug fix) =====
      if (a.x < -150 || a.x > W + 150 || a.y < -150 || a.y > H + 150) {
        aliens.splice(i, 1);
        continue;
      }

      // Earth collision
      if (Math.hypot(a.x - ex, a.y - ey) < er + a.r) {
        if (shieldTime > 0) { a.dead = true; playExplosion(2); }
        else {
          const dmg = a.suicideMode ? (a.dmgOnCrash || 1) : 1;
          hp -= dmg; flash = .6 * dmg; shk = 15 * dmg;
          updateHP();
          cmdSpeak('playerHit'); // commander hit reaction
          if (a.suicideMode) {
            showFloatingText('💥 CRASH! -' + dmg + 'HP', ex, ey - 60, '#ff0000');
            playExplosion(3, false);
            
            // Suicide explosion particles — scale by effect quality
            const settings = EFFECT_QUALITY_SETTINGS[effectQuality] || EFFECT_QUALITY_SETTINGS.medium;
            let explosionCount = 20;
            if (settings.doubleParticles) explosionCount = 35;
            explosionCount = Math.ceil(explosionCount * settings.particleMult);
            
            for (let pi = 0; pi < explosionCount; pi++) {
              pushParticle({ x: a.x, y: a.y, vx: (Math.random() - .5) * 12, vy: (Math.random() - .5) * 12 - 4, life: 60, color: '#ff4400', size: Math.random() * 8 + 4, funny: true, rotation: 0, rotSpeed: .1 });
            }
            
            // Enhanced glow effect at high quality
            if (settings.enhancedGlow) {
              for (let eg = 0; eg < 8; eg++) {
                const glowAng = (eg / 8) * Math.PI * 2;
                pushParticle({ x: a.x, y: a.y, vx: Math.cos(glowAng) * 5, vy: Math.sin(glowAng) * 5, life: 40, color: '#ffaa00', size: 3 + Math.random() * 3, funny: false });
              }
            }
            
            // Cluster Bomber: spawn mini-bombs
            if (a.def && a.def.clusterBombs) {
              for (let cb = 0; cb < a.def.clusterBombs; cb++) {
                const cAngle = (cb / a.def.clusterBombs) * Math.PI * 2;
                const cSpeed = 3 + Math.random() * 2;
                alienBullets.push({
                  x: a.x,
                  y: a.y,
                  vx: Math.cos(cAngle) * cSpeed,
                  vy: Math.sin(cAngle) * cSpeed,
                  dmg: 1,
                  size: 6,
                  isBoss: false
                });
              }
              showFloatingText('💣 CLUSTER!', a.x, a.y - 40, '#ff8800');
            }
            
            // Chain Reactor: damage nearby aliens
            if (a.def && a.def.chainExplosion) {
              const chainRadius = 100;
              aliens.forEach(other => {
                if (other !== a && !other.dead && Math.hypot(other.x - a.x, other.y - a.y) < chainRadius) {
                  other.hp -= 10;
                  if (other.hp <= 0) other.dead = true;
                  showFloatingText('-10', other.x, other.y - 20, '#ff4400');
                }
              });
              showFloatingText('⚡ CHAIN!', a.x, a.y - 40, '#ffff00');
            }
          }
          if (hp <= 0) { gameOver(); aliens.splice(i, 1); continue; }
          a.dead = true;
        }
      }

      drawAlienShip(a);
    }

    // Draw manual target ring
    if (manualTarget && !manualTarget.dead) {
      const tx = manualTarget.isBoss ? bossX : manualTarget.x;
      const ty = manualTarget.isBoss ? bossY : manualTarget.y;
      const tr = manualTarget.isBoss ? 80 : manualTarget.r + 14;
      ctx.save();
      ctx.strokeStyle = '#ff3a3a';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = -F * 0.08;
      ctx.beginPath(); ctx.arc(tx, ty, tr, 0, Math.PI * 2); ctx.stroke();
      // Corner marks
      ctx.setLineDash([]);
      ctx.lineWidth = 3;
      [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.moveTo(tx + sx * tr, ty + sy * (tr - 10));
        ctx.lineTo(tx + sx * tr, ty + sy * tr);
        ctx.lineTo(tx + sx * (tr - 10), ty + sy * tr);
        ctx.stroke();
      });
      ctx.restore();
    }

    // Powerups
    drawPowerups();

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.life--;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.save();

      if (p.isRing) {
        // Expanding explosion ring
        const progress = 1 - (p.life / p.maxLife);
        const curR = p.maxSize * progress;
        const alpha = (p.life / p.maxLife) * 0.8;
        ctx.globalAlpha = alpha;
        ctx.beginPath(); ctx.arc(p.x, p.y, curR, 0, Math.PI * 2);
        ctx.strokeStyle = p.color; ctx.lineWidth = 3 + p.life * .15;
        ctx.shadowBlur = 12; ctx.shadowColor = p.color;
        ctx.stroke();
      } else if (p.isText) {
        const alpha = Math.min(1, p.life / (p.maxLife || 35));
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${p.size}px Orbitron,Arial`;
        ctx.fillStyle = '#ffff00';
        ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.strokeText(p.text, p.x, p.y); ctx.fillText(p.text, p.x, p.y);
      } else if (p.isBody) {
        // Spinning body debris chunk
        const alpha = (p.life / (p.maxLife || 55)) * 0.9;
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation + p.life * p.rotSpeed);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 8; ctx.shadowColor = p.color;
        ctx.beginPath();
        const sides = 3 + Math.floor(Math.random() * 2);
        for (let s = 0; s < sides; s++) {
          const a2 = (Math.PI * 2 / sides) * s;
          const r2 = p.size * (0.6 + Math.random() * .6);
          s === 0 ? ctx.moveTo(Math.cos(a2) * r2, Math.sin(a2) * r2) : ctx.lineTo(Math.cos(a2) * r2, Math.sin(a2) * r2);
        }
        ctx.closePath(); ctx.fill();
      } else {
        const alpha = p.life / 50;
        ctx.translate(p.x, p.y);
        if (p.funny) ctx.rotate(p.rotation + p.life * p.rotSpeed);
        ctx.fillStyle = p.color; ctx.globalAlpha = alpha;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      }

      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // Floating texts
    drawFloatingTexts();

    // Alien Chat Bubbles — coordination & attack dialogue
    if (typeof drawAlienChats === 'function') drawAlienChats();

    // Screen flash
    if (flash > 0) { ctx.fillStyle = `rgba(255,0,0,${Math.min(1, Math.max(0, flash))})`; ctx.fillRect(0, 0, W, H); flash *= .88; }
    if (timeFreeze > 0) { ctx.fillStyle = 'rgba(100,200,255,.07)'; ctx.fillRect(0, 0, W, H); }
    // ===== CINEMATIC EFFECTS LAYER =====
    if (typeof drawCinematicEffects === 'function') {
      drawCinematicEffects(ctx, W, H);
    }

    ctx.restore();
    updateScoreboard();
  } catch (e) { console.error('Loop error:', e); }
  // FIX: stop loop after game over to prevent hang — restart via startGame()
  if (!gameOverCalled) {
    requestAnimationFrame(loop);
  }
}

// ==================== CONTROLS ====================
// Helper: check if a point is inside a button element (safe zone) — padded 18px
function isOverButton(x, y) {
  // FIX: Also block game input when any UI panel/overlay is open
  // Without this, tapping toggles inside hud-settings-panel also fires weapons
  const panels = [
    '#hud-settings-panel', '#shop-panel', '#pause-menu',
    '#pause-hud-panel', '#boss-scanner', '#scanner-box',
    '#daily-popup', '#game-over', '#mission-victory'
  ];
  for (var pi = 0; pi < panels.length; pi++) {
    var panel = document.querySelector(panels[pi]);
    if (!panel) continue;
    // Check if panel is visible
    const cs = window.getComputedStyle(panel);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
    if (panel.classList.contains('show') || cs.display !== 'none') {
      const pr = panel.getBoundingClientRect();
      if (pr.width > 0 && pr.height > 0 && x >= pr.left && x <= pr.right && y >= pr.top && y <= pr.bottom) return true;
    }
  }
  const btns = document.querySelectorAll('button, #pause-btn, #mute-btn, #hud-settings-btn, #shop-btn, .ability-btn, .tab-btn, .hw-slot, .hud-switch, .ability-slot, #ability-char');
  for (var eli = 0; eli < btns.length; eli++) {
    var el = btns[eli];
    const r = el.getBoundingClientRect();
    const pad = 18;
    if (x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad) return true;
  }
  return false;
}

window.addEventListener('mousemove', e => { aimX = e.clientX; aimY = e.clientY; });
window.addEventListener('click', e => {
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  if (isOverButton(e.clientX, e.clientY)) return; // skip if over button
  selectTarget(e.clientX, e.clientY);
});
window.addEventListener('touchmove', e => { const t = e.touches[0]; aimX = t.clientX; aimY = t.clientY; }, { passive: true });
window.addEventListener('touchstart', e => {
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  const t = e.touches[0];
  if (isOverButton(t.clientX, t.clientY)) return; // skip if over button
  aimX = t.clientX; aimY = t.clientY;
  selectTarget(t.clientX, t.clientY);
}, { passive: true });

window.addEventListener('keydown', e => {
  if (e.key === 'Escape' || e.key === 'p') togglePause();

  // Ability voice
  if (e.key === 'q' || e.key === 'Q') { useAbility(0); cmdSpeak({ text: "Shield activated! We are protected!", pitch: 1.55, rate: 1.15, vol: 0.95 }); }
  if (e.key === 'w' || e.key === 'W') { useAbility(1); cmdSpeak({ text: "Nuke away! Maximum devastation!", pitch: 1.55, rate: 1.15, vol: 0.95 }); }
  if (e.key === 'e' || e.key === 'E') { useAbility(2); cmdSpeak({ text: "Time freeze! They cannot move!", pitch: 1.55, rate: 1.15, vol: 0.95 }); }

  // Weapon switch voice
  if (e.key === '1') { switchWeapon(0); cmdSpeak({ text: "Laser online!", pitch: 1.6, rate: 1.3, vol: 0.85 }); }
  if (e.key === '2') { switchWeapon(1); cmdSpeak({ text: "Plasma cannon ready!", pitch: 1.6, rate: 1.3, vol: 0.85 }); }
  if (e.key === '3') { switchWeapon(2); cmdSpeak({ text: "Rocket launcher armed!", pitch: 1.6, rate: 1.3, vol: 0.85 }); }
  if (e.key === '4') { switchWeapon(3); cmdSpeak({ text: "Shotgun locked and loaded!", pitch: 1.6, rate: 1.3, vol: 0.85 }); }

  if (e.key === ' ' || e.key === 'Enter') { if (isFiring) stopFiring(); else startFiring(); }
});

// Hearts are now dynamically managed by updateHP()
// Initial hearts already in HTML (h1,h2,h3)

// ==================== ADMOB PLACEHOLDER ====================
// In production, replace with actual AdMob SDK
window.AdMob = {
  showBanner: () => { document.getElementById('ad-banner').style.display = 'flex'; },
  hideBanner: () => { document.getElementById('ad-banner').style.display = 'none'; },
  showInterstitial: (cb) => { setTimeout(cb, 0); }, // Real: show ad then call cb
  showRewarded: (cb) => { cb(true); } // Real: show rewarded ad, cb(watched)
};

// Show rewarded ad button on game over
function watchAdForCoins() {
  AdMob.showRewarded((watched) => {
    if (watched) { earnCoins(50); alert('You earned 50 bonus coins!'); }
  });
}

// ==================== INIT ====================

// =====================================================
// BACKGROUND IMAGE PRELOADER — Dark Orbit Pro v20
// To replace images: change the base64 strings below,
// or load from URL: img.src = 'your_image.jpg';
// Mission 1=Earth, 2=Dark Nebula, 3=Purple Nebula,
// 4=Cosmic Storm, 5=Alien Sector, 6=Asteroid Belt,
// 7=Red Chaos, 8=War Zone, 9=Lightning Vortex, 10=Void
// =====================================================
// ── RESET HUD POSITIONS ──
function resetHudPositions() {
  HUD_DRAGGABLE_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.left = ''; el.style.top = '';
    el.style.right = ''; el.style.bottom = '';
    el.style.transform = '';
    SAVE.set('hudpos_' + id, null);
  });
}

// ── HUD DRAG HANDLER ──
function makeHudDragHandler(el) {
  return function (e) {
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const origLeft = parseFloat(el.style.left) || 0;
    const origTop = parseFloat(el.style.top) || 0;
    function onMove(ev) {
      el.style.left = (origLeft + (ev.clientX - startX)) + 'px';
      el.style.top = (origTop + (ev.clientY - startY)) + 'px';
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };
}

function toggleHudEditMode() {

  const btn = document.getElementById('hud-edit-btn');
  const overlay = document.getElementById('hud-edit-overlay');
  const banner = document.getElementById('hud-edit-banner');

  if (!btn || !overlay || !banner) return;

  hudEditMode = !hudEditMode;

  if (hudEditMode) {

    btn.textContent = '✅ DONE EDITING';
    btn.style.background = 'rgba(0,180,80,.3)';
    btn.style.borderColor = 'rgba(0,220,100,.6)';
    btn.style.color = '#88ffcc';

    overlay.classList.add('show');
    banner.classList.add('show');

    HUD_DRAGGABLE_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;

      el.classList.add('hud-draggable-active');
      el._prevPE = el.style.pointerEvents;
      el.style.pointerEvents = 'auto';

      const r = el.getBoundingClientRect();
      el.style.left = r.left + 'px';
      el.style.top = r.top + 'px';
      el.style.right = 'auto';
      el.style.bottom = 'auto';
      el.style.transform = 'none';

      el._dragBound = makeHudDragHandler(el);
      el.addEventListener('pointerdown', el._dragBound);
    });

  } else {

    btn.textContent = '🔲 EDIT LAYOUT';
    btn.style.background = 'rgba(0,100,255,.25)';
    btn.style.borderColor = 'rgba(0,150,255,.6)';
    btn.style.color = '#88ccff';

    overlay.classList.remove('show');
    banner.classList.remove('show');

    HUD_DRAGGABLE_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;

      el.classList.remove('hud-draggable-active');
      el.style.pointerEvents = el._prevPE || '';

      if (el._dragBound) {
        el.removeEventListener('pointerdown', el._dragBound);
      }

      SAVE.set('hudpos_' + id, { left: el.style.left, top: el.style.top });
    });

  }
}

// ==================== AUTO BOOTSTRAP ====================
(function () {
  try { updateMenuStats(); } catch (e) { console.error('updateMenuStats failed:', e); }
  try { checkDaily(); } catch (e) { console.error('checkDaily failed:', e); }
})();