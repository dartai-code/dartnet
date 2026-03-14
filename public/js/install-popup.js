(function () {
  // Don't show if already installed as PWA
  if (window.matchMedia('(display-mode: standalone)').matches) return;
  // Don't show on login/register/index pages
  var path = window.location.pathname;
  if (path === '/' || path === '/index.html' || path === '/login.html' || path === '/register.html' || path === '/admin.html') return;
  // Don't show if dismissed recently (24h)
  var dismissed = localStorage.getItem('dartnet_install_dismissed');
  if (dismissed && Date.now() - parseInt(dismissed) < 86400000) return;

  var deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
  });

  // Create popup after short delay
  setTimeout(function () {
    var popup = document.createElement('div');
    popup.id = 'installPopup';
    popup.innerHTML =
      '<div class="install-popup-backdrop"></div>' +
      '<div class="install-popup-card">' +
        '<button class="install-popup-close" id="installPopupClose">&times;</button>' +
        '<div class="install-popup-icon">📱</div>' +
        '<div class="install-popup-content">' +
          '<h3>Get the DartNet App!</h3>' +
          '<p>Install DartNet for the best experience — faster loading, offline access & instant notifications!</p>' +
          '<div class="install-popup-features">' +
            '<span>⚡ Faster</span>' +
            '<span>🔔 Notifications</span>' +
            '<span>📴 Offline</span>' +
          '</div>' +
          '<div class="install-popup-buttons">' +
            '<button class="install-popup-btn install-popup-btn-go" id="installPopupInstall">Install Now</button>' +
            '<button class="install-popup-btn install-popup-btn-later" id="installPopupLater">Maybe Later</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    // Styles
    var style = document.createElement('style');
    style.textContent =
      '#installPopup { position:fixed; inset:0; z-index:99999; display:flex; align-items:flex-end; justify-content:center; padding:16px; animation:ipFadeIn .3s ease; pointer-events:auto; }' +
      '@keyframes ipFadeIn { from{opacity:0} to{opacity:1} }' +
      '@keyframes ipSlideUp { from{transform:translateY(100px);opacity:0} to{transform:translateY(0);opacity:1} }' +
      '@keyframes ipPulse { 0%,100%{box-shadow:0 0 20px rgba(0,224,255,.2)} 50%{box-shadow:0 0 35px rgba(0,224,255,.4)} }' +
      '.install-popup-backdrop { position:absolute; inset:0; background:rgba(0,0,0,.6); backdrop-filter:blur(4px); }' +
      '.install-popup-card { position:relative; background:linear-gradient(145deg,#12122a,#1a1a3a); border:1.5px solid rgba(0,224,255,.3); border-radius:20px; padding:24px 20px 20px; max-width:360px; width:100%; animation:ipSlideUp .4s ease .1s both, ipPulse 3s ease infinite; }' +
      '.install-popup-close { position:absolute; top:10px; right:14px; background:none; border:none; color:rgba(255,255,255,.5); font-size:22px; cursor:pointer; line-height:1; padding:4px; }' +
      '.install-popup-close:hover { color:#fff; }' +
      '.install-popup-icon { text-align:center; font-size:40px; margin-bottom:8px; }' +
      '.install-popup-content { text-align:center; }' +
      '.install-popup-content h3 { font-family:Orbitron,sans-serif; font-size:18px; font-weight:800; color:#00e0ff; margin:0 0 8px; }' +
      '.install-popup-content p { font-size:13px; color:rgba(255,255,255,.75); margin:0 0 12px; line-height:1.5; }' +
      '.install-popup-features { display:flex; justify-content:center; gap:12px; margin-bottom:16px; }' +
      '.install-popup-features span { font-size:11px; color:rgba(255,255,255,.6); background:rgba(255,255,255,.06); padding:4px 10px; border-radius:20px; }' +
      '.install-popup-buttons { display:flex; gap:10px; justify-content:center; }' +
      '.install-popup-btn { padding:10px 20px; border-radius:10px; font-size:14px; font-weight:700; border:none; cursor:pointer; transition:all .2s; }' +
      '.install-popup-btn-go { background:linear-gradient(135deg,#00e0ff,#0080ff); color:#fff; flex:1; }' +
      '.install-popup-btn-go:hover { transform:scale(1.04); box-shadow:0 0 20px rgba(0,224,255,.4); }' +
      '.install-popup-btn-later { background:rgba(255,255,255,.08); color:rgba(255,255,255,.6); }' +
      '.install-popup-btn-later:hover { background:rgba(255,255,255,.12); color:#fff; }';

    document.head.appendChild(style);
    document.body.appendChild(popup);

    function dismiss() {
      localStorage.setItem('dartnet_install_dismissed', Date.now().toString());
      popup.style.animation = 'ipFadeIn .25s ease reverse forwards';
      setTimeout(function () { popup.remove(); }, 260);
    }

    document.getElementById('installPopupClose').addEventListener('click', dismiss);
    document.getElementById('installPopupLater').addEventListener('click', dismiss);
    document.querySelector('.install-popup-backdrop').addEventListener('click', dismiss);

    document.getElementById('installPopupInstall').addEventListener('click', function () {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function (choice) {
          deferredPrompt = null;
          dismiss();
        });
      } else {
        // Fallback: show manual instructions
        var isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
        if (isIOS) {
          alert('To install: tap the Share button (⬆️) then "Add to Home Screen"');
        } else {
          alert('To install: tap the browser menu (⋮) then "Add to Home Screen" or "Install App"');
        }
        dismiss();
      }
    });
  }, 3000);
})();
