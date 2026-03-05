// ==================== spaceman.js ====================
// SPACEMAN ALLY SYSTEM — Realistic astronaut ally with laser gun
// + Alien Space Suit Hunter enemies that target him

let spaceman = null;
let spacemanRespawnTimer = 0;
const SPACEMAN_RESPAWN_DELAY = 900;

function initSpaceman() {
  spaceman = {
    x: W * 0.2 + Math.random() * W * 0.6,
    y: H * 0.15 + Math.random() * H * 0.4,
    vx: (Math.random() - 0.5) * 0.5,
    vy: (Math.random() - 0.5) * 0.5,
    hp: 6, maxHp: 6, r: 20,
    laserCd: 0, laserTarget: null,
    beam: null, beamTimer: 0,
    alive: true,
    bobPhase: Math.random() * Math.PI * 2,
    facingRight: true,
    floatDir: Math.random() * Math.PI * 2,
    floatTimer: 0,
    hitFlash: 0,
    chatMsg: '', chatTimer: 0,
    thrustPhase: 0,
    gunRecoil: 0,
    walkPhase: 0,
  };
  spacemanRespawnTimer = 0;
}

function resetSpaceman() { spaceman = null; spacemanRespawnTimer = 0; }

function updateSpaceman() {
  if (!running || paused) return;
  if (!spaceman || !spaceman.alive) {
    spacemanRespawnTimer++;
    if (spacemanRespawnTimer >= SPACEMAN_RESPAWN_DELAY) {
      initSpaceman();
      if (typeof showFloatingText === 'function')
        showFloatingText('👨‍🚀 SPACEMAN BACK IN ACTION!', W / 2, H * 0.3, '#00ffb4');
    }
    return;
  }
  const sm = spaceman;
  sm.bobPhase += 0.038; sm.thrustPhase += 0.12; sm.walkPhase += 0.07;
  if (sm.hitFlash > 0) sm.hitFlash--;
  if (sm.chatTimer > 0) sm.chatTimer--;
  if (sm.laserCd > 0) sm.laserCd--;
  if (sm.beamTimer > 0) sm.beamTimer--;
  if (sm.gunRecoil > 0) sm.gunRecoil -= 0.8;

  sm.floatTimer++;
  if (sm.floatTimer > 100) { sm.floatDir += (Math.random() - 0.5) * 1.5; sm.floatTimer = 0; }
  sm.vx += Math.cos(sm.floatDir) * 0.018;
  sm.vy += Math.sin(sm.floatDir) * 0.018;
  const spd = Math.hypot(sm.vx, sm.vy);
  if (spd > 1.3) { sm.vx *= 1.3 / spd; sm.vy *= 1.3 / spd; }
  sm.x += sm.vx; sm.y += sm.vy;
  if (Math.abs(sm.vx) > 0.1) sm.facingRight = sm.vx > 0;

  const margin = 55, bottomLimit = H - 210;
  if (sm.x < margin) { sm.vx = Math.abs(sm.vx) + 0.15; sm.floatDir = 0; }
  if (sm.x > W - margin) { sm.vx = -(Math.abs(sm.vx) + 0.15); sm.floatDir = Math.PI; }
  if (sm.y < margin) { sm.vy = Math.abs(sm.vy) + 0.1; sm.floatDir = Math.PI / 2; }
  if (sm.y > bottomLimit) { sm.vy = -(Math.abs(sm.vy) + 0.15); sm.floatDir = -Math.PI / 2; }

  let nearest = null, nearDist = 340;
  for (let i = 0; i < aliens.length; i++) {
    const a = aliens[i];
    if (a.dead || a.isSpaceSuitAlien) continue;
    const d = Math.hypot(a.x - sm.x, a.y - sm.y);
    if (d < nearDist) { nearDist = d; nearest = a; }
  }
  sm.laserTarget = nearest;
  if (nearest) sm.facingRight = nearest.x > sm.x;

  if (sm.laserCd <= 0 && nearest) {
    nearest.hp -= 9;
    if (nearest.hp <= 0) {
      nearest.dead = true;
      if (typeof earnCoins === 'function') earnCoins(1, false);
      if (typeof pushParticle === 'function')
        for (let i = 0; i < 8; i++)
          pushParticle({ x: nearest.x, y: nearest.y, vx: (Math.random()-0.5)*7, vy: (Math.random()-0.5)*7, life: 35, color: '#00ffff', size: 3 + Math.random()*3 });
      const msgs = ['💥 GOT ONE!', '🎯 HEADSHOT!', '⚡ DOWN!', '🔫 ELIMINATED!', '✅ CLEARED!'];
      sm.chatMsg = msgs[Math.floor(Math.random() * msgs.length)];
      sm.chatTimer = 80;
    }
    sm.beam = { x1: sm.x + (sm.facingRight ? 18 : -18), y1: sm.y - 2, x2: nearest.x, y2: nearest.y };
    sm.beamTimer = 10; sm.gunRecoil = 8; sm.laserCd = 48 + Math.floor(Math.random() * 20);
  }
}

