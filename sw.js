// greg – služba na pozadí: zobrazí upozornění z Hlídače a nastaví číslo na ikoně
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

async function readN() { try { const r = await (await caches.open('pesbadge')).match('n'); return r ? Number(await r.text()) || 0 : 0; } catch (e) { return 0; } }
async function writeN(n) { try { const c = await caches.open('pesbadge'); if (n > 0) await c.put('n', new Response(String(n))); else await c.delete('n'); } catch (e) { /* jen odznak */ } }
async function badge(n) {
  try { if (n > 0 && self.navigator.setAppBadge) await self.navigator.setAppBadge(n); else if (self.navigator.clearAppBadge) await self.navigator.clearAppBadge(); } catch (e) { /* nepodporováno */ }
}

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data && e.data.text() }; }
  e.waitUntil((async () => {
    const add = Number(d.count) || 0;
    if (add > 0) { const n = (await readN()) + add; await writeN(n); await badge(n); }
    await self.registration.showNotification(d.title || 'greg', {
      body: d.body || '',
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      data: { url: d.url || './' },
    });
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil((async () => {
    await writeN(0); await badge(0);
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const lea = new URL(url).pathname.indexOf('/leasing/') >= 0;
    const mine = all.filter(c => (new URL(c.url).pathname.indexOf('/leasing/') >= 0) === lea);
    for (const c of mine) { try { c.postMessage({ a: 'nove', url }); } catch (x) { /* stránka nemusí poslouchat */ } if ('focus' in c) { try { await c.focus(); return; } catch (x) { /* zkusíme otevřít nové */ } } }
    if (self.clients.openWindow) await self.clients.openWindow(url);
  })());
});
