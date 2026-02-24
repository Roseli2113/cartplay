import { useRef, useCallback } from "react";
import type { PlayerEvent } from "./types";

/**
 * Hook to track player events (play, pause, seek, timeupdate).
 * Events are logged to console in dev; extend to send to backend.
 */
export function usePlayerEvents(contentId?: string) {
  const eventsRef = useRef<PlayerEvent[]>([]);
  const watchStartRef = useRef<number | null>(null);

  const trackEvent = useCallback((event: PlayerEvent) => {
    eventsRef.current.push(event);

    if (event.type === "play") {
      watchStartRef.current = event.timestamp;
    }

    if (event.type === "pause" || event.type === "ended") {
      if (watchStartRef.current) {
        const watchedMs = event.timestamp - watchStartRef.current;
        console.debug(`[Player] Watched ${(watchedMs / 1000).toFixed(1)}s of "${contentId}"`, {
          currentTime: event.currentTime,
          duration: event.duration,
        });
        watchStartRef.current = null;
      }
    }
  }, [contentId]);

  const emit = useCallback(
    (type: PlayerEvent["type"], currentTime: number, duration: number) => {
      trackEvent({ type, currentTime, duration, timestamp: Date.now() });
    },
    [trackEvent]
  );

  return { emit, events: eventsRef };
}
