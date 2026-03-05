// ==================== alien.js ====================
// Alien types, spawning, AI behaviors, drawing, and boss system

function getAlienPool(wave) {
  if (wave < 3) return ALIEN_TYPES.slice(0, 10);  // basics only
  if (wave < 6) return ALIEN_TYPES.slice(0, 18);  // + fast
  if (wave < 10) return ALIEN_TYPES.slice(0, 35);  // + heavy + shooter
  if (wave < 15) return ALIEN_TYPES.slice(0, 50);  // + suicide + swarm
  if (wave < 20) return ALIEN_TYPES.slice(0, 63);  // + stealth + electric
  if (wave < 25) return ALIEN_TYPES.slice(0, 73);  // + shield + bomber
  return ALIEN_TYPES;                           // all types incl healer/splitter/teleport
}

function pickAlienType(wave) {
  const pool = getAlienPool(wave);
  // Suicide aliens appear more at higher waves
  const suicideChance = Math.min(0.3, wave * 0.02);
  if (Math.random() < suicideChance) {
    const suicides = pool.filter(t => t.beh === 'suicide' || t.beh === 'suicide_shoot');
    if (suicides.length) return suicides[Math.floor(Math.random() * suicides.length)];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

function spawnAlien(wave) {
  const ex = EX(), ey = EY();
  const side = Math.random() < .6 ? 'top' : Math.random() < .5 ? 'left' : 'right';
  let x, y;
  if (side === 'top') { x = ex - 250 + Math.random() * 500; y = -50; }
  else if (side === 'left') { x = -50; y = Math.random() * (H * .5); }
  else { x = W + 50; y = Math.random() * (H * .5); }

  const tp = pickAlienType(wave);
  const aggrM = getAggressionMult();
  // SOFT CAP: HP scaling slows after wave 60 to prevent bullet sponges
  const hpScale = wave <= 60
    ? 1 + Math.floor(wave / 8) * 0.4
    : 1 + Math.floor(60 / 8) * 0.4 + (wave - 60) * 0.05;
  const cappedHpScale = Math.min(hpScale, 8.0); // absolute cap

  // ── MISSION DIFFICULTY MULTIPLIERS ──────────────────────────
  const mDiff = (typeof getMissionDiff === 'function') ? getMissionDiff() : null;
  const diffHpMult = mDiff ? mDiff.alienHpMult : 1.0;
  const diffSpdMult = mDiff ? mDiff.alienSpdMult : 1.0;

  return {
    x, y,
    def: tp,
    tp: tp.id,
    r: tp.r,
    hp: Math.max(1, Math.ceil(tp.hp * cappedHpScale * (isFinite(diffHpMult) ? diffHpMult : 1))),
    maxHp: Math.max(1, Math.ceil(tp.hp * cappedHpScale * (isFinite(diffHpMult) ? diffHpMult : 1))),
    spd: Math.min(tp.spd * (isFinite(diffSpdMult) ? diffSpdMult : 1) * (timeFreeze > 0 ? 0.15 : 1), 6.0), // cap raised for harder missions
    ang: Math.atan2(ey - y, ex - x),
    dead: false,
    zt: 0,
    orbitR: 160 + Math.random() * 80, orbitA: Math.random() * Math.PI * 2,
    suicideMode: false,
    // Shooter aliens: high initial cooldown so they appear on screen before firing
    fireCooldown: (function () {
      const _df = (typeof getMissionDiff === 'function') ? getMissionDiff() : null;
      const _fm = _df ? _df.alienFireMult : 1.0;
      const _base = tp.beh === 'shooter' ? 180 + Math.random() * 120 : 60 + Math.random() * 100;
      return Math.floor(_base * _fm);
    })(),
    canFire: tp.beh === 'shooter' || tp.beh === 'suicide_shoot',
    dmgOnCrash: tp.dmgOnCrash || 1,
    flashT: 0,
    // Stealth
    stealthTimer: Math.floor(Math.random() * 120),
    stealthOn: false,
    // Shield carrier
    shieldHp: tp.shieldHp || 0,
    maxShieldHp: tp.shieldHp || 0,
    shieldRegen: 0,
    // Bomber
    bombR: tp.bombR || 0,
    // Splitter
    splitCount: tp.splitCount || 0,
    hasSplit: false,
    // Teleport
    teleportCd: 0,
    // Healer
    healCd: 0,
    // Electric
    elecCd: 0,
    // Virus
    virusTimer: 0,
  };
}
// ==================== BOSS SYSTEM ====================
function checkBossWave() {
  if (kills >= nextBossTrigger && !bossActive) {
    const nextRank = getNextMissionBoss();
    if (nextRank) {
      bossRank = nextRank;
      showBossWarning();
    }
  }
}

function startBossFight() {
  bossActive = true;
  // Pick boss type based on how many boss fights have happened (cycles through 7 types)
  const typeIdx = Math.max(0, Math.floor(wave / 10) - 1) % BOSS_TYPES.length;
  bossType = BOSS_TYPES[typeIdx];

  const rankColor = BOSS_RANK_COLORS[Math.min(bossRank - 1, 9)];
  // FAIR HP SCALING: cap at 2.5x wave multiplier, and rank scales linearly not exponentially
  const waveMultiplier = Math.min(1 + wave * 0.03, 2.5);
  const _bDiff = (typeof getMissionDiff === 'function') ? getMissionDiff() : null;
  const _bDiffMult = _bDiff ? Math.max(1.0, _bDiff.alienHpMult * 0.6) : 1.0;
  bossHP = Math.floor((6000 + bossRank * 3500) * waveMultiplier * _bDiffMult);
  bossMaxHP = bossHP;
  bossX = W / 2; bossY = -120; bossPhase = 0;

  // PHASE SYSTEM — boss has 3 phases based on HP%
  // Phase 1 (100-66%): Storm + Main Fire
  // Phase 2 (66-33%): Shadow + Siege + Main Fire (stronger)
  // Phase 3 (33-0%):  Plague + Cryo + Necro + Main Fire (enrage)
  bossCurrentPhase = 1;
  bossPhaseAnnounced = false;
  bossLowVoicePlayed = false;

  // Stagger alien fire cooldowns so they don't all fire simultaneously (prevents hang)
  aliens.forEach((a, idx) => { a.canFire = true; a.fireCooldown = 60 + idx * 15; });

  // Init special abilities — all disabled, enabled per phase
  bossStealth = false; bossStealthTimer = 160;
  bossPlagueTimer = 0;
  bossCryoActive = false; bossCryoTimer = 0;
  necroReviveTimer = 0;
  // Siege shield: active in phase 2+
  bossShieldHp = 0;
  bossMaxShieldHp = Math.floor(bossMaxHP * 0.20);

  updateBossHP();
  setTimeout(() => showFloatingText('⚠️ RANK ' + bossRank + ' — ' + BOSS_RANK_NAMES[Math.min(bossRank - 1, 9)], W / 2, H * .4, rankColor), 300);
  setTimeout(() => showFloatingText('👾 ' + bossType.name + ' — PHASE 1 ACTIVE', W / 2, H * .45, '#ff8800'), 800);
  setTimeout(() => showFloatingText('⚡ STORM + MAIN FIRE', W / 2, H * .50, '#ffff00'), 1400);

  // Reset CVE per-boss one-shot flags for this new boss
  if (typeof _cveResetBossFlags === 'function') _cveResetBossFlags();

  // Horror incoming voice — delayed 2600ms so it clears after existing
  // playBossWarningVoice() (called from showBossWarning ~800ms before this)
  setTimeout(function () {
    if (typeof _cveBossIncoming === 'function') _cveBossIncoming();
  }, 2600);
}


function updateBoss() {
  if (!bossActive) return;
  bossPhase += 0.018 + bossRank * .002;
  bossX = W / 2 + Math.sin(bossPhase) * (180 + bossRank * 10);
  bossY = 80 + bossRank * 8 + Math.sin(bossPhase * 2) * 35;

  // Guard against NaN
  if (!isFinite(bossHP)) bossHP = 0;
  if (!isFinite(bossMaxHP) || bossMaxHP <= 0) bossMaxHP = 1;

  // ══════════════════════════════════════════════════════════
  // BOSS PHASES — Clear telegraphing, no all-at-once chaos
  // ══════════════════════════════════════════════════════════
  const hpPct = bossHP / bossMaxHP;
  const prevPhase = bossCurrentPhase;

  if (hpPct > 0.66) bossCurrentPhase = 1;
  else if (hpPct > 0.33) bossCurrentPhase = 2;
  else bossCurrentPhase = 3;

  // Announce phase transitions with visual telegraph
  if (bossCurrentPhase !== prevPhase) {
    const phaseColors = ['', '#ffaa00', '#ff4400', '#ff0066'];
    const phaseNames = ['', 'PHASE 1', '⚡ PHASE 2 — SHIELD + SHADOW!', '☠️ ENRAGE PHASE — MAXIMUM POWER!'];
    showFloatingText('⚠️ ' + phaseNames[bossCurrentPhase], W / 2, H * 0.35, phaseColors[bossCurrentPhase]);
    flash = 0.4; shk = 12;
    playTone(bossCurrentPhase === 3 ? 120 : 200, 0.8, 'sawtooth', 0.3);
    playBossPhaseVoice();
    // In phase 2: activate siege shield
    if (bossCurrentPhase === 2) {
      bossShieldHp = bossMaxShieldHp;
      showFloatingText('🛡️ SIEGE SHIELD ONLINE!', W / 2, H * 0.42, '#00ccff');
    }
    // In phase 3: drop shield, go full aggression
    if (bossCurrentPhase === 3) {
      bossShieldHp = 0;
      showFloatingText('💀 SHIELD DOWN — PLAGUE + CRYO + NECRO ACTIVE!', W / 2, H * 0.42, '#ff0066');
    }
  }

  // ── PHASE 1: Storm + Main Fire ──────────────────────────
  if (bossCurrentPhase === 1) {
    // Storm: electric bolts every 1.5 seconds
    if (F % 90 === 0) {
      const stormCount = 2 + Math.floor(bossRank / 3);
      for (let i = 0; i < stormCount; i++) {
        const ang3 = (i / stormCount) * Math.PI * 2 + F * 0.02;
        alienBullets.push({ x: bossX, y: bossY, vx: Math.cos(ang3) * 3, vy: Math.sin(ang3) * 2.5 + 1, dmg: 1, size: 7, isElec: true, isBoss: true });
      }
    }
  }

  // ── PHASE 2: Shadow + Siege + stronger fire ────────────
  if (bossCurrentPhase === 2) {
    // Shadow: stealth phases every 5s
    bossStealthTimer--;
    if (bossStealthTimer <= 0) {
      bossStealth = !bossStealth;
      bossStealthTimer = bossStealth ? 90 : 150;
      if (bossStealth) showFloatingText('👁️ SHADOW PHASE!', bossX, bossY - 90, '#888888');
      else showFloatingText('⚠️ VISIBLE!', bossX, bossY - 90, '#ff4444');
    }
    // Siege: shield regenerates slowly
    if (bossShieldHp > 0 && bossShieldHp < bossMaxShieldHp && F % 120 === 0) {
      bossShieldHp = Math.min(bossShieldHp + Math.floor(bossMaxShieldHp * 0.015), bossMaxShieldHp);
    }
    // Storm still active but stronger
    if (F % 70 === 0) {
      const sc = 2 + Math.floor(bossRank / 2);
      for (let i = 0; i < sc; i++) {
        const ang3 = (i / sc) * Math.PI * 2 + F * 0.02;
        alienBullets.push({ x: bossX, y: bossY, vx: Math.cos(ang3) * 3.5, vy: Math.sin(ang3) * 3 + 1.5, dmg: 1, size: 7, isElec: true, isBoss: true });
      }
    }
  }

  // ── PHASE 3: Plague + Cryo + Necro (ENRAGE) ───────────
  if (bossCurrentPhase === 3) {
    // Plague: drain HP every 5s
    bossPlagueTimer++;
    if (bossPlagueTimer >= 300) {
      bossPlagueTimer = 0;
      if (shieldTime <= 0) { hp--; flash = .3; shk = 8; updateHP(); showFloatingText('☠️ PLAGUE! -1HP', EX(), EY() - 60, '#44ff44'); }
      for (let pi = 0; pi < 8; pi++) pushParticle({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * 2, vy: Math.random() * 2, life: 50, maxLife: 55, color: '#44ff44', size: 3 + Math.random() * 2, funny: false, rotation: 0, rotSpeed: 0 });
      if (hp <= 0) gameOver();
    }
    // Cryo: slow fire every 4s
    if (F % 240 === 0) {
      bossCryoActive = true; bossCryoTimer = 120;
      showFloatingText('❄️ CRYO LOCK!', bossX, bossY - 80, '#00ccff');
      alienBullets.push({ x: bossX, y: bossY, vx: 0, vy: 4, dmg: 0, size: 14, isBoss: true, isCryo: true });
    }
    if (bossCryoActive) { bossCryoTimer--; if (bossCryoTimer <= 0) bossCryoActive = false; }
    // Necro: revive undead every 6s
    necroReviveTimer++;
    if (necroReviveTimer >= 360) {
      necroReviveTimer = 0;
      const count = 1 + Math.floor(bossRank / 4);
      for (let ri = 0; ri < count; ri++) {
        const a = spawnAlien(wave);
        var nd = {}; for (var nk in a.def) nd[nk] = a.def[nk]; nd.col = '#44ff88'; nd.col2 = '#006633'; a.def = nd;
        a.hp = Math.ceil(a.maxHp * 0.4); a.maxHp = a.hp;
        a.showName = 40;
        aliens.push(a);
      }
      showFloatingText('💀 RISE UNDEAD! +' + count, bossX, bossY - 80, '#44ff88');
    }
    // Storm at max intensity
    if (F % 50 === 0) {
      const sc = 3 + Math.floor(bossRank / 2);
      for (let i = 0; i < sc; i++) {
        const ang3 = (i / sc) * Math.PI * 2 + F * 0.03;
        alienBullets.push({ x: bossX, y: bossY, vx: Math.cos(ang3) * 4, vy: Math.sin(ang3) * 3.5 + 1.5, dmg: 1, size: 8, isElec: true, isBoss: true });
      }
    }
  }

  // ── MAIN FIRE PATTERN (all phases, rate increases per phase) ──
  const fireRateBase = Math.max(18, 60 - bossRank * 4);
  const fireRate = Math.floor(fireRateBase / bossCurrentPhase);
  if (F % Math.max(8, fireRate) === 0) {
    const shots = 2 + Math.floor(bossRank / 3) + (bossCurrentPhase - 1);
    for (let i = 0; i < shots; i++) {
      const spreadAng = (i - (shots - 1) / 2) * 0.25;
      alienBullets.push({
        x: bossX, y: bossY + 50,
        vx: Math.sin(spreadAng) * (2 + bossRank * .3),
        vy: 3 + bossRank * .35,
        dmg: 1, size: 6 + bossRank, isBoss: true
      });
    }
    // Aimed shot at planet
    const ang2 = Math.atan2(EY() - bossY, EX() - bossX);
    alienBullets.push({ x: bossX, y: bossY, vx: Math.cos(ang2) * 5.5, vy: Math.sin(ang2) * 5.5, dmg: 1, size: 9, isBoss: true });
    // Rank 5+: spiral burst (phase 2+)
    if (bossRank >= 5 && bossCurrentPhase >= 2 && F % 100 === 0) {
      for (let i = 0; i < 8; i++) {
        const ang3 = i * Math.PI / 4 + F * 0.03;
        alienBullets.push({ x: bossX, y: bossY, vx: Math.cos(ang3) * 4, vy: Math.sin(ang3) * 4, dmg: 1, size: 7, isBoss: true });
      }
    }
    // Rank 10 phase 3: 16-way mega burst
    if (bossRank >= 10 && bossCurrentPhase === 3 && F % 180 === 0) {
      for (let i = 0; i < 16; i++) {
        const ang3 = i * Math.PI / 8;
        alienBullets.push({ x: bossX, y: bossY, vx: Math.cos(ang3) * 4.5, vy: Math.sin(ang3) * 4.5, dmg: 1, size: 10, isBoss: true });
      }
      showFloatingText('🔴 OMEGA BURST!', bossX, bossY - 80, '#ff0000');
    }
  }

  if (bossHP <= 0) { /* handled in main loop */ }
  if (typeof updateBossHP === 'function') updateBossHP();
}

function drawAlienShip(a) {
  const { x, y, r } = a;
  // ENSURES def is always set - fallback to default if null
  const def = a.def || { id: 'unknown', shape: 0, col: '#aa44ff', col2: '#6600cc', name: 'UNKNOWN', beh: 'normal' };
  const sh = def.shape !== undefined && def.shape !== null ? def.shape : 0;
  const col = def.col || '#aa44ff';
  const col2 = def.col2 || '#660088';
  const beh = def.beh || 'normal';

  const stealthAlpha = (beh === 'stealth' && a.stealthOn) ? 0.12 : 1.0;
  ctx.save();
  ctx.globalAlpha = stealthAlpha;
  ctx.translate(x, y); ctx.rotate(a.ang + Math.PI);
  // Reduce shadow complexity at high wave count for performance
  const useShadow = currentFPS > 40 || wave < 20;
  ctx.shadowBlur = useShadow ? (a.suicideMode ? 32 : 18) : 0;
  ctx.shadowColor = a.suicideMode ? '#ff0000' : col;

  const dc = a.suicideMode ? (F % 10 < 5 ? '#ff2200' : col) : col;
  const dc2 = a.suicideMode ? '#ff0000' : col2;
  const pulse = Math.sin(F * .1 + x * .01) * 0.3; // per-alien unique pulse

  // Helper: alien glowing eye — r,g,b separate so alpha can be clamped
  function alienEye(ex2, ey2, er2, r2, g2, b2, baseAlpha) {
    var a1 = Math.min(1, Math.max(0, baseAlpha));
    var a2 = Math.min(1, Math.max(0, baseAlpha * 0.45));
    ctx.fillStyle = 'rgba(0,0,0,0.9)'; ctx.beginPath(); ctx.arc(ex2, ey2, er2, 0, Math.PI * 2); ctx.fill();
    var eg2 = ctx.createRadialGradient(ex2, ey2, 0, ex2, ey2, er2);
    eg2.addColorStop(0, '#ffffff');
    eg2.addColorStop(0.25, 'rgba(' + r2 + ',' + g2 + ',' + b2 + ',' + a1 + ')');
    eg2.addColorStop(0.7, 'rgba(' + r2 + ',' + g2 + ',' + b2 + ',' + a2 + ')');
    eg2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = eg2; ctx.beginPath(); ctx.arc(ex2, ey2, er2, 0, Math.PI * 2); ctx.fill();
    // Slit pupil
    ctx.fillStyle = 'rgba(0,0,0,0.95)'; ctx.beginPath(); ctx.ellipse(ex2 + Math.sin(F * .04) * er2 * .3, ey2, er2 * .18, er2 * .6, Math.sin(F * .03) * .3, 0, Math.PI * 2); ctx.fill();
    // Reflection
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(ex2 - er2 * .28, ey2 - er2 * .28, er2 * .18, 0, Math.PI * 2); ctx.fill();
  }

  // Helper: organic tentacle
  function tentacle(startX, startY, endX, endY, thick, tcol) {
    const cp1x = startX + (endX - startX) * .3 + Math.sin(F * .07 + startX) * r * .4;
    const cp1y = startY + (endY - startY) * .3 + Math.cos(F * .07 + startY) * r * .4;
    const cp2x = startX + (endX - startX) * .7 + Math.sin(F * .06 + endY) * r * .3;
    const cp2y = startY + (endY - startY) * .7 + Math.cos(F * .06 + endX) * r * .3;
    ctx.beginPath(); ctx.moveTo(startX, startY); ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
    ctx.strokeStyle = tcol; ctx.lineWidth = thick; ctx.lineCap = 'round'; ctx.stroke();
    // End sucker
    ctx.fillStyle = tcol; ctx.beginPath(); ctx.arc(endX, endY, thick * .7, 0, Math.PI * 2); ctx.fill();
  }

  switch (sh) {

    case 0:// BRAIN STALKER — translucent brain with dangling nerve stalks
      // Translucent brain-like mass
      ctx.fillStyle = dc2;
      ctx.beginPath(); ctx.ellipse(0, -r * .05, r * .88, r * .62, 0, 0, Math.PI * 2); ctx.fill();
      // Brain folds
      for (let f = 0; f < 5; f++) {
        const fa = f * Math.PI / 4 - Math.PI / 4;
        ctx.strokeStyle = `rgba(${dc.includes('ff') ? '255,100,180' : '100,200,255'},0.35)`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(Math.cos(fa) * r * .28, Math.sin(fa) * r * .18, r * .28, fa - .8, fa + .8); ctx.stroke();
      }
      // Glowing membrane
      const bm = ctx.createRadialGradient(-r * .2, -r * .2, 0, 0, -r * .1, r * .8);
      bm.addColorStop(0, `rgba(255,200,255,0.25)`); bm.addColorStop(0.6, `rgba(${dc.includes('4400') ? '200,100,0' : '120,0,200'},0.15)`); bm.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = bm; ctx.beginPath(); ctx.ellipse(0, -r * .05, r * .88, r * .62, 0, 0, Math.PI * 2); ctx.fill();
      // Nerve stalks hanging below
      for (let n = 0; n < 5; n++) {
        const nx = (n - 2) * r * .28;
        tentacle(nx, r * .35, nx + Math.sin(F * .04 + n) * r * .25, r * (0.9 + n * .08), 2.5 - n * .3, `rgba(${dc.includes('ff') ? '255,100,150' : '100,255,200'},0.7)`);
      }
      // Central alien eye (large pulsing)
      alienEye(0, -r * .08, r * .32, 255, 50, 200, Math.min(1, 0.7 + pulse));
      break;

    case 1:// MANTIS RAIDER — insectoid mantis with scythe arms
      // Body thorax
      ctx.fillStyle = dc2;
      ctx.beginPath(); ctx.moveTo(0, r * .9); ctx.lineTo(r * .22, r * .1); ctx.lineTo(r * .12, -r * .6); ctx.lineTo(0, -r * .9); ctx.lineTo(-r * .12, -r * .6); ctx.lineTo(-r * .22, r * .1); ctx.closePath(); ctx.fill();
      // Carapace
      ctx.fillStyle = dc;
      ctx.beginPath(); ctx.moveTo(0, r * .5); ctx.lineTo(r * .18, 0); ctx.lineTo(r * .1, -r * .4); ctx.lineTo(0, -r * .6); ctx.lineTo(-r * .1, -r * .4); ctx.lineTo(-r * .18, 0); ctx.closePath(); ctx.fill();
      // Scythe arms (left)
      ctx.strokeStyle = dc; ctx.lineWidth = r * .15; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-r * .2, r * .1); ctx.quadraticCurveTo(-r * .9 + Math.sin(F * .06) * r * .1, r * .2, -r * .7, -r * .4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r * .2, r * .1); ctx.quadraticCurveTo(r * .9 + Math.sin(F * .06) * r * .1, r * .2, r * .7, -r * .4); ctx.stroke();
      // Scythe blades
      ctx.strokeStyle = `rgba(255,255,200,0.9)`; ctx.lineWidth = r * .06;
      ctx.beginPath(); ctx.arc(-r * .7, -r * .4, r * .25, -1, 0.5); ctx.stroke();
      ctx.beginPath(); ctx.arc(r * .7, -r * .4, r * .25, Math.PI - .5, Math.PI + 1); ctx.stroke();
      // Compound eyes (glowing)
      alienEye(-r * .18, -r * .55, r * .16, 0, 255, 100, Math.min(1, 0.8 + pulse));
      alienEye(r * .18, -r * .55, r * .16, 0, 255, 100, Math.min(1, 0.8 + pulse));
      // Engine glow
      ctx.fillStyle = `rgba(255,100,0,${Math.min(1, Math.max(0, 0.4 + Math.sin(F * .2) * 0.25))})`;
      ctx.beginPath(); ctx.arc(0, r * .85, r * .18, 0, Math.PI * 2); ctx.fill();
      break;

    case 2:// CRUSTACEAN DREADNOUGHT — armored crab-tank with heavy claws
      // Shell plates (overlapping)
      for (let p = 0; p < 4; p++) {
        const pr2 = r * (1 - p * .15);
        const pa = p * .2;
        ctx.fillStyle = p % 2 === 0 ? dc2 : dc;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) { const a2 = i * Math.PI / 3 - Math.PI / 6 + pa; if (i === 0) ctx.moveTo(Math.cos(a2) * pr2, Math.sin(a2) * pr2); else ctx.lineTo(Math.cos(a2) * pr2, Math.sin(a2) * pr2); }
        ctx.closePath(); ctx.fill();
      }
      // Claw appendages
      ctx.strokeStyle = dc; ctx.lineWidth = r * .18; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(r * .6, r * .2); ctx.quadraticCurveTo(r * 1.1, r * .4, r * .9 + Math.sin(F * .07) * r * .1, r * .9); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-r * .6, r * .2); ctx.quadraticCurveTo(-r * 1.1, r * .4, -r * .9 + Math.sin(F * .07) * r * .1, r * .9); ctx.stroke();
      // Claw tips
      ctx.strokeStyle = `rgba(255,220,100,0.9)`; ctx.lineWidth = r * .07;
      ctx.beginPath(); ctx.arc(r * .9, r * .9, r * .2, -1, 0.8); ctx.stroke();
      ctx.beginPath(); ctx.arc(-r * .9, r * .9, r * .2, Math.PI - .8, Math.PI + 1); ctx.stroke();
      // Core reactor
      const crg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * .3);
      crg.addColorStop(0, '#fff'); crg.addColorStop(0.4, dc); crg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = crg; ctx.beginPath(); ctx.arc(0, 0, r * .3, 0, Math.PI * 2); ctx.fill();
      // Eyes
      alienEye(-r * .22, -r * .1, r * .14, 255, 100, 0, Math.min(1, 0.8 + pulse));
      alienEye(r * .22, -r * .1, r * .14, 255, 100, 0, Math.min(1, 0.8 + pulse));
      break;

    case 3:// PHANTOM WRAITH — ghostly elongated skull ship
      // Ghostly outer aura
      const wa = ctx.createRadialGradient(0, 0, r * .1, 0, 0, r * 1.1);
      wa.addColorStop(0, `rgba(${dc.includes('ff00') ? '150,255,100' : '180,100,255'},0.25)`); wa.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = wa; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.1, r * .7, 0, 0, Math.PI * 2); ctx.fill();
      // Skull-shaped main body
      ctx.fillStyle = dc2;
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.bezierCurveTo(r * .7, -r * .6, r * .8, 0, r * .5, r * .5); ctx.bezierCurveTo(r * .3, r * .9, 0, r, 0, r);
      ctx.bezierCurveTo(0, r, -r * .3, r * .9, -r * .5, r * .5); ctx.bezierCurveTo(-r * .8, 0, -r * .7, -r * .6, 0, -r); ctx.closePath(); ctx.fill();
      // Inner darker
      ctx.fillStyle = dc;
      ctx.beginPath(); ctx.moveTo(0, -r * .7); ctx.bezierCurveTo(r * .45, -r * .4, r * .52, 0, r * .32, r * .3); ctx.bezierCurveTo(r * .2, r * .6, 0, r * .7, 0, r * .7);
      ctx.bezierCurveTo(0, r * .7, -r * .2, r * .6, -r * .32, r * .3); ctx.bezierCurveTo(-r * .52, 0, -r * .45, -r * .4, 0, -r * .7); ctx.closePath(); ctx.fill();
      // Socket eyes — large hollow
      alienEye(-r * .3, -r * .28, r * .22, 255, 50, 255, Math.min(1, 0.8 + pulse));
      alienEye(r * .3, -r * .28, r * .22, 255, 50, 255, Math.min(1, 0.8 + pulse));
      // Jaw gap
      ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.beginPath(); ctx.ellipse(0, r * .55, r * .4, r * .18, 0, 0, Math.PI * 2); ctx.fill();
      // Jaw teeth
      for (let t = 0; t < 5; t++) {
        ctx.fillStyle = dc2; ctx.beginPath();
        ctx.moveTo(-r * .32 + t * r * .16, r * .45); ctx.lineTo(-r * .24 + t * r * .16, r * .72); ctx.lineTo(-r * .16 + t * r * .16, r * .45); ctx.closePath(); ctx.fill();
      }
      // Ectoplasm trailing (ghost tail)
      for (let g = 1; g <= 3; g++) {
        ctx.fillStyle = `rgba(${dc.includes('44ff') ? '50,100,255' : '180,50,255'},${0.12 - g * 0.03})`;
        ctx.beginPath(); ctx.ellipse(0, r * .8 + g * r * .22, r * (0.45 - g * .08), r * .15, 0, 0, Math.PI * 2); ctx.fill();
      }
      break;

    case 4:// VOID EYE — giant organic eye on energy ring
      // Spinning energy ring
      ctx.strokeStyle = dc; ctx.lineWidth = r * .16; ctx.shadowBlur = 12; ctx.shadowColor = dc;
      ctx.beginPath(); ctx.arc(0, 0, r * .72, F * .04, F * .04 + Math.PI * 1.55); ctx.stroke();
      ctx.strokeStyle = dc2; ctx.lineWidth = r * .1;
      ctx.beginPath(); ctx.arc(0, 0, r * .72, F * .04 + Math.PI * 1.65, F * .04 + Math.PI * 1.9); ctx.stroke();
      ctx.shadowBlur = 0;
      // Tendrils connecting ring to eye
      for (let t = 0; t < 4; t++) {
        const ta = t * Math.PI / 2 + F * .04;
        ctx.strokeStyle = `rgba(${dc.includes('00ff') ? '0,200,150' : '150,0,200'},0.5)`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(Math.cos(ta) * r * .72, Math.sin(ta) * r * .72); ctx.lineTo(Math.cos(ta) * r * .28, Math.sin(ta) * r * .28); ctx.stroke();
      }
      // Giant central eye — the whole body IS an eye
      // Sclera (white/colored)
      ctx.fillStyle = dc2; ctx.beginPath(); ctx.arc(0, 0, r * .45, 0, Math.PI * 2); ctx.fill();
      // Iris
      const irisG = ctx.createRadialGradient(0, 0, 0, 0, 0, r * .38);
      irisG.addColorStop(0, dc2); irisG.addColorStop(0.4, dc); irisG.addColorStop(1, dc2);
      ctx.fillStyle = irisG; ctx.beginPath(); ctx.arc(0, 0, r * .38, 0, Math.PI * 2); ctx.fill();
      // Iris detail (streaks)
      for (let i = 0; i < 12; i++) {
        const ia = i * Math.PI / 6;
        ctx.strokeStyle = `rgba(255,255,255,0.18)`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(Math.cos(ia) * r * .12, Math.sin(ia) * r * .12); ctx.lineTo(Math.cos(ia) * r * .36, Math.sin(ia) * r * .36); ctx.stroke();
      }
      // Pupil (slit, rotates)
      ctx.save(); ctx.rotate(F * .02);
      ctx.fillStyle = 'rgba(0,0,0,0.95)'; ctx.beginPath(); ctx.ellipse(0, 0, r * .12, r * .28, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // Eye glint
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(-r * .1, -r * .1, r * .07, 0, Math.PI * 2); ctx.fill();
      // Bloodshot veins
      for (let v = 0; v < 6; v++) {
        const va = v * Math.PI / 3 + pulse * .5;
        ctx.strokeStyle = `rgba(255,50,50,0.3)`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(Math.cos(va) * r * .2, Math.sin(va) * r * .2);
        ctx.quadraticCurveTo(Math.cos(va + .4) * r * .32, Math.sin(va + .4) * r * .32, Math.cos(va + .2) * r * .38, Math.sin(va + .2) * r * .38); ctx.stroke();
      }
      break;

    case 5:// HYDRA BEAST — multi-headed organic creature
      // Organic body core
      const hbg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * .6);
      hbg.addColorStop(0, dc); hbg.addColorStop(0.6, dc2); hbg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = hbg; ctx.beginPath(); ctx.arc(0, 0, r * .6, 0, Math.PI * 2); ctx.fill();
      // Texture bumps
      for (let b = 0; b < 6; b++) {
        const ba = b * Math.PI / 3;
        ctx.fillStyle = dc2; ctx.beginPath(); ctx.arc(Math.cos(ba) * r * .35, Math.sin(ba) * r * .35, r * .18, 0, Math.PI * 2); ctx.fill();
      }
      // 3 necks/heads
      for (let h = 0; h < 3; h++) {
        const ha = h * Math.PI * 2 / 3 - Math.PI / 2 + Math.sin(F * .05 + h) * 0.3;
        const hx = Math.cos(ha) * r * .75, hy = Math.sin(ha) * r * .75;
        // Neck
        ctx.strokeStyle = dc2; ctx.lineWidth = r * .22; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(Math.cos(ha) * r * .4, Math.sin(ha) * r * .4); ctx.lineTo(hx, hy); ctx.stroke();
        // Head
        ctx.fillStyle = dc; ctx.beginPath(); ctx.arc(hx, hy, r * .22, 0, Math.PI * 2); ctx.fill();
        // Head eye
        alienEye(hx, hy, r * .11, 255, 200, 0, Math.min(1, 0.8 + pulse));
        // Fang
        const fang_a = ha + Math.PI;
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath(); ctx.moveTo(hx + Math.cos(fang_a) * r * .1, hy + Math.sin(fang_a) * r * .1);
        ctx.lineTo(hx + Math.cos(fang_a + .35) * r * .2, hy + Math.sin(fang_a + .35) * r * .2);
        ctx.lineTo(hx + Math.cos(fang_a - .35) * r * .2, hy + Math.sin(fang_a - .35) * r * .2);
        ctx.closePath(); ctx.fill();
      }
      break;

    case 6:// SPIDER MECH — mechanical spider with 6 legs and laser eyes
      // Legs (animated)
      for (let l = 0; l < 6; l++) {
        const la = l * Math.PI / 3;
        const legAnim = Math.sin(F * .08 + l * 1.2) * 0.3;
        const lx1 = Math.cos(la) * r * .4, ly1 = Math.sin(la) * r * .4;
        const lx2 = Math.cos(la + legAnim) * r, ly2 = Math.sin(la + legAnim) * r;
        const lx3 = Math.cos(la + legAnim + .5) * r * 1.3, ly3 = Math.sin(la + legAnim + .5) * r * 1.2;
        ctx.strokeStyle = dc2; ctx.lineWidth = r * .1; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(lx1, ly1); ctx.lineTo(lx2, ly2); ctx.stroke();
        ctx.strokeStyle = dc; ctx.lineWidth = r * .07;
        ctx.beginPath(); ctx.moveTo(lx2, ly2); ctx.lineTo(lx3, ly3); ctx.stroke();
        // Leg claw
        ctx.fillStyle = dc; ctx.beginPath(); ctx.arc(lx3, ly3, r * .06, 0, Math.PI * 2); ctx.fill();
      }
      // Body
      ctx.fillStyle = dc2; ctx.beginPath(); ctx.arc(0, 0, r * .42, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = dc; ctx.beginPath(); ctx.arc(0, 0, r * .28, 0, Math.PI * 2); ctx.fill();
      // Armor plates
      for (let p = 0; p < 4; p++) {
        const pa = p * Math.PI / 2;
        ctx.fillStyle = dc2;
        ctx.beginPath(); ctx.ellipse(Math.cos(pa) * r * .22, Math.sin(pa) * r * .22, r * .16, r * .1, pa, 0, Math.PI * 2); ctx.fill();
      }
      // Twin laser eyes
      alienEye(-r * .14, -r * .08, r * .13, 255, 0, 50, Math.min(1, 0.9 + pulse));
      alienEye(r * .14, -r * .08, r * .13, 255, 0, 50, Math.min(1, 0.9 + pulse));
      // Laser beams from eyes when close to player (when active)
      if (a.suicideMode) {
        ctx.strokeStyle = `rgba(255,0,0,0.7)`; ctx.lineWidth = 2; ctx.shadowBlur = 8; ctx.shadowColor = '#ff0000';
        ctx.beginPath(); ctx.moveTo(-r * .14, -r * .08); ctx.lineTo(-r * .14, -r * 2.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(r * .14, -r * .08); ctx.lineTo(r * .14, -r * 2.5); ctx.stroke();
        ctx.shadowBlur = 0;
      }
      break;

    case 7:// LEVIATHAN — massive serpentine creature with frill
      // Body segments (serpent)
      for (let s = 4; s >= 0; s--) {
        const soff = s * r * .2;
        const sw = Math.sin(F * .06 + s * .8) * r * .3;
        ctx.fillStyle = s === 0 ? dc : dc2;
        ctx.beginPath(); ctx.ellipse(sw, soff, r * (0.7 - s * .08), r * (0.32 - s * .03), 0, 0, Math.PI * 2); ctx.fill();
        // Scale pattern
        if (s < 3) {
          ctx.strokeStyle = `rgba(0,0,0,0.25)`; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(sw, soff, r * (0.6 - s * .08), -0.5, 0.5); ctx.stroke();
        }
      }
      // Dorsal frill spines
      for (let f = 0; f < 5; f++) {
        const fx = (f - 2) * r * .22;
        const fh = r * (0.5 - Math.abs(f - 2) * .1);
        ctx.strokeStyle = dc; ctx.lineWidth = r * .06;
        ctx.beginPath(); ctx.moveTo(fx, -r * .28); ctx.quadraticCurveTo(fx + Math.sin(F * .04 + f) * r * .12, -r * .28 - fh, fx + Math.sin(F * .04 + f) * r * .18, -r * .28 - fh * 1.2); ctx.stroke();
        // Frill membrane
        ctx.fillStyle = `rgba(${dc.includes('ff') ? '255,100,0' : '0,200,255'},0.2)`;
        if (f < 4) { ctx.beginPath(); ctx.moveTo(fx, -r * .28); ctx.lineTo(fx + .22 * r, -r * .28); ctx.lineTo(fx + .3 * r, -r * .28 - fh * .8); ctx.closePath(); ctx.fill(); }
      }
      // Main head eye
      alienEye(Math.sin(F * .06) * r * .3, 0, r * .3, 255, 150, 0, Math.min(1, 0.8 + pulse));
      // Jaw
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.beginPath(); ctx.ellipse(Math.sin(F * .06) * r * .3, r * .24, r * .28, r * .14, 0, 0, Math.PI * 2); ctx.fill();
      // Fangs
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      [-r * .18, r * .18].forEach(fx => { ctx.beginPath(); ctx.moveTo(fx, r * .2); ctx.lineTo(fx + r * .06, r * .42); ctx.lineTo(fx - r * .06, r * .42); ctx.closePath(); ctx.fill(); });
      break;

    case 8:// HIVE QUEEN — massive bio-mechanical hive with spawning pods
      // Outer bio-shell
      ctx.fillStyle = dc2;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a2 = i * Math.PI / 4;
        const rr = r * (0.82 + Math.sin(F * .04 + i * .9) * .1);
        if (i === 0) ctx.moveTo(Math.cos(a2) * rr, Math.sin(a2) * rr);
        else ctx.lineTo(Math.cos(a2) * rr, Math.sin(a2) * rr);
      }
      ctx.closePath(); ctx.fill();
      // Bio-organic texture veins
      for (let v = 0; v < 5; v++) {
        const va = v * Math.PI * 2 / 5;
        ctx.strokeStyle = `rgba(${dc.includes('00ff') ? '0,220,100' : '220,100,0'},0.25)`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(Math.cos(va + .5) * r * .5, Math.sin(va + .5) * r * .5, Math.cos(va) * r * .85, Math.sin(va) * r * .85); ctx.stroke();
      }
      // Spawning pods on edges
      for (let p = 0; p < 6; p++) {
        const pa = p * Math.PI / 3;
        const px = Math.cos(pa) * r * .7, py = Math.sin(pa) * r * .7;
        var podPulse = Math.min(1, 0.5 + Math.sin(F * 0.08 + p) * 0.5);
        ctx.fillStyle = `rgba(${dc.includes('44') ? '0,180,80' : '180,50,0'},${podPulse * 0.6})`;
        ctx.beginPath(); ctx.arc(px, py, r * .15, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = dc; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(px, py, r * .15, 0, Math.PI * 2); ctx.stroke();
      }
      // Central massive eye
      alienEye(0, 0, r * .34, 0, 255, 150, Math.min(1, 0.85 + pulse));
      // Antenna stalks
      for (let an = 0; an < 3; an++) {
        const anx = (an - 1) * r * .35;
        ctx.strokeStyle = dc; ctx.lineWidth = r * .06;
        ctx.beginPath(); ctx.moveTo(anx, -r * .75); ctx.quadraticCurveTo(anx + Math.sin(F * .05 + an) * r * .2, -r * 1.1, anx + Math.sin(F * .05 + an) * r * .25, -r * 1.25); ctx.stroke();
        ctx.fillStyle = `rgba(255,200,0,${Math.min(1, Math.max(0, 0.6 + Math.sin(F * .1 + an) * 0.4))})`;
        ctx.beginPath(); ctx.arc(anx + Math.sin(F * .05 + an) * r * .25, -r * 1.25, r * .08, 0, Math.PI * 2); ctx.fill();
      }
      break;

    case 9:// WRAITH SPECTER — ultra-thin crescent phase ship
      // Phase aura
      const pa2 = ctx.createRadialGradient(0, 0, r * .1, 0, 0, r * 1.2);
      pa2.addColorStop(0, `rgba(${dc.includes('ff') ? '200,100,255' : '100,200,255'},0.12)`); pa2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = pa2; ctx.beginPath(); ctx.arc(0, 0, r * 1.2, 0, Math.PI * 2); ctx.fill();
      // Crescent body
      ctx.fillStyle = dc; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,10,0.92)'; ctx.beginPath(); ctx.arc(r * .38, 0, r * .76, 0, Math.PI * 2); ctx.fill();
      // Inner crescent glow
      const cg2 = ctx.createRadialGradient(0, 0, r * .15, 0, 0, r * .38);
      cg2.addColorStop(0, dc); cg2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cg2; ctx.beginPath(); ctx.arc(0, 0, r * .38, 0, Math.PI * 2); ctx.fill();
      // Phase energy arcs
      for (let l = 0; l < 3; l++) {
        const la = l * .25 + pulse * .4;
        ctx.strokeStyle = `rgba(255,255,255,${Math.min(1, Math.max(0, 0.35 + pulse * 0.2))})`; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(0, 0, r * (0.45 + l * .14), -Math.PI * .55 + la, Math.PI * .55 - la); ctx.stroke();
      }
      // Eye — single glowing orb in center of crescent
      alienEye(-r * .28, 0, r * .18, 255, 255, 255, Math.min(1, 0.9 + pulse));
      // Phase streaks (speed lines)
      for (let s = 0; s < 4; s++) {
        const sa = -Math.PI * .4 + s * Math.PI * .25;
        ctx.strokeStyle = `rgba(${dc.includes('ff') ? '200,150,255' : '100,200,255'},0.3)`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(Math.cos(sa) * r * .5, Math.sin(sa) * r * .5); ctx.lineTo(Math.cos(sa) * r * 1.2, Math.sin(sa) * r * 1.2); ctx.stroke();
      }
      break;
    
    case 10:// ZOMBIE ALIEN — brain-like creature with dripping ooze and flickering eye
      // Translucent brain mass with pulsing veins
      const zombieGlow = 0.6 + Math.sin(F * 0.08) * 0.4;
      ctx.fillStyle = `rgba(68,255,68,${Math.min(1, zombieGlow * 0.3)})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.9, r * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Brain folds/wrinkles
      ctx.strokeStyle = `rgba(0,150,50,0.5)`;
      ctx.lineWidth = 2;
      for (let f = 0; f < 6; f++) {
        const fa = f * Math.PI / 3;
        ctx.beginPath();
        ctx.arc(Math.cos(fa) * r * 0.3, Math.sin(fa) * r * 0.2, r * 0.25, fa - 0.6, fa + 0.6);
        ctx.stroke();
      }
      
      // Dripping ooze
      for (let d = 0; d < 4; d++) {
        const dx = (d - 1.5) * r * 0.4;
        const dripLen = r * (0.3 + Math.sin(F * 0.05 + d) * 0.15);
        ctx.strokeStyle = `rgba(68,255,68,0.6)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(dx, r * 0.5);
        ctx.lineTo(dx, r * 0.5 + dripLen);
        ctx.stroke();
        // Drip blob
        ctx.fillStyle = `rgba(68,255,68,0.7)`;
        ctx.beginPath();
        ctx.arc(dx, r * 0.5 + dripLen, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Flickering zombie eye (single large eye)
      const eyeFlicker = F % 60 < 55 ? 1 : 0.2;
      alienEye(0, -r * 0.1, r * 0.35, 255, 50, 50, Math.min(1, eyeFlicker * (0.8 + pulse)));
      
      // Infection aura
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#44ff44';
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      break;
    
    case 11:// SUICIDE BOMBER 2.0 — upgraded with bomb attachments and fuse sparks
      // Main body (darker, more menacing)
      ctx.fillStyle = dc2;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.8, r, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Bomb attachments (4 bombs around body)
      for (let b = 0; b < 4; b++) {
        const ba = b * Math.PI / 2;
        const bx = Math.cos(ba) * r * 0.7;
        const by = Math.sin(ba) * r * 0.7;
        
        // Bomb casing
        ctx.fillStyle = '#333333';
        ctx.beginPath();
        ctx.arc(bx, by, r * 0.25, 0, Math.PI * 2);
        ctx.fill();
        
        // Bomb stripe
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(bx - r * 0.25, by - r * 0.05, r * 0.5, r * 0.1);
      }
      
      // Central core (pulsing red)
      const bombPulse = 0.5 + Math.sin(F * 0.15) * 0.5;
      ctx.fillStyle = dc;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ff0000';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Fuse sparks (animated)
      if (a.suicideMode || F % 10 < 5) {
        for (let s = 0; s < 3; s++) {
          const sa = Math.random() * Math.PI * 2;
          const sr = r * (0.5 + Math.random() * 0.4);
          ctx.fillStyle = F % 2 === 0 ? '#ffff00' : '#ff8800';
          ctx.beginPath();
          ctx.arc(Math.cos(sa) * sr, Math.sin(sa) * sr, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      // Warning symbol when in suicide mode
      if (a.suicideMode) {
        ctx.fillStyle = '#ff0000';
        ctx.font = `bold ${r * 0.6}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', 0, 0);
      }
      break;

    default:// FALLBACK GENERIC SHIP — ensures any unmapped shape still renders
      // Generic diamond/shield shape
      ctx.fillStyle = dc2;
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.8, 0); ctx.lineTo(0, r); ctx.lineTo(-r * 0.8, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = dc;
      ctx.beginPath(); ctx.moveTo(0, -r * 0.6); ctx.lineTo(r * 0.5, 0); ctx.lineTo(0, r * 0.6); ctx.lineTo(-r * 0.5, 0); ctx.closePath(); ctx.fill();
      // Generic eye
      alienEye(0, -r * 0.3, r * 0.2, 255, 150, 150, Math.min(1, 0.8 + pulse));
      // Generic engine glow
      ctx.fillStyle = `rgba(255,150,50,${Math.min(1, Math.max(0, 0.5 + Math.sin(F * 0.15) * 0.3))})`;
      ctx.beginPath(); ctx.arc(0, r * 0.8, r * 0.15, 0, Math.PI * 2); ctx.fill();
      break;
  }

  // Behavior-specific overlays
  if (beh === 'shield_carrier' && a.shieldHp > 0) {
    ctx.globalAlpha = stealthAlpha * (0.5 + Math.sin(F * .1) * .2);
    ctx.strokeStyle = '#00ccff'; ctx.lineWidth = 3;
    ctx.shadowBlur = 14; ctx.shadowColor = '#00ccff';
    ctx.beginPath(); ctx.arc(0, 0, r * 1.3, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0; ctx.globalAlpha = stealthAlpha;
  }

  if (beh === 'healer') {
    // Green healing aura
    ctx.globalAlpha = stealthAlpha * 0.25;
    ctx.fillStyle = '#00ff88'; ctx.beginPath(); ctx.arc(0, 0, r * 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = stealthAlpha;
    // Cross symbol
    ctx.strokeStyle = 'rgba(0,255,100,0.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -r * .5); ctx.lineTo(0, r * .5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r * .5, 0); ctx.lineTo(r * .5, 0); ctx.stroke();
  }

  if (beh === 'electric') {
    // Crackling energy arcs
    if (F % 4 < 2) {
      ctx.strokeStyle = `rgba(100,150,255,0.8)`; ctx.lineWidth = 1.5;
      for (let e = 0; e < 3; e++) {
        const ea = Math.random() * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(Math.cos(ea) * r * .3, Math.sin(ea) * r * .3); ctx.lineTo(Math.cos(ea + .6) * r * .9, Math.sin(ea + .6) * r * .9); ctx.stroke();
      }
    }
  }

  ctx.restore();

  // ── HP BAR above alien (drawn in world space after restore) ──
  if (!a.dead && stealthAlpha > 0.1) {
    var hpPct = Math.max(0, a.hp / a.maxHp);
    var barW = Math.max(24, r * 2.2);
    var barH = 4;
    var bx = x - barW / 2;
    var by = y - r - 10;
    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
    // HP fill color: green → yellow → red
    var hpR2 = hpPct > 0.5 ? Math.round((1 - hpPct) * 2 * 255) : 255;
    var hpG2 = hpPct > 0.5 ? 255 : Math.round(hpPct * 2 * 255);
    ctx.fillStyle = 'rgb(' + hpR2 + ',' + hpG2 + ',30)';
    ctx.fillRect(bx, by, barW * hpPct, barH);
    // Border glow
    ctx.strokeStyle = hpPct > 0.6 ? 'rgba(0,255,80,0.5)' : hpPct > 0.25 ? 'rgba(255,180,0,0.5)' : 'rgba(255,50,0,0.6)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(bx - 1, by - 1, barW + 2, barH + 2);
  }
}
// ==================== BOSS VISUAL EFFECTS (called after drawBoss in boss.js) ====================
function drawBossEffects() {
  if (!bossActive) return;
  const rankColor = BOSS_RANK_COLORS[Math.min(bossRank - 1, 9)];
  const scale = 0.9 + bossRank * 0.12;
  const pulse = Math.sin(F * (0.08 + bossRank * .01));
  const pulse2 = Math.sin(F * 0.05);

  const bossAlpha = (bossType.id === 'shadow' && bossStealth) ? 0.15 : 1.0;
  ctx.save();
  ctx.globalAlpha = bossAlpha;
  ctx.translate(bossX, bossY);

  // ── Outer energy corona ──────────────────────────────────────
  var coronaSize = 80 * scale + pulse * 12;
  var cg = ctx.createRadialGradient(0, 0, 40 * scale, 0, 0, coronaSize + 20);
  cg.addColorStop(0, 'rgba(0,0,0,0)');
  cg.addColorStop(0.7, 'rgba(255,80,80,0.08)');
  cg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = cg;
  ctx.beginPath(); ctx.arc(0, 0, coronaSize + 20, 0, Math.PI * 2); ctx.fill();

  // ── Spinning orbit rings ─────────────────────────────────────
  for (var ring = 0; ring < Math.min(bossRank, 5); ring++) {
    var rR = 72 * scale + ring * 20;
    var ringAlpha = Math.min(1, Math.max(0, 0.3 + ring * 0.05 + pulse * .1));
    ctx.strokeStyle = rankColor; ctx.lineWidth = 1.5;
    ctx.globalAlpha = bossAlpha * ringAlpha;
    // Arc 1
    ctx.beginPath(); ctx.arc(0, 0, rR, F * (0.012 + ring * .005), F * (0.012 + ring * .005) + Math.PI * (1.3 + ring * .15)); ctx.stroke();
    // Arc 2 opposite
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath(); ctx.arc(0, 0, rR, -F * (0.01 + ring * .004), -F * (0.01 + ring * .004) + Math.PI * 0.7); ctx.stroke();
    // Orbit nodes on ring
    if (ring < 3) {
      for (var node = 0; node < 3 + ring; node++) {
        var na = node * (Math.PI * 2 / (3 + ring)) + F * (0.012 + ring * .005);
        var nx2 = Math.cos(na) * rR, ny2 = Math.sin(na) * rR;
        ctx.globalAlpha = bossAlpha * Math.min(1, Math.max(0, 0.6 + pulse * .3));
        ctx.fillStyle = rankColor;
        ctx.beginPath(); ctx.arc(nx2, ny2, 3 + ring * .5, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  ctx.globalAlpha = bossAlpha;

  // ── Main hull (octagon) with beveled plates ───────────────────
  ctx.shadowBlur = 60; ctx.shadowColor = rankColor;
  var hs = 58 * scale;

  // Outer hull plates (each segment different shade)
  for (var seg = 0; seg < 8; seg++) {
    var a1 = seg * Math.PI / 4 - Math.PI / 8;
    var a2 = (seg + 1) * Math.PI / 4 - Math.PI / 8;
    var shade = seg % 2 === 0 ? 0.55 : 0.35;
    ctx.fillStyle = 'rgba(' +
      Math.round(parseInt(rankColor.slice(1, 3) || 'ff', 16) * shade) + ',' +
      Math.round(parseInt(rankColor.slice(3, 5) || '33', 16) * shade) + ',' +
      Math.round(parseInt(rankColor.slice(5, 7) || '33', 16) * shade) + ',0.9)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a1) * hs, Math.sin(a1) * hs);
    ctx.lineTo(Math.cos(a2) * hs, Math.sin(a2) * hs);
    ctx.closePath(); ctx.fill();
  }

  // Hull outline
  ctx.strokeStyle = rankColor; ctx.lineWidth = 2;
  ctx.beginPath();
  for (var hv = 0; hv < 8; hv++) { var ha = hv * Math.PI / 4 - Math.PI / 8; if (hv === 0) ctx.moveTo(Math.cos(ha) * hs, Math.sin(ha) * hs); else ctx.lineTo(Math.cos(ha) * hs, Math.sin(ha) * hs); }
  ctx.closePath(); ctx.stroke();

  // Armor detail lines
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
  for (var av = 0; av < 8; av++) {
    var aa = av * Math.PI / 4 - Math.PI / 8;
    ctx.beginPath(); ctx.moveTo(Math.cos(aa) * hs * .45, Math.sin(aa) * hs * .45); ctx.lineTo(Math.cos(aa) * hs * .92, Math.sin(aa) * hs * .92); ctx.stroke();
  }

  // ── Inner body (ellipse core) ────────────────────────────────
  var innerG = ctx.createRadialGradient(0, 0, 0, 0, 0, 42 * scale);
  innerG.addColorStop(0, 'rgba(255,255,255,0.9)');
  innerG.addColorStop(0.3, rankColor);
  innerG.addColorStop(0.7, 'rgba(0,0,0,0.5)');
  innerG.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = innerG;
  ctx.beginPath(); ctx.ellipse(0, 0, 42 * scale, 30 * scale, F * 0.008, 0, Math.PI * 2); ctx.fill();

  // ── Pulsing core ─────────────────────────────────────────────
  ctx.shadowBlur = 40; ctx.shadowColor = '#ffffff';
  var coreR = Math.min(1, Math.max(0, 18 * scale * (1 + pulse * .3)));
  var coreG2 = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
  coreG2.addColorStop(0, 'rgba(255,255,255,1)');
  coreG2.addColorStop(0.4, rankColor);
  coreG2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = coreG2;
  ctx.beginPath(); ctx.arc(0, 0, coreR, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;

  // ── Side weapon turrets ──────────────────────────────────────
  var numCannons = Math.min(2 + Math.floor(bossRank / 2), 8);
  for (var ci = 0; ci < numCannons; ci++) {
    var ca = ci * Math.PI * 2 / numCannons + F * 0.008;
    var cx3 = Math.cos(ca) * 62 * scale;
    var cy3 = Math.sin(ca) * 62 * scale;
    ctx.save(); ctx.translate(cx3, cy3); ctx.rotate(ca);
    // Turret body
    ctx.fillStyle = 'rgba(20,20,20,0.95)';
    ctx.fillRect(-14 * scale, -7 * scale, 28 * scale, 14 * scale);
    // Turret outline
    ctx.strokeStyle = rankColor; ctx.lineWidth = 1;
    ctx.strokeRect(-14 * scale, -7 * scale, 28 * scale, 14 * scale);
    // Gun barrel
    ctx.fillStyle = '#222';
    ctx.fillRect(10 * scale, -3 * scale, 12 * scale, 6 * scale);
    // Glowing muzzle
    var muzzleAlpha = Math.min(1, Math.max(0, 0.5 + Math.sin(F * 0.15 + ci) * 0.5));
    ctx.fillStyle = rankColor; ctx.globalAlpha = bossAlpha * muzzleAlpha;
    ctx.shadowBlur = 10; ctx.shadowColor = rankColor;
    ctx.beginPath(); ctx.arc(22 * scale, 0, 4 * scale, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.globalAlpha = bossAlpha;
    ctx.restore();
  }

  // ── Rank badge ───────────────────────────────────────────────
  ctx.fillStyle = '#ffffff'; ctx.globalAlpha = bossAlpha * 0.95;
  ctx.font = 'bold ' + Math.floor(16 * scale) + 'px Orbitron,Arial';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowBlur = 8; ctx.shadowColor = rankColor;
  ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 3;
  ctx.strokeText('R' + bossRank, 0, 0);
  ctx.fillText('R' + bossRank, 0, 0);
  ctx.shadowBlur = 0; ctx.globalAlpha = bossAlpha;

  ctx.restore();

  // ── Boss HP bar ───────────────────────────────────────────────
  var bHPpct = Math.max(0, bossHP / bossMaxHP);
  var bBarW = 120 + bossRank * 8;
  var bBarX = bossX - bBarW / 2;
  var bBarY = bossY - 80 * scale - 24;
  // Shadow bg
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillRect(bBarX - 2, bBarY - 2, bBarW + 4, 12);
  // HP fill
  var bhR = bHPpct > 0.5 ? Math.round((1 - bHPpct) * 2 * 255) : 255;
  var bhG = bHPpct > 0.5 ? 255 : Math.round(bHPpct * 2 * 255);
  ctx.fillStyle = 'rgb(' + bhR + ',' + bhG + ',20)';
  ctx.fillRect(bBarX, bBarY, bBarW * bHPpct, 8);
  // Shine stripe
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(bBarX, bBarY, bBarW * bHPpct, 3);
  // Border
  ctx.strokeStyle = rankColor; ctx.lineWidth = 1;
  ctx.strokeRect(bBarX - 2, bBarY - 2, bBarW + 4, 12);
  // HP text
  ctx.font = 'bold 8px Orbitron,Arial';
  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center';
  ctx.fillText(Math.ceil(bossHP) + '/' + bossMaxHP, bossX, bBarY + 4);

  // ── All ability visuals ──────────────────────────────────────
  if (bossShieldHp > 0) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0,200,255,' + Math.min(1, Math.max(0, 0.5 + Math.sin(F * 0.06) * 0.3)) + ')';
    ctx.lineWidth = 5; ctx.shadowBlur = 18; ctx.shadowColor = '#00ccff';
    ctx.beginPath(); ctx.arc(bossX, bossY, (70 * scale) + 14, 0, Math.PI * 2); ctx.stroke();
    var shPct = bossShieldHp / bossMaxShieldHp;
    ctx.strokeStyle = 'rgba(0,220,255,0.8)'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(bossX, bossY, (70 * scale) + 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * shPct); ctx.stroke();
    ctx.shadowBlur = 0; ctx.restore();
  }

  // Storm: constant electric arcs
  if (F % 3 === 0) {
    ctx.save();
    for (let e = 0; e < 5; e++) {
      const eAng = F * 0.05 + e * Math.PI * 2 / 5;
      const eDist = 60 * scale + 10 + Math.random() * 28;
      ctx.strokeStyle = `rgba(255,255,0,${Math.min(1, Math.max(0, 0.3 + Math.random() * 0.6))})`;
      ctx.lineWidth = 1.5; ctx.shadowBlur = 8; ctx.shadowColor = '#ffff00';
      ctx.beginPath();
      ctx.moveTo(bossX + Math.cos(eAng) * 40 * scale, bossY + Math.sin(eAng) * 28 * scale);
      ctx.lineTo(bossX + Math.cos(eAng) * eDist, bossY + Math.sin(eAng) * eDist);
      ctx.stroke();
    }
    ctx.shadowBlur = 0; ctx.restore();
  }

  // Plague: green poison aura
  ctx.save();
  const pAlpha = 0.1 + Math.sin(F * .05) * .07;
  ctx.fillStyle = `rgba(50,255,80,${Math.min(1, Math.max(0, pAlpha))})`;
  ctx.beginPath(); ctx.arc(bossX, bossY, (90 * scale), 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Cryo: ice ring when active
  if (bossCryoActive) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0,200,255,0.8)'; ctx.lineWidth = 3; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.arc(bossX, bossY, (80 * scale) + 10, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(0,200,255,0.08)'; ctx.beginPath(); ctx.arc(bossX, bossY, (80 * scale) + 10, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Necro: skull particles floating around boss
  if (F % 30 === 0) {
    pushParticle({ x: bossX + (Math.random() - .5) * 80 * scale, y: bossY + 40 * scale, vx: (Math.random() - .5) * 1.5, vy: -1.5, life: 90, color: '#44ff88', size: 9, funny: false, rotation: 0, rotSpeed: 0, isText: true, text: '💀' });
  }

  // Boss name + ALL abilities label
  ctx.save();
  ctx.font = `bold 10px Orbitron,Arial`; ctx.fillStyle = rankColor;
  ctx.textAlign = 'center'; ctx.shadowBlur = 10; ctx.shadowColor = rankColor;
  ctx.fillText(BOSS_RANK_NAMES[Math.min(bossRank - 1, 9)], bossX, bossY - 70 * scale - 30);
  ctx.font = `bold 7px Orbitron,Arial`; ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.shadowBlur = 0;
  ctx.fillText('👁️SHADOW  ☠️PLAGUE  ❄️CRYO  💀NECRO  🛡️SIEGE  ⚡STORM', bossX, bossY - 70 * scale - 16);
  ctx.restore();
}

function col2hex(hex, alpha) {
  // Convert #rrggbb to rgba
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${Math.min(1, Math.max(0, alpha))})`;
}
