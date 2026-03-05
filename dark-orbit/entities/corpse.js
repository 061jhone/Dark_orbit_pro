// ==================== corpse.js ====================
// Corpse system: alien bodies drift in space after death

let corpses = [];
const MAX_CORPSES = 50;

// Spawn a corpse when an alien dies
function spawnCorpse(alien) {
  if (!alien || !alien.def) return;
  
  // Remove oldest corpse if at limit
  if (corpses.length >= MAX_CORPSES) {
    corpses.shift();
  }
  
  const corpse = {
    x: alien.x,
    y: alien.y,
    r: alien.r,
    def: alien.def, // Keep alien type definition for unique appearance
    vx: (Math.random() - 0.5) * 1.5, // Drift velocity
    vy: (Math.random() - 0.5) * 1.5,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.05,
    opacity: 1.0,
    life: 600, // Fade over 10 seconds
    maxLife: 600
  };
  
  corpses.push(corpse);
}

// Update all corpses
function updateCorpses() {
  for (let i = corpses.length - 1; i >= 0; i--) {
    const c = corpses[i];
    
    // Drift movement
    c.x += c.vx;
    c.y += c.vy;
    c.rotation += c.rotSpeed;
    
    // Fade out over time
    c.life--;
    c.opacity = c.life / c.maxLife;
    
    // Remove when fully faded
    if (c.life <= 0) {
      corpses.splice(i, 1);
      continue;
    }
    
    // Ambulance vacuum effect (if ambulance system is active)
    if (typeof ambulances !== 'undefined' && ambulances.length > 0) {
      ambulances.forEach(amb => {
        if (!amb.active) return;
        const dx = amb.x - c.x;
        const dy = amb.y - c.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Vacuum range
        if (dist < amb.vacuumRange) {
          // Pull corpse toward ambulance
          const pullForce = 0.3;
          c.vx += (dx / dist) * pullForce;
          c.vy += (dy / dist) * pullForce;
          
          // Collect if close enough
          if (dist < 30) {
            amb.collected++;
            corpses.splice(i, 1);
            // Award coins
            earnCoins(2, false);
            showFloatingText('+2🪙', amb.x, amb.y - 40, '#ffd700');
          }
        }
      });
    }
  }
}

// Draw all corpses
function drawCorpses() {
  corpses.forEach(c => {
    ctx.save();
    ctx.globalAlpha = c.opacity * 0.6; // Corpses are semi-transparent
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rotation);
    
    // Draw corpse based on alien type
    drawCorpseBody(c);
    
    ctx.restore();
  });
}

// Draw individual corpse with unique appearance per alien type
function drawCorpseBody(c) {
  const def = c.def;
  const r = c.r;
  const col = def.col || '#888888';
  const col2 = def.col2 || '#444444';
  
  // Darken colors for corpse
  const deadCol = darkenColor(col);
  const deadCol2 = darkenColor(col2);
  
  // Draw simplified dead version based on shape
  switch (def.shape || 0) {
    case 0: // Circle/UFO
      ctx.fillStyle = deadCol2;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = deadCol;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    case 1: // Fighter
      ctx.fillStyle = deadCol2;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.6, r * 0.8);
      ctx.lineTo(-r * 0.6, r * 0.8);
      ctx.closePath();
      ctx.fill();
      break;
      
    case 2: // Bomber
      ctx.fillStyle = deadCol2;
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    case 3: // Diamond
      ctx.fillStyle = deadCol2;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.7, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r * 0.7, 0);
      ctx.closePath();
      ctx.fill();
      break;
      
    case 4: // Hexagon
      ctx.fillStyle = deadCol2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      break;
      
    case 5: // Star
      ctx.fillStyle = deadCol2;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = i * Math.PI / 5;
        const rad = i % 2 === 0 ? r : r * 0.5;
        if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
        else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath();
      ctx.fill();
      break;
      
    case 6: // Cross
      ctx.fillStyle = deadCol2;
      ctx.fillRect(-r * 0.3, -r, r * 0.6, r * 2);
      ctx.fillRect(-r, -r * 0.3, r * 2, r * 0.6);
      break;
      
    case 7: // Spike
      ctx.fillStyle = deadCol2;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.lineTo(Math.cos(a + Math.PI / 8) * r * 0.5, Math.sin(a + Math.PI / 8) * r * 0.5);
      }
      ctx.closePath();
      ctx.fill();
      break;
      
    case 8: // Beetle
      ctx.fillStyle = deadCol2;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.8, r, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    case 9: // Crescent
      ctx.fillStyle = deadCol2;
      ctx.beginPath();
      ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2);
      ctx.arc(r * 0.3, 0, r * 0.7, Math.PI / 2, -Math.PI / 2, true);
      ctx.closePath();
      ctx.fill();
      break;
      
    default:
      // Generic dead ship
      ctx.fillStyle = deadCol2;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
  }
  
  // Add damage marks (cracks/burns)
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, -r * 0.3);
  ctx.lineTo(r * 0.3, r * 0.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(r * 0.4, -r * 0.2);
  ctx.lineTo(-r * 0.2, r * 0.5);
  ctx.stroke();
}

// Helper: darken a hex color for corpse appearance
function darkenColor(hex) {
  // Convert hex to RGB
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  // Darken by 60%
  const nr = Math.floor(r * 0.4);
  const ng = Math.floor(g * 0.4);
  const nb = Math.floor(b * 0.4);
  
  // Convert back to hex
  return '#' + 
    nr.toString(16).padStart(2, '0') + 
    ng.toString(16).padStart(2, '0') + 
    nb.toString(16).padStart(2, '0');
}

// Get corpse count for HUD display
function getCorpseCount() {
  return corpses.length;
}
