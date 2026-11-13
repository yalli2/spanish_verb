/* 앱 설치(PWA) 지원: 서비스워커 등록 + 설치 버튼 */
(function () {
  if ('serviceWorker' in navigator && location.protocol === 'https:' || location.hostname === 'localhost') {
    window.addEventListener('load', () => navigator.serviceWorker && navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (standalone) document.documentElement.classList.add('is-app');
  const bar = document.querySelector('.topbar .wrap');
  if (!bar || standalone) return;
  const btn = document.createElement('button');
  btn.className = 'tb-btn'; btn.style.display = 'none';
  btn.innerHTML = '📲 <span class="lbl">앱 설치</span>';
  bar.insertBefore(btn, bar.querySelector('.tb-btn'));
  let deferred = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; btn.style.display = ''; });
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) btn.style.display = '';
  btn.addEventListener('click', async () => {
    if (deferred) { deferred.prompt(); await deferred.userChoice; deferred = null; btn.style.display = 'none'; }
    else if (isIOS) alert('Safari 아래쪽의 공유 버튼(□↑)을 누른 뒤 "홈 화면에 추가"를 선택하면 앱처럼 설치돼요.');
  });
  window.addEventListener('appinstalled', () => { btn.style.display = 'none'; window.SV && SV.toast('앱이 설치되었어요! 홈 화면에서 실행하세요.'); });
})();