function hurtSpaceman(dmg) {
  if (!spaceman || !spaceman.alive) return;
  spaceman.hp -= dmg; spaceman.hitFlash = 18;
  spaceman.chatMsg = spaceman.hp <= 2 ? '😱 CRITICAL! HELP!' : '😤 I\'M HIT!';
  spaceman.chatTimer = 100;
  if (typeof showFloatingText === 'function')
    showFloatingText('👨‍🚀 -' + dmg + 'HP', spaceman.x, spaceman.y - 35, '#ff4444');
  if (spaceman.hp <= 0) {
    if (typeof showFloatingText === 'function')
      showFloatingText('💀 SPACEMAN DOWN! RESPAWN 15s', W / 2, H * 0.28, '#ff4444');
    if (typeof playExplosion === 'function') playExplosion(2);
    if (typeof pushParticle === 'function')
      for (let i = 0; i < 25; i++)
        pushParticle({ x: spaceman.x, y: spaceman.y, vx:(Math.random()-.5)*9, vy:(Math.random()-.5)*9, life:55, color:i<12?'#ff4444':'#ffaa00', size:3+Math.random()*5 });
    spaceman.alive = false; spacemanRespawnTimer = 0;
  }
}

// ── DRAW SPACEMAN (Realistic NASA-style astronaut) ────────
function drawSpaceman() {
  if (!spaceman || !spaceman.alive) {
    if (spacemanRespawnTimer > 0 && spacemanRespawnTimer < SPACEMAN_RESPAWN_DELAY) {
      const sec = Math.ceil((SPACEMAN_RESPAWN_DELAY - spacemanRespawnTimer) / 60);
      ctx.save();
      ctx.globalAlpha = 0.55 + Math.sin(spacemanRespawnTimer * 0.15) * 0.15;
      ctx.font = 'bold 10px Orbitron, Arial';
      ctx.fillStyle = '#ff6644'; ctx.textAlign = 'center';
      ctx.shadowBlur = 8; ctx.shadowColor = '#ff4400';
      ctx.fillText('👨‍🚀 RESPAWN: ' + sec + 's', W * 0.15, H * 0.07);
      ctx.shadowBlur = 0; ctx.restore();
    }
    return;
  }

  const sm = spaceman;
  const bob = Math.sin(sm.bobPhase) * 2.5;
  const flip = sm.facingRight ? 1 : -1;
  ctx.save();

  // Laser beam
  if (sm.beamTimer > 0 && sm.beam) {
    const a = sm.beamTimer / 10;
    ctx.save();
    ctx.shadowBlur = 18; ctx.shadowColor = '#00ffcc';
    ctx.strokeStyle = `rgba(100,255,220,${a * 0.35})`; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(sm.beam.x1,sm.beam.y1); ctx.lineTo(sm.beam.x2,sm.beam.y2); ctx.stroke();
    const bGrad = ctx.createLinearGradient(sm.beam.x1,sm.beam.y1,sm.beam.x2,sm.beam.y2);
    bGrad.addColorStop(0,`rgba(255,255,200,${a})`);
    bGrad.addColorStop(0.4,`rgba(0,255,200,${a})`);
    bGrad.addColorStop(1,`rgba(0,200,150,${a*0.2})`);
    ctx.strokeStyle = bGrad; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(sm.beam.x1,sm.beam.y1); ctx.lineTo(sm.beam.x2,sm.beam.y2); ctx.stroke();
    ctx.fillStyle=`rgba(255,255,200,${a})`; ctx.beginPath(); ctx.arc(sm.beam.x1,sm.beam.y1,5*a,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=`rgba(0,255,180,${a*0.7})`; ctx.beginPath(); ctx.arc(sm.beam.x2,sm.beam.y2,4*a,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0; ctx.restore();
  }

  ctx.translate(sm.x, sm.y + bob);
  if (sm.hitFlash > 0) { ctx.shadowBlur = 22; ctx.shadowColor = '#ff0000'; }
  ctx.save(); ctx.scale(flip, 1);

  // ── JETPACK ──────────────────────────────────────────────
  ctx.save(); ctx.translate(-10, 4);
  const jpG = ctx.createLinearGradient(-6,-12,6,12);
  jpG.addColorStop(0,'#3a4a5a'); jpG.addColorStop(1,'#1a2530');
  ctx.fillStyle = jpG; ctx.strokeStyle = '#4a6a7a'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(-6,-13,12,26,3); ctx.fill(); ctx.stroke();
  // Rivets
  ctx.fillStyle = '#6a8a9a';
  for (let r = -1; r <= 1; r += 2) { ctx.beginPath(); ctx.arc(r*3,-8,1.5,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(r*3,6,1.5,0,Math.PI*2); ctx.fill(); }
  // Nozzles
  ctx.fillStyle = '#111'; ctx.strokeStyle = '#4a6a7a'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.ellipse(-3,13,3.5,2,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(3,13,3.5,2,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
  // Flames
  for (let t = 0; t < 2; t++) {
    const tx = t===0?-3:3, fl = 14+Math.sin(sm.thrustPhase+t*1.3)*5;
    const fg = ctx.createLinearGradient(tx,13,tx,13+fl);
    fg.addColorStop(0,'rgba(150,220,255,0.9)'); fg.addColorStop(0.5,'rgba(0,150,255,0.7)'); fg.addColorStop(1,'rgba(100,200,255,0)');
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.moveTo(tx-3.5,13); ctx.quadraticCurveTo(tx+Math.sin(sm.thrustPhase+t)*2,13+fl*0.55,tx,13+fl); ctx.quadraticCurveTo(tx+Math.sin(sm.thrustPhase+t+1)*2,13+fl*0.55,tx+3.5,13); ctx.closePath(); ctx.fill();
    // White core
    const fg2 = ctx.createLinearGradient(tx,13,tx,13+fl*0.5);
    fg2.addColorStop(0,'rgba(255,255,255,0.95)'); fg2.addColorStop(1,'rgba(200,240,255,0)');
    ctx.fillStyle = fg2;
    ctx.beginPath(); ctx.moveTo(tx-1.5,13); ctx.lineTo(tx,13+fl*0.5); ctx.lineTo(tx+1.5,13); ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  // ── LEGS ─────────────────────────────────────────────────
  const legSwing = Math.sin(sm.walkPhase) * 5;
  for (let leg = -1; leg <= 1; leg += 2) {
    ctx.save(); ctx.translate(leg*5, 9); ctx.rotate(legSwing * leg * 0.025);
    const isLight = leg > 0;
    ctx.fillStyle = isLight ? '#d8e8f8' : '#c8d8e8';
    ctx.strokeStyle = '#8899aa'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(-4,0,8,11,2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = isLight ? '#baccdd' : '#aabbcc';
    ctx.beginPath(); ctx.arc(0,11,3.5,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = isLight ? '#d8e8f8' : '#c8d8e8';
    ctx.beginPath(); ctx.roundRect(-3.5,11,7,10,2); ctx.fill(); ctx.stroke();
    // Boot
    ctx.fillStyle = isLight ? '#8899bb' : '#7788aa'; ctx.strokeStyle = '#667799';
    ctx.beginPath(); ctx.roundRect(-5,20,11,5,2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#445566'; ctx.fillRect(-5,23,11,2);
    ctx.restore();
  }

  // ── TORSO ─────────────────────────────────────────────────
  const tG = ctx.createLinearGradient(-10,-10,10,8);
  tG.addColorStop(0, sm.hitFlash>0?'#ffcccc':'#ddeeff');
  tG.addColorStop(0.5, sm.hitFlash>0?'#ffaaaa':'#c8dced');
  tG.addColorStop(1,'#a8bccb');
  ctx.fillStyle = tG; ctx.strokeStyle = '#7a9aaa'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.roundRect(-10,-10,20,20,4); ctx.fill(); ctx.stroke();
  // Seam lines
  ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=0.7;
  ctx.beginPath(); ctx.moveTo(-9,-8); ctx.lineTo(-9,7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(9,-8); ctx.lineTo(9,7); ctx.stroke();
  // PLSS (life support) chest panel
  const cpG = ctx.createLinearGradient(-6,-7,6,4);
  cpG.addColorStop(0,'#1a3a5a'); cpG.addColorStop(1,'#0a2030');
  ctx.fillStyle = cpG; ctx.strokeStyle = '#2a5a8a'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(-6,-7,12,11,2); ctx.fill(); ctx.stroke();
  // Connector detail lines on panel
  ctx.strokeStyle = '#3a6a9a'; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(-5,-2); ctx.lineTo(5,-2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-5,1); ctx.lineTo(5,1); ctx.stroke();
  // Status lights
  [[- 4,-5,'#00ff88'],[0,-5,'#ffaa00'],[4,-5,'#ff4444']].forEach(([lx,ly,lc],i)=>{
    const p = 0.6+Math.sin(sm.bobPhase*1.5+i*1.1)*0.35;
    ctx.fillStyle=lc; ctx.shadowBlur=5; ctx.shadowColor=lc; ctx.globalAlpha=p;
    ctx.beginPath(); ctx.arc(lx,ly,1.5,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=1; ctx.shadowBlur=0;
  });
  // Mission patch
  ctx.fillStyle='#ff4444'; ctx.beginPath(); ctx.arc(-3,2,3,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fff'; ctx.font='bold 3px Arial'; ctx.textAlign='center'; ctx.fillText('★',-3,3.2);
  // Shoulder pads
  ctx.fillStyle='#aabbcc'; ctx.strokeStyle='#8899aa'; ctx.lineWidth=0.8;
  ctx.beginPath(); ctx.roundRect(-13,-9,5,8,2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(8,-9,5,8,2); ctx.fill(); ctx.stroke();
  // Flag patch on left shoulder
  ctx.fillStyle='#ff4444'; ctx.fillRect(-12,-5,3,2);
  ctx.fillStyle='#fff'; ctx.fillRect(-12,-3,3,2);
  ctx.fillStyle='#4488ff'; ctx.fillRect(-12,-1,3,2);

  // ── GUN ARM ───────────────────────────────────────────────
  ctx.save(); ctx.translate(10,-5);
  const gAng = sm.laserTarget ? Math.atan2(sm.laserTarget.y-(sm.y+bob), sm.laserTarget.x-sm.x)*(sm.facingRight?1:-1)*0.45 : 0;
  ctx.rotate(Math.max(-0.75, Math.min(0.75, gAng)));
  ctx.fillStyle='#c8d8e8'; ctx.strokeStyle='#8899aa'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.roundRect(0,-3.5,11,7,2); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#aabbcc'; ctx.beginPath(); ctx.arc(11,0,3.5,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#c8d8e8'; ctx.beginPath(); ctx.roundRect(10,-2.5,8,5,2); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#7788aa'; ctx.strokeStyle='#556688';
  ctx.beginPath(); ctx.roundRect(17,-3.5,7,7,2); ctx.fill(); ctx.stroke();
  // Laser pistol
  ctx.save(); ctx.translate(22+((sm.gunRecoil>0?-sm.gunRecoil*0.35:0)),0);
  const gG = ctx.createLinearGradient(0,-3.5,0,3.5);
  gG.addColorStop(0,'#3a4a5a'); gG.addColorStop(1,'#1a2530');
  ctx.fillStyle=gG; ctx.strokeStyle='#5a7a8a'; ctx.lineWidth=0.8;
  ctx.beginPath(); ctx.moveTo(0,-3); ctx.lineTo(14,-2.5); ctx.lineTo(14,2.5); ctx.lineTo(0,3); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#2a3a4a'; ctx.beginPath(); ctx.roundRect(-2.5,1.5,5.5,6,1); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#1a2530'; ctx.strokeStyle='#4a6a7a';
  ctx.beginPath(); ctx.roundRect(10,-1.5,7,3,1); ctx.fill(); ctx.stroke();
  const ep = 0.5+Math.sin(sm.bobPhase*2)*0.4;
  ctx.fillStyle=`rgba(0,255,200,${ep})`; ctx.shadowBlur=8; ctx.shadowColor='#00ffcc';
  ctx.beginPath(); ctx.arc(5,0,2.5,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
  if (sm.beamTimer>0) {
    const fa=sm.beamTimer/10; ctx.shadowBlur=16; ctx.shadowColor='#ffff00';
    ctx.fillStyle=`rgba(255,255,180,${fa})`; ctx.beginPath(); ctx.arc(16,0,5*fa,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
  }
  ctx.restore(); ctx.restore();

  // ── IDLE ARM ──────────────────────────────────────────────
  ctx.save(); ctx.translate(-11,-4); ctx.rotate(-0.3+Math.sin(sm.walkPhase)*0.18);
  ctx.fillStyle='#c0d0e0'; ctx.strokeStyle='#8899aa'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.roundRect(-11,-3,11,6,2); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#aabbcc'; ctx.beginPath(); ctx.arc(-11,0,3,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-19,-2.5,9,5,2); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#7788aa'; ctx.strokeStyle='#556688';
  ctx.beginPath(); ctx.roundRect(-24,-3,7,6,2); ctx.fill(); ctx.stroke();
  ctx.restore();

  // ── NECK RING ─────────────────────────────────────────────
  const nG = ctx.createLinearGradient(-5,-14,5,-10);
  nG.addColorStop(0,'#8899aa'); nG.addColorStop(1,'#5a6a7a');
  ctx.fillStyle=nG; ctx.strokeStyle='#7a8a9a'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.roundRect(-5,-14,10,5,2); ctx.fill(); ctx.stroke();

  // ── HELMET ───────────────────────────────────────────────
  const hG = ctx.createRadialGradient(-4,-25,2, 0,-22,14);
  hG.addColorStop(0,'#c8d8e8'); hG.addColorStop(0.5,'#9aacbc'); hG.addColorStop(1,'#5a6a7a');
  ctx.fillStyle=hG; ctx.strokeStyle='#7a8a9a'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.arc(0,-22,13.5,0,Math.PI*2); ctx.fill(); ctx.stroke();

  // Visor window
  ctx.save();
  ctx.beginPath(); ctx.ellipse(1,-21,9.5,10.5,0,-Math.PI*0.75,Math.PI*0.05); ctx.closePath(); ctx.clip();
  ctx.fillStyle='#060e18'; ctx.fillRect(-16,-36,32,32);
  const vG = ctx.createRadialGradient(-2,-27,1, 0,-22,10);
  vG.addColorStop(0,'rgba(0,180,255,0.2)'); vG.addColorStop(0.5,'rgba(0,100,200,0.12)'); vG.addColorStop(1,'rgba(0,20,60,0.35)');
  ctx.fillStyle=vG; ctx.fillRect(-16,-36,32,32);
  // Face silhouette
  ctx.fillStyle='rgba(190,130,90,0.2)'; ctx.beginPath(); ctx.ellipse(0,-21,5,6.5,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='rgba(240,200,160,0.15)'; ctx.beginPath(); ctx.ellipse(0,-24,3,2,0,0,Math.PI*2); ctx.fill();
  // Eyes
  ctx.fillStyle='rgba(255,255,255,0.45)';
  ctx.beginPath(); ctx.arc(-2,-22,1.3,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(2,-22,1.3,0,Math.PI*2); ctx.fill();
  ctx.restore();

  // Visor gold tint border (NASA EVA suit)
  ctx.save();
  ctx.strokeStyle='rgba(255,200,50,0.55)'; ctx.lineWidth=1.8;
  ctx.shadowBlur=5; ctx.shadowColor='rgba(255,200,50,0.4)';
  ctx.beginPath(); ctx.ellipse(1,-21,9.5,10.5,0,-Math.PI*0.75,Math.PI*0.05); ctx.stroke(); ctx.shadowBlur=0;
  // Top glare
  ctx.fillStyle='rgba(255,255,255,0.38)'; ctx.beginPath(); ctx.ellipse(-3,-27,4.5,2,-.55,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(-5,-24,1.8,0.9,-.3,0,Math.PI*2); ctx.fill();
  ctx.restore();

  // Helmet hardware
  const cb = (typeof F!=='undefined') ? ((F%60)<30) : false;
  ctx.fillStyle=cb?'#ff4444':'#441111'; ctx.shadowBlur=cb?6:0; ctx.shadowColor='#ff0000';
  ctx.beginPath(); ctx.arc(-11,-22,2,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
  ctx.fillStyle='#22aa44'; ctx.shadowBlur=4; ctx.shadowColor='#00ff88';
  ctx.beginPath(); ctx.arc(11,-22,2,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;

  // Antenna
  ctx.strokeStyle='#aabbcc'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(3,-35); ctx.lineTo(5,-41); ctx.stroke();
  ctx.fillStyle='#ff4444'; ctx.shadowBlur=7; ctx.shadowColor='#ff2222';
  ctx.beginPath(); ctx.arc(5,-41,2.3,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;

  ctx.restore(); // flip scale

  // HP bar
  const bw=32, hpR=sm.hp/sm.maxHp;
  ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.roundRect(-bw/2-1,-56,bw+2,5,2); ctx.fill();
  const hpC = hpR>0.6?'#00ff88':hpR>0.3?'#ffaa00':'#ff3333';
  ctx.fillStyle=hpC; ctx.shadowBlur=6; ctx.shadowColor=hpC;
  ctx.beginPath(); ctx.roundRect(-bw/2,-55,bw*hpR,4,2); ctx.fill(); ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.font='bold 6px Orbitron,Arial'; ctx.textAlign='center'; ctx.fillText('HP',0,-58);

  // Chat bubble
  if (sm.chatTimer > 0 && sm.chatMsg) {
    const prog=sm.chatTimer/100, alpha=prog>0.8?(1-prog)/0.2:Math.min(1,prog/0.12);
    ctx.save(); ctx.globalAlpha=Math.max(0.1,Math.min(1,alpha));
    ctx.font='bold 7.5px Orbitron,Arial'; ctx.textAlign='center';
    const tw=ctx.measureText(sm.chatMsg).width;
    const bx=-tw/2-6,by=-74,bw2=tw+12,bh2=14;
    ctx.fillStyle='rgba(0,0,15,0.88)'; ctx.beginPath(); ctx.roundRect(bx,by,bw2,bh2,5); ctx.fill();
    ctx.strokeStyle='#00ffb4'; ctx.lineWidth=1; ctx.shadowBlur=5; ctx.shadowColor='#00ffb4'; ctx.stroke(); ctx.shadowBlur=0;
    ctx.fillStyle='#00ffb4'; ctx.beginPath(); ctx.moveTo(-4,by+bh2); ctx.lineTo(4,by+bh2); ctx.lineTo(0,by+bh2+5); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#e8f8ff'; ctx.fillText(sm.chatMsg,0,by+bh2/2+3);
    ctx.restore();
  }

  ctx.restore();
}

// ══════════════════════════════════════════════════════════
// ALIEN SPACE SUIT HUNTERS
// ══════════════════════════════════════════════════════════
const SUIT_TYPES = [
  { id:'suit1', name:'ALIEN SCOUT',  col:'#ff44aa', col2:'#660033', hp:10, spd:1.0, r:16, laserDmg:1, laserRange:260, laserCd:85 },
  { id:'suit2', name:'SUIT SOLDIER', col:'#dd00ff', col2:'#550088', hp:18, spd:0.85,r:19, laserDmg:2, laserRange:290, laserCd:65 },
  { id:'suit3', name:'ELITE HUNTER', col:'#8800ff', col2:'#330066', hp:28, spd:0.75,r:22, laserDmg:2, laserRange:330, laserCd:50 },
];

let alienSpaceSuits = [];
let suitSpawnTimer = 0;
const SUIT_SPAWN_INTERVAL = 1200;

function updateAlienSpaceSuits() {
  if (!running || paused) return;
  if (typeof wave === 'undefined' || wave < 5) return;
  suitSpawnTimer++;
  if (suitSpawnTimer >= SUIT_SPAWN_INTERVAL) {
    suitSpawnTimer = 0;
    const count = Math.min(1 + Math.floor((wave-5)/5), 3);
    for (let i = 0; i < count; i++) _spawnAlienSuit();
    if (typeof showFloatingText === 'function')
      showFloatingText('⚠️ ALIEN HUNTERS INCOMING!', W/2, H*0.35, '#ff44aa');
  }
  for (let i = alienSpaceSuits.length-1; i >= 0; i--) {
    const s = alienSpaceSuits[i];
    if (s.dead) { alienSpaceSuits.splice(i,1); continue; }
    _updateAlienSuit(s);
  }
}

function _spawnAlienSuit() {
  const wv = (typeof wave!=='undefined') ? wave : 5;
  const tp = SUIT_TYPES[Math.min(Math.floor((wv-5)/8),2)];
  const edge = Math.floor(Math.random()*3);
  let x,y;
  if(edge===0){x=Math.random()*W;y=-60;}
  else if(edge===1){x=-60;y=Math.random()*H*0.7;}
  else{x=W+60;y=Math.random()*H*0.7;}
  alienSpaceSuits.push({
    ...tp, x, y, vx:0, vy:0, maxHp:tp.hp,
    laserCdTimer:Math.floor(Math.random()*tp.laserCd),
    beamTimer:0, beam:null, dead:false, isSpaceSuitAlien:true,
    hitFlash:0, bobPhase:Math.random()*Math.PI*2,
    facingRight:true, thrustPhase:Math.random()*Math.PI*2, walkPhase:0,
  });
}

function _updateAlienSuit(s) {
  s.bobPhase+=0.05; s.thrustPhase+=0.14; s.walkPhase+=0.06;
  if(s.hitFlash>0)s.hitFlash--;
  if(s.beamTimer>0)s.beamTimer--;
  if(s.laserCdTimer>0)s.laserCdTimer--;

  let tx,ty;
  if(spaceman&&spaceman.alive){tx=spaceman.x;ty=spaceman.y;}
  else if(typeof EX==='function'){tx=EX();ty=EY();}
  else return;

  const dx=tx-s.x,dy=ty-s.y,dist=Math.hypot(dx,dy);
  s.facingRight=dx>0;
  const stopR=s.laserRange*0.55;
  if(dist>stopR){
    s.vx+=(dx/dist)*s.spd*0.07; s.vy+=(dy/dist)*s.spd*0.07;
    const sp=Math.hypot(s.vx,s.vy); if(sp>s.spd){s.vx*=s.spd/sp;s.vy*=s.spd/sp;}
  }else{s.vx*=0.88;s.vy*=0.88;}
  s.x+=s.vx; s.y+=s.vy;

  if(s.laserCdTimer<=0&&spaceman&&spaceman.alive&&dist<s.laserRange){
    s.laserCdTimer=s.laserCd;
    s.beam={x1:s.x,y1:s.y,x2:spaceman.x,y2:spaceman.y};
    s.beamTimer=10; hurtSpaceman(s.laserDmg);
  }

  if(typeof bullets!=='undefined'){
    for(let b=bullets.length-1;b>=0;b--){
      const bul=bullets[b];
      if(Math.hypot(bul.x-s.x,bul.y-s.y)<s.r){
        s.hp-=bul.dmg; s.hitFlash=14;
        if(!bul.pierce)bullets.splice(b,1);
        if(s.hp<=0){
          s.dead=true;
          if(typeof earnCoins==='function')earnCoins(5,false);
          if(typeof showFloatingText==='function')showFloatingText('💀 HUNTER DOWN! +5🪙',s.x,s.y-20,'#ff44aa');
          if(typeof pushParticle==='function')
            for(let pi=0;pi<12;pi++)pushParticle({x:s.x,y:s.y,vx:(Math.random()-.5)*9,vy:(Math.random()-.5)*9,life:45,color:s.col,size:3+Math.random()*5});
          if(typeof kills!=='undefined')kills++;
          break;
        }
      }
    }
  }
}

function drawAlienSpaceSuits() {
  alienSpaceSuits.forEach(s => { if(!s.dead) _drawAlienSuit(s); });
}

function _drawAlienSuit(s) {
  const bob=Math.sin(s.bobPhase)*2, flip=s.facingRight?1:-1;
  ctx.save();

  // Enemy laser beam
  if(s.beamTimer>0&&s.beam){
    const a=s.beamTimer/10;
    ctx.save(); ctx.shadowBlur=14; ctx.shadowColor=s.col;
    ctx.strokeStyle=s.col+'55'; ctx.lineWidth=7;
    ctx.beginPath(); ctx.moveTo(s.beam.x1,s.beam.y1); ctx.lineTo(s.beam.x2,s.beam.y2); ctx.stroke();
    ctx.strokeStyle=`rgba(255,100,200,${a})`; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.moveTo(s.beam.x1,s.beam.y1); ctx.lineTo(s.beam.x2,s.beam.y2); ctx.stroke();
    ctx.fillStyle=`rgba(255,50,180,${a})`; ctx.beginPath(); ctx.arc(s.beam.x1,s.beam.y1,5*a,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0; ctx.restore();
  }

  ctx.translate(s.x, s.y+bob);
  if(s.hitFlash>0){ctx.shadowBlur=20;ctx.shadowColor='#ffffff';}
  ctx.save(); ctx.scale(flip,1);

  // Alien jetpack (dark, hostile)
  ctx.save(); ctx.translate(-10,4);
  ctx.fillStyle='#1a0a2a'; ctx.strokeStyle=s.col+'77'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.roundRect(-6,-13,12,26,3); ctx.fill(); ctx.stroke();
  ctx.strokeStyle=s.col+'55'; ctx.lineWidth=0.6; ctx.shadowBlur=3; ctx.shadowColor=s.col;
  for(let i=-6;i<=6;i+=4){ctx.beginPath();ctx.moveTo(-5,i);ctx.lineTo(5,i);ctx.stroke();}
  ctx.shadowBlur=0;
  ctx.fillStyle='#000'; ctx.strokeStyle=s.col+'88'; ctx.lineWidth=0.8;
  ctx.beginPath(); ctx.ellipse(-3,13,3,2,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(3,13,3,2,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
  for(let t=0;t<2;t++){
    const tx2=t===0?-3:3, fl=10+Math.sin(s.thrustPhase+t)*4;
    const eg=ctx.createLinearGradient(tx2,13,tx2,13+fl);
    eg.addColorStop(0,s.col+'cc'); eg.addColorStop(1,s.col2+'00');
    ctx.fillStyle=eg; ctx.beginPath(); ctx.moveTo(tx2-3,13); ctx.lineTo(tx2,13+fl); ctx.lineTo(tx2+3,13); ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  // Alien legs (4-jointed, insectoid)
  for(let leg=-1;leg<=1;leg+=2){
    ctx.save(); ctx.translate(leg*5,9);
    ctx.fillStyle='#2a1a3a'; ctx.strokeStyle=s.col+'55'; ctx.lineWidth=0.8;
    ctx.beginPath(); ctx.roundRect(-4,0,8,8,2); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#1a0a2a'; ctx.beginPath(); ctx.roundRect(-3.5,8,7,9,2); ctx.fill(); ctx.stroke();
    // Claw foot
    ctx.fillStyle='#0a0015'; ctx.strokeStyle=s.col+'77'; ctx.lineWidth=0.8;
    ctx.beginPath(); ctx.moveTo(-5,17); ctx.lineTo(-2,22); ctx.lineTo(3,21); ctx.lineTo(7,18); ctx.lineTo(6,17); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  // Torso
  const atG=ctx.createLinearGradient(-10,-10,10,8);
  atG.addColorStop(0,s.hitFlash>0?'#ffffff':s.col+'33'); atG.addColorStop(0.5,'#1a0a2a'); atG.addColorStop(1,'#0a0015');
  ctx.fillStyle=atG; ctx.strokeStyle=s.col; ctx.lineWidth=1.2;
  ctx.shadowBlur=6; ctx.shadowColor=s.col+'77';
  ctx.beginPath(); ctx.roundRect(-10,-10,20,20,4); ctx.fill(); ctx.stroke(); ctx.shadowBlur=0;
  ctx.fillStyle=s.col; ctx.shadowBlur=8; ctx.shadowColor=s.col; ctx.font='bold 10px Arial'; ctx.textAlign='center';
  ctx.fillText('☠',0,5); ctx.shadowBlur=0;
  // Shoulder spikes
  for(let ss=-1;ss<=1;ss+=2){
    ctx.save(); ctx.translate(ss*12,-5);
    ctx.fillStyle='#1a0a2a'; ctx.strokeStyle=s.col; ctx.lineWidth=0.8;
    ctx.beginPath(); ctx.moveTo(0,-7); ctx.lineTo(ss*5,0); ctx.lineTo(0,5); ctx.lineTo(ss*-3,0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle=s.col; ctx.lineWidth=1.5; ctx.shadowBlur=5; ctx.shadowColor=s.col;
    ctx.beginPath(); ctx.moveTo(0,-7); ctx.lineTo(0,-13); ctx.stroke(); ctx.shadowBlur=0;
    ctx.restore();
  }

  // Gun arm
  ctx.save(); ctx.translate(11,-4);
  const saG=spaceman&&spaceman.alive?Math.atan2(spaceman.y-(s.y+bob),spaceman.x-s.x)*(s.facingRight?1:-1)*0.4:0;
  ctx.rotate(Math.max(-0.6,Math.min(0.6,saG)));
  ctx.fillStyle='#1a0a2a'; ctx.strokeStyle=s.col+'66'; ctx.lineWidth=0.8;
  ctx.beginPath(); ctx.roundRect(0,-3,10,6,2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(10,0,3,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(10,-2.5,8,5,2); ctx.fill(); ctx.stroke();
  // Enemy gun
  ctx.fillStyle='#0a0015'; ctx.strokeStyle=s.col; ctx.lineWidth=0.8;
  ctx.beginPath(); ctx.moveTo(18,-3.5); ctx.lineTo(27,-2.5); ctx.lineTo(27,2.5); ctx.lineTo(18,3.5); ctx.closePath(); ctx.fill(); ctx.stroke();
  const gc2=0.4+Math.sin(s.bobPhase*2)*0.3;
  ctx.fillStyle=s.col; ctx.shadowBlur=10; ctx.shadowColor=s.col; ctx.globalAlpha=gc2;
  ctx.beginPath(); ctx.arc(22,0,2.5,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1; ctx.shadowBlur=0;
  if(s.beamTimer>0){const fa=s.beamTimer/10;ctx.shadowBlur=18;ctx.shadowColor=s.col;ctx.fillStyle=s.col;ctx.beginPath();ctx.arc(27,0,5*fa,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}
  ctx.restore();

  // Idle arm
  ctx.save(); ctx.translate(-11,-4); ctx.rotate(-0.2+Math.sin(s.walkPhase)*0.12);
  ctx.fillStyle='#1a0a2a'; ctx.strokeStyle=s.col+'55'; ctx.lineWidth=0.8;
  ctx.beginPath(); ctx.roundRect(-10,-3,10,6,2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(-10,0,3,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-18,-2.5,8,5,2); ctx.fill(); ctx.stroke();
  ctx.restore();

  // Neck ring
  ctx.fillStyle='#2a1a3a'; ctx.strokeStyle=s.col; ctx.lineWidth=1;
  ctx.beginPath(); ctx.roundRect(-5,-13,10,5,2); ctx.fill(); ctx.stroke();

  // Alien helmet
  const ahG=ctx.createRadialGradient(-3,-25,2,0,-22,13);
  ahG.addColorStop(0,'#2a1a3a'); ahG.addColorStop(1,'#0a0015');
  ctx.fillStyle=ahG; ctx.strokeStyle=s.col; ctx.lineWidth=1.5;
  ctx.shadowBlur=8; ctx.shadowColor=s.col+'66';
  ctx.beginPath(); ctx.arc(0,-22,13,0,Math.PI*2); ctx.fill(); ctx.stroke(); ctx.shadowBlur=0;

  // Alien visor (red 3-eyed)
  ctx.save();
  ctx.beginPath(); ctx.ellipse(1,-21,9,10,0,-Math.PI*0.75,Math.PI*0.05); ctx.closePath(); ctx.clip();
  ctx.fillStyle='#1a0000'; ctx.fillRect(-15,-35,30,30);
  const avG=ctx.createRadialGradient(0,-22,0,0,-22,10);
  avG.addColorStop(0,'rgba(255,0,30,0.35)'); avG.addColorStop(1,'rgba(100,0,10,0.5)');
  ctx.fillStyle=avG; ctx.fillRect(-15,-35,30,30);
  const ep2=0.7+Math.sin(s.bobPhase*3)*0.3;
  ctx.shadowBlur=8; ctx.shadowColor='#ff0000'; ctx.fillStyle=`rgba(255,50,50,${ep2})`;
  ctx.beginPath(); ctx.ellipse(-3,-22,1.8,1.2,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(3,-22,1.8,1.2,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0,-19,1.2,0.8,0,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0; ctx.restore();

  ctx.strokeStyle=s.col; ctx.lineWidth=1.5; ctx.shadowBlur=8; ctx.shadowColor=s.col;
  ctx.beginPath(); ctx.ellipse(1,-21,9,10,0,-Math.PI*0.75,Math.PI*0.05); ctx.stroke(); ctx.shadowBlur=0;

  // Double antennae
  ctx.strokeStyle=s.col; ctx.lineWidth=1.5; ctx.shadowBlur=6; ctx.shadowColor=s.col;
  ctx.beginPath(); ctx.moveTo(-5,-34); ctx.lineTo(-8,-42); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(5,-34); ctx.lineTo(8,-42); ctx.stroke();
  ctx.fillStyle=s.col; ctx.beginPath(); ctx.arc(-8,-42,2.5,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(8,-42,2.5,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;

  ctx.restore(); // flip

  // HP bar
  const bw2=26,hr=s.hp/s.maxHp;
  ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.roundRect(-bw2/2-1,-50,bw2+2,4,2); ctx.fill();
  const hc=hr>0.5?s.col:hr>0.25?'#ff8800':'#ff2200';
  ctx.fillStyle=hc; ctx.shadowBlur=5; ctx.shadowColor=hc;
  ctx.beginPath(); ctx.roundRect(-bw2/2,-49,bw2*hr,3,2); ctx.fill(); ctx.shadowBlur=0;

  ctx.restore();
}

// ── Integration ───────────────────────────────────────────
function updateSpacemanSystem() { updateSpaceman(); updateAlienSpaceSuits(); }
function drawSpacemanSystem() { drawAlienSpaceSuits(); drawSpaceman(); }
function resetSpacemanSystem() {
  resetSpaceman(); alienSpaceSuits=[]; suitSpawnTimer=0;
  setTimeout(()=>{ if(typeof running!=='undefined'&&running) initSpaceman(); }, 2000);
}
