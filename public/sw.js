self.addEventListener("push", (event) => {
  let data = { title: "Beauty Store", message: "Yeni bir bildiriminiz var." };
  try {
    if (event.data) data = event.data.json();
  } catch {
    // ignore malformed payloads
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.message,
      icon: "/next.svg",
      badge: "/next.svg",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("/"));
});
