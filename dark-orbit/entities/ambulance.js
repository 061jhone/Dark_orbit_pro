// ==================== ambulance.js ====================
// Ambulance spaceship system: collects corpses and awards coins

let ambulances = [];
let ambulanceSpawnTimer = 0;
const AMBULANCE_SPAWN_INTERVAL = 2700; // 45 seconds at 60fps

// Update ambulance spawn timer and spawn when needed
function updateAmbulanceSystem() {
  ambulanceSpawnTimer++;
  
  // Spawn conditions: every 45s OR when 8+ corpses on screen
  const shouldSpawn = ambulanceSpawnTimer >= AMBULANCE_SPAWN_INTERVAL || 
                      (typeof corpses !== 'undefined' && corpses.length >= 8);
  
  if (shouldSpawn && ambulances.length === 0) {
    spawnAmbulance();
    ambulanceSpawnTimer = 0;
  }
  
  // Update existing ambulances
  for (let i = ambulances.length - 1; i >= 0; i--) {
    updateAmbulance(ambulances[i]);
    
    // Remove if off-screen or done
    if (ambulances[i].y > H + 100 || ambulances[i].collected >= ambulances[i].maxCollect) {
      if (ambulances[i].collected > 0) {
        showFloatingText('🚑 EVAC COMPLETE: +' + (ambulances[i].collected * 2) + '🪙', 
                        W / 2, H / 2, '#ffd700');
      }
      ambulances.splice(i, 1);
    }
  }
}

// Spawn a new ambulance
function spawnAmbulance() {
  // FIX: spawn on LEFT or RIGHT edge, NOT center — center passes over planet at W/2,H-105
  const side = Math.random() < 0.5 ? -1 : 1;
  const spawnX = W / 2 + side * (W * 0.3 + Math.random() * W * 0.1);
  const amb = {
    x: spawnX,
    y: -80,
    vx: 0,
    vy: 1.2,
    r: 35,
    active: true,
    collected: 0,
    maxCollect: 15, // Max corpses to collect before leaving
    vacuumRange: 180,
    phase: 0, // Animation phase
    sirenBlink: 0
  };
  
  ambulances.push(amb);
  
  // Show HUD indicator
  showFloatingText('🚑 MEDICAL EVAC IN PROGRESS', W / 2, 100, '#ff4444');
  playTone(600, 0.3, 'sine', 0.2);
}

// Update individual ambulance
function updateAmbulance(amb) {
  // Move down slowly
  amb.x += amb.vx;
  amb.y += amb.vy;
  amb.phase += 0.05;
  amb.sirenBlink++;
  
  // Hover behavior when corpses nearby
  if (typeof corpses !== 'undefined' && corpses.length > 0) {
    // Find nearest corpse
    let nearestDist = 999999;
    corpses.forEach(c => {
      const dist = Math.hypot(c.x - amb.x, c.y - amb.y);
      if (dist < nearestDist) nearestDist = dist;
    });
    
    // Slow down if corpses nearby
    if (nearestDist < amb.vacuumRange) {
      amb.vy = 0.3;
    } else {
      amb.vy = 1.2;
    }
  }
  
  // Leave screen after collecting enough or timeout
  if (amb.collected >= amb.maxCollect || amb.y > H * 0.8) {
    amb.vy = 2.5; // Speed up exit
  }
}

// Draw all ambulances
function drawAmbulances() {
  ambulances.forEach(amb => {
    drawAmbulance(amb);
  });
}

// Draw individual ambulance
function drawAmbulance(amb) {
  ctx.save();
  ctx.translate(amb.x, amb.y);
  
  // Main body (white/red medical ship)
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ff4444';
  ctx.lineWidth = 2;
  
  // Ship hull
  ctx.beginPath();
  ctx.moveTo(0, -amb.r);
  ctx.lineTo(amb.r * 0.7, amb.r * 0.5);
  ctx.lineTo(amb.r * 0.3, amb.r);
  ctx.lineTo(-amb.r * 0.3, amb.r);
  ctx.lineTo(-amb.r * 0.7, amb.r * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // Red cross symbol
  ctx.fillStyle = '#ff0000';
  const crossSize = amb.r * 0.4;
  ctx.fillRect(-crossSize * 0.3, -crossSize * 0.5, crossSize * 0.6, crossSize);
  ctx.fillRect(-crossSize * 0.5, -crossSize * 0.3, crossSize, crossSize * 0.6);
  
  // Blinking siren lights
  const sirenOn = amb.sirenBlink % 20 < 10;
  if (sirenOn) {
    ctx.fillStyle = '#ff0000';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff0000';
    ctx.beginPath();
    ctx.arc(-amb.r * 0.5, -amb.r * 0.6, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(amb.r * 0.5, -amb.r * 0.6, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  
  // Engine glow
  ctx.fillStyle = 'rgba(0,150,255,0.6)';
  ctx.beginPath();
  ctx.arc(-amb.r * 0.4, amb.r * 0.8, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(amb.r * 0.4, amb.r * 0.8, 8, 0, Math.PI * 2);
  ctx.fill();
  
  // Tractor beam (vacuum beam) when active
  if (typeof corpses !== 'undefined' && corpses.length > 0) {
    const nearbyCorpses = corpses.filter(c => 
      Math.hypot(c.x - amb.x, c.y - amb.y) < amb.vacuumRange
    );
    
    if (nearbyCorpses.length > 0) {
      // Draw beam to each nearby corpse
      nearbyCorpses.forEach(c => {
        const beamGrad = ctx.createLinearGradient(0, amb.r, c.x - amb.x, c.y - amb.y);
        beamGrad.addColorStop(0, 'rgba(0,255,200,0.4)');
        beamGrad.addColorStop(1, 'rgba(0,255,200,0.1)');
        
        ctx.strokeStyle = beamGrad;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, amb.r);
        ctx.lineTo(c.x - amb.x, c.y - amb.y);
        ctx.stroke();
        
        // Beam particles
        for (let i = 0; i < 3; i++) {
          const t = (amb.phase + i * 0.3) % 1;
          const bx = (c.x - amb.x) * t;
          const by = amb.r + (c.y - amb.y - amb.r) * t;
          ctx.fillStyle = 'rgba(0,255,200,0.6)';
          ctx.beginPath();
          ctx.arc(bx, by, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
  }
  
  // Collection counter
  if (amb.collected > 0) {
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 10px Orbitron, Arial';
    ctx.textAlign = 'center';
    ctx.fillText('+' + (amb.collected * 2) + '🪙', 0, -amb.r - 15);
  }
  
  ctx.restore();
}
