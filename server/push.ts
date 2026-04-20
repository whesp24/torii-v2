// push.ts — Web Push notifications via VAPID
import webpush from "web-push";
import { storage } from "./storage";

// VAPID keys (generated once — do not rotate, it invalidates all subscriptions)
const VAPID_PUBLIC  = process.env.VAPID_PUBLIC  || "BGGgQC-2KsmdMm1lqPk1iLZnkXmsxZyNN5e4GRyK88_fiacyZGPmHBMRzNIFRkTsipUGVIFbJmrGt8KG5ABfVZY";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE || "yriMWvL_Z_nj9ThY0qIB5yHl4XYFU2MwIJwnOLn_WwY";
const VAPID_EMAIL   = "mailto:whesp24@gmail.com";

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);

export { VAPID_PUBLIC };

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;       // deduplication key — same tag replaces previous notification
  urgency?: "high" | "normal" | "low";
}

// Send to all stored subscriptions
export async function sendPushToAll(payload: PushPayload): Promise<void> {
  const subs = storage.getPushSubscriptions();
  if (!subs.length) return;

  const data = JSON.stringify({
    title:   payload.title,
    body:    payload.body,
    url:     payload.url || "/",
    tag:     payload.tag || "torii-alert",
    icon:    "/icon-192.png",
    badge:   "/icon-192.png",
  });

  await Promise.allSettled(
    subs.map(async sub => {
      try {
        await webpush.sendNotification(
          JSON.parse(sub.subscription),
          data,
          { urgency: payload.urgency || "normal", TTL: 3600 }
        );
      } catch (err: any) {
        // 410 Gone = subscription expired/revoked → remove it
        if (err.statusCode === 410 || err.statusCode === 404) {
          storage.removePushSubscription(sub.endpoint);
        }
      }
    })
  );
}
