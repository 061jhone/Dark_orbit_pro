// ==================== iap.js ====================
// Coin Pack In-App Purchase System
// Designed for Capacitor + Google Play Billing
// Load LAST in index.html (after game.js)
//
// ─── HOW IT WORKS ────────────────────────────────────────────────────────────
//  1. In browser/dev mode  → simulates purchase instantly (TEST MODE)
//  2. In Capacitor Android → uses @capacitor-community/in-app-purchases plugin
//     Install: npm install @capacitor-community/in-app-purchases
//     Then:    npx cap sync
// ─────────────────────────────────────────────────────────────────────────────

(function () {

  // ── COIN PACKS — set SKU IDs to match Google Play Console exactly ──────────
  const COIN_PACKS = [
    {
      sku:     'coins_starter',          // Google Play product ID
      name:    'STARTER PACK',
      coins:   500,
      bonus:   0,
      icon:    '🪙',
      price:   '₨ 149',                  // Display price (real price from Play Store)
      color:   '#ffd700',
      tag:     null
    },
    {
      sku:     'coins_popular',
      name:    'COMMANDER PACK',
      coins:   1500,
      bonus:   300,                       // +300 bonus coins
      icon:    '💰',
      price:   '₨ 349',
      color:   '#00ffb4',
      tag:     '⭐ POPULAR'
    },
    {
      sku:     'coins_elite',
      name:    'ELITE PACK',
      coins:   4000,
      bonus:   1500,
      icon:    '💎',
      price:   '₨ 799',
      color:   '#aa44ff',
      tag:     '🔥 BEST VALUE'
    },
    {
      sku:     'coins_ultimate',
      name:    'ULTIMATE PACK',
      coins:   10000,
      bonus:   5000,
      icon:    '👑',
      price:   '₨ 1499',
      color:   '#ff8800',
      tag:     '👑 ULTIMATE'
    }
  ];

  // ── REMOVE ADS SKU ─────────────────────────────────────────────────────────
  const REMOVE_ADS_SKU = 'remove_ads_lifetime';

  // ── CAPACITOR PLUGIN DETECTION ─────────────────────────────────────────────
  let _iapPlugin = null;
  let _adsRemoved = SAVE.get('adsRemoved') || false;

  async function _initPlugin() {
    try {
      // Only available in Capacitor environment
      if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        const { InAppPurchase2 } = await import('@capacitor-community/in-app-purchases');
        _iapPlugin = InAppPurchase2;
        await _iapPlugin.initialize();
        console.log('[IAP] Plugin initialized');
      }
    } catch (e) {
      console.log('[IAP] Running in browser mode — TEST purchases active');
    }
  }

  // ── PURCHASE FLOW ──────────────────────────────────────────────────────────
  async function purchasePack(sku) {
    const pack = COIN_PACKS.find(p => p.sku === sku);
    if (!pack) return;

    // Close shop temporarily
    closeShop && closeShop();

    if (_iapPlugin) {
      // === REAL PURCHASE (Capacitor / Google Play) ===
      try {
        _showPurchaseOverlay('Processing…');
        const result = await _iapPlugin.purchaseProduct({ productIdentifier: sku });
        if (result && result.transactionId) {
          await _iapPlugin.finishTransaction({ transactionId: result.transactionId });
          _grantCoins(pack);
          _hidePurchaseOverlay();
        } else {
          _hidePurchaseOverlay();
          _showPurchaseResult('❌ Purchase cancelled', '#ff4444');
        }
      } catch (err) {
        _hidePurchaseOverlay();
        _showPurchaseResult('❌ Purchase failed. Try again.', '#ff4444');
        console.error('[IAP] Error:', err);
      }
    } else {
      // === TEST / BROWSER MODE ===
      _showPurchaseOverlay('⚙️ TEST MODE — Purchase simulated…');
      await _sleep(1200);
      _hidePurchaseOverlay();
      _grantCoins(pack);
    }
  }

  async function purchaseRemoveAds() {
    if (_adsRemoved) {
      _showPurchaseResult('✅ Ads already removed!', '#00ffb4');
      return;
    }

    if (_iapPlugin) {
      try {
        _showPurchaseOverlay('Removing ads…');
        const result = await _iapPlugin.purchaseProduct({ productIdentifier: REMOVE_ADS_SKU });
        if (result && result.transactionId) {
          await _iapPlugin.finishTransaction({ transactionId: result.transactionId });
          _applyRemoveAds();
          _hidePurchaseOverlay();
        }
      } catch (e) {
        _hidePurchaseOverlay();
        _showPurchaseResult('❌ Purchase failed.', '#ff4444');
      }
    } else {
      _showPurchaseOverlay('⚙️ TEST MODE — Removing ads…');
      await _sleep(1000);
      _applyRemoveAds();
      _hidePurchaseOverlay();
    }
  }

  async function restorePurchases() {
    _showPurchaseOverlay('Restoring purchases…');
    try {
      if (_iapPlugin) {
        const restored = await _iapPlugin.restorePurchases();
        const hasRemoveAds = (restored.purchases || []).some(p => p.productIdentifier === REMOVE_ADS_SKU);
        if (hasRemoveAds) _applyRemoveAds();
      }
      await _sleep(800);
      _hidePurchaseOverlay();
      _showPurchaseResult('✅ Purchases restored!', '#00ffb4');
    } catch (e) {
      _hidePurchaseOverlay();
      _showPurchaseResult('❌ Restore failed.', '#ff4444');
    }
  }

  // ── GRANT COINS ────────────────────────────────────────────────────────────
  function _grantCoins(pack) {
    const total = pack.coins + pack.bonus;
    earnCoins(total, true); // silent earnCoins — no floating text (we show own UI)
    openShopMenu && openShopMenu();
    _showPurchaseResult(
      `${pack.icon} +${total.toLocaleString()} COINS ADDED!\n${pack.bonus > 0 ? '(+' + pack.bonus + ' bonus!)' : ''}`,
      pack.color
    );
    // Sound
    try {
      if (!isMuted && audioCtx) {
        const notes = [523, 659, 784, 1047];
        notes.forEach((f, i) => {
          const o = audioCtx.createOscillator(), g = audioCtx.createGain();
          o.connect(g); g.connect(audioCtx.destination);
          o.type = 'sine'; o.frequency.value = f;
          g.gain.setValueAtTime(0.18, audioCtx.currentTime + i * 0.1);
          g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.1 + 0.3);
          o.start(audioCtx.currentTime + i * 0.1);
          o.stop(audioCtx.currentTime + i * 0.1 + 0.3);
        });
      }
    } catch (e) {}
  }

  // ── REMOVE ADS ─────────────────────────────────────────────────────────────
  function _applyRemoveAds() {
    _adsRemoved = true;
    SAVE.set('adsRemoved', true);
    const banner = document.getElementById('ad-banner');
    if (banner) banner.style.display = 'none';
    _showPurchaseResult('🚫 ADS REMOVED! Enjoy the game!', '#00ffb4');
  }

  // ── IAP STORE UI ───────────────────────────────────────────────────────────
  function _buildIAPPanel() {
    if (document.getElementById('iap-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'iap-panel';
    panel.style.cssText = [
      'display:none;position:fixed;inset:0;z-index:500',
      'background:rgba(0,0,10,0.96)',
      'overflow-y:auto;-webkit-overflow-scrolling:touch'
    ].join(';');

    panel.innerHTML = `
      <div style="max-width:420px;margin:0 auto;padding:20px 14px 40px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">
          <div style="font-family:Orbitron,monospace;font-size:13px;font-weight:900;letter-spacing:3px;color:#ffd700">
            💎 COIN STORE
          </div>
          <button onclick="IAP.close()" style="background:none;border:1px solid rgba(255,255,255,.2);color:#aaa;border-radius:5px;padding:4px 10px;font-size:11px;cursor:pointer;font-family:Orbitron,monospace">✕ CLOSE</button>
        </div>
        <div style="text-align:center;font-family:Orbitron,monospace;font-size:9px;color:#aaa;letter-spacing:2px;margin-bottom:16px">
          YOUR BALANCE: <span id="iap-balance" style="color:#ffd700;font-weight:900"></span> 🪙
        </div>

        <div id="iap-packs-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px"></div>

        <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:14px;margin-top:4px">
          <div style="font-family:Orbitron,monospace;font-size:9px;color:#aaa;letter-spacing:2px;text-align:center;margin-bottom:10px">VIP UPGRADE</div>
          <div id="iap-remove-ads-btn" onclick="IAP.removeAds()" style="
            background:linear-gradient(135deg,rgba(255,80,80,0.15),rgba(200,0,0,0.08));
            border:1.5px solid rgba(255,80,80,0.4);
            border-radius:10px;padding:12px;text-align:center;cursor:pointer;
            font-family:Orbitron,monospace
          ">
            <div style="font-size:20px;margin-bottom:4px">🚫📺</div>
            <div style="font-size:10px;font-weight:900;color:#ff8888;letter-spacing:2px">REMOVE ADS FOREVER</div>
            <div style="font-size:8px;color:#aaa;margin-top:2px">ONE-TIME PURCHASE</div>
            <div style="font-size:13px;font-weight:900;color:#ff4444;margin-top:6px">₨ 499</div>
          </div>
          <div onclick="IAP.restore()" style="
            text-align:center;margin-top:10px;
            font-family:Orbitron,monospace;font-size:8px;color:rgba(150,150,200,0.5);
            letter-spacing:1px;cursor:pointer;text-decoration:underline
          ">Restore previous purchases</div>
        </div>

        <div style="margin-top:16px;padding:10px;background:rgba(0,255,180,0.04);border:1px solid rgba(0,255,180,0.1);border-radius:8px;font-family:Orbitron,monospace;font-size:7px;color:rgba(0,255,180,0.4);text-align:center;letter-spacing:1px;line-height:1.7">
          All purchases are processed by Google Play.<br>
          Coins are added instantly to your account.<br>
          For support: support@darkorbitpro.com
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    _populatePacks();

    // Close on backdrop tap (outside content)
    panel.addEventListener('pointerdown', function (e) {
      if (e.target === panel) IAP.close();
    });
  }

  function _populatePacks() {
    const grid = document.getElementById('iap-packs-grid');
    if (!grid) return;
    grid.innerHTML = '';

    COIN_PACKS.forEach(function (p) {
      const card = document.createElement('div');
      card.style.cssText = [
        'background:rgba(0,0,0,0.5)',
        'border:1.5px solid ' + p.color.replace(')', ',0.4)').replace('rgb', 'rgba'),
        'border-radius:12px;padding:12px 8px;text-align:center',
        'cursor:pointer;position:relative;overflow:hidden',
        'transition:transform 0.15s,border-color 0.15s'
      ].join(';');

      card.innerHTML = `
        ${p.tag ? `<div style="position:absolute;top:0;right:0;background:${p.color};color:#000;font-size:6px;font-weight:900;letter-spacing:0.5px;padding:3px 6px;border-radius:0 10px 0 6px;font-family:Orbitron,monospace">${p.tag}</div>` : ''}
        <div style="font-size:28px;margin-bottom:6px">${p.icon}</div>
        <div style="font-family:Orbitron,monospace;font-size:8px;font-weight:900;color:${p.color};letter-spacing:1.5px;margin-bottom:4px">${p.name}</div>
        <div style="font-family:Orbitron,monospace;font-size:16px;font-weight:900;color:${p.color}">${p.coins.toLocaleString()}</div>
        <div style="font-family:Orbitron,monospace;font-size:7px;color:#ffd700;margin-bottom:${p.bonus > 0 ? 0 : 8}px">COINS</div>
        ${p.bonus > 0 ? `<div style="font-family:Orbitron,monospace;font-size:7px;color:#00ffb4;margin-bottom:6px">+${p.bonus.toLocaleString()} BONUS FREE</div>` : ''}
        <div style="font-family:Orbitron,monospace;font-size:12px;font-weight:900;color:#ffffff;background:${p.color}22;border:1px solid ${p.color}66;border-radius:6px;padding:5px 0;margin-top:6px">${p.price}</div>
      `;

      card.addEventListener('pointerdown', function () { card.style.transform = 'scale(0.96)'; });
      card.addEventListener('pointerup',   function () { card.style.transform = 'scale(1)'; });
      card.onclick = function () { purchasePack(p.sku); };

      grid.appendChild(card);
    });
  }

  // ── PURCHASE OVERLAY ──────────────────────────────────────────────────────
  function _showPurchaseOverlay(msg) {
    let ov = document.getElementById('iap-loading-overlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'iap-loading-overlay';
      ov.style.cssText = [
        'position:fixed;inset:0;z-index:600',
        'background:rgba(0,0,0,0.85)',
        'display:flex;flex-direction:column;align-items:center;justify-content:center',
        'font-family:Orbitron,monospace'
      ].join(';');
      document.body.appendChild(ov);
    }
    ov.innerHTML = `
      <div style="font-size:32px;margin-bottom:14px;animation:introOrbit 2s linear infinite">💳</div>
      <div style="font-size:11px;color:#ffd700;letter-spacing:3px;text-align:center;padding:0 20px">${msg}</div>
    `;
    ov.style.display = 'flex';
  }

  function _hidePurchaseOverlay() {
    const ov = document.getElementById('iap-loading-overlay');
    if (ov) ov.style.display = 'none';
  }

  // ── RESULT TOAST ──────────────────────────────────────────────────────────
  function _showPurchaseResult(msg, color) {
    let t = document.getElementById('iap-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'iap-toast';
      t.style.cssText = [
        'position:fixed;top:50%;left:50%;z-index:700',
        'transform:translate(-50%,-50%)',
        'background:rgba(0,0,20,0.97)',
        'padding:20px 28px;border-radius:14px',
        'text-align:center;font-family:Orbitron,monospace',
        'max-width:280px;box-shadow:0 0 40px rgba(0,0,0,0.8)',
        'pointer-events:none'
      ].join(';');
      document.body.appendChild(t);
    }
    t.style.border = '2px solid ' + color;
    t.style.boxShadow = '0 0 30px ' + color + '55';
    t.innerHTML = `<div style="font-size:12px;color:${color};letter-spacing:2px;line-height:1.7;white-space:pre-line">${msg}</div>`;
    t.style.opacity = '1';
    clearTimeout(t._hideTimer);
    t._hideTimer = setTimeout(function () {
      t.style.transition = 'opacity 0.5s';
      t.style.opacity = '0';
    }, 2800);
  }

  // ── HELPERS ────────────────────────────────────────────────────────────────
  function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ── PUBLIC API ─────────────────────────────────────────────────────────────
  window.IAP = {
    open: function () {
      _buildIAPPanel();
      const panel = document.getElementById('iap-panel');
      if (panel) panel.style.display = 'block';
      const bal = document.getElementById('iap-balance');
      if (bal) bal.textContent = (typeof totalCoins !== 'undefined' ? totalCoins : 0).toLocaleString();
      // Hide shop if open
      closeShop && closeShop();
    },
    close: function () {
      const panel = document.getElementById('iap-panel');
      if (panel) panel.style.display = 'none';
    },
    buy: purchasePack,
    removeAds: purchaseRemoveAds,
    restore: restorePurchases,
    isAdsRemoved: function () { return _adsRemoved; }
  };

  // ── INIT ───────────────────────────────────────────────────────────────────
  _initPlugin();

  // Hide ad banner immediately if already purchased
  if (_adsRemoved) {
    document.addEventListener('DOMContentLoaded', function () {
      const b = document.getElementById('ad-banner');
      if (b) b.style.display = 'none';
    });
  }

  // Add "💎 STORE" button to main menu after DOM loads
  document.addEventListener('DOMContentLoaded', function () {
    // Inject STORE button into menu (looks for .tab-bar or #menu)
    const menuBtns = document.querySelector('#menu .menu-bottom-row, #menu .tab-bar');
    if (!menuBtns) {
      // Fallback: fixed corner button
      const storeBtn = document.createElement('button');
      storeBtn.textContent = '💎 COIN STORE';
      storeBtn.style.cssText = [
        'position:fixed;bottom:80px;right:10px;z-index:50',
        'background:linear-gradient(135deg,rgba(170,68,255,0.3),rgba(100,0,200,0.2))',
        'border:1.5px solid rgba(170,68,255,0.6)',
        'color:#cc88ff;font-family:Orbitron,monospace',
        'font-size:9px;font-weight:900;letter-spacing:2px',
        'padding:8px 12px;border-radius:8px;cursor:pointer',
        'box-shadow:0 0 15px rgba(170,68,255,0.3)'
      ].join(';');
      storeBtn.onclick = function () { IAP.open(); };
      document.body.appendChild(storeBtn);
    }
  });

})();
