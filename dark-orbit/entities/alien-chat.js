// ==================== alien-chat.js ====================
// Alien Ship Chat & Coordination System
// Aliens show speech bubbles — coordinate attacks, plan strategies,
// react to player actions, and communicate with each other.
// Dependencies: aliens[], wave, kills, bossActive, hp, shieldTime
// Draw call: drawAlienChats() — called after all alien ships are drawn

(function () {

  // ── CHAT MESSAGE POOLS — behavior + situation based ─────────────────────

  const CHAT = {

    // Standard approach messages
    normal: [
      '📡 TARGET ACQUIRED',
      '⚡ MOVING TO INTERCEPT',
      '🎯 LOCK ON CONFIRMED',
      '📻 SECTOR BREACHED',
      '🛸 FORMATION ALPHA',
      '🔴 ENGAGE PROTOCOL',
      '☄️ CLOSING DISTANCE',
      '🌑 NO RETREAT ORDER',
    ],

    // Zigzag / fast movers
    zigzag: [
      '💨 EVASIVE PATTERN Z',
      '🌀 DODGE MATRIX ON',
      '⚡ JINK LEFT — JINK RIGHT',
      '💫 THEY CANT HIT ME',
      '🎲 RANDOM VECTOR ENGAGED',
      '🏃 FULL EVASION MODE',
    ],

    // Swarm coordination — group talk
    swarm: [
      '🐝 SWARM UNIT ONLINE',
      '📡 HIVE SIGNAL LOCKED',
      '👥 MAINTAIN FORMATION',
      '🔗 SYNC WITH SWARM',
      '💥 OVERWHELM BY NUMBERS',
      '🌊 FLOOD THE TARGET ZONE',
      '🐜 WORKER CLASS REPORTING',
      '📢 SWARM ATTACK PATTERN 7',
    ],

    // Shooter / Artillery — long range
    shooter: [
      '🎯 TARGETING SOLUTION READY',
      '💣 COMPUTING BALLISTICS',
      '🔭 RANGE: OPTIMAL',
      '⚠️ FIRING SEQUENCE INIT',
      '📐 ANGLE: CONFIRMED',
      '💥 VOLLEY INCOMING!',
      '🎪 YOU CANT DODGE THIS',
      '🛡️ BREACH THEIR DEFENSE',
    ],

    // Suicide / Kamikaze
    suicide: [
      '💀 GLORY TO THE EMPIRE!',
      '☠️ I WILL NOT MISS!',
      '🔥 FOR THE MOTHERSHIP!',
      '💣 SELF-DESTRUCT ARMED',
      '⚡ FINAL APPROACH!',
      '🚀 RAMMING SPEED!!!',
      '😤 HONOR IN SACRIFICE!',
      '💥 COLLISION IMMINENT',
    ],

    // Orbit / Circling behavior
    orbit: [
      '🔄 CIRCLING TARGET',
      '🌀 ORBITAL LOCK ENGAGED',
      '📡 MAINTAINING DISTANCE',
      '⚙️ FINDING WEAK POINT',
      '🎯 PREP DIVE ATTACK',
      '🛸 POSITIONING FOR STRIKE',
    ],

    // Stealth aliens
    stealth: [
      '👁️ CLOAKING ENGAGED',
      '🌑 YOU SEE NOTHING...',
      '🕵️ SHADOW PROTOCOL',
      '🔇 EMISSIONS MASKED',
      '💨 GHOST MODE: ACTIVE',
      '❓ FIND ME IF YOU CAN',
    ],

    // Healer ships
    healer: [
      '💚 REGEN BEAM ACTIVE',
      '🏥 MEDICAL UNIT ONLINE',
      '✅ ALLIES REPAIRED',
      '💉 NANO-HEAL DEPLOYED',
      '🔋 HULL INTEGRITY RESTORED',
      '🩹 KEEP FIGHTING BROTHERS',
    ],

    // Electric aliens
    electric: [
      '⚡ CHARGING DISCHARGE',
      '🌩️ VOLT SYSTEMS ARMED',
      '💛 STATIC FIELD MAX',
      '⚡⚡ DOUBLE SHOCK READY',
      '🔌 POWER SURGE ONLINE',
      '💥 ZAP PROTOCOL ACTIVE',
    ],

    // Shield carriers
    shield_carrier: [
      '🛡️ SHIELDS MAXIMUM',
      '💪 YOU CANT BREAK ME',
      '🏰 FORTRESS ONLINE',
      '🔒 DEFENSE LAYER 1/3',
      '⚔️ TRY TO PENETRATE THIS',
      '🛡️ HOLDING THE LINE',
    ],

    // Bombers
    bomber: [
      '💣 PAYLOAD ARMED',
      '⏱️ DETONATION READY',
      '🔴 BLAST RADIUS: MAX',
      '💥 PROXIMITY FUSE SET',
      '🎯 DROPPING ON TARGET',
      '☢️ WARHEAD PRIMED',
    ],

    // Splitters
    splitter: [
      '🧬 DIVISION PROTOCOL',
      '👾 WE MULTIPLY ON DEATH',
      '🔀 SPLIT SEQUENCE READY',
      '💢 KILL US — WE GROW',
      '🌱 FISSION MATRIX ARMED',
    ],

    // Teleporters
    teleport: [
      '🌀 BLINK IN 3..2..1',
      '🔮 PHASE JUMP READY',
      '⚡ QUANTUM SHIFT ARM',
      '🕳️ ENTERING VOID GATE',
      '💫 YOU CANNOT PREDICT ME',
      '🌌 SPATIAL FOLD ENGAGED',
    ],

    // ── COORDINATION DIALOGUE — aliens talk to each other ───────────────

    coord: [
      '📻 UNIT 2 FLANK LEFT',
      '🛸 UNIT 3 COVER MY SIX',
      '⚔️ PINCER FORMATION GO',
      '📡 SIGNAL CONFIRMED — ATTACK',
      '🎯 FIRE ON MY MARK — NOW',
      '🔴 ALL UNITS CONVERGE',
      '💬 AXIS POINT: PLANET CORE',
      '📢 MAINTAIN COMM SILENCE',
      '🧠 BATTLE AI: CALCULATING',
      '⚡ SYNCHRONIZED ASSAULT',
      '🌊 WAVE FORMATION — EXECUTE',
      '🔗 NEURAL LINK: ESTABLISHED',
    ],

    // ── REACTION: Player takes damage ───────────────────────────────────
    playerHit: [
      '💥 DIRECT HIT! PRESS ON!',
      '🎉 THEIR HULL IS BREACHED!',
      '⚡ TARGET WEAKENING!',
      '🔥 FINISH THEM!',
      '📢 ALL UNITS — THEY ARE DOWN',
      '👑 COMMANDER PLEASED!',
    ],

    // ── REACTION: Low HP self ────────────────────────────────────────────
    lowHp: [
      '⚠️ HULL CRITICAL!',
      '💔 SYSTEMS FAILING...',
      '🆘 REQUESTING BACKUP',
      '🩸 ARMOR DEPLETED!',
      '😤 I WONT GO DOWN EASY',
      '💀 SEND MY COORDINATES...',
    ],

    // ── REACTION: Boss wave ──────────────────────────────────────────────
    bossWave: [
      '👑 MOTHERSHIP APPROACHES!',
      '📡 CLEAR PATH — VIP INCOMING',
      '🎖️ ALL UNITS — HONOR GUARD',
      '⚡ REINFORCE THE FLANK!',
      '🛸 FORMATION DIAMOND — NOW!',
      '☠️ STAND ASIDE — LET IT THROUGH',
    ],

    // ── Wave escalation ──────────────────────────────────────────────────
    highWave: [
      '💀 THEY HAVE SURVIVED TOO LONG',
      '🔥 COMMANDERS ARE WATCHING',
      '⚠️ ELITE UNITS: DEPLOY NOW',
      '🎯 PRIORITY TARGET: ELIMINATE',
    ],

  };

  // ── INTERVAL CONFIG ────────────────────────────────────────────────────
  // How often (frames) each alien considers showing a message
  const BASE_CHAT_INTERVAL = 140;  // ~2.3s at 60fps (reduced from 280 to show more often)
  const CHAT_DURATION = 180;  // how long bubble stays visible (frames)
  const COORD_CHANCE = 0.40; // 40% chance message is coordination type
  const LOWLHP_THRESHOLD = 0.30; // 30% HP remaining triggers low-HP lines

  // ── DRAW CONFIG ───────────────────────────────────────────────────────
  const BUBBLE_PADDING_X = 7;
  const BUBBLE_PADDING_Y = 4;
  const BUBBLE_FONT_SIZE = 7.5;
  const BUBBLE_MAX_WIDTH = 160;
  const BUBBLE_Y_OFFSET = -8; // above the HP bar area

  // ── INTERNAL STATE ────────────────────────────────────────────────────
  let _lastPlayerHp = 99;

  // ── HELPERS ───────────────────────────────────────────────────────────

  function _pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function _poolForAlien(a) {
    const beh = (a.def && a.def.beh) || 'normal';
    if (CHAT[beh]) return CHAT[beh];
    return CHAT.normal;
  }

  // Returns a message for the given alien, mixing in coord/react lines
  function _chooseMessage(a) {
    const hpPct = a.hp / (a.maxHp || 1);

    // Low HP reaction (priority)
    if (hpPct < LOWLHP_THRESHOLD && Math.random() < 0.55) {
      return _pick(CHAT.lowHp);
    }

    // Boss wave announcement
    if (typeof bossActive !== 'undefined' && bossActive && Math.random() < 0.25) {
      return _pick(CHAT.bossWave);
    }

    // High wave excitement
    if (typeof wave !== 'undefined' && wave >= 10 && Math.random() < 0.15) {
      return '🌊 WAVE ' + wave + ' — NO MERCY';
    }

    // Coordination vs behavior-specific
    if (Math.random() < COORD_CHANCE) {
      return _pick(CHAT.coord);
    }

    return _pick(_poolForAlien(a));
  }

  // ── UPDATE ALIEN CHAT STATE ───────────────────────────────────────────
  // Call this once per frame from the main game loop

  window.updateAlienChats = function () {
    if (typeof aliens === 'undefined') return;

    // React to player taking damage
    if (typeof hp !== 'undefined' && hp < _lastPlayerHp) {
      _lastPlayerHp = hp;
      // Make a random visible alien comment on the hit
      const alive = aliens.filter(a => !a.dead && a.y > 0 && a.y < (typeof H !== 'undefined' ? H : 9999));
      if (alive.length > 0) {
        const lucky = _pick(alive);
        lucky.chatMsg = _pick(CHAT.playerHit);
        lucky.chatTimer = CHAT_DURATION;
        lucky.chatOffset = 0;
      }
    } else if (typeof hp !== 'undefined') {
      _lastPlayerHp = hp;
    }

    // Per-alien chat tick
    for (let i = 0; i < aliens.length; i++) {
      const a = aliens[i];
      if (a.dead) continue;

      // Init chat fields if missing
      if (a.chatTimer === undefined) {
        a.chatTimer = 0;
        a.chatMsg = '';
        a.chatOffset = Math.floor(Math.random() * BASE_CHAT_INTERVAL); // stagger starts
        a.chatCd = a.chatOffset;
      }

      // Count down chat display timer
      if (a.chatTimer > 0) {
        a.chatTimer--;
      }

      // Count down cooldown before next message
      if (a.chatCd > 0) {
        a.chatCd--;
        continue;
      }

      // Only show message if alien is on screen
      if (a.x < -60 || a.x > (typeof W !== 'undefined' ? W + 60 : 9999)) continue;
      if (a.y < -60 || a.y > (typeof H !== 'undefined' ? H + 60 : 9999)) continue;

      // Assign new message
      a.chatMsg = _chooseMessage(a);
      a.chatTimer = CHAT_DURATION;

      // Random interval until next message (vary so not all sync)
      a.chatCd = Math.floor(BASE_CHAT_INTERVAL * (0.7 + Math.random() * 1.2));
    }
  };

  // ── DRAW ALL ALIEN CHAT BUBBLES ───────────────────────────────────────
  // Call this AFTER all alien ships have been drawn each frame

  window.drawAlienChats = function () {
    if (typeof aliens === 'undefined' || typeof ctx === 'undefined') return;

    ctx.save();
    ctx.font = 'bold ' + BUBBLE_FONT_SIZE + 'px Orbitron, Arial';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    for (let i = 0; i < aliens.length; i++) {
      const a = aliens[i];
      if (a.dead || !a.chatMsg || a.chatTimer <= 0) continue;

      // Fade in/out: full for middle frames, fade edges
      const progress = a.chatTimer / CHAT_DURATION;
      let alpha;
      if (progress > 0.85) {
        // Fade in (first 15% of life)
        alpha = (1 - progress) / 0.15;
      } else if (progress < 0.18) {
        // Fade out (last 18% of life)
        alpha = progress / 0.18;
      } else {
        alpha = 1.0;
      }
      alpha = Math.max(0, Math.min(1, alpha));
      if (alpha < 0.01) continue;

      // Bubble floats upward as it ages
      const floatY = (1 - progress) * 18;

      const bx = a.x;
      const by = a.y - (a.r || 12) + BUBBLE_Y_OFFSET - floatY;

      // Measure text
      const tw = Math.min(ctx.measureText(a.chatMsg).width, BUBBLE_MAX_WIDTH);
      const bw = tw + BUBBLE_PADDING_X * 2;
      const bh = BUBBLE_FONT_SIZE + BUBBLE_PADDING_Y * 2;

      // Clamp to screen edges
      const rx = Math.max(4, Math.min((typeof W !== 'undefined' ? W : 800) - bw - 4, bx - bw / 2));
      const ry = Math.max(4, by - bh / 2);

      const col = (a.def && a.def.col) || '#aa44ff';

      ctx.globalAlpha = alpha * 0.93;

      // ── Bubble background ─────────────────────────────────────────────
      ctx.fillStyle = 'rgba(0,0,12,0.82)';
      _roundRect(ctx, rx, ry, bw, bh, 5);
      ctx.fill();

      // ── Colored border ────────────────────────────────────────────────
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.2;
      ctx.shadowBlur = 6;
      ctx.shadowColor = col;
      _roundRect(ctx, rx, ry, bw, bh, 5);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // ── Small tail pointing down toward alien ─────────────────────────
      const tailX = Math.max(rx + 8, Math.min(rx + bw - 8, bx));
      ctx.fillStyle = col;
      ctx.globalAlpha = alpha * 0.75;
      ctx.beginPath();
      ctx.moveTo(tailX - 4, ry + bh);
      ctx.lineTo(tailX + 4, ry + bh);
      ctx.lineTo(tailX, ry + bh + 5);
      ctx.closePath();
      ctx.fill();

      // ── Message text ──────────────────────────────────────────────────
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#e8f4ff';
      ctx.shadowBlur = 3;
      ctx.shadowColor = col;
      // Clip text if too long
      const displayMsg = a.chatMsg.length > 28 ? a.chatMsg.slice(0, 27) + '…' : a.chatMsg;
      ctx.fillText(displayMsg, rx + BUBBLE_PADDING_X, ry + bh / 2);
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  };

  // ── UTILITY: rounded rect path helper ────────────────────────────────
  function _roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }

  // ── RESET on new game ─────────────────────────────────────────────────
  window.resetAlienChats = function () {
    _lastPlayerHp = 99;
    if (typeof aliens !== 'undefined') {
      aliens.forEach(a => {
        a.chatMsg = '';
        a.chatTimer = 0;
        a.chatCd = 0;
      });
    }
  };

})();
