// ==================== player.js ====================
// Player ship drawing and player mechanics

function updateHP(){
  // Hard cap max HP at 99 to prevent performance issues
  maxHp = Math.min(Math.max(3+(upgrades.hp||0), maxHp), 99);
  hp = Math.max(0, Math.min(hp, maxHp));
  
  // Update single-heart display
  const countEl = document.getElementById('hp-heart-count');
  const maxEl   = document.getElementById('hp-heart-max');
  const iconEl  = document.getElementById('hp-heart-icon');
  if(countEl) countEl.textContent = hp;
  if(maxEl)   maxEl.textContent   = maxHp;
  // Flash red when damaged
  if(iconEl){
    iconEl.style.filter = hp <= 1 ? 'drop-shadow(0 0 10px #ff0000)' : 'drop-shadow(0 0 5px #ff4444)';
    iconEl.textContent  = hp <= 0 ? '💔' : '❤️';
  }
}

function switchWeapon(i){
  if(ammo[i]>0 && i!==currentWeapon){
    currentWeapon=i;
    updateWeaponDisplay();
    // Weapon-specific confirmation voice
    var _wv=['Laser beam online!','Plasma cannon armed!','Rail cannon locked!','Lightning charged!'];
    cmdSpeak({text:_wv[i], pitch:1.4, rate:1.3, vol:0.85});
  }
}
function useAbility(idx){
  if(!running||paused||abilityCD[idx]>0) return;
  abilityCD[idx]=CONFIG.ABILITY_COOLDOWN[idx];
  if(idx===0){ shieldTime=300; shieldsUsed++; playTone(800,.5,'sine',.3); showFloatingText('🛡️ SHIELD!',EX(),EY()-60,'#00ffb4'); }
  else if(idx===1){ 
    aliens.forEach(a=>{a.hp-=1000;if(a.hp<=0)a.dead=true;});
    if(bossActive) bossHP-=Math.round(bossMaxHP*0.10);
    nukesUsed++;playExplosion(5);shk=20;flash=.8;
    earnCoins(10);
    showFloatingText('💣 NUKE!', EX(),EY()-60,'#ff4444');
  }
  else if(idx===2){ timeFreeze=200; playTone(1200,.3,'square',.2); showFloatingText('⏱️ TIME FREEZE!',EX(),EY()-60,'#00ffff'); }
  updateAbilities();
  checkAchievements();
}

// ==================== AMMO ====================
function autoRegenAmmo(){
  const rate=CONFIG.AMMO_REGEN_RATE*getRegenMult();
  for(let i=0;i<4;i++){
    if(ammo[i]<CONFIG.MAX_AMMO[i]){
      ammo[i]+=rate;
      if(ammo[i]>CONFIG.MAX_AMMO[i]) ammo[i]=CONFIG.MAX_AMMO[i];
    }
  }
}

function checkAutoSwitch(){
  if(ammo[currentWeapon]<=0){
    for(let i=0;i<4;i++){
      if(ammo[i]>0){ currentWeapon=i; showAutoSwitch(); updateWeaponDisplay(); return; }
    }
    currentWeapon=0;
  }
}

