/**
 * Service worker: кэш интерфейса для работы без сети.
 *
 * Что делает:
 *  - при первом открытии в зоне связи сохраняет интерфейс на телефон;
 *  - дальше приложение открывается без интернета, в том числе по QR-ссылке;
 *  - отправку данных не трогает — очередью занимается сама страница.
 *
 * ВАЖНО: после правки index.html увеличьте номер версии ниже (v3, v4 и так далее),
 * иначе телефоны продолжат открывать старую сохранённую версию.
 */

const CACHE = 'osmotr-v2';

const SHELL = [
  './',
  './index.html',
  './qr.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) {
          return k === CACHE ? null : caches.delete(k);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  const req = e.request;

  // Отправка осмотров (POST) идёт напрямую, без кэша
  if (req.method !== 'GET') return;

  const sameOrigin = new URL(req.url).origin === self.location.origin;

  // Открытие страницы: пробуем сеть, при неудаче отдаём сохранённую копию.
  // Так работает и переход по QR-ссылке вида index.html?p=drobl
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(function (res) {
          const copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put('./index.html', copy); });
          return res;
        })
        .catch(function () {
          return caches.match('./index.html', { ignoreSearch: true })
            .then(function (hit) {
              return hit || new Response(
                '<meta charset="utf-8"><body style="font-family:system-ui;padding:40px;text-align:center">' +
                '<h2>Приложение ещё не сохранено</h2><p>Откройте его один раз в зоне связи — ' +
                'после этого оно будет работать без интернета.</p></body>',
                { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
              );
            });
        })
    );
    return;
  }

  // Свои файлы: отдаём из кэша сразу, в фоне обновляем
  if (sameOrigin) {
    e.respondWith(
      caches.match(req).then(function (hit) {
        const net = fetch(req).then(function (res) {
          const copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
          return res;
        }).catch(function () { return hit; });
        return hit || net;
      })
    );
  }
});
