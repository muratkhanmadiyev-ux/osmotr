/**
 * Минимальный service worker.
 * Ничего не кэширует — приложение работает только онлайн, как и договаривались.
 * Нужен для того, чтобы Android предлагал установку на главный экран.
 */

self.addEventListener('install', function (e) {
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function (e) {
  e.respondWith(
    fetch(e.request).catch(function () {
      return new Response(
        '<meta charset="utf-8"><body style="font-family:system-ui;padding:40px;text-align:center">' +
        '<h2>Нет связи</h2><p>Приложение работает только при наличии сети. ' +
        'Подойдите ближе к зоне покрытия и обновите страницу.</p></body>',
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    })
  );
});
