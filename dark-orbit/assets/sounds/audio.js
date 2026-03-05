// ==================== audio.js ====================
// Sari audio, sound effects, aur voice functions yahan hain
// Dependencies (global variables from game): audioCtx, isMuted, bgMusicOsc, girlVoice,
//   lastVoiceTime, VOICES_KILL, VOICES_KILL_STREAK, VOICES_HIT, VOICES_BOSS_INCOMING,
//   VOICES_BOSS_PHASE, VOICES_BOSS_LOW, VOICES_BOSS_DEAD, VOICES_WAVE, VOICES_WEAPON,
//   _killVoiceIdx, _hitVoiceIdx, _killStreak, _lastKillTime

// ==================== AUDIO INIT ====================

function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}
// Function ke BAHAR — bilkul alag
document.addEventListener('click', initAudio, { once: false });
document.addEventListener('keydown', initAudio, { once: false });
document.addEventListener('touchstart', initAudio, { once: false });

function toggleMute() {
  isMuted = !isMuted;
  document.getElementById('mute-btn').textContent = isMuted ? '🔇' : '🔊';
  SAVE.set('muted', isMuted);
}

// ==================== SOUND EFFECTS ====================

function playTone(freq, dur, type, vol) {
  try {
    if (isMuted || !audioCtx) return;
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, audioCtx.currentTime);
    g.gain.setValueAtTime(vol || .1, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(.001, audioCtx.currentTime + dur);
    o.start(); o.stop(audioCtx.currentTime + dur);
  } catch (e) { }
}

function playExplosion(size, funny) {
  funny = funny === undefined ? false : funny;
  try {
    if (isMuted || !audioCtx) return;
    if (funny) {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination);
      o.type = 'sawtooth'; o.frequency.setValueAtTime(200, audioCtx.currentTime);
      o.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.3);
      g.gain.setValueAtTime(0.2, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      o.start(); o.stop(audioCtx.currentTime + 0.3);
    } else {
      const b = audioCtx.createBuffer(1, audioCtx.sampleRate * .2, audioCtx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * .05 * size));
      const s = audioCtx.createBufferSource(), g = audioCtx.createGain();
      s.buffer = b; s.connect(g); g.connect(audioCtx.destination);
      g.gain.value = Math.min(size * .25, .4); s.start();
    }
  } catch (e) { }
}

function playBossMusic() {
  try {
    if (isMuted || !audioCtx) return;
    if (bgMusicOsc) { try { bgMusicOsc.stop(); } catch (e) { } }
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    o.type = 'sawtooth'; o.frequency.setValueAtTime(55, audioCtx.currentTime);
    g.gain.setValueAtTime(0.1, audioCtx.currentTime);
    o.start(); bgMusicOsc = o;
    setTimeout(() => { if (bgMusicOsc === o) { try { o.stop(); bgMusicOsc = null; } catch (e) { } }; }, 10000);
  } catch (e) { }
}

function stopBossMusic() {
  if (bgMusicOsc) { try { bgMusicOsc.stop(); bgMusicOsc = null; } catch (e) { } }
}

function playVictoryFanfare() {
  try {
    if (isMuted || !audioCtx) return;
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    const timing = [0, .15, .3, .45, .6, .75, .9];
    notes.forEach((freq, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination);
      o.type = 'sine'; o.frequency.setValueAtTime(freq, audioCtx.currentTime + timing[i]);
      g.gain.setValueAtTime(.2, audioCtx.currentTime + timing[i]);
      g.gain.exponentialRampToValueAtTime(.001, audioCtx.currentTime + timing[i] + .4);
      o.start(audioCtx.currentTime + timing[i]);
      o.stop(audioCtx.currentTime + timing[i] + .4);
    });
  } catch (e) { }
}

// ==================== VOICE SYSTEM — GIRL COMMANDER ====================