function drawPlayerShip(ex, ey){
  satRotation += 0.012; // slow constant spin

  const aimAng = Math.atan2(aimY - ey, aimX - ex); // facing direction
  ctx.save();
  ctx.translate(ex, ey);

  // ── THRUSTER EXHAUST (behind satellite, opposite to aim) ──
  const thrAng = aimAng + Math.PI;
  const thrLen = 18 + Math.sin(F * 0.2) * 6;
  const tg = ctx.createLinearGradient(0, 0, Math.cos(thrAng)*thrLen, Math.sin(thrAng)*thrLen);
  tg.addColorStop(0, 'rgba(0,200,255,0.7)');
  tg.addColorStop(1, 'rgba(0,80,255,0)');
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(thrAng)*thrLen, Math.sin(thrAng)*thrLen);
  ctx.strokeStyle = tg;
  ctx.lineWidth = 6 + Math.sin(F*0.3)*2;
  ctx.lineCap = 'round';
  ctx.stroke();

  // ── SHIELD RING ──
  if(shieldTime > 0){
    ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI*2);
    ctx.strokeStyle = `rgba(0,255,180,${Math.min(1,Math.max(0,0.35 + Math.sin(F*0.15)*0.2))})`;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 18; ctx.shadowColor = '#00ffb4';
    ctx.stroke();
    ctx.shadowBlur = 0;
    // rotating shield segments
    for(let s=0; s<6; s++){
      const sa = satRotation*2 + s*(Math.PI/3);
      ctx.beginPath();
      ctx.arc(0, 0, 40, sa, sa + 0.4);
      ctx.strokeStyle = `rgba(0,255,255,0.6)`;
      ctx.lineWidth = 5;
      ctx.stroke();
    }
  }

  ctx.rotate(satRotation); // satellite body rotates slowly

  // ══════════════════════════════════════════════
  // SOLAR PANEL — LEFT WING
  // ══════════════════════════════════════════════
  const panW = 44, panH = 14;
  const panGapX = 20;

  function drawSolarPanel(side){
    const sx = side * panGapX;
    const panX = side > 0 ? sx : sx - panW;

    // Panel frame
    ctx.fillStyle = '#1a2a3a';
    ctx.strokeStyle = '#336688';
    ctx.lineWidth = 1.2;
    ctx.fillRect(panX, -panH/2, panW, panH);
    ctx.strokeRect(panX, -panH/2, panW, panH);

    // Solar grid lines
    const cells = 4;
    const cellW = panW / cells;
    for(let c=1; c<cells; c++){
      ctx.beginPath();
      ctx.moveTo(panX + c*cellW, -panH/2);
      ctx.lineTo(panX + c*cellW,  panH/2);
      ctx.strokeStyle = '#336688';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(panX, 0); ctx.lineTo(panX+panW, 0);
    ctx.strokeStyle = '#336688'; ctx.lineWidth = 0.8; ctx.stroke();

    // Solar cell fill — active glow
    for(let c=0; c<cells; c++){
      const pulse = 0.3 + Math.sin(F*0.05 + c*0.7 + side)*0.2;
      ctx.fillStyle = `rgba(0,180,255,${Math.min(1,Math.max(0,pulse))})`;
      ctx.fillRect(panX + c*cellW + 1, -panH/2+1, cellW-2, panH-2);
    }

    // ── WEAPON SLOTS ON WING ──
    drawWingWeaponSlots(side, panX, panH);
  }

  drawSolarPanel(-1); // left
  drawSolarPanel( 1); // right

  // ══════════════════════════════════════════════
  // SATELLITE CORE BODY (hexagonal)
  // ══════════════════════════════════════════════
  const cr = 17;
  // Outer hex
  ctx.beginPath();
  for(let i=0;i<6;i++){
    const a2 = i*Math.PI/3;
    i===0 ? ctx.moveTo(Math.cos(a2)*cr, Math.sin(a2)*cr)
           : ctx.lineTo(Math.cos(a2)*cr, Math.sin(a2)*cr);
  }
  ctx.closePath();
  const coreGrad = ctx.createRadialGradient(-4,-4,0, 0,0,cr);
  coreGrad.addColorStop(0, '#2a4a6a');
  coreGrad.addColorStop(0.6,'#0a1a2a');
  coreGrad.addColorStop(1,  '#001020');
  ctx.fillStyle = coreGrad;
  ctx.shadowBlur = 14; ctx.shadowColor = '#00ffb4';
  ctx.fill();
  ctx.strokeStyle = '#00ffb4'; ctx.lineWidth = 1.8; ctx.stroke();
  ctx.shadowBlur = 0;

  // Inner hex (smaller, rotated)
  ctx.beginPath();
  for(let i=0;i<6;i++){
    const a2 = i*Math.PI/3 + Math.PI/6;
    i===0 ? ctx.moveTo(Math.cos(a2)*(cr-5), Math.sin(a2)*(cr-5))
           : ctx.lineTo(Math.cos(a2)*(cr-5), Math.sin(a2)*(cr-5));
  }
  ctx.closePath();
  ctx.strokeStyle = 'rgba(0,255,180,0.3)'; ctx.lineWidth = 1; ctx.stroke();

  // Center reactor orb
  const reactorR = 7;
  const rg = ctx.createRadialGradient(0,0,0, 0,0,reactorR);
  const reactorPulse = Math.min(1, 0.8 + Math.sin(F*0.1)*0.2);
  rg.addColorStop(0, `rgba(255,255,255,${Math.min(1,Math.max(0,reactorPulse))})`);
  rg.addColorStop(0.4,'#00ffff');
  rg.addColorStop(1,  'rgba(0,150,255,0)');
  ctx.fillStyle = rg;
  ctx.shadowBlur = 20; ctx.shadowColor = '#00ffff';
  ctx.beginPath(); ctx.arc(0,0,reactorR,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur = 0;

  // Weapon aim barrel — points toward target
  ctx.restore(); // un-rotate to aim direction
  ctx.save();
  ctx.translate(ex, ey);
  ctx.rotate(aimAng);
  // Barrel
  ctx.fillStyle = '#00ffb4';
  ctx.shadowBlur = 8; ctx.shadowColor = '#00ffb4';
  ctx.fillRect(-3, -cr-16, 6, 18);
  ctx.fillStyle = '#00ffff';
  ctx.fillRect(-2, -cr-20, 4, 6);
  // Muzzle glow
  if(F - lastFire < 6){
    ctx.beginPath(); ctx.arc(0, -cr-20, 8, 0, Math.PI*2);
    ctx.fillStyle = `rgba(0,255,200,${Math.min(1,Math.max(0,0.6 - (F-lastFire)*0.1))})`;
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.restore();
}

// ── WEAPON SLOTS drawn on each wing ──
function drawWingWeaponSlots(side, panX, panH){
  // 4 standard weapon slots per wing side
  const slotW = 10, slotH = 10;
  const WEAPONS_ICONS = ['🔵','🔥','💥','⚡'];
  const WEAPONS_COLORS = ['#00ffb4','#ff6600','#ff0000','#aa00ff'];

  // side -1 = left wing slots, side +1 = right wing slots
  // Left wing: slots above/below panel (heavy weapons)
  // Right wing: standard weapons
  const isLeft = side < 0;

  if(!isLeft){
    // RIGHT WING — 4 standard weapon slots (above panel)
    for(let i=0; i<4; i++){
      const slotX = panX + i*(panX < 0 ? -11 : 11) + (side>0 ? i*11 : 0);
      const sx = panX + i*11 + 1;
      const sy = -panH/2 - slotH - 3;
      const isActive = (currentWeapon === i);
      const hasAmmo = ammo[i] > 0;
      const col = WEAPONS_COLORS[i];

      // Slot background
      ctx.fillStyle = isActive
        ? `rgba(${hexToRgb(col)},0.4)`
        : (hasAmmo ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.2)');
      ctx.strokeStyle = isActive ? col : (hasAmmo ? `rgba(${hexToRgb(col)},0.5)` : 'rgba(80,80,80,0.4)');
      ctx.lineWidth = isActive ? 1.5 : 0.8;
      roundRect(ctx, sx, sy, slotW, slotH, 2);
      ctx.fill(); ctx.stroke();

      // Active glow pulse
      if(isActive){
        ctx.shadowBlur = 8; ctx.shadowColor = col;
        ctx.strokeStyle = col; ctx.lineWidth = 1.5;
        roundRect(ctx, sx-1, sy-1, slotW+2, slotH+2, 3);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Ammo mini bar inside slot
      const aRatio = ammo[i]/CONFIG.MAX_AMMO[i];
      ctx.fillStyle = hasAmmo ? col : '#333';
      ctx.fillRect(sx+1, sy+slotH-3, (slotW-2)*aRatio, 2);
    }
  } else {
    // LEFT WING — special/heavy weapon slots (below panel)
    const hwKeys = Object.keys(hwInventory).filter(k=>hwInventory[k]>0);
    const spaceActive = !!activeSpaceItem;

    // Up to 4 special slots
    const allSpecial = [
      {key:'space', icon: spaceActive ? activeSpaceItem.icon||'⚡' : null, col:'#ffff00', active: spaceActive}
    ].concat(hwKeys.slice(0,3).map(function(k){
        var hw = HEAVY_WEAPONS.find(function(h){return h.id===k;});
        return {key:k, icon:(hw&&hw.icon)||'☢️', col:'#ffe600', active:true};
      }));

    allSpecial.forEach((sp, i)=>{
      const sx = panX + i*11 + 1;
      const sy = panH/2 + 3;

      if(!sp.icon){
        // Empty slot
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.strokeStyle = 'rgba(60,60,60,0.4)';
        ctx.lineWidth = 0.8;
        roundRect(ctx, sx, sy, slotW, slotH, 2);
        ctx.fill(); ctx.stroke();
        return;
      }

      // Filled slot
      const pulse = 0.3 + Math.sin(F*0.08 + i*1.2)*0.15;
      ctx.fillStyle = `rgba(255,200,0,${Math.min(1,Math.max(0,pulse))})`;
      ctx.strokeStyle = sp.col;
      ctx.lineWidth = 1.2;
      ctx.shadowBlur = sp.active ? 10 : 0;
      ctx.shadowColor = sp.col;
      roundRect(ctx, sx, sy, slotW, slotH, 2);
      ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;
    });
  }
}

// Helper: hex color to rgb string
function hexToRgb(hex){
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

// Helper: rounded rect path
function roundRect(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y);
  ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h-r);
  ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h);
  ctx.quadraticCurveTo(x, y+h, x, y+h-r);
  ctx.lineTo(x, y+r);
  ctx.quadraticCurveTo(x, y, x+r, y);
  ctx.closePath();
}
