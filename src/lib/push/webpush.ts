import webpush from "web-push";

let configured = false;

export function getWebPush() {
  if (!configured) {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
      throw new Error("VAPID keys are not configured");
    }

    webpush.setVapidDetails(
      "mailto:demo@beauty-ecommerce.local",
      publicKey,
      privateKey
    );
    configured = true;
  }

  return webpush;
}
