"use client";

// Simple cross-tab event bus using BroadcastChannel with a window fallback
type Handler<T = any> = (payload: T) => void;

const CHANNEL_NAME = "liveapp-events";

let channel: BroadcastChannel | null = null;
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  channel = new BroadcastChannel(CHANNEL_NAME);
}

export function emit<T = any>(type: string, payload?: T) {
  try {
    if (channel) channel.postMessage({ type, payload });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(type, { detail: payload }));
    }
  } catch {
    // no-op
  }
}

export function on<T = any>(type: string, handler: Handler<T>) {
  const bcHandler = (e: MessageEvent) => {
    if (e?.data?.type === type) handler(e.data.payload as T);
  };
  const winHandler = (e: Event) => {
    const detail = (e as CustomEvent).detail as T;
    handler(detail);
  };

  channel?.addEventListener("message", bcHandler);
  if (typeof window !== "undefined") {
    window.addEventListener(type, winHandler as EventListener);
  }

  return () => {
    channel?.removeEventListener("message", bcHandler);
    if (typeof window !== "undefined") {
      window.removeEventListener(type, winHandler as EventListener);
    }
  };
}

export const Events = {
  UserUpdated: "user:updated",
  NotificationsMaybeChanged: "notifications:maybeChanged",
  InvitesMaybeChanged: "invites:maybeChanged",
} as const;
