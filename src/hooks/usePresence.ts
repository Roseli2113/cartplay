import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

const CHANNEL_NAME = "online-users";

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
      // Each key is a user id; count unique keys (excluding admin-watcher)
      const keys = Object.keys(state).filter((k) => k !== "admin-watcher");
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
