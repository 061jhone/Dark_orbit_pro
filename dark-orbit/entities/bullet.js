// ==================== bullet.js ====================
// Weapon firing system and bullet management

function fireWeapon(target) {
  const RATE = CONFIG.FIRE_RATE;
  const cryoMult = bossCryoActive ? 2.0 : 1.0;
  const si = getSpaceItemFireMult();
  if (F - lastFire < RATE[currentWeapon] * cryoMult * si.rate) return;
  if (ammo[currentWeapon] < 1) { checkAutoSwitch(); return; }
  ammo[currentWeapon]--;
  if (ammo[currentWeapon] <= 10) showLowAmmo();
  updateWeaponDisplay();

  const w = CONFIG.WEAPONS_DMG[currentWeapon];
  const ex = EX(), ey = EY() + ER() * .8;
  const tx = target ? target.x : aimX; // Added
  const ty = target ? target.y : aimY; // Added
  const ang = Math.atan2(ty - ey, tx - ex); // Modified from baseAng
  const extraSpread = si.spread || 0;
  const shots = si.multi || 1;
  for (let s = 0; s < shots; s++) {
    const multiAng = shots > 1 ? ang + (s - (shots - 1) / 2) * 0.18 : ang; // Changed baseAng to ang
    for (let i = 0; i < w.spread + extraSpread; i++) {
      const bulletAng = multiAng + (i - (w.spread + extraSpread - 1) / 2) * .15;
      const bDmg = Math.round(w.dmg * si.dmg);
      const isPierce = w.pierce || (si.force_pierce || false);
      bullets.push({ x: ex, y: ey, vx: Math.cos(bulletAng) * w.speed, vy: Math.sin(bulletAng) * w.speed, weapon: currentWeapon, weaponType: currentWeapon, dmg: bDmg, life: 120, pierce: isPierce, splash: w.splash, chain: w.chain, hits: [], ghost: si.ghost || false });
    }
  }
  // NOTE: orbit missiles auto-fire via updateOrbitMissiles() — do NOT fire rockets here on every shot

  // Space item glow on muzzle flash
  const flashColor = activeSpaceItem ? activeSpaceItem.color : w.color;
  createMuzzleFlash(ex, ey, flashColor);
  playTone(300 + currentWeapon * 150, .07, 'square', .08);
  // Rare firing quip (~3% per shot, fully gated by CVE cooldown)
  if (Math.random() < 0.03 && typeof cmdSpeak === 'function') cmdSpeak('firingQuip');
  lastFire = F;
}

function createMuzzleFlash(x, y, color) {
  const fx = document.createElement('div');
  fx.className = 'muzzle-flash';
  fx.style.left = x + 'px'; fx.style.top = y + 'px';
  fx.style.background = `radial-gradient(circle,${color},transparent)`;
  document.getElementById('fire-effects').appendChild(fx);
  setTimeout(() => fx.remove(), 100);
}

// startFiring / stopFiring / satRotation are defined in config.js (loads first)
