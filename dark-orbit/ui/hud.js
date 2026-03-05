// ==================== hud.js ====================
// NOTE: HUD_DRAGGABLE_IDS aur makeHudDragHandler game.js mein defined hain
// Yahan sirf position load karna handle hota hai

// HUD elements ki purani positions load karna
function loadHudPositions() {
  HUD_DRAGGABLE_IDS.forEach(id => {
    const el = document.getElementById(id);
    const pos = SAVE.get('hudpos_' + id);
    if (el && pos) {
      el.style.left = pos.left;
      el.style.top = pos.top;
      el.style.right = 'auto';
      el.style.bottom = 'auto';
      el.style.transform = 'none';
    }
  });
}

window.addEventListener('DOMContentLoaded', loadHudPositions);
