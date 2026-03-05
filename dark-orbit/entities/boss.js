// ==================== boss.js ====================
// Boss fight, mission queue, HP bars, scanner, images, victory screen
// Dependencies (globals from game): bossActive, bossX, bossY, bossHP, bossMaxHP,
//   bossRank, bossCurrentPhase, bossShieldHp, bossMaxShieldHp, bossType,
//   bossStealth, bossPlagueTimer, bossCryoActive, necroReviveTimer,
//   BOSS_RANK_COLORS, BOSS_RANK_LABELS, MISSION_DEFS, PLANET_PREVIEWS, NEXT_PLANET_NAMES,
//   ctx, W, H, F, wave, kills, running, paused, rockets, ammo, timeLeft,
//   totalCoins, currentMission, missionBossQueue, missionBossIndex,
//   nextBossTrigger, missionComplete, bossKills, bgLabelTimer,
//   bossDeathSlowmo, bossDeathShake, bossLowVoicePlayed,
//   CONFIG, SAVE, earnCoins, pushParticle, showFloatingText, updateScoreboard,
//   updateWeaponDisplay, checkAchievements, playBossMusic, playBossWarningVoice,
//   playBossDeadVoice, playExplosion, stopBossMusic

const bossImages = {
  loaded: false,
  list: {}
};

function loadBossImages() {
  const bossNames = ['boss1', 'boss2', 'boss3', 'boss4', 'boss5', 'boss6', 'boss7', 'boss8', 'boss9', 'boss10', 'mothership'];
  let loadedCount = 0;
  bossNames.forEach(name => {
    const img = new Image();
    img.src = `assets/images/${name}.png`;
    img.onload = () => {
      loadedCount++;
      if (loadedCount === bossNames.length) bossImages.loaded = true;
    };
    bossImages.list[name] = img;
  });
}
loadBossImages();

// ==================== BOSS DRAW ====================

function drawBoss() {
  if (!bossActive) return;

  const bgFolderName = (wave === 60) ? 'mothership' : `boss${Math.min(bossRank, 10)}`;
  const img = bossImages.list[bgFolderName];

  ctx.save();
  ctx.translate(bossX, bossY);

  if (bossImages.loaded && img) {
    const scale = (wave === 60) ? 1.8 : 1.0;
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
  } else {
    // Fallback procedural boss ship drawing since PNGs are missing
    const scale = (wave === 60) ? 1.8 : 1.0;
    ctx.scale(scale, scale);

    ctx.beginPath();
    ctx.fillStyle = bossStealth ? 'rgba(50,50,50,0.5)' : '#222';
    ctx.strokeStyle = BOSS_RANK_COLORS[Math.min(bossRank - 1, 9)] || '#ff0000';
    ctx.lineWidth = 4;

    // Core hexagon/diamond shape
    ctx.moveTo(0, -60);
    ctx.lineTo(50, -20);
    ctx.lineTo(80, 20);
    ctx.lineTo(50, 60);
    ctx.lineTo(-50, 60);
    ctx.lineTo(-80, 20);
    ctx.lineTo(-50, -20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Engine glow
    ctx.beginPath();
    let glowOuter = 60 + Math.sin(F * 0.2) * 10;
    ctx.arc(0, 0, glowOuter, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 50, 50, ${0.1 + Math.sin(F * 0.1) * 0.05})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, 25, 0, Math.PI * 2);
    ctx.fillStyle = bossCryoActive ? '#00ccff' : (bossPlagueTimer > 200 ? '#00ff00' : '#ff0000');
    ctx.fill();
  }
  ctx.restore();

  // Draw boss visual effects (shields, plague, cryo, storm, necro etc.)
  if (typeof drawBossEffects === 'function') drawBossEffects();
}

// ==================== BOSS WARNING ====================

function showBossWarning() {
  document.getElementById('boss-warning').classList.add('show');
  playBossMusic();
  playBossWarningVoice();
  setTimeout(() => {
    document.getElementById('boss-warning').classList.remove('show');
    startBossFight();
  }, 800);
}

// ==================== BOSS HP BAR ====================

