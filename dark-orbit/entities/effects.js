// ==================== effects.js ====================
// Advanced Kill Effects Pack — Dark Orbit Pro

// ===== GLOBAL ARRAYS =====
let shockwaves = [];
let bgFlash = 0;

// ===== SHOCKWAVE RING =====
function createShockwave(x, y, color) {
  shockwaves.push({
    x: x,
    y: y,
    radius: 10,
    maxRadius: 140,
    alpha: 1,
    color: color || '#00ffff'
  });
}

// ===== ENERGY SPARKS =====
function createEnergySparks(x, y, color) {
  for (let i = 0; i < 8; i++) {
    particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 7,
      vy: (Math.random() - 0.5) * 7,
      life: 30,
      size: 2 + Math.random() * 2,
      color: color || '#ffff00'
    });
  }
}

// ===== CRITICAL EFFECT =====
function tryCriticalEffect(x, y) {
  if (Math.random() < 0.15) {
    if (typeof showFloatingText === 'function') {
      showFloatingText('⚡ CRITICAL!', x, y - 20, '#ff0033');
    }
    if (typeof screenShake !== 'undefined') {
      screenShake = 14;
    }
  }
}

// ===== BACKGROUND FLASH =====
function triggerBgFlash() {
  bgFlash = 0.25;
}

// ===== DRAW EFFECTS (Call inside main draw loop) =====
function drawAdvancedEffects(ctx, W, H) {

  // Shockwaves
  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const s = shockwaves[i];
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0,255,255,${s.alpha})`;
    ctx.lineWidth = 3;
    ctx.stroke();

    s.radius += 5;
    s.alpha -= 0.035;

    if (s.alpha <= 0) shockwaves.splice(i, 1);
  }

  // Background Flash
  if (bgFlash > 0) {
    ctx.fillStyle = `rgba(255,0,0,${bgFlash})`;
    ctx.fillRect(0, 0, W, H);
    bgFlash *= 0.85;
  }
}