function initVoice() {
  if (!window.speechSynthesis) return;
  const load = () => {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return;
    // Priority: Google US English Female > Samantha > any en-GB/en-AU female > any female
    const pref = [
      v => v.name.includes('Google') && v.name.includes('Female'),
      v => v.name === 'Samantha',
      v => v.name.includes('Google') && v.lang.startsWith('en'),
      v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female'),
      v => v.lang.startsWith('en-US'),
      v => v.lang.startsWith('en-GB'),
      v => v.lang.startsWith('en'),
    ];
    for (const test of pref) {
      const found = voices.find(test);
      if (found) { girlVoice = found; break; }
    }
    if (!girlVoice && voices.length) girlVoice = voices[0];
  };
  load();
  window.speechSynthesis.addEventListener('voiceschanged', load);

}

// Core speak engine
function speakVoice(text, pitch = 1, rate = 0.5, vol = 1) {
  try {
    if (isMuted) return;
    if (!window.speechSynthesis) return;
    const now = Date.now();
    if (now - lastVoiceTime < 700) return;   // global debounce 700ms
    lastVoiceTime = now;
    window.speechSynthesis.cancel();         // stop any current speech
    const msg = new SpeechSynthesisUtterance(text);
    if (girlVoice) msg.voice = girlVoice;
    msg.lang = 'en-US';
    msg.pitch = pitch;
    msg.rate = rate;
    msg.volume = vol;
    window.speechSynthesis.speak(msg);
  } catch (e) { }
}

// ── VOICE BANKS ──────────────────────────────────────────────────────────────

function playKillVoice() {
  // Streak tracking
  const now = Date.now();
  if (now - _lastKillTime < 3000) _killStreak++; else _killStreak = 1;
  _lastKillTime = now;

  let text;
  if (_killStreak >= 6 && _killStreak % 3 === 0) {
    text = VOICES_KILL_STREAK[Math.floor(Math.random() * VOICES_KILL_STREAK.length)];
  } else {
    text = VOICES_KILL[_killVoiceIdx % VOICES_KILL.length];
    _killVoiceIdx++;
  }
  speakVoice(text, 1.4, 1.2, 0.85);

  // Beep chime
  try {
    if (!audioCtx || isMuted) return;
    [[880, 0], [660, 0.08], [440, 0.16]].forEach(([f, d]) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination);
      o.type = 'sine'; o.frequency.setValueAtTime(f, audioCtx.currentTime + d);
      g.gain.setValueAtTime(.1, audioCtx.currentTime + d);
      g.gain.exponentialRampToValueAtTime(.001, audioCtx.currentTime + d + .15);
      o.start(audioCtx.currentTime + d); o.stop(audioCtx.currentTime + d + .15);
    });
  } catch (e) { }
}

function playHitVoice() {
  const text = VOICES_HIT[_hitVoiceIdx % VOICES_HIT.length];
  _hitVoiceIdx++;
  speakVoice(text, 1.1, 1.4, 0.9);

  // Alert alarm
  try {
    if (!audioCtx || isMuted) return;
    [200, 150, 200].forEach((f, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination);
      o.type = 'sawtooth'; o.frequency.setValueAtTime(f, audioCtx.currentTime + i * .12);
      g.gain.setValueAtTime(.18, audioCtx.currentTime + i * .12);
      g.gain.exponentialRampToValueAtTime(.001, audioCtx.currentTime + i * .12 + .2);
      o.start(audioCtx.currentTime + i * .12); o.stop(audioCtx.currentTime + i * .12 + .2);
    });
  } catch (e) { }
}

function playBossWarningVoice() {
  speakVoice(VOICES_BOSS_INCOMING[Math.floor(Math.random() * VOICES_BOSS_INCOMING.length)], 1.0, 1.1, 1.0);
}
function playBossPhaseVoice() {
  speakVoice(VOICES_BOSS_PHASE[Math.floor(Math.random() * VOICES_BOSS_PHASE.length)], 1.1, 1.2, 0.9);
}
function playBossLowVoice() {
  speakVoice(VOICES_BOSS_LOW[Math.floor(Math.random() * VOICES_BOSS_LOW.length)], 1.2, 1.3, 0.9);
}
function playBossDeadVoice() {
  speakVoice(VOICES_BOSS_DEAD[Math.floor(Math.random() * VOICES_BOSS_DEAD.length)], 1.3, 1.1, 1.0);
}
function playWaveVoice() {
  speakVoice(VOICES_WAVE[Math.floor(Math.random() * VOICES_WAVE.length)], 1.3, 1.2, 0.85);
}
function playHeavyWeaponVoice() {
  speakVoice(VOICES_WEAPON[Math.floor(Math.random() * VOICES_WEAPON.length)], 1.4, 1.3, 0.8);
}