function updateBossHP() {
  const container = document.getElementById('boss-hp-container');
  const fill = document.getElementById('boss-hp-fill');
  const text = document.getElementById('boss-hp-text');
  if (!container || !fill || !text) return;
  if (bossActive) {
    container.style.display = 'block';
    const safeMax = (bossMaxHP > 0) ? bossMaxHP : 1;
    const safeHP = Math.max(0, isFinite(bossHP) ? bossHP : 0);
    const pct = Math.min(100, Math.max(0, (safeHP / safeMax) * 100));
    fill.style.width = pct + '%';
    const phaseStr = bossCurrentPhase ? ' [P' + bossCurrentPhase + ']' : '';
    text.textContent = 'MOTHERSHIP HP: ' + Math.ceil(pct) + '%' + phaseStr;
    // Color by phase
    if (bossCurrentPhase === 3) fill.style.background = 'linear-gradient(90deg,#ff0066,#ff0000)';
    else if (bossCurrentPhase === 2) fill.style.background = 'linear-gradient(90deg,#ff6600,#ff0000)';
    else fill.style.background = 'linear-gradient(90deg,#ff8800,#ff0000)';
  } else {
    container.style.display = 'none';
  }
}

// ==================== BOSS SCANNER ====================

function updateBossScanner() {
  const box = document.getElementById('boss-scanner');
  if (!box) return;
  if (!bossActive || !running || paused) { box.classList.remove('show'); return; }
  box.classList.add('show');

  // Rank + name
  document.getElementById('bscn-rank').textContent = 'RANK ' + bossRank;
  document.getElementById('bscn-name').textContent = BOSS_RANK_LABELS[Math.min(bossRank - 1, 9)];

  // Hull HP bar
  const hpPct = Math.max(0, Math.min(100, (bossHP / bossMaxHP) * 100));
  const hpFill = document.getElementById('bscn-hp-fill');
  hpFill.style.width = hpPct + '%';
  hpFill.style.background = hpPct > 50 ? '#ff6600' : hpPct > 25 ? '#ff2200' : '#ff0000';
  document.getElementById('bscn-hp-nums').textContent = Math.ceil(bossHP) + ' / ' + bossMaxHP;

  // Shield bar
  const shWrap = document.getElementById('bscn-shield-wrap');
  if (bossShieldHp > 0 && bossMaxShieldHp > 0) {
    shWrap.style.display = 'block';
    const shPct = Math.max(0, Math.min(100, (bossShieldHp / bossMaxShieldHp) * 100));
    document.getElementById('bscn-sh-fill').style.width = shPct + '%';
    document.getElementById('bscn-sh-nums').textContent = Math.ceil(bossShieldHp) + ' / ' + bossMaxShieldHp;
  } else { shWrap.style.display = 'none'; }

  // Active abilities — live status
  const abilities = [
    { icon: '👁️', label: 'SHADOW', active: bossStealth },
    { icon: '☠️', label: 'PLAGUE', active: bossPlagueTimer > 200 },
    { icon: '❄️', label: 'CRYO', active: bossCryoActive },
    { icon: '💀', label: 'NECRO', active: necroReviveTimer > 250 },
    { icon: '🛡️', label: 'SIEGE', active: bossShieldHp > 0 },
    { icon: '⚡', label: 'STORM', active: F % 60 < 10 },
  ];
  const abEl = document.getElementById('bscn-abilities');
  abEl.innerHTML = abilities.map(a =>
    `<div class="bscn-ab${a.active ? ' active' : ''}">${a.icon}</div>`
  ).join('');

  // Box border flashes red when cryo active
  box.style.borderColor = bossCryoActive ? '#00ccff' : bossStealth ? '#888888' : '#ff2200';
  box.style.boxShadow = '0 0 16px ' + (bossCryoActive ? 'rgba(0,200,255,.4)' : bossStealth ? 'rgba(100,100,100,.3)' : 'rgba(255,0,0,.35)');
}

// ==================== BOSS END FIGHT ====================

