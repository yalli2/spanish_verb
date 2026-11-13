/* Verbos 360 service worker — 오프라인 학습 지원 */
const VERSION = 'v360-5e2feeaf';
const PRECACHE = ['./', 'index.html', 'chapter.html', 'manifest.webmanifest', 'favicon.svg', 'privacy.html', 'css/style.css', 'data/book.js', 'data/ch01.js', 'data/ch02.js', 'data/ch03.js', 'data/ch04.js', 'data/ch05.js', 'data/ch06.js', 'data/ch07.js', 'data/ch08.js', 'data/ch09.js', 'data/ch10.js', 'data/ch11.js', 'data/ch12.js', 'data/ch13.js', 'data/ch14.js', 'data/ch15.js', 'data/ch16.js', 'data/ch17.js', 'data/ch18.js', 'data/ch19.js', 'data/ch20.js', 'data/ch21.js', 'data/ch22.js', 'data/ch23.js', 'data/ch24.js', 'data/rules.js', 'data/verbs.js', 'icons/apple-touch-icon.png', 'icons/favicon-32.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-192.png', 'icons/maskable-512.png', 'js/chapter.js', 'js/chatbot.js', 'js/common.js', 'js/config.js', 'js/index.js', 'js/pwa.js'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;            // 챗봇 AI 요청(POST)은 그대로 통과
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // 같은 사이트: 캐시 우선, 쿼리스트링(?ch=) 무시
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res;
    })).catch(() => caches.match('index.html')));
  } else if (/fonts\.(googleapis|gstatic)\.com/.test(url.host)) {
    e.respondWith(caches.open('fonts').then(c => c.match(req).then(hit => hit || fetch(req).then(res => { c.put(req, res.clone()); return res; }))));
  }
});