// ══════════════════════════════════════════════════════════════════
// COMMANDER VOICE ENGINE
// ── Standalone Web Speech API layer (does NOT replace existing) ──
// ══════════════════════════════════════════════════════════════════

(function () {

  // ── State ──────────────────────────────────────────────────────
  var _cve_voice = null;
  var _cve_ready = false;
  var _cve_unlocked = false;
  var _cve_lastSpeak = 0;
  var _cve_MIN_GAP_MS = 1100;
  var _cve_speaking = false;

  // ── Voice bank ──────────────────────────────────────────────────
  var _cve_lines = {
    kill: ['Hostile eliminated!', 'Target down!', 'Nice shot Commander!', 'Enemy destroyed!', 'Vaporized!', 'Kill confirmed!'],
    streak: ['Double kill!', 'Triple kill — on fire!', 'Killing spree Commander!', 'Unstoppable!'],
    hit: ['Hull breach!', 'We are hit!', 'Taking damage!', 'Shields compromised!', 'Brace for impact!'],
    boss: ['Mothership incoming! All hands to battle stations!', 'Boss detected — prepare weapons!', 'Enemy capital ship approaching!'],
    bossPhase: ['Boss phase change! Stay sharp!', 'It is getting stronger!', 'New phase detected — adapt!'],
    bossLow: ['Boss is critical — finish it!', 'Almost there Commander, push harder!', 'One last push!'],
    bossDead: ['Mothership destroyed! Outstanding!', 'Boss eliminated — victory is ours!', 'Enemy commander defeated!'],
    wave: ['New wave incoming!', 'Enemy formation detected!', 'Incoming hostiles — open fire!'],
    shield: ['Shields activated!', 'Force field online!'],
    nuke: ['Nuke deployed!', 'Maximum firepower!'],
    freeze: ['Time freeze active!', 'Cryo field engaged!'],
    pickup: ['Power-up acquired!', 'Upgrade collected!'],
    weapon: ['Heavy weapon fired!', 'Unleashing devastation!'],
    lowAmmo: ['Low on ammo Commander!', 'Ammo critical!'],
    lowHp: ['Hull integrity critical!', 'Warning — life support failing!'],

    // ── Every-20-kills hype: short English + 1-2 Urdu words ──────
    killMilestone: [
      'Zabardast! Fifty down! You are on fire Commander!',
      'Aray wah! Half century! Incredible shooting!',
      'Kya baat hai! Fifty more bites the dust!',
      'Wah wah! Fifty enemies destroyed, keep going!',
      'Aray yaar, fifty kills! They are terrified of you!',
      'Shukriya Commander, fifty more eliminated!',
      'Zabardast! Another fifty down, unstoppable!',
      'Aray wah, fifty kills milestone! Legendary!',
    ],

    // ── Player hit: pain + funny reaction ────────────────────────
    playerHit: [
      'Aray! We took a hit Commander, evasive action now!',
      'Oof! That hurt, please dodge next time!',
      'Aray baba, hull is complaining loudly!',
      'Hay! Who let that through, not cool!',
      'Ouch! My beautiful ship is hurting!',
      'Aray yaar, that really really stings!',
      'Oh no no no! Not the hull again!',
      'Commander please! My circuits are shaking!',
      'Aray wah, another hit! Are we trying to die?!',
      'Bas bas! Stop getting hit, I beg you!',
    ],

    // ── Rare firing quip ─────────────────────────────────────────
    firingQuip: [
      'Boom! Take that!',
      'Come on, who is next?!',
      'Too easy!',
      'Is that all you got?!',
      'Ha! Missed me!',
      'Fire in the hole!',
      'Don\'t mess with us!',
      'Feel the heat!',
      'Target practice time!',
      'I could do this all day!',
    ],

    // ── Boss incoming: dark, warning, horror ─────────────────────
    bossIncoming: [
      'It is here. The Mothership. God help us all.',
      'Something ancient approaches. Something... evil.',
      'Commander. That thing on radar. I have never seen anything like it.',
      'The darkness has arrived. We cannot run. We cannot hide.',
      'It is watching us. And it is very, very angry.',
    ],

    // ── Boss low HP ───────────────────────────────────────────────
    bossLow: [
      'It is dying... but why does it feel like it is... smiling?',
      'Almost... almost dead. Do not stop now Commander. Do not.',
      'It is wounded. It is furious. Finish it. Now.',
      'Commander... it is weakening. But something feels wrong.',
      'One more push. Before it does something we cannot survive.',
    ],

    // ── Boss destroyed ────────────────────────────────────────────
    bossDead: [
      'It is destroyed! We are alive! We actually survived!',
      'The Mothership is gone! I cannot believe it! Amazing!',
      'Dead! It is dead! You magnificent Commander, you did it!',
      'The beast is slain! Victory! Sweet terrifying victory!',
      'It is over. For now. Well done Commander. Well done.',
    ],

    // ── Mission complete ──────────────────────────────────────────
    missionVictory: [
      'Zabardast Commander! Mission complete! You are incredible!',
      'Wah wah! Stage cleared! I knew you could do it!',
      'Kya baat hai! Another mission crushed! Absolutely flawless!',
      'Mission accomplished Commander! Shukriya for the heroics!',
      'Aray wah! Sector secured! On to the next one Commander!',
    ],
  };

  var _cve_idx = {};

  // ── Per-boss one-shot flags ────────────────────────────────────
  var _cve_bossIncomingPlayed = false;
  var _cve_bossLowPlayed = false;
  var _cve_bossDeadPlayed = false;
  var _cve_missionVoicePlayed = false;

  // Reset karo har new boss ke liye
  window._cveResetBossFlags = function () {
    _cve_bossIncomingPlayed = false;
    _cve_bossLowPlayed = false;
    _cve_bossDeadPlayed = false;
    _cve_missionVoicePlayed = false;
  };

  // ── Voice selection ─────────────────────────────────────────────
  function _cve_selectVoice() {
    if (!window.speechSynthesis) return;
    var voices = window.speechSynthesis.getVoices();
    if (!voices.length) return;
    var pref = [
      function (v) { return v.name.includes('Google') && v.name.toLowerCase().includes('female'); },
      function (v) { return v.name === 'Samantha'; },
      function (v) { return v.name.includes('Google') && v.lang.startsWith('en'); },
      function (v) { return v.lang.startsWith('en') && v.name.toLowerCase().includes('female'); },
      function (v) { return v.lang.startsWith('en-US'); },
      function (v) { return v.lang.startsWith('en-GB'); },
      function (v) { return v.lang.startsWith('en'); },
    ];
    for (var pi = 0; pi < pref.length; pi++) {
      var found = voices.find(pref[pi]);
      if (found) { _cve_voice = found; break; }
    }
    if (!_cve_voice && voices.length) _cve_voice = voices[0];
    _cve_ready = true;
  }

  if (window.speechSynthesis) {
    _cve_selectVoice();
    window.speechSynthesis.addEventListener('voiceschanged', _cve_selectVoice);

  }

  // ── Audio unlock on first user gesture ─────────────────────────
  function _cve_unlock() {
    if (_cve_unlocked) return;
    _cve_unlocked = true;
    try {
      var warm = new SpeechSynthesisUtterance('\u200B');
      warm.volume = 0;
      warm.rate = 2;
      if (_cve_voice) warm.voice = _cve_voice;
      window.speechSynthesis.speak(warm);
    } catch (e) { }
  }
  document.addEventListener('pointerdown', _cve_unlock, { passive: true });
  document.addEventListener('click', _cve_unlock, { passive: true });

  // ── Core speak function ─────────────────────────────────────────
  window.cmdSpeak = function (type, _unused) {
    try {
      if (isMuted) return;
      if (!window.speechSynthesis) return;
      if (!_cve_unlocked) return;
      if (!_cve_ready) _cve_selectVoice();

      var now = Date.now();
      if (now - _cve_lastSpeak < _cve_MIN_GAP_MS) return;
      if (_cve_speaking) return;

      var text, pitch = 1.35, rate = 1.2, vol = 0.88;

      if (typeof type === 'object' && type !== null) {
        var o = type;
        text = o.text || '';
        pitch = (o.pitch != null) ? o.pitch : pitch;
        rate = (o.rate != null) ? o.rate : rate;
        vol = (o.vol != null) ? o.vol : vol;
      } else {
        var bank = _cve_lines[type];
        if (!bank || !bank.length) return;
        if (_cve_idx[type] == null) _cve_idx[type] = 0;
        text = bank[_cve_idx[type] % bank.length];
        _cve_idx[type]++;
      }

      if (!text) return;

      window.speechSynthesis.cancel();

      var msg = new SpeechSynthesisUtterance(text);
      if (_cve_voice) msg.voice = _cve_voice;
      msg.lang = 'en-US';
      msg.pitch = pitch;
      msg.rate = rate;
      msg.volume = vol;

      msg.onstart = function () { _cve_speaking = true; };
      msg.onend = function () { _cve_speaking = false; };
      msg.onerror = function () { _cve_speaking = false; };

      _cve_lastSpeak = now;
      window.speechSynthesis.speak(msg);

    } catch (e) { _cve_speaking = false; }
  };

  // ── Debug helpers ───────────────────────────────────────────────
  window._cveDebug = function () {
    return {
      ready: _cve_ready,
      unlocked: _cve_unlocked,
      voice: _cve_voice ? _cve_voice.name : 'none',
      speaking: _cve_speaking,
      msSinceLast: Date.now() - _cve_lastSpeak,
      minGapMs: _cve_MIN_GAP_MS,
      types: Object.keys(_cve_lines)
    };
  };
  window._cveSetGap = function (ms) { _cve_MIN_GAP_MS = ms; };

  // ── Boss horror voice wrappers ──────────────────────────────────
  window._cveBossIncoming = function () {
    if (_cve_bossIncomingPlayed) return;
    _cve_bossIncomingPlayed = true;
    var lines = _cve_lines.bossIncoming;
    if (!_cve_idx.bossIncoming) _cve_idx.bossIncoming = 0;
    var text = lines[_cve_idx.bossIncoming % lines.length];
    _cve_idx.bossIncoming++;
    window.cmdSpeak({ text: text, pitch: 0.75, rate: 0.78, vol: 0.95 });
  };

  window._cveBossLow = function () {
    if (_cve_bossLowPlayed) return;
    _cve_bossLowPlayed = true;
    var lines = _cve_lines.bossLow;
    if (!_cve_idx.bossLow) _cve_idx.bossLow = 0;
    var text = lines[_cve_idx.bossLow % lines.length];
    _cve_idx.bossLow++;
    window.cmdSpeak({ text: text, pitch: 0.82, rate: 0.72, vol: 0.92 });
  };

  window._cveBossDead = function () {
    if (_cve_bossDeadPlayed) return;
    _cve_bossDeadPlayed = true;
    var lines = _cve_lines.bossDead;
    if (!_cve_idx.bossDead) _cve_idx.bossDead = 0;
    var text = lines[_cve_idx.bossDead % lines.length];
    _cve_idx.bossDead++;
    window.cmdSpeak({ text: text, pitch: 1.35, rate: 1.05, vol: 1.0 });
  };

  window._cveMissionVictory = function () {
    if (_cve_missionVoicePlayed) return;
    _cve_missionVoicePlayed = true;
    var lines = _cve_lines.missionVictory;
    if (!_cve_idx.missionVictory) _cve_idx.missionVictory = 0;
    var text = lines[_cve_idx.missionVictory % lines.length];
    _cve_idx.missionVictory++;
    window.cmdSpeak({ text: text, pitch: 1.4, rate: 1.15, vol: 0.95 });
  };

})();

// ── End COMMANDER VOICE ENGINE ────────────────────────────────────