function endBossFight() {
  bossDeathSlowmo = 30;
  bossDeathShake = 40;
  // Guard: cinematic helpers (in other files)
  if (typeof addCinematicExplosion === 'function') {
    addCinematicExplosion(bossX, bossY, '#ff0000');
    addCinematicExplosion(bossX, bossY, '#ffffff');
  }
  if (typeof addHorrorFlash === 'function') addHorrorFlash();

  showFloatingText('💀 BOSS DESTROYED!', W / 2, H * 0.35, '#ff0000');
  bossActive = false; stopBossMusic(); bossKills++;
  playBossDeadVoice();
  // Horror-victory voice — delayed so it follows existing dead voice
  setTimeout(function () { if (typeof _cveBossDead === 'function') _cveBossDead(); }, 1800);
  const rankBonus = bossRank * 50;
  const rankColor = BOSS_RANK_COLORS[Math.min(bossRank - 1, 9)];
  for (let i = 0; i < 50; i++) {
    pushParticle({ x: bossX, y: bossY, vx: (Math.random() - .5) * 12, vy: (Math.random() - .5) * 12, life: 90, maxLife: 90, color: rankColor, size: Math.random() * 12 + 5, funny: false, rotation: 0, rotSpeed: 0 });
  }
  earnCoins(rankBonus);
  rockets += 12 + bossRank;
  for (let i = 0; i < 4; i++) ammo[i] = CONFIG.MAX_AMMO[i];
  timeLeft = Math.min(timeLeft + 45, 120);
  playExplosion(8);
  showFloatingText('RANK ' + bossRank + ' DEFEATED! +' + rankBonus, W / 2, H / 2, rankColor);
  updateScoreboard(); updateWeaponDisplay(); checkAchievements();

  // Mission boss sequence: advance to next boss in queue
  advanceMissionBoss();
  const nextRank = getNextMissionBoss();
  if (nextRank !== null && nextRank !== undefined) {
    // More bosses remain in this mission
    setTimeout(() => {
      showFloatingText('NEXT MOTHERSHIP INCOMING!', W / 2, H * 0.38, '#ff4444');
      setTimeout(() => {
        bossRank = nextRank;
        showBossWarning();
      }, 2000);
    }, 2500);
  } else {
    // All mission bosses for this mission done — show victory screen
    setTimeout(() => {
      showMissionVictory();
    }, 1500);
  }
}

// ==================== MISSION QUEUE ====================

function startMissionBossQueue() {
  currentMission = SAVE.get('currentMission') || 1;
  const mDef = MISSION_DEFS[currentMission - 1];
  missionBossQueue = mDef ? mDef.bossSeq.slice() : [1];
  missionBossIndex = 0;
}

function getNextMissionBoss() {
  if (missionBossIndex < missionBossQueue.length) {
    return missionBossQueue[missionBossIndex];
  }
  return null;
}

function advanceMissionBoss() {
  missionBossIndex++;
  if (missionBossIndex >= missionBossQueue.length) {
    const nextMission = currentMission + 1;
    if (nextMission <= MISSION_DEFS.length) {
      currentMission = nextMission;
      SAVE.set('currentMission', currentMission);
      showFloatingText('MISSION ' + currentMission + ' UNLOCKED!', W / 2, H * 0.35, '#ffd700');
      bgLabelTimer = 220;
    } else {
      showFloatingText('ALL MISSIONS COMPLETE! LEGEND!', W / 2, H * 0.35, '#ffd700');
    }
  }
}

// ==================== MISSION LIST (UI) ====================

function buildMissionList() {
  const el = document.getElementById('mission-list');
  if (!el) return;
  currentMission = SAVE.get('currentMission') || 1;
  let html = '<div class="mis-intro">Each mission ends with a Mothership sequence. Complete to unlock the next. FINAL MISSION: ALL 10 Motherships one by one!</div>';
  MISSION_DEFS.forEach(m => {
    const unlocked = m.num <= currentMission;
    const completed = m.num < currentMission;
    const isCurrent = m.num === currentMission;
    const statusIcon = completed ? '✅' : (isCurrent ? '🔓' : '🔒');
    const bossRankNames = ['DESTROYER', 'ANNIHILATOR', 'DREADNOUGHT', 'OBLITERATOR', 'VOID BRINGER', 'DEATH STAR', 'DARK EMPEROR', 'SHADOW TITAN', 'ABYSS LORD', 'OMEGA PRIME'];
    const seqStr = m.bossSeq.map(r => bossRankNames[r - 1]).join(' → ');
    html += '<div class="mis-row' + (m.num > currentMission ? ' locked' : '') + (m.isFinal ? ' final' : '') + '">' +
      '<div class="mis-num" style="color:' + m.color + '">' + (completed ? '✅' : m.num) + '</div>' +
      '<div class="mis-info">' +
      '<div class="mis-name" style="color:' + m.color + '">' + m.name + '</div>' +
      '<div class="mis-desc">' + m.desc + '<br><span style="color:rgba(255,255,100,.6);font-size:7px">' + seqStr + '</span></div>' +
      '<div class="mis-reward">' + m.reward + '</div>' +
      '</div>' +
      '<div class="mis-status">' + statusIcon + '</div>' +
      '</div>';
  });
  el.innerHTML = html;
}

