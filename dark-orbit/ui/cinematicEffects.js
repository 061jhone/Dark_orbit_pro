// ================= CINEMATIC EFFECTS SYSTEM =================

let cinematicEffects = [];

function addCinematicExplosion(x, y, color){
  cinematicEffects.push({
    x,
    y,
    radius: 0,
    maxRadius: 90,
    alpha: 1,
    color: color || '#ff4444'
  });
}

function addHorrorFlash(){
  cinematicEffects.push({
    flash: true,
    alpha: 0.15
  });
}

function drawCinematicEffects(ctx, W, H){

  for(let i = cinematicEffects.length - 1; i >= 0; i--){
    const e = cinematicEffects[i];

    // ===== Shockwave Ring =====
    if(!e.flash){
      ctx.save();

      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(255,0,0,${e.alpha})`;
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.restore();

      e.radius += 4;
      e.alpha -= 0.03;

      if(e.alpha <= 0){
        cinematicEffects.splice(i,1);
      }
    }

    // ===== Horror Screen Flash =====
    else{
      ctx.save();

      ctx.fillStyle = `rgba(150,0,0,${e.alpha})`;
      ctx.fillRect(0,0,W,H);

      ctx.restore();

      e.alpha *= 0.85;

      if(e.alpha <= 0.02){
        cinematicEffects.splice(i,1);
      }
    }
  }
}
