/* Service Worker: รับ Push แล้วแสดงแจ้งเตือนบนหน้าจอเครื่อง */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

const IS_IOS = /iPhone|iPad|iPod/i.test(self.navigator.userAgent || "");

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "NTL48 Member";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/badge-96.png",
    tag: data.tag || undefined,
    data: { url: data.url || "/", postId: data.postId || null },
  };

  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    // แอปเปิดอยู่และกำลังดูอยู่ → มีแบนเนอร์ในแอปแสดงแล้ว ไม่ต้องเด้งซ้ำ
    // (iOS บังคับให้ต้องแสดงแจ้งเตือนทุกครั้ง จึงไม่ข้าม)
    if (!IS_IOS && wins.some((w) => w.visibilityState === "visible" && w.focused)) return;
    await self.registration.showNotification(title, options);
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const { url, postId } = event.notification.data || {};
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const w of wins) {
      if ("focus" in w) {
        await w.focus();
        if (postId) w.postMessage({ type: "open-post", postId });
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(url || "/");
  })());
});
