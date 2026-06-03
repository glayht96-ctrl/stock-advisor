/* Stock Advisor Service Worker — Push通知 & バックグラウンドアラート */
const CACHE_NAME = 'stock-advisor-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

/* プッシュ通知受信 */
self.addEventListener('push', event => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? 'Stock Advisor アラート';
  const options = {
    body:    data.body ?? '',
    icon:    '/favicon.ico',
    badge:   '/favicon.ico',
    tag:     data.ticker ?? 'alert',
    data:    { ticker: data.ticker ?? '' },
    vibrate: [200, 100, 200],
    requireInteraction: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

/* 通知クリック → 該当銘柄の分析画面に遷移 */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const ticker = event.notification.data?.ticker ?? '';
  const url = `${self.location.origin}/#${ticker}`;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.startsWith(self.location.origin));
      if (existing) {
        existing.focus();
        existing.navigate(url);
      } else {
        self.clients.openWindow(url);
      }
    })
  );
});

/* バックグラウンド同期（ブラウザがオフライン→オンライン復帰時） */
self.addEventListener('sync', event => {
  if (event.tag === 'check-alerts') {
    event.waitUntil(checkAlerts());
  }
});

async function checkAlerts() {
  try {
    const cache  = await caches.open(CACHE_NAME);
    const stored = await cache.match('alert-config');
    if (!stored) return;
    const config = await stored.json();
    const { alerts, baseUrl } = config;
    if (!alerts?.length) return;

    const tickers = [...new Set(alerts.map(a => a.ticker))];
    for (const ticker of tickers) {
      const res = await fetch(`${baseUrl}/stock/${ticker}?period=1mo`);
      if (!res.ok) continue;
      const data  = await res.json();
      const rsi   = data.indicators?.rsi_14;
      const price = data.current_price;
      for (const alert of alerts.filter(a => a.ticker === ticker)) {
        const value = alert.indicator === 'RSI' ? rsi : price;
        if (value == null) continue;
        const triggered = alert.direction === 'above' ? value >= alert.threshold : value <= alert.threshold;
        if (!triggered) continue;
        const dir = alert.direction === 'above' ? '≥' : '≤';
        await self.registration.showNotification(`${ticker} アラート発火`, {
          body: `${alert.indicator} = ${value.toFixed(2)} (${dir} ${alert.threshold})`,
          icon: '/favicon.ico',
          tag:  alert.id,
          data: { ticker },
          requireInteraction: true,
        });
      }
    }
  } catch (e) {
    console.error('[SW] checkAlerts:', e);
  }
}
