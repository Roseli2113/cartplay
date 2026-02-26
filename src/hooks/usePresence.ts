import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

const CHANNEL_NAME = "online-users";
const HOME_CHANNEL_NAME = "home-visitors";

/**
 * Tracks user presence on a shared Realtime channel.
 * - `track`: call once to register the current user as online.
 * - `onlineCount`: reactive count of unique online users.
 */
export function usePresenceTrack(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel(CHANNEL_NAME, {
      config: { presence: { key: userId } },
    });

    channel
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: userId, online_at: new Date().toISOString() });
          // Update last_active_at in profiles
          supabase.from("profiles").update({ last_active_at: new Date().toISOString() } as any).eq("user_id", userId).then();
        }
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [userId]);
}

export function usePresenceCount() {
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    const channel: RealtimeChannel = supabase.channel(CHANNEL_NAME, {
      config: { presence: { key: "admin-watcher" } },
    });

    const syncCount = () => {
      const state = channel.presenceState();
      const keys = Object.keys(state).filter((k) => k !== "admin-watcher" && k !== "home-admin-watcher");
      setOnlineCount(keys.length);
    };

    channel
      .on("presence", { event: "sync" }, syncCount)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return onlineCount;
}

/**
 * Tracks anonymous visitors on the home page.
 */
export function useHomePresenceTrack() {
  useEffect(() => {
    const visitorId = `visitor-${crypto.randomUUID()}`;
    const channel = supabase.channel(HOME_CHANNEL_NAME, {
      config: { presence: { key: visitorId } },
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ visitor_id: visitorId, online_at: new Date().toISOString() });
      }
    });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, []);
}

/**
 * Counts how many visitors are currently on the home page.
 */
export function useHomePresenceCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const channel: RealtimeChannel = supabase.channel(HOME_CHANNEL_NAME, {
      config: { presence: { key: "home-admin-watcher" } },
    });

    const syncCount = () => {
      const state = channel.presenceState();
      const keys = Object.keys(state).filter((k) => k !== "home-admin-watcher");
      setCount(keys.length);
    };

    channel
      .on("presence", { event: "sync" }, syncCount)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return count;
}
