// ==================== ad-reward-upgraded.js ====================
// Full AdMob Integration with Banner, Interstitial, and Rewarded Ads
// Replace ad-reward.js with this file for production Android build

(function() {
  
  // ══════════════════════════════════════════════════════════
  // ADMOB CONFIGURATION - REPLACE WITH YOUR REAL AD UNIT IDS
  // ══════════════════════════════════════════════════════════
  const ADMOB_CONFIG = {
    // TEST IDS - Replace these with your real AdMob unit IDs from Google AdMob console
    BANNER_ID: 'ca-app-pub-3940256099942544/6300978111',      // Test banner ID
    INTERSTITIAL_ID: 'ca-app-pub-3940256099942544/1033173712', // Test interstitial ID
    REWARDED_ID: 'ca-app-pub-3940256099942544/5224354917',     // Test rewarded ID
    
    // Production IDs (uncomment and fill when ready)
    // BANNER_ID: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
    // INTERSTITIAL_ID: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
    // REWARDED_ID: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
  };
  
  // ══════════════════════════════════════════════════════════
  // STATE
  // ══════════════════════════════════════════════════════════
  let isCapacitor = false;
  let AdMob = null;
  let bannerShown = false;
  let interstitialReady = false;
  let rewardedReady = false;
  let interstitialCount = 0;
  let rewardedUsedThisSession = 0;
  const MAX_REWARDED_PER_SESSION = 2;
  
  // ══════════════════════════════════════════════════════════
  // INITIALIZATION
  // ══════════════════════════════════════════════════════════
  async function initAdMob() {
    // Check if running in Capacitor
    if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform()) {
      isCapacitor = true;
      
      try {
        // Import AdMob plugin
        const { AdMob: AdMobPlugin } = await import('@capacitor-community/admob');
        AdMob = AdMobPlugin;
        
        // Initialize AdMob
        await AdMob.initialize({
          requestTrackingAuthorization: true,
          testingDevices: ['YOUR_TEST_DEVICE_ID'], // Add your test device ID
          initializeForTesting: false // Set to true for testing
        });
        
        console.log('AdMob initialized successfully');
        
        // Prepare ads
        await prepareBanner();
        await prepareInterstitial();
        await prepareRewarded();
        
      } catch (error) {
        console.error('AdMob initialization failed:', error);
        isCapacitor = false; // Fallback to fake ads
      }
    }
    
    // If not Capacitor or init failed, use fake ads
    if (!isCapacitor) {
      console.log('Running in browser mode - using fake ads');
    }
  }
  
  // ══════════════════════════════════════════════════════════
  // BANNER AD
  // ══════════════════════════════════════════════════════════
  async function prepareBanner() {
    if (!isCapacitor || !AdMob) return;
    
    try {
      await AdMob.showBanner({
        adId: ADMOB_CONFIG.BANNER_ID,
        adSize: 'BANNER', // 320x50
        position: 'BOTTOM_CENTER',
        margin: 0,
        isTesting: false // Set to true for testing
      });
      
      bannerShown = true;
      
      // Shift canvas up by 50px to avoid banner overlap
      adjustCanvasForBanner(true);
      
    } catch (error) {
      console.error('Banner ad failed:', error);
    }
  }
  
  function adjustCanvasForBanner(show) {
    const canvas = document.getElementById('c');
    if (canvas) {
      canvas.style.marginBottom = show ? '50px' : '0px';
    }
  }
  
  async function hideBanner() {
    if (!isCapacitor || !AdMob || !bannerShown) return;
    
    try {
      await AdMob.hideBanner();
      bannerShown = false;
      adjustCanvasForBanner(false);
    } catch (error) {
      console.error('Hide banner failed:', error);
    }
  }
  
  // ══════════════════════════════════════════════════════════
  // INTERSTITIAL AD
  // ══════════════════════════════════════════════════════════
  async function prepareInterstitial() {
    if (!isCapacitor || !AdMob) return;
    
    try {
      await AdMob.prepareInterstitial({
        adId: ADMOB_CONFIG.INTERSTITIAL_ID,
        isTesting: false
      });
      
      interstitialReady = true;
      
    } catch (error) {
      console.error('Prepare interstitial failed:', error);
    }
  }
  
  async function showInterstitial() {
    if (!isCapacitor || !AdMob) {
      // Fake ad for browser
      return await showFakeInterstitial();
    }
    
    if (!interstitialReady) {
      await prepareInterstitial();
    }
    
    try {
      await AdMob.showInterstitial();
      interstitialReady = false;
      
      // Prepare next one
      setTimeout(prepareInterstitial, 1000);
      
      return true;
    } catch (error) {
      console.error('Show interstitial failed:', error);
      return false;
    }
  }
  
  async function showFakeInterstitial() {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position:fixed;inset:0;z-index:9999;
        background:linear-gradient(135deg,#1a1a2e,#16213e);
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        font-family:Orbitron,Arial;
      `;
      
      let countdown = 5;
      overlay.innerHTML = `
        <div style="font-size:12px;color:#ffd700;letter-spacing:3px;margin-bottom:20px">
          📺 ADVERTISEMENT
        </div>
        <div style="font-size:72px;font-weight:900;color:#fff" id="fake-ad-cd">${countdown}</div>
        <div style="font-size:10px;color:rgba(255,255,255,0.4);margin-top:20px;letter-spacing:2px">
          Ad closes in <span id="fake-ad-cd-small">${countdown}</span>s
        </div>
        <div style="
          width:250px;height:4px;background:rgba(255,255,255,0.1);
          border-radius:2px;margin-top:20px;overflow:hidden
        ">
          <div id="fake-ad-progress" style="
            height:100%;background:#ffd700;width:0%;transition:width 1s linear
          "></div>
        </div>
      `;
      
      document.body.appendChild(overlay);
      
      setTimeout(() => {
        document.getElementById('fake-ad-progress').style.width = '100%';
      }, 50);
      
      const timer = setInterval(() => {
        countdown--;
        const el = document.getElementById('fake-ad-cd');
        const el2 = document.getElementById('fake-ad-cd-small');
        if (el) el.textContent = countdown;
        if (el2) el2.textContent = countdown;
        
        if (countdown <= 0) {
          clearInterval(timer);
          overlay.style.transition = 'opacity 0.4s';
          overlay.style.opacity = '0';
          setTimeout(() => {
            overlay.remove();
            resolve(true);
          }, 400);
        }
      }, 1000);
    });
  }
  
  // ══════════════════════════════════════════════════════════
  // REWARDED AD
  // ══════════════════════════════════════════════════════════
  async function prepareRewarded() {
    if (!isCapacitor || !AdMob) return;
    
    try {
      await AdMob.prepareRewardVideoAd({
        adId: ADMOB_CONFIG.REWARDED_ID,
        isTesting: false
      });
      
      rewardedReady = true;
      
    } catch (error) {
      console.error('Prepare rewarded failed:', error);
    }
  }
  
  async function showRewarded() {
    // Check session limit
    if (rewardedUsedThisSession >= MAX_REWARDED_PER_SESSION) {
      showFloatingText('⚠️ MAX 2 REVIVES PER SESSION', W / 2, H / 2, '#ff4444');
      return false;
    }
    
    if (!isCapacitor || !AdMob) {
      // Fake ad for browser
      const watched = await showFakeRewarded();
      if (watched) rewardedUsedThisSession++;
      return watched;
    }
    
    if (!rewardedReady) {
      await prepareRewarded();
    }
    
    try {
      const result = await AdMob.showRewardVideoAd();
      rewardedReady = false;
      
      // Prepare next one
      setTimeout(prepareRewarded, 1000);
      
      if (result && result.rewarded) {
        rewardedUsedThisSession++;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Show rewarded failed:', error);
      return false;
    }
  }
  
  async function showFakeRewarded() {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position:fixed;inset:0;z-index:9999;
        background:linear-gradient(135deg,#0f3460,#16213e);
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        font-family:Orbitron,Arial;
      `;
      
      let countdown = 8;
      overlay.innerHTML = `
        <div style="font-size:12px;color:#00ffb4;letter-spacing:3px;margin-bottom:20px">
          🎁 REWARDED AD - WATCH TO EARN
        </div>
        <div style="font-size:72px;font-weight:900;color:#fff" id="fake-rew-cd">${countdown}</div>
        <div style="font-size:10px;color:rgba(255,255,255,0.4);margin-top:20px;letter-spacing:2px">
          Watch full ad to get reward
        </div>
        <div style="
          width:250px;height:4px;background:rgba(255,255,255,0.1);
          border-radius:2px;margin-top:20px;overflow:hidden
        ">
          <div id="fake-rew-progress" style="
            height:100%;background:#00ffb4;width:0%;transition:width 1s linear
          "></div>
        </div>
        <button id="fake-rew-skip" style="
          margin-top:30px;padding:8px 20px;
          background:rgba(255,68,68,0.2);border:1px solid #ff4444;
          color:#ff4444;font-family:Orbitron,Arial;font-size:9px;
          border-radius:6px;cursor:pointer;letter-spacing:2px
        ">SKIP (NO REWARD)</button>
      `;
      
      document.body.appendChild(overlay);
      
      setTimeout(() => {
        document.getElementById('fake-rew-progress').style.width = '100%';
      }, 50);
      
      let skipped = false;
      
      document.getElementById('fake-rew-skip').onclick = () => {
        skipped = true;
        clearInterval(timer);
        overlay.style.transition = 'opacity 0.4s';
        overlay.style.opacity = '0';
        setTimeout(() => {
          overlay.remove();
          resolve(false);
        }, 400);
      };
      
      const timer = setInterval(() => {
        countdown--;
        const el = document.getElementById('fake-rew-cd');
        if (el) el.textContent = countdown;
        
        if (countdown <= 0 && !skipped) {
          clearInterval(timer);
          overlay.style.transition = 'opacity 0.4s';
          overlay.style.opacity = '0';
          setTimeout(() => {
            overlay.remove();
            resolve(true);
          }, 400);
        }
      }, 1000);
    });
  }
  
  // ══════════════════════════════════════════════════════════
  // GAME INTEGRATION
  // ══════════════════════════════════════════════════════════
  
  // Show interstitial every 5 waves
  function checkInterstitialTrigger() {
    if (typeof wave === 'undefined' || typeof running === 'undefined') return;
    if (!running) return;
    
    // Every 5 waves
    if (wave > 0 && wave % 5 === 0 && interstitialCount < Math.floor(wave / 5)) {
      interstitialCount = Math.floor(wave / 5);
      setTimeout(() => {
        showInterstitial();
      }, 2000); // Delay 2s after wave starts
    }
  }
  
  // Show interstitial on game over
  async function showGameOverAd() {
    await showInterstitial();
  }
  
  // Revive system with rewarded ad
  async function offerRevive() {
    if (rewardedUsedThisSession >= MAX_REWARDED_PER_SESSION) {
      return false;
    }
    
    return new Promise(resolve => {
      const panel = document.createElement('div');
      panel.style.cssText = `
        position:fixed;inset:0;z-index:9998;
        background:rgba(0,0,10,0.95);
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        font-family:Orbitron,Arial;padding:20px;
      `;
      
      panel.innerHTML = `
        <div style="font-size:48px;margin-bottom:20px">💔</div>
        <div style="font-size:24px;font-weight:900;color:#ff4444;letter-spacing:3px;margin-bottom:10px">
          GAME OVER
        </div>
        <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:30px;letter-spacing:2px">
          WATCH AD TO REVIVE WITH FULL HP
        </div>
        <div style="
          background:rgba(0,255,180,0.1);border:1px solid rgba(0,255,180,0.3);
          border-radius:8px;padding:8px 16px;margin-bottom:20px;
          font-size:9px;color:#00ffb4;letter-spacing:2px
        ">
          ${MAX_REWARDED_PER_SESSION - rewardedUsedThisSession} REVIVE${MAX_REWARDED_PER_SESSION - rewardedUsedThisSession !== 1 ? 'S' : ''} LEFT THIS SESSION
        </div>
        <button id="revive-watch-btn" style="
          padding:15px 40px;margin-bottom:15px;
          background:linear-gradient(135deg,rgba(0,255,180,0.25),rgba(0,200,150,0.15));
          border:2px solid #00ffb4;color:#00ffb4;
          font-family:Orbitron,Arial;font-size:13px;font-weight:900;
          letter-spacing:3px;border-radius:12px;cursor:pointer;
          box-shadow:0 0 20px rgba(0,255,180,0.3)
        ">📺 WATCH AD - REVIVE</button>
        <button id="revive-skip-btn" style="
          padding:10px 30px;
          background:rgba(255,68,68,0.1);border:1px solid rgba(255,68,68,0.3);
          color:#ff4444;font-family:Orbitron,Arial;font-size:10px;
          letter-spacing:2px;border-radius:8px;cursor:pointer
        ">NO THANKS - GAME OVER</button>
      `;
      
      document.body.appendChild(panel);
      
      document.getElementById('revive-watch-btn').onclick = async () => {
        panel.remove();
        const watched = await showRewarded();
        resolve(watched);
      };
      
      document.getElementById('revive-skip-btn').onclick = () => {
        panel.remove();
        resolve(false);
      };
    });
  }
  
  // ══════════════════════════════════════════════════════════
  // EXPOSE PUBLIC API
  // ══════════════════════════════════════════════════════════
  window.ADMOB = {
    init: initAdMob,
    showBanner: prepareBanner,
    hideBanner: hideBanner,
    showInterstitial: showInterstitial,
    showRewardedAd: showRewarded,
    offerRevive: offerRevive,
    checkInterstitialTrigger: checkInterstitialTrigger,
    showGameOverAd: showGameOverAd
  };
  
  // ══════════════════════════════════════════════════════════
  // AUTO-INIT
  // ══════════════════════════════════════════════════════════
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initAdMob, 500);
    });
  } else {
    setTimeout(initAdMob, 500);
  }
  
  // Monitor wave changes for interstitial triggers
  let prevWave = -1;
  setInterval(() => {
    if (typeof wave !== 'undefined' && wave !== prevWave) {
      prevWave = wave;
      checkInterstitialTrigger();
    }
  }, 1000);
  
})();