// ==================== MISSION VICTORY ====================

const PLANET_PREVIEWS = ['🌍', '🔴', '🪐', '🕳️', '🌌', '👽', '🌑'];
const NEXT_PLANET_NAMES = ['Earth', 'Mars', 'Saturn', 'Black Hole', 'Nebula', 'Alien World', 'Omega Void'];

function showMissionVictory() {
  // DO NOT set running=false — game keeps going!
  const missionNum = SAVE.get('currentMission') || 1;
  const nextMission = Math.min(missionNum + 1, 8);
  SAVE.set('currentMission', nextMission);
  currentMission = nextMission;

  // Bonus coins + ammo refill
  earnCoins(500);
  for (let i = 0; i < 4; i++) ammo[i] = CONFIG.MAX_AMMO[i];
  rockets += 10;
  timeLeft = Math.min(timeLeft + 60, 180);

  // Update victory stats display
  document.getElementById('v-kills').textContent = kills;
  document.getElementById('v-wave').textContent = wave;
  document.getElementById('v-coins').textContent = totalCoins;
  const nextBgIdx = Math.min(nextMission - 1, PLANET_PREVIEWS.length - 1);
  document.getElementById('victory-planet-preview').textContent = PLANET_PREVIEWS[Math.min(missionNum, PLANET_PREVIEWS.length - 1)];
  document.getElementById('victory-next-planet').textContent = '🌐 NEXT: ' + NEXT_PLANET_NAMES[nextBgIdx] + ' AWAITS...';
  document.getElementById('v-coins').textContent = totalCoins;

  // Show victory overlay briefly — auto-dismiss after 4s
  const vScreen = document.getElementById('mission-victory');
  vScreen.classList.add('show');
  playVictoryFanfare();
  spawnConfetti();

  // Mission complete voice — delayed 3500ms
  setTimeout(function () { if (typeof _cveMissionVictory === 'function') _cveMissionVictory(); }, 3500);

  // Reset boss queue for next mission
  startMissionBossQueue();
  nextBossTrigger = kills + 1000;
  missionComplete = false;

  // Auto-hide victory screen after 4 seconds
  setTimeout(() => {
    vScreen.classList.remove('show');
    showFloatingText('🚀 MISSION ' + nextMission + ' — FIGHT ON!', W / 2, H * 0.4, '#00ffb4');
    updateScoreboard();
  }, 4000);
}

function spawnConfetti() {
  const vScreen = document.getElementById('mission-victory');
  const colors = ['#ffd700', '#00ffb4', '#ff4444', '#ff8800', '#aa00ff', '#00ccff', '#ffffff'];
  for (let i = 0; i < 60; i++) {
    const el = document.createElement('div');
    el.className = 'victory-confetti';
    el.style.cssText = `
      left:${Math.random() * 100}%;
      top:-10px;
      width:${6 + Math.random() * 8}px;
      height:${6 + Math.random() * 8}px;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      animation-duration:${1.5 + Math.random() * 2}s;
      animation-delay:${Math.random() * 1.5}s;
    `;
    vScreen.appendChild(el);
    setTimeout(() => { try { el.remove(); } catch (e) { } }, 4000);
  }
}

function continueAfterVictory() {
  document.getElementById('mission-victory').classList.remove('show');
  showFloatingText('🚀 MISSION ' + currentMission + ' — FIGHT ON!', W / 2, H * 0.4, '#00ffb4');
}
